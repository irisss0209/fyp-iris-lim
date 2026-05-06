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
            var lineId = incident.Detection?.LineId ?? incident.UserReport?.LineId;
            var alertId = (incident.Source == IncidentSource.AI_DETECTION ? "ALT-" : "RPT-")
                          + incident.IncidentId.ToString("D3");

            var tasks = new List<Task>();

            if (stationId != null && lineId != null)
                tasks.Add(NotifyPassengers(context, stationId, lineId));

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

            if (stationId != null)
                tasks.Add(NotifyAuxiliary(context, stationId, incident.Status, alertId));

            tasks.Add(NotifyOperators(context, $"Alert {alertId} – {statusLabel}", $"Status updated to {statusLabel}.", alertId));

            await Task.WhenAll(tasks);
        }

        // ── Passenger: notify by proximity (0.5 km) ──────────────────────────────

        private async Task NotifyPassengers(AppDbContext context, string stationId, string lineId)
        {
            var station = await context.Stations.FindAsync(stationId);
            if (station == null || (station.Latitude == 0 && station.Longitude == 0)) return;

            var mytToday = DateTime.UtcNow.AddHours(8).Date;
            var todayUtc = DateTime.SpecifyKind(mytToday.AddHours(-8), DateTimeKind.Utc);

            var activeCount = await context.Incidents
                .Include(i => i.Detection)
                .Include(i => i.UserReport)
                .Where(i =>
                    i.CreatedAt >= todayUtc &&
                    i.Status != IncidentStatus.Resolved &&
                    i.Status != IncidentStatus.Dismissed &&
                    (i.Detection!.LineId == lineId || i.UserReport!.LineId == lineId))
                .CountAsync();

            var passengerSubs = await context.PushSubscriptions
                .Include(s => s.User)
                .Where(s => s.User.Role == UserRole.Passenger && s.Latitude != null && s.Longitude != null)
                .ToListAsync();

            var nearbySubs = passengerSubs.Where(s =>
                Haversine(s.Latitude!.Value, s.Longitude!.Value, station.Latitude, station.Longitude) <= 0.5);

            var body = activeCount == 1
                ? $"1 active incident on {lineId} near you."
                : $"{activeCount} active incidents on {lineId} near you.";

            var sendTasks = nearbySubs.Select(sub =>
                SendPush(context, sub, $"Safety Alert – {lineId}", body, "/home", $"passenger-line-{lineId}"));

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

        private static double Haversine(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371;
            var dLat = ToRad(lat2 - lat1);
            var dLon = ToRad(lon2 - lon1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                  + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                  * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        private static double ToRad(double d) => d * Math.PI / 180;
    }
}
