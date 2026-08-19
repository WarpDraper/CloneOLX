using Olx.BLL.Interfaces;
using ZiggyCreatures.Caching.Fusion;

namespace Olx.BLL.Services
{
    /// <inheritdoc cref="ICacheService"/>
    public class CacheService(IFusionCache cache) : ICacheService
    {
        public async Task<T> GetOrSetAsync<T>(
            string key,
            Func<CancellationToken, Task<T>> factory,
            TimeSpan? duration = null,
            CancellationToken cancellationToken = default)
        {
            // IFusionCache's factory delegate is Func<FusionCacheFactoryExecutionContext<T>,
            // CancellationToken, Task<T>> — ICacheService intentionally exposes the simpler
            // Func<CancellationToken, Task<T>> instead so callers/mocks don't need to depend on
            // the FusionCache package directly, so adapt here by discarding the execution
            // context and forwarding just the cancellation token.
            //
            // Passing `factory` positionally (without adapting its shape first) doesn't fail to
            // bind against that delegate type — it fails SILENTLY: overload resolution instead
            // matches FusionCache's `GetOrSetAsync<TValue>(key, TValue defaultValue, ...)`
            // overload, with TValue inferred as the delegate type itself
            // (Func<CancellationToken, Task<T>>), which is what produced the confusing CS0029
            // "Task<Func<CancellationToken, Task<T>>> cannot convert to Task<T>" error.
            return await cache.GetOrSetAsync<T>(
                key,
                async (_, ct) => await factory(ct),
                options =>
                {
                    if (duration.HasValue)
                    {
                        options.SetDuration(duration.Value);
                    }
                },
                cancellationToken);
        }

        public Task RemoveAsync(string key, CancellationToken cancellationToken = default) =>
            cache.RemoveAsync(key, token: cancellationToken).AsTask();
    }
}
