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

        /// <summary>
        /// Returns (userId, null) on success, or (null, Unauthorized result) when
        /// the JWT carries no user ID.
        /// Usage: var (userId, authError) = RequireUserId(); if (authError != null) return authError;
        /// </summary>
        protected (string? userId, IActionResult? error) RequireUserId()
        {
            var id = GetCurrentUserId();
            return string.IsNullOrWhiteSpace(id)
                ? (null, Unauthorized(new { error = "Unable to identify user from token." }))
                : (id, null);
        }

        // ── Time helpers (MYT = UTC+8) ─────────────────────────────────────────

        /// <summary>Current date-time in Malaysian time (UTC+8).</summary>
        protected static DateTime MytNow => DateTime.UtcNow.AddHours(8);

        /// <summary>MYT midnight of today expressed as a UTC DateTime (for DB range queries).</summary>
        protected static DateTime MytTodayUtc =>
            DateTime.SpecifyKind(DateTime.UtcNow.AddHours(8).Date.AddHours(-8), DateTimeKind.Utc);

        // ── Incident ID parsing ────────────────────────────────────────────────

        /// <summary>
        /// Strips "ALT-" / "RPT-" prefixes and parses the remaining integer.
        /// Returns false when parsing fails — caller should return BadRequest.
        /// </summary>
        protected static bool TryParseIncidentId(string id, out int incidentId)
            => int.TryParse(id.Replace("ALT-", "").Replace("RPT-", ""), out incidentId);
    }
}
