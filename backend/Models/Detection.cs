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

        [Column("camera_id")]
        [MaxLength(20)]
        public string? CameraId { get; set; }

        [Column("confidence_score")]
        public decimal? ConfidenceScore { get; set; }

        [Column("image_url")]
        [MaxLength(255)]
        public string? ImageUrl { get; set; }

        [Column("detected_at")]
        public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey(nameof(CameraId))]
        public Camera? Camera { get; set; }

        public Incident? Incident { get; set; }
    }
}
