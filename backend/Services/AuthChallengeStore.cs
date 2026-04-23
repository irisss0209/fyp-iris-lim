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
        }

        private readonly ConcurrentDictionary<string, ChallengeEntry> _entries = new();

        public (string ChallengeId, string Code, DateTime ExpiresAtUtc) Create(string userId, TimeSpan ttl)
        {
            var challengeId = Guid.NewGuid().ToString("N");
            var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            var expiresAt = DateTime.UtcNow.Add(ttl);

            _entries[challengeId] = new ChallengeEntry
            {
                UserId = userId,
                Code = code,
                ExpiresAtUtc = expiresAt
            };

            return (challengeId, code, expiresAt);
        }

        public bool VerifyAndConsume(string challengeId, string userId, string submittedCode)
        {
            if (!_entries.TryGetValue(challengeId, out var entry))
            {
                return false;
            }

            if (entry.ExpiresAtUtc < DateTime.UtcNow || !string.Equals(entry.UserId, userId, StringComparison.Ordinal))
            {
                _entries.TryRemove(challengeId, out _);
                return false;
            }

            var ok = string.Equals(entry.Code, submittedCode, StringComparison.Ordinal);
            if (ok)
            {
                _entries.TryRemove(challengeId, out _);
            }
            return ok;
        }
    }
}
