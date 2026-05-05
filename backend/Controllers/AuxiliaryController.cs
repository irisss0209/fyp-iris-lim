using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models.DTOs;
using backend.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/data")] // Maintained original route to not break frontend links
    public class AuxiliaryController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAlertService _alertService;

        public AuxiliaryController(AppDbContext context, IAlertService alertService)
        {
            _context = context;
            _alertService = alertService;
        }

        private string? GetCurrentUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        [Authorize]
        [HttpGet("auxiliary/shift")]
        public async Task<IActionResult> GetAuxiliaryShift()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

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

        

        [Authorize]
        [HttpGet("auxiliary/users")]
        public async Task<IActionResult> GetAuxiliaryUsers()
        {
            var users = await _context.Users
                .Where(u => u.Role == UserRole.Auxiliary)
                .Select(u => new { userId = u.UserId, userName = u.UserName })
                .ToListAsync();

            return Ok(users);
        }

        [Authorize]
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
        [Authorize]
        [HttpGet("auxiliary/alerts")]
        public async Task<IActionResult> GetAlertsByStation([FromQuery] string? stationId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId))
                return Unauthorized(new { error = "Unable to identify user from token." });

            // 1. Shift Verification
            // Shifts are stored in MYT (UTC+8), so always compare against MYT time
            var nowMyt = DateTime.UtcNow.AddHours(8);
            var todayMyt = nowMyt.Date;
            var nowTimeMyt = nowMyt.TimeOfDay;

            var shift = await _context.AuxiliaryShifts
                .Where(s => s.UserId == userId && s.ShiftDate.Date == todayMyt)
                .FirstOrDefaultAsync();

            if (shift == null)
                return Ok(new List<object>()); // No shift today

            bool isOnDuty;
            if (shift.EndTime > shift.StartTime)
                isOnDuty = shift.StartTime <= nowTimeMyt && shift.EndTime > nowTimeMyt;
            else
                isOnDuty = nowTimeMyt >= shift.StartTime || nowTimeMyt < shift.EndTime;

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

            // 3. Fetch and Filter Incidents
            var nowUtc = DateTime.UtcNow;
            var todayUtc = nowUtc.Date;

            var incidents = await _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                                .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport).ThenInclude(r => r!.User)
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.DismissedByUser)
                .Where(i => i.CreatedAt >= todayUtc)
                .OrderByDescending(i => i.CreatedAt)
                .Take(100)
                .ToListAsync();

            var alerts = incidents
                .Select(i => _alertService.MapToAlertDTO(i, nowUtc))
                .Where(dto =>
                {
                    // Find original incident to get stationId
                    var incidentIdStr = dto.Id.Replace("ALT-", "").Replace("RPT-", "");
                    if (!int.TryParse(incidentIdStr, out var incidentId)) return false;
                    var original = incidents.FirstOrDefault(x => x.IncidentId == incidentId);
                    if (original == null) return false;

                    // Match on stationId only — incidents at any physically nearby station
                    // are shown regardless of which line the incident itself was tagged to.
                    string? incidentStationId = original.Detection?.StationId ?? original.UserReport?.StationId;
                    if (string.IsNullOrEmpty(incidentStationId)) return false;

                    return allowedStationIds.Contains(incidentStationId);
                })
                .Select(dto =>
                {
                    var incidentIdStr = dto.Id.Replace("ALT-", "").Replace("RPT-", "");
                    if (!int.TryParse(incidentIdStr, out var incidentId)) return (object)dto;
                    var i = incidents.FirstOrDefault(x => x.IncidentId == incidentId);
                    if (i == null) return (object)dto;

                    return new
                    {
                        dto.Id, dto.TrainId, dto.CoachId, dto.Line, dto.LineId, dto.Station,
                        dto.Status, dto.Source, dto.Time, dto.Date, dto.Elapsed,
                        dto.Confidence, dto.DeviceId, dto.ImageUrl,
                        reportedBy = dto.ReportedBy,
                        // Include the passenger's own description so the audit trail can display it
                        passengerComment = i.UserReport?.Description ?? dto.PassengerComment,
                        verifiedBy = i.VerifiedByUser?.UserName ?? dto.VerifiedBy,
                        verifiedAt = dto.VerifiedAt,
                        verifiedComment = dto.VerifiedComment,
                        enrouteBy = i.EnrouteByUser?.UserName ?? dto.EnrouteBy,
                        enrouteAt = dto.EnrouteAt,
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
                })
                .ToList();

            return Ok(alerts);
        }

    [Authorize]
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

            var userId = GetCurrentUserId();

            switch (parsedStatus)
            {
                case IncidentStatus.En_Route:
                    incident.EnrouteAt = DateTime.UtcNow;
                    incident.EnrouteBy = userId;
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
                    incident.EscalatedAt = DateTime.UtcNow;
                    incident.EscalatedComment = req.Comment;
                    incident.EscalatedBy = userId;
                    break;
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Status updated." });
        }

       [Authorize]
       [HttpGet("auxiliary/history")]
    public async Task<IActionResult> GetHistoryByUser()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrWhiteSpace(userId))
            return Unauthorized(new { error = "Unable to identify user from token." });

        var now = DateTime.UtcNow;

        var incidents = await _context.Incidents
            .Include(i => i.Detection)
                .ThenInclude(d => d!.Camera)
                    .ThenInclude(c => c!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta.TrainLine)
            .Include(i => i.Detection)
                .ThenInclude(d => d!.LineStation)
                    .ThenInclude(ls => ls!.Station)
            .Include(i => i.UserReport)
                .ThenInclude(r => r!.TrainCoach)
                    .ThenInclude(tc => tc!.TrainAsset)
                        .ThenInclude(ta => ta.TrainLine)
            .Include(i => i.UserReport)
                .ThenInclude(r => r!.LineStation)
                    .ThenInclude(ls => ls!.Station)
            .Include(i => i.UserReport)
                .ThenInclude(r => r!.User)
            .Include(i => i.VerifiedByUser)
            .Include(i => i.ResolvedByUser)
            .Include(i => i.EscalatedByUser)
            .Include(i => i.DismissedByUser)
            .Include(i => i.EnrouteByUser)
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
