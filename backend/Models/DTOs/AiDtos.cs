namespace backend.Models.DTOs;

public class TravelAdviceRequest
{
    public int ActiveCount { get; set; }
    public string TrainToAvoid { get; set; } = "";
    public string BestWindow { get; set; } = "";
    public string Line { get; set; } = "";
    public int TodayCount { get; set; }
    public int CurrentHour { get; set; }
}

public class ReportSummaryRequest
{
    public int Total { get; set; }
    public int TotalDelta { get; set; }
    public int ResolutionRate { get; set; }
    public double FalseAlarmRate { get; set; }
    public double AvgResponseMinutes { get; set; }
    public string MostAffectedLine { get; set; } = "";
    public string HighestRiskTrain { get; set; } = "";
    public string PeakTime { get; set; } = "";
    public string Month { get; set; } = "";
}
