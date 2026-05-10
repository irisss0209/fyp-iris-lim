using backend.Data;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using backend.Models.DTOs;
using backend.Services;
using OfficeOpenXml;
namespace backend.Controllers
{
    [ApiController]
    [Route("api/data")]
    public class OperatorController : BaseApiController
    {
        private readonly AppDbContext _context;
        private readonly IAlertService _alertService;
        private readonly IS3Service _s3Service;
        private readonly ILogger<OperatorController> _logger;
        private readonly IGeminiService _gemini;
        private readonly IPushNotificationService _pushService;
        private readonly IHubContext<AlertHub> _hub;

        public OperatorController(AppDbContext context, IAlertService alertService, IS3Service s3Service, ILogger<OperatorController> logger, IGeminiService gemini, IPushNotificationService pushService, IHubContext<AlertHub> hub)
        {
            _context = context;
            _alertService = alertService;
            _s3Service = s3Service;
            _logger = logger;
            _gemini = gemini;
            _pushService = pushService;
            _hub = hub;
        }

        [Authorize(Roles = "operator")]
        [HttpPost("ai/report-summary")]
        public async Task<IActionResult> GetReportSummary([FromBody] ReportSummaryRequest req, CancellationToken ct)
        {
            var deltaStr = req.TotalDelta >= 0
                ? $"up {req.TotalDelta:F1}% from last month"
                : $"down {Math.Abs(req.TotalDelta):F1}% from last month";

            var prompt = $"""
                You are an AI analyst for Railly, a Malaysian transit safety platform.
                Write a concise 2-3 sentence executive summary of {req.Month}'s incident report for operators.
                Highlight what is notable, flag what needs attention, and give one actionable recommendation.
                No bullet points, no headers.

                Monthly stats:
                - Total incidents: {req.Total} ({deltaStr})
                - Resolution rate: {req.ResolutionRate}%
                - False alarm rate: {req.FalseAlarmRate}%
                - Average response time: {req.AvgResponseMinutes:F1} minutes
                - Most affected line: {(string.IsNullOrWhiteSpace(req.MostAffectedLine) ? "N/A" : req.MostAffectedLine)}
                - Highest risk train: {(string.IsNullOrWhiteSpace(req.HighestRiskTrain) ? "N/A" : req.HighestRiskTrain)}
                - Peak incident time: {(string.IsNullOrWhiteSpace(req.PeakTime) ? "N/A" : req.PeakTime)}

                Respond with ONLY the summary paragraph.
                """;

            var summary = await _gemini.GenerateAsync(prompt, ct);
            return Ok(new { summary });
        }

        [Authorize(Roles = "operator")]
        [HttpGet("home-stats")]
        public async Task<IActionResult> GetHomeStats()
        {
            var lines = await _context.TrainLines.ToListAsync();

            // Recent reports from DB
            var recentIncidents = await _context.Incidents
                .AsNoTracking()
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.DismissedByUser)
                .OrderByDescending(i => i.CreatedAt)
                .Take(5)
                .ToListAsync();

            var now = DateTime.UtcNow;

            var recentReports = recentIncidents
                .Select(i => _alertService.MapToAlertDTO(i, now))
                .ToList();

            // Real trend data: incidents grouped by day of week (last 30 days)
            var dayNames = new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
            var since = DateTime.UtcNow.AddDays(-30);

            var allIncidents = await _context.Incidents
                .AsNoTracking()
                .Where(i => i.CreatedAt >= since)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                .ToListAsync();

            // Helper to resolve lineId for an incident
            string? ResolveLineId(Incident inc)
            {
                // Prioritize direct fields
                if (inc.Detection?.LineId != null) return inc.Detection.LineId;
                if (inc.UserReport?.LineId != null) return inc.UserReport.LineId;

                // Fallback to train-asset link
                if (inc.Source == IncidentSource.AI_DETECTION && inc.Detection?.Camera?.TrainCoach?.TrainAsset != null)
                    return inc.Detection.Camera.TrainCoach.TrainAsset.LineId;
                if (inc.UserReport?.TrainCoach?.TrainAsset != null)
                    return inc.UserReport.TrainCoach.TrainAsset.LineId;
                return null;
            }

            // "All Lines" trend
            var allLinesTrend = Enumerable.Range(0, 7).Select(d => new
            {
                day = dayNames[d],
                count = allIncidents.Count(i => (int)i.CreatedAt.AddHours(8).DayOfWeek == d)
            }).ToList();

            var trendData = new Dictionary<string, object> { { "All Lines", allLinesTrend } };

            // Pre-group by lineId to avoid O(n×m) in-memory filtering in the loop below
            var incidentsByLine = allIncidents
                .GroupBy(i => ResolveLineId(i))
                .ToDictionary(g => g.Key ?? "unknown", g => g.ToList());

