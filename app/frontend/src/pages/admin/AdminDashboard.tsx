import { useState, useEffect } from "react";
import styles from "./AdminDashboard.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "overview" | "orgs" | "registrations" | "evals" | "settings";

interface Org {
    org_id:      string;
    name:        string;
    plan:        string;
    status:      "active" | "suspended";
    industry:    string;
    user_count:  number;
    doc_count:   number;
    total_bytes: number;
    max_docs:    number;
    max_users:   number;
    created_at:  string;
}

interface OrgDetails extends Org {
    users:     OrgUser[];
    documents: OrgDoc[];
}

interface OrgUser {
    user_id:    string;
    name:       string;
    email:      string;
    role:       string;
    created_at: string;
}

interface OrgDoc {
    doc_id:      string;
    filename:    string;
    size_bytes:  number;
    status:      string;
    uploaded_at: string;
}

interface PlatformStats {
    total_orgs:  number;
    active_orgs: number;
    total_users: number;
    total_docs:  number;
    total_bytes: number;
    plans:       Record<string, number>;
}

interface Registration {
    org_id:      string;
    name:        string;
    plan:        string;
    city:        string | null;
    phone:       string | null;
    created_at:  string;
    owner_name:  string | null;
    owner_email: string | null;
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

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
    free:       "#94a3b8",
    pro:        "#60a5fa",
    enterprise: "#c084fc",
};

const INDUSTRIES = ["Law Practice", "CA / Accounting", "Logistics", "Financial Services", "Healthcare", "Other"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
    const token = sessionStorage.getItem("pe_token") ?? "";
    return { Authorization: `Bearer ${token}` };
}

function fmtBytes(b: number): string {
    if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    if (b >= 1024)        return `${Math.round(b / 1024)} KB`;
    return `${b} B`;
}

function fmtDate(s: string): string { return s ? s.slice(0, 10) : "—"; }

const PlanBadge = ({ plan }: { plan: string }) => (
    <span style={{
        display: "inline-block",
        background: `${PLAN_COLORS[plan] ?? "#94a3b8"}22`,
        color: PLAN_COLORS[plan] ?? "#94a3b8",
        border: `1px solid ${PLAN_COLORS[plan] ?? "#94a3b8"}44`,
        borderRadius: "100px",
        padding: "0.15rem 0.6rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "capitalize" as const,
    }}>{plan}</span>
);

const ScoreBadge = ({ val }: { val: number | null }) => {
    if (val === null) return <span className={styles.muted}>—</span>;
    const pct = Math.round(val * 100);
    const color = pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
    return <span style={{ color, fontWeight: 700 }}>{pct}%</span>;
};

const StatusDot = ({ ok, label }: { ok: boolean; label: string }) => (
    <span style={{ color: ok ? "var(--success)" : "var(--danger)", fontWeight: 600, fontSize: "0.85rem" }}>
        {ok ? "● " : "○ "}{label}
    </span>
);

// ── Org Detail Modal ──────────────────────────────────────────────────────────

