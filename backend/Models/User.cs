using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Users")]
    public class User
    {
        [Key]
        [Column("user_id")]
        [MaxLength(20)]
        public string UserId { get; set; } = null!;

        [Column("employee_id")]
        [MaxLength(20)]
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
        [Column("cognito_sub")]
        [MaxLength(255)]
        public string CognitoSub { get; set; } = null!;

        // 'Customer' | 'Operator' | 'Auxiliary'
        [Required]
        [Column("role")]
        [MaxLength(20)]
        public string Role { get; set; } = null!;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<UserReport> UserReports { get; set; } = [];
    }
}
