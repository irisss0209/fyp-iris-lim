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
        private readonly IS3Service _s3Service;
        private readonly ILogger<AlertService> _logger;

        public AlertService(IS3Service s3Service, ILogger<AlertService> logger)
        {
            _s3Service = s3Service;
            _logger = logger;
        }

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

            // --- IMAGE URL PRESIGNING ---
            if (!string.IsNullOrEmpty(imageUrl) && imageUrl.Contains(".amazonaws.com/"))
            {
                try
                {
                    if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
                    {
                        var key = uri.AbsolutePath.TrimStart('/');
                        
                        // Handle cases where the bucket name might be in the path (path-style URLs)
                        if (key.StartsWith("railly/"))
                        {
                            key = key.Substring("railly/".Length);
                        }

                        var presignedUrl = _s3Service.GeneratePresignedUrl(key, 60);
                        _logger.LogDebug("Presigned URL generated for key: {Key}", key);
                        imageUrl = presignedUrl;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to presign URL for image");
                }
            }

            const string isoFmt = "yyyy-MM-ddTHH:mm:ss";
            
            // Apply +8h offset for display (Malaysia/Singapore time)
            var localTime = i.CreatedAt.AddHours(8);

            static string? LocalFmt(DateTime? dt) =>
                dt.HasValue ? dt.Value.AddHours(8).ToString("yyyy-MM-dd HH:mm") : null;

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

                Time = localTime.ToString("HH:mm"),
                Date = localTime.ToString("yyyy-MM-dd"),
                Datetime = i.CreatedAt.ToString(isoFmt) + "Z",

                Elapsed = Math.Max(1, (int)(now - i.CreatedAt).TotalMinutes),
                Confidence = confidence,
                DeviceId = deviceId,
                ImageUrl = imageUrl,

                ReportedBy = i.UserReport?.User?.UserName,
                PassengerComment = i.UserReport?.Description,

                VerifiedBy = i.VerifiedByUser?.UserName ?? i.VerifiedBy,
                VerifiedAt = LocalFmt(i.VerifiedAt),
                VerifiedComment = i.VerifiedComment,

                EnrouteBy = i.EnrouteByUser?.UserName ?? i.EnrouteBy,
                EnrouteAt = LocalFmt(i.EnrouteAt),

                ResolvedBy = i.ResolvedByUser?.UserName ?? i.ResolvedBy,
                ResolvedAt = LocalFmt(i.ResolvedAt),
                ResolvedComment = i.ResolvedComment,

                EscalatedBy = i.EscalatedByUser?.UserName ?? i.EscalatedBy,
                EscalatedAt = LocalFmt(i.EscalatedAt),
                EscalatedComment = i.EscalatedComment,

                DismissedBy = i.DismissedByUser?.UserName ?? i.DismissedBy,
                DismissedAt = LocalFmt(i.DismissedAt),
                DismissedComment = i.DismissedComment,
            };
        }
    }
}