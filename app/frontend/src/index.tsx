import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { HelmetProvider } from "react-helmet-async";
import { MsalProvider } from "@azure/msal-react";
import { AuthenticationResult, EventType, PublicClientApplication } from "@azure/msal-browser";

import "./index.css";

// Apply saved theme before first paint to avoid flash
import { applyTheme, getTheme } from "./theme";
applyTheme(getTheme());

import Chat from "./pages/chat/Chat";
import AdminDashboard from "./pages/admin/AdminDashboard";
import OwnerPortal from "./pages/owner/OwnerPortal";
import EmployeePortal from "./pages/employee/EmployeePortal";
import SettingsPage from "./pages/settings/SettingsPage";
import Landing from "./pages/landing/Landing";
import LayoutWrapper from "./layoutWrapper";
import i18next from "./i18n/config";
import { msalConfig, useLogin } from "./authConfig";

// ── Route guards ──────────────────────────────────────────────────────────────

function requireRole(role: string, element: React.ReactElement): React.ReactElement {
    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) : null;
    if (!user || user.role !== role) {
        window.location.hash = user ? "/" : "/";
        return <></>;
    }
    return element;
}

const AdminGuard    = () => requireRole("platform_admin", <AdminDashboard />);
const OwnerGuard    = () => requireRole("org_owner",      <OwnerPortal />);
const EmployeeGuard = () => requireRole("employee",       <EmployeePortal />);

const router = createHashRouter([
    {
        // PROJECT EASE: landing page is the entry point — marketing + auth forms
        path: "/",
        element: <Landing />
    },
    {
        path: "/admin",
        element: <AdminGuard />
    },
    {
        path: "/owner",
        element: <OwnerGuard />
    },
    {
        path: "/employee",
        element: <EmployeeGuard />
    },
    {
        path: "/settings",
        element: <SettingsPage />
    },
    {
        // The main app (chat) lives at /app — auth will gate this route later
        path: "/app",
        element: <LayoutWrapper />,
        children: [
            {
                index: true,
                element: <Chat />
            },
            {
                path: "*",
                lazy: () => import("./pages/NoPage")
            }
        ]
    }
]);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

// Bootstrap the app once; conditionally wrap with MsalProvider when login is enabled
(async () => {
    let msalInstance: PublicClientApplication | undefined;

    if (useLogin) {
        msalInstance = new PublicClientApplication(msalConfig);
        try {
            await msalInstance.initialize();

            // Default active account to the first one if none is set
            if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
                msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
            }

            // Keep active account in sync on login success
            msalInstance.addEventCallback(event => {
                if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
                    const result = event.payload as AuthenticationResult;
                    if (result.account) {
                        msalInstance!.setActiveAccount(result.account);
                    }
                }
            });
        } catch (e) {
            // Non-fatal: render the app even if MSAL initialization fails
            // eslint-disable-next-line no-console
            console.error("MSAL initialize failed", e);
            msalInstance = undefined;
        }
    }

    const appTree = (
        <React.StrictMode>
            <I18nextProvider i18n={i18next}>
                <HelmetProvider>
                    {useLogin && msalInstance ? (
                        <MsalProvider instance={msalInstance}>
                            <RouterProvider router={router} />
                        </MsalProvider>
                    ) : (
                        <RouterProvider router={router} />
                    )}
                </HelmetProvider>
            </I18nextProvider>
        </React.StrictMode>
    );

    root.render(appTree);
})();
