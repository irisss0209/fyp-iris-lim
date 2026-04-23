using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        [Column("user_id")]
        [MaxLength(50)]
        public string UserId { get; set; } = null!;

        [Column("employee_id")]
        [MaxLength(50)]
        public string? EmployeeId { get; set; }

        [Required]
        [Column("user_name")]
        [MaxLength(100)]
        public string UserName { get; set; } = null!;

        [Required]
        [Column("email")]
        [MaxLength(255)]
        public string Email { get; set; } = null!;

        [Required]
        [Column("password_hash")]
        public string PasswordHash { get; set; } = null!;

        [Column("previous_password_hash")]
        public string? PreviousPasswordHash { get; set; }

        [Required]
        [Column("role")]
        public UserRole Role { get; set; }

        [Column("status")]
        public UserStatus Status { get; set; } = UserStatus.Active;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("MfaSecret")]
        [MaxLength(255)]
        public string? MfaSecret { get; set; }

        [Column("MfaEnabled")]
        public bool IsMfaEnabled { get; set; } = false;

        // Navigation
        public ICollection<UserReport> UserReports { get; set; } = [];
    }
}
