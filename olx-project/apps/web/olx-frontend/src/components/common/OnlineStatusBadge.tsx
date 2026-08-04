import React from "react";
import { isUserOnline } from "../../utils/onlineStatus";

interface OnlineStatusBadgeProps {
    lastActivity: string | null | undefined;
}

const OnlineStatusBadge: React.FC<OnlineStatusBadgeProps> = ({ lastActivity }) => {
    const online = isUserOnline(lastActivity);
    return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500" : "bg-gray-300"}`} />
            {online ? "Онлайн" : "Офлайн"}
        </span>
    );
};

export default OnlineStatusBadge;
