import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Live overrides received over SignalR (UserOnline/UserOffline, see HubMethods.cs) since this
// tab connected — sparse by design. Absence of a userId here just means "no live event seen
// yet"; callers fall back to whatever isOnline/lastSeen the REST response already carried
// (see useLiveOnlineStatus).
interface PresenceState {
    online: Record<number, boolean>;
    lastSeen: Record<number, string>;
}

const initialState: PresenceState = {
    online: {},
    lastSeen: {},
};

const presenceSlice = createSlice({
    name: "presence",
    initialState,
    reducers: {
        userCameOnline(state, action: PayloadAction<{ userId: number }>) {
            state.online[action.payload.userId] = true;
        },
        userWentOffline(state, action: PayloadAction<{ userId: number; lastSeen: string }>) {
            state.online[action.payload.userId] = false;
            state.lastSeen[action.payload.userId] = action.payload.lastSeen;
        },
    },
});

export const { userCameOnline, userWentOffline } = presenceSlice.actions;
export default presenceSlice.reducer;
