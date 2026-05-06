namespace backend.Models.DTOs
{
    public class AlertDTO
{
    public string Id { get; set; } = null!;

    public int? TrainId { get; set; }
    public int? CoachId { get; set; }

    public string Line { get; set; } = null!;
    public string LineId { get; set; } = null!;
    public string Station { get; set; } = null!;

    public string Status { get; set; } = null!;
    public string Source { get; set; } = null!;

    public string Time { get; set; } = null!;
    public string Date { get; set; } = null!;
    public string Datetime { get; set; } = null!;

    public int Elapsed { get; set; }

    public decimal? Confidence { get; set; }
    public string? DeviceId { get; set; }
    public string? ImageUrl { get; set; }

    // Reporter
    public string? ReportedBy { get; set; }
    public string? PassengerComment { get; set; }

    // Status timeline
    public string? VerifiedBy { get; set; }
    public string? VerifiedAt { get; set; }
    public string? VerifiedComment { get; set; }

    public string? EnrouteBy { get; set; }
    public string? EnrouteAt { get; set; }
    public string? EnrouteComment { get; set; }

    public string? ResolvedBy { get; set; }
    public string? ResolvedAt { get; set; }
    public string? ResolvedComment { get; set; }

    public string? EscalatedBy { get; set; }
    public string? EscalatedAt { get; set; }
    public string? EscalatedComment { get; set; }

    public string? DismissedBy { get; set; }
    public string? DismissedAt { get; set; }
    public string? DismissedComment { get; set; }
}
}