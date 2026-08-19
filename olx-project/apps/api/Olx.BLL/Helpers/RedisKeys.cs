namespace Olx.BLL.Helpers
{
    /// <summary>
    /// DI keys for the <see cref="StackExchange.Redis.IConnectionMultiplexer"/> instances
    /// registered via <c>AddKeyedSingleton</c> — one per isolated Redis provider, so a spike on
    /// one (e.g. rate-limit checks on every request) can never compete for connections/eviction
    /// budget with another (SignalR presence, FusionCache's L2).
    ///
    /// SignalR/Limiter are registered in <c>OlxBLLServiceExtensions.AddOlxBLLServices</c> and are
    /// on the hot path (presence tracking, every request's rate-limit check). Cache is registered
    /// in Program.cs, right next to FusionCache's own (separate) connection to CacheRedis — it
    /// exists purely so <c>/health</c> has something to ping; because <c>AddKeyedSingleton</c>
    /// only connects lazily on first resolution, it costs nothing unless /health is actually
    /// called. FusionCache itself still talks to CacheRedis via
    /// <c>Microsoft.Extensions.Caching.StackExchangeRedis.RedisCache</c> and its own connection,
    /// since <c>IFusionCache</c> only ever needs the <c>IDistributedCache</c> abstraction.
    /// </summary>
    public static class RedisKeys
    {
        public const string Cache = "CacheRedis";
        public const string SignalR = "SignalRRedis";
        public const string Limiter = "LimiterRedis";
    }
}
