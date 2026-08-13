import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

// Guards the /admin/* route tree. Without this, AdminLayout and every admin page mounted
// straight into App.tsx's routes regardless of role — a guest (or a signed-in non-admin user)
// landing on /admin got the full admin shell rendered, which immediately fired
// GET /api/Admin/users, /api/AdminMessage/get/admin, /api/Admin/dashboard/overview and logged
// three 401s to the console. Redirect anyone who isn't an authenticated Admin before any of
// that mounts.
const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuth, user } = useSelector((state: RootState) => state.auth);

    if (!isAuth) return <Navigate to="/login" replace />;
    if (user?.role !== "Admin") return <Navigate to="/" replace />;

    return <>{children}</>;
};

export default RequireAdmin;
