using System.Collections.Concurrent;
using Olx.BLL.Interfaces;

namespace Olx.BLL.Services
{
    // Singleton (process-lifetime, in-memory) — deliberately NOT persisted/scoped, since
    // presence only ever needs to answer "is there a live SignalR connection right now".
    // Registered via services.AddSingleton<IConnectionTracker, ConnectionTracker>() in
    // OlxBLLServiceExtensions so the same instance is shared across every Hub instance
    // (SignalR creates a new Hub per invocation) and every request-scoped service that
    // reads IsOnline (UserService/AdvertService).
    public class ConnectionTracker : IConnectionTracker
    {
        private readonly ConcurrentDictionary<int, ConcurrentDictionary<string, byte>> _connectionsByUser = new();

        public bool AddConnection(int userId, string connectionId)
        {
            var connections = _connectionsByUser.GetOrAdd(userId, _ => new ConcurrentDictionary<string, byte>());
            var wasEmpty = connections.IsEmpty;
            connections[connectionId] = 0;
            return wasEmpty;
        }

        public bool RemoveConnection(int userId, string connectionId)
        {
            if (!_connectionsByUser.TryGetValue(userId, out var connections))
                return false;

            connections.TryRemove(connectionId, out _);
            if (!connections.IsEmpty)
                return false;

            // Last connection for this user — drop the (now-empty) bucket so GetOnlineUserIds
            // and IsOnline don't have to skip over empty entries forever.
            _connectionsByUser.TryRemove(userId, out _);
            return true;
        }

        public bool IsOnline(int userId) =>
            _connectionsByUser.TryGetValue(userId, out var connections) && !connections.IsEmpty;

        public IReadOnlyCollection<int> GetOnlineUserIds() =>
            _connectionsByUser.Keys.ToArray();
    }
}
