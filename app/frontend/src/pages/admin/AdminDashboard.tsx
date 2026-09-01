import { useState, useEffect } from "react";
import { toggleTheme, getTheme, Theme } from "../../theme";
import { Table, Modal, Badge, Button, BadgeTone } from "../../components/ui";
import type { Org, PlatformStats } from "./types";
import {
    useAdminStats,
    useAdminOrgsList,
    useOrgDetails,
    useCreateOrg,
    useUpdateOrg,
    useDeleteOrg,
    useBackendHealth,
} from "../../hooks/useAdminOrgs";
import { useRegistrations, useApproveRegistration } from "../../hooks/useAdminRegistrations";
import { useUpgradeRequests, useResolveUpgradeRequest } from "../../hooks/useAdminUpgrades";
import { useOrgFlags, useUpdateOrgFlags } from "../../hooks/useAdminFeatureFlags";
import { useCaseLawDocs, useUploadCaseLaw, useDeleteCaseLawDoc } from "../../hooks/useAdminCaseLaw";
import { useEvalResults } from "../../hooks/useAdminEvals";
import { useAdminAuditLog } from "../../hooks/useAdminAuditLog";
import { useLogout } from "../../hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "overview" | "orgs" | "registrations" | "upgrades" | "features" | "case_law" | "evals" | "audit" | "settings";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
    free:       "#94a3b8",
    pro:        "#60a5fa",
    enterprise: "#c084fc",
};

const INDUSTRIES = ["Law Practice", "CA / Accounting", "Logistics", "Financial Services", "Healthcare", "Other"];

// ── Tailwind class constants (ported 1:1 from AdminDashboard.module.css) ───────

const MUTED = "text-sm !text-ink-3";
const SECTION_TITLE = "m-0 mb-[0.85rem] font-serif text-[1rem] font-bold tracking-[-0.01em] text-ink-1";
const PANEL_CONTENT = "max-w-[1100px]";
const PANEL_TOOLBAR = "mb-5 flex items-center justify-between";
const RESULT_COUNT = "text-sm text-ink-3";
const ERROR_BANNER = "mb-3 flex items-center gap-3 rounded-[12px] border border-[rgba(220,53,69,0.35)] bg-[rgba(220,53,69,0.12)] px-4 py-[0.7rem] text-[0.85rem] text-[#e05260]";
const ERROR_DISMISS = "ml-auto cursor-pointer border-none bg-transparent text-[1.1rem] text-inherit opacity-70 hover:opacity-100";
const FORM_GROUP = "mb-4";
const FORM_LABEL = "mb-[0.4rem] block text-xs font-bold uppercase tracking-[0.05em] text-ink-2";
const FORM_INPUT = "w-full box-border rounded-[7px] border border-border-md bg-bg-2 px-[0.9rem] py-[0.65rem] font-sans text-[0.875rem] text-ink-1 outline-none transition-[border-color] duration-150 placeholder:text-ink-3 focus:border-gold-border focus:bg-gold-dim";
const FORM_SELECT = `${FORM_INPUT} cursor-pointer appearance-none [&>option]:bg-bg-1 [&>option]:text-ink-1`;
const INFO_BOX = "rounded-[12px] border border-gold-border bg-gold-dim px-6 py-5 text-[0.875rem] leading-[1.65] text-ink-2";
const EMPTY_STATE = "py-16 text-center text-[0.9rem] text-ink-3";
const SERVICE_GRID = "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4";
const SERVICE_CARD = "rounded-[12px] border-l-[3px] bg-bg-1 p-5";
const SERVICE_CARD_OK = "border-success";
const SERVICE_CARD_WARN = "border-border-md";
const SERVICE_NAME = "mb-[0.4rem] font-semibold";
const SERVICE_NOTE = "text-[0.78rem] leading-[1.5] text-ink-3";
const QUERY_CELL = "max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap";
const BTN_PRIMARY = "rounded-sm border-none bg-[linear-gradient(135deg,var(--gold)_0%,#9C7A28_100%)] px-5 py-[0.55rem] font-sans text-[0.85rem] font-bold text-[#05080F] transition-[opacity,transform] duration-150 hover:-translate-y-px hover:opacity-[0.88]";
const BTN_GHOST = "rounded-sm border border-border-md bg-transparent px-5 py-[0.55rem] font-sans text-[0.85rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-ink-2 hover:text-ink-1";
const SUCCESS_BANNER = "rounded-sm border border-[rgba(46,158,79,0.35)] bg-[rgba(46,158,79,0.10)] px-4 py-[0.65rem] text-[0.83rem] leading-[1.5] text-[#2e9e4f]";
const CHIP = "inline-flex cursor-pointer items-center rounded-pill border border-border bg-transparent px-[0.85rem] py-[0.3rem] font-sans text-[0.75rem] font-semibold text-ink-2 transition-[border-color,color] duration-150 hover:border-gold hover:text-gold";
const CHIP_ACTIVE = "inline-flex cursor-pointer items-center rounded-pill border border-gold bg-[rgba(184,150,76,0.10)] px-[0.85rem] py-[0.3rem] font-sans text-[0.75rem] font-bold text-gold";

