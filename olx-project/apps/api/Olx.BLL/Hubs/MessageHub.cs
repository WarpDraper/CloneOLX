using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Olx.BLL.Entities;
using Olx.BLL.Helpers;
using Olx.BLL.Interfaces;
namespace Olx.BLL.Hubs
{
    [Authorize]
    public class MessageHub(
        UserManager<OlxUser> userManager,
        IConnectionTracker connectionTracker,
        ILogger<MessageHub> logger) : Hub
    {
        private async Task<bool> _isAdmin()
        {
            var userName = Context.User?.Identity?.Name
            ?? throw new Exception();
            var user = await userManager.FindByIdAsync(userName)
                ?? throw new Exception();
            return await userManager.IsInRoleAsync(user, Roles.Admin);
        }

        // NameClaimType is configured to ClaimTypes.NameIdentifier (see JWT bearer setup in
        // OlxApiServiceExtensions), so Identity.Name here is the numeric OlxUser.Id, same as
        // _isAdmin() above relies on.
        private int? _currentUserId() =>
            int.TryParse(Context.User?.Identity?.Name, out var id) ? id : null;

        public async Task Connect()
        {
            if (await _isAdmin())
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
                logger.LogInformation("----------------- Admin SignalR connected ----------------------");
            }
            else
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "Users");
                logger.LogInformation("----------------- User  SignalR connected ----------------------");
            }

        }

        public async Task Disconnect()
        {
            // Group removal goes through the Redis backplane (SendGroupActionAndWaitForAck),
            // which waits on an ack from every server instance. If Redis is slow/unreachable or
            // the underlying connection has already dropped (abrupt client disconnect), that wait
            // is cancelled and throws TaskCanceledException/OperationCanceledException. Letting
            // that bubble up crashes DefaultHubDispatcher's invocation of this method, so we catch
            // and log instead — group membership is moot anyway once the connection is gone.
            try
            {
                if (await _isAdmin())
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, "Admins");
                    logger.LogInformation("----------------- Admin SignalR disconnected ----------------------");
                }
                else
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, "Users");
                    logger.LogInformation("----------------- User SignalR disconnected ----------------------");
                }
            }
            catch (OperationCanceledException ex)
            {
                logger.LogWarning(ex, "Disconnect: group removal for connection {ConnectionId} was canceled (Redis backplane timeout or connection already closed).", Context.ConnectionId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Disconnect: failed to remove connection {ConnectionId} from its group.", Context.ConnectionId);
            }
        }

        // Presence: fires on every raw connection open/close (unlike Connect()/Disconnect()
        // above, which are only invoked if/when the client explicitly calls them), so this is
        // the reliable place to track "is this user's socket actually alive right now" —
        // including ungraceful drops (closed tab, lost network), which OnDisconnectedAsync
        // still receives from the SignalR transport.
        public override async Task OnConnectedAsync()
        {
            var userId = _currentUserId();
            if (userId is not null && connectionTracker.AddConnection(userId.Value, Context.ConnectionId))
            {
                // 0 -> 1 connections: user just came online.
                await Clients.All.SendAsync(HubMethods.UserOnline, userId.Value);
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            try
            {
                var userId = _currentUserId();
                if (userId is not null && connectionTracker.RemoveConnection(userId.Value, Context.ConnectionId))
                {
                    // Last live connection dropped — persist the real "last seen" moment (not just
                    // the last login) and tell everyone else this user just went offline.
                    var user = await userManager.FindByIdAsync(userId.Value.ToString());
                    if (user is not null)
                    {
                        user.LastActivity = DateTime.UtcNow;
                        await userManager.UpdateAsync(user);
                    }
                    await Clients.All.SendAsync(HubMethods.UserOffline, userId.Value, DateTime.UtcNow);
                }
            }
            catch (OperationCanceledException ex)
            {
                // Redis backplane broadcast (Clients.All.SendAsync) or ack wait was canceled —
                // most likely the connection dropped mid-cleanup. Not fatal: swallow and log.
                logger.LogWarning(ex, "OnDisconnectedAsync: presence cleanup for connection {ConnectionId} was canceled.", Context.ConnectionId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "OnDisconnectedAsync: presence cleanup failed for connection {ConnectionId}.", Context.ConnectionId);
            }

            // Always let the base implementation run so SignalR itself can finish tearing down
            // the connection, even if our own cleanup above failed.
            try
            {
                await base.OnDisconnectedAsync(exception);
            }
            catch (OperationCanceledException ex)
            {
                logger.LogWarning(ex, "OnDisconnectedAsync: base cleanup for connection {ConnectionId} was canceled.", Context.ConnectionId);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "OnDisconnectedAsync: base cleanup failed for connection {ConnectionId}.", Context.ConnectionId);
            }
        }
    }
}
