using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using backend.Models;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class SyncSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Camera_Train_Coach_coach_id",
                table: "Camera");

            migrationBuilder.DropForeignKey(
                name: "FK_Detection_Camera_camera_id",
                table: "Detection");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_User_dismissed_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_User_enroute_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_User_escalated_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_User_resolved_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_User_verified_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Train_Asset_Train_Line_line_id",
                table: "Train_Asset");

            migrationBuilder.DropForeignKey(
                name: "FK_Train_Coach_Train_Asset_train_id",
                table: "Train_Coach");

            migrationBuilder.DropForeignKey(
                name: "FK_User_Report_Train_Coach_coach_id",
                table: "User_Report");

            migrationBuilder.DropForeignKey(
                name: "FK_User_Report_User_user_id",
                table: "User_Report");

            migrationBuilder.DropIndex(
                name: "IX_User_Report_coach_id",
                table: "User_Report");

            migrationBuilder.DropIndex(
                name: "IX_Train_Asset_line_id",
                table: "Train_Asset");

            migrationBuilder.DropCheckConstraint(
                name: "chk_asset_status",
                table: "Train_Asset");

            migrationBuilder.DropCheckConstraint(
                name: "chk_incident_has_source",
                table: "Incident");

            migrationBuilder.DropCheckConstraint(
                name: "chk_incident_source",
                table: "Incident");

            migrationBuilder.DropCheckConstraint(
                name: "chk_incident_status",
                table: "Incident");

            migrationBuilder.DropPrimaryKey(
                name: "PK_User",
                table: "User");

            migrationBuilder.DropCheckConstraint(
                name: "chk_user_role",
                table: "User");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Train_Coach",
                table: "Train_Coach");

            migrationBuilder.DropIndex(
                name: "IX_Train_Coach_train_id",
                table: "Train_Coach");

            migrationBuilder.DropCheckConstraint(
                name: "chk_coach_type",
                table: "Train_Coach");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Camera",
                table: "Camera");

            migrationBuilder.DropIndex(
                name: "IX_Camera_coach_id",
                table: "Camera");

            migrationBuilder.DropCheckConstraint(
                name: "chk_camera_status",
                table: "Camera");

            migrationBuilder.DropColumn(
                name: "violation_type",
                table: "User_Report");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "Train_Asset");

            migrationBuilder.DropColumn(
                name: "status",
                table: "Train_Asset");

            migrationBuilder.DropColumn(
                name: "cognito_sub",
                table: "User");

            migrationBuilder.RenameTable(
                name: "User",
                newName: "Users");

            migrationBuilder.RenameTable(
                name: "Train_Coach",
                newName: "TrainCoaches");

            migrationBuilder.RenameTable(
                name: "Camera",
                newName: "Cameras");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:asset_status", "Active,Inactive,Maintenance")
                .Annotation("Npgsql:Enum:camera_status", "Active,Faulty,Inactive")
                .Annotation("Npgsql:Enum:coach_type", "Mixed,Womens_Only")
                .Annotation("Npgsql:Enum:incident_source", "AI_DETECTION,USER_REPORT")
                .Annotation("Npgsql:Enum:incident_status", "Dismissed,En_Route,Escalated,Pending,Resolved,Verified")
                .Annotation("Npgsql:Enum:user_role", "Auxiliary,Operator,Passenger")
                .Annotation("Npgsql:Enum:user_status", "Active,Archived,Suspended");

            migrationBuilder.AlterColumn<string>(
                name: "user_id",
                table: "User_Report",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "User_Report",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<int>(
                name: "coach_id",
                table: "User_Report",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "line_id",
                table: "User_Report",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "station_id",
                table: "User_Report",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "train_id",
                table: "User_Report",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "line_id",
                table: "Train_Line",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "line_id",
                table: "Train_Asset",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "train_id",
                table: "Train_Asset",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20)
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<string>(
                name: "TrainLineLineId",
                table: "Train_Asset",
                type: "character varying(50)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "asset_name",
                table: "Train_Asset",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "station_id",
                table: "Station",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "station_id",
                table: "Line_Station",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "line_id",
                table: "Line_Station",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "verified_by",
                table: "Incident",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "verified_at",
                table: "Incident",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<IncidentStatus>(
                name: "status",
                table: "Incident",
                type: "incident_status",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<IncidentSource>(
                name: "source",
                table: "Incident",
                type: "incident_source",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "resolved_by",
                table: "Incident",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "resolved_at",
                table: "Incident",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "escalated_by",
                table: "Incident",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "escalated_at",
                table: "Incident",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "enroute_by",
                table: "Incident",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "enroute_at",
                table: "Incident",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "dismissed_by",
                table: "Incident",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "dismissed_at",
                table: "Incident",
                type: "timestamp without time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "Incident",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddColumn<string>(
                name: "dismissed_comment",
                table: "Incident",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "escalated_comment",
                table: "Incident",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "resolved_comment",
                table: "Incident",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "verified_comment",
                table: "Incident",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "detected_at",
                table: "Detection",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "camera_id",
                table: "Detection",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "line_id",
                table: "Detection",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "station_id",
                table: "Detection",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AlterColumn<UserRole>(
                name: "role",
                table: "Users",
                type: "user_role",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "employee_id",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "Users",
                type: "timestamp without time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "user_id",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AddColumn<bool>(
                name: "MfaEnabled",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MfaSecret",
                table: "Users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "password_hash",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "previous_password_hash",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<UserStatus>(
                name: "status",
                table: "Users",
                type: "user_status",
                nullable: false,
                defaultValue: UserStatus.Active);

            migrationBuilder.AlterColumn<int>(
                name: "train_id",
                table: "TrainCoaches",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<CoachType>(
                name: "coach_type",
                table: "TrainCoaches",
                type: "coach_type",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "coach_id",
                table: "TrainCoaches",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "stream_url",
                table: "Cameras",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AlterColumn<CameraStatus>(
                name: "status",
                table: "Cameras",
                type: "camera_status",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<int>(
                name: "coach_id",
                table: "Cameras",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "camera_id",
                table: "Cameras",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AddColumn<int>(
                name: "train_id",
                table: "Cameras",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Users",
                table: "Users",
                column: "user_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TrainCoaches",
                table: "TrainCoaches",
                columns: new[] { "train_id", "coach_id" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_Cameras",
                table: "Cameras",
                column: "camera_id");

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

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_line_id_station_id",
                table: "User_Report",
                columns: new[] { "line_id", "station_id" });

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_train_id_coach_id",
                table: "User_Report",
                columns: new[] { "train_id", "coach_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Train_Asset_TrainLineLineId",
                table: "Train_Asset",
                column: "TrainLineLineId");

            migrationBuilder.AddCheckConstraint(
                name: "chk_incident_source",
                table: "Incident",
                sql: "detection_id IS NOT NULL OR report_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Detection_line_id_station_id",
                table: "Detection",
                columns: new[] { "line_id", "station_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Cameras_train_id_coach_id",
                table: "Cameras",
                columns: new[] { "train_id", "coach_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Auxiliary_Shift_station_id",
                table: "Auxiliary_Shift",
                column: "station_id");

            migrationBuilder.CreateIndex(
                name: "IX_Auxiliary_Shift_user_id",
                table: "Auxiliary_Shift",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Cameras_TrainCoaches_train_id_coach_id",
                table: "Cameras",
                columns: new[] { "train_id", "coach_id" },
                principalTable: "TrainCoaches",
                principalColumns: new[] { "train_id", "coach_id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Detection_Cameras_camera_id",
                table: "Detection",
                column: "camera_id",
                principalTable: "Cameras",
                principalColumn: "camera_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Detection_Line_Station_line_id_station_id",
                table: "Detection",
                columns: new[] { "line_id", "station_id" },
                principalTable: "Line_Station",
                principalColumns: new[] { "line_id", "station_id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_Users_dismissed_by",
                table: "Incident",
                column: "dismissed_by",
                principalTable: "Users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_Users_enroute_by",
                table: "Incident",
                column: "enroute_by",
                principalTable: "Users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_Users_escalated_by",
                table: "Incident",
                column: "escalated_by",
                principalTable: "Users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_Users_resolved_by",
                table: "Incident",
                column: "resolved_by",
                principalTable: "Users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_Users_verified_by",
                table: "Incident",
                column: "verified_by",
                principalTable: "Users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Train_Asset_Train_Line_TrainLineLineId",
                table: "Train_Asset",
                column: "TrainLineLineId",
                principalTable: "Train_Line",
                principalColumn: "line_id");

            migrationBuilder.AddForeignKey(
                name: "FK_TrainCoaches_Train_Asset_train_id",
                table: "TrainCoaches",
                column: "train_id",
                principalTable: "Train_Asset",
                principalColumn: "train_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_User_Report_Line_Station_line_id_station_id",
                table: "User_Report",
                columns: new[] { "line_id", "station_id" },
                principalTable: "Line_Station",
                principalColumns: new[] { "line_id", "station_id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_User_Report_TrainCoaches_train_id_coach_id",
                table: "User_Report",
                columns: new[] { "train_id", "coach_id" },
                principalTable: "TrainCoaches",
                principalColumns: new[] { "train_id", "coach_id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_User_Report_Users_user_id",
                table: "User_Report",
                column: "user_id",
                principalTable: "Users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cameras_TrainCoaches_train_id_coach_id",
                table: "Cameras");

            migrationBuilder.DropForeignKey(
                name: "FK_Detection_Cameras_camera_id",
                table: "Detection");

            migrationBuilder.DropForeignKey(
                name: "FK_Detection_Line_Station_line_id_station_id",
                table: "Detection");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_Users_dismissed_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_Users_enroute_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_Users_escalated_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_Users_resolved_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Incident_Users_verified_by",
                table: "Incident");

            migrationBuilder.DropForeignKey(
                name: "FK_Train_Asset_Train_Line_TrainLineLineId",
                table: "Train_Asset");

            migrationBuilder.DropForeignKey(
                name: "FK_TrainCoaches_Train_Asset_train_id",
                table: "TrainCoaches");

            migrationBuilder.DropForeignKey(
                name: "FK_User_Report_Line_Station_line_id_station_id",
                table: "User_Report");

            migrationBuilder.DropForeignKey(
                name: "FK_User_Report_TrainCoaches_train_id_coach_id",
                table: "User_Report");

            migrationBuilder.DropForeignKey(
                name: "FK_User_Report_Users_user_id",
                table: "User_Report");

            migrationBuilder.DropTable(
                name: "Auxiliary_Shift");

            migrationBuilder.DropIndex(
                name: "IX_User_Report_line_id_station_id",
                table: "User_Report");

            migrationBuilder.DropIndex(
                name: "IX_User_Report_train_id_coach_id",
                table: "User_Report");

            migrationBuilder.DropIndex(
                name: "IX_Train_Asset_TrainLineLineId",
                table: "Train_Asset");

            migrationBuilder.DropCheckConstraint(
                name: "chk_incident_source",
                table: "Incident");

            migrationBuilder.DropIndex(
                name: "IX_Detection_line_id_station_id",
                table: "Detection");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Users",
                table: "Users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TrainCoaches",
                table: "TrainCoaches");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Cameras",
                table: "Cameras");

            migrationBuilder.DropIndex(
                name: "IX_Cameras_train_id_coach_id",
                table: "Cameras");

            migrationBuilder.DropColumn(
                name: "line_id",
                table: "User_Report");

            migrationBuilder.DropColumn(
                name: "station_id",
                table: "User_Report");

            migrationBuilder.DropColumn(
                name: "train_id",
                table: "User_Report");

            migrationBuilder.DropColumn(
                name: "TrainLineLineId",
                table: "Train_Asset");

            migrationBuilder.DropColumn(
                name: "asset_name",
                table: "Train_Asset");

            migrationBuilder.DropColumn(
                name: "dismissed_comment",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "escalated_comment",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "resolved_comment",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "verified_comment",
                table: "Incident");

            migrationBuilder.DropColumn(
                name: "line_id",
                table: "Detection");

            migrationBuilder.DropColumn(
                name: "station_id",
                table: "Detection");

            migrationBuilder.DropColumn(
                name: "MfaEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MfaSecret",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "password_hash",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "previous_password_hash",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "status",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "train_id",
                table: "Cameras");

            migrationBuilder.RenameTable(
                name: "Users",
                newName: "User");

            migrationBuilder.RenameTable(
                name: "TrainCoaches",
                newName: "Train_Coach");

            migrationBuilder.RenameTable(
                name: "Cameras",
                newName: "Camera");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:Enum:asset_status", "Active,Inactive,Maintenance")
                .OldAnnotation("Npgsql:Enum:camera_status", "Active,Faulty,Inactive")
                .OldAnnotation("Npgsql:Enum:coach_type", "Mixed,Womens_Only")
                .OldAnnotation("Npgsql:Enum:incident_source", "AI_DETECTION,USER_REPORT")
                .OldAnnotation("Npgsql:Enum:incident_status", "Dismissed,En_Route,Escalated,Pending,Resolved,Verified")
                .OldAnnotation("Npgsql:Enum:user_role", "Auxiliary,Operator,Passenger")
                .OldAnnotation("Npgsql:Enum:user_status", "Active,Archived,Suspended");

            migrationBuilder.AlterColumn<string>(
                name: "user_id",
                table: "User_Report",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "User_Report",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<string>(
                name: "coach_id",
                table: "User_Report",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "violation_type",
                table: "User_Report",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "line_id",
                table: "Train_Line",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "line_id",
                table: "Train_Asset",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "train_id",
                table: "Train_Asset",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "Train_Asset",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "Train_Asset",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "station_id",
                table: "Station",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "station_id",
                table: "Line_Station",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "line_id",
                table: "Line_Station",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "verified_by",
                table: "Incident",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "verified_at",
                table: "Incident",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "Incident",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(IncidentStatus),
                oldType: "incident_status");

            migrationBuilder.AlterColumn<string>(
                name: "source",
                table: "Incident",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(IncidentSource),
                oldType: "incident_source");

            migrationBuilder.AlterColumn<string>(
                name: "resolved_by",
                table: "Incident",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "resolved_at",
                table: "Incident",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "escalated_by",
                table: "Incident",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "escalated_at",
                table: "Incident",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "enroute_by",
                table: "Incident",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "enroute_at",
                table: "Incident",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "dismissed_by",
                table: "Incident",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "dismissed_at",
                table: "Incident",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "Incident",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<DateTime>(
                name: "detected_at",
                table: "Detection",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<string>(
                name: "camera_id",
                table: "Detection",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "role",
                table: "User",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(UserRole),
                oldType: "user_role");

            migrationBuilder.AlterColumn<string>(
                name: "employee_id",
                table: "User",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "created_at",
                table: "User",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp without time zone");

            migrationBuilder.AlterColumn<string>(
                name: "user_id",
                table: "User",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<string>(
                name: "cognito_sub",
                table: "User",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "coach_type",
                table: "Train_Coach",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(CoachType),
                oldType: "coach_type");

            migrationBuilder.AlterColumn<string>(
                name: "coach_id",
                table: "Train_Coach",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "train_id",
                table: "Train_Coach",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "stream_url",
                table: "Camera",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "Camera",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(CameraStatus),
                oldType: "camera_status");

            migrationBuilder.AlterColumn<string>(
                name: "coach_id",
                table: "Camera",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "camera_id",
                table: "Camera",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddPrimaryKey(
                name: "PK_User",
                table: "User",
                column: "user_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Train_Coach",
                table: "Train_Coach",
                column: "coach_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Camera",
                table: "Camera",
                column: "camera_id");

            migrationBuilder.CreateIndex(
                name: "IX_User_Report_coach_id",
                table: "User_Report",
                column: "coach_id");

            migrationBuilder.CreateIndex(
                name: "IX_Train_Asset_line_id",
                table: "Train_Asset",
                column: "line_id");

            migrationBuilder.AddCheckConstraint(
                name: "chk_asset_status",
                table: "Train_Asset",
                sql: "status IN ('Active', 'Inactive', 'Maintenance')");

            migrationBuilder.AddCheckConstraint(
                name: "chk_incident_has_source",
                table: "Incident",
                sql: "detection_id IS NOT NULL OR report_id IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "chk_incident_source",
                table: "Incident",
                sql: "source IN ('AI_DETECTION', 'USER_REPORT')");

            migrationBuilder.AddCheckConstraint(
                name: "chk_incident_status",
                table: "Incident",
                sql: "status IN ('Pending','Verified','En_Route','Escalated','Resolved','Dismissed')");

            migrationBuilder.AddCheckConstraint(
                name: "chk_user_role",
                table: "User",
                sql: "role IN ('Customer', 'Operator', 'Auxiliary')");

            migrationBuilder.CreateIndex(
                name: "IX_Train_Coach_train_id",
                table: "Train_Coach",
                column: "train_id");

            migrationBuilder.AddCheckConstraint(
                name: "chk_coach_type",
                table: "Train_Coach",
                sql: "coach_type IN ('Womens_Only', 'Mixed')");

            migrationBuilder.CreateIndex(
                name: "IX_Camera_coach_id",
                table: "Camera",
                column: "coach_id");

            migrationBuilder.AddCheckConstraint(
                name: "chk_camera_status",
                table: "Camera",
                sql: "status IN ('Active', 'Inactive', 'Faulty')");

            migrationBuilder.AddForeignKey(
                name: "FK_Camera_Train_Coach_coach_id",
                table: "Camera",
                column: "coach_id",
                principalTable: "Train_Coach",
                principalColumn: "coach_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Detection_Camera_camera_id",
                table: "Detection",
                column: "camera_id",
                principalTable: "Camera",
                principalColumn: "camera_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_User_dismissed_by",
                table: "Incident",
                column: "dismissed_by",
                principalTable: "User",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_User_enroute_by",
                table: "Incident",
                column: "enroute_by",
                principalTable: "User",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_User_escalated_by",
                table: "Incident",
                column: "escalated_by",
                principalTable: "User",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_User_resolved_by",
                table: "Incident",
                column: "resolved_by",
                principalTable: "User",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Incident_User_verified_by",
                table: "Incident",
                column: "verified_by",
                principalTable: "User",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Train_Asset_Train_Line_line_id",
                table: "Train_Asset",
                column: "line_id",
                principalTable: "Train_Line",
                principalColumn: "line_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Train_Coach_Train_Asset_train_id",
                table: "Train_Coach",
                column: "train_id",
                principalTable: "Train_Asset",
                principalColumn: "train_id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_User_Report_Train_Coach_coach_id",
                table: "User_Report",
                column: "coach_id",
                principalTable: "Train_Coach",
                principalColumn: "coach_id");

            migrationBuilder.AddForeignKey(
                name: "FK_User_Report_User_user_id",
                table: "User_Report",
                column: "user_id",
                principalTable: "User",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
