using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Models.DTOs;
using backend.Services;

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
            return Ok(new List<AlertDTO>());

        var now = DateTime.UtcNow;

        var allowedLineIds = await _context.LineStations
            .Where(ls => ls.StationId == stationId)
            .Select(ls => ls.LineId)
            .ToListAsync();

        if (!allowedLineIds.Any())
            return Ok(new List<AlertDTO>());

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

        var alerts = incidents
    .Select(i => _alertService.MapToAlertDTO(i, now))
    .Where(a => !string.IsNullOrEmpty(a.LineId) && allowedLineIds.Contains(a.LineId))
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

       [HttpGet("auxiliary/history")]
    public async Task<IActionResult> GetHistoryByUser([FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest(new { error = "userId is required." });

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

        var history = incidents
        .Select(i => _alertService.MapToAlertDTO(i, now))
        .ToList();

        return Ok(history);
    }
    
}
}
