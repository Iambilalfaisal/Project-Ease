import { useState } from "react";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PeUser {
    name:  string;
    email: string;
    role:  string;
    org:   string | null;
}

const ROLE_LABELS: Record<string, string> = {
    platform_admin: "Platform Admin",
    org_owner:      "Firm Owner",
    employee:       "Employee",
};

const ORG_DISPLAY_NAMES: Record<string, string> = {};

const BACK_ROUTES: Record<string, string> = {
    platform_admin: "/admin",
    org_owner:      "/owner",
    employee:       "/app",
};

const CARD = "flex flex-col gap-[0.9rem] rounded-lg border border-border bg-bg-1 p-8";
const CARD_TITLE = "m-0 mb-[0.25rem] border-b border-border pb-3 font-serif text-[1.1rem] font-bold tracking-tight text-ink-1";

// ── Cards ─────────────────────────────────────────────────────────────────────

const ProfileCard = ({ user }: { user: PeUser }) => (
    <div className={CARD}>
        <h2 className={CARD_TITLE}>Your Profile</h2>

        <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--gold)_0%,#9C7A28_100%)] font-serif text-[1.5rem] font-bold text-[#05080F]">
            {user.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[0.2rem]">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink-3">Full Name</span>
                <span className="text-[0.9rem] font-medium text-ink-1">{user.name}</span>
            </div>
            <div className="flex flex-col gap-[0.2rem]">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink-3">Email</span>
                <span className="text-[0.9rem] font-medium text-ink-1">{user.email}</span>
            </div>
            <div className="flex flex-col gap-[0.2rem]">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink-3">Role</span>
                <span className="inline-block w-fit rounded-pill border border-gold-border bg-gold-dim px-3 py-[0.2rem] text-xs font-bold uppercase tracking-[0.04em] text-gold">
                    {ROLE_LABELS[user.role] ?? user.role}
                </span>
            </div>
            {user.org && (
                <div className="flex flex-col gap-[0.2rem]">
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink-3">Organization</span>
                    <span className="text-[0.9rem] font-medium text-ink-1">
                        {ORG_DISPLAY_NAMES[user.org] ?? user.org}
                    </span>
                </div>
            )}
        </div>
    </div>
);

const FORM_INPUT = "w-full box-border rounded-[7px] border border-border-md bg-bg-2 px-[0.85rem] py-[0.6rem] font-sans text-[0.875rem] text-ink-1 outline-none transition-[border-color] duration-150 placeholder:text-ink-3 focus:border-gold-border focus:bg-gold-dim";

const SecurityCard = () => {
    const [current,  setCurrent]  = useState("");
    const [next,     setNext]     = useState("");
    const [confirm,  setConfirm]  = useState("");
    const [status,   setStatus]   = useState<"idle" | "success" | "error">("idle");
    const [msg,      setMsg]      = useState("");

    const submit = () => {
        if (!current || !next || !confirm) {
            setStatus("error"); setMsg("Please fill in all fields."); return;
        }
        if (next !== confirm) {
            setStatus("error"); setMsg("New passwords do not match."); return;
        }
        if (next.length < 6) {
            setStatus("error"); setMsg("Password must be at least 6 characters."); return;
        }
        // UI only — real implementation needs backend call
        setStatus("success"); setMsg("Password updated successfully.");
        setCurrent(""); setNext(""); setConfirm("");
        setTimeout(() => setStatus("idle"), 3000);
    };

    return (
        <div className={CARD}>
            <h2 className={CARD_TITLE}>Security</h2>

            <div className="flex flex-col gap-[0.35rem]">
                <label className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink-3">Current Password</label>
                <input
                    className={FORM_INPUT}
                    type="password"
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    placeholder="Enter current password"
                />
            </div>
            <div className="flex flex-col gap-[0.35rem]">
                <label className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink-3">New Password</label>
                <input
                    className={FORM_INPUT}
                    type="password"
                    value={next}
                    onChange={e => setNext(e.target.value)}
                    placeholder="At least 6 characters"
                />
            </div>
            <div className="flex flex-col gap-[0.35rem]">
                <label className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-ink-3">Confirm New Password</label>
                <input
                    className={FORM_INPUT}
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                />
            </div>

            {status !== "idle" && (
                <div className={
                    status === "success"
                        ? "rounded-sm border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.1)] px-[0.9rem] py-[0.6rem] text-sm text-success"
                        : "rounded-sm border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-[0.9rem] py-[0.6rem] text-sm text-danger"
                }>
                    {msg}
                </div>
            )}

            <button
                className="w-fit rounded-sm border-none bg-[linear-gradient(135deg,var(--gold)_0%,#9C7A28_100%)] px-[1.35rem] py-[0.6rem] font-sans text-[0.875rem] font-bold text-[#05080F] transition-[opacity,transform] duration-150 hover:-translate-y-px hover:opacity-[0.88]"
                onClick={submit}
            >
                Change Password
            </button>

            <p className="m-0 text-[0.75rem] leading-[1.5] text-ink-3">
                Password changes will take effect on your next login.
            </p>
        </div>
    );
};

