using Microsoft.AspNetCore.Mvc;
using backend.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
namespace backend.Controllers
{
    [ApiController]
    [Route("api")]
    public class GeoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GeoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("stations/geocode")]
        public async Task<IActionResult> GeocodeStations()
        {
            var apiKey = "AIzaSyCPZkeRtasgCoZPld0_zLdxNtbOL5Odtug";

            var stations = _context.Stations
                .Where(s => s.Latitude == null || s.Longitude == null)
                .ToList();

            using var httpClient = new HttpClient();

            foreach (var station in stations)
            {
                try
                {
                    var query =  $"{station.StationName} lrt station Malaysia";

                    var url =
                        $"https://maps.googleapis.com/maps/api/geocode/json?address={Uri.EscapeDataString(query)}&key={apiKey}";

                    var response = await httpClient.GetStringAsync(url);
                    var json = JsonDocument.Parse(response);

                    var results = json.RootElement.GetProperty("results");

                    if (results.GetArrayLength() > 0)
                    {
                        var location = results[0]
                            .GetProperty("geometry")
                            .GetProperty("location");

                        station.Latitude = location.GetProperty("lat").GetDouble();
                        station.Longitude = location.GetProperty("lng").GetDouble();

                        Console.WriteLine($"✔ {station.StationName} → {station.Latitude}, {station.Longitude}");
                    }
                    else
                    {
                        Console.WriteLine($"❌ Not found: {station.StationName}");
                    }

                    await Task.Delay(200);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️ Error for {station.StationName}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();

            return Ok("Geocoding completed");
        }

        [HttpGet("stations/nearby")]
        public async Task<IActionResult> GetNearbyStations([FromQuery] double lat, [FromQuery] double lng, [FromQuery] int count = 3)
        {
            var stations = await _context.Stations
                .Include(s => s.LineStations)
                    .ThenInclude(ls => ls.TrainLine)
                .Where(s => s.Latitude != null && s.Longitude != null)
                .ToListAsync();

            var nearby = stations
                .Select(s => new
                {
                    stationId = s.StationId,
                    stationName = s.StationName,
                    distance = CalculateDistance(lat, lng, s.Latitude!.Value, s.Longitude!.Value),
                    lines = s.LineStations.Select(ls => new { 
                        id = ls.LineId, 
                        name = ls.TrainLine.LineName 
                    }).ToList()
                })
                .OrderBy(s => s.distance)
                .Take(count)
                .ToList();

            return Ok(nearby);
        }

        // Haversine formula to calculate distance in KM
        private double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
        {
            var R = 6371; // Earth radius in km
            var dLat = ToRadians(lat2 - lat1);
            var dLon = ToRadians(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private double ToRadians(double angle) => Math.PI * angle / 180.0;
    }
}
