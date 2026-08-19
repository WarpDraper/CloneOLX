namespace Olx.BLL.Interfaces
{
    /// <summary>
    /// Thin abstraction over <see cref="ZiggyCreatures.Caching.Fusion.IFusionCache"/> so services
    /// depend on a small, purpose-built interface instead of the full FusionCache surface.
    /// Backed by a hybrid L1 (in-process memory) + L2 (distributed Redis) cache: reads are served
    /// from L1 when possible, fall through to L2, and only hit the factory (the database) on a
    /// full miss. Cache-stampede protection (only one factory execution per key, even under
    /// concurrent load) and fail-safe (serving a stale value instead of propagating a downstream
    /// failure) are handled transparently by the underlying FusionCache instance.
    /// </summary>
    public interface ICacheService
    {
        /// <summary>
        /// Returns the cached value for <paramref name="key"/> if present (L1 or L2); otherwise
        /// invokes <paramref name="factory"/> exactly once (even under concurrent callers for the
        /// same key), caches the result, and returns it. If <paramref name="duration"/> is not
        /// supplied, the registered default entry duration is used.
        /// </summary>
        Task<T> GetOrSetAsync<T>(
            string key,
            Func<CancellationToken, Task<T>> factory,
            TimeSpan? duration = null,
            CancellationToken cancellationToken = default);

        /// <summary>Evicts a single cache entry (both L1 and L2) so the next read repopulates it.</summary>
        Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    }
}
