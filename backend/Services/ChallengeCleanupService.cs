namespace backend.Services
{
    public class ChallengeCleanupService : BackgroundService
    {
        private readonly AuthChallengeStore _store;
        private readonly ILogger<ChallengeCleanupService> _logger;
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        public ChallengeCleanupService(AuthChallengeStore store, ILogger<ChallengeCleanupService> logger)
        {
            _store = store;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(Interval, stoppingToken);
                var removed = _store.RemoveExpired();
                if (removed > 0)
                    _logger.LogDebug("ChallengeCleanup: evicted {Count} expired challenge entries", removed);
            }
        }
    }
}
