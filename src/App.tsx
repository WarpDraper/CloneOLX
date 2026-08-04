import './App.css'
import { Routes, Route, Navigate } from "react-router-dom";
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
import UpdateProfilePage from "./pages/account/EditAccountPage";
import AdvertDetailsPage from "./pages/advert/AdvertDetailsPage";
import SellerProfilePage from "./pages/profile/SellerProfilePage";
import CategoriesPage from "./pages/category/CategoriesPage";
import CategoryListingPage from "./pages/category/CategoryListingPage";
import ChatPage from "./pages/chat/ChatPage";
import FavoritesPage from "./pages/favorites/FavoritesPage";
import CreateAdvertPage from "./pages/advert/CreateAdvertPage";
import SettingsPage from "./pages/account/SettingsPage";
import CartPage from "./pages/cart/CartPage";


function App() {

  return (
    <>
        <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate replace to="/admin/users" />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            <Route element={<MainLayout />}>
              <Route path="/" element={<UserHomePage />} />
              <Route path="/profile" element={<UserProfilePage />} />
              <Route path="/advert/:id" element={<AdvertDetailsPage />} />
              <Route path="/profile/:sellerId" element={<SellerProfilePage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/category/:id" element={<CategoryListingPage />} />
              <Route path="/search" element={<CategoryListingPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/adverts/create" element={<CreateAdvertPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path={"/update-profile"} element={<UpdateProfilePage />} />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    </>
  )
}

export default App
