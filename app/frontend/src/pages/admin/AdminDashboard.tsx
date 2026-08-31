import { useState, useEffect } from "react";
import styles from "./AdminDashboard.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";
import { Table, Modal, Badge, Button, BadgeTone } from "../../components/ui";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "overview" | "orgs" | "registrations" | "upgrades" | "features" | "case_law" | "evals" | "audit" | "settings";

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

const PLAN_TONE: Record<string, BadgeTone> = { free: "gray", pro: "blue", enterprise: "gold" };
const orgStatusTone = (status: string): BadgeTone => (status === "active" ? "green" : "red");
const docStatusTone = (status: string): BadgeTone => (status === "ready" ? "green" : "amber");

const PlanBadge = ({ plan }: { plan: string }) => (
    <Badge tone={PLAN_TONE[plan] ?? "gray"}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge>
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
        <Modal open onClose={onClose} maxWidth={680} title={details ? details.name : undefined}>
            {loading || !details ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.25rem" }}>
                        <PlanBadge plan={details.plan} />
                        <Badge tone={orgStatusTone(details.status)}>{details.status}</Badge>
                        <span className={styles.muted} style={{ fontSize: "0.78rem" }}>{details.industry}</span>
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
                    <div style={{ marginBottom: "1.25rem", maxHeight: 180, overflowY: "auto" }}>
                        <Table dense>
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
                        </Table>
                    </div>

                    {/* Documents */}
                    <div className={styles.sectionTitle} style={{ marginBottom: "0.5rem" }}>Documents ({details.documents.length})</div>
                    <div style={{ maxHeight: 180, overflowY: "auto" }}>
                        <Table dense empty={details.documents.length === 0} emptyMessage="No documents uploaded yet.">
                            <thead><tr><th>File</th><th>Size</th><th>Status</th><th>Uploaded</th></tr></thead>
                            <tbody>
                                {details.documents.map(d => (
                                    <tr key={d.doc_id}>
                                        <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</td>
                                        <td className={styles.muted}>{fmtBytes(d.size_bytes)}</td>
                                        <td><Badge tone={docStatusTone(d.status)}>{d.status}</Badge></td>
                                        <td className={styles.muted}>{fmtDate(d.uploaded_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </>
            )}
        </Modal>
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
            <Table>
                <thead><tr><th>Name</th><th>Plan</th><th>Users</th><th>Docs</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                    {orgs.map(o => (
                        <tr key={o.org_id}>
                            <td><strong>{o.name}</strong><div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{o.industry}</div></td>
                            <td><PlanBadge plan={o.plan} /></td>
                            <td className={styles.muted}>{o.user_count}</td>
                            <td className={styles.muted}>{o.doc_count}</td>
                            <td><Badge tone={orgStatusTone(o.status)}>{o.status}</Badge></td>
                            <td className={styles.muted}>{fmtDate(o.created_at)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
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
                <Button onClick={() => { setShowCreate(true); setActionError(null); }}>
                    + Add Organization
                </Button>
            </div>

            {actionError && (
                <div className={styles.errorBanner}>
                    ⚠ {actionError}
                    <button className={styles.errorDismiss} onClick={() => setActionError(null)}>×</button>
                </div>
            )}

            <Table>
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
                            <td><Badge tone={orgStatusTone(o.status)}>{o.status}</Badge></td>
                            <td className={styles.muted}>{fmtDate(o.created_at)}</td>
                            <td>
                                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                    <Button variant="ghost" size="sm" onClick={() => setDetailOrgId(o.org_id)}>
                                        View
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setEditOrg(o);
                                        setPlanForm({ plan: o.plan, max_docs: o.max_docs, max_users: o.max_users });
                                    }}>
                                        Plan
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleSuspendToggle(o)}>
                                        {o.status === "active" ? "Suspend" : "Activate"}
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(o)}>
                                        Delete
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Create org modal */}
            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Add Organization"
                footer={<>
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button onClick={handleCreate} loading={saving}>Create Organization</Button>
                </>}
            >
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
            </Modal>

            {/* New org credentials */}
            <Modal
                open={!!createCreds}
                onClose={() => setCreateCreds(null)}
                title="Organization Created ✓"
                footer={<Button onClick={() => setCreateCreds(null)}>Done</Button>}
            >
                <p className={styles.muted} style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
                    Share these login credentials with the org owner. They will be prompted to set a new password on first login.
                </p>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Owner Email</label>
                    <input className={styles.formInput} readOnly value={createCreds?.email ?? ""} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Temporary Password</label>
                    <input className={styles.formInput} readOnly value={createCreds?.password ?? ""} />
                </div>
            </Modal>

            {/* Edit plan modal */}
            <Modal
                open={!!editOrg}
                onClose={() => setEditOrg(null)}
                title={`Change Plan — ${editOrg?.name ?? ""}`}
                footer={<>
                    <Button variant="ghost" onClick={() => setEditOrg(null)}>Cancel</Button>
                    <Button onClick={handlePlanSave} loading={saving}>Save</Button>
                </>}
            >
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
            </Modal>

            {/* Confirm delete */}
            <Modal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title="Delete Organization"
                footer={<>
                    <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete Forever</Button>
                </>}
            >
                <p className={styles.muted} style={{ fontSize: "0.84rem" }}>
                    This will permanently delete <strong style={{ color: "var(--text-1)" }}>{confirmDelete?.name}</strong> and all its users, documents, and data. This cannot be undone.
                </p>
            </Modal>

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
            <Table>
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
            </Table>
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
                    <Table>
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
                                        <Button
                                            size="sm"
                                            loading={approving === r.org_id}
                                            onClick={() => approve(r.org_id, r.name)}
                                        >
                                            Approve
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </>
            )}
        </div>
    );
};

