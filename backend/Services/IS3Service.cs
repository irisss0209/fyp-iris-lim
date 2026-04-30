using Microsoft.AspNetCore.Http;

namespace backend.Services
{
    public interface IS3Service
    {
        Task<string> UploadFileAsync(IFormFile file, string folderName);
        Task<string> UploadFileWithKeyAsync(IFormFile file, string key);
        Task<bool> DeleteFileAsync(string fileUrl);
        string GeneratePresignedUrl(string key, int expiryMinutes = 60);
    }
}
