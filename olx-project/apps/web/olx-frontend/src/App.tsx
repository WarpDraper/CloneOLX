import './App.css'
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { RootState } from "./store";
import { syncCartOwner } from "./store/cartSlice";
import { clearNotifications } from "./store/notificationSlice";
import NotificationManager from "./components/common/NotificationManager";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoginPage from "./pages/account/LoginPage";
import RegisterPage from "./pages/account/RegisterPage";
import ForgotPasswordPage from "./pages/account/ForgotPasswordPage";
import ResetPasswordPage from "./pages/account/ResetPasswordPage";
import UserHomePage from "./pages/user/UserHomePage";
import UserProfilePage from "./pages/user/UserProfilePage";
import NotFoundPage from "./pages/common/NotFoundPage";
import MainLayout from "./layout/main/MainLayout";
import AdminLayout from "./layout/admin/AdminLayout";
import UsersPage from "./pages/admin/UsersPage";
import ReportsPage from "./pages/admin/ReportsPage";
import OverviewPage from "./pages/admin/OverviewPage";
import AdminOrdersPage from "./pages/admin/OrdersPage";
import AdminProductsPage from "./pages/admin/ProductsPage";
import AdminCategoriesPage from "./pages/admin/CategoriesPage";
import SellersPage from "./pages/admin/SellersPage";
import AdminChatsPage from "./pages/admin/ChatsPage";
import AdminNewsletterPage from "./pages/admin/NewsletterPage";
import ComingSoonPage from "./pages/admin/ComingSoonPage";
import AdvertDetailsPage from "./pages/advert/AdvertDetailsPage";
import SoldAdvertPage from "./pages/advert/SoldAdvertPage";
import SellerProfilePage from "./pages/profile/SellerProfilePage";
import CategoriesPage from "./pages/category/CategoriesPage";
import CategoryListingPage from "./pages/category/CategoryListingPage";
import ChatPage from "./pages/chat/ChatPage";
import NotificationsPage from "./pages/NotificationsPage";
import FavoritesPage from "./pages/favorites/FavoritesPage";
import CreateAdvertPage from "./pages/advert/CreateAdvertPage";
import SettingsPage from "./pages/account/SettingsPage";
import CartPage from "./pages/cart/CartPage";
import SecurityPage from "./pages/info/SecurityPage";
import DeliveryRulesPage from "./pages/info/DeliveryRulesPage";
import DeliverySafetyPage from "./pages/info/DeliverySafetyPage";
import HelpCenterPage from "./pages/info/HelpCenterPage";
import AboutPage from "./pages/info/AboutPage";
import TermsPage from "./pages/info/TermsPage";
import AppComingSoonPage from "./pages/app/AppComingSoonPage";
import PackagesPage from "./pages/packages/PackagesPage";
import ScrollToTop from "./components/common/ScrollToTop";
import RequireAdmin from "./components/common/RequireAdmin";


function App() {
    const dispatch = useDispatch();
    const location = useLocation();
    const userId = useSelector((state: RootState) => (state.auth.isAuth ? state.auth.user?.id ?? null : null));

    // Keeps the local cart scoped to whoever is currently signed in. Runs on every auth change
    // (login, register, Google auth, logout) and drops any leftover cart items from a previous
    // account on this browser so a newly registered/logged-in user always starts with [].
    useEffect(() => {
        dispatch(syncCartOwner(userId));
    }, [dispatch, userId]);

    // Global error-toast queue (notificationSlice, fed by createBaseQuery) must never carry over
    // across a route change — e.g. a stray 403/backend-unreachable toast queued on one page
    // should not still be sitting there (or pop up) after the user has already navigated
    // somewhere else. Skips the very first render (prevRef starts equal to the initial pathname)
    // so it only clears on an actual transition, not on mount.
    const prevPathnameRef = useRef(location.pathname);
    useEffect(() => {
        if (prevPathnameRef.current !== location.pathname) {
            prevPathnameRef.current = location.pathname;
            dispatch(clearNotifications());
        }
    }, [location.pathname, dispatch]);

  return (
    <>
        <ScrollToTop />
        {/* Mounted once, outside <Routes>, so it's never torn down/remounted by a route change —
            see MainLayout.tsx for why that used to cause queued toasts to flood on arrival. */}
        <NotificationManager />
        <Routes>
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<OverviewPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="sellers" element={<SellersPage />} />
              <Route path="chats" element={<AdminChatsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="analytics" element={<ComingSoonPage title="Аналітика" />} />
              <Route path="marketing" element={<AdminNewsletterPage />} />
              <Route path="settings" element={<ComingSoonPage title="Налаштування" />} />
            </Route>

            <Route element={<MainLayout />}>
              <Route path="/" element={<UserHomePage />} />
              {/* Own profile/account — requires auth. NOT /profile/:sellerId below, which is
                  the public seller-listing page ([AllowAnonymous] on the backend, see
                  profileService.ts) and must stay reachable by guests. */}
              <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
              <Route path="/advert/sold/:id" element={<SoldAdvertPage />} />
              <Route path="/advert/:id" element={<AdvertDetailsPage />} />
              <Route path="/profile/:sellerId" element={<SellerProfilePage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/category/:id" element={<CategoryListingPage />} />
              <Route path="/search" element={<CategoryListingPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/adverts/create" element={<CreateAdvertPage />} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/delivery-rules" element={<DeliveryRulesPage />} />
              <Route path="/delivery-safety" element={<DeliverySafetyPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/services" element={<HelpCenterPage />} />
              <Route path="/info" element={<HelpCenterPage />} />
              <Route path="/partners" element={<HelpCenterPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/app-coming-soon" element={<AppComingSoonPage />} />
              <Route path="/packages" element={<PackagesPage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* Legacy route: EditAccountPage posted JSON to a mismatched /edit/user shape and
                404'd. Redirect to /settings, which is the correct working profile-edit page
                (POST /api/account/edit/user as multipart/form-data via useEditUserMutation). */}
            <Route path={"/update-profile"} element={<Navigate replace to="/settings" />} />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    </>
  )
}

export default App
