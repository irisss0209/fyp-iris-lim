using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Train_Coach")]
    public class TrainCoach
    {
        [Key]
        [Column("coach_id")]
        [MaxLength(20)]
        public string CoachId { get; set; } = null!;

        [Required]
        [Column("train_id")]
        [MaxLength(20)]
        public string TrainId { get; set; } = null!;

        // 'Womens_Only' | 'Mixed'
        [Required]
        [Column("coach_type")]
        [MaxLength(20)]
        public string CoachType { get; set; } = "Womens_Only";

        // Navigation
        [ForeignKey(nameof(TrainId))]
        public TrainAsset TrainAsset { get; set; } = null!;

        public ICollection<Camera> Cameras { get; set; } = [];
        public ICollection<UserReport> UserReports { get; set; } = [];
    }
}
