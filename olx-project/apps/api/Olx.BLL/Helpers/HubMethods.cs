
namespace Olx.BLL.Helpers
{
    public static class HubMethods
    {
        public const string ReceiveChatMessage = "ReceiveChatMessage";
        public const string DeleteChat = "DeleteChat";
        public const string CreateChat = "CreateChat";
        public const string ReceiveAdminMessage = "ReceiveMessageFromAdmin";
        public const string ReceiveUserMessage = "ReceiveMessageFromUser";
        public const string SetReaded = "SetMessageReaded";
        public const string SetChatMessageReaded = "SetChatMessageReaded";
        public const string AdminDeleteAdvert = "AdminDeleteAdvert";
        public const string AdminLockAdvert = "AdminLockAdvert";
        public const string AdminRemoveAccount = "AdminRemoveAccount";
        public const string AdminLockAccount = "AdminLockAccount";
        // Presence — broadcast to every connected client whenever a user's live-connection
        // count goes 0 -> 1 (came online) or 1 -> 0 (went offline). Payload: (int userId, string
        // lastSeenIso). See MessageHub.OnConnectedAsync/OnDisconnectedAsync.
        public const string UserOnline = "UserOnline";
        public const string UserOffline = "UserOffline";
    }
}

