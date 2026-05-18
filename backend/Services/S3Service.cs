using Amazon;
using Amazon.S3;
using Amazon.S3.Transfer;
using Microsoft.AspNetCore.Http;

namespace backend.Services
{
    public class S3Service : IS3Service
    {
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;
        private readonly string _region;
        private readonly ILogger<S3Service> _logger;

        public S3Service(IConfiguration config, ILogger<S3Service> logger)
        {
            _logger = logger;
            _region = config["AWS:Region"] ?? "ap-southeast-1";
            _bucketName = config["AWS:BucketName"] ?? "railly";
            _s3Client = new AmazonS3Client(RegionEndpoint.GetBySystemName(_region));
            _logger.LogInformation("[S3] Initialized — bucket: {Bucket}, region: {Region}", _bucketName, _region);
        }

        public async Task<string> UploadFileAsync(IFormFile file, string folderName)
        {
            try
            {
                var fileName = $"{folderName}/{Guid.NewGuid()}_{file.FileName}";

                using var stream = file.OpenReadStream();
                var uploadRequest = new TransferUtilityUploadRequest
                {
                    InputStream = stream,
                    Key = fileName,
                    BucketName = _bucketName
                };

                var fileTransferUtility = new TransferUtility(_s3Client);
                await fileTransferUtility.UploadAsync(uploadRequest);

                return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{fileName}";
            }
            catch (AmazonS3Exception e)
            {
                _logger.LogError("[S3] AWS error {Code}: {Message}", e.ErrorCode, e.Message);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[S3] Upload failed");
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
                };

                var fileTransferUtility = new TransferUtility(_s3Client);
                await fileTransferUtility.UploadAsync(uploadRequest);

                return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{key}";
            }
            catch (AmazonS3Exception e)
            {
                _logger.LogError("[S3] AWS error {Code}: {Message}", e.ErrorCode, e.Message);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[S3] Upload failed");
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
                _logger.LogError(ex, "[S3] Delete failed for {Url}", fileUrl);
                return false;
            }
        }
    }
}
