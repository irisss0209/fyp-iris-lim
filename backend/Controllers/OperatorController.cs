using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
namespace backend.Controllers
{
    [ApiController]
    [Route("api/data")] // Maintained original route to not break frontend links
    public class OperatorController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OperatorController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("home-stats")]
        public async Task<IActionResult> GetHomeStats()
        {
            var lines = await _context.TrainLines.ToListAsync();

            // Recent reports from DB
            var recentIncidents = await _context.Incidents
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(c => c!.TrainAsset)
                            .ThenInclude(a => a.TrainLine)
                .OrderByDescending(i => i.CreatedAt)
                .Take(5)
                .ToListAsync();

            var recentReports = recentIncidents.Select(i => new
            {
                id = "RPT-" + i.IncidentId.ToString("D3"),
                line = i.UserReport?.TrainCoach?.TrainAsset?.TrainLine?.LineName ?? "Unknown",
                type = i.Source == IncidentSource.AI_DETECTION ? "AI Detection" : "Passenger Report",
                time = GetTimeSince(i.CreatedAt),
                status = i.Status,
                elapsed = (int)(DateTime.UtcNow - i.CreatedAt).TotalMinutes
            }).ToList();

            // Real trend data: incidents grouped by day of week (last 30 days)
            var dayNames = new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
            var since = DateTime.UtcNow.AddDays(-30);

            var allIncidents = await _context.Incidents
                .Where(i => i.CreatedAt >= since)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc.TrainAsset)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                .ToListAsync();

            // Helper to resolve lineId for an incident
            string? ResolveLineId(Incident inc)
            {
                if (inc.Source == IncidentSource.AI_DETECTION && inc.Detection?.Camera?.TrainCoach?.TrainAsset != null)
                    return inc.Detection.Camera.TrainCoach.TrainAsset.LineId;
                if (inc.UserReport?.TrainCoach?.TrainAsset != null)
                    return inc.UserReport.TrainCoach.TrainAsset.LineId;
                return null;
            }

            // "All Lines" trend
            var allLinesTrend = Enumerable.Range(0, 7).Select(d => new
            {
                day = dayNames[d],
                count = allIncidents.Count(i => (int)i.CreatedAt.DayOfWeek == d)
            }).ToList();

            var trendData = new Dictionary<string, object> { { "All Lines", allLinesTrend } };

            // Per-line trends + summary
            var lineSummary = new List<object>();
            foreach (var line in lines)
            {
                var lineIncidents = allIncidents.Where(i => ResolveLineId(i) == line.LineId).ToList();

                var lineTrend = Enumerable.Range(0, 7).Select(d => new
                {
                    day = dayNames[d],
                    count = lineIncidents.Count(i => (int)i.CreatedAt.DayOfWeek == d)
                }).ToList();

                trendData[line.LineName] = lineTrend;

                lineSummary.Add(new
                {
                    name = line.LineName,
                    value = lineIncidents.Count
                });
            }

            return Ok(new
            {
                trendData,
                lineSummary,
                recentReports
            });
        }

        [HttpGet("indicent-alerts")]
        public async Task<IActionResult> GetPoliceAlerts([FromQuery] string? assignedStationId = null)
        {
            // Preload all line→station mappings once (first station per line by sequence)
            var lineStations = await _context.LineStations
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .ToListAsync();

            // Resolve lines passing through the assigned station if provided
            List<string>? allowedLines = null;
            if (!string.IsNullOrEmpty(assignedStationId))
            {
                allowedLines = lineStations
                    .Where(ls => ls.StationId == assignedStationId)
                    .Select(ls => ls.LineId)
                    .ToList();
            }

            var incidentsQuery = _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc.TrainAsset)
                                .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(c => c!.TrainAsset)
                            .ThenInclude(a => a.TrainLine)
                .AsQueryable();

            var incidents = await incidentsQuery
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var alerts = incidents.Select(i =>
            {
                string? lineId = null;
                string? lineName = null;
                string? coachId = null;
                string? snapshotUrl = null;

                if (i.Source == IncidentSource.AI_DETECTION && i.Detection?.Camera != null)
                {
                    coachId = i.Detection.Camera.CoachId;
                    lineName = i.Detection.Camera.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId   = i.Detection.Camera.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                    snapshotUrl = i.Detection.ImageUrl;
                }
                else if (i.UserReport != null)
                {
                    coachId = i.UserReport.CoachId;
                    lineName = i.UserReport.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId   = i.UserReport.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                    snapshotUrl = i.UserReport.ImageUrl;
                }

                return new
                {
                    id = "ALT-" + i.IncidentId.ToString("D3"),
                    coach = coachId ?? "Unknown",
                    line = lineName ?? "Unknown",
                    lineId = lineId ?? "Unknown",
                    station = lineStations.FirstOrDefault(ls => ls.LineId == lineId)?.Station?.StationName ?? "Unknown",
                    time = i.CreatedAt.ToString("HH:mm"),
                    elapsed = Math.Max(1, (int)(DateTime.UtcNow - i.CreatedAt).TotalMinutes),
                    severity = i.Source == IncidentSource.AI_DETECTION ? "high" : "medium",
                    status = i.Status.ToString().ToLower(),
                    type = i.Source == IncidentSource.AI_DETECTION ? "AI Detection" : "Passenger Report",
                    snapshotUrl
                };
            })
            // Filter by allowed lines if station is assigned
            .Where(a => allowedLines == null || allowedLines.Contains(a.lineId))
            .ToList();

            return Ok(alerts);
        }

        [Authorize]