            // Per-line trends + summary
            var lineSummary = new List<object>();
            foreach (var line in lines)
            {
                var lineIncidents = incidentsByLine.GetValueOrDefault(line.LineId, new List<Incident>());

                var lineTrend = Enumerable.Range(0, 7).Select(d => new
                {
                    day = dayNames[d],
                    count = lineIncidents.Count(i => (int)i.CreatedAt.AddHours(8).DayOfWeek == d)
                }).ToList();

                trendData[line.LineName] = lineTrend;

                lineSummary.Add(new
                {
                    name = line.LineName,
                    value = lineIncidents.Count(i => i.Status == IncidentStatus.Resolved)
                });
            }

            return Ok(new
            {
                trendData,
                lineSummary,
                recentReports
            });
        }

        [Authorize]
        [HttpGet("incident-alerts")]
        public async Task<IActionResult> IncidentAlerts([FromQuery] string? assignedStationId = null)
        {
            // Preload all line→station mappings once (first station per line by sequence)
            var lineStations = await _context.LineStations
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .ToListAsync();

            // Resolve lines passing through the assigned station if provided
            List<string>? allowedLines = null;
            if (!string.IsNullOrEmpty(assignedStationId))
            {
                allowedLines = lineStations
                    .Where(ls => ls.StationId == assignedStationId)
                    .Select(ls => ls.LineId)
                    .ToList();
            }

            // Default window: last 35 days (covers today + last-week comparison + current month
            // that the Insights page needs). Filter at DB level — never return all-time data.
            var mytToday = DateTime.UtcNow.AddHours(8).Date;
            var windowStart = DateTime.SpecifyKind(mytToday.AddHours(-8), DateTimeKind.Utc).AddDays(-35);

            var incidentsQuery = _context.Incidents
                .AsNoTracking()
                .Where(i => i.CreatedAt >= windowStart)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                                .ThenInclude(ta => ta!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.DismissedByUser)
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

        [Authorize(Roles = "operator")]
        [HttpPost("incident-alerts/{id}/status")]
        public async Task<IActionResult> UpdateAlertStatus(string id, [FromBody] UpdateStatusRequest request)
        {
            var incidentIdStr = id.Replace("ALT-", "").Replace("RPT-", "");
            if (!int.TryParse(incidentIdStr, out var incidentId))
                return BadRequest(new { error = $"Invalid ID format: {id}" });

            var incident = await _context.Incidents.FindAsync(incidentId);
            if (incident == null)
                return NotFound(new { error = $"Incident {incidentId} not found" });

            // Accept frontend aliases (e.g. "resolve" → "Resolved", "en_route" → "En_Route")
            var normalizedStatus = request.Status?.ToLower() switch
            {
                "resolve"  => "Resolved",
                "resolved" => "Resolved",
                "en_route" => "En_Route",
                "verified" => "Verified",
                "escalated"=> "Escalated",
                "dismissed"=> "Dismissed",
                _          => null
            };

            if (normalizedStatus == null || !Enum.TryParse<IncidentStatus>(normalizedStatus, true, out var parsedStatus))
                return BadRequest("Invalid status");

            var previousStatus = incident.Status;
            incident.Status = parsedStatus;

            var userId = GetCurrentUserId();

            switch (parsedStatus)
            {
                case IncidentStatus.Verified:
                    incident.VerifiedBy      = userId;
                    incident.VerifiedAt      = DateTime.UtcNow;
                    incident.VerifiedComment = request.Comment;
                    break;

                case IncidentStatus.Escalated:
                    if (previousStatus != IncidentStatus.Verified)
                    {
                        incident.Status = previousStatus;
                        return BadRequest(new { error = "You can only escalate a verified incident." });
                    }
                    if (!incident.VerifiedAt.HasValue || DateTime.UtcNow - incident.VerifiedAt.Value < TimeSpan.FromMinutes(2))
                    {
                        incident.Status = previousStatus;
                        return BadRequest(new { error = "You can only escalate after 2 minutes with no response since verification." });
                    }
                    incident.EscalatedBy      = userId;
                    incident.EscalatedAt      = DateTime.UtcNow;
                    incident.EscalatedComment = request.Comment;
                    break;

                case IncidentStatus.En_Route:
                    incident.EnrouteAt = DateTime.UtcNow;
                    incident.EnrouteBy = userId;
                    incident.EnrouteComment = request.Comment;
                    break;

                case IncidentStatus.Resolved:
                    incident.ResolvedBy      = userId;
                    incident.ResolvedAt      = DateTime.UtcNow;
                    incident.ResolvedComment = request.Comment;
                    break;

                case IncidentStatus.Dismissed:
                    incident.DismissedBy      = userId;
                    incident.DismissedAt      = DateTime.UtcNow;
                    incident.DismissedComment = request.Comment;
                    break;
            }

            await _context.SaveChangesAsync();
            await _hub.Clients.All.SendAsync("IncidentStatusChanged", incident.IncidentId);
            _ = Task.Run(() => _pushService.NotifyStatusChange(incident.IncidentId));
            return Ok(new
            {
                incidentId = incident.IncidentId,
                status     = incident.Status.ToString().ToLower()
            });
        }

        [Authorize(Roles = "operator")]
        [HttpGet("operator/dashboard")]
        public async Task<IActionResult> GetOperatorDashboard([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            // Ensure UTC kind — ASP.NET query-string binding may produce DateTimeKind.Unspecified
            // or DateTimeKind.Local even for ISO-8601 strings ending with 'Z'. We must convert
            // properly: Unspecified is assumed UTC (value is already correct), Local is converted.
            DateTime? fromUtc = from.HasValue
                ? DateTime.SpecifyKind(
                    from.Value.Kind == DateTimeKind.Local ? from.Value.ToUniversalTime() : from.Value,
                    DateTimeKind.Utc)
                : null;
            DateTime? toUtc = to.HasValue
                ? DateTime.SpecifyKind(
                    to.Value.Kind == DateTimeKind.Local ? to.Value.ToUniversalTime() : to.Value,
                    DateTimeKind.Utc)
                : null;

            // If no range supplied at all, default to today in MYT (UTC+8)
            if (!fromUtc.HasValue && !toUtc.HasValue)
            {
                var mytToday = DateTime.UtcNow.AddHours(8).Date; // today's date in MYT
                fromUtc = DateTime.SpecifyKind(mytToday.AddHours(-8), DateTimeKind.Utc); // MYT midnight → UTC
                toUtc   = fromUtc.Value.AddDays(1);
            }

            var baseIncidents = _context.Incidents.AsQueryable();
            if (fromUtc.HasValue) baseIncidents = baseIncidents.Where(i => i.CreatedAt >= fromUtc.Value);
            if (toUtc.HasValue)   baseIncidents = baseIncidents.Where(i => i.CreatedAt <  toUtc.Value);


            // Stats
            var pending   = await baseIncidents.CountAsync(i => i.Status == IncidentStatus.Pending);
            var verified  = await baseIncidents.CountAsync(i => i.Status == IncidentStatus.Verified || i.Status == IncidentStatus.Escalated);
            var resolved  = await baseIncidents.CountAsync(i => i.Status == IncidentStatus.Resolved);
            var dismissed = await baseIncidents.CountAsync(i => i.Status == IncidentStatus.Dismissed);

            var camerasOnline = await _context.Cameras.CountAsync(c => c.Status == CameraStatus.Active);
            var camerasTotal  = await _context.Cameras.CountAsync();

            // Average response time (verified_at - created_at) for incidents that have been verified
            var verifiedIncidents = await baseIncidents
                .AsNoTracking()
                .Where(i => i.VerifiedAt != null)
                .Select(i => new { i.CreatedAt, i.VerifiedAt })
                .ToListAsync();

            double avgResponseMinutes = verifiedIncidents.Count > 0
                ? verifiedIncidents.Average(i => (i.VerifiedAt!.Value - i.CreatedAt).TotalMinutes)
                : 0;

            // Recent alerts (last 5)
            var incidents = await baseIncidents
                .AsNoTracking()
                .AsSplitQuery()
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                                .ThenInclude(ta => ta!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.User)
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.DismissedByUser)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var now = DateTime.UtcNow;

            var recentAlerts = incidents
                .DistinctBy(i => i.IncidentId)
                .Select(i => _alertService.MapToAlertDTO(i, now))
                .ToList();

            return Ok(new
            {
                stats = new
                {
                    pending,
                    verified,
                    resolved,
                    dismissed,
                    camerasOnline,
                    camerasTotal,
                    avgResponseMinutes = Math.Round(avgResponseMinutes, 1)
                },
                recentAlerts
            });
        }

        [Authorize(Roles = "operator")]
        [HttpGet("operator/alerts")]
        public async Task<IActionResult> GetOperatorAlerts()
        {
            // All lines + stations for filter dropdowns (also used for station resolution)
            var lineStations = await _context.LineStations
                .Include(ls => ls.Station)
                .OrderBy(ls => ls.SequenceOrder)
                .ToListAsync();

            var lines = await _context.TrainLines
                .OrderBy(l => l.LineId)
                .Select(l => new { lineId = l.LineId, lineName = l.LineName })
                .ToListAsync();

            var stationsByLine = lineStations
                .GroupBy(ls => ls.LineId)
                .Select(g => new
                {
                    lineId = g.Key,
                    stations = g.Select(ls => new
                    {
                        stationId   = ls.StationId,
                        stationName = ls.Station.StationName
                    }).ToList()
                }).ToList();

            // All incidents from today in MYT (UTC+8)
            var mytToday = DateTime.UtcNow.AddHours(8).Date;
            var today = DateTime.SpecifyKind(mytToday.AddHours(-8), DateTimeKind.Utc);
            var incidents = await _context.Incidents
                .AsNoTracking()
                .Where(i => i.CreatedAt >= today)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.User)
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.DismissedByUser)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            var now = DateTime.UtcNow;

