using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Station")]
    public class Station
    {
        [Key]
        [Column("station_id")]
        [MaxLength(50)]
        public string StationId { get; set; } = null!;

        [Required]
        [Column("station_name")]
        [MaxLength(150)]
        public string StationName { get; set; } = null!;
        [Column("latitude")]
        public double? Latitude { get; set; }
        [Column("longitude")]
        public double? Longitude { get; set; }
        // Navigation
        public ICollection<LineStation> LineStations { get; set; } = [];
    }
}
