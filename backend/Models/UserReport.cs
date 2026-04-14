using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("User_Report")]
    public class UserReport
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("report_id")]
        public int ReportId { get; set; }

        [Required]
        [Column("user_id")]
        [MaxLength(50)]
        public string UserId { get; set; } = null!;

        [Column("coach_id")]
        [MaxLength(50)]
        public string? CoachId { get; set; }

        [Required]
        [Column("violation_type")]
        [MaxLength(100)]
        public string ViolationType { get; set; } = null!;

        [Column("description")]
        public string? Description { get; set; }

        [Column("image_url")]
        [MaxLength(255)]
        public string? ImageUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;

        [ForeignKey(nameof(CoachId))]
        public TrainCoach? TrainCoach { get; set; }

        public Incident? Incident { get; set; }
    }
}
