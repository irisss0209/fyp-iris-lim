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

        public class MfaSetupResponse
        {
            public string Secret { get; set; } = string.Empty;
            public string QrCodeUri { get; set; } = string.Empty;
        }

        public class MfaActivateRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Code { get; set; } = string.Empty;
            public string? ChallengeId { get; set; }
        }

        public class ChangePasswordRequest
        {
            public string Email { get; set; } = string.Empty;
            public string CurrentPassword { get; set; } = string.Empty;
            public string NewPassword { get; set; } = string.Empty;
        }

        public class SignupStartRequest
        {
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class SignupCompleteRequest
        {
            public string Name { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string Code { get; set; } = string.Empty;
            public string ChallengeId { get; set; } = string.Empty;
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
                isActive = user.Status == UserStatus.Active,
                requiresSetup = (user.Role == UserRole.Auxiliary || user.Role == UserRole.Operator) && string.IsNullOrWhiteSpace(user.PasswordHash)
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

            // Check if staff (Auxiliary/Operator) has never logged in (no password set yet)
            if (string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                if (user.Role == UserRole.Auxiliary || user.Role == UserRole.Operator)
                {
                    return Ok(new
                    {
                        requiresSetup = true,
                        email = user.Email,
                        role = MapFrontendRole(user.Role),
                        message = "First-time login detected. Please set up your password."
                    });
                }
                
                // If it's a passenger with no password (shouldn't happen with signup, but for safety)
                return Unauthorized(new { error = "Account not fully configured. Please contact support." });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
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
                    isSetup = user.IsMfaEnabled,
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
                return BadRequest(new { error = "Operators must sign in with password and an Authenticator App." });
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

            string? pendingPasswordHash = null;
            bool isVerified = false;
            if (user.Role == UserRole.Operator)
            {
                if (!user.IsMfaEnabled || string.IsNullOrWhiteSpace(user.MfaSecret))
                {
                    return Unauthorized(new { error = "Authenticator App is not configured for this operator." });
                }

                isVerified = _totpService.VerifyCode(user.MfaSecret, request.Code.Trim());
            }
            else
            {
                if (string.IsNullOrWhiteSpace(request.ChallengeId))
                {
                    return BadRequest(new { error = "Challenge ID is required for OTP verification." });
                }
                var result = _challengeStore.VerifyAndConsume(request.ChallengeId, user.UserId, request.Code.Trim());
                isVerified = result.IsValid;
                pendingPasswordHash = result.Metadata;
            }

            if (!isVerified)
            {
                return Unauthorized(new { error = "Invalid or expired verification code." });
            }

            // If this was a setup-password flow (Auxiliary or first-time setup), update the password now
            if (!string.IsNullOrEmpty(pendingPasswordHash))
            {
                user.PasswordHash = pendingPasswordHash;
                user.Status = UserStatus.Active;
                _context.Users.Update(user); // Explicitly mark as updated
                await _context.SaveChangesAsync();
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

        [HttpGet("mfa/setup")]
        public async Task<IActionResult> MfaSetup([FromQuery] string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
            if (user == null) return NotFound(new { error = "User not found." });

            var secret = _totpService.GenerateSecret();
            var uri = _totpService.GetQrCodeUri(user.Email, secret);

            user.MfaSecret = secret;
            user.IsMfaEnabled = false; // Ensure it's not active yet
            await _context.SaveChangesAsync();

            return Ok(new MfaSetupResponse
            {
                Secret = secret,
                QrCodeUri = uri
            });
        }

        [HttpPost("mfa/activate")]
        public async Task<IActionResult> MfaActivate([FromBody] MfaActivateRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null) return NotFound(new { error = "User not found." });

            if (string.IsNullOrWhiteSpace(user.MfaSecret))
            {
                return BadRequest(new { error = "MFA setup has not been initiated." });
            }

            var isValid = _totpService.VerifyCode(user.MfaSecret, request.Code.Trim());
            if (!isValid)
            {
                return BadRequest(new { error = "Invalid verification code." });
            }

            // If this is the initial activation (Operator), update the password now
            if (!string.IsNullOrEmpty(request.ChallengeId))
            {
                var pendingPasswordHash = _challengeStore.GetMetadata(request.ChallengeId);
                if (!string.IsNullOrEmpty(pendingPasswordHash))
                {
                    user.PasswordHash = pendingPasswordHash;
                    user.Status = UserStatus.Active;
                    _context.Users.Update(user);
                }
            }

            user.IsMfaEnabled = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Authenticator App activated successfully." });
        }

        [HttpPost("setup-password")]
        public async Task<IActionResult> SetupPassword([FromBody] LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { error = "Email and password are required." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null) return NotFound(new { error = "User not found." });

            if (!string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                return BadRequest(new { error = "Password has already been set for this account." });
            }

            // Validate new password strength
            var missing = ValidatePasswordStrength(request.Password);
            if (missing.Any())
            {
                return BadRequest(new { error = $"Password must contain: {string.Join(", ", missing)}." });
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);
            var frontendRole = MapFrontendRole(user.Role);

            // Store hashed password in a challenge instead of DB
            var challenge = _challengeStore.Create(user.UserId, TimeSpan.FromMinutes(15), hashedPassword);

            // Operator: lead to MFA setup
            if (user.Role == UserRole.Operator)
            {
                return Ok(new
                {
                    requiresMfa = true,
                    mfaMethod = "google_authenticator",
                    isSetup = false,
                    challengeId = challenge.ChallengeId,
                    email = user.Email,
                    role = frontendRole
                });
            }

            // Auxiliary: lead to Email OTP
            return await StartEmailOtpForUser(user, frontendRole, challenge.ChallengeId, challenge.Code);
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null) return NotFound(new { error = "User not found." });

            // 1. Verify current password
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { error = "Incorrect current password." });
            }

            // 2. Validate new password strength
            var missing = ValidatePasswordStrength(request.NewPassword);

            if (missing.Any())
            {
                return BadRequest(new { error = $"Password must contain: {string.Join(", ", missing)}." });
            }

            // 3. Check password history
            // Cannot be the current password
            if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            {
                return BadRequest(new { error = "New password cannot be the same as your current password." });
            }

            // 4. Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password updated successfully." });
        }

        [HttpPost("signup/start")]
        public async Task<IActionResult> SignupStart([FromBody] SignupStartRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { error = "All fields are required." });
            }

            // Check if user exists
            var existing = await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (existing)
            {
                return BadRequest(new { error = "An account with this email already exists." });
            }

            // Validate password
            var missing = ValidatePasswordStrength(request.Password);
            if (missing.Any())
            {
                return BadRequest(new { error = $"Password must contain: {string.Join(", ", missing)}." });
            }

            // Create temporary challenge
            var challenge = _challengeStore.Create(request.Email, TimeSpan.FromMinutes(10));
            var sent = await _emailVerificationSender.SendLoginOtpAsync(request.Email, request.Name, challenge.Code);

            if (!sent)
            {
                return StatusCode(500, new { error = "Unable to send verification email." });
            }

            return Ok(new
            {
                challengeId = challenge.ChallengeId,
                expiresInSeconds = (int)(challenge.ExpiresAtUtc - DateTime.UtcNow).TotalSeconds,
                debugOtp = _environment.IsDevelopment() ? challenge.Code : null
            });
        }

        [HttpPost("signup/complete")]
        public async Task<IActionResult> SignupComplete([FromBody] SignupCompleteRequest request)
        {
            // 1. Verify OTP
            var result = _challengeStore.VerifyAndConsume(request.ChallengeId, request.Email, request.Code.Trim());
            if (!result.IsValid)
            {
                return Unauthorized(new { error = "Invalid or expired verification code." });
            }

            // 2. Final check for existing user (double safety)
            var existing = await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (existing)
            {
                return BadRequest(new { error = "Account already exists." });
            }

            // 3. Create User
            var user = new User
            {
                UserId = "USR-" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper(),
                UserName = request.Name,
                Email = request.Email.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = UserRole.Passenger, // Default role for signup
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // 4. Generate Token
            var token = GenerateJwtToken(user, "passenger");

            return Ok(new
            {
                userId = user.UserId,
                userName = user.UserName,
                email = user.Email,
                role = "passenger",
                token,
                description = "Passenger"
            });
        }

        private List<string> ValidatePasswordStrength(string password)
        {
            var missing = new List<string>();
            if (password.Length < 8) missing.Add("at least 8 characters");
            if (!password.Any(char.IsUpper)) missing.Add("one uppercase letter");
            if (!password.Any(char.IsLower)) missing.Add("one lowercase letter");
            if (!password.Any(char.IsDigit)) missing.Add("one number");
            if (!password.Any(ch => !char.IsLetterOrDigit(ch))) missing.Add("one special character");
            return missing;
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

        private async Task<IActionResult> StartEmailOtpForUser(User user, string frontendRole, string? challengeId = null, string? existingCode = null)
        {
            string finalChallengeId;
            string code;
            int expiresInSeconds;

            if (challengeId != null && existingCode != null)
            {
                finalChallengeId = challengeId;
                code = existingCode;
                expiresInSeconds = 900; // 15 mins for setup
            }
            else
            {
                var challenge = _challengeStore.Create(user.UserId, TimeSpan.FromMinutes(5));
                finalChallengeId = challenge.ChallengeId;
                code = challenge.Code;
                expiresInSeconds = (int)(challenge.ExpiresAtUtc - DateTime.UtcNow).TotalSeconds;
            }

            var sent = await _emailVerificationSender.SendLoginOtpAsync(user.Email, user.UserName, code);
            if (!sent && !_environment.IsDevelopment())
            {
                return StatusCode(500, new { error = "Unable to send verification code. Please try again." });
            }

            return Ok(new
            {
                requiresMfa = true,
                mfaMethod = "email_otp",
                challengeId = finalChallengeId,
                maskedDestination = MaskEmail(user.Email),
                expiresInSeconds = expiresInSeconds,
                debugOtp = _environment.IsDevelopment() ? code : null,
                email = user.Email,
                role = frontendRole
            });
        }
    }
}
