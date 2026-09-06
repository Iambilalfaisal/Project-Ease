import { useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

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

const THEME_BTN =
    "whitespace-nowrap rounded-[7px] border border-border-md bg-bg-2 px-3 py-[0.3rem] font-sans text-xs text-ink-2 transition-colors duration-150 hover:border-gold-border hover:text-gold";

// ── Org context pill shown in the centre of the header ────────────────────────

const OrgContextBar = ({ user }: { user: PeUser }) => {
    const orgName = user.org ? (ORG_DISPLAY_NAMES[user.org] ?? user.org) : null;
    const roleLabel = ROLE_LABELS[user.role] ?? user.role;

    return (
        <div className="flex items-center gap-3">
            {orgName && (
                <div className="flex items-center gap-2.5 rounded-pill border border-border-md bg-bg-2 py-[0.3rem] pl-2 pr-[0.85rem]">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                    <span className="text-[0.78rem] font-semibold text-ink-1">{orgName}</span>
                </div>
            )}
            <span className="rounded-pill border border-gold-border bg-gold-dim px-2.5 py-[0.2rem] text-[0.68rem] font-bold uppercase tracking-wide text-gold">
                {roleLabel}
            </span>
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
            <span className="whitespace-nowrap text-[0.82rem] font-semibold text-ink-1">{user.name}</span>
            <button className={THEME_BTN} onClick={goSettings}>Settings</button>
            <button
                className="whitespace-nowrap rounded-[7px] border border-border-md bg-transparent px-3 py-[0.3rem] font-sans text-[0.78rem] text-ink-2 transition-colors duration-150 hover:border-danger hover:text-danger"
                onClick={signOut}
            >
                Sign Out
            </button>
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
        <div className="flex h-full flex-col">
            <header className="shrink-0 border-b border-border bg-bg-1 text-ink-1" role="banner">
                <div className="relative flex h-14 items-center justify-between px-5">

                    {/* Left: brand */}
                    <Link to="/" className="flex items-center gap-2 text-ink-1 no-underline">
                        <h3 className="m-0 font-serif text-[1.1rem] font-bold tracking-tight text-gold">{t("headerTitle")}</h3>
                    </Link>

                    {/* Centre: org + role context */}
                    {peUser && <OrgContextBar user={peUser} />}

                    {/* Right: theme + user controls */}
                    <div className="flex items-center gap-3">
                        <button className={THEME_BTN} onClick={handleTheme} title="Toggle theme">
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </button>
                        {peUser
                            ? <PeUserMenu user={peUser} />
                            : useLogin && <LoginButton />
                        }
                    </div>

                </div>
            </header>

            <main className="flex min-h-0 flex-1" id="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
