using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace backend.Services
{
    public class AuthChallengeStore
    {
        private sealed class ChallengeEntry
        {
            public required string UserId { get; init; }
            public required string Code { get; init; }
            public required DateTime ExpiresAtUtc { get; init; }
            public string? Metadata { get; set; }
        }

        private readonly ConcurrentDictionary<string, ChallengeEntry> _entries = new();
        private readonly ILogger<AuthChallengeStore> _logger;

        public AuthChallengeStore(ILogger<AuthChallengeStore> logger)
        {
            _logger = logger;
        }

        public (string ChallengeId, string Code, DateTime ExpiresAtUtc) Create(string userId, TimeSpan ttl, string? metadata = null)
        {
            var challengeId = Guid.NewGuid().ToString("N");
            var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            var expiresAt = DateTime.UtcNow.Add(ttl);

            _entries[challengeId] = new ChallengeEntry
            {
                UserId = userId,
                Code = code,
                ExpiresAtUtc = expiresAt,
                Metadata = metadata
            };

            return (challengeId, code, expiresAt);
        }

        public string? GetMetadata(string challengeId)
        {
            if (_entries.TryGetValue(challengeId, out var entry))
            {
                return entry.Metadata;
            }
            return null;
        }

        public string? GetUserId(string challengeId)
        {
            if (_entries.TryGetValue(challengeId, out var entry))
            {
                if (entry.ExpiresAtUtc < DateTime.UtcNow)
                {
                    _entries.TryRemove(challengeId, out _);
                    return null;
                }
                return entry.UserId;
            }
            return null;
        }

        public (bool IsValid, string? Metadata) VerifyAndConsume(string challengeId, string userId, string submittedCode)
        {
            if (!_entries.TryGetValue(challengeId, out var entry))
            {
                _logger.LogWarning("Challenge ID {ChallengeId} not found", challengeId);
                return (false, null);
            }

            if (entry.ExpiresAtUtc < DateTime.UtcNow)
            {
                _logger.LogWarning("Challenge {ChallengeId} expired at {ExpiresAt}", challengeId, entry.ExpiresAtUtc);
                _entries.TryRemove(challengeId, out _);
                return (false, null);
            }

            if (!string.Equals(entry.UserId, userId, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Challenge {ChallengeId} user ID mismatch for user {UserId}", challengeId, userId);
                _entries.TryRemove(challengeId, out _);
                return (false, null);
            }

            var ok = string.Equals(entry.Code.Trim(), submittedCode.Trim(), StringComparison.Ordinal);
            if (!ok)
            {
                _logger.LogWarning("OTP code mismatch for user {UserId} on challenge {ChallengeId}", userId, challengeId);
            }

            string? metadata = null;
            if (ok)
            {
                metadata = entry.Metadata;
                _entries.TryRemove(challengeId, out _);
            }
            return (ok, metadata);
        }
    }
}
