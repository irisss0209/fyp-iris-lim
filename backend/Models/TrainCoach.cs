using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace backend.Models
{
[Table("Train_Coach")]
public class TrainCoach
{
    [Column("train_id")]
    public int TrainId { get; set; }

    [Column("coach_id")]
    public int? CoachId { get; set; }

    [Required]
    [Column("coach_type")]
    public CoachType CoachType { get; set; } = CoachType.Womens_Only;

    public TrainAsset TrainAsset { get; set; } = null!;

    public ICollection<Camera> Cameras { get; set; } = [];
    public ICollection<UserReport> UserReports { get; set; } = [];
}
}