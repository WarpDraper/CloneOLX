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
