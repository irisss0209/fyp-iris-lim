using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddOpenApi();

// Fetch all secrets from AWS Secrets Manager at startup.
// Overrides appsettings values when running in AWS (EC2/ECS with an IAM role).
// Falls back silently to appsettings values for local development.
try
{
    using var smClient = new AmazonSecretsManagerClient(Amazon.RegionEndpoint.APSoutheast1);
    var smResults = await Task.WhenAll(
        GetSecret(smClient, "railly/jwt-secret"),
        GetSecret(smClient, "railly/db-connection-string"),
        GetSecret(smClient, "railly/vapid-private-key"),
        GetSecret(smClient, "railly/google-geocoding-api-key"),
        GetSecret(smClient, "railly/vertex-project-id"),
        GetSecret(smClient, "railly/vertex-service-account-json")
    );
    if (smResults[0] is { } jwt)          builder.Configuration["JwtSettings:SecretKey"]              = jwt;
    if (smResults[1] is { } db)           builder.Configuration["ConnectionStrings:DefaultConnection"] = db;
    if (smResults[2] is { } vapid)        builder.Configuration["Vapid:PrivateKey"]                   = vapid;
    if (smResults[3] is { } google)       builder.Configuration["Google:GeocodingApiKey"]              = google;
    if (smResults[4] is { } vertexProj)   builder.Configuration["VertexAI:ProjectId"]                 = vertexProj;
    if (smResults[5] is { } vertexJson)   builder.Configuration["VertexAI:ServiceAccountJson"]        = vertexJson;
    Console.WriteLine(" Secrets loaded from AWS Secrets Manager.");
}
catch (Exception ex)
{
    Console.WriteLine($" Secrets Manager unavailable — using appsettings values. ({ex.Message})");
}

// PostgreSQL setup
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.MapEnum<UserRole>("user_role");
dataSourceBuilder.MapEnum<AssetStatus>("asset_status");
dataSourceBuilder.MapEnum<UserStatus>("user_status");
dataSourceBuilder.MapEnum<CoachType>("coach_type");
dataSourceBuilder.MapEnum<CameraStatus>("camera_status");
dataSourceBuilder.MapEnum<IncidentSource>("incident_source");
dataSourceBuilder.MapEnum<IncidentStatus>("incident_status");
dataSourceBuilder.MapEnum<SoundAlertMode>("sound_alert_mode");
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
        o.MapEnum<SoundAlertMode>("sound_alert_mode");
    }));

// JWT Authentication
var jwtSettings   = builder.Configuration.GetSection("JwtSettings");
var secretKey     = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JwtSettings:SecretKey is not configured.");
var issuer        = jwtSettings["Issuer"]     ?? "railly.my";
var audience      = jwtSettings["Audience"]   ?? "railly.my";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue("auth_token", out var cookieToken))
                    ctx.Token = cookieToken;
                return Task.CompletedTask;
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = issuer,
            ValidAudience            = audience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<IEmailVerificationSender, EmailService>();
builder.Services.AddSingleton<AuthChallengeStore>();
builder.Services.AddSingleton<ITotpService, TotpService>();
builder.Services.AddScoped<IAlertService, AlertService>();
builder.Services.AddScoped<IS3Service, S3Service>();
builder.Services.AddSingleton<IGeminiService, GeminiService>();
builder.Services.AddSingleton<IPushNotificationService, PushNotificationService>();

// Rate limiting — 10 req/min per IP on auth; 120 req/min on general API endpoints
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 120;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
            "https://railly.systems",
            "https://www.railly.systems"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});
var app = builder.Build();


app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
    });
});

using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
        Console.WriteLine("[STARTUP] Database migrations applied successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[STARTUP] Failed to apply database migrations: {ex}");
    }
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => "OK");
app.Urls.Add("http://0.0.0.0:8080");
app.Run();

static async Task<string?> GetSecret(AmazonSecretsManagerClient client, string secretId)
{
    try
    {
        var r = await client.GetSecretValueAsync(new GetSecretValueRequest { SecretId = secretId });
        return r.SecretString;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[STARTUP] Failed to fetch secret '{secretId}': {ex.Message}");
        return null;
    }
}