namespace backend.Models.DTOs
{
    public class TrainLineDto
    {
        public string LineId { get; set; } = null!;
        public string LineName { get; set; } = null!;
        public List<int?> Coaches { get; set; } = new();
        public List<int> Trains { get; set; } = new();
    }

    public class StationDto
    {
        public string StationId { get; set; } = null!;
        public string StationName { get; set; } = null!;
    }
}
