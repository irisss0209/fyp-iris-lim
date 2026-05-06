using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("Incident")]
    public class Incident
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("incident_id")]
        public int IncidentId { get; set; }

        // 'AI_DETECTION' | 'USER_REPORT'
        [Required]
        [Column("source")]
        public IncidentSource Source { get; set; }

        [Column("detection_id")]
        public int? DetectionId { get; set; }

        [Column("report_id")]
        public int? ReportId { get; set; }

        // 'Pending' | 'Verified' | 'En_Route' | 'Escalated' | 'Resolved' | 'Dismissed'
        [Column("status")]
        public IncidentStatus Status { get; set; } = IncidentStatus.Pending;

        // --- Who handled each step ---
        [Column("verified_by")]
        [MaxLength(50)]
        public string? VerifiedBy { get; set; }

        [Column("escalated_by")]
        [MaxLength(50)]
        public string? EscalatedBy { get; set; }

        [Column("enroute_by")]
        [MaxLength(50)]
        public string? EnrouteBy { get; set; }

        [Column("resolved_by")]
        [MaxLength(50)]
        public string? ResolvedBy { get; set; }

        [Column("dismissed_by")]
        [MaxLength(50)]
        public string? DismissedBy { get; set; }

        // --- When each transition happened ---
        [Column("verified_at")]
        public DateTime? VerifiedAt { get; set; }

        [Column("escalated_at")]          // fixed: was duplicate 'escalated_by' in schema
        public DateTime? EscalatedAt { get; set; }

        [Column("enroute_at")]
        public DateTime? EnrouteAt { get; set; }

        [Column("enroute_comment")]
        public string? EnrouteComment { get; set; }

        [Column("resolved_at")]
        public DateTime? ResolvedAt { get; set; }

        [Column("dismissed_at")]
        public DateTime? DismissedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        [Column("verified_comment")]
        public string? VerifiedComment { get; set; }

        [Column("escalated_comment")]
        public string? EscalatedComment { get; set; }

        [Column("resolved_comment")]
        public string? ResolvedComment { get; set; }

        [Column("dismissed_comment")]
        public string? DismissedComment { get; set; }
        // --- Navigation ---
        [ForeignKey(nameof(DetectionId))]
        public Detection? Detection { get; set; }

        [ForeignKey(nameof(ReportId))]
        public UserReport? UserReport { get; set; }

        [ForeignKey(nameof(VerifiedBy))]
        public User? VerifiedByUser { get; set; }

        [ForeignKey(nameof(EscalatedBy))]
        public User? EscalatedByUser { get; set; }

        [ForeignKey(nameof(EnrouteBy))]
        public User? EnrouteByUser { get; set; }

        [ForeignKey(nameof(ResolvedBy))]
        public User? ResolvedByUser { get; set; }

        [ForeignKey(nameof(DismissedBy))]
        public User? DismissedByUser { get; set; }
    }
}
