using Microsoft.Extensions.DependencyInjection;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using StackExchange.Redis;

namespace Olx.BLL.Services
{
    /// <summary>
    /// LimiterRedis-backed <see cref="IAdvertViewCounterService"/>: a single INCR per view, no
    /// per-advert TTL (counters are meant to persist for the advert's lifetime, not expire).
    /// Registered only when ConnectionStrings:Redis:Limiter is configured — see
    /// OlxBLLServiceExtensions.AddOlxBLLServices.
    /// </summary>
    public class RedisAdvertViewCounterService([FromKeyedServices(RedisKeys.Limiter)] IConnectionMultiplexer redis) : IAdvertViewCounterService
    {
        private static string Key(int advertId) => $"advert:views:{advertId}";

        public async Task<long> IncrementAsync(int advertId) =>
            await redis.GetDatabase().StringIncrementAsync(Key(advertId));

        public async Task<long> GetAsync(int advertId)
        {
            var value = await redis.GetDatabase().StringGetAsync(Key(advertId));
            return value.HasValue ? (long)value : 0;
        }
    }
}
