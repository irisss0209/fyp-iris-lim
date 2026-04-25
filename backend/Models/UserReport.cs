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

        [Column("description")]
        public string? Description { get; set; }

        [Column("image_url")]
        [MaxLength(255)]
        public string? ImageUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("line_id")]
        [MaxLength(50)]
        public string? LineId { get; set; }

        [Column("station_id")]
        [MaxLength(50)]
        public string? StationId { get; set; }

        // Navigation
        [ForeignKey(nameof(UserId))]
        public User User { get; set; } = null!;

        [ForeignKey(nameof(CoachId))]
        public TrainCoach? TrainCoach { get; set; }

        [ForeignKey("LineId, StationId")]
        public LineStation? LineStation { get; set; }

        public Incident? Incident { get; set; }
    }
}
