using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddOpenApi();

// PostgreSQL setup
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
// [PgName] attributes on each enum value tell Npgsql the exact DB string to use
dataSourceBuilder.MapEnum<UserRole>("user_role");
dataSourceBuilder.MapEnum<AssetStatus>("asset_status");
dataSourceBuilder.MapEnum<UserStatus>("user_status");
dataSourceBuilder.MapEnum<CoachType>("coach_type");
dataSourceBuilder.MapEnum<CameraStatus>("camera_status");
dataSourceBuilder.MapEnum<IncidentSource>("incident_source");
dataSourceBuilder.MapEnum<IncidentStatus>("incident_status");
dataSourceBuilder.EnableUnmappedTypes();

var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource, o =>
    {
        o.MapEnum<UserStatus>("user_status");
        o.MapEnum<UserRole>("user_role");
        o.MapEnum<AssetStatus>("asset_status");
        o.MapEnum<CoachType>("coach_type");
        o.MapEnum<CameraStatus>("camera_status");
        o.MapEnum<IncidentSource>("incident_source");
        o.MapEnum<IncidentStatus>("incident_status");
    }));

// CORS
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.MapControllers();
app.Run();