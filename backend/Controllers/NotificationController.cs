using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotificationController(AppDbContext context)
        {
            _context = context;
        }

        private string? GetCurrentUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        [Authorize]
        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest req)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
            if (string.IsNullOrWhiteSpace(req.Endpoint) || req.Keys == null) return BadRequest();

            var existing = await _context.PushSubscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == req.Endpoint);

            if (existing != null)
            {
                existing.P256DH = req.Keys.P256DH;
                existing.Auth = req.Keys.Auth;
                existing.Latitude = req.Latitude;
                existing.Longitude = req.Longitude;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.PushSubscriptions.Add(new PushSubscription
                {
                    UserId = userId,
                    Endpoint = req.Endpoint,
                    P256DH = req.Keys.P256DH,
                    Auth = req.Keys.Auth,
                    Latitude = req.Latitude,
                    Longitude = req.Longitude,
                    UpdatedAt = DateTime.UtcNow,
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Subscribed." });
        }

        [Authorize]
        [HttpDelete("unsubscribe")]
        public async Task<IActionResult> Unsubscribe()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var subs = await _context.PushSubscriptions
                .Where(s => s.UserId == userId)
                .ToListAsync();

            _context.PushSubscriptions.RemoveRange(subs);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Unsubscribed." });
        }
    }

    public class SubscribeRequest
    {
        public string Endpoint { get; set; } = null!;
        public SubscriptionKeys Keys { get; set; } = null!;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }

    public class SubscriptionKeys
    {
        public string P256DH { get; set; } = null!;
        public string Auth { get; set; } = null!;
    }
}
