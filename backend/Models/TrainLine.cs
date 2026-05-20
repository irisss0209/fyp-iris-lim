using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Train_Line")]
    public class TrainLine
    {
        [Key]
        [Column("line_id")]
        [MaxLength(50)]
        public string LineId { get; set; } = null!;

        [Required]
        [Column("line_name")]
        [MaxLength(100)]
        public string LineName { get; set; } = null!;

        public ICollection<LineStation> LineStations { get; set; } = [];
        public ICollection<TrainAsset> TrainAssets { get; set; } = [];
    }
}
