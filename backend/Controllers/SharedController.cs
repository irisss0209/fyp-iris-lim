namespace backend.Models.DTOs
{
    public class UpdateStatusRequest
    {
        public string Status { get; set; } = null!;
        public string? Comment { get; set; }
    }
}