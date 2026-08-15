import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Layout.module.css";

import { useLogin } from "../../authConfig";
import { toggleTheme, getTheme, Theme } from "../../theme";

import { LoginButton } from "../../components/LoginButton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PeUser {
    name: string;
    email: string;
    role: string;
    org: string | null;
}

const ROLE_LABELS: Record<string, string> = {
    platform_admin: "Platform Admin",
    org_owner:      "Firm Owner",
    employee:       "Employee",
};

const ORG_DISPLAY_NAMES: Record<string, string> = {};

// ── Org context pill shown in the centre of the header ────────────────────────

const OrgContextBar = ({ user }: { user: PeUser }) => {
    const orgName = user.org ? (ORG_DISPLAY_NAMES[user.org] ?? user.org) : null;
    const roleLabel = ROLE_LABELS[user.role] ?? user.role;

    return (
        <div className={styles.orgContextBar}>
            {orgName && (
                <div className={styles.orgPill}>
                    <span className={styles.orgPillDot} />
                    <span className={styles.orgPillName}>{orgName}</span>
                </div>
            )}
            <span className={styles.roleBadge}>{roleLabel}</span>
        </div>
    );
};

// ── User menu ─────────────────────────────────────────────────────────────────

const PeUserMenu = ({ user }: { user: PeUser }) => {
    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.removeItem("pe_token");
        sessionStorage.removeItem("pe_user");
        window.location.hash = "/";
    };

    const goSettings = () => { window.location.hash = "/settings"; };

    return (
        <>
            <span className={styles.userName}>{user.name}</span>
            <button className={styles.themeBtn} onClick={goSettings}>Settings</button>
            <button className={styles.signOutBtn} onClick={signOut}>Sign Out</button>
        </>
    );
};

// ── Main layout ───────────────────────────────────────────────────────────────

const Layout = () => {
    const { t } = useTranslation();
    const [theme, setTheme] = useState<Theme>(getTheme());

    const handleTheme = () => {
        const next = toggleTheme();
        setTheme(next);
    };

    const rawUser = sessionStorage.getItem("pe_user");
    const peUser: PeUser | null = rawUser ? (JSON.parse(rawUser) as PeUser) : null;

    return (
        <div className={styles.layout}>
            <header className={styles.header} role="banner">
                <div className={styles.headerContainer}>

                    {/* Left: brand */}
                    <Link to="/" className={styles.headerTitleContainer}>
                        <h3 className={styles.headerTitle}>{t("headerTitle")}</h3>
                    </Link>

                    {/* Centre: org + role context */}
                    {peUser && <OrgContextBar user={peUser} />}

                    {/* Right: theme + user controls */}
                    <div className={styles.loginMenuContainer}>
                        <button className={styles.themeBtn} onClick={handleTheme} title="Toggle theme">
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </button>
                        {peUser
                            ? <PeUserMenu user={peUser} />
                            : useLogin && <LoginButton />
                        }
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
