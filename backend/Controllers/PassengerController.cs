using backend.Data;
using backend.Models;
using backend.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Services;

namespace backend.Controllers
{
    public class ImageUploadDto
    {
        public IFormFile Image { get; set; } = null!;
    }

    [ApiController]
    [Route("api/data")] // Maintained original route to not break frontend links
    public class PassengerController : BaseApiController
    {
        private readonly AppDbContext _context;
        private readonly IAlertService _alertService;
        private readonly IS3Service _s3Service;
        private readonly ILogger<PassengerController> _logger;

        public PassengerController(AppDbContext context, IAlertService alertService, IS3Service s3Service, ILogger<PassengerController> logger)
        {
            _context = context;
            _alertService = alertService;
            _s3Service = s3Service;
            _logger = logger;
        }

        [HttpGet("lines")]
        public async Task<IActionResult> GetLines()
        {
            var lines = await _context.TrainLines
                .Include(l => l.TrainAssets)
                .ThenInclude(ta => ta.TrainCoaches)
                .ToListAsync();

            var result = lines.Select(l => new TrainLineDto
            {
                LineId   = l.LineId,
                LineName = l.LineName,
                Coaches  = l.TrainAssets.SelectMany(ta => ta.TrainCoaches)
                                        .Select(c => c.CoachId)
                                        .Distinct()
                                        .OrderBy(c => c)
                                        .ToList(),
                Trains   = l.TrainAssets.Select(ta => ta.TrainId)
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

                await using var tx = await _context.Database.BeginTransactionAsync();

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

                // Auto-create incident atomically with the report
                var incident = new Incident
                {
                    Source    = IncidentSource.USER_REPORT,
                    ReportId  = report.ReportId,
                    Status    = IncidentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Incidents.Add(incident);
                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return StatusCode(StatusCodes.Status201Created, new ReportSubmitResponseDto { Success = true, ReportId = report.ReportId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to submit report for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to submit report. Please try again." });
            }
        }

        [Authorize]
        [Consumes("multipart/form-data")]
        [HttpPost("report/{reportId}/image")]
        public async Task<IActionResult> UploadReportImage(int reportId, [FromForm] ImageUploadDto dto)
        {
            var image = dto.Image;
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

            if (image == null || image.Length == 0)
            {
                Console.WriteLine($"[UPLOAD] Failed: No image received for report {reportId} (User: {userId})");
                return BadRequest(new { error = "No image provided." });
            }

            const long maxBytes = 5 * 1024 * 1024;
            if (image.Length > maxBytes)
                return BadRequest(new { error = "Image must be smaller than 5 MB." });

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
            if (!allowedTypes.Contains(image.ContentType.ToLowerInvariant()))
                return BadRequest(new { error = "Only JPEG, PNG, GIF, and WebP images are accepted." });

            var report = await _context.UserReports.FindAsync(reportId);
            if (report == null || report.UserId != userId)
                return NotFound(new { error = "Report not found." });

            // Derive extension from the validated content-type, not the user-controlled filename
            var ext = image.ContentType.ToLowerInvariant() switch
            {
                "image/jpeg" => ".jpg",
                "image/png"  => ".png",
                "image/gif"  => ".gif",
                "image/webp" => ".webp",
                _            => ".jpg"
            };

            var key = $"snapshots/user-report/{userId}-{reportId}{ext}";

            try
            {
                var url = await _s3Service.UploadFileWithKeyAsync(image, key);
                report.ImageUrl = url;
                await _context.SaveChangesAsync();
                return Ok(new ImageUploadResponseDto { ImageUrl = url });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "S3 upload failed for report {ReportId}", reportId);
                return StatusCode(500, new { error = "Failed to upload image. Please try again." });
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
                var avgMinutes = await _context.Incidents
                    .Where(i => i.EnrouteBy == userId && i.EnrouteAt != null)
                    .Select(i => (double?)(i.EnrouteAt!.Value - i.CreatedAt).TotalMinutes)
                    .AverageAsync() ?? 0;

                var resolvedCount = await _context.Incidents
                    .CountAsync(i => i.ResolvedBy == userId && i.Status == IncidentStatus.Resolved);

                return Ok(new AuxiliaryProfileDto
                {
                    UserId          = user.UserId,
                    UserName        = user.UserName,
                    Email           = user.Email,
                    Role            = user.Role.ToString(),
                    AvgReactionTime = Math.Round(avgMinutes, 1),
                    Resolved        = resolvedCount
                });
            }
            else
            {
                var reportsCount = await _context.UserReports.CountAsync(r => r.UserId == userId);
                var validReports = await _context.Incidents
                    .Include(i => i.UserReport)
                    .CountAsync(i => i.UserReport != null && i.UserReport.UserId == userId &&
                        (i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Escalated));

                return Ok(new PassengerProfileDto
                {
                    UserId   = user.UserId,
                    UserName = user.UserName,
                    Email    = user.Email,
                    Role     = user.Role.ToString(),
                    Reports  = reportsCount,
                    Verified = validReports
                });
            }
        }

        [HttpGet("incident-near-me")]
        public async Task<IActionResult> GetIncidentNearMe()
        {
            var mytToday = DateTime.UtcNow.AddHours(8).Date;
            var todayUtc = DateTime.SpecifyKind(mytToday.AddHours(-8), DateTimeKind.Utc);

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
                .Where(i => (i.Status == IncidentStatus.Pending || i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.En_Route || i.Status == IncidentStatus.Escalated) && i.CreatedAt >= todayUtc)
                .OrderByDescending(i => i.CreatedAt)
                .Take(10)
                .ToListAsync();

            var now = DateTime.UtcNow;

            var result = incidents.Select(i =>
            {
                var dto = _alertService.MapToAlertDTO(i, now);
                return new NearbyIncidentDto
                {
                    Id       = dto.Id,
                    Line     = dto.Line,
                    Station  = dto.Station,
                    TrainId  = dto.TrainId,
                    CoachId  = dto.CoachId,
                    Type     = dto.Source == "ai" ? "AI Detection" : "Passenger Report",
                    Time     = dto.Time,
                    Date     = dto.Date,
                    Status   = dto.Status,
                    ImageUrl = dto.ImageUrl
                };
            });

            return Ok(result);
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
            var result = incidents.Select(inc =>
            {
                var dto = _alertService.MapToAlertDTO(inc, now);
                return new IncidentHistoryItemDto
                {
                    Id          = dto.Id,
                    IncidentId  = inc.IncidentId,
                    Type        = inc.UserReport?.Description ?? "Violation",
                    Date        = dto.Date,
                    Time        = dto.Time,
                    Status      = dto.Status,
                    Line        = dto.Line,
                    Coach       = dto.CoachId?.ToString() ?? "Unknown Coach",
                    Description = inc.UserReport?.Description,
                    ImageUrl    = dto.ImageUrl,
                    VerifiedBy       = dto.VerifiedBy,
                    VerifiedAt       = dto.VerifiedAt,
                    VerifiedComment  = dto.VerifiedComment,
                    EscalatedBy      = dto.EscalatedBy,
                    EscalatedAt      = dto.EscalatedAt,
                    EscalatedComment = dto.EscalatedComment,
                    EnrouteBy        = dto.EnrouteBy,
                    EnrouteAt        = dto.EnrouteAt,
                    EnrouteComment   = dto.EnrouteComment,
                    ResolvedBy       = dto.ResolvedBy,
                    ResolvedAt       = dto.ResolvedAt,
                    ResolvedComment  = dto.ResolvedComment,
                    DismissedBy      = dto.DismissedBy,
                    DismissedAt      = dto.DismissedAt,
                    DismissedComment = dto.DismissedComment,
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
                .Select(ls => new StationDto
                {
                    StationId   = ls.StationId,
                    StationName = ls.Station.StationName
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