// ── Upgrade Requests Panel ────────────────────────────────────────────────────

interface UpgradeRequest {
    request_id:     string;
    org_id:         string;
    org_name:       string;
    current_plan:   string;
    requested_plan: string;
    status:         "pending" | "approved" | "rejected";
    payment_ref:    string | null;
    notes:          string | null;
    created_at:     string;
    resolved_at:    string | null;
    resolved_by:    string | null;
}

const UPGRADE_STATUS_COLORS: Record<string, string> = {
    pending:  "#f59e0b",
    approved: "#22c55e",
    rejected: "#ef4444",
};

const AdminUpgradesPanel = () => {
    const [requests, setRequests] = useState<UpgradeRequest[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [filter,   setFilter]   = useState<"all" | "pending" | "approved" | "rejected">("pending");
    const [acting,   setActing]   = useState<string | null>(null);
    const [msg,      setMsg]      = useState<{ id: string; ok: boolean; text: string } | null>(null);

    const load = (status?: string) => {
        setLoading(true);
        const qs = status && status !== "all" ? `?status=${status}` : "";
        fetch(`/admin/upgrade-requests${qs}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setRequests(d.requests ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { load(filter); }, [filter]);

    const resolve = async (requestId: string, action: "approve" | "reject") => {
        setActing(requestId); setMsg(null);
        try {
            const r = await fetch(`/admin/upgrade-requests/${requestId}/${action}`, {
                method: "PATCH", headers: authHeaders(),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) {
                setMsg({ id: requestId, ok: true, text: action === "approve" ? "Approved — plan upgraded." : "Rejected." });
                load(filter);
            } else {
                setMsg({ id: requestId, ok: false, text: d.error ?? "Action failed." });
            }
        } catch {
            setMsg({ id: requestId, ok: false, text: "Network error." });
        } finally {
            setActing(null);
        }
    };

    const pending = requests.filter(r => r.status === "pending").length;

    return (
        <div style={{ padding: "0 0 2rem" }}>

            {/* Filter bar */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
                {(["pending", "approved", "rejected", "all"] as const).map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        style={{
                            padding: "0.3rem 0.85rem",
                            borderRadius: 100,
                            border: filter === s ? "1px solid var(--gold)" : "1px solid var(--border)",
                            background: filter === s ? "var(--gold)" : "transparent",
                            color: filter === s ? "#1a1200" : "var(--text-2)",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            textTransform: "capitalize",
                        }}
                    >
                        {s}{s === "pending" && pending > 0 ? ` (${pending})` : ""}
                    </button>
                ))}
                <span className={styles.muted} style={{ marginLeft: "auto", fontSize: "0.8rem" }}>
                    {requests.length} result{requests.length !== 1 ? "s" : ""}
                </span>
            </div>

            {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
            ) : requests.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>
                    No {filter !== "all" ? filter : ""} upgrade requests.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {requests.map(req => (
                        <div
                            key={req.request_id}
                            style={{
                                background: "var(--bg-1)",
                                border: `1px solid ${req.status === "pending" ? "var(--gold)" : "var(--border)"}`,
                                borderRadius: 10,
                                padding: "1rem 1.25rem",
                            }}
                        >
                            {/* Header row */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 700, color: "var(--text-1)", fontSize: "0.95rem", marginBottom: "0.2rem" }}>
                                        {req.org_name}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
                                        <span style={{
                                            color: UPGRADE_STATUS_COLORS[req.current_plan] ?? "var(--text-3)",
                                            fontWeight: 600, textTransform: "capitalize",
                                        }}>{req.current_plan}</span>
                                        {" → "}
                                        <span style={{
                                            color: UPGRADE_STATUS_COLORS[req.requested_plan] ?? "var(--gold)",
                                            fontWeight: 700, textTransform: "capitalize",
                                        }}>{req.requested_plan}</span>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                                    <span style={{
                                        background: `${UPGRADE_STATUS_COLORS[req.status]}22`,
                                        color: UPGRADE_STATUS_COLORS[req.status],
                                        border: `1px solid ${UPGRADE_STATUS_COLORS[req.status]}44`,
                                        borderRadius: 100,
                                        padding: "0.12rem 0.6rem",
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        textTransform: "capitalize",
                                    }}>{req.status}</span>
                                    <span className={styles.muted} style={{ fontSize: "0.75rem" }}>
                                        {fmtDate(req.created_at)}
                                    </span>
                                </div>
                            </div>

                            {/* Details */}
                            <div style={{ marginTop: "0.75rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                                {req.payment_ref && (
                                    <div>
                                        <span style={{ color: "var(--text-3)" }}>Payment Ref: </span>
                                        <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{req.payment_ref}</span>
                                    </div>
                                )}
                                {req.notes && (
                                    <div>
                                        <span style={{ color: "var(--text-3)" }}>Notes: </span>
                                        <span style={{ color: "var(--text-2)" }}>{req.notes}</span>
                                    </div>
                                )}
                                {req.resolved_at && (
                                    <div>
                                        <span style={{ color: "var(--text-3)" }}>Resolved: </span>
                                        <span style={{ color: "var(--text-2)" }}>{fmtDate(req.resolved_at)}</span>
                                        {req.resolved_by && <span style={{ color: "var(--text-3)" }}> by {req.resolved_by}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Feedback message */}
                            {msg?.id === req.request_id && (
                                <div style={{
                                    marginTop: "0.6rem",
                                    fontSize: "0.82rem",
                                    color: msg.ok ? "var(--success)" : "var(--danger)",
                                    fontWeight: 500,
                                }}>
                                    {msg.text}
                                </div>
                            )}

                            {/* Action buttons (pending only) */}
                            {req.status === "pending" && (
                                <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.6rem" }}>
                                    <button
                                        className={styles.btnPrimary}
                                        style={{ padding: "0.4rem 1.1rem", fontSize: "0.82rem" }}
                                        disabled={acting === req.request_id}
                                        onClick={() => resolve(req.request_id, "approve")}
                                    >
                                        {acting === req.request_id ? "…" : "Approve"}
                                    </button>
                                    <button
                                        className={styles.btnGhost}
                                        style={{ padding: "0.4rem 1.1rem", fontSize: "0.82rem", borderColor: "var(--danger, #c94040)", color: "var(--danger, #c94040)" }}
                                        disabled={acting === req.request_id}
                                        onClick={() => resolve(req.request_id, "reject")}
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Admin Audit Panel ─────────────────────────────────────────────────────────

interface AuditLog {
    log_id:        string;
    org_id:        string | null;
    user_id:       string | null;
    actor_name:    string | null;
    actor_role:    string | null;
    event_type:    string;
    resource_type: string | null;
    resource_id:   string | null;
    resource_name: string | null;
    details:       string | null;
    ip_address:    string | null;
    created_at:    string;
}

const ADMIN_EVENT_LABELS: Record<string, string> = {
    login_success:  "Login",       login_fail:     "Failed Login",
    logout:         "Logout",      password_change: "Password Change",
    doc_upload:     "Doc Upload",  doc_delete:     "Doc Delete",
    search:         "Search",      member_invite:  "Member Invited",
    member_remove:  "Member Removed",
    client_create:  "Client Created",  client_update:  "Client Updated",
    client_delete:  "Client Deleted",  matter_create:  "Matter Created",
    matter_update:  "Matter Updated",  matter_delete:  "Matter Deleted",
    org_update:     "Settings Updated", access_denied: "Access Denied",
};

const AdminAuditPanel = ({ orgs }: { orgs: { org_id: string; name: string }[] }) => {
    const [logs,       setLogs]       = useState<AuditLog[]>([]);
    const [total,      setTotal]      = useState(0);
    const [loading,    setLoading]    = useState(true);
    const [filterType, setFilterType] = useState("all");
    const [filterOrg,  setFilterOrg]  = useState("all");
    const [dateFrom,   setDateFrom]   = useState("");
    const [dateTo,     setDateTo]     = useState("");
    const [page,       setPage]       = useState(0);
    const PAGE_SIZE = 200;

    const load = (pg = 0) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterType !== "all") params.set("event_type", filterType);
        if (filterOrg  !== "all") params.set("org_id",     filterOrg);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo)   params.set("date_to",   dateTo);
        params.set("limit",  String(PAGE_SIZE));
        params.set("offset", String(pg * PAGE_SIZE));
        fetch(`/audit-logs?${params}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { setPage(0); load(0); }, [filterType, filterOrg, dateFrom, dateTo]);

    const exportCsv = () => {
        const header = "Timestamp,Org,Event,Actor,Role,Resource,IP,Details\n";
        const rows = logs.map(l => {
            const orgName = orgs.find(o => o.org_id === l.org_id)?.name ?? l.org_id ?? "";
            let details = "";
            if (l.details) { try { details = JSON.stringify(JSON.parse(l.details)); } catch { details = l.details; } }
            return [
                l.created_at,
                orgName,
                ADMIN_EVENT_LABELS[l.event_type] ?? l.event_type,
                l.actor_name ?? "",
                l.actor_role ?? "",
                [l.resource_type, l.resource_name].filter(Boolean).join(": "),
                l.ip_address ?? "",
                details,
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
        }).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `platform-audit-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <select className={styles.formSelect} value={filterOrg} onChange={e => setFilterOrg(e.target.value)}>
                        <option value="all">All organizations</option>
                        {orgs.map(o => <option key={o.org_id} value={o.org_id}>{o.name}</option>)}
                    </select>
                    <select className={styles.formSelect} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All events</option>
                        {Object.entries(ADMIN_EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="date" className={styles.formInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From" />
                    <input type="date" className={styles.formInput} value={dateTo}   onChange={e => setDateTo(e.target.value)}   title="To" />
                    <span className={styles.muted} style={{ fontSize: "0.8rem" }}>{total} event{total !== 1 ? "s" : ""}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={exportCsv} disabled={logs.length === 0}>↓ Export CSV</Button>
            </div>

            {loading ? (
                <div className={styles.emptyState}>Loading…</div>
            ) : logs.length === 0 ? (
                <div className={styles.emptyState}>No events match the selected filters.</div>
            ) : (
                <>
                    <Table>
                        <thead><tr>
                            <th>Timestamp</th><th>Org</th><th>Event</th><th>Actor</th><th>Role</th><th>Resource</th><th>IP</th><th>Details</th>
                        </tr></thead>
                        <tbody>
                            {logs.map(l => {
                                const orgName = orgs.find(o => o.org_id === l.org_id)?.name ?? l.org_id ?? "—";
                                let detailStr = "";
                                if (l.details) {
                                    try {
                                        const parsed = JSON.parse(l.details);
                                        if (parsed.query) detailStr = `"${parsed.query}"`;
                                        else if (parsed.email) detailStr = parsed.email;
                                        else detailStr = Object.entries(parsed).filter(([,v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(", ");
                                    } catch { detailStr = l.details; }
                                }
                                return (
                                    <tr key={l.log_id}>
                                        <td className={styles.muted} style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>{l.created_at.slice(0, 19).replace("T", " ")}</td>
                                        <td style={{ fontSize: "0.8rem" }}>{orgName}</td>
                                        <td style={{ fontSize: "0.8rem", fontWeight: 600 }}>{ADMIN_EVENT_LABELS[l.event_type] ?? l.event_type}</td>
                                        <td style={{ fontSize: "0.8rem" }}>{l.actor_name ?? "—"}</td>
                                        <td className={styles.muted}>{l.actor_role ?? "—"}</td>
                                        <td className={styles.muted} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {[l.resource_type, l.resource_name].filter(Boolean).join(": ") || "—"}
                                        </td>
                                        <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{l.ip_address ?? "—"}</td>
                                        <td className={styles.muted} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={detailStr}>
                                            {detailStr || "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem", justifyContent: "center" }}>
                            <Button variant="ghost" size="sm" disabled={page === 0}
                                onClick={() => { setPage(page - 1); load(page - 1); }}>← Prev</Button>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Page {page + 1} of {totalPages}</span>
                            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1}
                                onClick={() => { setPage(page + 1); load(page + 1); }}>Next →</Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── Case Law Panel ────────────────────────────────────────────────────────────

interface CaseLawDoc {
    doc_id:     string;
    publisher:  string;
    title:      string;
    year:       number | null;
    volume:     string | null;
    court:      string | null;
    filename:   string;
    size_bytes: number;
    status:     "processing" | "ready" | "error";
    error_msg:  string | null;
    indexed_by: string;
    created_at: string;
}

const PUBLISHERS = ["PLD", "SCMR", "MLD", "CLC", "OTHER"];

const CASE_LAW_STATUS_TONE: Record<string, BadgeTone> = {
    ready: "green", processing: "amber", error: "red",
};

function fmtBytesAdmin(b: number): string {
    if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
    if (b >= 1024)      return `${Math.round(b / 1024)} KB`;
    return `${b} B`;
}

// ── Feature Access Panel — Task #162 ─────────────────────────────────────────
interface OrgFlagRow { org_id: string; name: string; flags: Record<string, boolean>; }

const FeatureAccessPanel = () => {
    const [rows,    setRows]    = useState<OrgFlagRow[]>([]);
    const [keys,    setKeys]    = useState<string[]>([]);
    const [labels,  setLabels]  = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState<string | null>(null);   // org_id being saved
    const [search,  setSearch]  = useState("");
    const [err,     setErr]     = useState<string | null>(null);

    const api = (path: string, opts?: RequestInit) =>
        fetch(path, { ...opts, headers: { Authorization: `Bearer ${sessionStorage.getItem("pe_token") ?? ""}`, "Content-Type": "application/json", ...(opts?.headers || {}) } });

    const load = async () => {
        setLoading(true); setErr(null);
        try {
            const r = await api("/admin/org-flags");
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            setRows(d.orgs || []);
            setKeys(d.feature_keys || []);
            setLabels(d.feature_labels || {});
        } catch (e: any) { setErr(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const toggle = async (org_id: string, feature: string, current: boolean) => {
        // Optimistic update
        setRows(prev => prev.map(r =>
            r.org_id === org_id ? { ...r, flags: { ...r.flags, [feature]: !current } } : r
        ));
        setSaving(org_id);
        try {
            const row = rows.find(r => r.org_id === org_id);
            const newFlags = { ...(row?.flags || {}), [feature]: !current };
            const res = await api(`/admin/org-flags/${org_id}`, {
                method: "PUT", body: JSON.stringify({ flags: newFlags })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const d = await res.json();
            setRows(prev => prev.map(r => r.org_id === org_id ? { ...r, flags: d.flags } : r));
        } catch (e: any) {
            setErr(e.message);
            // revert on failure
            setRows(prev => prev.map(r =>
                r.org_id === org_id ? { ...r, flags: { ...(r.flags || {}), [feature]: current } } : r
            ));
        } finally { setSaving(null); }
    };

    const enableAll  = async (org_id: string) => {
        const all: Record<string, boolean> = {};
        keys.forEach(k => all[k] = true);
        setSaving(org_id);
        try {
            const res = await api(`/admin/org-flags/${org_id}`, { method: "PUT", body: JSON.stringify({ flags: all }) });
            const d = await res.json();
            setRows(prev => prev.map(r => r.org_id === org_id ? { ...r, flags: d.flags } : r));
        } finally { setSaving(null); }
    };

    const disableAll = async (org_id: string) => {
        const none: Record<string, boolean> = {};
        keys.forEach(k => none[k] = false);
        setSaving(org_id);
        try {
            const res = await api(`/admin/org-flags/${org_id}`, { method: "PUT", body: JSON.stringify({ flags: none }) });
            const d = await res.json();
            setRows(prev => prev.map(r => r.org_id === org_id ? { ...r, flags: d.flags } : r));
        } finally { setSaving(null); }
    };

    const filtered = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

    // Group features into categories for display
    const featureGroups: { label: string; keys: string[] }[] = [
        { label: "Core",        keys: ["documents", "clients", "matters"] },
        { label: "Calendar",    keys: ["calendar", "diary", "causelist"] },
        { label: "Finance",     keys: ["invoices", "wht_invoicing"] },
        { label: "Operations",  keys: ["team", "drafting", "vakalat"] },
        { label: "Intelligence",keys: ["intelligence", "lhc_lookup"] },
        { label: "Integrations",keys: ["client_portal", "whatsapp"] },
        { label: "System",      keys: ["audit"] },
    ];

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.muted}>Toggle features on/off per organisation. Changes take effect immediately.</span>
                <input
                    className={styles.formInput}
                    placeholder="Search organisations…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ marginLeft: "auto", width: 220 }}
                />
            </div>
            {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.75rem" }}>Error: {err}</div>}

            {loading ? (
                <div className={styles.muted} style={{ textAlign: "center", padding: "3rem" }}>Loading feature flags…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.muted} style={{ textAlign: "center", padding: "3rem" }}>No organisations found.</div>
            ) : filtered.map(org => {
                const isSaving = saving === org.org_id;
                const enabledCount = keys.filter(k => org.flags[k] !== false).length;
                return (
                    <div key={org.org_id} style={{
                        background: "var(--bg-1)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius)", marginBottom: "1rem", overflow: "hidden"
                    }}>
                        {/* Org header */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1rem",
                            borderBottom: "1px solid var(--border)", background: "var(--bg-0)"
                        }}>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-1)" }}>{org.name}</span>
                            <span className={styles.muted} style={{ marginRight: "auto" }}>
                                {enabledCount}/{keys.length} features enabled
                            </span>
                            {isSaving && <span style={{ fontSize: "0.75rem", color: "var(--gold)" }}>Saving…</span>}
                            <Button variant="ghost" size="sm" style={{ borderColor: "#16a34a", color: "#16a34a" }}
                                onClick={() => enableAll(org.org_id)} disabled={isSaving}>Enable All</Button>
                            <Button variant="ghost" size="sm" style={{ borderColor: "#dc2626", color: "#dc2626" }}
                                onClick={() => disableAll(org.org_id)} disabled={isSaving}>Disable All</Button>
                        </div>

                        {/* Feature groups */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1, background: "var(--border)" }}>
                            {featureGroups.map(group => (
                                <div key={group.label} style={{ background: "var(--bg-1)", padding: "0.75rem 1rem" }}>
                                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: "0.5rem" }}>
                                        {group.label}
                                    </div>
                                    {group.keys.map(fk => {
                                        const enabled = org.flags[fk] !== false;
                                        return (
                                            <label key={fk} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "0.3rem 0", cursor: "pointer", gap: "0.5rem"
                                            }}>
                                                <span style={{ fontSize: "0.82rem", color: enabled ? "var(--text-1)" : "var(--text-3)" }}>
                                                    {labels[fk] || fk}
                                                </span>
                                                {/* Toggle switch */}
                                                <span
                                                    onClick={() => !isSaving && toggle(org.org_id, fk, enabled)}
                                                    style={{
                                                        display: "inline-flex", alignItems: "center",
                                                        width: 40, height: 22, borderRadius: "var(--radius-pill, 11px)",
                                                        background: enabled ? "var(--gold)" : "var(--border)",
                                                        position: "relative", cursor: isSaving ? "not-allowed" : "pointer",
                                                        transition: "background var(--transition-fast, 0.2s)", flexShrink: 0
                                                    }}
                                                >
                                                    <span style={{
                                                        position: "absolute", width: 16, height: 16, borderRadius: "50%",
                                                        background: "#fff", left: enabled ? 21 : 3,
                                                        transition: "left var(--transition-fast, 0.2s)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
                                                    }} />
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const AdminCaseLawPanel = () => {
    const [docs,       setDocs]       = useState<CaseLawDoc[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [pubFilter,  setPubFilter]  = useState("ALL");
    const [uploading,  setUploading]  = useState(false);
    const [uploadErr,  setUploadErr]  = useState<string | null>(null);
    const [uploadOk,   setUploadOk]   = useState(false);
    const [deleting,   setDeleting]   = useState<string | null>(null);

    // Upload form state
    const [file,      setFile]      = useState<File | null>(null);
    const [publisher, setPublisher] = useState("PLD");
    const [title,     setTitle]     = useState("");
    const [year,      setYear]      = useState("");
    const [volume,    setVolume]    = useState("");
    const [court,     setCourt]     = useState("");

    const token = () => sessionStorage.getItem("pe_token") ?? "";
    const auth  = () => ({ Authorization: `Bearer ${token()}` });

    const load = async () => {
        setLoading(true);
        try {
            const url = pubFilter !== "ALL" ? `/admin/case-law?publisher=${pubFilter}` : "/admin/case-law";
            const res = await fetch(url, { headers: auth() });
            if (res.ok) {
                const d = await res.json();
                setDocs(d.docs ?? []);
            }
        } catch { /* silent */ }
        setLoading(false);
    };

    useEffect(() => { load(); }, [pubFilter]);

    const handleUpload = async () => {
        if (!file) { setUploadErr("Please select a PDF file."); return; }
        if (!title.trim()) { setUploadErr("Please enter a title."); return; }
        setUploadErr(null); setUploadOk(false); setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file",      file);
            fd.append("publisher", publisher);
            fd.append("title",     title.trim());
            fd.append("year",      year);
            fd.append("volume",    volume.trim());
            fd.append("court",     court.trim());
            const res = await fetch("/admin/case-law/upload", { method: "POST", headers: auth(), body: fd });
            const data = await res.json();
            if (!res.ok) { setUploadErr(data.error ?? "Upload failed."); return; }
            setUploadOk(true);
            setFile(null); setTitle(""); setYear(""); setVolume(""); setCourt("");
            setTimeout(() => { setUploadOk(false); load(); }, 1500);
        } catch { setUploadErr("Network error. Please try again."); }
        finally { setUploading(false); }
    };

    const handleDelete = async (docId: string) => {
        if (!window.confirm("Remove this document from the case law library? It will no longer appear in searches.")) return;
        setDeleting(docId);
        try {
            await fetch(`/admin/case-law/${docId}`, { method: "DELETE", headers: auth() });
            setDocs(prev => prev.filter(d => d.doc_id !== docId));
        } catch { /* silent */ }
        setDeleting(null);
    };

    return (
        <div className={styles.panelContent}>
            {/* ── Upload form ── */}
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.75rem", marginBottom: "1.5rem" }}>
                <div className={styles.sectionTitle}>Upload Case Law Document</div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: "1.25rem" }}>
                    Upload a PDF volume of PLD, SCMR, MLD, or CLC. It will be indexed into the shared
                    case law pool and will appear in every user's AI search results automatically.
                </p>

                {uploadErr && (
                    <div className={styles.errorBanner} style={{ marginBottom: "1rem" }}>{uploadErr}</div>
                )}
                {uploadOk && (
                    <div className={styles.successBanner} style={{ marginBottom: "1rem" }}>
                        ✓ Upload started — indexing in background. Status will update to "Ready" when complete.
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                        <label className={styles.formLabel}>Publisher</label>
                        <select className={styles.formInput} value={publisher} onChange={e => setPublisher(e.target.value)}>
                            {PUBLISHERS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={styles.formLabel}>Year</label>
                        <input className={styles.formInput} type="number" placeholder="2019" value={year}
                            onChange={e => setYear(e.target.value)} min={1900} max={2099} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>Title <span style={{ color: "var(--gold)" }}>*</span></label>
                        <input className={styles.formInput} type="text"
                            placeholder="e.g. PLD 2019 Supreme Court 412"
                            value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.formLabel}>Volume / Issue</label>
                        <input className={styles.formInput} type="text" placeholder="Vol. 5 (optional)"
                            value={volume} onChange={e => setVolume(e.target.value)} />
                    </div>
                    <div>
                        <label className={styles.formLabel}>Court</label>
                        <input className={styles.formInput} type="text" placeholder="Supreme Court (optional)"
                            value={court} onChange={e => setCourt(e.target.value)} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>PDF File <span style={{ color: "var(--gold)" }}>*</span></label>
                        <input type="file" accept=".pdf"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                            style={{ color: "var(--text-2)", fontSize: "0.85rem" }} />
                    </div>
                </div>

                <Button
                    style={{ marginTop: "1.25rem" }}
                    onClick={handleUpload}
                    loading={uploading}
                >
                    Upload & Index
                </Button>
            </div>

            {/* ── Publisher filter + doc list ── */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                {["ALL", ...PUBLISHERS].map(p => (
                    <button
                        key={p}
                        className={pubFilter === p ? styles.chipActive : styles.chip}
                        onClick={() => setPubFilter(p)}
                    >
                        {p}
                    </button>
                ))}
                <button className={styles.chip} onClick={load} style={{ marginLeft: "auto" }}>↻ Refresh</button>
            </div>

            {loading ? (
                <div style={{ color: "var(--text-3)", fontSize: "0.85rem", padding: "2rem 0" }}>Loading…</div>
            ) : docs.length === 0 ? (
                <div style={{ color: "var(--text-3)", fontSize: "0.85rem", padding: "2rem 0" }}>
                    No case law documents uploaded yet. Use the form above to add PLD or SCMR volumes.
                </div>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Publisher</th>
                            <th>Year</th>
                            <th>Court</th>
                            <th>Size</th>
                            <th>Status</th>
                            <th>Uploaded</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {docs.map(doc => (
                            <tr key={doc.doc_id}>
                                <td style={{ fontWeight: 500 }}>{doc.title}</td>
                                <td><Badge tone="gold">{doc.publisher}</Badge></td>
                                <td style={{ color: "var(--text-3)" }}>{doc.year ?? "—"}</td>
                                <td style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>{doc.court ?? "—"}</td>
                                <td style={{ color: "var(--text-3)" }}>{fmtBytesAdmin(doc.size_bytes)}</td>
                                <td>
                                    <Badge tone={CASE_LAW_STATUS_TONE[doc.status] ?? "gray"}>
                                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                        {doc.status === "error" && doc.error_msg && (
                                            <span title={doc.error_msg} style={{ marginLeft: "0.3rem", cursor: "help" }}>⚠</span>
                                        )}
                                    </Badge>
                                </td>
                                <td style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>{doc.created_at?.slice(0, 10)}</td>
                                <td>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDelete(doc.doc_id)}
                                        loading={deleting === doc.doc_id}
                                    >
                                        Remove
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </div>
    );
};

// ── Shell ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Panel; icon: string; label: string }[] = [
    { id: "overview",       icon: "📊", label: "Dashboard"       },
    { id: "orgs",           icon: "🏢", label: "Organizations"   },
    { id: "registrations",  icon: "📝", label: "Registrations"   },
    { id: "upgrades",       icon: "⬆️", label: "Upgrade Requests"},
    { id: "features",       icon: "🔧", label: "Feature Access"  },
    { id: "case_law",       icon: "⚖️", label: "Case Law Library"},
    { id: "evals",          icon: "✅", label: "Eval Quality"    },
    { id: "audit",          icon: "🔍", label: "Audit Log"       },
    { id: "settings",       icon: "⚙️", label: "Settings"        },
];

const PANEL_TITLES: Record<Panel, string> = {
    overview:      "Platform Dashboard",
    orgs:          "Organizations",
    registrations: "Pending Registrations",
    upgrades:      "Upgrade Requests",
    features:      "Feature Access Control",
    case_law:      "Case Law Library",
    evals:         "Eval Quality",
    audit:         "Platform Audit Log",
    settings:      "Platform Settings",
};

const PANEL_SUBS: Record<Panel, string> = {
    overview:      "Platform-wide summary across all organizations",
    orgs:          "Manage tenants, plans, and access",
    registrations: "Pending sign-ups awaiting approval",
    upgrades:      "Review bank transfer proofs and approve or reject plan upgrades",
    features:      "Enable or disable specific features per organisation — changes take effect immediately",
    case_law:      "Upload PLD, SCMR, MLD and CLC volumes — visible to all users during AI search",
    evals:         "AI answer quality scores recorded per query",
    audit:         "All logins, searches, and actions across every organization",
    settings:      "Plan tiers and service configuration",
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
                            {panel === "upgrades"       && <AdminUpgradesPanel />}
                            {panel === "features"       && <FeatureAccessPanel />}
                            {panel === "case_law"       && <AdminCaseLawPanel />}
                            {panel === "evals"          && <EvalsPanel />}
                            {panel === "audit"          && <AdminAuditPanel orgs={orgs.map(o => ({ org_id: o.org_id, name: o.name }))} />}
                            {panel === "settings"       && <SettingsPanel />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
