namespace backend.Services
{
    public interface ITotpService
    {
        bool VerifyCode(string base32Secret, string code, int digits = 6, int periodSeconds = 30, int allowedDriftWindows = 1);
    }
}
