using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using backend.Models.DTOs;
using backend.Services;
namespace backend.Controllers
{
    [ApiController]
    [Authorize(Roles = "auxiliary")]
    [Route("api/data")] // Maintained original route to not break frontend links
    public class AuxiliaryController : BaseApiController
    {
        private readonly AppDbContext _context;
        private readonly IAlertService _alertService;
        private readonly IPushNotificationService _pushService;
        private readonly IHubContext<AlertHub> _hub;
        private readonly ILogger<AuxiliaryController> _logger;

        public AuxiliaryController(AppDbContext context, IAlertService alertService,
            IPushNotificationService pushService, IHubContext<AlertHub> hub,
            ILogger<AuxiliaryController> logger)
        {
            _context = context;
            _alertService = alertService;
            _pushService = pushService;
            _hub = hub;
            _logger = logger;
        }

        private static bool IsShiftOnDuty(TimeSpan start, TimeSpan end, TimeSpan now) =>
            end > start ? start <= now && end > now : now >= start || now < end;

        [HttpGet("auxiliary/shift")]
        public async Task<IActionResult> GetAuxiliaryShift()
        {
            var (userId, authError) = RequireUserId();
            if (authError != null) return authError;

            // Shifts are stored in MYT (UTC+8), so always compare against MYT time
            var now = DateTime.UtcNow.AddHours(8);
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
                return Ok(new AuxiliaryShiftDto { Active = false });

            bool isOnDuty = shift.ShiftDate.Date == today && IsShiftOnDuty(shift.StartTime, shift.EndTime, nowTime);

            return Ok(new AuxiliaryShiftDto
            {
                Active     = true,
                OnDuty     = isOnDuty,
                ShiftId    = shift.ShiftId,
                Station    = shift.Station.StationName,
                StationId  = shift.StationId,
                ShiftStart = shift.StartTime.ToString(@"hh\:mm"),
                ShiftEnd   = shift.EndTime.ToString(@"hh\:mm"),
                ShiftDate  = shift.ShiftDate.ToString("yyyy-MM-dd")
            });
        }

        

        [HttpGet("auxiliary/users")]
        public async Task<IActionResult> GetAuxiliaryUsers()
        {
            var users = await _context.Users
                .Where(u => u.Role == UserRole.Auxiliary)
                .Select(u => new UserSummaryDto { UserId = u.UserId, UserName = u.UserName })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("auxiliary/stations")]
        public async Task<IActionResult> GetStations()
        {
            var stations = await _context.Stations
                .Select(s => new StationDto { StationId = s.StationId, StationName = s.StationName })
                .OrderBy(s => s.StationName)
                .ToListAsync();

            return Ok(stations);
        }

        // ── Live alerts for a station (RecentAlerts tab) ───────────────────────
        [HttpGet("auxiliary/alerts")]
        public async Task<IActionResult> GetAlertsByStation([FromQuery] string? stationId)
        {
            var (userId, authError) = RequireUserId();
            if (authError != null) return authError;

            // 1. Shift Verification
            // ShiftDate stores MYT calendar dates (imported as-is from CSV)
            var nowMyt = DateTime.UtcNow.AddHours(8);
            var todayMyt = nowMyt.Date;
            var nowTimeMyt = nowMyt.TimeOfDay;

            var todayShifts = await _context.AuxiliaryShifts
                .Where(s => s.UserId == userId && s.ShiftDate.Date == todayMyt)
                .OrderBy(s => s.StartTime)
                .ToListAsync();

            // Pick the currently on-duty shift first; fall back to the first shift of the day
            var shift = todayShifts.FirstOrDefault(s => IsShiftOnDuty(s.StartTime, s.EndTime, nowTimeMyt))
                     ?? todayShifts.FirstOrDefault();

            if (shift == null)
                return Ok(new List<object>()); // No shift today

            bool isOnDuty = IsShiftOnDuty(shift.StartTime, shift.EndTime, nowTimeMyt);

            if (!isOnDuty)
                return Ok(new List<object>()); // Not currently on duty

            var activeStationId = shift.StationId;

            // 2. Proximity Range Calculation (+/- 2 stations)
            var userLines = await _context.LineStations
                .Where(ls => ls.StationId == activeStationId)
                .Select(ls => new { ls.LineId, ls.SequenceOrder })
                .ToListAsync();

            if (!userLines.Any())
                return Ok(new List<object>());

            // Get all stations on those lines to check their sequences
            var lineIds = userLines.Select(ul => ul.LineId).Distinct().ToList();
            var allLineStations = await _context.LineStations
                .Where(ls => lineIds.Contains(ls.LineId))
                .ToListAsync();

            // Collect all stationIds within ±2 sequence positions across every line
            // the officer's assigned station belongs to.
            // We use a plain HashSet<string> of stationIds so that incidents tagged to
            // *any* line at a physically nearby station are still surfaced (a station can
            // belong to multiple lines, and the incident's own lineId may differ from the
            // line used to derive proximity).
            var allowedStationIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var ul in userLines)
            {
                var nearby = allLineStations
                    .Where(ls => ls.LineId == ul.LineId && Math.Abs(ls.SequenceOrder - ul.SequenceOrder) <= 2)
                    .Select(ls => ls.StationId);

                foreach (var sid in nearby)
                    allowedStationIds.Add(sid);
            }

