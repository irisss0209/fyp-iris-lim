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
        [Column("shift_date")]
        public DateTime ShiftDate { get; set; }

        [Required]
        [Column("start_time")]
        public TimeSpan StartTime { get; set; }

        [Required]
        [Column("end_time")]
        public TimeSpan EndTime { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [ForeignKey("StationId")]
        public Station Station { get; set; } = null!;
    }
}