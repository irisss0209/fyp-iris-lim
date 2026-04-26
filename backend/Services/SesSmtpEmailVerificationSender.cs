using Amazon;
using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Amazon.Runtime;

namespace backend.Services
{
    public class EmailService : IEmailVerificationSender
    {
        private readonly IConfiguration _config;
        private readonly AmazonSimpleEmailServiceClient _client;

        public EmailService(IConfiguration config)
        {
            _config = config;

            var accessKey = _config["AWS:AccessKey"];
            var secretKey = _config["AWS:SecretKey"];
            var region = _config["AWS:Region"] ?? "ap-southeast-1";
            var credentials = new BasicAWSCredentials(accessKey, secretKey);
            var regionEndpoint = RegionEndpoint.GetBySystemName(region);

            _client = new AmazonSimpleEmailServiceClient(credentials, regionEndpoint);
        }

        public async Task<bool> SendLoginOtpAsync(string email, string name, string code)
        {
            try
            {
                var from = _config["Email:From"];

                var request = new SendEmailRequest
                {
                    Source = from,
                    Destination = new Destination
                    {
                        ToAddresses = new List<string> { email }
                    },
                    Message = new Message
                    {
                        Subject = new Content("Railly OTP Verification"),
                        Body = new Body
                        {
                            Html = new Content(
                            $"<html><body>"
                            + "<h2>Railly OTP Verification</h2>"
                            + $"<p>Hi {name},</p>"
                            + "<p>Here is your verification code:</p>"
                            + $"<p style='font-size:24px; font-weight:bold; color:{ACCENT}; letter-spacing:2px;'>{code}</p>"
                            + "<p>This code will expire in 5 minutes.</p>"
                            + "<p>If you did not initiate this request, please ignore this email.</p>"
                            + "<hr style='border:none; border-top:1px solid #eee; margin:20px 0;' />"
                            + "<p style='color:#888; font-size:12px;'>Thank you,<br/>Railly Team</p>"
                            + "</body></html>")
                        }
                    }
                };

                await _client.SendEmailAsync(request);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] {ex.Message}");
                return false;
            }
        }

        private const string ACCENT = "#0B4F6C";
    }
}