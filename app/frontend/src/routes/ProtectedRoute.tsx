import { ReactElement, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

interface ProtectedRouteProps {
    role: string;
    children: ReactElement;
}

/** Replaces the old inline requireRole() guards from index.tsx — same check
 * (sessionStorage pe_user.role), plus it re-syncs the Zustand auth slice on
 * every route entry so store-backed consumers see a fresh session right
 * after Landing.tsx's login flow navigates here. */
export default function ProtectedRoute({ role, children }: ProtectedRouteProps) {
    const location = useLocation();
    const hydrate = useAppStore(s => s.hydrate);

    useEffect(() => {
        hydrate();
    }, [location.pathname, hydrate]);

    const raw = sessionStorage.getItem("pe_user");
    const user = raw ? (JSON.parse(raw) as { role?: string }) : null;
    if (!user || user.role !== role) {
        return <Navigate to="/" replace />;
    }
    return children;
}
