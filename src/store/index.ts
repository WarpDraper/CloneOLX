import { configureStore } from '@reduxjs/toolkit';
import notificationReducer from './notificationSlice';
import cartReducer from './cartSlice';
import {accountService} from "../services/accountService.ts";
import authReducer from "../Slice/authSlice.ts";
import {adminService} from "../services/adminService.ts";
import {reportService} from "../services/reportService.ts";
import {advertService} from "../services/advertService.ts";
import {profileService} from "../services/profileService.ts";
import {filterService} from "../services/filterService.ts";
import {categoryService} from "../services/categoryService.ts";
import {chatService} from "../services/chatService.ts";
import {newPostService} from "../services/newPostService.ts";
import {orderService} from "../services/orderService.ts";

export const store = configureStore({

  reducer: {
      [accountService.reducerPath]: accountService.reducer,
      [adminService.reducerPath]: adminService.reducer,
      [reportService.reducerPath]: reportService.reducer,
      [advertService.reducerPath]: advertService.reducer,
      [profileService.reducerPath]: profileService.reducer,
      [filterService.reducerPath]: filterService.reducer,
      [categoryService.reducerPath]: categoryService.reducer,
      [chatService.reducerPath]: chatService.reducer,
      [newPostService.reducerPath]: newPostService.reducer,
      [orderService.reducerPath]: orderService.reducer,
      auth: authReducer,

      notifications: notificationReducer,
      cart: cartReducer,


  },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        .concat(
            accountService.middleware,
            adminService.middleware,
            reportService.middleware,
            advertService.middleware,
            profileService.middleware,
            filterService.middleware,
            categoryService.middleware,
            chatService.middleware,
            newPostService.middleware,
            orderService.middleware,
        ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