            // 3. Fetch incidents whose station falls within the allowed set — filter at DB level
            var nowUtc = DateTime.UtcNow;
            var allowedList = allowedStationIds.ToList(); // EF Core translates List to SQL IN

            var incidents = await _context.Incidents
                .AsNoTracking()
                .AsSplitQuery()
                .WithFullNavigations()
                .WithStatusUsers()
                .Where(i => i.CreatedAt >= MytTodayUtc)
                .Where(i =>
                    (i.UserReport != null && allowedList.Contains(i.UserReport.StationId)) ||
                    (i.Detection  != null && allowedList.Contains(i.Detection.StationId)))
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var alerts = incidents.Select(i =>
            {
                var dto = _alertService.MapToAlertDTO(i, nowUtc);
                return new
                {
                    dto.Id, dto.TrainId, dto.CoachId, dto.Line, dto.LineId, dto.Station,
                    dto.Status, dto.Source, dto.Time, dto.Date, dto.Elapsed,
                    dto.Confidence, dto.DeviceId, dto.ImageUrl,
                    reportedBy      = dto.ReportedBy,
                    passengerComment = i.UserReport?.Description ?? dto.PassengerComment,
                    verifiedBy      = i.VerifiedByUser?.UserName ?? dto.VerifiedBy,
                    verifiedAt      = dto.VerifiedAt,
                    verifiedComment = dto.VerifiedComment,
                    enrouteBy       = i.EnrouteByUser?.UserName ?? dto.EnrouteBy,
                    enrouteAt       = dto.EnrouteAt,
                    enrouteComment  = dto.EnrouteComment,
                    resolvedBy      = i.ResolvedByUser?.UserName ?? dto.ResolvedBy,
                    resolvedAt      = dto.ResolvedAt,
                    resolvedComment = dto.ResolvedComment,
                    escalatedBy     = i.EscalatedByUser?.UserName ?? dto.EscalatedBy,
                    escalatedAt     = dto.EscalatedAt,
                    escalatedComment = dto.EscalatedComment,
                    dismissedBy     = i.DismissedByUser?.UserName ?? dto.DismissedBy,
                    dismissedAt     = dto.DismissedAt,
                    dismissedComment = dto.DismissedComment,
                };
            }).ToList();

            return Ok(alerts);
        }

