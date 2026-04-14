using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Train_Coach")]
    public class TrainCoach
    {
        [Key]
        [Column("coach_id")]
        [MaxLength(50)]
        public string CoachId { get; set; } = null!;

        [Required]
        [Column("train_id")]
        [MaxLength(50)]
        public string TrainId { get; set; } = null!;

        // 'Womens_Only' | 'Mixed'
        [Required]
        [Column("coach_type")]
        public CoachType CoachType { get; set; } = CoachType.Womens_Only;

        // Navigation
        [ForeignKey(nameof(TrainId))]
        public TrainAsset TrainAsset { get; set; } = null!;

        public ICollection<Camera> Cameras { get; set; } = [];
        public ICollection<UserReport> UserReports { get; set; } = [];
    }
}