const OrgDetailModal = ({ orgId, onClose }: { orgId: string; onClose: () => void }) => {
    const [details, setDetails] = useState<OrgDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/admin/orgs/${orgId}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setDetails(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [orgId]);

    return (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal} style={{ maxWidth: 680, width: "95%" }}>
                {loading || !details ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                            <div>
                                <h3 className={styles.modalTitle} style={{ marginBottom: "0.25rem" }}>{details.name}</h3>
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                    <PlanBadge plan={details.plan} />
                                    <span className={details.status === "active" ? styles.badgeGreen : styles.badgeRed}>
                                        {details.status}
                                    </span>
                                    <span className={styles.muted} style={{ fontSize: "0.78rem" }}>{details.industry}</span>
                                </div>
                            </div>
                            <button className={styles.btnGhost} onClick={onClose}>Close</button>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
                            {[
                                { label: "Users",     value: details.user_count },
                                { label: "Documents", value: details.doc_count },
                                { label: "Storage",   value: fmtBytes(details.total_bytes) },
                                { label: "Created",   value: fmtDate(details.created_at) },
                            ].map(s => (
                                <div key={s.label} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.65rem 0.75rem" }}>
                                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-1)" }}>{s.value}</div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginTop: 2 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Users */}
                        <div className={styles.sectionTitle} style={{ marginBottom: "0.5rem" }}>Team Members</div>
                        <div className={styles.tableWrap} style={{ marginBottom: "1.25rem", maxHeight: 180, overflowY: "auto" }}>
                            <table className={styles.table}>
                                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
                                <tbody>
                                    {details.users.map(u => (
                                        <tr key={u.user_id}>
                                            <td><strong>{u.name}</strong></td>
                                            <td className={styles.muted}>{u.email}</td>
                                            <td><span style={{ color: u.role === "org_owner" ? "var(--gold)" : "var(--text-3)", fontSize: "0.78rem", fontWeight: 600 }}>{u.role === "org_owner" ? "Owner" : "Employee"}</span></td>
                                            <td className={styles.muted}>{fmtDate(u.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Documents */}
                        <div className={styles.sectionTitle} style={{ marginBottom: "0.5rem" }}>Documents ({details.documents.length})</div>
                        {details.documents.length === 0 ? (
                            <div className={styles.muted} style={{ fontSize: "0.82rem", padding: "0.5rem 0" }}>No documents uploaded yet.</div>
                        ) : (
                            <div className={styles.tableWrap} style={{ maxHeight: 180, overflowY: "auto" }}>
                                <table className={styles.table}>
                                    <thead><tr><th>File</th><th>Size</th><th>Status</th><th>Uploaded</th></tr></thead>
                                    <tbody>
                                        {details.documents.map(d => (
                                            <tr key={d.doc_id}>
                                                <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</td>
                                                <td className={styles.muted}>{fmtBytes(d.size_bytes)}</td>
                                                <td><span className={d.status === "ready" ? styles.badgeGreen : styles.badgeAmber}>{d.status}</span></td>
                                                <td className={styles.muted}>{fmtDate(d.uploaded_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ── Overview Panel ────────────────────────────────────────────────────────────

const OverviewPanel = ({ stats, orgs }: { stats: PlatformStats | null; orgs: Org[] }) => {
    const cards = [
        { label: "Total Organizations", value: stats?.total_orgs  ?? "—", sub: `${stats?.active_orgs ?? 0} active`,  icon: "🏢" },
        { label: "Total Users",         value: stats?.total_users ?? "—", sub: "Across all orgs",                    icon: "👥" },
        { label: "Total Documents",     value: stats?.total_docs  ?? "—", sub: fmtBytes(stats?.total_bytes ?? 0),    icon: "📁" },
        { label: "Storage Used",        value: fmtBytes(stats?.total_bytes ?? 0), sub: "All tenants combined",       icon: "💾" },
    ];

    const planBreakdown = stats?.plans ?? {};

    return (
        <div className={styles.panelContent}>
            <div className={styles.statsGrid}>
                {cards.map(c => (
                    <div key={c.label} className={styles.statCard}>
                        <div className={styles.statIcon}>{c.icon}</div>
                        <div className={styles.statValue}>{c.value}</div>
                        <div className={styles.statLabel}>{c.label}</div>
                        <div className={styles.statSub}>{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* Plan breakdown */}
            <div className={styles.sectionTitle}>Plan Distribution</div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                {["free", "pro", "enterprise"].map(plan => (
                    <div key={plan} style={{
                        background: "var(--bg-1)", border: "1px solid var(--border)",
                        borderRadius: 10, padding: "0.85rem 1.25rem",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 100,
                    }}>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: PLAN_COLORS[plan] }}>
                            {planBreakdown[plan] ?? 0}
                        </div>
                        <PlanBadge plan={plan} />
                    </div>
                ))}
            </div>

            {/* Recent orgs */}
            <div className={styles.sectionTitle}>All Organizations</div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Name</th><th>Plan</th><th>Users</th><th>Docs</th><th>Status</th><th>Created</th></tr></thead>
                    <tbody>
                        {orgs.map(o => (
                            <tr key={o.org_id}>
                                <td><strong>{o.name}</strong><div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{o.industry}</div></td>
                                <td><PlanBadge plan={o.plan} /></td>
                                <td className={styles.muted}>{o.user_count}</td>
                                <td className={styles.muted}>{o.doc_count}</td>
                                <td><span className={o.status === "active" ? styles.badgeGreen : styles.badgeRed}>{o.status}</span></td>
                                <td className={styles.muted}>{fmtDate(o.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Orgs Panel ────────────────────────────────────────────────────────────────

const OrgsPanel = ({ orgs, setOrgs }: { orgs: Org[]; setOrgs: React.Dispatch<React.SetStateAction<Org[]>> }) => {
    const [showCreate,    setShowCreate]    = useState(false);
    const [detailOrgId,   setDetailOrgId]   = useState<string | null>(null);
    const [editOrg,       setEditOrg]       = useState<Org | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Org | null>(null);
    const [actionError,   setActionError]   = useState<string | null>(null);
    const [saving,        setSaving]        = useState(false);

    const [createForm, setCreateForm] = useState({
        name: "", industry: "Law Practice", plan: "free",
        owner_name: "", owner_email: "",
    });
    const [createCreds, setCreateCreds] = useState<{ email: string; password: string } | null>(null);

    const [planForm, setPlanForm] = useState({ plan: "free", max_docs: 20, max_users: 5 });

    const handleCreate = async () => {
        if (!createForm.name || !createForm.owner_name || !createForm.owner_email) {
            setActionError("All fields are required."); return;
        }
        setSaving(true);
        try {
            const res = await fetch("/admin/orgs", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(createForm),
            });
            const data = await res.json();
            if (!res.ok) { setActionError(data.error ?? "Failed to create org."); setSaving(false); return; }
            setOrgs(prev => [{ ...data.org, user_count: 1, doc_count: 0, total_bytes: 0 }, ...prev]);
            setCreateCreds({ email: data.owner.email, password: data.temp_password });
            setShowCreate(false);
            setCreateForm({ name: "", industry: "Law Practice", plan: "free", owner_name: "", owner_email: "" });
            setActionError(null);
        } catch { setActionError("Network error."); }
        setSaving(false);
    };

    const handleSuspendToggle = async (org: Org) => {
        const newStatus = org.status === "active" ? "suspended" : "active";
        const res = await fetch(`/admin/orgs/${org.org_id}`, {
            method: "PUT",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
            setOrgs(prev => prev.map(o => o.org_id === org.org_id ? { ...o, status: newStatus } : o));
        }
    };

    const handlePlanSave = async () => {
        if (!editOrg) return;
        setSaving(true);
        const res = await fetch(`/admin/orgs/${editOrg.org_id}`, {
            method: "PUT",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(planForm),
        });
        const data = await res.json();
        if (res.ok) {
            setOrgs(prev => prev.map(o => o.org_id === editOrg.org_id ? { ...o, ...data } : o));
            setEditOrg(null);
        }
        setSaving(false);
    };

    const handleDelete = async (org: Org) => {
        setConfirmDelete(null);
        const res = await fetch(`/admin/orgs/${org.org_id}`, { method: "DELETE", headers: authHeaders() });
        if (res.ok) setOrgs(prev => prev.filter(o => o.org_id !== org.org_id));
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{orgs.length} organization{orgs.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={() => { setShowCreate(true); setActionError(null); }}>
                    + Add Organization
                </button>
            </div>

            {actionError && (
                <div className={styles.errorBanner}>
                    ⚠ {actionError}
                    <button className={styles.errorDismiss} onClick={() => setActionError(null)}>×</button>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Organization</th>
                            <th>Plan</th>
                            <th>Users</th>
                            <th>Docs</th>
                            <th>Storage</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orgs.map(o => (
                            <tr key={o.org_id}>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{o.name}</div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{o.industry}</div>
                                </td>
                                <td><PlanBadge plan={o.plan} /></td>
                                <td className={styles.muted}>{o.user_count} / {o.max_users}</td>
                                <td className={styles.muted}>{o.doc_count} / {o.max_docs}</td>
                                <td className={styles.muted}>{fmtBytes(o.total_bytes)}</td>
                                <td>
                                    <span className={o.status === "active" ? styles.badgeGreen : styles.badgeRed}>
                                        {o.status}
                                    </span>
                                </td>
                                <td className={styles.muted}>{fmtDate(o.created_at)}</td>
                                <td>
                                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                        <button className={styles.actionBtn} onClick={() => setDetailOrgId(o.org_id)}>
                                            View
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => {
                                            setEditOrg(o);
                                            setPlanForm({ plan: o.plan, max_docs: o.max_docs, max_users: o.max_users });
                                        }}>
                                            Plan
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => handleSuspendToggle(o)}>
                                            {o.status === "active" ? "Suspend" : "Activate"}
                                        </button>
                                        <button className={styles.actionBtnDanger} onClick={() => setConfirmDelete(o)}>
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create org modal */}
            {showCreate && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Add Organization</h3>
                        {actionError && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {actionError}</div>}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                            <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                                <label className={styles.formLabel}>Organization Name</label>
                                <input className={styles.formInput} value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Legal" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Industry</label>
                                <select className={styles.formSelect} value={createForm.industry} onChange={e => setCreateForm(f => ({ ...f, industry: e.target.value }))}>
                                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Plan</label>
                                <select className={styles.formSelect} value={createForm.plan} onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}>
                                    <option value="free">Free</option>
                                    <option value="pro">Pro</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>

                            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginBottom: "0.25rem" }}>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner Account</div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Owner Full Name</label>
                                <input className={styles.formInput} value={createForm.owner_name} onChange={e => setCreateForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Jane Smith" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Owner Email</label>
                                <input className={styles.formInput} type="email" value={createForm.owner_email} onChange={e => setCreateForm(f => ({ ...f, owner_email: e.target.value }))} placeholder="owner@firm.com" />
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={handleCreate} disabled={saving}>
                                {saving ? "Creating…" : "Create Organization"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New org credentials */}
            {createCreds && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setCreateCreds(null); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Organization Created ✓</h3>
                        <p className={styles.muted} style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
                            Share these login credentials with the org owner. They will be prompted to set a new password on first login.
                        </p>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Owner Email</label>
                            <input className={styles.formInput} readOnly value={createCreds.email} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Temporary Password</label>
                            <input className={styles.formInput} readOnly value={createCreds.password} />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnPrimary} onClick={() => setCreateCreds(null)}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit plan modal */}
            {editOrg && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setEditOrg(null); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Change Plan — {editOrg.name}</h3>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Plan</label>
                            <select className={styles.formSelect} value={planForm.plan} onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}>
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Max Documents</label>
                                <input className={styles.formInput} type="number" value={planForm.max_docs} onChange={e => setPlanForm(f => ({ ...f, max_docs: +e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Max Users</label>
                                <input className={styles.formInput} type="number" value={planForm.max_users} onChange={e => setPlanForm(f => ({ ...f, max_users: +e.target.value }))} />
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setEditOrg(null)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={handlePlanSave} disabled={saving}>
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm delete */}
            {confirmDelete && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Delete Organization</h3>
                        <p className={styles.muted} style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
                            This will permanently delete <strong style={{ color: "var(--text-1)" }}>{confirmDelete.name}</strong> and all its users, documents, and data. This cannot be undone.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className={styles.btnDanger} onClick={() => handleDelete(confirmDelete)}>Delete Forever</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Org detail modal */}
            {detailOrgId && <OrgDetailModal orgId={detailOrgId} onClose={() => setDetailOrgId(null)} />}
        </div>
    );
};

// ── Evals Panel ───────────────────────────────────────────────────────────────

const EvalsPanel = () => {
    const [results, setResults] = useState<EvalResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState("");

    useEffect(() => {
        const key = (import.meta as any).env?.VITE_ADMIN_EVAL_KEY ?? "";
        if (!key) { setError("Set VITE_ADMIN_EVAL_KEY in your .env to load eval results."); setLoading(false); return; }
        fetch("/admin/evals", { headers: { Authorization: `Bearer ${key}` } })
            .then(r => r.json())
            .then(d => { setResults(d.results ?? []); setLoading(false); })
            .catch(() => { setError("Could not load eval results."); setLoading(false); });
    }, []);

    if (loading) return <div className={styles.emptyState}>Loading…</div>;
    if (error) return <div className={styles.panelContent}><div className={styles.infoBox}><strong>Eval results not available</strong><br />{error}</div></div>;
    if (!results.length) return <div className={styles.panelContent}><div className={styles.infoBox}>No eval results yet. Scores are recorded automatically each time a user asks a question.</div></div>;

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}><span className={styles.resultCount}>{results.length} eval records</span></div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Time</th><th>Org</th><th>Query</th><th>Precision</th><th>Relevance</th><th>Latency</th></tr></thead>
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

// ── Settings Panel ────────────────────────────────────────────────────────────

const SettingsPanel = () => {
    const [backendOk, setBackendOk] = useState(false);

    useEffect(() => {
        fetch("/auth/me", { headers: authHeaders() })
            .then(r => setBackendOk(r.ok))
            .catch(() => setBackendOk(false));
    }, []);

    const planTiers = [
        { plan: "Free",       docs: "20",  users: "5",   price: "$0 / mo",   color: PLAN_COLORS.free       },
        { plan: "Pro",        docs: "500", users: "25",  price: "$49 / mo",  color: PLAN_COLORS.pro        },
        { plan: "Enterprise", docs: "∞",   users: "∞",   price: "Custom",    color: PLAN_COLORS.enterprise },
    ];

    const services = [
        { name: "Backend API",              ok: backendOk, note: backendOk ? "Running on port 50505" : "Offline" },
        { name: "Azure Blob Storage",       ok: false,     note: "AZURE_STORAGE_ACCOUNT" },
        { name: "Azure AI Search",          ok: false,     note: "AZURE_SEARCH_SERVICE" },
        { name: "Azure OpenAI",             ok: false,     note: "AZURE_OPENAI_SERVICE" },
        { name: "Azure Document Intelligence", ok: false,  note: "AZURE_DOCUMENTINTELLIGENCE_SERVICE" },
    ];

    return (
        <div className={styles.panelContent}>
            <div className={styles.sectionTitle}>Plan Tiers</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
                {planTiers.map(t => (
                    <div key={t.plan} style={{
                        background: "var(--bg-1)", border: `1px solid ${t.color}33`,
                        borderRadius: 12, padding: "1.25rem",
                    }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: t.color, marginBottom: "0.75rem" }}>{t.plan}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.9 }}>
                            <div>📁 {t.docs} documents</div>
                            <div>👥 {t.users} users</div>
                            <div style={{ marginTop: "0.5rem", fontWeight: 700, color: "var(--text-1)" }}>{t.price}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.sectionTitle}>Service Status</div>
            <div className={styles.serviceGrid}>
                {services.map(s => (
                    <div key={s.name} className={`${styles.serviceCard} ${s.ok ? styles.serviceCardOk : styles.serviceCardWarn}`}>
                        <div className={styles.serviceName}><StatusDot ok={s.ok} label={s.name} /></div>
                        <div className={styles.serviceNote}>{s.note}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Registrations Panel ───────────────────────────────────────────────────────

const RegistrationsPanel = () => {
    const [regs,     setRegs]     = useState<Registration[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [approving, setApproving] = useState<string | null>(null);
    const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        fetch("/admin/registrations", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setRegs(d.registrations ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const approve = async (orgId: string, firmName: string) => {
        setApproving(orgId); setMsg(null);
        try {
            const r = await fetch(`/admin/orgs/${orgId}/approve`, {
                method: "PATCH",
                headers: authHeaders(),
            });
            if (r.ok) {
                setRegs(prev => prev.filter(x => x.org_id !== orgId));
                setMsg({ ok: true, text: `✓ ${firmName} approved and activated. Confirmation email sent.` });
            } else {
                const d = await r.json().catch(() => ({}));
                setMsg({ ok: false, text: (d as any).error ?? "Approval failed." });
            }
        } catch {
            setMsg({ ok: false, text: "Network error." });
        }
        setApproving(null);
        setTimeout(() => setMsg(null), 5000);
    };

    if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>;

    return (
        <div>
            {msg && (
                <div style={{
                    background: msg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                    color: msg.ok ? "var(--success)" : "#F87171",
                    borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.5rem", fontSize: "0.87rem",
                }}>
                    {msg.text}
                </div>
            )}

            {regs.length === 0 ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-3)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🎉</div>
                    No pending registrations. All firms are either active or not yet registered.
                </div>
            ) : (
                <>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-3)", marginBottom: "1.5rem" }}>
                        {regs.length} firm{regs.length !== 1 ? "s" : ""} awaiting payment verification and activation.
                    </p>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Firm</th>
                                    <th>Owner</th>
                                    <th>Email</th>
                                    <th>Plan</th>
                                    <th>City</th>
                                    <th>Registered</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {regs.map(r => (
                                    <tr key={r.org_id}>
                                        <td style={{ fontWeight: 600, color: "var(--text-1)" }}>{r.name}</td>
                                        <td>{r.owner_name ?? "—"}</td>
                                        <td>
                                            <a href={`mailto:${r.owner_email}`} style={{ color: "var(--gold)", textDecoration: "none" }}>
                                                {r.owner_email ?? "—"}
                                            </a>
                                        </td>
                                        <td><PlanBadge plan={r.plan} /></td>
                                        <td className={styles.muted}>{r.city ?? "—"}</td>
                                        <td className={styles.muted}>{fmtDate(r.created_at)}</td>
                                        <td>
                                            <button
                                                className={styles.btnPrimary}
                                                style={{ padding: "0.4rem 0.9rem", fontSize: "0.78rem" }}
                                                disabled={approving === r.org_id}
                                                onClick={() => approve(r.org_id, r.name)}
                                            >
                                                {approving === r.org_id ? "Approving…" : "Approve"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

// ── Shell ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Panel; icon: string; label: string }[] = [
    { id: "overview",       icon: "📊", label: "Dashboard"      },
    { id: "orgs",           icon: "🏢", label: "Organizations"  },
    { id: "registrations",  icon: "📝", label: "Registrations"  },
    { id: "evals",          icon: "✅", label: "Eval Quality"   },
    { id: "settings",       icon: "⚙️", label: "Settings"       },
];

const PANEL_TITLES: Record<Panel, string> = {
    overview:      "Platform Dashboard",
    orgs:          "Organizations",
    registrations: "Pending Registrations",
    evals:         "Eval Quality",
    settings:      "Platform Settings",
};

const PANEL_SUBS: Record<Panel, string> = {
    overview: "Platform-wide summary across all organizations",
    orgs:     "Manage tenants, plans, and access",
    evals:    "AI answer quality scores recorded per query",
    settings: "Plan tiers and service configuration",
};

const AdminDashboard = () => {
    const [panel,   setPanel]   = useState<Panel>("overview");
    const [theme,   setTheme]   = useState<Theme>(getTheme());
    const [orgs,    setOrgs]    = useState<Org[]>([]);
    const [stats,   setStats]   = useState<PlatformStats | null>(null);
    const [loading, setLoading] = useState(true);

    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string } : { name: "Admin", email: "" };

    useEffect(() => {
        Promise.all([
            fetch("/admin/stats", { headers: authHeaders() }).then(r => r.json()),
            fetch("/admin/orgs",  { headers: authHeaders() }).then(r => r.json()),
        ]).then(([statsData, orgsData]) => {
            setStats(statsData);
            setOrgs(orgsData.orgs ?? []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        window.location.hash = "/";
    };

    return (
        <div className={styles.shell}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    Project<span className={styles.logoAccent}> Ease</span>
                    <span className={styles.adminChip}>Admin</span>
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
                    <button className={styles.signOutBtn} onClick={signOut}>Sign Out</button>
                </div>
            </aside>

            <div className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.headerTitle}>{PANEL_TITLES[panel]}</h1>
                        <p className={styles.headerSub}>{PANEL_SUBS[panel]}</p>
                    </div>
                    <button className={styles.themeBtn} onClick={() => setTheme(toggleTheme())}>
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
                </header>

                <div className={styles.body}>
                    {loading ? (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                    ) : (
                        <>
                            {panel === "overview"       && <OverviewPanel stats={stats} orgs={orgs} />}
                            {panel === "orgs"           && <OrgsPanel orgs={orgs} setOrgs={setOrgs} />}
                            {panel === "registrations"  && <RegistrationsPanel />}
                            {panel === "evals"          && <EvalsPanel />}
                            {panel === "settings"       && <SettingsPanel />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
