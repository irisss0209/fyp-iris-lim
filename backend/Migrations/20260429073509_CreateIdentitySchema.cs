using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using backend.Models;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class CreateIdentitySchema : Migration
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
                .Annotation("Npgsql:Enum:user_role", "Auxiliary,Operator,Passenger")
                .Annotation("Npgsql:Enum:user_status", "Active,Archived,Suspended");

            migrationBuilder.CreateTable(
                name: "Station",
                columns: table => new
                {
                    station_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    station_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Station", x => x.station_id);
                });

            migrationBuilder.CreateTable(
                name: "Train_Line",
                columns: table => new
                {
                    line_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    line_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Train_Line", x => x.line_id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    employee_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    user_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    role = table.Column<UserRole>(type: "user_role", nullable: false),
                    status = table.Column<UserStatus>(type: "user_status", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    MfaSecret = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    MfaEnabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "Line_Station",
                columns: table => new
                {
                    line_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    station_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    sequence_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Line_Station", x => new { x.line_id, x.station_id });
                    table.ForeignKey(
                        name: "FK_Line_Station_Station_station_id",
                        column: x => x.station_id,
                        principalTable: "Station",
                        principalColumn: "station_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Line_Station_Train_Line_line_id",
                        column: x => x.line_id,
                        principalTable: "Train_Line",
                        principalColumn: "line_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Train_Asset",
                columns: table => new
                {
                    train_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    line_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Train_Asset", x => x.train_id);
                    table.ForeignKey(
                        name: "FK_Train_Asset_Train_Line_line_id",
                        column: x => x.line_id,
                        principalTable: "Train_Line",
                        principalColumn: "line_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Auxiliary_Shift",
                columns: table => new
                {
                    shift_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    station_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    shift_date = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    start_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    end_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Auxiliary_Shift", x => x.shift_id);
                    table.ForeignKey(
                        name: "FK_Auxiliary_Shift_Station_station_id",
                        column: x => x.station_id,
                        principalTable: "Station",
                        principalColumn: "station_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Auxiliary_Shift_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Train_Coach",
                columns: table => new
                {
                    train_id = table.Column<int>(type: "integer", nullable: false),
                    coach_id = table.Column<int>(type: "integer", nullable: false),
                    coach_type = table.Column<CoachType>(type: "coach_type", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Train_Coach", x => new { x.train_id, x.coach_id });
                    table.ForeignKey(
                        name: "FK_Train_Coach_Train_Asset_train_id",
                        column: x => x.train_id,
                        principalTable: "Train_Asset",
                        principalColumn: "train_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Camera",
                columns: table => new
                {
                    camera_id = table.Column<string>(type: "text", nullable: false),
                    train_id = table.Column<int>(type: "integer", nullable: false),
                    coach_id = table.Column<int>(type: "integer", nullable: false),
                    stream_url = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<CameraStatus>(type: "camera_status", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Camera", x => x.camera_id);
                    table.ForeignKey(
                        name: "FK_Camera_Train_Coach_train_id_coach_id",
                        columns: x => new { x.train_id, x.coach_id },
                        principalTable: "Train_Coach",
                        principalColumns: new[] { "train_id", "coach_id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "User_Report",
                columns: table => new
                {
                    report_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    train_id = table.Column<int>(type: "integer", nullable: false),
                    coach_id = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    image_url = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    line_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    station_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User_Report", x => x.report_id);
                    table.ForeignKey(
                        name: "FK_User_Report_Line_Station_line_id_station_id",
                        columns: x => new { x.line_id, x.station_id },
                        principalTable: "Line_Station",
                        principalColumns: new[] { "line_id", "station_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_User_Report_Train_Coach_train_id_coach_id",
                        columns: x => new { x.train_id, x.coach_id },
                        principalTable: "Train_Coach",
                        principalColumns: new[] { "train_id", "coach_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_User_Report_Users_user_id",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Detection",
                columns: table => new
                {
                    detection_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    camera_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    confidence_score = table.Column<decimal>(type: "numeric", nullable: true),
                    image_url = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    detected_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    line_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    station_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Detection", x => x.detection_id);
                    table.ForeignKey(
                        name: "FK_Detection_Camera_camera_id",
                        column: x => x.camera_id,
                        principalTable: "Camera",
                        principalColumn: "camera_id");
                    table.ForeignKey(
                        name: "FK_Detection_Line_Station_line_id_station_id",
                        columns: x => new { x.line_id, x.station_id },
                        principalTable: "Line_Station",
                        principalColumns: new[] { "line_id", "station_id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Incident",
                columns: table => new
                {
                    incident_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source = table.Column<IncidentSource>(type: "incident_source", nullable: false),
                    detection_id = table.Column<int>(type: "integer", nullable: true),
                    report_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<IncidentStatus>(type: "incident_status", nullable: false),
                    verified_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    escalated_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    enroute_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    resolved_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    dismissed_by = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    verified_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    escalated_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    enroute_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    dismissed_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    verified_comment = table.Column<string>(type: "text", nullable: true),
                    escalated_comment = table.Column<string>(type: "text", nullable: true),
                    resolved_comment = table.Column<string>(type: "text", nullable: true),
                    dismissed_comment = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Incident", x => x.incident_id);
                    table.CheckConstraint("chk_incident_source", "detection_id IS NOT NULL OR report_id IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_Incident_Detection_detection_id",
                        column: x => x.detection_id,
                        principalTable: "Detection",
                        principalColumn: "detection_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_User_Report_report_id",
                        column: x => x.report_id,
                        principalTable: "User_Report",
                        principalColumn: "report_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_Users_dismissed_by",
                        column: x => x.dismissed_by,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_Users_enroute_by",
                        column: x => x.enroute_by,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_Users_escalated_by",
                        column: x => x.escalated_by,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_Users_resolved_by",
                        column: x => x.resolved_by,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_Users_verified_by",
                        column: x => x.verified_by,
                        principalTable: "Users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Auxiliary_Shift_station_id",
                table: "Auxiliary_Shift",
                column: "station_id");

            migrationBuilder.CreateIndex(
                name: "IX_Auxiliary_Shift_user_id",
                table: "Auxiliary_Shift",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Camera_train_id_coach_id",
                table: "Camera",
                columns: new[] { "train_id", "coach_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Detection_camera_id",
                table: "Detection",
                column: "camera_id");

            migrationBuilder.CreateIndex(
                name: "IX_Detection_line_id_station_id",
                table: "Detection",
                columns: new[] { "line_id", "station_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Incident_detection_id",
                table: "Incident",
                column: "detection_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Incident_dismissed_by",
                table: "Incident",
                column: "dismissed_by");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_enroute_by",
                table: "Incident",
                column: "enroute_by");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_escalated_by",
                table: "Incident",
                column: "escalated_by");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_report_id",
                table: "Incident",
                column: "report_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Incident_resolved_by",
                table: "Incident",
                column: "resolved_by");

            migrationBuilder.CreateIndex(
                name: "IX_Incident_verified_by",
                table: "Incident",
                column: "verified_by");

            migrationBuilder.CreateIndex(
                name: "IX_Line_Station_station_id",
                table: "Line_Station",
                column: "station_id");

            migrationBuilder.CreateIndex(
                name: "IX_Train_Asset_line_id",
                table: "Train_Asset",
                column: "line_id");

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_line_id_station_id",
                table: "User_Report",
                columns: new[] { "line_id", "station_id" });

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_train_id_coach_id",
                table: "User_Report",
                columns: new[] { "train_id", "coach_id" });

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_user_id",
                table: "User_Report",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Auxiliary_Shift");

            migrationBuilder.DropTable(
                name: "Incident");

            migrationBuilder.DropTable(
                name: "Detection");

            migrationBuilder.DropTable(
                name: "User_Report");

            migrationBuilder.DropTable(
                name: "Camera");

            migrationBuilder.DropTable(
                name: "Line_Station");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Train_Coach");

            migrationBuilder.DropTable(
                name: "Station");

            migrationBuilder.DropTable(
                name: "Train_Asset");

            migrationBuilder.DropTable(
                name: "Train_Line");
        }
    }
}
