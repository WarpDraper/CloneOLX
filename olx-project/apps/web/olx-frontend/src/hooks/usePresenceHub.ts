import { useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store";
import { APP_ENV } from "../env";
import { userCameOnline, userWentOffline } from "../store/presenceSlice";
import { logout } from "../Slice/authSlice";
import { isTokenExpired } from "../utils/tokenUtils";

// Дзеркалить Olx.BLL.Helpers.HubMethods (Presence-константи).
const HUB_METHODS = {
    UserOnline: "UserOnline",
    UserOffline: "UserOffline",
} as const;

// SignalR surfaces an unmount-during-negotiation cancellation either as `err.name ===
// "AbortError"` or (depending on transport/browser) as a plain Error whose message contains
// this text — both mean "we tore down the connection while .start() was still negotiating" and
// are expected/harmless, not a real connection failure.
const isNegotiationAbortError = (err: unknown): boolean => {
    const e = err as { name?: string; message?: string } | undefined;
    return e?.name === "AbortError" || /stopped during negotiation/i.test(String(e?.message ?? ""));
};

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
        // A present-but-expired/invalid token (stale localStorage, backend JWT key rotated,
        // ...) must not attempt to connect either — the API rejects it at /hub/negotiate with a
        // 401 every time. Bail out the same as "no token" and clear the dead session so other
        // guarded requests (favorites, etc.) stop firing too.
        if (!token) return;
        if (isTokenExpired(token)) {
            dispatch(logout());
            return;
        }

        // See useChatHub.ts for why `cancelled` + swallowing AbortError matters: unmounting
        // (route change, React StrictMode's dev-mode double-invoke, fast token swap) while
        // `.start()` is still negotiating makes `.stop()` cancel it, which rejects with
        // `AbortError: The connection was stopped during negotiation.` — expected, not a real
        // failure, and must never hit console.error or go unhandled.
        let cancelled = false;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${APP_ENV.API_BASE_URL}/hub`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            // SignalR's own internal logger writes the "connection was stopped during
            // negotiation" warning straight to the browser console on every fast
            // unmount/remount (route change, React StrictMode's dev double-invoke) — that case
            // is already handled and swallowed explicitly below via isNegotiationAbortError, so
            // this is pure noise, not a signal. LogLevel.None silences the library's own
            // console output; console.error calls we make ourselves further down still fire.
            .configureLogging(signalR.LogLevel.None)
            .build();

        connection.on(HUB_METHODS.UserOnline, (userId: number) => {
            dispatch(userCameOnline({ userId }));
        });

        connection.on(HUB_METHODS.UserOffline, (userId: number, lastSeen: string) => {
            dispatch(userWentOffline({ userId, lastSeen }));
        });

        // Only ever start a fresh, still-Disconnected connection for an authenticated user —
        // guards against a stray double-invoke (React StrictMode, a re-run effect) trying to
        // .start() a connection that's already connecting/connected, which SignalR rejects.
        if (token && !isTokenExpired(token) && connection.state === signalR.HubConnectionState.Disconnected) {
            connection
                .start()
                .then(() => {
                    if (cancelled) {
                        return connection.stop().catch(() => undefined);
                    }
                    return undefined;
                })
                .catch((err) => {
                    if (cancelled || isNegotiationAbortError(err)) return;

                    // The token passed every client-side check above but the server still rejected
                    // the handshake (401/Unauthorized) — e.g. the JWT signing key rotated after this
                    // token was issued. Clear the dead session instead of logging a scary error:
                    // this is an expected consequence of an invalid token, not an unexpected failure.
                    const message = String(err?.message ?? err ?? "");
                    const isUnauthorized = err?.statusCode === 401 || /unauthorized|401/i.test(message);
                    if (isUnauthorized) {
                        dispatch(logout());
                        return;
                    }

                    console.error("Presence SignalR connection error:", err);
                });
        }

        return () => {
            cancelled = true;
            // Always catch — stopping mid-negotiation rejects with AbortError, which would
            // otherwise surface as an unhandled promise rejection in the console.
            connection.stop().catch(() => undefined);
        };
    }, [token, dispatch]);
}
