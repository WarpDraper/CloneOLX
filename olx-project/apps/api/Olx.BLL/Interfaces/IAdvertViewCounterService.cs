namespace Olx.BLL.Interfaces
{
    /// <summary>
    /// Fast, best-effort hit counters for advert detail views. Deliberately NOT the source of
    /// truth for anything and never written to the database per view — a traffic spike on a
    /// popular advert would otherwise become a spike of UPDATE statements against Postgres.
    /// Backed by the isolated LimiterRedis instance (see the multi-Redis architecture split in
    /// OlxBLLServiceExtensions) so view-counting traffic can't compete with FusionCache's L2
    /// (CacheRedis) or the SignalR backplane/presence (SignalRRedis) for connection or eviction
    /// budget.
    /// </summary>
    public interface IAdvertViewCounterService
    {
        /// <summary>Atomically increments and returns the new view count for the advert.</summary>
        Task<long> IncrementAsync(int advertId);

        /// <summary>Current view count, or 0 if the advert has never been viewed (or counters
        /// were reset — e.g. process restart when running the in-memory fallback).</summary>
        Task<long> GetAsync(int advertId);
    }
}