const STATS_GRID = "mb-10 grid grid-cols-4 gap-4 max-[901px]:grid-cols-2";
const STAT_CARD = "rounded-[12px] border border-border bg-bg-1 px-5 py-6 transition-[border-color] duration-200 hover:border-gold-border";
const STAT_ICON = "mb-3 text-[1.5rem]";
const STAT_VALUE = "mb-[0.3rem] font-serif text-2xl font-bold leading-none text-gold";
const STAT_LABEL = "mb-[0.2rem] text-[0.85rem] font-semibold text-ink-1";
const STAT_SUB = "text-xs text-ink-3";

const SHELL = "flex h-screen overflow-hidden bg-bg-0 font-sans text-ink-1 antialiased max-[481px]:h-auto max-[481px]:min-h-[100dvh]";
const SIDEBAR = "flex w-[232px] shrink-0 flex-col overflow-hidden border-r border-border bg-bg-1 max-[641px]:w-[60px] max-[481px]:w-full max-[481px]:h-auto max-[481px]:flex-row max-[481px]:overflow-x-auto max-[481px]:border-r-0 max-[481px]:border-b max-[481px]:border-border max-[481px]:p-2";
const SIDEBAR_LOGO = "border-b border-border px-6 pt-6 pb-5 font-serif text-[1.25rem] font-bold tracking-tight text-gold max-[641px]:px-0 max-[641px]:py-5 max-[641px]:text-center max-[641px]:text-[0px] max-[641px]:after:content-['PE'] max-[641px]:after:font-serif max-[641px]:after:text-[1rem] max-[641px]:after:text-gold max-[481px]:hidden";
const LOGO_ACCENT = "text-ink-1";
const ADMIN_CHIP = "ml-2 inline-block align-middle rounded-[6px] border border-[rgba(99,102,241,0.35)] bg-[rgba(99,102,241,0.2)] px-[0.45rem] py-[0.1rem] font-sans text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-[#a5b4fc]";
const NAV = "flex flex-1 flex-col gap-[0.2rem] overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[2px] [&::-webkit-scrollbar-thumb]:bg-border-md";
const NAV_ITEM = "flex w-full cursor-pointer items-center gap-3 rounded-sm border-none bg-transparent px-[0.9rem] py-[0.65rem] text-left font-sans text-[0.875rem] font-medium text-ink-2 transition-[background,color] duration-150 hover:bg-gold-dim hover:text-ink-1 max-[481px]:whitespace-nowrap max-[481px]:px-[0.6rem] max-[481px]:py-[0.4rem] max-[481px]:text-[0.78rem]";
const NAV_ITEM_ACTIVE = "!bg-gold-dim !text-gold border-l-2 border-l-gold pl-[calc(0.9rem-2px)] font-semibold";
const NAV_ICON = "w-[22px] shrink-0 text-center text-[1rem]";
const SIDEBAR_FOOTER = "flex flex-col gap-[0.6rem] border-t border-border px-4 pt-4 pb-5 max-[641px]:px-2 max-[641px]:py-3 max-[481px]:hidden";
const SIDEBAR_USER_BOX = "leading-[1.4] max-[641px]:hidden";
const SIDEBAR_USER_NAME = "text-sm font-semibold text-ink-1";
const SIDEBAR_USER_ROLE = "text-xs font-medium uppercase tracking-[0.04em] text-gold";
const SIGN_OUT_BTN = "w-full cursor-pointer rounded-[7px] border border-border-md bg-transparent px-[0.85rem] py-[0.4rem] text-left font-sans text-[0.8rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-danger hover:text-danger";
const MAIN = "flex flex-1 flex-col overflow-hidden bg-bg-0 max-[481px]:h-auto max-[481px]:overflow-auto";
const HEADER = "flex shrink-0 items-center justify-between border-b border-border bg-bg-1 px-8 pt-6 pb-5";
const HEADER_TITLE = "m-0 mb-[0.15rem] font-serif text-[1.45rem] font-bold tracking-tight text-ink-1";
const HEADER_SUB = "m-0 text-sm text-ink-3";
const THEME_BTN = "cursor-pointer whitespace-nowrap rounded-sm border border-border-md bg-bg-2 px-4 py-[0.45rem] font-sans text-[0.8rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-gold-border hover:text-gold";
const BODY = "flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[2px] [&::-webkit-scrollbar-thumb]:bg-border-md";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    if (val === null) return <span className={MUTED}>—</span>;
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
    const { data: details, isLoading: loading } = useOrgDetails(orgId);

    return (
        <Modal open onClose={onClose} maxWidth={680} title={details ? details.name : undefined}>
            {loading || !details ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.25rem" }}>
                        <PlanBadge plan={details.plan} />
                        <Badge tone={orgStatusTone(details.status)}>{details.status}</Badge>
                        <span className={MUTED} style={{ fontSize: "0.78rem" }}>{details.industry}</span>
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
                    <div className={SECTION_TITLE} style={{ marginBottom: "0.5rem" }}>Team Members</div>
                    <div style={{ marginBottom: "1.25rem", maxHeight: 180, overflowY: "auto" }}>
                        <Table dense>
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
                            <tbody>
                                {details.users.map(u => (
                                    <tr key={u.user_id}>
                                        <td><strong>{u.name}</strong></td>
                                        <td className={MUTED}>{u.email}</td>
                                        <td><span style={{ color: u.role === "org_owner" ? "var(--gold)" : "var(--text-3)", fontSize: "0.78rem", fontWeight: 600 }}>{u.role === "org_owner" ? "Owner" : "Employee"}</span></td>
                                        <td className={MUTED}>{fmtDate(u.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    {/* Documents */}
                    <div className={SECTION_TITLE} style={{ marginBottom: "0.5rem" }}>Documents ({details.documents.length})</div>
                    <div style={{ maxHeight: 180, overflowY: "auto" }}>
                        <Table dense empty={details.documents.length === 0} emptyMessage="No documents uploaded yet.">
                            <thead><tr><th>File</th><th>Size</th><th>Status</th><th>Uploaded</th></tr></thead>
                            <tbody>
                                {details.documents.map(d => (
                                    <tr key={d.doc_id}>
                                        <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.filename}</td>
                                        <td className={MUTED}>{fmtBytes(d.size_bytes)}</td>
                                        <td><Badge tone={docStatusTone(d.status)}>{d.status}</Badge></td>
                                        <td className={MUTED}>{fmtDate(d.uploaded_at)}</td>
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
        <div className={PANEL_CONTENT}>
            <div className={STATS_GRID}>
                {cards.map(c => (
                    <div key={c.label} className={STAT_CARD}>
                        <div className={STAT_ICON}>{c.icon}</div>
                        <div className={STAT_VALUE}>{c.value}</div>
                        <div className={STAT_LABEL}>{c.label}</div>
                        <div className={STAT_SUB}>{c.sub}</div>
                    </div>
                ))}
            </div>

            {/* Plan breakdown */}
            <div className={SECTION_TITLE}>Plan Distribution</div>
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
            <div className={SECTION_TITLE}>All Organizations</div>
            <Table>
                <thead><tr><th>Name</th><th>Plan</th><th>Users</th><th>Docs</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                    {orgs.map(o => (
                        <tr key={o.org_id}>
                            <td><strong>{o.name}</strong><div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{o.industry}</div></td>
                            <td><PlanBadge plan={o.plan} /></td>
                            <td className={MUTED}>{o.user_count}</td>
                            <td className={MUTED}>{o.doc_count}</td>
                            <td><Badge tone={orgStatusTone(o.status)}>{o.status}</Badge></td>
                            <td className={MUTED}>{fmtDate(o.created_at)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

// ── Orgs Panel ────────────────────────────────────────────────────────────────

const OrgsPanel = () => {
    const { data: orgsData } = useAdminOrgsList();
    const orgs = orgsData?.orgs ?? [];
    const createOrgMut = useCreateOrg();
    const updateOrgMut = useUpdateOrg();
    const deleteOrgMut = useDeleteOrg();

    const [showCreate,    setShowCreate]    = useState(false);
    const [detailOrgId,   setDetailOrgId]   = useState<string | null>(null);
    const [editOrg,       setEditOrg]       = useState<Org | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Org | null>(null);
    const [actionError,   setActionError]   = useState<string | null>(null);

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
        try {
            const data = await createOrgMut.mutateAsync(createForm);
            setCreateCreds({ email: data.owner.email, password: data.temp_password });
            setShowCreate(false);
            setCreateForm({ name: "", industry: "Law Practice", plan: "free", owner_name: "", owner_email: "" });
            setActionError(null);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : "Failed to create org.");
        }
    };

    const handleSuspendToggle = (org: Org) => {
        const newStatus = org.status === "active" ? "suspended" : "active";
        updateOrgMut.mutate({ orgId: org.org_id, payload: { status: newStatus } });
    };

    const handlePlanSave = async () => {
        if (!editOrg) return;
        try {
            await updateOrgMut.mutateAsync({ orgId: editOrg.org_id, payload: planForm });
            setEditOrg(null);
        } catch {
            /* toast surfaced by the mutation hook */
        }
    };

    const handleDelete = (org: Org) => {
        setConfirmDelete(null);
        deleteOrgMut.mutate(org.org_id);
    };

    return (
        <div className={PANEL_CONTENT}>
            <div className={PANEL_TOOLBAR}>
                <span className={RESULT_COUNT}>{orgs.length} organization{orgs.length !== 1 ? "s" : ""}</span>
                <Button onClick={() => { setShowCreate(true); setActionError(null); }}>
                    + Add Organization
                </Button>
            </div>

            {actionError && (
                <div className={ERROR_BANNER}>
                    ⚠ {actionError}
                    <button className={ERROR_DISMISS} onClick={() => setActionError(null)}>×</button>
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
                            <td className={MUTED}>{o.user_count} / {o.max_users}</td>
                            <td className={MUTED}>{o.doc_count} / {o.max_docs}</td>
                            <td className={MUTED}>{fmtBytes(o.total_bytes)}</td>
                            <td><Badge tone={orgStatusTone(o.status)}>{o.status}</Badge></td>
                            <td className={MUTED}>{fmtDate(o.created_at)}</td>
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
                    <Button onClick={handleCreate} loading={createOrgMut.isPending}>Create Organization</Button>
                </>}
            >
                {actionError && <div className={ERROR_BANNER} style={{ marginBottom: "0.75rem" }}>⚠ {actionError}</div>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                    <div className={FORM_GROUP} style={{ gridColumn: "1 / -1" }}>
                        <label className={FORM_LABEL}>Organization Name</label>
                        <input className={FORM_INPUT} value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Legal" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Industry</label>
                        <select className={FORM_SELECT} value={createForm.industry} onChange={e => setCreateForm(f => ({ ...f, industry: e.target.value }))}>
                            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                        </select>
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Plan</label>
                        <select className={FORM_SELECT} value={createForm.plan} onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}>
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>

                    <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginBottom: "0.25rem" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Owner Account</div>
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Owner Full Name</label>
                        <input className={FORM_INPUT} value={createForm.owner_name} onChange={e => setCreateForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Jane Smith" />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Owner Email</label>
                        <input className={FORM_INPUT} type="email" value={createForm.owner_email} onChange={e => setCreateForm(f => ({ ...f, owner_email: e.target.value }))} placeholder="owner@firm.com" />
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
                <p className={MUTED} style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
                    Share these login credentials with the org owner. They will be prompted to set a new password on first login.
                </p>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Owner Email</label>
                    <input className={FORM_INPUT} readOnly value={createCreds?.email ?? ""} />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Temporary Password</label>
                    <input className={FORM_INPUT} readOnly value={createCreds?.password ?? ""} />
                </div>
            </Modal>

            {/* Edit plan modal */}
            <Modal
                open={!!editOrg}
                onClose={() => setEditOrg(null)}
                title={`Change Plan — ${editOrg?.name ?? ""}`}
                footer={<>
                    <Button variant="ghost" onClick={() => setEditOrg(null)}>Cancel</Button>
                    <Button onClick={handlePlanSave} loading={updateOrgMut.isPending}>Save</Button>
                </>}
            >
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Plan</label>
                    <select className={FORM_SELECT} value={planForm.plan} onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Max Documents</label>
                        <input className={FORM_INPUT} type="number" value={planForm.max_docs} onChange={e => setPlanForm(f => ({ ...f, max_docs: +e.target.value }))} />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Max Users</label>
                        <input className={FORM_INPUT} type="number" value={planForm.max_users} onChange={e => setPlanForm(f => ({ ...f, max_users: +e.target.value }))} />
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
                <p className={MUTED} style={{ fontSize: "0.84rem" }}>
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
    const key = (import.meta as any).env?.VITE_ADMIN_EVAL_KEY ?? "";
    const { data, isLoading: loading, isError } = useEvalResults(key);
    const results = data?.results ?? [];

    if (!key) return <div className={PANEL_CONTENT}><div className={INFO_BOX}><strong>Eval results not available</strong><br />Set VITE_ADMIN_EVAL_KEY in your .env to load eval results.</div></div>;
    if (loading) return <div className={EMPTY_STATE}>Loading…</div>;
    if (isError) return <div className={PANEL_CONTENT}><div className={INFO_BOX}><strong>Eval results not available</strong><br />Could not load eval results.</div></div>;
    if (!results.length) return <div className={PANEL_CONTENT}><div className={INFO_BOX}>No eval results yet. Scores are recorded automatically each time a user asks a question.</div></div>;

    return (
        <div className={PANEL_CONTENT}>
            <div className={PANEL_TOOLBAR}><span className={RESULT_COUNT}>{results.length} eval records</span></div>
            <Table>
                <thead><tr><th>Time</th><th>Org</th><th>Query</th><th>Precision</th><th>Relevance</th><th>Latency</th></tr></thead>
                <tbody>
                    {results.map(r => (
                        <tr key={r.id}>
                            <td className={MUTED}>{r.timestamp?.slice(0, 16).replace("T", " ")}</td>
                            <td>{r.organization_id ?? "—"}</td>
                            <td className={QUERY_CELL}>{r.original_query}</td>
                            <td><ScoreBadge val={r.precision_at_k} /></td>
                            <td><ScoreBadge val={r.answer_relevance_score} /></td>
                            <td className={MUTED}>{r.latency_ms != null ? `${r.latency_ms}ms` : "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

// ── Settings Panel ────────────────────────────────────────────────────────────

const SettingsPanel = () => {
    const { data: backendOk = false } = useBackendHealth();

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
        <div className={PANEL_CONTENT}>
            <div className={SECTION_TITLE}>Plan Tiers</div>
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

            <div className={SECTION_TITLE}>Service Status</div>
            <div className={SERVICE_GRID}>
                {services.map(s => (
                    <div key={s.name} className={`${SERVICE_CARD} ${s.ok ? SERVICE_CARD_OK : SERVICE_CARD_WARN}`}>
                        <div className={SERVICE_NAME}><StatusDot ok={s.ok} label={s.name} /></div>
                        <div className={SERVICE_NOTE}>{s.note}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Registrations Panel ───────────────────────────────────────────────────────

const RegistrationsPanel = () => {
    const { data, isLoading: loading } = useRegistrations();
    const regs = data?.registrations ?? [];
    const approveMut = useApproveRegistration();
    const [approving, setApproving] = useState<string | null>(null);
    const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null);

    const approve = async (orgId: string, firmName: string) => {
        setApproving(orgId); setMsg(null);
        try {
            await approveMut.mutateAsync(orgId);
            setMsg({ ok: true, text: `✓ ${firmName} approved and activated. Confirmation email sent.` });
        } catch (e) {
            setMsg({ ok: false, text: e instanceof Error ? e.message : "Approval failed." });
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
                                    <td className={MUTED}>{r.city ?? "—"}</td>
                                    <td className={MUTED}>{fmtDate(r.created_at)}</td>
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

const UPGRADE_STATUS_COLORS: Record<string, string> = {
    pending:  "#f59e0b",
    approved: "#22c55e",
    rejected: "#ef4444",
};

const AdminUpgradesPanel = () => {
    const [filter,   setFilter]   = useState<"all" | "pending" | "approved" | "rejected">("pending");
    const { data, isLoading: loading } = useUpgradeRequests(filter);
    const requests = data?.requests ?? [];
    const resolveMut = useResolveUpgradeRequest();
    const [acting,   setActing]   = useState<string | null>(null);
    const [msg,      setMsg]      = useState<{ id: string; ok: boolean; text: string } | null>(null);

    const resolve = async (requestId: string, action: "approve" | "reject") => {
        setActing(requestId); setMsg(null);
        try {
            await resolveMut.mutateAsync({ requestId, action });
            setMsg({ id: requestId, ok: true, text: action === "approve" ? "Approved — plan upgraded." : "Rejected." });
        } catch (e) {
            setMsg({ id: requestId, ok: false, text: e instanceof Error ? e.message : "Action failed." });
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
                <span className={MUTED} style={{ marginLeft: "auto", fontSize: "0.8rem" }}>
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
                                    <span className={MUTED} style={{ fontSize: "0.75rem" }}>
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
                                        className={BTN_PRIMARY}
                                        style={{ padding: "0.4rem 1.1rem", fontSize: "0.82rem" }}
                                        disabled={acting === req.request_id}
                                        onClick={() => resolve(req.request_id, "approve")}
                                    >
                                        {acting === req.request_id ? "…" : "Approve"}
                                    </button>
                                    <button
                                        className={BTN_GHOST}
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
    const [filterType, setFilterType] = useState("all");
    const [filterOrg,  setFilterOrg]  = useState("all");
    const [dateFrom,   setDateFrom]   = useState("");
    const [dateTo,     setDateTo]     = useState("");
    const [page,       setPage]       = useState(0);
    const PAGE_SIZE = 200;

    useEffect(() => { setPage(0); }, [filterType, filterOrg, dateFrom, dateTo]);

    const { data, isLoading: loading } = useAdminAuditLog({
        filterType, dateFrom, dateTo, page, pageSize: PAGE_SIZE, orgId: filterOrg,
    });
    const logs  = data?.logs ?? [];
    const total = data?.total ?? 0;

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
        <div className={PANEL_CONTENT}>
            <div className={PANEL_TOOLBAR}>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <select className={FORM_SELECT} value={filterOrg} onChange={e => setFilterOrg(e.target.value)}>
                        <option value="all">All organizations</option>
                        {orgs.map(o => <option key={o.org_id} value={o.org_id}>{o.name}</option>)}
                    </select>
                    <select className={FORM_SELECT} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All events</option>
                        {Object.entries(ADMIN_EVENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="date" className={FORM_INPUT} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From" />
                    <input type="date" className={FORM_INPUT} value={dateTo}   onChange={e => setDateTo(e.target.value)}   title="To" />
                    <span className={MUTED} style={{ fontSize: "0.8rem" }}>{total} event{total !== 1 ? "s" : ""}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={exportCsv} disabled={logs.length === 0}>↓ Export CSV</Button>
            </div>

            {loading ? (
                <div className={EMPTY_STATE}>Loading…</div>
            ) : logs.length === 0 ? (
                <div className={EMPTY_STATE}>No events match the selected filters.</div>
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
                                        <td className={MUTED} style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>{l.created_at.slice(0, 19).replace("T", " ")}</td>
                                        <td style={{ fontSize: "0.8rem" }}>{orgName}</td>
                                        <td style={{ fontSize: "0.8rem", fontWeight: 600 }}>{ADMIN_EVENT_LABELS[l.event_type] ?? l.event_type}</td>
                                        <td style={{ fontSize: "0.8rem" }}>{l.actor_name ?? "—"}</td>
                                        <td className={MUTED}>{l.actor_role ?? "—"}</td>
                                        <td className={MUTED} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {[l.resource_type, l.resource_name].filter(Boolean).join(": ") || "—"}
                                        </td>
                                        <td className={MUTED} style={{ whiteSpace: "nowrap" }}>{l.ip_address ?? "—"}</td>
                                        <td className={MUTED} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={detailStr}>
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
                                onClick={() => setPage(page - 1)}>← Prev</Button>
                            <span className={MUTED} style={{ fontSize: "0.82rem" }}>Page {page + 1} of {totalPages}</span>
                            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1}
                                onClick={() => setPage(page + 1)}>Next →</Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── Case Law Panel ────────────────────────────────────────────────────────────

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

const FeatureAccessPanel = () => {
    const { data, isLoading: loading, error: queryError } = useOrgFlags();
    const rows   = data?.orgs ?? [];
    const keys   = data?.feature_keys ?? [];
    const labels = data?.feature_labels ?? {};
    const updateFlags = useUpdateOrgFlags();
    const [search,  setSearch]  = useState("");

    const savingOrgId = updateFlags.isPending ? updateFlags.variables?.orgId ?? null : null;

    const toggle = (org_id: string, feature: string, current: boolean) => {
        const row = rows.find(r => r.org_id === org_id);
        const newFlags = { ...(row?.flags || {}), [feature]: !current };
        updateFlags.mutate({ orgId: org_id, flags: newFlags });
    };

    const enableAll  = (org_id: string) => {
        const all: Record<string, boolean> = {};
        keys.forEach(k => all[k] = true);
        updateFlags.mutate({ orgId: org_id, flags: all });
    };

    const disableAll = (org_id: string) => {
        const none: Record<string, boolean> = {};
        keys.forEach(k => none[k] = false);
        updateFlags.mutate({ orgId: org_id, flags: none });
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
        <div className={PANEL_CONTENT}>
            <div className={PANEL_TOOLBAR}>
                <span className={MUTED}>Toggle features on/off per organisation. Changes take effect immediately.</span>
                <input
                    className={FORM_INPUT}
                    placeholder="Search organisations…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ marginLeft: "auto", width: 220 }}
                />
            </div>
            {queryError && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.75rem" }}>Error: {queryError.message}</div>}

            {loading ? (
                <div className={MUTED} style={{ textAlign: "center", padding: "3rem" }}>Loading feature flags…</div>
            ) : filtered.length === 0 ? (
                <div className={MUTED} style={{ textAlign: "center", padding: "3rem" }}>No organisations found.</div>
            ) : filtered.map(org => {
                const isSaving = savingOrgId === org.org_id;
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
                            <span className={MUTED} style={{ marginRight: "auto" }}>
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
    const [pubFilter,  setPubFilter]  = useState("ALL");
    const { data, isLoading: loading, refetch } = useCaseLawDocs(pubFilter);
    const docs = data?.docs ?? [];
    const uploadMut = useUploadCaseLaw();
    const deleteMut = useDeleteCaseLawDoc();

    const [uploadErr,  setUploadErr]  = useState<string | null>(null);
    const [uploadOk,   setUploadOk]   = useState(false);

    // Upload form state
    const [file,      setFile]      = useState<File | null>(null);
    const [publisher, setPublisher] = useState("PLD");
    const [title,     setTitle]     = useState("");
    const [year,      setYear]      = useState("");
    const [volume,    setVolume]    = useState("");
    const [court,     setCourt]     = useState("");

    const deletingId = deleteMut.isPending ? deleteMut.variables ?? null : null;

    const handleUpload = async () => {
        if (!file) { setUploadErr("Please select a PDF file."); return; }
        if (!title.trim()) { setUploadErr("Please enter a title."); return; }
        setUploadErr(null); setUploadOk(false);
        try {
            await uploadMut.mutateAsync({ file, publisher, title: title.trim(), year, volume: volume.trim(), court: court.trim() });
            setUploadOk(true);
            setFile(null); setTitle(""); setYear(""); setVolume(""); setCourt("");
            setTimeout(() => setUploadOk(false), 1500);
        } catch (e) {
            setUploadErr(e instanceof Error ? e.message : "Upload failed.");
        }
    };

    const handleDelete = (docId: string) => {
        if (!window.confirm("Remove this document from the case law library? It will no longer appear in searches.")) return;
        deleteMut.mutate(docId);
    };

    return (
        <div className={PANEL_CONTENT}>
            {/* ── Upload form ── */}
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.75rem", marginBottom: "1.5rem" }}>
                <div className={SECTION_TITLE}>Upload Case Law Document</div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: "1.25rem" }}>
                    Upload a PDF volume of PLD, SCMR, MLD, or CLC. It will be indexed into the shared
                    case law pool and will appear in every user's AI search results automatically.
                </p>

                {uploadErr && (
                    <div className={ERROR_BANNER} style={{ marginBottom: "1rem" }}>{uploadErr}</div>
                )}
                {uploadOk && (
                    <div className={SUCCESS_BANNER} style={{ marginBottom: "1rem" }}>
                        ✓ Upload started — indexing in background. Status will update to "Ready" when complete.
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                        <label className={FORM_LABEL}>Publisher</label>
                        <select className={FORM_INPUT} value={publisher} onChange={e => setPublisher(e.target.value)}>
                            {PUBLISHERS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={FORM_LABEL}>Year</label>
                        <input className={FORM_INPUT} type="number" placeholder="2019" value={year}
                            onChange={e => setYear(e.target.value)} min={1900} max={2099} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                        <label className={FORM_LABEL}>Title <span style={{ color: "var(--gold)" }}>*</span></label>
                        <input className={FORM_INPUT} type="text"
                            placeholder="e.g. PLD 2019 Supreme Court 412"
                            value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <label className={FORM_LABEL}>Volume / Issue</label>
                        <input className={FORM_INPUT} type="text" placeholder="Vol. 5 (optional)"
                            value={volume} onChange={e => setVolume(e.target.value)} />
                    </div>
                    <div>
                        <label className={FORM_LABEL}>Court</label>
                        <input className={FORM_INPUT} type="text" placeholder="Supreme Court (optional)"
                            value={court} onChange={e => setCourt(e.target.value)} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                        <label className={FORM_LABEL}>PDF File <span style={{ color: "var(--gold)" }}>*</span></label>
                        <input type="file" accept=".pdf"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                            style={{ color: "var(--text-2)", fontSize: "0.85rem" }} />
                    </div>
                </div>

                <Button
                    style={{ marginTop: "1.25rem" }}
                    onClick={handleUpload}
                    loading={uploadMut.isPending}
                >
                    Upload & Index
                </Button>
            </div>

            {/* ── Publisher filter + doc list ── */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                {["ALL", ...PUBLISHERS].map(p => (
                    <button
                        key={p}
                        className={pubFilter === p ? CHIP_ACTIVE : CHIP}
                        onClick={() => setPubFilter(p)}
                    >
                        {p}
                    </button>
                ))}
                <button className={CHIP} onClick={() => refetch()} style={{ marginLeft: "auto" }}>↻ Refresh</button>
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
                                        loading={deletingId === doc.doc_id}
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
    const { data: statsData, isLoading: statsLoading } = useAdminStats();
    const { data: orgsData,  isLoading: orgsLoading  } = useAdminOrgsList();
    const logoutMut = useLogout();

    const stats   = statsData ?? null;
    const orgs    = orgsData?.orgs ?? [];
    const loading = statsLoading || orgsLoading;

    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string } : { name: "Admin", email: "" };

    const signOut = () => {
        logoutMut.mutate();
        sessionStorage.clear();
        window.location.hash = "/";
    };

    return (
        <div className={SHELL}>
            <aside className={SIDEBAR}>
                <div className={SIDEBAR_LOGO}>
                    Project<span className={LOGO_ACCENT}> Ease</span>
                    <span className={ADMIN_CHIP}>Admin</span>
                </div>

                <nav className={NAV}>
                    {NAV_ITEMS.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            className={`${NAV_ITEM} ${panel === id ? NAV_ITEM_ACTIVE : ""}`}
                            onClick={() => setPanel(id)}
                        >
                            <span className={NAV_ICON}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </nav>

                <div className={SIDEBAR_FOOTER}>
                    <div className={SIDEBAR_USER_BOX}>
                        <div className={SIDEBAR_USER_NAME}>{user.name}</div>
                        <div className={SIDEBAR_USER_ROLE}>Platform Admin</div>
                    </div>
                    <button className={SIGN_OUT_BTN} onClick={signOut}>Sign Out</button>
                </div>
            </aside>

            <div className={MAIN}>
                <header className={HEADER}>
                    <div>
                        <h1 className={HEADER_TITLE}>{PANEL_TITLES[panel]}</h1>
                        <p className={HEADER_SUB}>{PANEL_SUBS[panel]}</p>
                    </div>
                    <button className={THEME_BTN} onClick={() => setTheme(toggleTheme())}>
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
                </header>

                <div className={BODY}>
                    {loading ? (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                    ) : (
                        <>
                            {panel === "overview"       && <OverviewPanel stats={stats} orgs={orgs} />}
                            {panel === "orgs"           && <OrgsPanel />}
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