    [HttpPost("auxiliary/alerts/{id}/status")]
    public async Task<IActionResult> UpdateAlertStatus(string id, [FromBody] UpdateStatusRequest req)
    {
            if (!TryParseIncidentId(id, out var incidentId)) return BadRequest();

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

            var previousStatus = incident.Status;
            incident.Status = parsedStatus;

            var userId = GetCurrentUserId();

            switch (parsedStatus)
            {
                case IncidentStatus.En_Route:
                    incident.EnrouteAt = DateTime.UtcNow;
                    incident.EnrouteBy = userId;
                    incident.EnrouteComment = req.Comment;
                    break;
                case IncidentStatus.Resolved:
                    incident.ResolvedAt = DateTime.UtcNow;
                    incident.ResolvedComment = req.Comment;
                    incident.ResolvedBy = userId;
                    break;
                case IncidentStatus.Dismissed:
                    incident.DismissedAt = DateTime.UtcNow;
                    incident.DismissedComment = req.Comment;
                    incident.DismissedBy = userId;
                    break;
                case IncidentStatus.Escalated:
                    if (previousStatus == IncidentStatus.Escalated)
                    {
                        // Re-escalation: status stays Escalated, notify aux only
                        if (!incident.EscalatedAt.HasValue || DateTime.UtcNow - incident.EscalatedAt.Value < TimeSpan.FromMinutes(2))
                        {
                            incident.Status = previousStatus;
                            return BadRequest(new { error = "You can re-escalate only after 2 minutes of no response." });
                        }
                        incident.EscalatedBy      = userId;
                        incident.EscalatedAt      = DateTime.UtcNow;
                        incident.EscalatedComment = string.IsNullOrWhiteSpace(req.Comment) ? "No comment" : req.Comment;
                        incident.Status           = previousStatus;
                        await _context.SaveChangesAsync();
                        await _hub.Clients.All.SendAsync("IncidentStatusChanged", incident.IncidentId);
                        await _pushService.SafeNotifyReEscalation(incident.IncidentId, userId, _logger);
                        return Ok(new { message = "Status updated." });
                    }
                    incident.EscalatedAt      = DateTime.UtcNow;
                    incident.EscalatedComment = req.Comment;
                    incident.EscalatedBy      = userId;
                    break;
            }

            await _context.SaveChangesAsync();
            await _hub.Clients.All.SendAsync("IncidentStatusChanged", incident.IncidentId);
            await _pushService.SafeNotifyStatusChange(incident.IncidentId, userId, _logger);

            return Ok(new { message = "Status updated." });
        }

       [HttpGet("auxiliary/history")]
    public async Task<IActionResult> GetHistoryByUser()
    {
        var (userId, authError) = RequireUserId();
        if (authError != null) return authError;

        var now = DateTime.UtcNow;

        var incidents = await _context.Incidents
            .AsNoTracking()
            .AsSplitQuery()
            .WithFullNavigations()
            .WithStatusUsers()
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

        var history = incidents.Select(i =>
        {
            var dto = _alertService.MapToAlertDTO(i, now);
            return new
            {
                dto.Id,
                dto.Line,
                dto.Station,
                dto.Date,
                dto.Time,
                dto.Status,
                dto.Elapsed,
                dto.TrainId,
                dto.CoachId,
                dto.Source,
                dto.ImageUrl,

                reportedBy = dto.ReportedBy,
                verifiedBy = i.VerifiedByUser?.UserName ?? dto.VerifiedBy,
                verifiedAt = dto.VerifiedAt,
                verifiedComment = dto.VerifiedComment,

                enrouteBy = i.EnrouteByUser?.UserName ?? dto.EnrouteBy,
                enrouteAt = dto.EnrouteAt,
                enrouteComment = dto.EnrouteComment,

                resolvedBy = i.ResolvedByUser?.UserName ?? dto.ResolvedBy,
                resolvedAt = dto.ResolvedAt,
                resolvedComment = dto.ResolvedComment,

                escalatedBy = i.EscalatedByUser?.UserName ?? dto.EscalatedBy,
                escalatedAt = dto.EscalatedAt,
                escalatedComment = dto.EscalatedComment,

                dismissedBy = i.DismissedByUser?.UserName ?? dto.DismissedBy,
                dismissedAt = dto.DismissedAt,
                dismissedComment = dto.DismissedComment,
            };
        }).ToList();

        return Ok(history);
    }
    
}
}
