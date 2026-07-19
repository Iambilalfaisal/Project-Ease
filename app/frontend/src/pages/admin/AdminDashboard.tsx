import { useState, useEffect } from "react";
import styles from "./AdminDashboard.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type Panel = "overview" | "orgs" | "users" | "evals" | "system";

interface Org {
    id: string;
    name: string;
    industry: string;
    users: number;
    status: "active" | "suspended";
    created: string;
}

interface User {
    name: string;
    email: string;
    role: string;
    org: string;
}

interface EvalResult {
    id: number;
    timestamp: string;
    organization_id: string | null;
    original_query: string;
    precision_at_k: number | null;
    answer_relevance_score: number | null;
    latency_ms: number | null;
}

// ─── Static dev data (replace with API calls once DB is ready) ───────────────

const DEV_ORGS: Org[] = [
    { id: "lawfirm", name: "Hassan & Associates", industry: "Law Practice", users: 2, status: "active", created: "2025-07-15" },
];

const DEV_USERS: User[] = [
    { name: "Platform Admin", email: "admin@projectease.com", role: "platform_admin", org: "—" },
    { name: "Firm Owner",     email: "owner@lawfirm.com",     role: "org_owner",      org: "Hassan & Associates" },
    { name: "Team Member",    email: "employee@lawfirm.com",  role: "employee",       org: "Hassan & Associates" },
];

const ROLE_LABELS: Record<string, string> = {
    platform_admin: "Platform Admin",
    org_owner:      "Firm Owner",
    employee:       "Employee",
};

