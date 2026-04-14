using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Auxiliary_Shift")]
    public class AuxiliaryShift
    {
        [Key]
        [Column("shift_id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int ShiftId { get; set; }

        [Required]
        [Column("user_id")]
        [MaxLength(50)]
        public string UserId { get; set; } = null!;

        [Required]
        [Column("station_id")]
        [MaxLength(50)]
        public string StationId { get; set; } = null!;

        [Required]
        [Column("shift_start")]
        public DateTime ShiftStart { get; set; }

        [Required]
        [Column("shift_end")]
        public DateTime ShiftEnd { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [ForeignKey("StationId")]
        public Station Station { get; set; } = null!;
    }
}
