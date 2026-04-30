using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Detection")]
    public class Detection
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("detection_id")]
        public int DetectionId { get; set; }

        [Required]
        [Column("camera_id")]
        [MaxLength(50)]
        public string CameraId { get; set; } = null!;

        [Required]
        [Column("confidence_score")]
        public decimal ConfidenceScore { get; set; }

        [Required]
        [Column("image_url")]
        [MaxLength(255)]
        public string ImageUrl { get; set; } = null!;

        [Column("detected_at")]
        public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

        [Required]
        [Column("line_id")]
        [MaxLength(50)]
        public string LineId { get; set; } = null!;

        [Required]
        [Column("station_id")]
        [MaxLength(50)]
        public string StationId { get; set; } = null!;

        // Navigation
        [ForeignKey(nameof(CameraId))]
        public Camera? Camera { get; set; }

        [ForeignKey("LineId, StationId")]
        public LineStation? LineStation { get; set; }

        public Incident? Incident { get; set; }
    }
}