            var alerts = incidents.Select(i =>
            {
                var dto = _alertService.MapToAlertDTO(i, now);

                return new
                {
                    dto.Id,
                    dto.TrainId,
                    dto.CoachId,
                    dto.Line,
                    dto.LineId,
                    dto.Station,
                    dto.Status,
                    dto.Source,
                    dto.Time,
                    dto.Date,
                    dto.Elapsed,
                    dto.Confidence,
                    dto.DeviceId,
                    imageUrl = dto.ImageUrl,

                    passengerComment = i.UserReport?.Description,

                    verifiedBy      = dto.VerifiedBy,
                    verifiedAt      = dto.VerifiedAt,
                    verifiedComment = dto.VerifiedComment,

                    escalatedBy      = dto.EscalatedBy,
                    escalatedAt      = dto.EscalatedAt,
                    escalatedComment = dto.EscalatedComment,

                    enrouteBy = dto.EnrouteBy,
                    enrouteAt = dto.EnrouteAt,
                    enrouteComment = dto.EnrouteComment,

                    resolvedBy      = dto.ResolvedBy,
                    resolvedAt      = dto.ResolvedAt,
                    resolvedComment = dto.ResolvedComment,

                    dismissedBy      = dto.DismissedBy,
                    dismissedAt      = dto.DismissedAt,
                    dismissedComment = dto.DismissedComment
                };
            }).ToList();

