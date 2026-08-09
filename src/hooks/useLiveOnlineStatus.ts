import { useSelector } from "react-redux";
import type { RootState } from "../store";

/**
 * Merges a REST snapshot (isOnline/lastSeen from OlxUserShortDto/OlxUserDto, computed once at
 * fetch time from IConnectionTracker) with any live SignalR UserOnline/UserOffline event seen
 * since this tab connected (see usePresenceHub -> store/presenceSlice). Falls back to the
 * snapshot until a live event for this exact userId arrives, so the badge is correct
 * immediately on load and stays correct afterwards without a refetch/poll.
 */
export function useLiveOnlineStatus(
    userId: number | null | undefined,
    initialIsOnline: boolean,
    initialLastSeen: string | null | undefined
): { isOnline: boolean; lastSeen: string | null } {
    const liveOnline = useSelector((state: RootState) =>
        userId != null ? state.presence.online[userId] : undefined
    );
    const liveLastSeen = useSelector((state: RootState) =>
        userId != null ? state.presence.lastSeen[userId] : undefined
    );

    return {
        isOnline: liveOnline ?? initialIsOnline,
        lastSeen: liveLastSeen ?? initialLastSeen ?? null,
    };
}
