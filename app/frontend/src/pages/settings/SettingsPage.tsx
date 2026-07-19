import { useState } from "react";
import styles from "./SettingsPage.module.css";
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

const ORG_DISPLAY_NAMES: Record<string, string> = {
    lawfirm: "Hassan & Associates",
};

const BACK_ROUTES: Record<string, string> = {
    platform_admin: "/admin",
    org_owner:      "/owner",
    employee:       "/app",
};

// ── Cards ─────────────────────────────────────────────────────────────────────

const ProfileCard = ({ user }: { user: PeUser }) => (
    <div className={styles.card}>
        <h2 className={styles.cardTitle}>Your Profile</h2>

        <div className={styles.avatar}>
            {user.name.charAt(0).toUpperCase()}
        </div>

        <div className={styles.fieldGroup}>
            <div className={styles.field}>
                <span className={styles.fieldLabel}>Full Name</span>
                <span className={styles.fieldValue}>{user.name}</span>
            </div>
            <div className={styles.field}>
                <span className={styles.fieldLabel}>Email</span>
                <span className={styles.fieldValue}>{user.email}</span>
            </div>
            <div className={styles.field}>
                <span className={styles.fieldLabel}>Role</span>
                <span className={styles.roleBadge}>{ROLE_LABELS[user.role] ?? user.role}</span>
            </div>
            {user.org && (
                <div className={styles.field}>
                    <span className={styles.fieldLabel}>Organization</span>
                    <span className={styles.fieldValue}>
                        {ORG_DISPLAY_NAMES[user.org] ?? user.org}
                    </span>
                </div>
            )}
        </div>
    </div>
);

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
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>Security</h2>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Password</label>
                <input
                    className={styles.formInput}
                    type="password"
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    placeholder="Enter current password"
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>New Password</label>
                <input
                    className={styles.formInput}
                    type="password"
                    value={next}
                    onChange={e => setNext(e.target.value)}
                    placeholder="At least 6 characters"
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Confirm New Password</label>
                <input
                    className={styles.formInput}
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                />
            </div>

            {status !== "idle" && (
                <div className={status === "success" ? styles.alertSuccess : styles.alertError}>
                    {msg}
                </div>
            )}

            <button className={styles.btnPrimary} onClick={submit}>
                Change Password
            </button>

            <p className={styles.secNote}>
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
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>Preferences</h2>

            <div className={styles.prefRow}>
                <div>
                    <div className={styles.prefLabel}>Interface Theme</div>
                    <div className={styles.prefSub}>
                        Currently using <strong>{theme === "dark" ? "Dark" : "Light"}</strong> mode
                    </div>
                </div>
                <button className={styles.themeToggle} onClick={handle}>
                    Switch to {theme === "dark" ? "Light" : "Dark"} Mode
                </button>
            </div>

            <div className={styles.divider} />

            <div className={styles.prefRow}>
                <div>
                    <div className={styles.prefLabel}>Language</div>
                    <div className={styles.prefSub}>Document search and interface language</div>
                </div>
                <select className={styles.langSelect} defaultValue="en">
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
        <div className={`${styles.card} ${styles.cardDanger}`}>
            <h2 className={styles.cardTitle}>Session</h2>
            <p className={styles.dangerText}>
                Sign out of your account on this device. Your documents and settings are saved.
            </p>
            <button className={styles.btnDanger} onClick={signOut}>
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
        <div className={styles.page}>
            <div className={styles.container}>

                {/* Top bar */}
                <div className={styles.topBar}>
                    <button className={styles.backBtn} onClick={goBack}>
                        &larr; Back
                    </button>
                    <div className={styles.breadcrumb}>
                        <span className={styles.breadcrumbBrand}>Project Ease</span>
                        <span className={styles.breadcrumbSep}>/</span>
                        <span>Account Settings</span>
                    </div>
                </div>

                {/* Page header */}
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Account Settings</h1>
                    <p className={styles.pageSub}>Manage your profile, password, and preferences</p>
                </div>

                {/* Cards grid */}
                {user ? (
                    <div className={styles.grid}>
                        <ProfileCard user={user} />
                        <SecurityCard />
                        <PreferencesCard />
                        <DangerCard />
                    </div>
                ) : (
                    <div className={styles.noSession}>
                        <p>No active session found. <a className={styles.link} href="/#/">Sign in</a></p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
