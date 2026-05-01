using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/data")] // Maintained original route to not break frontend links
    public class PassengerController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAlertService _alertService;
        private readonly IS3Service _s3Service;

        public PassengerController(AppDbContext context, IAlertService alertService, IS3Service s3Service)
        {
            _context = context;
            _alertService = alertService;
            _s3Service = s3Service;
        }

        private string? GetCurrentUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        [HttpGet("lines")]
        public async Task<IActionResult> GetLines()
        {
            var lines = await _context.TrainLines
                .Include(l => l.TrainAssets)
                .ThenInclude(ta => ta.TrainCoaches)
                .ToListAsync();

            var result = lines.Select(l => new
            {
                lineId = l.LineId,
                lineName = l.LineName,
                coaches = l.TrainAssets.SelectMany(ta => ta.TrainCoaches)
                                       .Select(c => c.CoachId)
                                       .Distinct()
                                       .OrderBy(c => c)
                                       .ToList(),
                trains = l.TrainAssets.Select(ta => ta.TrainId)
                                      .OrderBy(id => id)
                                      .ToList()
            });

            return Ok(result);
        }

        [Authorize]
        [HttpPost("report")]
        public async Task<IActionResult> SubmitReport([FromBody] SubmitReportRequest req)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { error = "User not found." });

            try
            {
                // Parse composite FK values sent from the frontend
                if (req.CoachId <= 0)
                    return BadRequest(new { error = "Coach selection is required." });
                
                if (string.IsNullOrEmpty(req.LineId) || string.IsNullOrEmpty(req.StationId))
                    return BadRequest(new { error = "Line and Station selection is required." });

                int coachId = req.CoachId;

                var report = new UserReport
                {
                    UserId      = userId,
                    TrainId     = req.TrainId,
                    CoachId     = coachId,
                    Description = req.Desc,
                    CreatedAt   = DateTime.UtcNow,
                    LineId      = req.LineId,
                    StationId   = req.StationId
                };

                _context.UserReports.Add(report);
                await _context.SaveChangesAsync();

                // Auto-create incident
                var incident = new Incident
                {
                    Source    = IncidentSource.USER_REPORT,
                    ReportId  = report.ReportId,
                    Status    = IncidentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Incidents.Add(incident);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, reportId = report.ReportId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.InnerException?.Message ?? ex.Message });
            }
        }

        [Authorize]
        [Consumes("multipart/form-data")]

        [HttpPost("report/{reportId}/image")]
        public async Task<IActionResult> UploadReportImage(int reportId, [FromForm] IFormFile image)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

            if (image == null || image.Length == 0)
            {
                Console.WriteLine($"[UPLOAD] Failed: No image received for report {reportId} (User: {userId})");
                return BadRequest(new { error = "No image provided." });
            }

            Console.WriteLine($"[UPLOAD] Received image: {image.FileName}, Size: {image.Length} bytes for report {reportId}");

            var report = await _context.UserReports.FindAsync(reportId);
            if (report == null || report.UserId != userId)
                return NotFound(new { error = "Report not found." });

            var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";

            var key = $"snapshots/user-report/{userId}-{reportId}{ext}";

            try
            {
                var url = await _s3Service.UploadFileWithKeyAsync(image, key);
                report.ImageUrl = url;
                await _context.SaveChangesAsync();
                return Ok(new { imageUrl = url });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (user.Role == UserRole.Auxiliary)
            {
                // Calculate average reaction time: EnrouteAt - CreatedAt
                var reactedIncidents = await _context.Incidents
                    .Where(i => i.EnrouteBy == userId && i.EnrouteAt != null)
                    .ToListAsync();

                double avgMinutes = 0;
                if (reactedIncidents.Any())
                {
                    avgMinutes = reactedIncidents
                        .Select(i => (i.EnrouteAt!.Value - i.CreatedAt).TotalMinutes)
                        .Average();
                }

                // Resolved count
                var resolvedCount = await _context.Incidents
                    .CountAsync(i => i.ResolvedBy == userId && i.Status == IncidentStatus.Resolved);

                return Ok(new
                {
                    userId = user.UserId,
                    userName = user.UserName,
                    email = user.Email,
                    role = user.Role,
                    avgReactionTime = Math.Round(avgMinutes, 1),
                    resolved = resolvedCount
                });
            }
            else
            {
                var reportsCount = await _context.UserReports.CountAsync(r => r.UserId == userId);
                var validReports = await _context.Incidents
                    .Include(i => i.UserReport)
                    .CountAsync(i => i.UserReport != null && i.UserReport.UserId == userId && (i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Escalated));

                return Ok(new
                {
                    userId = user.UserId,
                    userName = user.UserName,
                    email = user.Email,
                    role = user.Role,
                    reports = reportsCount,
                    verified = validReports
                });
            }
        }

        [HttpGet("incident-near-me")]
        public async Task<IActionResult> GetIncidentNearMe()
        {
            var incidents = await _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc.TrainAsset)
                                .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Where(i => (i.Status == IncidentStatus.Pending || i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.En_Route || i.Status == IncidentStatus.Escalated) && i.CreatedAt >= DateTime.UtcNow.Date)
                .OrderByDescending(i => i.CreatedAt)
                .Take(10)
                .ToListAsync();

            var now = DateTime.UtcNow;

            var result = incidents.Select(i =>
            {
                var dto = _alertService.MapToAlertDTO(i, now);

                return new
                {
                    dto.Id,
                    dto.Line,
                    dto.Station,
                    dto.TrainId,
CoachId = dto.CoachId,
                    type = dto.Source == "ai" ? "AI Detection" : "Passenger Report",
                    time = dto.Time,
                    date = dto.Date,
                    status = dto.Status,
                    dto.ImageUrl
                };
            });

           
            return Ok(result);
        }

        [Authorize]
        [HttpGet("debug-reports")]
        public async Task<IActionResult> DebugReports()
        {
            var reports = await _context.UserReports.ToListAsync();
            var incidents = await _context.Incidents.Where(i => i.ReportId != null).ToListAsync();
            return Ok(new { totalReports = reports.Count, totalReportIncidents = incidents.Count, reports = reports });
        }

        [Authorize]
        [HttpGet("my-history")]
        public async Task<IActionResult> GetMyHistory()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

            var incidents = await _context.Incidents
                .AsNoTracking()
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.DismissedByUser)
                .Where(i => i.UserReport != null && i.UserReport.UserId == userId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var now = DateTime.UtcNow;
            var result = incidents.Select(inc => {
                var dto = _alertService.MapToAlertDTO(inc, now);
                return new
                {
                    id = dto.Id,
                    incidentId = inc.IncidentId,
                    type = inc.UserReport?.Description ?? "Violation",
                    date = dto.Date,
                    time = dto.Time,
                    status = dto.Status,
                    line = dto.Line,
                    coach = dto.CoachId.ToString() ?? "Unknown Coach",
                    description = inc.UserReport?.Description,
                    imageUrl = dto.ImageUrl,
                    // Audit trail
                    verifiedBy = dto.VerifiedBy,
                    verifiedAt = dto.VerifiedAt,
                    verifiedComment = dto.VerifiedComment,
                    escalatedBy = dto.EscalatedBy,
                    escalatedAt = dto.EscalatedAt,
                    escalatedComment = dto.EscalatedComment,
                    enrouteBy = dto.EnrouteBy,
                    enrouteAt = dto.EnrouteAt,
                    resolvedBy = dto.ResolvedBy,
                    resolvedAt = dto.ResolvedAt,
                    resolvedComment = dto.ResolvedComment,
                    dismissedBy = dto.DismissedBy,
                    dismissedAt = dto.DismissedAt,
                    dismissedComment = dto.DismissedComment,
                };
            });

            return Ok(result);
        }

        [Authorize]
        [HttpPost("incident/{incidentId}/status")]
        public async Task<IActionResult> UpdateIncidentStatus(int incidentId, [FromBody] UpdatePassengerStatusRequest req)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

            var incident = await _context.Incidents.Include(i => i.UserReport).FirstOrDefaultAsync(i => i.IncidentId == incidentId);
            if (incident == null) return NotFound();

            if (incident.UserReport == null || incident.UserReport.UserId != userId)
                return Unauthorized(new { error = "You can only modify your own reports." });

            if (incident.Status != IncidentStatus.Pending)
                return BadRequest(new { error = "Only pending reports can be updated." });

            if (req.Action == "Escalate")
            {
                incident.Status = IncidentStatus.Escalated;
                incident.EscalatedBy = userId;
                incident.EscalatedAt = DateTime.UtcNow;
                incident.EscalatedComment = req.Comment;
            }
            else if (req.Action == "Dismiss")
            {
                if (string.IsNullOrWhiteSpace(req.Comment)) 
                    return BadRequest(new { error = "A comment is required to cancel/dismiss a report." });
                
                incident.Status = IncidentStatus.Dismissed;
                incident.DismissedBy = userId;
                incident.DismissedAt = DateTime.UtcNow;
                incident.DismissedComment = req.Comment;
            }
            else
            {
                return BadRequest(new { error = "Invalid action. Use 'Escalate' or 'Dismiss'." });
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, status = incident.Status.ToString() });
        }

        [HttpGet("stations-by-line/{lineId}")]
        public async Task<IActionResult> GetStationsByLine(string lineId)
        {
            var stations = await _context.LineStations
                .Where(ls => ls.LineId == lineId)
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .Select(ls => new
                {
                    stationId = ls.StationId,
                    stationName = ls.Station.StationName
                })
                .ToListAsync();

            return Ok(stations);
        }
    }

    public class SubmitReportRequest
    {
        public string Line  { get; set; } = null!;
        public string Coach { get; set; } = null!;  // display label (may be "Unknown")
        public int    TrainId  { get; set; }         // integer FK
        public int    CoachId  { get; set; }         // integer FK
        public string Desc    { get; set; } = null!;
        public string? LineId   { get; set; }
        public string? StationId { get; set; }
    }

    public class UpdatePassengerStatusRequest
    {
        public string Action { get; set; } = null!;
        public string? Comment { get; set; }
    }
}
