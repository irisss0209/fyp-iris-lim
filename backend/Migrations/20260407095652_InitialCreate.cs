using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Station",
                columns: table => new
                {
                    station_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    station_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Station", x => x.station_id);
                });

            migrationBuilder.CreateTable(
                name: "Train_Line",
                columns: table => new
                {
                    line_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    line_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Train_Line", x => x.line_id);
                });

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    employee_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    user_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    cognito_sub = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.user_id);
                    table.CheckConstraint("chk_user_role", "role IN ('Customer', 'Operator', 'Auxiliary')");
                });

            migrationBuilder.CreateTable(
                name: "Line_Station",
                columns: table => new
                {
                    line_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    station_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
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
                    train_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    line_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Train_Asset", x => x.train_id);
                    table.CheckConstraint("chk_asset_status", "status IN ('Active', 'Inactive', 'Maintenance')");
                    table.ForeignKey(
                        name: "FK_Train_Asset_Train_Line_line_id",
                        column: x => x.line_id,
                        principalTable: "Train_Line",
                        principalColumn: "line_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Train_Coach",
                columns: table => new
                {
                    coach_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    train_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    coach_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Train_Coach", x => x.coach_id);
                    table.CheckConstraint("chk_coach_type", "coach_type IN ('Womens_Only', 'Mixed')");
                    table.ForeignKey(
                        name: "FK_Train_Coach_Train_Asset_train_id",
                        column: x => x.train_id,
                        principalTable: "Train_Asset",
                        principalColumn: "train_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Camera",
                columns: table => new
                {
                    camera_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    coach_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    stream_url = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Camera", x => x.camera_id);
                    table.CheckConstraint("chk_camera_status", "status IN ('Active', 'Inactive', 'Faulty')");
                    table.ForeignKey(
                        name: "FK_Camera_Train_Coach_coach_id",
                        column: x => x.coach_id,
                        principalTable: "Train_Coach",
                        principalColumn: "coach_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "User_Report",
                columns: table => new
                {
                    report_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    coach_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    violation_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    image_url = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User_Report", x => x.report_id);
                    table.ForeignKey(
                        name: "FK_User_Report_Train_Coach_coach_id",
                        column: x => x.coach_id,
                        principalTable: "Train_Coach",
                        principalColumn: "coach_id");
                    table.ForeignKey(
                        name: "FK_User_Report_User_user_id",
                        column: x => x.user_id,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Detection",
                columns: table => new
                {
                    detection_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    camera_id = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    confidence_score = table.Column<decimal>(type: "numeric", nullable: true),
                    image_url = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    detected_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Detection", x => x.detection_id);
                    table.ForeignKey(
                        name: "FK_Detection_Camera_camera_id",
                        column: x => x.camera_id,
                        principalTable: "Camera",
                        principalColumn: "camera_id");
                });

            migrationBuilder.CreateTable(
                name: "Incident",
                columns: table => new
                {
                    incident_id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    detection_id = table.Column<int>(type: "integer", nullable: true),
                    report_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    verified_by = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    escalated_by = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    enroute_by = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    resolved_by = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    dismissed_by = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    verified_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    escalated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    enroute_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    dismissed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Incident", x => x.incident_id);
                    table.CheckConstraint("chk_incident_has_source", "detection_id IS NOT NULL OR report_id IS NOT NULL");
                    table.CheckConstraint("chk_incident_source", "source IN ('AI_DETECTION', 'USER_REPORT')");
                    table.CheckConstraint("chk_incident_status", "status IN ('Pending','Verified','En_Route','Escalated','Resolved','Dismissed')");
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
                        name: "FK_Incident_User_dismissed_by",
                        column: x => x.dismissed_by,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_User_enroute_by",
                        column: x => x.enroute_by,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_User_escalated_by",
                        column: x => x.escalated_by,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_User_resolved_by",
                        column: x => x.resolved_by,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Incident_User_verified_by",
                        column: x => x.verified_by,
                        principalTable: "User",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Camera_coach_id",
                table: "Camera",
                column: "coach_id");

            migrationBuilder.CreateIndex(
                name: "IX_Detection_camera_id",
                table: "Detection",
                column: "camera_id");

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
                name: "IX_Train_Coach_train_id",
                table: "Train_Coach",
                column: "train_id");

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_coach_id",
                table: "User_Report",
                column: "coach_id");

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_user_id",
                table: "User_Report",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Incident");

            migrationBuilder.DropTable(
                name: "Line_Station");

            migrationBuilder.DropTable(
                name: "Detection");

            migrationBuilder.DropTable(
                name: "User_Report");

            migrationBuilder.DropTable(
                name: "Station");

            migrationBuilder.DropTable(
                name: "Camera");

            migrationBuilder.DropTable(
                name: "User");

            migrationBuilder.DropTable(
                name: "Train_Coach");

            migrationBuilder.DropTable(
                name: "Train_Asset");

            migrationBuilder.DropTable(
                name: "Train_Line");
        }
    }
}