[HttpPost("indicent-alerts/{id}/status")]
public async Task<IActionResult> UpdateAlertStatus(string id, [FromBody] UpdateStatusRequest request)
{
    var incidentIdStr = id.Replace("ALT-", "").Replace("RPT-", "");

    if (!int.TryParse(incidentIdStr, out var incidentId))
        return BadRequest();

    var incident = await _context.Incidents.FindAsync(incidentId);
    if (incident == null)
        return NotFound();

    // Accept frontend aliases (e.g. "resolve" → "Resolved", "en_route" → "En_Route")
    var normalizedStatus = request.Status?.Trim() switch
    {
        "resolve"  => "Resolved",
        "en_route" => "En_Route",
        { } s      => char.ToUpper(s[0]) + s[1..],  // capitalise first letter
        null       => null
    };

    if (!Enum.TryParse<IncidentStatus>(normalizedStatus, true, out var parsedStatus))
        return BadRequest("Invalid status");

    incident.Status = parsedStatus;

    var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

    switch (parsedStatus)
    {
        case IncidentStatus.Verified:
            incident.VerifiedBy      = userId;
            incident.VerifiedAt      = DateTime.UtcNow;
            incident.VerifiedComment = request.Comment;
            break;

        case IncidentStatus.Escalated:
            incident.EscalatedBy      = userId;
            incident.EscalatedAt      = DateTime.UtcNow;
            incident.EscalatedComment = request.Comment;
            break;

        case IncidentStatus.En_Route:
            incident.EnrouteBy = userId;
            incident.EnrouteAt = DateTime.UtcNow;
            break;

        case IncidentStatus.Resolved:
            incident.ResolvedBy      = userId;
            incident.ResolvedAt      = DateTime.UtcNow;
            incident.ResolvedComment = request.Comment;
            break;

        case IncidentStatus.Dismissed:
            incident.DismissedBy      = userId;
            incident.DismissedAt      = DateTime.UtcNow;
            incident.DismissedComment = request.Comment;
            break;
    }

    await _context.SaveChangesAsync();
    return Ok(new
    {
        incidentId = incident.IncidentId,
        status     = incident.Status.ToString().ToLower()
    });
}

        [HttpGet("operator/dashboard")]
        public async Task<IActionResult> GetOperatorDashboard()
        {
            // Stats
            var pending   = await _context.Incidents.CountAsync(i => i.Status == IncidentStatus.Pending);
            var verified  = await _context.Incidents.CountAsync(i => i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.Escalated);
            var resolved  = await _context.Incidents.CountAsync(i => i.Status == IncidentStatus.Resolved);
            var dismissed = await _context.Incidents.CountAsync(i => i.Status == IncidentStatus.Dismissed);

            var camerasOnline = await _context.Cameras.CountAsync(c => c.Status == CameraStatus.Active);
            var camerasTotal  = await _context.Cameras.CountAsync();

            // Average response time (verified_at - created_at) for incidents that have been verified
            var verifiedIncidents = await _context.Incidents
                .Where(i => i.VerifiedAt != null)
                .Select(i => new { i.CreatedAt, i.VerifiedAt })
                .ToListAsync();

            double avgResponseMinutes = verifiedIncidents.Count > 0
                ? verifiedIncidents.Average(i => (i.VerifiedAt!.Value - i.CreatedAt).TotalMinutes)
                : 0;

            // Preload all line→station mappings once
            var lineStations = await _context.LineStations
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .ToListAsync();

            // Recent alerts (last 4)
            var incidents = await _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc.TrainAsset)
                                .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.User)
                .OrderByDescending(i => i.CreatedAt)
                .Take(4)
                .ToListAsync();

            var recentAlerts = incidents.Select(inc =>
            {
                string? lineName = null;
                string? lineId   = null;
                string? coachId  = null;
                decimal? confidence = null;
                string source;

                if (inc.Source == IncidentSource.AI_DETECTION && inc.Detection?.Camera != null)
                {
                    source = "ai";
                    confidence = inc.Detection.ConfidenceScore;
                    coachId  = inc.Detection.Camera.CoachId;
                    lineName = inc.Detection.Camera.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId   = inc.Detection.Camera.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                }
                else
                {
                    source = "passenger";
                    coachId  = inc.UserReport?.CoachId;
                    lineName = inc.UserReport?.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId   = inc.UserReport?.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                }

                // Resolve station in-memory
                var stationName = lineStations
                    .FirstOrDefault(ls => ls.LineId == lineId)
                    ?.Station?.StationName ?? "Unknown";

                return new
                {
                    id = (inc.Source == IncidentSource.AI_DETECTION ? "ALT-" : "RPT-") + inc.IncidentId.ToString("D3"),
                    coachId = coachId ?? "Unknown",
                    line    = lineName ?? "Unknown",
                    lineId  = lineId   ?? "Unknown",
                    station = stationName,
                    time    = GetTimeSince(inc.CreatedAt),
                    status  = inc.Status.ToString().ToLower(),
                    confidence = confidence != null ? (int)confidence : (int?)null,
                    source
                };
            }).ToList();

            return Ok(new
            {
                stats = new
                {
                    pending,
                    verified,
                    resolved,
                    dismissed,
                    camerasOnline,
                    camerasTotal,
                    avgResponseMinutes = Math.Round(avgResponseMinutes, 1)
                },
                recentAlerts
            });
        }

        [HttpGet("operator/alerts")]
        public async Task<IActionResult> GetOperatorAlerts()
        {
            // All lines + stations for filter dropdowns (also used for station resolution)
            var lineStations = await _context.LineStations
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .ToListAsync();

            var lines = await _context.TrainLines
                .OrderBy(l => l.LineId)
                .Select(l => new { lineId = l.LineId, lineName = l.LineName })
                .ToListAsync();

            var stationsByLine = lineStations
                .GroupBy(ls => ls.LineId)
                .Select(g => new
                {
                    lineId = g.Key,
                    stations = g.Select(ls => new
                    {
                        stationId   = ls.StationId,
                        stationName = ls.Station.StationName
                    }).ToList()
                }).ToList();

            // All incidents
            var incidents = await _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc.TrainAsset)
                                .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.User)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var alerts = incidents.Select(inc =>
            {
                string? lineName   = null;
                string? lineId     = null;
                string? coachId    = null;
                string? deviceId   = null;
                decimal? confidence = null;
                string source;

                if (inc.Source == IncidentSource.AI_DETECTION && inc.Detection?.Camera != null)
                {
                    source     = "ai";
                    confidence = inc.Detection.ConfidenceScore;
                    deviceId   = inc.Detection.CameraId;
                    coachId    = inc.Detection.Camera.CoachId;
                    lineName   = inc.Detection.Camera.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId     = inc.Detection.Camera.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                }
                else
                {
                    source     = "passenger";
                    coachId    = inc.UserReport?.CoachId;
                    lineName   = inc.UserReport?.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId     = inc.UserReport?.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                }

                // Resolve station in-memory
                var stationName = lineStations
                    .FirstOrDefault(ls => ls.LineId == lineId)
                    ?.Station?.StationName ?? "Unknown";

                // Pass status through exactly as stored (lowercase snake_case)
                var mappedStatus = inc.Status.ToString().ToLower() switch
                {
                    "en_route" => "en_route",
                    var other  => other
                };

                return new
                {
                    id         = (inc.Source == IncidentSource.AI_DETECTION ? "ALT-" : "RPT-") + inc.IncidentId.ToString("D3"),
                    coachId    = coachId    ?? "Unknown",
                    line       = lineName   ?? "Unknown",
                    lineId     = lineId     ?? "Unknown",
                    station    = stationName,
                    time       = inc.CreatedAt.ToString("HH:mm:ss"),
                    date       = inc.CreatedAt.ToString("yyyy-MM-dd"),
                    elapsed    = GetTimeSince(inc.CreatedAt),
                    status     = mappedStatus,
                    confidence = confidence != null ? (int)confidence : (int?)null,
                    deviceId,
                    source,
                    passengerComment = inc.UserReport?.Description,
                    imageUrl   = inc.Source == IncidentSource.AI_DETECTION
                        ? inc.Detection?.ImageUrl
                        : inc.UserReport?.ImageUrl,
                    // ── Audit trail ──
                    verifiedBy      = inc.VerifiedBy,
                    verifiedAt      = inc.VerifiedAt?.ToString("yyyy-MM-dd HH:mm"),
                    verifiedComment = inc.VerifiedComment,
                    escalatedBy      = inc.EscalatedBy,
                    escalatedAt      = inc.EscalatedAt?.ToString("yyyy-MM-dd HH:mm"),
                    escalatedComment = inc.EscalatedComment,
                    enrouteBy  = inc.EnrouteBy,
                    enrouteAt  = inc.EnrouteAt?.ToString("yyyy-MM-dd HH:mm"),
                    resolvedBy      = inc.ResolvedBy,
                    resolvedAt      = inc.ResolvedAt?.ToString("yyyy-MM-dd HH:mm"),
                    resolvedComment = inc.ResolvedComment,
                    dismissedBy      = inc.DismissedBy,
                    dismissedAt      = inc.DismissedAt?.ToString("yyyy-MM-dd HH:mm"),
                    dismissedComment = inc.DismissedComment,
                };
            }).ToList();

            // Counts derived in-memory from the already-built list
            var pending   = alerts.Count(a => a.status == "pending");
            var verified  = alerts.Count(a => a.status == "verified");
            var escalated = alerts.Count(a => a.status == "escalated");
            var enroute   = alerts.Count(a => a.status == "en_route" || a.status == "enroute");
            var resolved  = alerts.Count(a => a.status == "resolved");
            var dismissed = alerts.Count(a => a.status == "dismissed");

            return Ok(new
            {
                lines,
                stationsByLine,
                stats = new { pending, verified, escalated, enRoute = enroute, resolved, dismissed },
                alerts
            });
        }

        private string GetTimeSince(DateTime time)
        {
            var ts = DateTime.UtcNow - time;
            if (ts.TotalMinutes < 1) return "Just now";
            if (ts.TotalMinutes < 60) return $"{(int)ts.TotalMinutes} min ago";
            if (ts.TotalHours < 24) return $"{(int)ts.TotalHours}h ago";
            return $"{(int)ts.TotalDays}d ago";
        }

        // ── User Management ───────────────────────────────────────────────────

        [HttpGet("operator/users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .OrderBy(u => u.UserName)
                .Select(u => new
                {
                    userId    = u.UserId,
                    userName  = u.UserName,
                    email     = u.Email,
                    role      = u.Role.ToString(),
                    status    = u.Status.ToString(),
                    createdAt = u.CreatedAt.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPatch("operator/users/{userId}/status")]
        public async Task<IActionResult> UpdateUserStatus(string userId, [FromBody] PatchUserStatusRequest req)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { error = "User not found." });

            if (user.Status == UserStatus.Archived)
                return BadRequest(new { error = "Archived users cannot be modified." });

            var newStatus = req.Status?.Trim() switch
            {
                "Suspended" => (UserStatus?)UserStatus.Suspended,
                "Archived"  => (UserStatus?)UserStatus.Archived,
                "Active"    => (UserStatus?)UserStatus.Active,
                _           => null
            };

            if (newStatus == null)
                return BadRequest(new { error = "Invalid status. Allowed: Active, Suspended, Archived." });

            user.Status = newStatus.Value;
            await _context.SaveChangesAsync();

            return Ok(new { userId = user.UserId, status = user.Status.ToString() });
        }

        // ── Shifts with line info ───────────────────────────────────────────────────

        [HttpGet("operator/shifts")]
        public async Task<IActionResult> GetOperatorShifts()
        {
            var lineStations = await _context.LineStations
                .Include(ls => ls.TrainLine)
                .Include(ls => ls.Station)
                .ToListAsync();

            var shifts = await _context.AuxiliaryShifts
                .Include(s => s.User)
                .Include(s => s.Station)
                .OrderByDescending(s => s.ShiftDate)
                .ThenByDescending(s => s.StartTime)
                .ToListAsync();

            var result = shifts.Select(s =>
            {
                var lineName = lineStations
                    .FirstOrDefault(ls => ls.StationId == s.StationId)
                    ?.TrainLine?.LineName ?? "—";

                return new
                {
                    shiftId     = s.ShiftId,
                    userId      = s.UserId,
                    userName    = s.User.UserName,
                    stationId   = s.StationId,
                    stationName = s.Station.StationName,
                    lineName,
                    shiftDate   = s.ShiftDate.ToString("yyyy-MM-dd"),
                    startTime   = s.StartTime.ToString(@"hh\:mm"),
                    endTime     = s.EndTime.ToString(@"hh\:mm")
                };
            }).ToList();

            return Ok(result);
        }

        // ── Excel bulk import ───────────────────────────────────────────────────────

[HttpPost("operator/shifts/import")]
public async Task<IActionResult> ImportShifts([FromForm] IFormFile file)
{
    if (file == null || file.Length == 0)
        return BadRequest(new { error = "No file uploaded." });

    var inserted = 0;
    var errors   = new List<string>();

    using var stream = file.OpenReadStream();
    using var reader = new StreamReader(stream);

    var rows = new List<string[]>();
    string? line;
    while ((line = await reader.ReadLineAsync()) != null)
    {
        if (string.IsNullOrWhiteSpace(line)) continue;
        rows.Add(line.Split(','));
    }

    for (int i = 1; i < rows.Count; i++) // skip header row
    {
        var cols = rows[i];

        // FIXED: expect 5 columns, not 4
        if (cols.Length < 5)
        {
            errors.Add($"Row {i + 1}: Expected 5 columns (user_id, station_id, shift_date, start_time, end_time). Got {cols.Length}.");
            continue;
        }

        var userId    = cols[0].Trim();
        var stationId = cols[1].Trim();
        var dateText  = cols[2].Trim();  // FIXED: shift_date
        var startText = cols[3].Trim();  // FIXED: start_time
        var endText   = cols[4].Trim();  // FIXED: end_time

        // Parse date separately
        if (!DateOnly.TryParse(dateText, out var shiftDate))
        {
            errors.Add($"Row {i + 1}: Invalid shift_date '{dateText}'. Expected format: yyyy-MM-dd.");
            continue;
        }

        // Parse times separately
        if (!TimeOnly.TryParse(startText, out var startTime))
        {
            errors.Add($"Row {i + 1}: Invalid start_time '{startText}'. Expected format: HH:mm.");
            continue;
        }

        if (!TimeOnly.TryParse(endText, out var endTime))
        {
            errors.Add($"Row {i + 1}: Invalid end_time '{endText}'. Expected format: HH:mm.");
            continue;
        }

        if (endTime <= startTime)
        {
            errors.Add($"Row {i + 1}: end_time must be after start_time.");
            continue;
        }

        // Validate user
        var user = await _context.Users.FindAsync(userId);
        if (user == null || user.Role != UserRole.Auxiliary)
        {
            errors.Add($"Row {i + 1}: '{userId}' is not a valid Auxiliary user.");
            continue;
        }

        // Validate station
        var station = await _context.Stations.FindAsync(stationId);
        if (station == null)
        {
            errors.Add($"Row {i + 1}: station '{stationId}' not found.");
            continue;
        }

        _context.AuxiliaryShifts.Add(new AuxiliaryShift
        {
            UserId    = userId,
            StationId = stationId,
            ShiftDate = new DateTime(shiftDate.Year, shiftDate.Month, shiftDate.Day, 0, 0, 0, DateTimeKind.Utc),
            StartTime = startTime.ToTimeSpan(),
            EndTime   = endTime.ToTimeSpan(),
            CreatedAt = DateTime.UtcNow
        });

        inserted++;
    }

    if (inserted > 0)
        await _context.SaveChangesAsync();

    return Ok(new { inserted, errors });
}

    public class UpdateStatusRequest
    {
        public string  Status  { get; set; } = null!;
        public string? Comment { get; set; }
    }

    public class PatchUserStatusRequest
    {
        public string Status { get; set; } = null!;
    }
}
}