using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models.DTOs;
namespace backend.Controllers
{
    [ApiController]
    [Route("api/data")] // Maintained original route to not break frontend links
    public class AuxiliaryController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuxiliaryController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("auxiliary/shift")]
public async Task<IActionResult> GetAuxiliaryShift([FromQuery] string userId)
{
    if (string.IsNullOrWhiteSpace(userId))
        return BadRequest(new { error = "userId query parameter is required." });

    // Convert UTC → MYT properly
    var now = DateTime.Now;
    var today = DateTime.SpecifyKind(now.Date, DateTimeKind.Utc);
    var nowTime = now.TimeOfDay;

    var shift = await _context.AuxiliaryShifts
        .Include(s => s.Station)
        .Where(s => s.UserId == userId && s.ShiftDate.Date == today)
        .OrderBy(s => s.StartTime)
        .FirstOrDefaultAsync();

    if (shift == null)
        return Ok(new { active = false });

    // ✅ Handle overnight shift properly
    bool isOnDuty;
    if (shift.EndTime > shift.StartTime)
    {
        isOnDuty = shift.StartTime <= nowTime && shift.EndTime > nowTime;
    }
    else
    {
        isOnDuty = nowTime >= shift.StartTime || nowTime < shift.EndTime;
    }

    return Ok(new
    {
        active = true,
        onDuty = isOnDuty,
        shiftId = shift.ShiftId,
        station = shift.Station.StationName,
        stationId = shift.StationId,
        shiftStart = shift.StartTime.ToString(@"hh\:mm"),
        shiftEnd = shift.EndTime.ToString(@"hh\:mm"),
        shiftDate = shift.ShiftDate.ToString("yyyy-MM-dd")
    });
}

        

        [HttpGet("auxiliary/users")]
        public async Task<IActionResult> GetAuxiliaryUsers()
        {
            var users = await _context.Users
                .Where(u => u.Role == UserRole.Auxiliary)
                .Select(u => new { userId = u.UserId, userName = u.UserName })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("auxiliary/stations")]
        public async Task<IActionResult> GetStations()
        {
            var stations = await _context.Stations
                .Select(s => new { stationId = s.StationId, stationName = s.StationName })
                .OrderBy(s => s.stationName)
                .ToListAsync();

            return Ok(stations);
        }

        // ── Live alerts for a station (RecentAlerts tab) ───────────────────────
        [HttpGet("auxiliary/alerts")]
        public async Task<IActionResult> GetAlertsByStation([FromQuery] string? stationId)
        {
            if (string.IsNullOrWhiteSpace(stationId))
                return Ok(new List<object>()); // No shift → no alerts

            var lineStations = await _context.LineStations
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .ToListAsync();
            var now = DateTime.UtcNow;

            var allowedLineIds = lineStations
                .Where(ls => ls.StationId == stationId)
                .Select(ls => ls.LineId)
                .ToList();

            if (!allowedLineIds.Any())
                return Ok(new List<object>());

            var incidents = await _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                                .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta.TrainLine)
                .OrderByDescending(i => i.CreatedAt)
                .Take(50)
                .ToListAsync();

            var stationObj = await _context.Stations.FindAsync(stationId);
            var stationName = stationObj?.StationName ?? "Unknown";

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

                // Map "en_route" correctly
                var mappedStatus = inc.Status.ToString().ToLower() switch
                {
                    "en_route" => "en_route",
                    var other  => other
                };

                return new
                {
                    id         = (inc.Source == IncidentSource.AI_DETECTION ? "ALT-" : "RPT-") + inc.IncidentId.ToString("D3"),
                    coach      = coachId    ?? "Unknown", // keeping property coach to not break existing frontend, but also passing coachId
                    coachId    = coachId    ?? "Unknown",
                    door       = deviceId   ?? "—",
                    deviceId,
                    line       = lineName   ?? "—",
                    lineId     = lineId  ,
                    station    = stationName,
                    platform   = "—",
                    time       = inc.CreatedAt.ToString("HH:mm"),
                    date       = inc.CreatedAt.ToString("yyyy-MM-dd"),

elapsed = Math.Max(1, (int)(now - inc.CreatedAt).TotalMinutes),
                    severity   = inc.Source == IncidentSource.AI_DETECTION ? "high" : "medium",
                    status     = mappedStatus,
                    type       = inc.Source == IncidentSource.AI_DETECTION ? "Male in Women-Only Coach" : "Passenger Report",
                    confidence = confidence != null ? (int)confidence : (int?)null,
                    source,
                    passengerComment = inc.UserReport?.Description,
                    snapshotUrl = inc.Source == IncidentSource.AI_DETECTION
                        ? inc.Detection?.ImageUrl
                        : inc.UserReport?.ImageUrl,
                    // ── Audit trail ──
                    verifiedBy      = inc.VerifiedBy,
                    verifiedAt      = inc.VerifiedAt?.ToString("yyyy-MM-dd HH:mm"),
                    verifiedComment = inc.VerifiedComment,
                    escalatedBy     = inc.EscalatedBy,
                    escalatedAt     = inc.EscalatedAt?.ToString("yyyy-MM-dd HH:mm"),
                    escalatedComment = inc.EscalatedComment,
                    enrouteBy       = inc.EnrouteBy,
                    enrouteAt       = inc.EnrouteAt?.ToString("yyyy-MM-dd HH:mm"),
                    resolvedBy      = inc.ResolvedBy,
                    resolvedAt      = inc.ResolvedAt?.ToString("yyyy-MM-dd HH:mm"),
                    resolvedComment = inc.ResolvedComment,
                    dismissedBy     = inc.DismissedBy,
                    dismissedAt     = inc.DismissedAt?.ToString("yyyy-MM-dd HH:mm"),
                    dismissedComment = inc.DismissedComment,
                };
            })
            .Where(a => a.lineId != null && allowedLineIds.Contains(a.lineId))
            .ToList();

            return Ok(alerts);
        }

        [HttpPost("auxiliary/alerts/{id}/status")]
        public async Task<IActionResult> UpdateAlertStatus(string id, [FromBody] UpdateStatusRequest req)
        {
            var incidentIdStr = id.Replace("ALT-", "").Replace("RPT-", "");
            if (!int.TryParse(incidentIdStr, out var incidentId)) return BadRequest();

            var incident = await _context.Incidents.FindAsync(incidentId);
            if (incident == null) return NotFound();

            var normalizedStatus = req.Status?.Trim() switch
            {
                "resolved"  => "Resolved",
                "escalated" => "Escalated",
                "dismissed" => "Dismissed",
                "en_route"  => "En_Route",
                { } s       => char.ToUpper(s[0]) + s[1..],
                null        => null
            };

            if (!Enum.TryParse<IncidentStatus>(normalizedStatus, true, out var parsedStatus))
                return BadRequest(new { error = "Invalid status" });

            incident.Status = parsedStatus;

               switch (parsedStatus)
            {
                case IncidentStatus.En_Route:
                    incident.EnrouteAt = DateTime.UtcNow;
                    break;
                case IncidentStatus.Resolved:
                    incident.ResolvedAt = DateTime.UtcNow;
                    incident.ResolvedComment = req.Comment;
                    break;
                case IncidentStatus.Dismissed:
                    incident.DismissedAt = DateTime.UtcNow;
                    incident.DismissedComment = req.Comment;
                    break;
                case IncidentStatus.Escalated:
                    incident.EscalatedAt = DateTime.UtcNow;
                    incident.EscalatedComment = req.Comment;
                    break;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Status updated." });
        }

        // ── Case history for an officer (AlertsHistory tab) ────────────────────
        [HttpGet("auxiliary/history")]
        public async Task<IActionResult> GetHistoryByUser([FromQuery] string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { error = "userId is required." });

            var incidentsList = await _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                .Include(i => i.UserReport)
                .Where(i =>
                    i.EnrouteBy == userId ||
                    i.ResolvedBy == userId ||
                    i.EscalatedBy == userId ||
                    i.DismissedBy == userId)
                .Where(i =>
                    i.Status == IncidentStatus.Resolved ||
                    i.Status == IncidentStatus.Escalated ||
                    i.Status == IncidentStatus.Dismissed)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var lineStations = await _context.LineStations.Include(ls => ls.Station).ToListAsync();

            var history = incidentsList.Select(i =>
            {
                string? lineId = null;
                if (i.Source == IncidentSource.AI_DETECTION && i.Detection?.Camera?.TrainCoach?.TrainAsset != null)
                {
                    lineId = i.Detection.Camera.TrainCoach.TrainAsset.LineId;
                }
                
                var stationName = lineStations.FirstOrDefault(ls => ls.LineId == lineId)?.Station?.StationName ?? "Unknown Station";

                return new
                {
                    id = i.IncidentId.ToString(),
                    caseId = $"INC-{i.IncidentId:D4}",
                    station = stationName,
                    line = "—",
                    datetime = i.CreatedAt.ToString("dd MMM yyyy, HH:mm"),
                    outcome = i.Status == IncidentStatus.Resolved  ? "Resolved"  :
                              i.Status == IncidentStatus.Escalated ? "Escalated" : "No Action",
                    duration = i.ResolvedAt.HasValue
                        ? $"{(int)(i.ResolvedAt.Value - i.CreatedAt).TotalMinutes} min"
                        : i.DismissedAt.HasValue
                            ? $"{(int)(i.DismissedAt.Value - i.CreatedAt).TotalMinutes} min"
                            : "—",
                    coachId = i.Detection != null ? i.Detection.Camera!.CoachId : "—",
                    description = i.Source == IncidentSource.AI_DETECTION
                        ? "Male detected in women-only coach"
                        : "Passenger-reported incident",
                    notes = "Handled by officer."
                };
            }).ToList();

            return Ok(history);
        }
    }

 

}
