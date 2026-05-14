using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.Data;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/stations")]
    public class GeoController : BaseApiController
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly HttpClient _httpClient;

        public GeoController(AppDbContext context, IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _config = config;
            _httpClient = httpClientFactory.CreateClient();
        }

        // GET /api/stations/geocode/preview
        [Authorize(Roles = "operator")]
        [HttpGet("geocode/preview")]
        public async Task<IActionResult> Preview()
        {
            var allStations = await _context.Stations
                .Select(s => new { s.StationId, s.StationName, s.Latitude, s.Longitude })
                .ToListAsync();

            var missing = allStations
                .Where(s => s.Latitude == 0 || s.Longitude == 0)
                .Select(s => new { s.StationId, s.StationName, s.Latitude, s.Longitude })
                .ToList();

            return Ok(new
            {
                totalMissing = missing.Count,
                totalFilled  = allStations.Count - missing.Count,
                missing
            });
        }

        // POST /api/stations/geocode
        // Fallback chain: Wikipedia (coordinates + wikitext) → Wikidata → Overpass → Nominatim → Google
        [Authorize(Roles = "operator")]
        [HttpPost("geocode")]
        public async Task<IActionResult> GeocodeStations()
        {
            var stations = await _context.Stations
                .Where(s => s.Latitude == 0 || s.Longitude == 0)
                .ToListAsync();

            if (stations.Count == 0)
                return Ok(new { message = "All stations already have coordinates.", geocoded = 0, failed = 0 });

            _httpClient.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Railly-FYP/1.0");

            var geocoded = new List<object>();
            var failed   = new List<object>();

            foreach (var station in stations)
            {
                var cleanName = CleanStationName(station.StationName);
                var typeHint  = GetTypeHint(station.StationName);

                // 1st — Wikipedia: prop=coordinates, then wikitext infobox fallback
                var result = await SearchWikipedia(cleanName, typeHint);

                // 2nd — Wikidata: structured coordinate data for virtually all transit stations
                if (result == null)
                    result = await SearchWikidata(cleanName, typeHint);

                // 3rd — Overpass (OSM): community-verified station coordinates
                if (result == null)
                    result = await SearchOverpass(cleanName);

                // 4th — Nominatim (OSM search)
                if (result == null)
                    result = await SearchNominatim(cleanName, station.StationName);

                // 5th — Google Geocoding: last resort
                if (result == null)
                {
                    var apiKey = _config["Google:GeocodingApiKey"];
                    if (!string.IsNullOrWhiteSpace(apiKey))
                        result = await SearchGoogle(station.StationName, apiKey);
                }

                if (result.HasValue)
                {
                    station.Latitude  = result.Value.lat;
                    station.Longitude = result.Value.lng;
                    geocoded.Add(new
                    {
                        station.StationId,
                        station.StationName,
                        result.Value.lat,
                        result.Value.lng,
                        source = result.Value.source
                    });
                }
                else
                {
                    failed.Add(new { station.StationId, station.StationName, reason = "No results from any source" });
                }

                await Task.Delay(300); // Nominatim policy: max 1 req/sec
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Geocoding complete. {geocoded.Count} succeeded, {failed.Count} failed.",
                geocoded,
                failed
            });
        }

        // ── Wikipedia ─────────────────────────────────────────────────────────────

        private async Task<(double lat, double lng, string source)?> SearchWikipedia(string cleanName, string typeHint)
        {
            try
            {
                var candidates = new[]
                {
                    $"{cleanName} {typeHint} station",
                    $"{cleanName} {typeHint} Station",
                    $"{cleanName} station",
                    $"{cleanName} {typeHint} station",
                    $"{cleanName} {typeHint} station",
                };

                foreach (var title in candidates)
                {
                    var result = await FetchWikipediaCoords(title);
                    if (result.HasValue) return result;
                }

                // Fall back to Wikipedia search API
                var searchUrl = $"https://en.wikipedia.org/w/api.php" +
                                $"?action=query&list=search" +
                                $"&srsearch={Uri.EscapeDataString($"{cleanName} {typeHint} station Malaysia")}" +
                                $"&srlimit=5&format=json";

                var searchResp = await _httpClient.GetStringAsync(searchUrl);
                var searchJson = JsonDocument.Parse(searchResp);
                var hits       = searchJson.RootElement.GetProperty("query").GetProperty("search");

                for (int i = 0; i < hits.GetArrayLength(); i++)
                {
                    var pageTitle = hits[i].GetProperty("title").GetString()!;
                    if (!pageTitle.Contains("station", StringComparison.OrdinalIgnoreCase)) continue;
                    var result = await FetchWikipediaCoords(pageTitle);
                    if (result.HasValue) return result;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        // Tries prop=coordinates first; falls back to raw wikitext parsing for infobox coords
        private async Task<(double lat, double lng, string source)?> FetchWikipediaCoords(string pageTitle)
        {
            try
            {
                var url = $"https://en.wikipedia.org/w/api.php" +
                          $"?action=query" +
                          $"&titles={Uri.EscapeDataString(pageTitle)}" +
                          $"&prop=coordinates" +
                          $"&format=json";

                var response = await _httpClient.GetStringAsync(url);
                var json     = JsonDocument.Parse(response);
                var pages    = json.RootElement.GetProperty("query").GetProperty("pages");

                foreach (var page in pages.EnumerateObject())
                {
                    if (page.Name == "-1") continue;
                    if (!page.Value.TryGetProperty("coordinates", out var coords)) continue;
                    if (coords.GetArrayLength() == 0) continue;

                    var lat = coords[0].GetProperty("lat").GetDouble();
                    var lng = coords[0].GetProperty("lon").GetDouble();
                    if (!IsWithinMalaysia(lat, lng)) continue;
                    return (lat, lng, $"Wikipedia ({pageTitle})");
                }

                // prop=coordinates only exposes top-level {{coord}} tags.
                // Many Malaysian station pages have coords only inside infoboxes,
                // so parse the raw wikitext as a fallback.
                return await FetchWikitextCoords(pageTitle);
            }
            catch
            {
                return null;
            }
        }

        // Fetches raw wikitext and extracts {{coord|...}} patterns
        private async Task<(double lat, double lng, string source)?> FetchWikitextCoords(string pageTitle)
        {
            try
            {
                var url = $"https://en.wikipedia.org/w/api.php" +
                          $"?action=query" +
                          $"&titles={Uri.EscapeDataString(pageTitle)}" +
                          $"&prop=revisions&rvprop=content&rvslots=main" +
                          $"&format=json";

                var response = await _httpClient.GetStringAsync(url);
                var json     = JsonDocument.Parse(response);
                var pages    = json.RootElement.GetProperty("query").GetProperty("pages");

                foreach (var page in pages.EnumerateObject())
                {
                    if (page.Name == "-1") continue;
                    if (!page.Value.TryGetProperty("revisions", out var revs)) continue;
                    if (revs.GetArrayLength() == 0) continue;

                    string wikitext;
                    var rev = revs[0];
                    // New-style slot API
                    if (rev.TryGetProperty("slots", out var slots) &&
                        slots.TryGetProperty("main", out var main) &&
                        main.TryGetProperty("*", out var content))
                        wikitext = content.GetString() ?? "";
                    // Legacy API
                    else if (rev.TryGetProperty("*", out var legacyContent))
                        wikitext = legacyContent.GetString() ?? "";
                    else
                        continue;

                    var coords = ParseCoordsFromWikitext(wikitext);
                    if (coords.HasValue && IsWithinMalaysia(coords.Value.lat, coords.Value.lng))
                        return (coords.Value.lat, coords.Value.lng, $"Wikipedia wikitext ({pageTitle})");
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        // Parses {{coord|3|06|15|N|101|38|16|E}} (DMS) or {{coord|3.104|N|101.638|E}} (decimal)
        private static (double lat, double lng)? ParseCoordsFromWikitext(string wikitext)
        {
            var m = Regex.Match(wikitext, @"\{\{[Cc]oord\|([^}]+)\}\}");
            if (!m.Success) return null;

            var parts = m.Groups[1].Value.Split('|');

            try
            {
                // DMS: deg|min|sec|N/S|deg|min|sec|E/W
                if (parts.Length >= 8 &&
                    (parts[3] == "N" || parts[3] == "S") &&
                    (parts[7] == "E" || parts[7] == "W"))
                {
                    var lat = (double.Parse(parts[0]) + double.Parse(parts[1]) / 60 + double.Parse(parts[2]) / 3600)
                              * (parts[3] == "S" ? -1 : 1);
                    var lng = (double.Parse(parts[4]) + double.Parse(parts[5]) / 60 + double.Parse(parts[6]) / 3600)
                              * (parts[7] == "W" ? -1 : 1);
                    return (lat, lng);
                }

                // DM: deg|min|N/S|deg|min|E/W
                if (parts.Length >= 6 &&
                    (parts[2] == "N" || parts[2] == "S") &&
                    (parts[5] == "E" || parts[5] == "W"))
                {
                    var lat = (double.Parse(parts[0]) + double.Parse(parts[1]) / 60) * (parts[2] == "S" ? -1 : 1);
                    var lng = (double.Parse(parts[3]) + double.Parse(parts[4]) / 60) * (parts[5] == "W" ? -1 : 1);
                    return (lat, lng);
                }

                // Decimal: lat|N/S|lon|E/W
                if (parts.Length >= 4 &&
                    (parts[1] == "N" || parts[1] == "S") &&
                    (parts[3] == "E" || parts[3] == "W"))
                {
                    var lat = double.Parse(parts[0]) * (parts[1] == "S" ? -1 : 1);
                    var lng = double.Parse(parts[2]) * (parts[3] == "W" ? -1 : 1);
                    return (lat, lng);
                }
            }
            catch { }

            return null;
        }

        // ── Wikidata ───────────────────────────────────────────────────────────────

        // Searches Wikidata entity API then fetches P625 (coordinate location)
        private async Task<(double lat, double lng, string source)?> SearchWikidata(string cleanName, string typeHint)
        {
            try
            {
                var candidates = new[]
                {
                    $"{cleanName} {typeHint} station",
                    $"{cleanName} station",
                    $"{cleanName} {typeHint} Station",
                    cleanName,
                };

                foreach (var candidate in candidates)
                {
                    var searchUrl = $"https://www.wikidata.org/w/api.php" +
                                   $"?action=wbsearchentities" +
                                   $"&search={Uri.EscapeDataString(candidate)}" +
                                   $"&language=en&type=item&limit=5&format=json";

                    var searchResp = await _httpClient.GetStringAsync(searchUrl);
                    var searchJson = JsonDocument.Parse(searchResp);
                    var results    = searchJson.RootElement.GetProperty("search");

                    for (int i = 0; i < results.GetArrayLength(); i++)
                    {
                        var item  = results[i];
                        var qid   = item.GetProperty("id").GetString()!;
                        var label = item.TryGetProperty("label", out var lbl) ? lbl.GetString() ?? "" : "";

                        // Skip items that clearly aren't stations
                        if (!label.Contains("station", StringComparison.OrdinalIgnoreCase) &&
                            !label.Contains(cleanName, StringComparison.OrdinalIgnoreCase))
                            continue;

                        var entityUrl = $"https://www.wikidata.org/w/api.php" +
                                       $"?action=wbgetentities&ids={qid}&props=claims&format=json";

                        var entityResp = await _httpClient.GetStringAsync(entityUrl);
                        var entityJson = JsonDocument.Parse(entityResp);

                        if (!entityJson.RootElement.GetProperty("entities").TryGetProperty(qid, out var entity)) continue;
                        if (!entity.TryGetProperty("claims", out var claims)) continue;
                        if (!claims.TryGetProperty("P625", out var p625)) continue; // coordinate location
                        if (p625.GetArrayLength() == 0) continue;

                        var mainsnak = p625[0].GetProperty("mainsnak");
                        if (!mainsnak.TryGetProperty("datavalue", out var dv)) continue;
                        var val = dv.GetProperty("value");

                        var lat = val.GetProperty("latitude").GetDouble();
                        var lng = val.GetProperty("longitude").GetDouble();

                        if (!IsWithinMalaysia(lat, lng)) continue;

                        return (lat, lng, $"Wikidata ({label})");
                    }
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        // ── Overpass / OSM ─────────────────────────────────────────────────────────

        private async Task<(double lat, double lng, string source)?> SearchOverpass(string cleanName)
        {
            try
            {
                // Try exact name first, then case-insensitive regex
                foreach (var nameFilter in new[]
                {
                    $"[\"name\"=\"{cleanName}\"]",
                    $"[\"name\"~\"{Regex.Escape(cleanName)}\",i]",
                })
                {
                    var query =
                        $"[out:json][timeout:15];" +
                        $"(" +
                        $"node{nameFilter}[\"railway\"=\"station\"](2.5,101.3,3.5,102.0);" +
                        $"node{nameFilter}[\"public_transport\"=\"station\"](2.5,101.3,3.5,102.0);" +
                        $");" +
                        $"out center;";

                    var url      = $"https://overpass-api.de/api/interpreter?data={Uri.EscapeDataString(query)}";
                    var response = await _httpClient.GetStringAsync(url);
                    var json     = JsonDocument.Parse(response);
                    var elements = json.RootElement.GetProperty("elements");

                    if (elements.GetArrayLength() == 0) continue;

                    var el  = elements[0];
                    var lat = el.GetProperty("lat").GetDouble();
                    var lng = el.GetProperty("lon").GetDouble();

                    if (!IsWithinMalaysia(lat, lng)) continue;

                    return (lat, lng, "Overpass/OSM");
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        // ── Nominatim ──────────────────────────────────────────────────────────────

        private async Task<(double lat, double lng, string source)?> SearchNominatim(string cleanName, string originalName)
        {
            try
            {
                var typeHint = GetTypeHint(originalName);
                var q        = Uri.EscapeDataString($"{cleanName} {typeHint} station");
                var url      = $"https://nominatim.openstreetmap.org/search?q={q}&format=json&countrycodes=my&limit=1";

                var response = await _httpClient.GetStringAsync(url);
                var json     = JsonDocument.Parse(response);

                if (json.RootElement.GetArrayLength() == 0) return null;

                var lat = double.Parse(json.RootElement[0].GetProperty("lat").GetString()!);
                var lng = double.Parse(json.RootElement[0].GetProperty("lon").GetString()!);

                if (!IsWithinMalaysia(lat, lng)) return null;

                return (lat, lng, "Nominatim/OSM");
            }
            catch
            {
                return null;
            }
        }

        // ── Google Geocoding ───────────────────────────────────────────────────────

        private async Task<(double lat, double lng, string source)?> SearchGoogle(string stationName, string apiKey)
        {
            try
            {
                var query = $"{CleanStationName(stationName)} {GetTypeHint(stationName)} station";
                var url   = $"https://maps.googleapis.com/maps/api/geocode/json" +
                            $"?address={Uri.EscapeDataString(query)}&region=my&components=country:MY&key={apiKey}";

                var response = await _httpClient.GetStringAsync(url);
                var json     = JsonDocument.Parse(response);
                var results  = json.RootElement.GetProperty("results");

                if (results.GetArrayLength() == 0) return null;

                var location = results[0].GetProperty("geometry").GetProperty("location");
                var lat = location.GetProperty("lat").GetDouble();
                var lng = location.GetProperty("lng").GetDouble();

                if (!IsWithinMalaysia(lat, lng)) return null;

                return (lat, lng, "Google Geocoding");
            }
            catch
            {
                return null;
            }
        }

        // ── Helpers ────────────────────────────────────────────────────────────────

        private static string CleanStationName(string name)
        {
            // Remove parenthetical transit types first
            var cleaned = Regex.Replace(name, @"\s*\((MRT|Monorail|LRT)\)", "", RegexOptions.IgnoreCase);
            // Remove standalone transit types at the end of the name
            cleaned = Regex.Replace(cleaned, @"\s+(MRT|Monorail|LRT)$", "", RegexOptions.IgnoreCase);
            return cleaned.Trim();
        }

        private static string GetTypeHint(string name)
        {
            if (name.Contains("Monorail", StringComparison.OrdinalIgnoreCase)) return "Monorail";
            if (name.Contains("MRT", StringComparison.OrdinalIgnoreCase))     return "MRT";
            return "LRT";
        }

        private static bool IsWithinMalaysia(double lat, double lng) =>
            lat is >= 0.8 and <= 7.5 && lng is >= 99.6 and <= 119.5;

        // ── GET /api/stations/nearby ───────────────────────────────────────────────

        [Authorize]
        [HttpGet("nearby")]
        public async Task<IActionResult> GetNearbyStations([FromQuery] double lat, [FromQuery] double lng, [FromQuery] int count = 5)
        {
            var stations = await _context.Stations
                .Include(s => s.LineStations)
                    .ThenInclude(ls => ls.TrainLine)
                .ToListAsync();

            var nearby = stations
                .Select(s => new
                {
                    stationId   = s.StationId,
                    stationName = s.StationName,
                    distance    = CalculateDistance(lat, lng, s.Latitude, s.Longitude),
                    lines       = s.LineStations.Select(ls => new
                    {
                        id   = ls.LineId,
                        name = ls.TrainLine.LineName
                    }).ToList()
                })
                .OrderBy(s => s.distance)
                .Take(count)
                .ToList();

            return Ok(nearby);
        }

        private static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371;
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static double ToRadians(double angle) => Math.PI * angle / 180.0;
    }
}
