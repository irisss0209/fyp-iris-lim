namespace backend.Models.DTOs
{
    public class NearbyIncidentDto
    {
        public string Id { get; set; } = null!;
        public string Line { get; set; } = null!;
        public string Station { get; set; } = null!;
        public int? TrainId { get; set; }
        public int? CoachId { get; set; }
        public string Type { get; set; } = null!;
        public string Time { get; set; } = null!;
        public string Date { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? ImageUrl { get; set; }
    }

    public class IncidentHistoryItemDto
    {
        public string Id { get; set; } = null!;
        public int IncidentId { get; set; }
        public string Type { get; set; } = null!;
        public string Date { get; set; } = null!;
        public string Time { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string Line { get; set; } = null!;
        public string Coach { get; set; } = null!;
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }

        public string? VerifiedBy { get; set; }
        public string? VerifiedAt { get; set; }
        public string? VerifiedComment { get; set; }
        public string? EscalatedBy { get; set; }
        public string? EscalatedAt { get; set; }
        public string? EscalatedComment { get; set; }
        public string? EnrouteBy { get; set; }
        public string? EnrouteAt { get; set; }
        public string? ResolvedBy { get; set; }
        public string? ResolvedAt { get; set; }
        public string? ResolvedComment { get; set; }
        public string? DismissedBy { get; set; }
        public string? DismissedAt { get; set; }
        public string? DismissedComment { get; set; }
    }

    public class ReportSubmitResponseDto
    {
        public bool Success { get; set; }
        public int ReportId { get; set; }
    }

    public class ImageUploadResponseDto
    {
        public string ImageUrl { get; set; } = null!;
    }
}
