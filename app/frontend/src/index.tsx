import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { HelmetProvider } from "react-helmet-async";
import { MsalProvider } from "@azure/msal-react";
import { AuthenticationResult, EventType, PublicClientApplication } from "@azure/msal-browser";

import "./index.css";

// Apply saved theme before first paint to avoid flash
import { applyTheme, getTheme } from "./theme";
applyTheme(getTheme());

import AppRoutes from "./routes/AppRoutes";
import QueryProvider from "./providers/QueryProvider";
import { ToastProvider } from "./components/ui";
import i18next from "./i18n/config";
import { msalConfig, useLogin } from "./authConfig";

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
                    <QueryProvider>
                        <ToastProvider>
                            {useLogin && msalInstance ? (
                                <MsalProvider instance={msalInstance}>
                                    <AppRoutes />
                                </MsalProvider>
                            ) : (
                                <AppRoutes />
                            )}
                        </ToastProvider>
                    </QueryProvider>
                </HelmetProvider>
            </I18nextProvider>
        </React.StrictMode>
    );

    root.render(appTree);
})();
