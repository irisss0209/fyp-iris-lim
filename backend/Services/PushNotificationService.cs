using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using WebPush;
using WebPushSub = WebPush.PushSubscription;

namespace backend.Services
{
    public interface IPushNotificationService
    {
        Task NotifyNewIncident(int incidentId);
        Task NotifyStatusChange(int incidentId);
    }

    public class PushNotificationService : IPushNotificationService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly string _vapidPublicKey;
        private readonly string _vapidPrivateKey;
        private readonly string _vapidSubject;
        private readonly ILogger<PushNotificationService> _logger;

        public PushNotificationService(IServiceScopeFactory scopeFactory, IConfiguration config, ILogger<PushNotificationService> logger)
        {
            _scopeFactory = scopeFactory;
            _vapidPublicKey = config["Vapid:PublicKey"]!;
            _vapidPrivateKey = config["Vapid:PrivateKey"]!;
            _vapidSubject = config["Vapid:Subject"] ?? "mailto:admin@railly.my";
            _logger = logger;
        }

        public async Task NotifyNewIncident(int incidentId)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var incident = await context.Incidents
                .Include(i => i.Detection)
                .Include(i => i.UserReport)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null) return;

            var stationId = incident.Detection?.StationId ?? incident.UserReport?.StationId;
            var alertId = (incident.Source == IncidentSource.AI_DETECTION ? "ALT-" : "RPT-")
                          + incident.IncidentId.ToString("D3");

            var tasks = new List<Task>();

            if (stationId != null)
                tasks.Add(NotifyAuxiliary(context, stationId, incident.Status, alertId));

            tasks.Add(NotifyOperators(context, "New Incident Alert", $"Alert {alertId} requires your attention.", alertId));

            await Task.WhenAll(tasks);
        }

        public async Task NotifyStatusChange(int incidentId)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var incident = await context.Incidents
                .Include(i => i.Detection)
                .Include(i => i.UserReport)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null) return;

            var stationId = incident.Detection?.StationId ?? incident.UserReport?.StationId;
            var alertId = (incident.Source == IncidentSource.AI_DETECTION ? "ALT-" : "RPT-")
                          + incident.IncidentId.ToString("D3");
            var statusLabel = incident.Status.ToString().Replace("_", " ");

            var tasks = new List<Task>();

            if (incident.Source == IncidentSource.USER_REPORT && incident.UserReport != null)
            {
                var (title, body) = incident.Status switch
                {
                    IncidentStatus.Verified   => ("Report Verified", $"Your report ({alertId}) has been verified by an operator."),
                    IncidentStatus.En_Route   => ("Help Is On The Way", $"An officer is en route following your report ({alertId})."),
                    IncidentStatus.Escalated  => ("Report Escalated", $"Your report ({alertId}) has been escalated. Additional help is being sent."),
                    IncidentStatus.Resolved   => ("Report Resolved", $"Your report ({alertId}) has been resolved. Thank you for keeping WOC safe."),
                    IncidentStatus.Dismissed  => ("Report Closed", $"Your report ({alertId}) has been reviewed and closed."),
                    _                         => ("Report Updated", $"Your report ({alertId}) status has changed to {statusLabel}."),
                };
                tasks.Add(NotifyReporter(context, incident.UserReport.UserId, title, body, alertId));
            }

            if (stationId != null)
                tasks.Add(NotifyAuxiliary(context, stationId, incident.Status, alertId));

            tasks.Add(NotifyOperators(context, $"Alert {alertId} – {statusLabel}", $"Status updated to {statusLabel}.", alertId));

            await Task.WhenAll(tasks);
        }

        // ── Passenger: notify the reporter of their own report's status ───────────

        private async Task NotifyReporter(AppDbContext context, string userId, string title, string body, string alertId)
        {
            var subs = await context.PushSubscriptions
                .Where(s => s.UserId == userId)
                .ToListAsync();

            var sendTasks = subs.Select(sub =>
                SendPush(context, sub, title, body, "/passenger/reports", $"rpt-{alertId}"));

            await Task.WhenAll(sendTasks);
        }

        // ── Auxiliary: notify within ±2 stations ──────────────────────────────────

        private async Task NotifyAuxiliary(AppDbContext context, string stationId, IncidentStatus status, string alertId)
        {
            var lineStations = await context.LineStations
                .Where(ls => ls.StationId == stationId)
                .ToListAsync();

            if (!lineStations.Any()) return;

            var lineIds = lineStations.Select(ls => ls.LineId).ToList();
            var allLineStations = await context.LineStations
                .Where(ls => lineIds.Contains(ls.LineId))
                .ToListAsync();

            var allowedStationIds = new HashSet<string>();
            foreach (var ls in lineStations)
            {
                var nearby = allLineStations
                    .Where(s => s.LineId == ls.LineId && Math.Abs(s.SequenceOrder - ls.SequenceOrder) <= 2)
                    .Select(s => s.StationId);
                foreach (var sid in nearby) allowedStationIds.Add(sid);
            }

            var today = DateTime.UtcNow.AddHours(8).Date; // MYT (UTC+8), consistent with shift storage
            var auxUserIds = await context.AuxiliaryShifts
                .Where(s => s.ShiftDate.Date == today && allowedStationIds.Contains(s.StationId))
                .Select(s => s.UserId)
                .Distinct()
                .ToListAsync();

            if (!auxUserIds.Any()) return;

            var subs = await context.PushSubscriptions
                .Where(s => auxUserIds.Contains(s.UserId))
                .ToListAsync();

            bool isEscalated = status == IncidentStatus.Escalated;
            var title = isEscalated ? "URGENT! Alert Escalated" : "New Alert – Nearby Station";
            var body = isEscalated
                ? $"Alert {alertId} has been escalated. Immediate response needed."
                : $"Incident {alertId} reported at a nearby station.";

            var sendTasks = subs.Select(sub =>
                SendPush(context, sub, title, body, "/auxiliary/alerts", $"aux-{alertId}"));

            await Task.WhenAll(sendTasks);
        }

        // ── Operator: notify all, respecting their preference ──────────────────────

        private async Task NotifyOperators(AppDbContext context, string title, string body, string alertId)
        {
            var now = DateTime.UtcNow.AddHours(8).TimeOfDay; // MYT (UTC+8)

            var operatorSubs = await context.PushSubscriptions
                .Include(s => s.User)
                .Where(s => s.User.Role == UserRole.Operator)
                .ToListAsync();

            var sendTasks = new List<Task>();

            foreach (var sub in operatorSubs)
            {
                var pref = await context.NotificationPreferences.FindAsync(sub.UserId);
                if (pref != null)
                {
                    if (pref.SoundAlerts == SoundAlertMode.Off) continue;
                    if (pref.SoundAlerts == SoundAlertMode.Peak)
                    {
                        // Peak hours: 7–9 AM and 5–7 PM
                        bool morning = now >= TimeSpan.FromHours(7) && now < TimeSpan.FromHours(9);
                        bool evening = now >= TimeSpan.FromHours(17) && now < TimeSpan.FromHours(19);
                        if (!morning && !evening) continue;
                    }
                }

                sendTasks.Add(SendPush(context, sub, title, body, "/operator/live-alerts", $"op-{alertId}"));
            }

            await Task.WhenAll(sendTasks);
        }

        // ── VAPID push sender ──────────────────────────────────────────────────────

        private async Task SendPush(AppDbContext context, Models.PushSubscription sub, string title, string body, string url, string tag)
        {
            var subscription = new WebPushSub(sub.Endpoint, sub.P256DH, sub.Auth);
            var vapidDetails = new VapidDetails(_vapidSubject, _vapidPublicKey, _vapidPrivateKey);
            var client = new WebPushClient();
            var payload = JsonSerializer.Serialize(new { title, body, url, tag });

            try
            {
                await client.SendNotificationAsync(subscription, payload, vapidDetails);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone
                                           || ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                context.PushSubscriptions.Remove(sub);
                await context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Push notification failed for user {UserId}", sub.UserId);
            }
        }

    }
}
