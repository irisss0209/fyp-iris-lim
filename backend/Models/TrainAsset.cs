using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Train_Asset")]
    public class TrainAsset
    {
        [Key]
        [Column("train_id")]
        public int TrainId { get; set; }

        [Required]
        [Column("line_id")]
        [MaxLength(50)]
        public string LineId { get; set; } = null!;

        // Navigation
        [ForeignKey("LineId")]
        public TrainLine? TrainLine { get; set; }

        public ICollection<TrainCoach> TrainCoaches { get; set; } = [];
    }
}
