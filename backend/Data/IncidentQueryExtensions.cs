using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public static class IncidentQueryExtensions
    {

        public static IQueryable<Incident> WithFullNavigations(this IQueryable<Incident> query) =>
            query
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.Camera)
                        .ThenInclude(c => c!.TrainCoach)
                            .ThenInclude(tc => tc!.TrainAsset)
                                .ThenInclude(ta => ta!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.Detection)
                    .ThenInclude(d => d!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.TrainCoach)
                        .ThenInclude(tc => tc!.TrainAsset)
                            .ThenInclude(ta => ta!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.TrainLine)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.LineStation)
                        .ThenInclude(ls => ls!.Station)
                .Include(i => i.UserReport)
                    .ThenInclude(r => r!.User);

        // Audit-trail user refs: who verified / escalated / en-routed / resolved / dismissed
        public static IQueryable<Incident> WithStatusUsers(this IQueryable<Incident> query) =>
            query
                .Include(i => i.VerifiedByUser)
                .Include(i => i.EscalatedByUser)
                .Include(i => i.EnrouteByUser)
                .Include(i => i.ResolvedByUser)
                .Include(i => i.DismissedByUser);
    }
}
