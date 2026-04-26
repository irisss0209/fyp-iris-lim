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

            var now = DateTime.Now;
            var today = now.Date;
            var nowTime = now.TimeOfDay;

            // 1. Try today's shift
            var shift = await _context.AuxiliaryShifts
                .Include(s => s.Station)
                .Where(s => s.UserId == userId && s.ShiftDate.Date == today)
                .OrderBy(s => s.StartTime)
                .FirstOrDefaultAsync();

            // 2. If no shift today, try upcoming shift
            if (shift == null)
            {
                shift = await _context.AuxiliaryShifts
                    .Include(s => s.Station)
                    .Where(s => s.UserId == userId && s.ShiftDate.Date > today)
                    .OrderBy(s => s.ShiftDate)
                    .ThenBy(s => s.StartTime)
                    .FirstOrDefaultAsync();
            }

            // 3. If still no shift, try most recent past shift
            if (shift == null)
            {
                shift = await _context.AuxiliaryShifts
                    .Include(s => s.Station)
                    .Where(s => s.UserId == userId && s.ShiftDate.Date < today)
                    .OrderByDescending(s => s.ShiftDate)
                    .ThenByDescending(s => s.StartTime)
                    .FirstOrDefaultAsync();
            }

            if (shift == null)
                return Ok(new { active = false });

            // Calculate isOnDuty only for today's shifts
            bool isOnDuty = false;
            if (shift.ShiftDate.Date == today)
            {
                if (shift.EndTime > shift.StartTime)
                    isOnDuty = shift.StartTime <= nowTime && shift.EndTime > nowTime;
                else
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
                .OrderByDescending(i => i.CreatedAt)
                .Take(50)
                .ToListAsync();

            var stationObj = await _context.Stations.FindAsync(stationId);
            var stationName = stationObj?.StationName ?? "Unknown";

            var alerts = incidents.Select(inc =>
            {
                string? lineName   = null;
                string? lineId     = null;
                int? coachId       = null;
                int? trainId       = null;
                string? deviceId   = null;
                decimal? confidence = null;
                string source;

                if (inc.Source == IncidentSource.AI_DETECTION && inc.Detection != null)
                {
                    source     = "ai";
                    confidence = inc.Detection.ConfidenceScore;
                    deviceId   = inc.Detection.CameraId;
                    coachId    = inc.Detection.Camera?.CoachId;
                    trainId    = inc.Detection.Camera?.TrainCoach?.TrainId ?? inc.Detection.Camera?.TrainId;
                    lineName   = inc.Detection.LineStation?.TrainLine?.LineName 
                                 ?? inc.Detection.Camera?.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId     = inc.Detection.LineId 
                                 ?? inc.Detection.Camera?.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                }
                else if (inc.UserReport != null)
                {
                    source     = "passenger";
                    coachId    = inc.UserReport.CoachId;
                    trainId    = inc.UserReport.TrainCoach?.TrainId ?? inc.UserReport.TrainId;
                    lineName   = inc.UserReport.LineStation?.TrainLine?.LineName 
                                 ?? inc.UserReport.TrainCoach?.TrainAsset?.TrainLine?.LineName;
                    lineId     = inc.UserReport.LineId 
                                 ?? inc.UserReport.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                }
                else
                {
                    source = "unknown";
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
                    trainId    = trainId?.ToString() ?? "—",
                    coach      = coachId?.ToString() ?? "—",
                    coachId    = coachId?.ToString() ?? "—",
                    train_id   = trainId,
                    coach_id   = coachId,
                    door       = deviceId   ?? "—",
                    deviceId,
                    line       = lineName   ?? "—",
                    lineId     = lineId  ,
                    station    = inc.Detection?.LineStation?.Station?.StationName 
                                 ?? inc.UserReport?.LineStation?.Station?.StationName 
                                 ?? stationName,
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
                    incident.EnrouteAt = DateTime.Now;
                    incident.EnrouteBy = req.UserId;
                    break;
                case IncidentStatus.Resolved:
                    incident.ResolvedAt = DateTime.Now;
                    incident.ResolvedComment = req.Comment;
                    incident.ResolvedBy = req.UserId;
                    break;
                case IncidentStatus.Dismissed:
                    incident.DismissedAt = DateTime.Now;
                    incident.DismissedComment = req.Comment;
                    incident.DismissedBy = req.UserId;
                    break;
                case IncidentStatus.Escalated:
                    incident.EscalatedAt = DateTime.Now;
                    incident.EscalatedComment = req.Comment;
                    incident.EscalatedBy = req.UserId;
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
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
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
                if (i.Detection?.LineId != null)
                {
                    lineId = i.Detection.LineId;
                }
                else if (i.UserReport?.LineId != null)
                {
                    lineId = i.UserReport.LineId;
                }
                else if (i.Source == IncidentSource.AI_DETECTION && i.Detection?.Camera?.TrainCoach?.TrainAsset != null)
                {
                    lineId = i.Detection.Camera.TrainCoach.TrainAsset.LineId;
                }
                
                var resolvedStationName = i.Detection?.LineStation?.Station?.StationName 
                                          ?? i.UserReport?.LineStation?.Station?.StationName
                                          ?? lineStations.FirstOrDefault(ls => ls.LineId == lineId)?.Station?.StationName 
                                          ?? "Unknown Station";

                var coachIdRaw = i.Source == IncidentSource.AI_DETECTION
                    ? i.Detection?.Camera?.CoachId
                    : i.UserReport?.CoachId;
                var trainIdRaw = i.Source == IncidentSource.AI_DETECTION
                    ? (i.Detection?.Camera?.TrainCoach?.TrainId ?? i.Detection?.Camera?.TrainId)
                    : (i.UserReport?.TrainCoach?.TrainId ?? i.UserReport?.TrainId);

                return new
                {
                    id = i.IncidentId.ToString(),
                    caseId = $"INC-{i.IncidentId:D4}",
                    station = resolvedStationName,
                    line = "—",
                    datetime = i.CreatedAt.ToString("dd MMM yyyy, HH:mm"),
                    outcome = i.Status == IncidentStatus.Resolved  ? "Resolved"  :
                              i.Status == IncidentStatus.Escalated ? "Escalated" : "No Action",
                    duration = i.ResolvedAt.HasValue
                        ? $"{(int)(i.ResolvedAt.Value - i.CreatedAt).TotalMinutes} min"
                        : i.DismissedAt.HasValue
                            ? $"{(int)(i.DismissedAt.Value - i.CreatedAt).TotalMinutes} min"
                            : "—",
                    trainId = trainIdRaw?.ToString() ?? "—",
                    coachId = coachIdRaw?.ToString() ?? "—",
                    train_id = trainIdRaw,
                    coach_id = coachIdRaw,
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
