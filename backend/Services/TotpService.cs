using System.Security.Cryptography;
using System.Text;

namespace backend.Services
{
    public class TotpService : ITotpService
    {
        public bool VerifyCode(string base32Secret, string code, int digits = 6, int periodSeconds = 30, int allowedDriftWindows = 1)
        {
            if (string.IsNullOrWhiteSpace(base32Secret) || string.IsNullOrWhiteSpace(code))
            {
                return false;
            }

            var secretBytes = DecodeBase32(base32Secret);
            if (secretBytes.Length == 0)
            {
                return false;
            }

            var nowStep = GetCurrentStep(periodSeconds);
            for (var i = -allowedDriftWindows; i <= allowedDriftWindows; i++)
            {
                var expected = GenerateCode(secretBytes, nowStep + i, digits);
                if (CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(code)))
                {
                    return true;
                }
            }

            return false;
        }

        private static long GetCurrentStep(int periodSeconds)
        {
            var unix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            return unix / periodSeconds;
        }

        private static string GenerateCode(byte[] secret, long timestep, int digits)
        {
            var counter = BitConverter.GetBytes(timestep);
            if (BitConverter.IsLittleEndian)
            {
                Array.Reverse(counter);
            }

            using var hmac = new HMACSHA1(secret);
            var hash = hmac.ComputeHash(counter);

            var offset = hash[^1] & 0x0F;
            var binaryCode =
                ((hash[offset] & 0x7F) << 24) |
                ((hash[offset + 1] & 0xFF) << 16) |
                ((hash[offset + 2] & 0xFF) << 8) |
                (hash[offset + 3] & 0xFF);

            var otp = binaryCode % (int)Math.Pow(10, digits);
            return otp.ToString($"D{digits}");
        }

        private static byte[] DecodeBase32(string input)
        {
            const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            var cleaned = input.Trim().TrimEnd('=').Replace(" ", "").ToUpperInvariant();
            if (cleaned.Length == 0)
            {
                return Array.Empty<byte>();
            }

            var bytes = new List<byte>(cleaned.Length * 5 / 8);
            var buffer = 0;
            var bitsLeft = 0;

            foreach (var c in cleaned)
            {
                var val = alphabet.IndexOf(c);
                if (val < 0)
                {
                    return Array.Empty<byte>();
                }

                buffer = (buffer << 5) | val;
                bitsLeft += 5;

                if (bitsLeft >= 8)
                {
                    bitsLeft -= 8;
                    bytes.Add((byte)((buffer >> bitsLeft) & 0xFF));
                }
            }

            return bytes.ToArray();
        }
    }
}
