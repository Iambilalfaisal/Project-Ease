import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { HelmetProvider } from "react-helmet-async";
import { MsalProvider } from "@azure/msal-react";
import { AuthenticationResult, EventType, PublicClientApplication } from "@azure/msal-browser";

import "./index.css";

import Chat from "./pages/chat/Chat";
import Landing from "./pages/landing/Landing";
import LayoutWrapper from "./layoutWrapper";
import i18next from "./i18n/config";
import { msalConfig, useLogin } from "./authConfig";

// Inline admin placeholder — replace with real AdminDashboard component once built
const AdminPlaceholder = () => {
    const raw = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) : {};
    return (
        <div style={{ background: "#05080F", minHeight: "100vh", color: "#F1F5F9", fontFamily: "Segoe UI, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
            <div style={{ color: "#C9A84C", fontSize: "2rem", fontFamily: "Georgia, serif", fontWeight: 700 }}>Project Ease</div>
            <div style={{ color: "#94A3B8", fontSize: "1rem" }}>Admin Dashboard — coming soon</div>
            <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "1rem 2rem", textAlign: "center" }}>
                <div style={{ color: "#C9A84C", fontWeight: 700 }}>{user.name ?? "Admin"}</div>
                <div style={{ color: "#64748B", fontSize: "0.8rem" }}>{user.email} &middot; {user.role}</div>
            </div>
            <button
                onClick={() => { sessionStorage.clear(); window.location.hash = "/"; }}
                style={{ marginTop: "1rem", background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", padding: "0.5rem 1.5rem", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}
            >Sign Out</button>
        </div>
    );
};

const router = createHashRouter([
    {
        // PROJECT EASE: landing page is the entry point — marketing + auth forms
        path: "/",
        element: <Landing />
    },
    {
        // Platform admin dashboard
        path: "/admin",
        element: <AdminPlaceholder />
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