            // Counts derived in-memory from the already-built list
            var pending   = alerts.Count(a => a.Status == "pending");
            var verified  = alerts.Count(a => a.Status == "verified");
            var escalated = alerts.Count(a => a.Status == "escalated");
            var enroute   = alerts.Count(a => a.Status == "en_route" || a.Status == "enroute");
            var resolved  = alerts.Count(a => a.Status == "resolved");
            var dismissed = alerts.Count(a => a.Status == "dismissed");

            return Ok(new
            {
                lines,
                stationsByLine,
                stats = new { pending, verified, escalated, enRoute = enroute, resolved, dismissed },
                alerts
            });
        }

        // ── Reports ────────────────────────────────────────────────────────────────

        [Authorize(Roles = "operator")]
        [HttpGet("operator/reports")]
        public async Task<IActionResult> GetOperatorReports(
            [FromQuery] int year  = 0,
            [FromQuery] int month = 0)
        {
            // Default to current month if not specified
            var now = DateTime.UtcNow;
            var nowMyt = now.AddHours(8);
            if (year  == 0) year  = nowMyt.Year;
            if (month == 0) month = nowMyt.Month;

            var fromMyt = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Unspecified);
            var from = DateTime.SpecifyKind(fromMyt.AddHours(-8), DateTimeKind.Utc);
            var to   = from.AddMonths(1);

            // Pre-load station→line mapping; bypasses composite FK nav that fails when line_id is null
            var allLineStations = await _context.LineStations
                .Include(ls => ls.TrainLine)
                .ToListAsync();
            var stationLineMap = allLineStations
                .GroupBy(ls => ls.StationId)
                .ToDictionary(g => g.Key, g => (lineId: g.First().LineId, lineName: g.First().TrainLine.LineName));

            // ── Load all incidents for the month ──────────────────────────────
            var incidents = await _context.Incidents
                .AsNoTracking()
                // TrainId/CoachId via AI camera chain (also provides TrainAsset fallback for line)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                                .ThenInclude(ta => ta!.TrainLine)
                // TrainId/CoachId via user report chain (also provides TrainAsset fallback for line)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta!.TrainLine)
                // Passenger reporter name
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.User)
                // Handler names for timeline steps
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.DismissedByUser)
                .Where(i => i.CreatedAt >= from && i.CreatedAt < to)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();

            // ── Summary stats ─────────────────────────────────────────────────
            var total      = incidents.Count;
            var dismissed  = incidents.Count(i => i.Status == IncidentStatus.Dismissed);
            var resolved   = incidents.Count(i => i.Status == IncidentStatus.Resolved);
            var pending    = incidents.Count(i => i.Status == IncidentStatus.Pending);
            var escalated  = incidents.Count(i => i.Status == IncidentStatus.Escalated);
            var verified   = incidents.Count(i => i.Status == IncidentStatus.Verified);
            var unresolved = total - resolved - dismissed;

            double falseAlarmRate = total > 0 ? Math.Round(dismissed * 100.0 / total, 1) : 0;
            double resolutionRate = total > 0 ? Math.Round(resolved * 100.0 / total, 1) : 0;

            // Avg response time (verified_at - created_at)
            var verifiedIncidents = incidents.Where(i => i.VerifiedAt != null).ToList();
            double avgResponseMinutes = verifiedIncidents.Count > 0
                ? Math.Round(verifiedIncidents.Average(i => (i.VerifiedAt!.Value - i.CreatedAt).TotalMinutes), 1)
                : 0;

            // Compliance score: % of incidents NOT still pending
            double complianceScore = total > 0
                ? Math.Round((total - pending) * 100.0 / total, 1)
                : 100.0;

            // ── Previous month for delta calculations ─────────────────────────
            var prevFrom = from.AddMonths(-1);
            var prevTo   = from;
            var prevIncidents = await _context.Incidents
                .AsNoTracking()
                .Where(i => i.CreatedAt >= prevFrom && i.CreatedAt < prevTo)
                .ToListAsync();
            bool hasPrevData = prevIncidents.Any();
            var prevTotal     = prevIncidents.Count;
            var prevDismissed = prevIncidents.Count(i => i.Status == IncidentStatus.Dismissed);
            var prevPending   = prevIncidents.Count(i => i.Status == IncidentStatus.Pending);
            var prevResolved  = prevIncidents.Count(i => i.Status == IncidentStatus.Resolved);
            var prevUnresolved = prevTotal - prevResolved - prevDismissed;

            double prevFalseAlarmRate    = prevTotal > 0 ? Math.Round(prevDismissed * 100.0 / prevTotal, 1) : 0;
            double prevResolutionRate    = prevTotal > 0 ? Math.Round(prevResolved * 100.0 / prevTotal, 1) : 0;
            double prevComplianceScore   = prevTotal > 0
                ? Math.Round((prevTotal - prevPending) * 100.0 / prevTotal, 1) : 100.0;

            var verifiedPrev = prevIncidents.Where(i => i.Status != IncidentStatus.Pending).ToList();

            var prevVerifiedIncidents = prevIncidents.Where(i => i.VerifiedAt != null).ToList();
            double prevAvgResponseMinutes = prevVerifiedIncidents.Count > 0
                ? Math.Round(prevVerifiedIncidents.Average(i => (i.VerifiedAt!.Value - i.CreatedAt).TotalMinutes), 1)
                : 0;

            // ── Helper: resolve line name + lineId per incident ───────────────
            (string lineId, string lineName) ResolveLineInfo(Incident inc)
            {
                // Primary: station_id → pre-loaded lookup (works even when line_id is null on Detection/UserReport)
                var sid = inc.Detection?.StationId ?? inc.UserReport?.StationId;
                if (sid != null && stationLineMap.TryGetValue(sid, out var fromStation))
                    return fromStation;

                // Secondary: direct line_id scalar → name lookup in pre-loaded list
                var knownLineId = inc.Detection?.LineId ?? inc.UserReport?.LineId;
                if (knownLineId != null)
                {
                    var ls = allLineStations.FirstOrDefault(x => x.LineId == knownLineId);
                    if (ls != null) return (ls.LineId, ls.TrainLine.LineName);
                }

                // Fallback: TrainAsset navigation chain (loaded via Include above)
                var tl = inc.Detection?.Camera?.TrainCoach?.TrainAsset?.TrainLine
                         ?? inc.UserReport?.TrainCoach?.TrainAsset?.TrainLine;
                if (tl != null) return (tl.LineId, tl.LineName);

                return ("unknown", "Unknown");
            }

            // ── Daily bar-chart data (by day-of-week, grouped by line) ────────
            var dayNames = new[] { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };

            // Get unique lines present in this month's data
            var lineGroups = incidents
                .Select(i => ResolveLineInfo(i))
                .GroupBy(x => x.lineId)
                .Select(g => (lineId: g.Key, lineName: g.First().lineName))
                .ToList();

            // Build an object per day: { day, [lineName]: count, ... }
            var dailyData = Enumerable.Range(0, 7).Select(d =>
            {
                var dayIncs = incidents.Where(i => (int)i.CreatedAt.AddHours(8).DayOfWeek == d).ToList();
                var dayObj  = new Dictionary<string, object> { ["day"] = dayNames[d] };
                foreach (var (lineId, lineName) in lineGroups)
                    dayObj[lineName] = dayIncs.Count(i => ResolveLineInfo(i).lineId == lineId);
                return dayObj;
            }).ToList();

            // ── Pie / status breakdown ────────────────────────────────────────
            var statusBreakdown = new[]
            {
                new { name = "Resolved",            value = resolved,                     color = "#2D7A5D" },
                new { name = "Dismissed",           value = dismissed,                    color = "#4A5568" },
                new { name = "Pending",             value = pending,                      color = "#F6AD55" },
                new { name = "Escalated",           value = escalated + verified,         color = "#D34026" },
            }.Where(s => s.value > 0).ToList();

            // ── Incident list ─────────────────────────────────────────────────

            var incidentList = incidents.Select(i =>
            {
                var dto = _alertService.MapToAlertDTO(i, now);
                var (resolvedLineId, resolvedLineName) = ResolveLineInfo(i);

                return new
                {
                    id               = dto.Id,
                    dto.TrainId,
                    dto.CoachId,
                    line             = resolvedLineName,
                    lineId           = resolvedLineId,
                    dto.Status,
                    dto.Source,
                    datetime         = i.CreatedAt,
                    type             = i.Source == IncidentSource.AI_DETECTION ? "AI Detection" : "Passenger Report",
                    reportedBy       = i.UserReport?.User?.UserName,
                    passengerComment = i.UserReport?.Description,
                    confidence = dto.Confidence,
                    verifiedBy       = dto.VerifiedBy,
                    verifiedAt       = dto.VerifiedAt,
                    verifiedComment  = dto.VerifiedComment,
                    enrouteBy        = dto.EnrouteBy,
                    enrouteAt        = dto.EnrouteAt,
                    enrouteComment   = dto.EnrouteComment,
                    resolvedBy       = dto.ResolvedBy,
                    resolvedAt       = dto.ResolvedAt,
                    resolvedComment  = dto.ResolvedComment,
                    escalatedBy      = dto.EscalatedBy,
                    escalatedAt      = dto.EscalatedAt,
                    escalatedComment = dto.EscalatedComment,
                    dismissedBy      = dto.DismissedBy,
                    dismissedAt      = dto.DismissedAt,
                    dismissedComment = dto.DismissedComment,
                };
            }).ToList();
            // ── Available months (for the date picker) ────────────────────────
            var oldestIncident = await _context.Incidents
                .OrderBy(i => i.CreatedAt)
                .Select(i => (DateTime?)i.CreatedAt)
                .FirstOrDefaultAsync();

            var months = new List<object>();
            if (oldestIncident.HasValue)
            {
                var oldestMyt = oldestIncident.Value.AddHours(8);
                var cursor = new DateTime(oldestMyt.Year, oldestMyt.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                var latest = new DateTime(nowMyt.Year, nowMyt.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                while (cursor <= latest)
                {
                    months.Add(new { year = cursor.Year, month = cursor.Month,
                        label = cursor.ToString("MMM yyyy") });
                    cursor = cursor.AddMonths(1);
                }
                months.Reverse(); // newest first
            }

            return Ok(new
            {
                year,
                month,
                months,
                stats = new
                {
                total,
                falseAlarmRate,
                resolutionRate,
                avgResponseMinutes,
                complianceScore,
                unresolvedCount = unresolved,

                hasPreviousData = hasPrevData,   

                totalDifference = hasPrevData ? total - prevTotal : 0,
                resolvedDifference = hasPrevData ? resolved - prevResolved : 0,
                dismissedDifference = hasPrevData ? dismissed - prevDismissed : 0,
                avgResponseDifference = hasPrevData ? avgResponseMinutes - prevAvgResponseMinutes : 0,
                unresolvedDifference = hasPrevData ? unresolved - prevUnresolved : 0,
                totalDelta = hasPrevData && prevTotal > 0
                    ? Math.Round((total - prevTotal) * 100.0 / prevTotal, 1)
                    : 0.0,

                unresolvedDelta = hasPrevData && prevUnresolved > 0
                    ? Math.Round((unresolved - prevUnresolved) * 100.0 / prevUnresolved, 1)
                    : 0.0,

                falseAlarmDelta = hasPrevData
                    ? Math.Round(falseAlarmRate - prevFalseAlarmRate, 1)
                    : 0.0,

                resolutionDelta = hasPrevData
                    ? Math.Round(resolutionRate - prevResolutionRate, 1)
                    : 0.0,

                avgResponseDelta = hasPrevData
                    ? Math.Round(avgResponseMinutes - prevAvgResponseMinutes, 1)
                    : 0.0,

                complianceDelta = hasPrevData
                    ? Math.Round(complianceScore - prevComplianceScore, 1)
                    : 0.0,
            },
                dailyData,
                lines = lineGroups.Select(l => new { l.lineId, l.lineName }).ToList(),
                statusBreakdown,
                incidents = incidentList,
            });
        }

        private string GetTimeSince(DateTime time)
        {
            var ts = DateTime.UtcNow - time;
            if (ts.TotalMinutes < 1) return "Just now";
            if (ts.TotalMinutes < 60) return $"{(int)ts.TotalMinutes} min ago";
            if (ts.TotalHours < 24) return $"{(int)ts.TotalHours}h ago";
            return $"{(int)ts.TotalDays}d ago";
        }

        // ── User Management ───────────────────────────────────────────────────

        [Authorize(Roles = "operator")]
        [EnableRateLimiting("api")]
        [HttpGet("operator/users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 50;

            var total = await _context.Users.CountAsync();
            var users = await _context.Users
                .OrderBy(u => u.UserName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new UserListItemDto
                {
                    UserId    = u.UserId,
                    UserName  = u.UserName,
                    Email     = u.Email,
                    Role      = u.Role.ToString(),
                    Status    = u.Status.ToString(),
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(new UserListPageDto { Total = total, Page = page, PageSize = pageSize, Users = users });
        }

        [Authorize(Roles = "operator")]
        [HttpPatch("operator/users/{userId}/status")]
        public async Task<IActionResult> UpdateUserStatus(string userId, [FromBody] PatchUserStatusRequest req)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { error = "User not found." });

            if (user.Status == UserStatus.Archived)
                return BadRequest(new { error = "Archived users cannot be modified." });

            var newStatus = req.Status?.Trim() switch
            {
                "Suspended" => (UserStatus?)UserStatus.Suspended,
                "Archived"  => (UserStatus?)UserStatus.Archived,
                "Active"    => (UserStatus?)UserStatus.Active,
                _           => null
            };

            if (newStatus == null)
                return BadRequest(new { error = "Invalid status. Allowed: Active, Suspended, Archived." });

            user.Status = newStatus.Value;
            await _context.SaveChangesAsync();

            return Ok(new { userId = user.UserId, status = user.Status.ToString() });
        }

        // ── Shifts with line info ───────────────────────────────────────────────────

        [Authorize]
        [HttpGet("operator/shifts")]
        public async Task<IActionResult> GetOperatorShifts()
        {
            var lineStations = await _context.LineStations
                .Include(ls => ls.TrainLine)
                .Include(ls => ls.Station)
                .ToListAsync();

            var shifts = await _context.AuxiliaryShifts
                .Include(s => s.User)
                .Include(s => s.Station)
                .OrderByDescending(s => s.ShiftDate)
                .ThenByDescending(s => s.StartTime)
                .ToListAsync();

            var result = shifts.Select(s =>
            {
                var lineName = lineStations
                    .FirstOrDefault(ls => ls.StationId == s.StationId)
                    ?.TrainLine?.LineName ?? "—";

                return new OperatorShiftListItemDto
                {
                    ShiftId     = s.ShiftId,
                    UserId      = s.UserId,
                    UserName    = s.User.UserName,
                    StationId   = s.StationId,
                    StationName = s.Station.StationName,
                    LineName    = lineName,
                    ShiftDate   = s.ShiftDate,
                    StartTime   = s.StartTime.ToString(@"hh\:mm"),
                    EndTime     = s.EndTime.ToString(@"hh\:mm")
                };
            }).ToList();

            return Ok(result);
        }

        // ── Helper for  CSV and excel Import ───────────────────────────────────────────────────

        private async Task<(List<string[]> rows, string? error)> ParseFileAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return (new List<string[]>(), "No file uploaded.");

            if (file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            {
                var rows = await ParseExcelAsync(file);
                return (rows, null);
            }

            if (file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            {
                return await ParseCsvAsync(file);
            }

            return (new List<string[]>(), "Unsupported file type. Use .csv or .xlsx");
        }

        private static async Task<List<string[]>> ParseExcelAsync(IFormFile file)
        {
            ExcelPackage.License.SetNonCommercialOrganization("FYP");
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            using var package = new ExcelPackage(stream);
            var ws = package.Workbook.Worksheets[0];
            var rows = new List<string[]>();
            if (ws.Dimension == null) return rows;
            for (int r = 1; r <= ws.Dimension.End.Row; r++)
            {
                var cols = new string[ws.Dimension.End.Column];
                for (int c = 1; c <= ws.Dimension.End.Column; c++)
                    cols[c - 1] = ws.Cells[r, c].Text ?? "";
                rows.Add(cols);
            }
            return rows;
        }

        private static async Task<(List<string[]> rows, string? error)> ParseCsvAsync(IFormFile file)
        {
            using var reader = new StreamReader(file.OpenReadStream());
            var rows = new List<string[]>();
            string? line;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                rows.Add(line.Split(','));
            }
            return (rows, null);
        }

        // ── Excel bulk import ───────────────────────────────────────────────────────

        [Authorize(Roles = "operator")]
        [HttpPost("operator/shifts/import")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> ImportShifts([FromForm] IFormFile file)
        {
            var (rows, error) = await ParseFileAsync(file);
            if (error != null) return BadRequest(new { error });

            var inserted = 0;
            var errors   = new List<string>();

            for (int i = 1; i < rows.Count; i++) // skip header row
            {
                var cols = rows[i];

                if (cols.Length < 5)
                {
                    errors.Add($"Row {i + 1}: Expected 5 columns (user_id, station_id, shift_date, start_time, end_time). Got {cols.Length}.");
                    continue;
                }

                var userId    = cols[0].Trim();
                var stationId = cols[1].Trim();
                var dateText  = cols[2].Trim();
                var startText = cols[3].Trim();
                var endText   = cols[4].Trim();

                if (!DateOnly.TryParse(dateText, out var shiftDate))
                {
                    errors.Add($"Row {i + 1}: Invalid shift_date '{dateText}'. Expected format: yyyy-MM-dd.");
                    continue;
                }

                if (!TimeOnly.TryParse(startText, out var startTime))
                {
                    errors.Add($"Row {i + 1}: Invalid start_time '{startText}'. Expected format: HH:mm.");
                    continue;
                }

                if (!TimeOnly.TryParse(endText, out var endTime))
                {
                    errors.Add($"Row {i + 1}: Invalid end_time '{endText}'. Expected format: HH:mm.");
                    continue;
                }

                if (endTime <= startTime)
                {
                    errors.Add($"Row {i + 1}: end_time must be after start_time.");
                    continue;
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null || user.Role != UserRole.Auxiliary)
                {
                    errors.Add($"Row {i + 1}: '{userId}' is not a valid Auxiliary user.");
                    continue;
                }

                var station = await _context.Stations.FindAsync(stationId);
                if (station == null)
                {
                    errors.Add($"Row {i + 1}: station '{stationId}' not found.");
                    continue;
                }

                var shiftDateDt = new DateTime(shiftDate.Year, shiftDate.Month, shiftDate.Day, 0, 0, 0, DateTimeKind.Utc);
                var startSpan   = startTime.ToTimeSpan();
                var endSpan     = endTime.ToTimeSpan();
                var shiftExists = await _context.AuxiliaryShifts.AnyAsync(s =>
                    s.UserId    == userId    &&
                    s.ShiftDate == shiftDateDt &&
                    s.StartTime == startSpan &&
                    s.EndTime   == endSpan);
                if (shiftExists)
                {
                    errors.Add($"Row {i + 1}: Existing shift for '{userId}' on {dateText} {startText}–{endText}.");
                    continue;
                }

                _context.AuxiliaryShifts.Add(new AuxiliaryShift
                {
                    UserId    = userId,
                    StationId = stationId,
                    ShiftDate = shiftDateDt,
                    StartTime = startSpan,
                    EndTime   = endSpan,
                    CreatedAt = DateTime.UtcNow
                });

                inserted++;
            }

            if (inserted > 0)
                await _context.SaveChangesAsync();

            return Ok(new { inserted, errors });
        }

        [Authorize(Roles = "operator")]
        [HttpPost("operator/users/import")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> ImportUsers([FromForm] IFormFile file)
        {
            var (rows, error) = await ParseFileAsync(file);
if (error != null) return BadRequest(new { error });

            var inserted = 0;
            var errors   = new List<string>();

            for (int i = 1; i < rows.Count; i++) // skip header row
            {
                var cols = rows[i];

                if (cols.Length < 4)
                {
                    errors.Add($"Row {i + 1}: Expected 4 columns (user_name, email, role, employee_id). Got {cols.Length}.");
                    continue;
                }

                var userName    = cols[0].Trim();
                var email       = cols[1].Trim();
                var roleText    = cols[2].Trim();
                var employeeId  = cols[3].Trim();

                if (!Enum.TryParse<UserRole>(roleText, true, out var role))
                {
                    errors.Add($"Row {i + 1}: Invalid role '{roleText}'. Must be one of: {string.Join(", ", Enum.GetNames<UserRole>())}");
                    continue;
                }
                if (role == UserRole.Passenger)
                {
                    errors.Add($"Row {i + 1}: Passenger role is not allowed for bulk upload.");
                    continue;
                }
                if (await _context.Users.AnyAsync(u => u.Email == email))
                {
                    errors.Add($"Row {i + 1}: User with email '{email}' already exists.");
                    continue;
                }

                string prefix = role switch
                {
                    UserRole.Operator  => "USR-OP-",
                    UserRole.Auxiliary => "USR-AUX-",
                     _ => throw new Exception("Invalid role for import")
                };

                var newUserId = prefix + Guid.NewGuid().ToString("N")[..8].ToUpper();
                _context.Users.Add(new User
                {
                    UserId       = newUserId,
                    EmployeeId   = string.IsNullOrWhiteSpace(employeeId) ? null : employeeId,
                    Email        = email,
                    UserName     = userName,
                    Role         = role,
                    PasswordHash = null,
                    Status       = UserStatus.Active,
                    CreatedAt    = DateTime.UtcNow
                });

                inserted++;
            }

            if (inserted > 0)
                await _context.SaveChangesAsync();

            return Ok(new { inserted, errors });
        }


        // ── Operator Settings (DB-backed) ──────────────────────────────────────────

        [Authorize(Roles = "operator")]
        [HttpGet("operator/settings")]
        public async Task<IActionResult> GetOperatorSettings()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var pref = await _context.NotificationPreferences.FindAsync(userId);
            return Ok(new
            {
                soundAlerts = (pref?.SoundAlerts ?? SoundAlertMode.On).ToString().ToLower(),
                timeFormat = pref?.TimeFormat ?? "24h"
            });
        }

        [Authorize(Roles = "operator")]
        [HttpPost("operator/settings")]
        public async Task<IActionResult> SaveOperatorSettings([FromBody] OperatorSettingsRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var pref = await _context.NotificationPreferences.FindAsync(userId);
            if (pref == null)
            {
                pref = new Models.NotificationPreference { UserId = userId };
                _context.NotificationPreferences.Add(pref);
            }

            if (request.SoundAlerts != null &&
                Enum.TryParse<SoundAlertMode>(request.SoundAlerts, ignoreCase: true, out var mode))
                pref.SoundAlerts = mode;

            pref.TimeFormat = request.TimeFormat ?? pref.TimeFormat;

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        public class OperatorSettingsRequest
        {
            public string SoundAlerts { get; set; } = "on";
            public string TimeFormat { get; set; } = "24h";
        }

        public class PatchUserStatusRequest
        {
            public string Status { get; set; } = null!;
        }
    }

    public class UpdateStatusRequest
    {
        public string? Status { get; set; }
        public string? Comment { get; set; }
    }
}