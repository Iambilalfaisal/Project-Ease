import { lazy, ReactNode } from "react";
import ProtectedRoute from "./ProtectedRoute";

const Landing = lazy(() => import("../pages/landing/Landing"));
const Compliance = lazy(() => import("../pages/compliance/Compliance"));
const ClientPortal = lazy(() => import("../pages/portal/ClientPortal"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const OwnerPortal = lazy(() => import("../pages/owner/OwnerPortal"));
const EmployeePortal = lazy(() => import("../pages/employee/EmployeePortal"));
const SettingsPage = lazy(() => import("../pages/settings/SettingsPage"));
const Chat = lazy(() => import("../pages/chat/Chat"));
const LayoutWrapper = lazy(() => import("../layoutWrapper"));

export interface AppRoute {
    path?: string;
    index?: boolean;
    element?: ReactNode;
    lazy?: () => Promise<unknown>;
    children?: AppRoute[];
}

// Single source of truth for the router — every page is lazy-loaded, and
// role gating goes through the one ProtectedRoute component instead of the
// old per-page requireRole() closures.
export const routeConfig: AppRoute[] = [
    { path: "/", element: <Landing /> },
    { path: "/compliance", element: <Compliance /> },
    // Unauthenticated client portal — accessed via /#/portal?token=xxx
    { path: "/portal", element: <ClientPortal /> },
    {
        path: "/admin",
        element: (
            <ProtectedRoute role="platform_admin">
                <AdminDashboard />
            </ProtectedRoute>
        )
    },
    {
        path: "/owner",
        element: (
            <ProtectedRoute role="org_owner">
                <OwnerPortal />
            </ProtectedRoute>
        )
    },
    {
        path: "/employee",
        element: (
            <ProtectedRoute role="employee">
                <EmployeePortal />
            </ProtectedRoute>
        )
    },
    { path: "/settings", element: <SettingsPage /> },
    {
        // The main app (chat) lives at /app — auth will gate this route later
        path: "/app",
        element: <LayoutWrapper />,
        children: [
            { index: true, element: <Chat /> },
            { path: "*", lazy: () => import("../pages/NoPage") }
        ]
    }
];
