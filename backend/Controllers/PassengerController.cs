using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/data")] // Maintained original route to not break frontend links
    public class PassengerController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PassengerController(AppDbContext context)
        {
            _context = context;
        }

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
                coaches = l.TrainAssets.SelectMany(ta => ta.TrainCoaches).Select(c => c.CoachId).Distinct().ToList()
            });

            return Ok(result);
        }

        [HttpPost("report")]
        public async Task<IActionResult> SubmitReport([FromBody] SubmitReportRequest req, [FromQuery] string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { error = "userId query parameter is required." });

            // Verify user exists
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { error = "User not found." });

            // Create user report
            var report = new UserReport
            {
                UserId = userId,
                CoachId = req.Coach,
                Description = req.Desc,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserReports.Add(report);
            await _context.SaveChangesAsync();

            // Auto-create incident
            var incident = new Incident
            {
                Source = IncidentSource.USER_REPORT,
                ReportId = report.ReportId,
                Status = IncidentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.Incidents.Add(incident);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, reportId = report.ReportId });
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile([FromQuery] string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest(new { error = "userId query parameter is required." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            var reportsCount = await _context.UserReports.CountAsync(r => r.UserId == userId);
            var validReports = await _context.Incidents
                .Include(i => i.UserReport)
                .CountAsync(i => i.UserReport != null && i.UserReport.UserId == userId && (i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Escalated));
            
            var accuracy = reportsCount == 0 ? 100 : (int)((validReports / (double)reportsCount) * 100);

            return Ok(new
            {
                userId = user.UserId,
                userName = user.UserName,
                email = user.Email,
                role = user.Role,
                reports = reportsCount,
                accuracy = accuracy
            });
        }
    }

    public class SubmitReportRequest
    {
        public string Line { get; set; } = null!;
        public string Coach { get; set; } = null!;
        public string Desc { get; set; } = null!;
    }
}
