using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

            var now = DateTime.UtcNow;

            // Try to find current active shift first, then next upcoming
            var shift = await _context.AuxiliaryShifts
                .Include(s => s.Station)
                .Where(s => s.UserId == userId && s.ShiftEnd > now)
                .OrderBy(s => s.ShiftStart)
                .FirstOrDefaultAsync();

            if (shift == null)
                return Ok(new { active = false });

            var isOnDuty = shift.ShiftStart <= now && shift.ShiftEnd > now;

            return Ok(new
            {
                active = true,
                onDuty = isOnDuty,
                shiftId = shift.ShiftId,
                station = shift.Station.StationName,
                stationId = shift.StationId,
                shiftStart = shift.ShiftStart.ToString("HH:mm"),
                shiftEnd = shift.ShiftEnd.ToString("HH:mm"),
                shiftDate = shift.ShiftStart.ToString("yyyy-MM-dd")
            });
        }

        [HttpGet("auxiliary/shifts")]
        public async Task<IActionResult> GetAllShifts()
        {
            var shifts = await _context.AuxiliaryShifts
                .Include(s => s.User)
                .Include(s => s.Station)
                .OrderByDescending(s => s.ShiftStart)
                .Select(s => new
                {
                    shiftId = s.ShiftId,
                    userId = s.UserId,
                    userName = s.User.UserName,
                    stationId = s.StationId,
                    stationName = s.Station.StationName,
                    shiftStart = s.ShiftStart.ToString("o"),
                    shiftEnd = s.ShiftEnd.ToString("o")
                })
                .ToListAsync();

            return Ok(shifts);
        }

        [HttpPost("auxiliary/shifts")]
        public async Task<IActionResult> CreateShift([FromBody] CreateShiftRequest req)
        {
            // Validate user exists and is Auxiliary
            var user = await _context.Users.FindAsync(req.UserId);
            if (user == null || user.Role != UserRole.Auxiliary)
                return BadRequest(new { error = "Invalid auxiliary user." });

            var station = await _context.Stations.FindAsync(req.StationId);
            if (station == null)
                return BadRequest(new { error = "Invalid station." });

            if (req.ShiftEnd <= req.ShiftStart)
                return BadRequest(new { error = "Shift end must be after shift start." });

            var shift = new AuxiliaryShift
            {
                UserId = req.UserId,
                StationId = req.StationId,
                ShiftStart = req.ShiftStart,
                ShiftEnd = req.ShiftEnd,
                CreatedAt = DateTime.UtcNow
            };

            _context.AuxiliaryShifts.Add(shift);
            await _context.SaveChangesAsync();

            return Ok(new { shiftId = shift.ShiftId, message = "Shift created successfully." });
        }

        [HttpDelete("auxiliary/shifts/{id}")]
        public async Task<IActionResult> DeleteShift(int id)
        {
            var shift = await _context.AuxiliaryShifts.FindAsync(id);
            if (shift == null) return NotFound();

            _context.AuxiliaryShifts.Remove(shift);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Shift deleted." });
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

            var allowedLineIds = await _context.LineStations
                .Where(ls => ls.StationId == stationId)
                .Select(ls => ls.LineId)
                .ToListAsync();

            if (!allowedLineIds.Any())
                return Ok(new List<object>());

            var incidents = await _context.Incidents
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                .Where(i =>
                    i.Detection != null &&
                    i.Detection.Camera != null &&
                    i.Detection.Camera.TrainCoach != null &&
                    i.Detection.Camera.TrainCoach.TrainAsset != null &&
                    allowedLineIds.Contains(i.Detection.Camera.TrainCoach.TrainAsset.LineId))
                .OrderByDescending(i => i.CreatedAt)
                .Take(50)
                .Select(i => new
                {
                    id = i.IncidentId.ToString(),
                    coach = i.Detection != null ? i.Detection.Camera!.CoachId : "Unknown",
                    door = i.Detection != null ? i.Detection.Camera!.CameraId : "Unknown",
                    line = (string?)"—",
                    station = stationId,
                    platform = "—",
                    time = i.CreatedAt.ToString("HH:mm"),
                    elapsed = (int)(DateTime.UtcNow - i.CreatedAt).TotalMinutes,
                    severity = "high",
                    status = i.Status.ToString().ToLower(),
                    type = i.Source == IncidentSource.AI_DETECTION
                        ? "Male in Women-Only Coach"
                        : "Passenger Report",
                    snapshotUrl = i.Detection != null ? i.Detection.ImageUrl : null
                })
                .ToListAsync();

            return Ok(incidents);
        }

        // ── Update incident status (acknowledge / dismiss / escalate) ──────────
        [HttpPost("auxiliary/alerts/{id}/status")]
        public async Task<IActionResult> UpdateAlertStatus(int id, [FromBody] UpdateStatusRequest req)
        {
            var incident = await _context.Incidents.FindAsync(id);
            if (incident == null) return NotFound();

            incident.Status = req.Status.ToLower() switch
            {
                "resolved"  => IncidentStatus.Resolved,
                "escalated" => IncidentStatus.Escalated,
                "dismissed" => IncidentStatus.Dismissed,
                _           => incident.Status
            };

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

    public class CreateShiftRequest
    {
        public string UserId { get; set; } = null!;
        public string StationId { get; set; } = null!;
        public DateTime ShiftStart { get; set; }
        public DateTime ShiftEnd { get; set; }
    }
}
