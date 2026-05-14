using OtpNet;

namespace backend.Services
{
    public class TotpService : ITotpService
    {
        private const string Issuer = "Railly";
        private readonly TotpUsedCodeCache _usedCodeCache;

        public TotpService(TotpUsedCodeCache usedCodeCache)
        {
            _usedCodeCache = usedCodeCache;
        }

        public bool VerifyCode(string base32Secret, string code)
        {
            if (string.IsNullOrWhiteSpace(base32Secret) || string.IsNullOrWhiteSpace(code))
                return false;

            try
            {
                var secretBytes = Base32Encoding.ToBytes(base32Secret);
                var totp = new Totp(secretBytes);

                // Allow 1 window of drift (30 seconds before/after)
                var valid = totp.VerifyTotp(code, out _, new VerificationWindow(1, 1));
                if (!valid) return false;

                // Reject replayed codes within the 90-second acceptance window (RFC 6238)
                return _usedCodeCache.TryMarkUsed(base32Secret, code);
            }
            catch
            {
                return false;
            }
        }

        public string GenerateSecret()
        {
            var secretBytes = KeyGeneration.GenerateRandomKey(20);
            return Base32Encoding.ToString(secretBytes);
        }

        public string GetQrCodeUri(string email, string secret)
        {
            var encodedIssuer = Uri.EscapeDataString(Issuer);
            var encodedEmail = Uri.EscapeDataString(email);
            return $"otpauth://totp/{encodedIssuer}:{encodedEmail}?secret={secret}&issuer={encodedIssuer}";
        }
    }
}
