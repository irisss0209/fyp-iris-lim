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

            var regionEndpoint = RegionEndpoint.GetBySystemName(_region);
            
            if (!string.IsNullOrEmpty(accessKey) && !string.IsNullOrEmpty(secretKey) && 
                accessKey != "your-access-key-id" && secretKey != "your-secret-access-key")
            {
                var credentials = new BasicAWSCredentials(accessKey, secretKey);
                _s3Client = new AmazonS3Client(credentials, regionEndpoint);
            }
            else
            {
                _s3Client = new AmazonS3Client(regionEndpoint);
                Console.WriteLine("[S3 SERVICE] Initialized using Default Credential Provider Chain.");
            }

            Console.WriteLine($"[S3 SERVICE] Initialized with Bucket: {_bucketName}, Region: {_region}");
        }

        public async Task<string> UploadFileAsync(IFormFile file, string folderName)
        {
            try
            {
                var fileName = $"{folderName}/{Guid.NewGuid()}_{file.FileName}";
                
                using (var stream = file.OpenReadStream())
                {
                    var uploadRequest = new TransferUtilityUploadRequest
                    {
                        InputStream = stream,
                        Key = fileName,
                        BucketName = _bucketName
                    };

                    var fileTransferUtility = new TransferUtility(_s3Client);
                    await fileTransferUtility.UploadAsync(uploadRequest);

                    // Construct the public URL
                    return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{fileName}";
                }
            }
            catch (AmazonS3Exception e)
            {
                Console.WriteLine($"[S3 ERROR] AWS Error Code: {e.ErrorCode}, Message: {e.Message}");
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[S3 UPLOAD ERROR] {ex.Message}");
                throw;
            }
        }

        public async Task<string> UploadFileWithKeyAsync(IFormFile file, string key)
        {
            try
            {
                using var stream = file.OpenReadStream();

                var uploadRequest = new TransferUtilityUploadRequest
                {
                    InputStream = stream,
                    Key = key,
                    BucketName = _bucketName,
                    ContentType = file.ContentType
                    // Removed PublicRead ACL as it may cause Access Denied on buckets with Block Public Access
                };

                var fileTransferUtility = new TransferUtility(_s3Client);
                await fileTransferUtility.UploadAsync(uploadRequest);

                return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{key}";
            }
            catch (AmazonS3Exception e)
            {
                Console.WriteLine($"[S3 ERROR] AWS Error Code: {e.ErrorCode}, Message: {e.Message}");
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[S3 UPLOAD ERROR] {ex.Message}");
                throw;
            }
        }

        public string GeneratePresignedUrl(string key, int expiryMinutes = 60)
        {
            var request = new Amazon.S3.Model.GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = key,
                Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
                Verb = Amazon.S3.HttpVerb.GET
            };
            return _s3Client.GetPreSignedURL(request);
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
