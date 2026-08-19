using Microsoft.Extensions.DependencyInjection;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
using StackExchange.Redis;

namespace Olx.BLL.Services
{
    /// <summary>
    /// Redis-backed sibling of <see cref="ConnectionTracker"/>: same contract, but state lives on
    /// the dedicated SignalRRedis instance (shared with the SignalR backplane — see
    /// AddStackExchangeRedis in Program.cs) so presence is correct across every API instance
    /// behind the load balancer, not just the one instance that happens to hold the socket.
    /// Registered instead of <see cref="ConnectionTracker"/> only when
    /// ConnectionStrings:Redis:SignalR is configured (see
    /// OlxBLLServiceExtensions.AddOlxBLLServices); with no connection string, presence falls back
    /// to the single-instance in-memory tracker instead of the app failing to start.
    ///
    /// Deliberately uses StackExchange.Redis's *synchronous* API (not the *Async members):
    /// IConnectionTracker stays a sync interface because IsOnline/GetOnlineUserIds are called
    /// from tight foreach loops while stamping presence onto already-materialized DTO pages (see
    /// OnlineStatusExtensions) — turning that whole call chain async would mean an async ripple
    /// through AdvertService/UserService for what's meant to be a cheap, incidental lookup. Sync
    /// calls over StackExchange.Redis's multiplexed connection are officially supported for this
    /// kind of low-latency, high-frequency lookup: they block the calling thread only for the
    /// round-trip to Redis, not for another request's completion.
    /// </summary>
    public class RedisConnectionTracker([FromKeyedServices(RedisKeys.SignalR)] IConnectionMultiplexer redis) : IConnectionTracker
    {
        // Index set of every userId with at least one live connection, on ANY instance — lets
        // IsOnline/GetOnlineUserIds answer in a single round trip instead of scanning every
        // per-user connection set.
        private const string OnlineUsersKey = "presence:online-users";

        // Safety-net TTL only: refreshed on every AddConnection, so a normal disconnect (which
        // runs RemoveScript) cleans up immediately and this only matters if an instance crashes
        // hard enough to skip OnDisconnectedAsync entirely.
        private static readonly TimeSpan ConnectionSetTtl = TimeSpan.FromHours(24);

        private static string ConnectionsKey(int userId) => $"presence:connections:{userId}";

        // Atomically: record whether the set was empty before this add (i.e. "user was offline"),
        // add the connection, refresh the safety-net TTL, and — only on the offline->online
        // transition — add the user to the online-users index. Must be one script: a plain
        // SCARD-then-SADD from application code would race two connections from the same user
        // arriving concurrently (both could observe "was empty").
        private const string AddScript = @"
local wasEmpty = redis.call('SCARD', KEYS[1]) == 0
redis.call('SADD', KEYS[1], ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
if wasEmpty then redis.call('SADD', KEYS[2], ARGV[3]) end
return wasEmpty and 1 or 0";

        // Mirror of AddScript for the online->offline transition. Redis drops a set key entirely
        // once its last member is removed, so no explicit DEL is needed for the (now-empty)
        // per-user connections key.
        private const string RemoveScript = @"
redis.call('SREM', KEYS[1], ARGV[1])
local nowEmpty = redis.call('SCARD', KEYS[1]) == 0
if nowEmpty then redis.call('SREM', KEYS[2], ARGV[2]) end
return nowEmpty and 1 or 0";

        public bool AddConnection(int userId, string connectionId)
        {
            var result = (int)redis.GetDatabase().ScriptEvaluate(
                AddScript,
                new RedisKey[] { ConnectionsKey(userId), OnlineUsersKey },
                new RedisValue[] { connectionId, (long)ConnectionSetTtl.TotalMilliseconds, userId });
            return result == 1;
        }

        public bool RemoveConnection(int userId, string connectionId)
        {
            var result = (int)redis.GetDatabase().ScriptEvaluate(
                RemoveScript,
                new RedisKey[] { ConnectionsKey(userId), OnlineUsersKey },
                new RedisValue[] { connectionId, userId });
            return result == 1;
        }

        public bool IsOnline(int userId) =>
            redis.GetDatabase().SetContains(OnlineUsersKey, userId);

        public IReadOnlyCollection<int> GetOnlineUserIds() =>
            redis.GetDatabase().SetMembers(OnlineUsersKey)
                .Select(v => (int)v)
                .ToArray();
    }
}
