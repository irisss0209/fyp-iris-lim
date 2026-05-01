using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("PushSubscriptions")]
    public class PushSubscription
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("user_id")]
        [MaxLength(50)]
        public string UserId { get; set; } = null!;

        [Required]
        [Column("endpoint")]
        public string Endpoint { get; set; } = null!;

        [Required]
        [Column("p256dh")]
        [MaxLength(512)]
        public string P256DH { get; set; } = null!;

        [Required]
        [Column("auth")]
        [MaxLength(256)]
        public string Auth { get; set; } = null!;

        // For passenger proximity checks
        [Column("latitude")]
        public double? Latitude { get; set; }

        [Column("longitude")]
        public double? Longitude { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
    }
}
