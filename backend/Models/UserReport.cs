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

    [Column("train_id")]
    public int TrainId { get; set; }

    [Column("coach_id")]
    public int CoachId { get; set; }

    [Required]
    [Column("description")]
    public string Description { get; set; } = null!;

    [Column("image_url")]
    [MaxLength(255)]
    public string? ImageUrl { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("line_id")]
    [MaxLength(50)]
    public string LineId { get; set; } = null!;

    [Required]
    [Column("station_id")]
    [MaxLength(50)]
    public string StationId { get; set; } = null!;

    public User User { get; set; } = null!;

    public TrainCoach? TrainCoach { get; set; }

    public LineStation? LineStation { get; set; }

    public Incident? Incident { get; set; }
}
}
