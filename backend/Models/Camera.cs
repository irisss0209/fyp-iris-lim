using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Camera")]
    public class Camera
    {
        [Key]
        [Column("camera_id")]
        [MaxLength(50)]
        public string CameraId { get; set; } = null!;

        [Required]
        [Column("coach_id")]
        [MaxLength(50)]
        public string CoachId { get; set; } = null!;

        [Column("stream_url")]
        [MaxLength(255)]
        public string? StreamUrl { get; set; }

        // 'Active' | 'Inactive' | 'Faulty'
        [Required]
        [Column("status")]
        public CameraStatus Status { get; set; } = CameraStatus.Active;

        // Navigation
        [ForeignKey(nameof(CoachId))]
        public TrainCoach TrainCoach { get; set; } = null!;

        public ICollection<Detection> Detections { get; set; } = [];
    }
}
