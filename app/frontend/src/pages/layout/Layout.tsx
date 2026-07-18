import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Layout.module.css";

import { useLogin } from "../../authConfig";

import { LoginButton } from "../../components/LoginButton";

// ── Project Ease session logout ───────────────────────────────────────────────
const PeUserMenu = () => {
    const raw = sessionStorage.getItem("pe_user");
    if (!raw) return null;                          // no PE session — hide

    const user = JSON.parse(raw) as { name: string; email: string; role: string };

    const signOut = async () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        // fire-and-forget — even if the backend is down we still clear locally
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.removeItem("pe_token");
        sessionStorage.removeItem("pe_user");
        window.location.hash = "/";
    };

    const roleLabel: Record<string, string> = {
        platform_admin: "Platform Admin",
        org_owner:      "Firm Owner",
        employee:       "Employee",
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ textAlign: "right", lineHeight: 1.3 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1b1b1b" }}>{user.name}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b6b6b" }}>{roleLabel[user.role] ?? user.role}</div>
            </div>
            <button
                onClick={signOut}
                style={{
                    background: "none",
                    border: "1px solid #d0d0d0",
                    borderRadius: 6,
                    padding: "0.35rem 0.85rem",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    color: "#444",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    transition: "border-color 0.2s, color 0.2s"
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#999"; (e.currentTarget as HTMLButtonElement).style.color = "#111"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d0d0d0"; (e.currentTarget as HTMLButtonElement).style.color = "#444"; }}
            >
                Sign Out
            </button>
        </div>
    );
};

const Layout = () => {
    const { t } = useTranslation();

    return (
        <div className={styles.layout}>
            <header className={styles.header} role={"banner"}>
                <div className={styles.headerContainer}>
                    <Link to="/" className={styles.headerTitleContainer}>
                        <h3 className={styles.headerTitle}>{t("headerTitle")}</h3>
                    </Link>
                    <div className={styles.loginMenuContainer}>
                        <PeUserMenu />
                        {useLogin && <LoginButton />}
                    </div>
                </div>
            </header>

            <main className={styles.main} id="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
