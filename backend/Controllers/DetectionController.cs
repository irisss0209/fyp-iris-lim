using backend.Data;
using backend.Hubs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/detections")]
    public class DetectionController : BaseApiController
    {
        private readonly AppDbContext _context;
        private readonly IPushNotificationService _pushService;
        private readonly IHubContext<AlertHub> _hub;
        private readonly IConfiguration _config;
        private readonly ILogger<DetectionController> _logger;

        public DetectionController(AppDbContext context, IPushNotificationService pushService,
            IHubContext<AlertHub> hub, IConfiguration config, ILogger<DetectionController> logger)
        {
            _context = context;
            _pushService = pushService;
            _hub = hub;
            _config = config;
            _logger = logger;
        }


        [HttpPost("notify")]
        public async Task<IActionResult> NotifyNewDetection([FromBody] DetectionNotifyRequest req)
        {
            var expected = _config["Lambda:NotifyApiKey"];
            if (string.IsNullOrWhiteSpace(expected) ||
                !Request.Headers.TryGetValue("X-Api-Key", out var provided) ||
                provided != expected)
                return Unauthorized(new { error = "Invalid or missing API key." });

            var incident = await _context.Incidents.FindAsync(req.IncidentId);
            if (incident == null)
                return NotFound(new { error = $"Incident {req.IncidentId} not found." });

            if (incident.Source != Models.IncidentSource.AI_DETECTION)
                return BadRequest(new { error = "Incident is not an AI detection." });

            await _hub.Clients.All.SendAsync("NewIncident", incident.IncidentId);
            await _pushService.SafeNotifyNewIncident(incident.IncidentId, null, _logger);

            return Ok(new { notified = true, incidentId = incident.IncidentId });
        }

        public class DetectionNotifyRequest
        {
            public int IncidentId { get; set; }
        }
    }
}
