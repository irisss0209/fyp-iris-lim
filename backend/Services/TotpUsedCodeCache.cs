using System.Collections.Concurrent;

namespace backend.Services
{
    // Prevents TOTP code replay within the 90-second acceptance window (RFC 6238).
    // Singleton — survives for the application lifetime; entries self-expire after the window.
    public class TotpUsedCodeCache
    {
        private readonly ConcurrentDictionary<string, DateTime> _usedCodes = new();
        private long _lastCleanupTicks = DateTime.UtcNow.Ticks;
        private static readonly TimeSpan CodeWindow = TimeSpan.FromSeconds(90);
        private static readonly TimeSpan CleanupInterval = TimeSpan.FromMinutes(5);

        // Returns true if the code was NOT previously used (and marks it used).
        // Returns false if the exact (secret, code) pair was already accepted within the drift window.
        public bool TryMarkUsed(string base32Secret, string code)
        {
            CleanupIfNeeded();
            var key = $"{base32Secret}:{code}";
            return _usedCodes.TryAdd(key, DateTime.UtcNow.Add(CodeWindow));
        }

        private void CleanupIfNeeded()
        {
            var now = DateTime.UtcNow;
            var last = Interlocked.Read(ref _lastCleanupTicks);
            if (now.Ticks - last < CleanupInterval.Ticks) return;
            // Only one thread wins the cleanup slot; others skip.
            if (Interlocked.CompareExchange(ref _lastCleanupTicks, now.Ticks, last) != last) return;
            foreach (var kvp in _usedCodes.Where(kvp => kvp.Value < now).ToList())
                _usedCodes.TryRemove(kvp.Key, out _);
        }
    }
}
