using backend.Models;
using backend.Models.DTOs;

namespace backend.Services
{
    public interface IAlertService
    {
        AlertDTO MapToAlertDTO(Incident i, DateTime now);
    }
    public class AlertService : IAlertService
    {
        public AlertDTO MapToAlertDTO(Incident i, DateTime now)
        {
            int? trainId = null;
            int? coachId = null;
            string? lineName = null;
            string? lineId = null;
            string? stationName = null;
            string source;
            decimal? confidence = null;
            string? deviceId = null;
            string? imageUrl = null;
            if (i.Source == IncidentSource.AI_DETECTION && i.Detection != null)
            {
                source = "ai";

                coachId = i.Detection.Camera?.CoachId;
                trainId = i.Detection.Camera?.TrainCoach?.TrainId ?? i.Detection.Camera?.TrainId;

                lineName = i.Detection.LineStation?.TrainLine?.LineName
                           ?? i.Detection.Camera?.TrainCoach?.TrainAsset?.TrainLine?.LineName;

                lineId = i.Detection.LineId
                         ?? i.Detection.Camera?.TrainCoach?.TrainAsset?.TrainLine?.LineId;

                stationName = i.Detection.LineStation?.Station?.StationName;
                confidence = i.Detection.ConfidenceScore;
                deviceId = i.Detection.CameraId;
                imageUrl = i.Detection.ImageUrl;
            }
            else if (i.UserReport != null)
            {
                source = "passenger";

                coachId = i.UserReport.CoachId;
                trainId = i.UserReport.TrainCoach?.TrainId ?? i.UserReport.TrainId;

                lineName = i.UserReport.LineStation?.TrainLine?.LineName
                           ?? i.UserReport.TrainCoach?.TrainAsset?.TrainLine?.LineName;

                lineId = i.UserReport.LineId
                         ?? i.UserReport.TrainCoach?.TrainAsset?.TrainLine?.LineId;
                imageUrl = i.UserReport.ImageUrl;
                stationName = i.UserReport.LineStation?.Station?.StationName;
            }
            else
            {
                source = "unknown";
            }

            return new AlertDTO
            {
                Id = (i.Source == IncidentSource.AI_DETECTION ? "ALT-" : "RPT-") + i.IncidentId.ToString("D3"),

                TrainId = trainId,
                CoachId = coachId,

                Line = lineName ?? "Unknown",
                LineId = lineId ?? "",
                Station = stationName ?? "Unknown",

                Status = i.Status.ToString().ToLower(),
                Source = source,

                Time = i.CreatedAt.ToString("HH:mm"),
                Date = i.CreatedAt.ToString("yyyy-MM-dd"),

                Elapsed = Math.Max(1, (int)(now - i.CreatedAt).TotalMinutes),
                Confidence = confidence,
                DeviceId = deviceId,
                ImageUrl = imageUrl
            };
        }
    }
}