using backend.Data;
using backend.Models;
using backend.Models.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/data")]
    public class SharedController : BaseApiController
    {
        private readonly AppDbContext _context;
        private readonly IAlertService _alertService;

        public SharedController(AppDbContext context, IAlertService alertService)
        {
            _context = context;
            _alertService = alertService;
        }

        [Authorize(Roles = "operator,passenger")]
        [HttpGet("incident-alerts")]
        public async Task<IActionResult> IncidentAlerts([FromQuery] string? assignedStationId = null)
        {
            // Preload all line tostation mappings once 
            var lineStations = await _context.LineStations
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .ToListAsync();

            // Resolve lines passing through the assigned station 
            List<string>? allowedLines = null;
            if (!string.IsNullOrEmpty(assignedStationId))
            {
                allowedLines = lineStations
                    .Where(ls => ls.StationId == assignedStationId)
                    .Select(ls => ls.LineId)
                    .ToList();
            }


            var windowStart = MytTodayUtc.AddDays(-35);

            var incidentsQuery = _context.Incidents
                .AsNoTracking()
                .Where(i => i.CreatedAt >= windowStart)
                .WithFullNavigations()
                .WithStatusUsers()
                .AsQueryable();

            var incidents = await incidentsQuery
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var now = DateTime.UtcNow;

            var alerts = incidents
                .Select(i => _alertService.MapToAlertDTO(i, now))
                .ToList();

            // Filter by allowed lines if station is assigned
            if (allowedLines != null)
            {
                alerts = alerts
                    .Where(a => allowedLines.Contains(a.LineId))
                    .ToList();
            }

            return Ok(alerts);
        }

        [Authorize(Roles = "passenger,auxiliary")]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var (userId, authError) = RequireUserId();
            if (authError != null) return authError;

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (user.Role == UserRole.Auxiliary)
            {
                var avgMinutes = await _context.Incidents
                    .Where(i => i.EnrouteBy == userId && i.EnrouteAt != null)
                    .Select(i => (double?)(i.EnrouteAt!.Value - i.CreatedAt).TotalMinutes)
                    .AverageAsync() ?? 0;

                var resolvedCount = await _context.Incidents
                    .CountAsync(i => i.ResolvedBy == userId && i.Status == IncidentStatus.Resolved);

                return Ok(new AuxiliaryProfileDto
                {
                    UserId          = user.UserId,
                    UserName        = user.UserName,
                    Email           = user.Email,
                    Role            = user.Role.ToString(),
                    AvgReactionTime = Math.Round(avgMinutes, 1),
                    Resolved        = resolvedCount
                });
            }
            else
            {
                var reportsCount = await _context.UserReports.CountAsync(r => r.UserId == userId);
                var validReports = await _context.Incidents
                    .Include(i => i.UserReport)
                    .CountAsync(i => i.UserReport != null && i.UserReport.UserId == userId &&
                        (i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Escalated));

                return Ok(new PassengerProfileDto
                {
                    UserId   = user.UserId,
                    UserName = user.UserName,
                    Email    = user.Email,
                    Role     = user.Role.ToString(),
                    Reports  = reportsCount,
                    Verified = validReports
                });
            }
        }
    }
}
