namespace backend.Services
{
    public interface ITotpService
    {
        bool VerifyCode(string base32Secret, string code);
        string GenerateSecret();
        string GetQrCodeUri(string email, string secret);
    }
}
