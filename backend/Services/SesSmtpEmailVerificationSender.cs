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
            var regionEndpoint = RegionEndpoint.GetBySystemName(region);

          if (!string.IsNullOrEmpty(accessKey) && !string.IsNullOrEmpty(secretKey) && 
                accessKey != "access-key-id" && secretKey != "your-secret-access-key")
            {
                var credentials = new BasicAWSCredentials(accessKey, secretKey);
                _client = new AmazonSimpleEmailServiceClient(credentials, regionEndpoint);
            }
            else
            {
                _client = new AmazonSimpleEmailServiceClient(regionEndpoint);
                Console.WriteLine("[EMAIL SERVICE] Initialized using Default Credential Provider Chain.");
            }
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
                            $@"<html>
<body style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 40px 0;'>
    <div style='max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e1e8ed;'>
        <div style='background-color: {ACCENT}; padding: 40px 20px; text-align: center;'>

            <h1 style='color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;'>Identity Verification</h1>
        </div>
        <div style='padding: 40px; text-align: center;'>
            <p style='color: #1a1f23; font-size: 16px; margin-bottom: 8px;'>Hi <strong>{name}</strong>,</p>
            <p style='color: #6a7682; font-size: 15px; line-height: 1.5;'>Please use the verification code below to secure your account. This code will remain active for <strong>5 minutes</strong>.</p>
            
            <div style='background-color: #f8fafb; border: 2px dashed #e1e8ed; border-radius: 16px; padding: 24px; margin: 32px 0;'>
                <div style='font-size: 36px; font-weight: 800; color: {ACCENT}; letter-spacing: 6px; font-family: monospace;'>{code}</div>
            </div>

            <p style='color: #a1aab2; font-size: 13px;'>If you didn't request this, you can &quot;railly&quot; ignore this email.</p>
        </div>
        <div style='padding: 24px; text-align: center; background-color: #f8fafb; border-top: 1px solid #eef1f4;'>
            <p style='color: #6a7682; font-size: 12px; margin: 0;'>&copy; {DateTime.UtcNow.Year} Railly Team &middot; For Safer Commute</p>
        </div>
    </div>
</body>
</html>")
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