const ROLE_COLORS: Record<string, string> = {
    platform_admin: "#C9A84C",
    org_owner:      "#60A5FA",
    employee:       "#94A3B8",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ScoreBadge = ({ val }: { val: number | null }) => {
    if (val === null) return <span className={styles.na}>—</span>;
    const pct = Math.round(val * 100);
    const color = pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
    return <span style={{ color, fontWeight: 700 }}>{pct}%</span>;
};

const StatusDot = ({ ok, label }: { ok: boolean; label: string }) => (
    <span style={{ color: ok ? "var(--success)" : "var(--danger)", fontWeight: 600, fontSize: "0.85rem" }}>
        {ok ? "● " : "○ "}{label}
    </span>
);

// ─── Panels ──────────────────────────────────────────────────────────────────

const OverviewPanel = ({ orgs, users }: { orgs: Org[]; users: User[] }) => {
    const stats = [
        { label: "Organizations",  value: orgs.length,  icon: "🏢", sub: "Active tenants" },
        { label: "Total Users",    value: users.length, icon: "👥", sub: "Across all orgs" },
        { label: "Documents",      value: "—",          icon: "📁", sub: "Requires Azure" },
        { label: "Queries Today",  value: "—",          icon: "⚡", sub: "Requires Azure" },
    ];

    return (
        <div className={styles.panelContent}>
            <div className={styles.statsGrid}>
                {stats.map(s => (
                    <div key={s.label} className={styles.statCard}>
                        <div className={styles.statIcon}>{s.icon}</div>
                        <div className={styles.statValue}>{s.value}</div>
                        <div className={styles.statLabel}>{s.label}</div>
                        <div className={styles.statSub}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className={styles.sectionTitle}>Active Organizations</div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Organization</th>
                            <th>Industry</th>
                            <th>Users</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orgs.map(o => (
                            <tr key={o.id}>
                                <td><strong>{o.name}</strong></td>
                                <td>{o.industry}</td>
                                <td>{o.users}</td>
                                <td><span className={styles.badgeGreen}>Active</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={styles.sectionTitle} style={{ marginTop: "2rem" }}>Recent Users</div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Organization</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.email}>
                                <td><strong>{u.name}</strong></td>
                                <td className={styles.muted}>{u.email}</td>
                                <td>
                                    <span className={styles.roleBadge} style={{ color: ROLE_COLORS[u.role] }}>
                                        {ROLE_LABELS[u.role] ?? u.role}
                                    </span>
                                </td>
                                <td>{u.org}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const OrgsPanel = ({ orgs, setOrgs }: { orgs: Org[]; setOrgs: (o: Org[]) => void }) => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm]           = useState({ name: "", industry: "", email: "" });

    const addOrg = () => {
        if (!form.name.trim()) return;
        const newOrg: Org = {
            id:       form.name.toLowerCase().replace(/\s+/g, "-"),
            name:     form.name,
            industry: form.industry || "Other",
            users:    0,
            status:   "active",
            created:  new Date().toISOString().slice(0, 10),
        };
        setOrgs([...orgs, newOrg]);
        setShowModal(false);
        setForm({ name: "", industry: "", email: "" });
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{orgs.length} organization{orgs.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>+ Add Organization</button>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Industry</th>
                            <th>Users</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orgs.map(o => (
                            <tr key={o.id}>
                                <td><strong>{o.name}</strong></td>
                                <td>{o.industry}</td>
                                <td>{o.users}</td>
                                <td>
                                    <span className={o.status === "active" ? styles.badgeGreen : styles.badgeRed}>
                                        {o.status === "active" ? "Active" : "Suspended"}
                                    </span>
                                </td>
                                <td className={styles.muted}>{o.created}</td>
                                <td>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => setOrgs(orgs.map(x => x.id === o.id ? { ...x, status: x.status === "active" ? "suspended" : "active" } : x))}
                                    >
                                        {o.status === "active" ? "Suspend" : "Activate"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Add Organization</h3>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Firm Name</label>
                            <input className={styles.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Hassan & Associates" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Industry</label>
                            <select className={styles.formSelect} value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                                <option value="">Select industry</option>
                                <option value="Law Practice">Law Practice</option>
                                <option value="CA / Accounting">CA / Accounting</option>
                                <option value="Logistics">Logistics</option>
                                <option value="Financial Services">Financial Services</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Contact Email</label>
                            <input className={styles.formInput} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="partner@firm.com" type="email" />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={addOrg}>Add Organization</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersPanel = ({ users, setUsers }: { users: User[]; setUsers: (u: User[]) => void }) => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm]           = useState({ name: "", email: "", role: "employee", org: "" });

    const addUser = () => {
        if (!form.name.trim() || !form.email.trim()) return;
        setUsers([...users, { name: form.name, email: form.email, role: form.role, org: form.org || "—" }]);
        setShowModal(false);
        setForm({ name: "", email: "", role: "employee", org: "" });
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{users.length} user{users.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>+ Add User</button>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Organization</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u, i) => (
                            <tr key={u.email}>
                                <td><strong>{u.name}</strong></td>
                                <td className={styles.muted}>{u.email}</td>
                                <td>
                                    <span className={styles.roleBadge} style={{ color: ROLE_COLORS[u.role] }}>
                                        {ROLE_LABELS[u.role] ?? u.role}
                                    </span>
                                </td>
                                <td>{u.org}</td>
                                <td>
                                    <button
                                        className={styles.actionBtnDanger}
                                        onClick={() => setUsers(users.filter((_, j) => j !== i))}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Add User</h3>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Full Name</label>
                            <input className={styles.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Hassan Nasir" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email</label>
                            <input className={styles.formInput} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@firm.com" type="email" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Role</label>
                            <select className={styles.formSelect} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="org_owner">Firm Owner</option>
                                <option value="employee">Employee</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Organization</label>
                            <input className={styles.formInput} value={form.org} onChange={e => setForm({ ...form, org: e.target.value })} placeholder="Hassan & Associates" />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={addUser}>Add User</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const EvalsPanel = () => {
    const [results, setResults] = useState<EvalResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState("");

    useEffect(() => {
        const key = import.meta.env.VITE_ADMIN_EVAL_KEY ?? "";
        if (!key) {
            setError("Set VITE_ADMIN_EVAL_KEY in your .env to load eval results.");
            setLoading(false);
            return;
        }
        fetch("/admin/evals", { headers: { Authorization: `Bearer ${key}` } })
            .then(r => r.json())
            .then(d => { setResults(d.results ?? []); setLoading(false); })
            .catch(() => { setError("Could not load eval results."); setLoading(false); });
    }, []);

    if (loading) return <div className={styles.emptyState}>Loading…</div>;

    if (error) return (
        <div className={styles.panelContent}>
            <div className={styles.infoBox}>
                <strong>Eval results not available</strong><br />{error}
            </div>
        </div>
    );

    if (!results.length) return (
        <div className={styles.panelContent}>
            <div className={styles.infoBox}>
                No eval results yet. Eval scores are recorded automatically each time a user asks a question in the chat.
            </div>
        </div>
    );

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{results.length} eval record{results.length !== 1 ? "s" : ""}</span>
            </div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Organization</th>
                            <th>Query</th>
                            <th>Precision</th>
                            <th>Relevance</th>
                            <th>Latency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(r => (
                            <tr key={r.id}>
                                <td className={styles.muted}>{r.timestamp?.slice(0, 16).replace("T", " ")}</td>
                                <td>{r.organization_id ?? "—"}</td>
                                <td className={styles.queryCell}>{r.original_query}</td>
                                <td><ScoreBadge val={r.precision_at_k} /></td>
                                <td><ScoreBadge val={r.answer_relevance_score} /></td>
                                <td className={styles.muted}>{r.latency_ms != null ? `${r.latency_ms}ms` : "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SystemPanel = () => {
    const [backendOk, setBackendOk] = useState(false);

    useEffect(() => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
            .then(r => setBackendOk(r.ok))
            .catch(() => setBackendOk(false));
    }, []);

    const services = [
        { name: "Backend API",     ok: backendOk,  note: backendOk ? "Running on port 50505" : "Offline" },
        { name: "Azure Storage",   ok: false, note: "AZURE_STORAGE_ACCOUNT not configured" },
        { name: "Azure AI Search", ok: false, note: "AZURE_SEARCH_SERVICE not configured" },
        { name: "Azure OpenAI",    ok: false, note: "AZURE_OPENAI_SERVICE not configured" },
        { name: "Cosmos DB",       ok: false, note: "USE_CHAT_HISTORY_COSMOS not enabled" },
    ];

    return (
        <div className={styles.panelContent}>
            <div className={styles.serviceGrid}>
                {services.map(s => (
                    <div key={s.name} className={`${styles.serviceCard} ${s.ok ? styles.serviceCardOk : styles.serviceCardWarn}`}>
                        <div className={styles.serviceName}><StatusDot ok={s.ok} label={s.name} /></div>
                        <div className={styles.serviceNote}>{s.note}</div>
                    </div>
                ))}
            </div>

            <div className={styles.sectionTitle} style={{ marginTop: "2.5rem" }}>Environment Variables</div>
            <div className={styles.infoBox}>
                To enable full functionality, configure the following environment variables before starting the backend:
                <ul style={{ marginTop: "0.75rem", paddingLeft: "1.25rem", lineHeight: 2 }}>
                    <li><code>AZURE_STORAGE_ACCOUNT</code> — Blob storage for documents</li>
                    <li><code>AZURE_STORAGE_CONTAINER</code> — Container name</li>
                    <li><code>AZURE_SEARCH_SERVICE</code> — AI Search service name</li>
                    <li><code>AZURE_SEARCH_INDEX</code> — Search index name</li>
                    <li><code>AZURE_OPENAI_SERVICE</code> — Azure OpenAI service name</li>
                    <li><code>AZURE_OPENAI_CHATGPT_MODEL</code> — e.g. gpt-4o</li>
                    <li><code>ADMIN_EVAL_API_KEY</code> — Secret key for this admin panel</li>
                </ul>
            </div>
        </div>
    );
};

// ─── Panel metadata ───────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Panel; icon: string; label: string }[] = [
    { id: "overview", icon: "📊", label: "Overview"      },
    { id: "orgs",     icon: "🏢", label: "Organizations" },
    { id: "users",    icon: "👥", label: "Users"         },
    { id: "evals",    icon: "✅", label: "Eval Quality"  },
    { id: "system",   icon: "⚙️", label: "System"        },
];

const PANEL_TITLES: Record<Panel, string> = {
    overview: "Dashboard Overview",
    orgs:     "Organizations",
    users:    "Users",
    evals:    "Eval Quality",
    system:   "System Status",
};

const PANEL_SUBS: Record<Panel, string> = {
    overview: "Platform-wide summary across all organizations",
    orgs:     "Manage organizations and their access",
    users:    "Manage users and role assignments",
    evals:    "AI answer quality scores recorded per query",
    system:   "Service connectivity and environment configuration",
};

// ─── Shell ────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
    const [panel, setPanel]   = useState<Panel>("overview");
    const [theme, setTheme]   = useState<Theme>(getTheme());
    const [orgs, setOrgs]     = useState<Org[]>(DEV_ORGS);
    const [users, setUsers]   = useState<User[]>(DEV_USERS);

    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? (JSON.parse(raw) as { name: string; email: string; role: string }) : { name: "Admin", email: "", role: "platform_admin" };

    const handleTheme = () => {
        const next = toggleTheme();
        setTheme(next);
    };

    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        window.location.hash = "/";
    };

    return (
        <div className={styles.shell}>

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    Project<span className={styles.logoAccent}> Ease</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_ITEMS.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            className={`${styles.navItem} ${panel === id ? styles.navItemActive : ""}`}
                            onClick={() => setPanel(id)}
                        >
                            <span className={styles.navIcon}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.sidebarUserBox}>
                        <div className={styles.sidebarUserName}>{user.name}</div>
                        <div className={styles.sidebarUserRole}>Platform Admin</div>
                    </div>
                    <button
                        className={styles.actionBtn}
                        onClick={() => { window.location.hash = "/settings"; }}
                    >
                        Account Settings
                    </button>
                    <button className={styles.signOutBtn} onClick={signOut}>Sign Out</button>
                </div>
            </aside>

            {/* ── Main area ───────────────────────────────────────────────── */}
            <div className={styles.main}>

                {/* Header */}
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.headerTitle}>{PANEL_TITLES[panel]}</h1>
                        <p className={styles.headerSub}>{PANEL_SUBS[panel]}</p>
                    </div>
                    <button className={styles.themeBtn} onClick={handleTheme} title="Toggle theme">
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
                </header>

                {/* Panel */}
                <div className={styles.body}>
                    {panel === "overview" && <OverviewPanel orgs={orgs} users={users} />}
                    {panel === "orgs"     && <OrgsPanel  orgs={orgs}   setOrgs={setOrgs} />}
                    {panel === "users"    && <UsersPanel users={users} setUsers={setUsers} />}
                    {panel === "evals"    && <EvalsPanel />}
                    {panel === "system"   && <SystemPanel />}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
