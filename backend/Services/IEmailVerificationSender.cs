namespace backend.Services
{
    public interface IEmailVerificationSender
    {
        Task<bool> SendLoginOtpAsync(string email, string userName, string code);
    }
}
