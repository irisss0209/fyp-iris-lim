using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace backend.Controllers
{
    public abstract class BaseApiController : ControllerBase
    {
        // ── User identity ──────────────────────────────────────────────────────

        protected string? GetCurrentUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        protected (string? userId, IActionResult? error) RequireUserId()
        {
            var id = GetCurrentUserId();
            return string.IsNullOrWhiteSpace(id)
                ? (null, Unauthorized(new { error = "Unable to identify user from token." }))
                : (id, null);
        }

        // ── Time helpers (MYT = UTC+8) ─────────────────────────────────────────

        protected static DateTime MytNow => DateTime.UtcNow.AddHours(8);

        protected static DateTime MytTodayUtc =>
            DateTime.SpecifyKind(DateTime.UtcNow.AddHours(8).Date.AddHours(-8), DateTimeKind.Utc);

        // ── Incident ID parsing ────────────────────────────────────────────────

        protected static bool TryParseIncidentId(string id, out int incidentId)
            => int.TryParse(id.Replace("ALT-", "").Replace("RPT-", ""), out incidentId);
    }
}
