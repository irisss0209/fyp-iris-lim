using Microsoft.EntityFrameworkCore.Migrations;
using backend.Models;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSoundAlertEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:asset_status", "Active,Inactive,Maintenance")
                .Annotation("Npgsql:Enum:camera_status", "Active,Faulty,Inactive")
                .Annotation("Npgsql:Enum:coach_type", "Mixed,Womens_Only")
                .Annotation("Npgsql:Enum:incident_source", "AI_DETECTION,USER_REPORT")
                .Annotation("Npgsql:Enum:incident_status", "Dismissed,En_Route,Escalated,Pending,Resolved,Verified")
                .Annotation("Npgsql:Enum:sound_alert_mode", "off,on,peak")
                .Annotation("Npgsql:Enum:user_role", "Auxiliary,Operator,Passenger")
                .Annotation("Npgsql:Enum:user_status", "Active,Archived,Suspended")
                .OldAnnotation("Npgsql:Enum:asset_status", "Active,Inactive,Maintenance")
                .OldAnnotation("Npgsql:Enum:camera_status", "Active,Faulty,Inactive")
                .OldAnnotation("Npgsql:Enum:coach_type", "Mixed,Womens_Only")
                .OldAnnotation("Npgsql:Enum:incident_source", "AI_DETECTION,USER_REPORT")
                .OldAnnotation("Npgsql:Enum:incident_status", "Dismissed,En_Route,Escalated,Pending,Resolved,Verified")
                .OldAnnotation("Npgsql:Enum:user_role", "Auxiliary,Operator,Passenger")
                .OldAnnotation("Npgsql:Enum:user_status", "Active,Archived,Suspended");

             migrationBuilder.Sql(@"
        ALTER TABLE ""NotificationPreferences""
        ALTER COLUMN sound_alerts TYPE sound_alert_mode
        USING sound_alerts::text::sound_alert_mode;
    ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.Sql(@"
        ALTER TABLE ""NotificationPreferences""
        ALTER COLUMN sound_alerts TYPE varchar(20)
        USING sound_alerts::text;
    ");
}
    }
}
