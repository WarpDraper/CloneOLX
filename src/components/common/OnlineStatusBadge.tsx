import React from "react";
import { useTranslation } from "react-i18next";
import { useLiveOnlineStatus } from "../../hooks/useLiveOnlineStatus";
import { formatLastSeen, isUserOnline } from "../../utils/onlineStatus";

interface OnlineStatusBadgeProps {
    /** Seller's user id — required to subscribe to live SignalR presence updates. */
    userId?: number | null;
    /** IConnectionTracker snapshot from the REST response (OlxUserShortDto.isOnline). */
    isOnline?: boolean;
    /** OlxUserShortDto.lastSeen — mirrors LastActivity, refreshed on real disconnect. */
    lastSeen?: string | null;
    /** Legacy fallback for seed-hydrated data that has no real presence signal at all. */
    lastActivity?: string | null;
}

// Онлайн ТІЛЬКИ якщо є живе SignalR-з'єднання (isOnline, з IConnectionTracker — див.
// MessageHub.OnConnectedAsync/OnDisconnectedAsync), інакше — "Був(ла) в мережі {lastSeen}".
const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({ userId, isOnline, lastSeen, lastActivity }) => {
    const { t } = useTranslation();
    const hasRealPresence = isOnline !== undefined;
    const live = useLiveOnlineStatus(userId, isOnline ?? false, lastSeen ?? lastActivity ?? null);

    const online = hasRealPresence ? live.isOnline : isUserOnline(lastActivity);
    const statusText = online ? t('onlineStatus.online') : formatLastSeen(hasRealPresence ? live.lastSeen : lastActivity);

    return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-gray-300"}`} />
            {statusText}
        </span>
    );
};

export default OnlineStatusBadge;
