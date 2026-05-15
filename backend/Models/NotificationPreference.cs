using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("NotificationPreferences")]
    public class NotificationPreference
    {
        [Key]
        [Column("user_id")]
        [MaxLength(50)]
        public string UserId { get; set; } = null!;

        [Column("sound_alerts")]
        public SoundAlertMode SoundAlerts { get; set; } = SoundAlertMode.On;

        [Column("time_format")]
        [MaxLength(5)]
        public string TimeFormat { get; set; } = "24h";

        public User User { get; set; } = null!;
    }
}
