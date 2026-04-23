using OtpNet;

namespace backend.Services
{
    public class TotpService : ITotpService
    {
        private const string Issuer = "Railly";

        public bool VerifyCode(string base32Secret, string code)
        {
            if (string.IsNullOrWhiteSpace(base32Secret) || string.IsNullOrWhiteSpace(code))
                return false;

            try
            {
                var secretBytes = Base32Encoding.ToBytes(base32Secret);
                var totp = new Totp(secretBytes);
                
                // Allow 1 window of drift (30 seconds before/after)
                return totp.VerifyTotp(code, out _, new VerificationWindow(1, 1));
            }
            catch
            {
                return false;
            }
        }

        public string GenerateSecret()
        {
            // Generate a 20-byte (160-bit) random secret, which is standard for TOTP
            var secretBytes = KeyGeneration.GenerateRandomKey(20);
            return Base32Encoding.ToString(secretBytes);
        }

        public string GetQrCodeUri(string email, string secret)
        {
            // Create the otpauth:// URI for Google Authenticator manually to avoid build errors
            var encodedIssuer = Uri.EscapeDataString(Issuer);
            var encodedEmail = Uri.EscapeDataString(email);
            return $"otpauth://totp/{encodedIssuer}:{encodedEmail}?secret={secret}&issuer={encodedIssuer}";
        }
    }
}
