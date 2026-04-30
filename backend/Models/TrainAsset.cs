using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Train_Asset")]
    public class TrainAsset
    {
        [Key]
        [Column("train_id")]
        public int TrainId { get; set; } = null!;

        [Required]
        [Column("line_id")]
        [MaxLength(50)]
        public string LineId { get; set; } = null!;

        // 'Active' | 'Inactive' | 'Maintenance'
        [Required]
        [Column("status")]
        public AssetStatus Status { get; set; } = AssetStatus.Active;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey(nameof(LineId))]
        public TrainLine TrainLine { get; set; } = null!;

        public ICollection<TrainCoach> TrainCoaches { get; set; } = [];
    }
}
