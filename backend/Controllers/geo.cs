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
                    var query = $"{station.StationName} Kuala Lumpur";

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
    }
}