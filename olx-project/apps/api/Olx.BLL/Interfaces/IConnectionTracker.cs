namespace Olx.BLL.Interfaces
{
    // In-memory SignalR presence registry. A user can have several live connections at once
    // (multiple browser tabs, mobile + desktop, a reconnect racing the old socket's close), so
    // "online" is tracked as a connection-id set per user rather than a single boolean/flag —
    // the user only goes offline once the LAST connection drops.
    public interface IConnectionTracker
    {
        /// <summary>Registers a new live connection for the user. Returns true if this is the
        /// user's first connection (i.e. they just became online).</summary>
        bool AddConnection(int userId, string connectionId);

        /// <summary>Removes a dropped connection. Returns true if that was the user's last
        /// connection (i.e. they just went offline).</summary>
        bool RemoveConnection(int userId, string connectionId);

        bool IsOnline(int userId);

        IReadOnlyCollection<int> GetOnlineUserIds();
    }
}
