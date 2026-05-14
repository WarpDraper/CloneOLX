import { configureStore } from '@reduxjs/toolkit';
import notificationReducer from './notificationSlice';
import {accountService} from "../services/accountService.ts";
import authReducer from "../Slice/authSlice.ts";
import {adminService} from "../services/adminService.ts";

export const store = configureStore({

  reducer: {
      [accountService.reducerPath]: accountService.reducer,
      [adminService.reducerPath]: adminService.reducer,
      auth: authReducer,

      notifications: notificationReducer,


  },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        .concat(accountService.middleware, adminService.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


