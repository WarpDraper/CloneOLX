import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";

// Guards any route that requires a signed-in user (own profile, settings, account pages, ...).
// Mirrors RequireAdmin.tsx's approach: redirect BEFORE the protected page (and anything it would
// mount — data queries, forms, etc.) ever renders, instead of letting the page mount first and
// bail out from inside its own useEffect. The latter is what let an unauthenticated visitor
// briefly see/mount UserProfilePage/SettingsPage (and fire their queries) before being bounced.
//
// Checks BOTH isAuth and the token itself: isAuth without a token (or vice versa) shouldn't
// happen given how authSlice/setAuth/logout keep them in lockstep, but this is the one guard
// standing between an inconsistent state and a protected page fully mounting, so it treats
// either being missing as "not authenticated" rather than trusting isAuth alone.
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuth, token } = useSelector((state: RootState) => state.auth);
    const location = useLocation();

    if (!isAuth || !token) {
        // Preserve where the user was headed so LoginForm's `state.from` handling (see
        // LoginForm.tsx) can send them back here after a successful login, instead of always
        // landing on "/".
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
