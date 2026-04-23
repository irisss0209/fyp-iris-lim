using backend.Data;
using backend.Models;
using backend.Services;
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
        private readonly AuthChallengeStore _challengeStore;
        private readonly ITotpService _totpService;
        private readonly IEmailVerificationSender _emailVerificationSender;
        private readonly IWebHostEnvironment _environment;

        public AuthController(
            AppDbContext context,
            IConfiguration configuration,
            AuthChallengeStore challengeStore,
            ITotpService totpService,
            IEmailVerificationSender emailVerificationSender,
            IWebHostEnvironment environment)
        {
            _context = context;
            _configuration = configuration;
            _challengeStore = challengeStore;
            _totpService = totpService;
            _emailVerificationSender = emailVerificationSender;
            _environment = environment;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class VerifyLoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Code { get; set; } = string.Empty;
            public string? ChallengeId { get; set; }
        }

        public class CheckAccountRequest
        {
            public string Email { get; set; } = string.Empty;
        }

        [HttpPost("check-account")]
        public async Task<IActionResult> CheckAccount([FromBody] CheckAccountRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { error = "Email is required." });
            }

            var normalized = request.Email.Trim().ToLower();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalized);
            if (user == null)
            {
                return Ok(new { exists = false });
            }

            return Ok(new
            {
                exists = true,
                role = MapFrontendRole(user.Role),
                isActive = user.Status == UserStatus.Active
            });
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

            var frontendRole = MapFrontendRole(user.Role);

            // Operator: verify with Google Authenticator TOTP.
            if (user.Role == UserRole.Operator)
            {
                return Ok(new
                {
                    requiresMfa = true,
                    mfaMethod = "google_authenticator",
                    email = user.Email,
                    role = frontendRole
                });
            }

            return await StartEmailOtpForUser(user, frontendRole);
        }

        [HttpPost("login/start-otp")]
        public async Task<IActionResult> StartOtpLogin([FromBody] CheckAccountRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { error = "Email is required." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null || user.Status != UserStatus.Active)
            {
                return Unauthorized(new { error = "Account not found or inactive." });
            }

            if (user.Role == UserRole.Operator)
            {
                return BadRequest(new { error = "Operators must sign in with password and Google Authenticator." });
            }

            var frontendRole = MapFrontendRole(user.Role);
            return await StartEmailOtpForUser(user, frontendRole);
        }

        [HttpPost("login/verify")]
        public async Task<IActionResult> VerifyLogin([FromBody] VerifyLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
            {
                return BadRequest(new { error = "Email and code are required." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null || user.Status != UserStatus.Active)
            {
                return Unauthorized(new { error = "Invalid login attempt." });
            }

            var isVerified = false;
            if (user.Role == UserRole.Operator)
            {
                var secret = _configuration[$"OperatorTotpSecrets:{user.Email.ToLower()}"];
                if (string.IsNullOrWhiteSpace(secret))
                {
                    return Unauthorized(new { error = "Google Authenticator is not configured for this operator." });
                }

                isVerified = _totpService.VerifyCode(secret, request.Code.Trim());
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.ChallengeId))
                {
                    return BadRequest(new { error = "Challenge ID is required for OTP verification." });
                }
                isVerified = _challengeStore.VerifyAndConsume(request.ChallengeId, user.UserId, request.Code.Trim());
            }

            if (!isVerified)
            {
                return Unauthorized(new { error = "Invalid or expired verification code." });
            }

            var frontendRole = MapFrontendRole(user.Role);
            var token = GenerateJwtToken(user, frontendRole);
            return Ok(new
            {
                userId = user.UserId,
                userName = user.UserName,
                employeeId = user.EmployeeId,
                email = user.Email,
                role = frontendRole,
                token,
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
                new Claim("username", user.UserName),
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

        private static string MapFrontendRole(UserRole role)
        {
            return role switch
            {
                UserRole.Operator => "operator",
                UserRole.Auxiliary => "auxiliary",
                UserRole.Passenger => "passenger",
                _ => "passenger"
            };
        }

        private static string MaskEmail(string email)
        {
            var at = email.IndexOf('@');
            if (at <= 1)
            {
                return email;
            }

            var prefix = email[..2];
            var suffix = email[at..];
            return $"{prefix}***{suffix}";
        }

        private async Task<IActionResult> StartEmailOtpForUser(User user, string frontendRole)
        {
            var challenge = _challengeStore.Create(user.UserId, TimeSpan.FromMinutes(5));
            var sent = await _emailVerificationSender.SendLoginOtpAsync(user.Email, user.UserName, challenge.Code);
            if (!sent)
            {
                return StatusCode(500, new { error = "Unable to send verification code. Please try again." });
            }

            return Ok(new
            {
                requiresMfa = true,
                mfaMethod = "email_otp",
                challengeId = challenge.ChallengeId,
                maskedDestination = MaskEmail(user.Email),
                expiresInSeconds = (int)(challenge.ExpiresAtUtc - DateTime.UtcNow).TotalSeconds,
                debugOtp = _environment.IsDevelopment() ? challenge.Code : null,
                email = user.Email,
                role = frontendRole
            });
        }
    }
}
