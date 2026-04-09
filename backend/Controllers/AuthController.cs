using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
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

            // Find the user in the database
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                return Unauthorized(new { error = "Invalid email or password. Please try again." });
            }

            // Map Database roles to Frontend roles
            string frontendRole = user.Role switch
            {
                "Operator" => "command",
                "Auxiliary" => "police",
                "Customer" => "saferide",
                _ => "saferide" // Default fallback
            };

            // Return user details + mock OTP for the MFA step without breaking the UI flow
            return Ok(new
            {
                email = user.Email,
                role = frontendRole,
                otp = "123456",
                description = user.Role
            });
        }

        [HttpPost("seed")]
        public async Task<IActionResult> SeedDummyUsers()
        {
            if (await _context.Users.AnyAsync())
            {
                return Ok(new { message = "Database already contains users. Skipping seed." });
            }

            var dummyUsers = new List<User>
            {
                new User
                {
                    UserId = "USR-OP-001",
                    UserName = "Technical Operator",
                    Email = "operator@railly.my",
                    CognitoSub = "mock-opt-cognito-id",
                    Role = "Operator",
                    CreatedAt = DateTime.UtcNow
                },
                new User
                {
                    UserId = "USR-PO-001",
                    UserName = "Auxiliary Police",
                    Email = "police@railly.my",
                    CognitoSub = "mock-pol-cognito-id",
                    Role = "Auxiliary",
                    CreatedAt = DateTime.UtcNow
                },
                new User
                {
                    UserId = "USR-CU-001",
                    UserName = "Public User",
                    Email = "user@railly.my",
                    CognitoSub = "mock-usr-cognito-id",
                    Role = "Customer",
                    CreatedAt = DateTime.UtcNow
                }
            };

            _context.Users.AddRange(dummyUsers);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Successfully seeded dummy users." });
        }
    }
}
