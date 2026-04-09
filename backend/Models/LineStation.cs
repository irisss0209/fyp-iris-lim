using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Line_Station")]
    public class LineStation
    {
        [Column("line_id")]
        [MaxLength(20)]
        public string LineId { get; set; } = null!;

        [Column("station_id")]
        [MaxLength(20)]
        public string StationId { get; set; } = null!;

        [Column("sequence_order")]
        public int SequenceOrder { get; set; }

        // Navigation
        [ForeignKey(nameof(LineId))]
        public TrainLine TrainLine { get; set; } = null!;

        [ForeignKey(nameof(StationId))]
        public Station Station { get; set; } = null!;
    }
}
