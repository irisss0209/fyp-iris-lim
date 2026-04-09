using backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestDbController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestDbController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("ping")]
        public async Task<IActionResult> PingDatabase()
        {
            try
            {
                // Force an actual connection attempt to get the exact error exception
                await _context.Database.OpenConnectionAsync();
                
                return Ok(new { status = "Success", message = "Successfully connected to PostgreSQL database!" });
            }
            catch (Exception ex)
            {
                // If it fails, this will return the exact technical error message
                return StatusCode(500, new { status = "Error", error = ex.Message });
            }
        }
        [HttpPost("setup")]
        public async Task<IActionResult> SetupDatabase()
        {
            try
            {
                await _context.Database.EnsureDeletedAsync();
                await _context.Database.EnsureCreatedAsync();
                return Ok(new { message = "Database schema rebuilt using EF Core Successfully! You can now seed the users." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }
    }
}
