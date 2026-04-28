using Microsoft.AspNetCore.Http;

namespace backend.Services
{
    public interface IS3Service
    {
        Task<string> UploadFileAsync(IFormFile file, string folderName);
        Task<bool> DeleteFileAsync(string fileUrl);
    }
}
