using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace backend.Models
{
[Table("Camera")]
public class Camera
{
    [Key]
    [Column("camera_id")]
    public string CameraId { get; set; } = null!;

    [Column("train_id")]
    public int TrainId { get; set; }

    [Column("coach_id")]
    public int CoachId { get; set; }

    [Column("stream_url")]
    public string? StreamUrl { get; set; }

    [Column("status")]
    public CameraStatus Status { get; set; } = CameraStatus.Active;

    public TrainCoach TrainCoach { get; set; } = null!;

    public ICollection<Detection> Detections { get; set; } = [];
}
}