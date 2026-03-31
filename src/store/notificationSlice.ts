import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  showPopup: boolean;
}

interface NotificationState {
  items: NotificationItem[];
}

const initialState: NotificationState = {
  items: [
    {
      id: '1',
      type: 'info',
      title: 'Ласкаво просимо!',
      message: 'Дякуємо, що приєдналися до OLX Clone.',
      read: false,
      createdAt: new Date().toISOString(),
      showPopup: false 
    }
  ],
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (
      state,
      action: PayloadAction<Omit<NotificationItem, 'id' | 'read' | 'createdAt' | 'showPopup'>>
    ) => {
      state.items.unshift({
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        read: false,
        createdAt: new Date().toISOString(),
        showPopup: true,
      });
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find(n => n.id === action.payload);
      if (item) item.read = true;
    },
    markAllAsRead: (state) => {
      state.items.forEach(n => n.read = true);
    },
    clearPopupFlag: (state, action: PayloadAction<string>) => {
       const item = state.items.find(n => n.id === action.payload);
       if (item) item.showPopup = false;
    },
    clearNotifications: (state) => {
      state.items = [];
    }
  },
});

export const { addNotification, markAsRead, markAllAsRead, clearPopupFlag, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
