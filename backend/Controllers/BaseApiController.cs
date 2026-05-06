using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace backend.Controllers
{
    public abstract class BaseApiController : ControllerBase
    {
        protected string? GetCurrentUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    }
}
