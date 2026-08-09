import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { APP_ENV } from "../env";
import { userCameOnline, userWentOffline } from "../store/presenceSlice";

// Дзеркалить Olx.BLL.Helpers.HubMethods (Presence-константи).
const HUB_METHODS = {
    UserOnline: "UserOnline",
    UserOffline: "UserOffline",
} as const;

/**
 * App-wide SignalR presence listener — mounted once (see MainLayout) whenever the user is
 * authenticated, independent of whatever page is open. Connects to the same {API_BASE_URL}/hub
 * as useChatHub (see MessageHub.cs), but only cares about UserOnline/UserOffline broadcasts
 * (see MessageHub.OnConnectedAsync/OnDisconnectedAsync + IConnectionTracker on the backend) so
 * "Онлайн" badges anywhere in the app (SellerWidget, SellerProfilePage, AdvertDetailsPage)
 * update live without a refetch.
 */
export function usePresenceHub() {
    const token = useSelector((state: RootState) => state.auth.token);
    const dispatch = useDispatch<AppDispatch>();

    useEffect(() => {
        if (!token) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${APP_ENV.API_BASE_URL}/hub`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .build();

        connection.on(HUB_METHODS.UserOnline, (userId: number) => {
            dispatch(userCameOnline({ userId }));
        });

        connection.on(HUB_METHODS.UserOffline, (userId: number, lastSeen: string) => {
            dispatch(userWentOffline({ userId, lastSeen }));
        });

        connection.start().catch((err) => console.error("Presence SignalR connection error:", err));

        return () => {
            connection.stop();
        };
    }, [token, dispatch]);
}
