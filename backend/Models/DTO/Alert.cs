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

    public int Elapsed { get; set; }

    public decimal? Confidence { get; set; }
    public string? DeviceId { get; set; }
    public string? ImageUrl { get; set; }
}
}