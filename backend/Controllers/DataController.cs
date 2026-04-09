using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DataController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DataController(AppDbContext context)
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

        [HttpGet("home-stats")]
        public async Task<IActionResult> GetHomeStats()
        {
            // For now, mapping recent user reports into "recent reports"
            // and generating mocked Trends/Summary based on DB lines to match frontend expectations.
            var lines = await _context.TrainLines.ToListAsync();
            var recentIncidents = await _context.Incidents
                .Include(i => i.UserReport)
                .ThenInclude(r => r.TrainCoach)
                .ThenInclude(c => c.TrainAsset)
                .ThenInclude(a => a.TrainLine)
                .OrderByDescending(i => i.CreatedAt)
                .Take(5)
                .ToListAsync();

            var recentReports = recentIncidents.Select(i => new
            {
                id = "RPT-" + i.IncidentId.ToString("D3"),
                line = i.UserReport?.TrainCoach?.TrainAsset?.TrainLine?.LineName ?? "Unknown",
                type = i.UserReport?.ViolationType ?? "Unknown",
                time = GetTimeSince(i.CreatedAt),
                status = i.Status,
                elapsed = (int)(DateTime.UtcNow - i.CreatedAt).TotalMinutes
            }).ToList();

            // Mock Trend Data for All Lines
            var trendData = new Dictionary<string, object>();
            var allLinesTrend = new[] {
                new { day = "Mon", count = 12 }, new { day = "Tue", count = 19 }, new { day = "Wed", count = 15 },
                new { day = "Thu", count = 22 }, new { day = "Fri", count = 28 }, new { day = "Sat", count = 35 }, new { day = "Sun", count = 25 }
            };
            trendData.Add("All Lines", allLinesTrend);

            var colors = new[] { "#0B4F6C", "#0D6E6E", "#1A7FAA", "#6DA5C0" };
            var lineSummary = lines.Select((l, index) => new
            {
                name = l.LineName,
                value = new Random().Next(20, 80), // random value for now as we don't have enough history
                color = colors[index % colors.Length],
                pct = "+" + new Random().Next(1, 10) + "%"
            }).ToList();

            foreach (var l in lines)
            {
                trendData.Add(l.LineName, new[] {
                    new { day = "Mon", count = new Random().Next(2, 10) },
                    new { day = "Tue", count = new Random().Next(2, 10) },
                    new { day = "Wed", count = new Random().Next(2, 10) },
                    new { day = "Thu", count = new Random().Next(2, 10) },
                    new { day = "Fri", count = new Random().Next(2, 10) },
                    new { day = "Sat", count = new Random().Next(5, 15) },
                    new { day = "Sun", count = new Random().Next(5, 15) }
                });
            }

            return Ok(new
            {
                trendData = trendData,
                lineSummary = lineSummary,
                recentReports = recentReports
            });
        }

        [HttpGet("police-alerts")]
        public async Task<IActionResult> GetPoliceAlerts()
        {
            var incidents = await _context.Incidents
                .Include(i => i.UserReport)
                    .ThenInclude(r => r.TrainCoach)
                        .ThenInclude(c => c.TrainAsset)
                            .ThenInclude(a => a.TrainLine)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var alerts = incidents.Select(i => new
            {
                id = "ALT-" + i.IncidentId.ToString("D3"),
                coach = i.UserReport?.CoachId ?? "Unknown",
                door = "Unknown Door", // schema doesn't have door yet
                line = i.UserReport?.TrainCoach?.TrainAsset?.TrainLine?.LineName ?? "Unknown",
                station = "Nearest Station", // schema needs station logic
                platform = "Platform A",
                time = i.CreatedAt.ToString("HH:mm"),
                elapsed = Math.Max(1, (int)(DateTime.UtcNow - i.CreatedAt).TotalMinutes),
                severity = i.UserReport?.ViolationType?.Contains("Male") == true ? "high" : "medium",
                status = i.Status.ToLower(), // 'pending', 'resolved', 'dismissed', 'escalated'
                type = i.UserReport?.ViolationType ?? "Possible Violation",
                snapshotUrl = i.UserReport?.ImageUrl
            });

            return Ok(alerts);
        }

        [HttpPost("police-alerts/{id}/status")]
        public async Task<IActionResult> UpdateAlertStatus(string id, [FromBody] UpdateStatusRequest request)
        {
            var incidentIdStr = id.Replace("ALT-", "");
            if (int.TryParse(incidentIdStr, out var incidentId))
            {
                var incident = await _context.Incidents.FindAsync(incidentId);
                if (incident != null)
                {
                    incident.Status = request.Status;
                    await _context.SaveChangesAsync();
                    return Ok();
                }
            }
            return NotFound();
        }

        [HttpPost("report")]
        public async Task<IActionResult> SubmitReport([FromBody] SubmitReportRequest req)
        {
            // Create user report
            var report = new UserReport
            {
                UserId = "USR_MOCK_01", // Or get from auth token/context
                CoachId = req.Coach,
                ViolationType = req.Type,
                Description = req.Desc,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserReports.Add(report);
            await _context.SaveChangesAsync();

            // Auto-create incident
            var incident = new Incident
            {
                Source = "USER_REPORT",
                ReportId = report.ReportId,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.Incidents.Add(incident);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, reportId = report.ReportId });
        }

        private string GetTimeSince(DateTime time)
        {
            var ts = DateTime.UtcNow - time;
            if (ts.TotalMinutes < 1) return "Just now";
            if (ts.TotalMinutes < 60) return $"{(int)ts.TotalMinutes} min ago";
            if (ts.TotalHours < 24) return $"{(int)ts.TotalHours}h ago";
            return $"{(int)ts.TotalDays}d ago";
        }
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == "USR_MOCK_01");
            if (user == null) return NotFound();

            var reportsCount = await _context.UserReports.CountAsync(r => r.UserId == "USR_MOCK_01");
            var validReports = await _context.Incidents
                .Include(i => i.UserReport)
                .CountAsync(i => i.UserReport.UserId == "USR_MOCK_01" && (i.Status == "Verified" || i.Status == "Resolved" || i.Status == "Escalated"));
            
            var accuracy = reportsCount == 0 ? 100 : (int)((validReports / (double)reportsCount) * 100);

            return Ok(new
            {
                email = user.Email,
                phone = "Not provided",
                reports = reportsCount,
                accuracy = accuracy
            });
        }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = null!;
    }

    public class SubmitReportRequest
    {
        public string Line { get; set; } = null!;
        public string Coach { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string Desc { get; set; } = null!;
    }
}
