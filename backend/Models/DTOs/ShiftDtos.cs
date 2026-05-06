namespace backend.Models.DTOs
{
    public class AuxiliaryShiftDto
    {
        public bool Active { get; set; }
        public bool OnDuty { get; set; }
        public int? ShiftId { get; set; }
        public string? Station { get; set; }
        public string? StationId { get; set; }
        public string? ShiftStart { get; set; }
        public string? ShiftEnd { get; set; }
        public string? ShiftDate { get; set; }
    }

    public class OperatorShiftListItemDto
    {
        public int ShiftId { get; set; }
        public string UserId { get; set; } = null!;
        public string UserName { get; set; } = null!;
        public string StationId { get; set; } = null!;
        public string StationName { get; set; } = null!;
        public string LineName { get; set; } = null!;
        public DateTime ShiftDate { get; set; }
        public string StartTime { get; set; } = null!;
        public string EndTime { get; set; } = null!;
    }
}