const PreferencesCard = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());

    const handle = () => {
        const next = toggleTheme();
        setTheme(next);
    };

    return (
        <div className={CARD}>
            <h2 className={CARD_TITLE}>Preferences</h2>

            <div className="flex items-center justify-between gap-4 max-[681px]:flex-col max-[681px]:items-start">
                <div>
                    <div className="mb-[0.2rem] text-[0.875rem] font-semibold text-ink-1">Interface Theme</div>
                    <div className="text-[0.78rem] leading-[1.4] text-ink-3">
                        Currently using <strong>{theme === "dark" ? "Dark" : "Light"}</strong> mode
                    </div>
                </div>
                <button
                    className="shrink-0 whitespace-nowrap rounded-sm border border-border-md bg-bg-2 px-4 py-[0.45rem] font-sans text-[0.8rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-gold-border hover:text-gold"
                    onClick={handle}
                >
                    Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                </button>
            </div>

            <div className="my-1 h-px bg-border" />

            <div className="flex items-center justify-between gap-4 max-[681px]:flex-col max-[681px]:items-start">
                <div>
                    <div className="mb-[0.2rem] text-[0.875rem] font-semibold text-ink-1">Language</div>
                    <div className="text-[0.78rem] leading-[1.4] text-ink-3">Document search and interface language</div>
                </div>
                <select
                    className="shrink-0 cursor-pointer rounded-[7px] border border-border-md bg-bg-2 px-[0.85rem] py-[0.45rem] text-sm text-ink-1 outline-none [&>option]:bg-bg-1 [&>option]:text-ink-1"
                    defaultValue="en"
                >
                    <option value="en">English</option>
                    <option value="ur">Urdu</option>
                </select>
            </div>
        </div>
    );
};

const DangerCard = () => {
    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        window.location.hash = "/";
    };

    return (
        <div className={`${CARD} border-[rgba(248,113,113,0.22)]`}>
            <h2 className={CARD_TITLE}>Session</h2>
            <p className="m-0 text-[0.875rem] leading-[1.6] text-ink-3">
                Sign out of your account on this device. Your documents and settings are saved.
            </p>
            <button
                className="w-fit rounded-sm border border-danger bg-transparent px-[1.35rem] py-[0.6rem] font-sans text-[0.875rem] text-danger transition-[background] duration-150 hover:bg-[rgba(248,113,113,0.08)]"
                onClick={signOut}
            >
                Sign Out
            </button>
        </div>
    );
};

// ── Shell ─────────────────────────────────────────────────────────────────────

const SettingsPage = () => {
    const raw  = sessionStorage.getItem("pe_user");
    const user: PeUser | null = raw ? (JSON.parse(raw) as PeUser) : null;

    const backRoute = user ? (BACK_ROUTES[user.role] ?? "/") : "/";
    const goBack = () => { window.location.hash = backRoute; };

    return (
        <div className="min-h-screen bg-bg-0 px-6 pt-10 pb-16 font-sans text-ink-1 antialiased">
            <div className="mx-auto max-w-[820px]">

                {/* Top bar */}
                <div className="mb-8 flex items-center gap-4">
                    <button
                        className="whitespace-nowrap rounded-[7px] border border-border-md bg-transparent px-[0.9rem] py-[0.35rem] font-sans text-[0.82rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-gold-border hover:text-gold"
                        onClick={goBack}
                    >
                        &larr; Back
                    </button>
                    <div className="flex items-center gap-2 text-[0.8rem] text-ink-3">
                        <span className="font-serif font-bold text-gold">Project Ease</span>
                        <span className="text-ink-3">/</span>
                        <span>Account Settings</span>
                    </div>
                </div>

                {/* Page header */}
                <div className="mb-8">
                    <h1 className="m-0 mb-[0.4rem] font-serif text-2xl font-bold tracking-[-0.03em] text-ink-1">Account Settings</h1>
                    <p className="m-0 text-[0.9rem] text-ink-3">Manage your profile, password, and preferences</p>
                </div>

                {/* Cards grid */}
                {user ? (
                    <div className="grid grid-cols-2 gap-6 max-[681px]:grid-cols-1">
                        <ProfileCard user={user} />
                        <SecurityCard />
                        <PreferencesCard />
                        <DangerCard />
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-bg-1 p-12 text-center text-[0.9rem] text-ink-3">
                        <p>No active session found. <a className="text-gold no-underline hover:underline" href="/#/">Sign in</a></p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
