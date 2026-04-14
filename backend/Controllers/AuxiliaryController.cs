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
    }

    public class CreateShiftRequest
    {
        public string UserId { get; set; } = null!;
        public string StationId { get; set; } = null!;
        public DateTime ShiftStart { get; set; }
        public DateTime ShiftEnd { get; set; }
    }
}
