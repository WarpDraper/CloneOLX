using System.Collections.Concurrent;
using Olx.BLL.Interfaces;

namespace Olx.BLL.Services
{
    /// <summary>
    /// Single-instance fallback for <see cref="IAdvertViewCounterService"/>, used when
    /// ConnectionStrings:Redis:Limiter isn't configured. Counts are per-process (reset on
    /// restart, not shared across instances behind a load balancer) but the feature keeps
    /// working instead of the app failing to start without LimiterRedis.
    /// </summary>
    public class InMemoryAdvertViewCounterService : IAdvertViewCounterService
    {
        private readonly ConcurrentDictionary<int, long> _counts = new();

        public Task<long> IncrementAsync(int advertId) =>
            Task.FromResult(_counts.AddOrUpdate(advertId, 1, (_, current) => current + 1));

        public Task<long> GetAsync(int advertId) =>
            Task.FromResult(_counts.GetValueOrDefault(advertId));
    }
}
