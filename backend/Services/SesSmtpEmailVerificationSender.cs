using System.Net;
using System.Net.Mail;

namespace backend.Services
{
    public class SesSmtpEmailVerificationSender : IEmailVerificationSender
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SesSmtpEmailVerificationSender> _logger;
        private readonly IWebHostEnvironment _environment;

        public SesSmtpEmailVerificationSender(
            IConfiguration configuration,
            ILogger<SesSmtpEmailVerificationSender> logger,
            IWebHostEnvironment environment)
        {
            _configuration = configuration;
            _logger = logger;
            _environment = environment;
        }

        public async Task<bool> SendLoginOtpAsync(string email, string userName, string code)
        {
            var host = _configuration["SesSmtp:Host"];
            var portRaw = _configuration["SesSmtp:Port"];
            var username = _configuration["SesSmtp:Username"];
            var password = _configuration["SesSmtp:Password"];
            var from = _configuration["SesSmtp:FromEmail"];
            var fromName = _configuration["SesSmtp:FromName"] ?? "Railly Security";
            var useSslRaw = _configuration["SesSmtp:UseSsl"];

            if (string.IsNullOrWhiteSpace(host) ||
                string.IsNullOrWhiteSpace(portRaw) ||
                string.IsNullOrWhiteSpace(username) ||
                string.IsNullOrWhiteSpace(password) ||
                string.IsNullOrWhiteSpace(from))
            {
                _logger.LogWarning(
                    "SES SMTP not configured. Skipping send for {Email}. OTP (dev/log only): {Code}",
                    email,
                    code);
                return _environment.IsDevelopment();
            }

            if (!int.TryParse(portRaw, out var port))
            {
                _logger.LogError("Invalid SesSmtp:Port value: {Port}", portRaw);
                return false;
            }

            var useSsl = !string.IsNullOrWhiteSpace(useSslRaw) && bool.TryParse(useSslRaw, out var parsedSsl) && parsedSsl;

            var subject = "Railly verification code";
            var safeName = string.IsNullOrWhiteSpace(userName) ? "there" : userName;
            var htmlBody =
                $"<p>Hello {WebUtility.HtmlEncode(safeName)},</p>" +
                "<p>Your Railly verification code is:</p>" +
                $"<h2 style=\"letter-spacing: 4px;\">{WebUtility.HtmlEncode(code)}</h2>" +
                "<p>This code expires in 5 minutes.</p>";

            try
            {
                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = useSsl
                };

                using var message = new MailMessage
                {
                    From = new MailAddress(from, fromName),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                message.To.Add(new MailAddress(email));

                await client.SendMailAsync(message);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send OTP email via SES SMTP to {Email}", email);
                return _environment.IsDevelopment();
            }
        }
    }
}
