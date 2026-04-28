using Amazon;
using Amazon.S3;
using Amazon.S3.Transfer;
using Amazon.Runtime;
using Microsoft.AspNetCore.Http;

namespace backend.Services
{
    public class S3Service : IS3Service
    {
        private readonly IConfiguration _config;
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;
        private readonly string _region;

        public S3Service(IConfiguration config)
        {
            _config = config;
            
            var accessKey = _config["AWS:AccessKey"];
            var secretKey = _config["AWS:SecretKey"];
            _region = _config["AWS:Region"] ?? "ap-southeast-1";
            _bucketName = _config["AWS:BucketName"] ?? "railly";

            var credentials = new BasicAWSCredentials(accessKey, secretKey);
            var regionEndpoint = RegionEndpoint.GetBySystemName(_region);
            
            _s3Client = new AmazonS3Client(credentials, regionEndpoint);
        }

        public async Task<string> UploadFileAsync(IFormFile file, string folderName)
        {
            try
            {
                var fileName = $"{folderName}/{Guid.NewGuid()}_{file.FileName}";
                
                using (var newStream = new MemoryStream())
                {
                    await file.CopyToAsync(newStream);
                    
                    var uploadRequest = new TransferUtilityUploadRequest
                    {
                        InputStream = newStream,
                        Key = fileName,
                        BucketName = _bucketName,
                        CannedACL = S3CannedACL.PublicRead // Making it public read for easy display
                    };

                    var fileTransferUtility = new TransferUtility(_s3Client);
                    await fileTransferUtility.UploadAsync(uploadRequest);

                    // Construct the public URL
                    // URL format: https://bucket-name.s3.region.amazonaws.com/file-name
                    return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{fileName}";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[S3 UPLOAD ERROR] {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteFileAsync(string fileUrl)
        {
            try
            {
                // Extract key from URL
                // Example: https://railly.s3.ap-southeast-1.amazonaws.com/reports/uuid_filename.jpg
                var uri = new Uri(fileUrl);
                var key = uri.AbsolutePath.TrimStart('/');

                var deleteRequest = new Amazon.S3.Model.DeleteObjectRequest
                {
                    BucketName = _bucketName,
                    Key = key
                };

                await _s3Client.DeleteObjectAsync(deleteRequest);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[S3 DELETE ERROR] {ex.Message}");
                return false;
            }
        }
    }
}
