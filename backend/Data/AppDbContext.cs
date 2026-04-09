using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // ── DbSets ──────────────────────────────────────────────────────────────
        public DbSet<User>        Users        => Set<User>();
        public DbSet<TrainLine>   TrainLines   => Set<TrainLine>();
        public DbSet<Station>     Stations     => Set<Station>();
        public DbSet<LineStation> LineStations => Set<LineStation>();
        public DbSet<TrainAsset>  TrainAssets  => Set<TrainAsset>();
        public DbSet<TrainCoach>  TrainCoaches => Set<TrainCoach>();
        public DbSet<Camera>      Cameras      => Set<Camera>();
        public DbSet<Detection>   Detections   => Set<Detection>();
        public DbSet<UserReport>  UserReports  => Set<UserReport>();
        public DbSet<Incident>    Incidents    => Set<Incident>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ── Line_Station: composite primary key ──────────────────────────────
            modelBuilder.Entity<LineStation>()
                .HasKey(ls => new { ls.LineId, ls.StationId });

            // ── Incident: multiple FKs to User need explicit relationship names ──
            modelBuilder.Entity<Incident>()
                .HasOne(i => i.VerifiedByUser)
                .WithMany()
                .HasForeignKey(i => i.VerifiedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Incident>()
                .HasOne(i => i.EscalatedByUser)
                .WithMany()
                .HasForeignKey(i => i.EscalatedBy)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Incident>()
                .HasOne(i => i.EnrouteByUser)
                .WithMany()
                .HasForeignKey(i => i.EnrouteBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Incident>()
                .HasOne(i => i.ResolvedByUser)
                .WithMany()
                .HasForeignKey(i => i.ResolvedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Incident>()
                .HasOne(i => i.DismissedByUser)
                .WithMany()
                .HasForeignKey(i => i.DismissedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Incident: one-to-one with Detection / UserReport ─────────────────
            modelBuilder.Entity<Incident>()
                .HasOne(i => i.Detection)
                .WithOne(d => d.Incident)
                .HasForeignKey<Incident>(i => i.DetectionId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Incident>()
                .HasOne(i => i.UserReport)
                .WithOne(r => r.Incident)
                .HasForeignKey<Incident>(i => i.ReportId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── CHECK constraints (PostgreSQL) ───────────────────────────────────
            modelBuilder.Entity<User>()
                .ToTable(t => t.HasCheckConstraint("chk_user_role",
                    "role IN ('Customer', 'Operator', 'Auxiliary')"));

            modelBuilder.Entity<TrainAsset>()
                .ToTable(t => t.HasCheckConstraint("chk_asset_status",
                    "status IN ('Active', 'Inactive', 'Maintenance')"));

            modelBuilder.Entity<TrainCoach>()
                .ToTable(t => t.HasCheckConstraint("chk_coach_type",
                    "coach_type IN ('Womens_Only', 'Mixed')"));

            modelBuilder.Entity<Camera>()
                .ToTable(t => t.HasCheckConstraint("chk_camera_status",
                    "status IN ('Active', 'Inactive', 'Faulty')"));

            modelBuilder.Entity<Incident>()
                .ToTable(t =>
                {
                    t.HasCheckConstraint("chk_incident_source",
                        "source IN ('AI_DETECTION', 'USER_REPORT')");
                    t.HasCheckConstraint("chk_incident_has_source",
                        "detection_id IS NOT NULL OR report_id IS NOT NULL");
                    t.HasCheckConstraint("chk_incident_status",
                        "status IN ('Pending', 'Verified', 'En_Route', 'Escalated', 'Resolved', 'Dismissed')");
                });
        }
    }
}
