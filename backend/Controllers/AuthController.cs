using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { error = "Email is required." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                return Unauthorized(new { error = "Invalid email or password. Please try again." });
            }
            if (user.Status != UserStatus.Active)
            {
                return Unauthorized(new { error = "Account is not active." });
            }
            // Map Database roles to Frontend roles
            string frontendRole = user.Role switch
            {
                UserRole.Operator  => "operator",
                UserRole.Auxiliary => "auxiliary",
                UserRole.Customer  => "passenger",
                _                  => "passenger"
            };

            var token = GenerateJwtToken(user, frontendRole);

            return Ok(new
            {
                userId      = user.UserId,
                userName    = user.UserName,
                employeeId  = user.EmployeeId,
                email       = user.Email,
                role        = frontendRole,
                token       = token,
                otp         = "123456", // Mock OTP for UI flow
                description = user.Role.ToString()
            });
        }

        private string GenerateJwtToken(User user, string frontendRole)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey   = jwtSettings["SecretKey"] ?? "a_very_long_and_secure_secret_key_for_testing_12345";
            var issuer      = jwtSettings["Issuer"] ?? "railly.my";
            var audience    = jwtSettings["Audience"] ?? "railly.my";
            var expiryHours = int.Parse(jwtSettings["ExpiryHours"] ?? "8");

            var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub,   user.UserId),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role,               frontendRole),
                new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString())
            };

            var tokenDescriptor = new JwtSecurityToken(
                issuer:             issuer,
                audience:           audience,
                claims:             claims,
                expires:            DateTime.UtcNow.AddHours(expiryHours),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
        }
    }
}
