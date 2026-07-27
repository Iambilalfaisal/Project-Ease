import { useState, useEffect, useRef } from "react";
import styles from "./OwnerPortal.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "overview" | "documents" | "clients" | "matters" | "calendar" | "invoices" | "team" | "subscription" | "settings" | "audit" | "drafting";

interface Category {
    category_id: string;
    name: string;
}

interface DocFile {
    doc_id: string;
    name: string;         // filename
    size: string;         // formatted string, e.g. "1.2 MB"
    size_bytes: number;
    uploaded: string;     // date string
    status: "ready" | "processing" | "error";
    category_id: string | null;
    category_name: string | null;
}

interface TeamMember {
    user_id: string;
    name: string;
    email: string;
    role: string;
    joined: string;
    whatsapp_number?: string | null;
}

interface Usage {
    total_docs: number;
    total_bytes: number;
}

interface Client {
    client_id:        string;
    name:             string;
    client_type:      "Individual" | "Corporate";
    email?:           string;
    phone?:           string;
    address?:         string;
    cnic_ntn?:        string;
    notes?:           string;
    referral_source?: string;
    created_at:       string;
    matter_count?:    number;
}

interface MatterTeam {
    team_id: string;
    name:    string;
    members: { user_id: string; name: string }[];
}

interface MatterDoc {
    doc_id:        string;
    filename:      string;
    size_bytes:    number;
    status:        string;
    category_id:   string | null;
    category_name: string | null;
    uploaded_at:   string;
    matter_id?:    string | null;
}

interface Matter {
    matter_id:       string;
    client_id:       string;
    client_name:     string;
    title:           string;
    matter_type:     string;
    status:          "Active" | "Pending" | "Closed" | "Settled" | "Withdrawn";
    court_name?:     string;
    case_number?:    string;
    filing_date?:    string;
    opposing_party?: string;
    team_id?:        string;
    team_name?:      string;
    notes?:               string;
    limitation_type?:      string;
    cause_of_action_date?: string;
    limitation_date?:      string;
    vakalatnama_status?:   string;
    adjournment_count?:    number;
    created_at:            string;
    doc_count?:            number;
    documents?:            MatterDoc[];
}

interface ClientToken {
    token_id:   string;
    token:      string;
    client_id:  string;
    matter_id:  string | null;
    label:      string | null;
    expires_at: string | null;
    is_active:  number;
    created_at: string;
}

interface Fee {
    fee_id:       string;
    matter_id:    string | null;
    description:  string;
    fee_type:     string;
    amount:       number;
    fee_date:     string;
    is_paid:      number;
    paid_at:      string | null;
    invoice_id:   string | null;
    notes:        string | null;
    matter_title: string | null;
}

interface Invoice {
    invoice_id:     string;
    matter_id:      string | null;
    client_id:      string | null;
    invoice_number: string;
    title:          string;
    status:         "draft" | "sent" | "paid" | "cancelled";
    issued_date:    string;
    due_date:       string | null;
    total_amount:   number;
    notes:          string | null;
    matter_title:   string | null;
    case_number:    string | null;
    client_name:    string | null;
    client_email:   string | null;
    client_phone:   string | null;
    fees?:          Fee[];
}

interface TimeEntry {
    entry_id:         string;
    matter_id:        string;
    user_id:          string | null;
    user_name:        string | null;
    description:      string | null;
    entry_date:       string;
    duration_minutes: number;
    hourly_rate:      number;
    billable:         number;
    fee_id:           string | null;
    created_at:       string;
}

interface AdverseParty {
    party_id:     string;
    matter_id:    string;
    party_name:   string;
    party_type:   string;
    counsel_name:  string | null;
    counsel_phone: string | null;
    counsel_firm:  string | null;
    notes:         string | null;
    created_at:    string;
}

interface CourtOrder {
    order_id:     string;
    matter_id:    string;
    hearing_date: string;
    court_name:   string | null;
    order_brief:  string;
    next_date:    string | null;
    outcome:      "Adjourned" | "Heard" | "Decided" | "Partially Heard";
    created_at:   string;
}

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
    details:       string | null;  // JSON string
    ip_address:    string | null;
    created_at:    string;
}

interface Template {
    template_id:   string;
    org_id:        string;
    title:         string;
    template_type: string;
    content:       string;
    description:   string | null;
    created_at:    string;
    modified_at:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
    const token = sessionStorage.getItem("pe_token") ?? "";
    return { Authorization: `Bearer ${token}` };
}

function fmtBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024)        return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
}

function fmtDate(iso: string): string {
    return iso ? iso.slice(0, 10) : "";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
    org_owner: "Firm Owner",
    employee:  "Employee",
};

const NAV: { id: Panel; icon: string; label: string }[] = [
    { id: "overview",     icon: "H", label: "Overview"     },
    { id: "documents",    icon: "D", label: "Documents"    },
    { id: "clients",      icon: "C", label: "Clients"      },
    { id: "matters",      icon: "M", label: "Matters"      },
    { id: "calendar",     icon: "K", label: "Calendar"     },
    { id: "invoices",     icon: "I", label: "Invoices"     },
    { id: "team",         icon: "T",  label: "Team"         },
    { id: "drafting",     icon: "Dr", label: "Drafting"     },
    { id: "audit",        icon: "A",  label: "Audit Log"    },
    { id: "subscription", icon: "P",  label: "Subscription" },
    { id: "settings",     icon: "S",  label: "Settings"     },
];

const PANEL_TITLES: Record<Panel, string> = {
    overview:     "Workspace Overview",
    documents:    "Document Library",
    clients:      "Client Management",
    matters:      "Matter Management",
    calendar:     "Court Calendar",
    invoices:     "Invoices",
    team:         "Team Members",
    drafting:     "Document Drafting",
    audit:        "Audit Log",
    subscription: "Plan & Subscription",
    settings:     "Organization Settings",
};

const PANEL_SUBS: Record<Panel, string> = {
    overview:     "Your firm's activity at a glance",
    documents:    "Upload and manage your firm's documents",
    clients:      "Manage your firm's clients and their details",
    matters:      "Track cases, matters, and linked documents",
    calendar:     "Hearings, deadlines, and WhatsApp reminders",
    invoices:     "Fee entries and client invoices across all matters",
    team:         "Manage who has access to your workspace",
    drafting:     "AI-powered vakalatnamas, plaints, agreements, and notices",
    audit:        "Track logins, searches, and document activity",
    subscription: "Your current plan, usage, and billing",
    settings:     "Firm profile and account preferences",
};

// ── Matter / Court constants ──────────────────────────────────────────────────

const MATTER_TYPES = [
    "Criminal Defence", "Civil Litigation", "Family & Personal Law",
    "Property & Real Estate", "Corporate & Commercial", "Tax & Revenue",
    "Constitutional & Public Law", "Banking & Finance",
    "Labour & Employment", "Intellectual Property",
];

const MATTER_STATUSES = ["Active", "Pending", "Closed", "Settled", "Withdrawn"] as const;

const FEE_TYPES = ["Consultation", "Court Appearance", "Filing Fee", "Legal Research", "Document Drafting", "Miscellaneous"] as const;

const INVOICE_STATUS_BADGE: Record<string, string> = {
    draft:     "badgeGray",
    sent:      "badgeBlue",
    paid:      "badgeGreen",
    cancelled: "badgeAmber",
};

function fmtPKR(n: number): string {
    if (n === 0) return "Free";
    return "PKR " + n.toLocaleString("en-PK");
}

const DEFAULT_COURTS = [
    "Supreme Court of Pakistan", "Federal Shariat Court",
    "Lahore High Court", "Sindh High Court", "Islamabad High Court",
    "Peshawar High Court", "Balochistan High Court",
    "Gilgit-Baltistan Chief Court", "Azad Kashmir High Court",
    "District & Sessions Court", "Civil Judge Court", "Magistrate Court",
    "Banking Court", "Labour Court", "National Accountability Court",
    "Customs Appellate Tribunal", "Income Tax Appellate Tribunal",
    "Anti-Corruption Establishment Court", "Service Tribunal", "Family Court",
];

const STATUS_BADGE: Record<string, string> = {
    Active:    "badgeGreen",
    Pending:   "badgeAmber",
    Closed:    "badgeGray",
    Settled:   "badgeBlue",
    Withdrawn: "badgeRed",
};

function groupDocsByCategory(docs: MatterDoc[]): [string, MatterDoc[]][] {
    const groups: Record<string, MatterDoc[]> = {};
    docs.forEach(d => {
        const key = d.category_name ?? "— Uncategorized";
        (groups[key] = groups[key] || []).push(d);
    });
    return Object.entries(groups).sort(([a], [b]) => {
        if (a === "— Uncategorized") return 1;
        if (b === "— Uncategorized") return -1;
        return a.localeCompare(b);
    });
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.png,.jpg,.jpeg,.tiff,.bmp";

const PLAN_LIMITS: Record<string, { docs: number; users: number }> = {
    free:       { docs: 20,        users: 5         },
    pro:        { docs: 500,       users: 25        },
    enterprise: { docs: 9_999_999, users: 9_999_999 },
};

// ── Clients Panel ─────────────────────────────────────────────────────────────

const REFERRAL_SOURCES = [
    "Walk-in", "Referral – Existing Client", "Referral – Colleague",
    "Bar Association", "Online / Website", "Social Media", "WhatsApp", "Other",
] as const;

const BLANK_CLIENT = {
    name: "", client_type: "Individual" as "Individual" | "Corporate",
    email: "", phone: "", address: "", cnic_ntn: "", notes: "", referral_source: "",
};

const ClientsPanel = () => {
    const [clients,  setClients]  = useState<Client[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [detail,   setDetail]   = useState<(Client & { matters: Matter[] }) | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editMode,  setEditMode] = useState(false);
    const [form,     setForm]     = useState({ ...BLANK_CLIENT });
    const [saving,   setSaving]   = useState(false);
    const [formErr,  setFormErr]  = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);

    // ─ Portal sharing state ─
    const [portalClient,  setPortalClient]  = useState<Client | null>(null);
    const [portalTokens,  setPortalTokens]  = useState<ClientToken[]>([]);
    const [portalMatters, setPortalMatters] = useState<Matter[]>([]);
    const [portalLoading, setPortalLoading] = useState(false);
    const [portalForm,    setPortalForm]    = useState({ matter_id: "", label: "", expires_days: "30" });
    const [portalCreating, setPortalCreating] = useState(false);
    const [newTokenUrl,   setNewTokenUrl]   = useState<string | null>(null);
    const [revoking,      setRevoking]      = useState<string | null>(null);
    const [copied,        setCopied]        = useState(false);

    const loadClients = () => {
        fetch("/clients", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setClients(d.clients ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    };
    useEffect(() => { loadClients(); }, []);

    const openDetail = (c: Client) => {
        fetch(`/clients/${c.client_id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setDetail(d))
            .catch(() => {});
    };

    const openAdd = () => {
        setForm({ ...BLANK_CLIENT }); setEditMode(false); setFormErr(null); setShowModal(true);
    };

    const openEdit = (c: Client) => {
        setForm({
            name: c.name, client_type: c.client_type,
            email: c.email ?? "", phone: c.phone ?? "",
            address: c.address ?? "", cnic_ntn: c.cnic_ntn ?? "", notes: c.notes ?? "",
            referral_source: c.referral_source ?? "",
        });
        setEditMode(true); setFormErr(null); setShowModal(true);
    };

    const saveClient = async () => {
        if (!form.name.trim()) { setFormErr("Client name is required."); return; }
        setSaving(true); setFormErr(null);
        try {
            const url    = editMode && detail ? `/clients/${detail.client_id}` : "/clients";
            const method = editMode ? "PATCH" : "POST";
            const res    = await fetch(url, {
                method,
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setFormErr(data.error ?? "Failed."); setSaving(false); return; }
            setShowModal(false);
            loadClients();
            if (editMode && detail) {
                setDetail({ ...detail, ...data });
            }
        } catch { setFormErr("Network error."); }
        setSaving(false);
    };

    const removeClient = async (c: Client) => {
        if (!confirm(`Remove client "${c.name}" and all their matters?`)) return;
        setRemoving(c.client_id);
        await fetch(`/clients/${c.client_id}`, { method: "DELETE", headers: authHeaders() });
        setClients(prev => prev.filter(x => x.client_id !== c.client_id));
        if (detail?.client_id === c.client_id) setDetail(null);
        setRemoving(null);
    };

    const openPortal = async (c: Client) => {
        setPortalClient(c);
        setPortalForm({ matter_id: "", label: "", expires_days: "30" });
        setNewTokenUrl(null);
        setCopied(false);
        setPortalLoading(true);
        const [tokRes, matRes] = await Promise.all([
            fetch(`/client-tokens?client_id=${c.client_id}`, { headers: authHeaders() }),
            fetch(`/clients/${c.client_id}`, { headers: authHeaders() }),
        ]);
        if (tokRes.ok)  setPortalTokens((await tokRes.json()).tokens ?? []);
        if (matRes.ok)  setPortalMatters((await matRes.json()).matters ?? []);
        setPortalLoading(false);
    };

    const createPortalLink = async () => {
        if (!portalClient) return;
        setPortalCreating(true); setNewTokenUrl(null);
        try {
            const body: Record<string, string> = { client_id: portalClient.client_id };
            if (portalForm.matter_id)   body.matter_id   = portalForm.matter_id;
            if (portalForm.label)       body.label        = portalForm.label;
            if (portalForm.expires_days) body.expires_days = portalForm.expires_days;
            const res = await fetch("/client-tokens", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const d = await res.json();
                const url = `${window.location.origin}${window.location.pathname}#/portal?token=${d.token}`;
                setNewTokenUrl(url);
                setPortalTokens(prev => [d as ClientToken, ...prev]);
                setPortalForm({ matter_id: "", label: "", expires_days: "30" });
            }
        } finally {
            setPortalCreating(false);
        }
    };

    const revokePortalToken = async (tokenId: string) => {
        if (!confirm("Revoke this portal link? The client will no longer be able to access their portal via this link.")) return;
        setRevoking(tokenId);
        await fetch(`/client-tokens/${tokenId}`, { method: "DELETE", headers: authHeaders() });
        setPortalTokens(prev => prev.filter(t => t.token_id !== tokenId));
        setRevoking(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    const PortalModal = () => (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setPortalClient(null); }}>
            <div className={styles.modal} style={{ maxWidth: 560 }}>
                <h3 className={styles.modalTitle}>🔗 Share Portal — {portalClient?.name}</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: "1rem", lineHeight: 1.5 }}>
                    Generate a secure link for your client to view their documents online. Links expire automatically.
                </p>

                {/* Generate new link form */}
                <div className={styles.portalForm}>
                    <h4 className={styles.portalFormTitle}>Generate New Link</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Matter (optional)</label>
                            <select className={styles.formSelect} value={portalForm.matter_id} onChange={e => setPortalForm({ ...portalForm, matter_id: e.target.value })}>
                                <option value="">— All matters —</option>
                                {portalMatters.map(m => (
                                    <option key={m.matter_id} value={m.matter_id}>{m.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Expires in (days)</label>
                            <select className={styles.formSelect} value={portalForm.expires_days} onChange={e => setPortalForm({ ...portalForm, expires_days: e.target.value })}>
                                <option value="7">7 days</option>
                                <option value="30">30 days</option>
                                <option value="90">90 days</option>
                                <option value="365">1 year</option>
                                <option value="">Never expires</option>
                            </select>
                        </div>
                        <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                            <label className={styles.formLabel}>Label (optional)</label>
                            <input className={styles.formInput} value={portalForm.label} onChange={e => setPortalForm({ ...portalForm, label: e.target.value })} placeholder="e.g. Court documents — July 2026" />
                        </div>
                    </div>
                    <button className={styles.btnPrimary} style={{ marginTop: "0.75rem" }} onClick={createPortalLink} disabled={portalCreating}>
                        {portalCreating ? "Generating…" : "Generate Link"}
                    </button>
                </div>

                {/* Newly created link */}
                {newTokenUrl && (
                    <div className={styles.portalNewLink}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginBottom: "0.4rem", fontWeight: 600 }}>
                            ✅ Link generated — copy and send to your client:
                        </div>
                        <div className={styles.portalLinkRow}>
                            <code className={styles.portalLinkCode}>{newTokenUrl}</code>
                            <button className={styles.portalCopyBtn} onClick={() => copyToClipboard(newTokenUrl)}>
                                {copied ? "✓ Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Existing tokens */}
                <div style={{ marginTop: "1.25rem" }}>
                    <h4 className={styles.portalFormTitle}>Active Links</h4>
                    {portalLoading ? (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>Loading…</div>
                    ) : portalTokens.filter(t => t.is_active).length === 0 ? (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>No active portal links yet.</div>
                    ) : (
                        <div className={styles.portalTokenList}>
                            {portalTokens.filter(t => t.is_active).map(t => {
                                const tUrl = `${window.location.origin}${window.location.pathname}#/portal?token=${t.token}`;
                                return (
                                    <div key={t.token_id} className={styles.portalTokenRow}>
                                        <div className={styles.portalTokenInfo}>
                                            <span className={styles.portalTokenLabel}>{t.label || "Portal Link"}</span>
                                            <span className={styles.portalTokenMeta}>
                                                Created {t.created_at?.slice(0, 10)}
                                                {t.expires_at && ` · Expires ${t.expires_at.slice(0, 10)}`}
                                                {t.matter_id && " · Matter-scoped"}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                                            <button className={styles.portalCopyBtn} onClick={() => copyToClipboard(tUrl)}>Copy</button>
                                            <button className={styles.actionBtnDanger} style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                                                disabled={revoking === t.token_id} onClick={() => revokePortalToken(t.token_id)}>
                                                {revoking === t.token_id ? "…" : "Revoke"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <button className={styles.btnGhost} onClick={() => setPortalClient(null)}>Close</button>
                </div>
            </div>
        </div>
    );

    const ClientModal = () => (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className={styles.modal} style={{ maxWidth: 480 }}>
                <h3 className={styles.modalTitle}>{editMode ? "Edit Client" : "Add Client"}</h3>
                {formErr && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {formErr}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>Name *</label>
                        <input className={styles.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client or firm name" autoFocus />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Type</label>
                        <select className={styles.formSelect} value={form.client_type} onChange={e => setForm({ ...form, client_type: e.target.value as any })}>
                            <option>Individual</option>
                            <option>Corporate</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Phone</label>
                        <input className={styles.formInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" />
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>Email</label>
                        <input className={styles.formInput} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>CNIC / NTN</label>
                        <input className={styles.formInput} value={form.cnic_ntn} onChange={e => setForm({ ...form, cnic_ntn: e.target.value })} placeholder="42201-0000000-0" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Address</label>
                        <input className={styles.formInput} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City, Province" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Referral Source</label>
                        <select className={styles.formSelect} value={form.referral_source} onChange={e => setForm({ ...form, referral_source: e.target.value })}>
                            <option value="">Not specified</option>
                            {REFERRAL_SOURCES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>Notes</label>
                        <input className={styles.formInput} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional internal notes" />
                    </div>
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={saveClient} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                </div>
            </div>
        </div>
    );

    // ─ Detail view ─
    if (detail) {
        return (
            <div className={styles.panelContent}>
                <button className={styles.backBtn} onClick={() => setDetail(null)}>← Back to Clients</button>
                <div className={styles.detailHeader}>
                    <div>
                        <h2 className={styles.detailTitle}>{detail.name}</h2>
                        <span className={detail.client_type === "Corporate" ? styles.badgeGold : styles.badgeGray} style={{ marginTop: "0.35rem", display: "inline-block" }}>
                            {detail.client_type}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => openEdit(detail)}>Edit</button>
                        <button className={styles.actionBtnDanger} style={{ fontSize: "0.8rem" }} onClick={() => removeClient(detail)}>Delete</button>
                    </div>
                </div>

                <div className={styles.detailInfoGrid}>
                    {detail.email    && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Email</span><span>{detail.email}</span></div>}
                    {detail.phone    && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Phone</span><span>{detail.phone}</span></div>}
                    {detail.cnic_ntn        && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>CNIC / NTN</span><span>{detail.cnic_ntn}</span></div>}
                    {detail.address         && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Address</span><span>{detail.address}</span></div>}
                    {detail.referral_source && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Referral Source</span><span className={styles.badgeGray} style={{ fontSize: "0.78rem" }}>{detail.referral_source}</span></div>}
                    {detail.notes           && <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}><span className={styles.detailInfoLabel}>Notes</span><span>{detail.notes}</span></div>}
                </div>

                <div className={styles.sectionTitle} style={{ marginTop: "1.75rem" }}>
                    Matters ({detail.matters.length})
                </div>
                {detail.matters.length === 0 ? (
                    <div className={styles.emptyHint}>No matters yet for this client.</div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead><tr>
                                <th>Title</th><th>Type</th><th>Status</th><th>Court</th><th>Case #</th><th>Filed</th>
                            </tr></thead>
                            <tbody>
                                {detail.matters.map(m => (
                                    <tr key={m.matter_id}>
                                        <td><strong>{m.title}</strong></td>
                                        <td className={styles.muted}>{m.matter_type}</td>
                                        <td><span className={(styles as any)[STATUS_BADGE[m.status] ?? "badgeGray"]}>{m.status}</span></td>
                                        <td className={styles.muted}>{m.court_name ?? "—"}</td>
                                        <td className={styles.muted}>{m.case_number ?? "—"}</td>
                                        <td className={styles.muted}>{m.filing_date ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {showModal && <ClientModal />}
            </div>
        );
    }

    // ─ List view ─
    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{clients.length} client{clients.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={openAdd}>+ Add Client</button>
            </div>
            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : clients.length === 0 ? (
                <div className={styles.emptyHint}>No clients yet. Add your first client to start tracking matters.</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead><tr>
                            <th>Name</th><th>Type</th><th>Referral Source</th><th>Email</th><th>Phone</th><th>Matters</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {clients.map(c => (
                                <tr key={c.client_id}>
                                    <td>
                                        <button className={styles.linkBtn} onClick={() => openDetail(c)}>{c.name}</button>
                                    </td>
                                    <td><span className={c.client_type === "Corporate" ? styles.badgeGold : styles.badgeGray}>{c.client_type}</span></td>
                                    <td className={styles.muted} style={{ fontSize: "0.8rem" }}>{c.referral_source ?? <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                                    <td className={styles.muted}>{c.email ?? "—"}</td>
                                    <td className={styles.muted}>{c.phone ?? "—"}</td>
                                    <td className={styles.muted}>{c.matter_count ?? 0}</td>
                                    <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                        <button className={styles.actionBtn} onClick={() => openDetail(c)}>View</button>
                                        <button className={styles.actionBtn} onClick={() => openEdit(c)}>Edit</button>
                                        <button className={styles.actionBtnPortal} onClick={() => openPortal(c)}>Share Portal</button>
                                        <button className={styles.actionBtnDanger} disabled={removing === c.client_id} onClick={() => removeClient(c)}>
                                            {removing === c.client_id ? "…" : "Delete"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {showModal && <ClientModal />}
            {portalClient && <PortalModal />}
        </div>
    );
};

// ── Matters Panel ─────────────────────────────────────────────────────────────

type MatterStatus = "Active" | "Pending" | "Closed" | "Settled" | "Withdrawn";

const LIMITATION_TYPES = [
    "Contract / Money Recovery",
    "Immovable Property (Title)",
    "Mortgage Enforcement",
    "Tort / Personal Injury",
    "Service / Employment",
    "Execution of Decree",
    "Appeal — High Court",
    "Appeal — Supreme Court",
    "Revision",
    "Constitutional Petition",
];

// Pre-computed periods in days matching backend LIMITATION_PERIODS
const LIMITATION_DAYS: Record<string, number | null> = {
    "Contract / Money Recovery":  3 * 365,
    "Immovable Property (Title)": 12 * 365,
    "Mortgage Enforcement":       30 * 365,
    "Tort / Personal Injury":     365,
    "Service / Employment":       3 * 365,
    "Execution of Decree":        3 * 365,
    "Appeal — High Court":        90,
    "Appeal — Supreme Court":     30,
    "Revision":                   90,
    "Constitutional Petition":    null,
};

function computeLimitationDate(limType: string, coaDate: string): string {
    const days = LIMITATION_DAYS[limType];
    if (!days || !coaDate) return "";
    const d = new Date(coaDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function limitationDaysRemaining(limitationDate: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lim = new Date(limitationDate); lim.setHours(0, 0, 0, 0);
    return Math.round((lim.getTime() - today.getTime()) / 86400000);
}

const VAKALATNAMA_STATUSES = ["Not Required", "Pending", "Filed"] as const;

const BLANK_MATTER: {
    client_id: string; title: string; matter_type: string; status: MatterStatus;
    court_name: string; case_number: string; filing_date: string; opposing_party: string;
    team_id: string; notes: string;
    limitation_type: string; cause_of_action_date: string; limitation_date: string;
    vakalatnama_status: string;
} = {
    client_id: "", title: "", matter_type: MATTER_TYPES[0], status: "Active",
    court_name: "", case_number: "", filing_date: "", opposing_party: "", team_id: "", notes: "",
    limitation_type: "", cause_of_action_date: "", limitation_date: "",
    vakalatnama_status: "Pending",
};

const MattersPanel = () => {
    const [matters,     setMatters]     = useState<Matter[]>([]);
    const [clients,     setClients]     = useState<Client[]>([]);
    const [matterTeams, setMatterTeams] = useState<MatterTeam[]>([]);
    const [customCourts, setCustomCourts] = useState<{ court_id: string; name: string }[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [detail,      setDetail]      = useState<Matter | null>(null);
    const [editDetail,  setEditDetail]  = useState(false);
    const [showModal,   setShowModal]   = useState(false);
    const [form,        setForm]        = useState({ ...BLANK_MATTER });
    const [saving,      setSaving]      = useState(false);
    const [formErr,     setFormErr]     = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterType,   setFilterType]   = useState("all");
    const [removing,    setRemoving]    = useState<string | null>(null);
    // Link doc modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [allDocs,       setAllDocs]       = useState<DocFile[]>([]);
    const [linkingDoc,    setLinkingDoc]    = useState<string | null>(null);
    // New court input
    const [newCourtName, setNewCourtName] = useState("");
    const [addingCourt,  setAddingCourt]  = useState(false);
    // Detail tabs & fees
    const [detailTab,  setDetailTab]  = useState<"documents" | "fees" | "orders" | "time">("documents");
    const [fees,       setFees]       = useState<Fee[]>([]);
    const [feesLoading, setFeesLoading] = useState(false);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [editFee,      setEditFee]      = useState<Fee | null>(null);
    const [feeForm,      setFeeForm]      = useState({ description: "", fee_type: "Consultation", amount: "", fee_date: "", notes: "" });
    const [feeSaving,    setFeeSaving]    = useState(false);
    const [feeErr,       setFeeErr]       = useState("");
    const [genInvLoading, setGenInvLoading] = useState(false);
    // Court Orders — Task #130
    const [orders,        setOrders]        = useState<CourtOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [editOrder,      setEditOrder]      = useState<CourtOrder | null>(null);
    const [orderForm,      setOrderForm]      = useState({ hearing_date: "", court_name: "", order_brief: "", next_date: "", outcome: "Adjourned" });
    const [orderSaving,    setOrderSaving]    = useState(false);
    const [orderErr,       setOrderErr]       = useState("");
    // Adverse Parties — Task #131
    const BLANK_PARTY = { party_name: "", party_type: "Individual", counsel_name: "", counsel_phone: "", counsel_firm: "", notes: "" };
    const [adverseParties,   setAdverseParties]   = useState<AdverseParty[]>([]);
    const [showPartyModal,   setShowPartyModal]   = useState(false);
    const [editParty,        setEditParty]        = useState<AdverseParty | null>(null);
    const [partyForm,        setPartyForm]        = useState({ ...BLANK_PARTY });
    const [partySaving,      setPartySaving]      = useState(false);
    const [partyErr,         setPartyErr]         = useState("");
    // Time Tracking — Task #133
    const BLANK_TIME_FORM = { description: "", entry_date: new Date().toISOString().slice(0, 10), hours: "", minutes: "", hourly_rate: "", billable: true };
    const [timeEntries,    setTimeEntries]    = useState<TimeEntry[]>([]);
    const [timeLoading,    setTimeLoading]    = useState(false);
    const [showTimeModal,  setShowTimeModal]  = useState(false);
    const [editTimeEntry,  setEditTimeEntry]  = useState<TimeEntry | null>(null);
    const [timeForm,       setTimeForm]       = useState({ ...BLANK_TIME_FORM });
    const [timeSaving,     setTimeSaving]     = useState(false);
    const [timeErr,        setTimeErr]        = useState("");
    const [timerRunning,   setTimerRunning]   = useState(false);
    const [timerStart,     setTimerStart]     = useState<number | null>(null);
    const [timerElapsed,   setTimerElapsed]   = useState(0);   // seconds
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [billing,        setBilling]        = useState(false);
    const [billDesc,       setBillDesc]       = useState("");
    const [showBillModal,  setShowBillModal]  = useState(false);
    // Limitation alerts — Task #132
    const [limAlerts, setLimAlerts] = useState<{ matter_id: string; title: string; limitation_date: string; limitation_type: string; days_remaining: number; client_name: string }[]>([]);

    const allCourts = [...DEFAULT_COURTS, ...customCourts.map(c => c.name)];

    const loadAll = () => {
        Promise.all([
            fetch("/matters",                    { headers: authHeaders() }).then(r => r.json()),
            fetch("/clients",                    { headers: authHeaders() }).then(r => r.json()),
            fetch("/matter-teams",               { headers: authHeaders() }).then(r => r.json()),
            fetch("/courts",                     { headers: authHeaders() }).then(r => r.json()),
            fetch("/matters/limitation-alerts",  { headers: authHeaders() }).then(r => r.json()).catch(() => ({ alerts: [] })),
        ]).then(([md, cd, td, co, la]) => {
            setMatters(md.matters ?? []);
            setClients(cd.clients ?? []);
            setMatterTeams(td.teams ?? []);
            setCustomCourts(co.custom ?? []);
            setLimAlerts(la.alerts ?? []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { loadAll(); }, []);

    const loadOrders = (matterId: string) => {
        setOrdersLoading(true);
        fetch(`/matters/${matterId}/orders`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setOrders(d.orders ?? []); setOrdersLoading(false); })
            .catch(() => setOrdersLoading(false));
    };

    const openOrderModal = (order?: CourtOrder) => {
        const today = new Date().toISOString().slice(0, 10);
        if (order) {
            setEditOrder(order);
            setOrderForm({ hearing_date: order.hearing_date, court_name: order.court_name ?? "", order_brief: order.order_brief, next_date: order.next_date ?? "", outcome: order.outcome });
        } else {
            setEditOrder(null);
            setOrderForm({ hearing_date: today, court_name: detail?.court_name ?? "", order_brief: "", next_date: "", outcome: "Adjourned" });
        }
        setOrderErr(""); setShowOrderModal(true);
    };

    const saveOrder = async () => {
        if (!orderForm.hearing_date || !orderForm.order_brief.trim()) {
            setOrderErr("Hearing date and order summary are required."); return;
        }
        if (!detail) return;
        setOrderSaving(true); setOrderErr("");
        const body = {
            hearing_date: orderForm.hearing_date,
            court_name:   orderForm.court_name.trim() || undefined,
            order_brief:  orderForm.order_brief.trim(),
            next_date:    orderForm.next_date || undefined,
            outcome:      orderForm.outcome,
        };
        try {
            const url = editOrder
                ? `/matters/${detail.matter_id}/orders/${editOrder.order_id}`
                : `/matters/${detail.matter_id}/orders`;
            const method = editOrder ? "PATCH" : "POST";
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setOrderErr(d.error ?? "Save failed."); }
            else { setShowOrderModal(false); loadOrders(detail.matter_id); }
        } catch { setOrderErr("Network error."); }
        finally { setOrderSaving(false); }
    };

    const deleteOrder = async (order: CourtOrder) => {
        if (!detail || !confirm("Delete this court order entry?")) return;
        await fetch(`/matters/${detail.matter_id}/orders/${order.order_id}`, { method: "DELETE", headers: authHeaders() });
        loadOrders(detail.matter_id);
    };

    const loadAdverseParties = (matterId: string) => {
        fetch(`/matters/${matterId}/adverse-parties`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setAdverseParties(d.parties ?? []))
            .catch(() => {});
    };

    const openPartyModal = (party?: AdverseParty) => {
        if (party) {
            setEditParty(party);
            setPartyForm({ party_name: party.party_name, party_type: party.party_type, counsel_name: party.counsel_name ?? "", counsel_phone: party.counsel_phone ?? "", counsel_firm: party.counsel_firm ?? "", notes: party.notes ?? "" });
        } else {
            setEditParty(null);
            setPartyForm({ ...BLANK_PARTY });
        }
        setPartyErr(""); setShowPartyModal(true);
    };

    const saveParty = async () => {
        if (!partyForm.party_name.trim()) { setPartyErr("Party name is required."); return; }
        if (!detail) return;
        setPartySaving(true); setPartyErr("");
        const body = {
            party_name:   partyForm.party_name.trim(),
            party_type:   partyForm.party_type,
            counsel_name:  partyForm.counsel_name.trim() || undefined,
            counsel_phone: partyForm.counsel_phone.trim() || undefined,
            counsel_firm:  partyForm.counsel_firm.trim() || undefined,
            notes:         partyForm.notes.trim() || undefined,
        };
        try {
            const url = editParty
                ? `/matters/${detail.matter_id}/adverse-parties/${editParty.party_id}`
                : `/matters/${detail.matter_id}/adverse-parties`;
            const method = editParty ? "PATCH" : "POST";
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setPartyErr(d.error ?? "Save failed."); }
            else { setShowPartyModal(false); loadAdverseParties(detail.matter_id); }
        } catch { setPartyErr("Network error."); }
        finally { setPartySaving(false); }
    };

    const deleteParty = async (party: AdverseParty) => {
        if (!detail || !confirm(`Remove "${party.party_name}" from this matter?`)) return;
        await fetch(`/matters/${detail.matter_id}/adverse-parties/${party.party_id}`, { method: "DELETE", headers: authHeaders() });
        loadAdverseParties(detail.matter_id);
    };

    // ── Time Tracking helpers ──
    const loadTimeEntries = (matterId: string) => {
        setTimeLoading(true);
        fetch(`/matters/${matterId}/time-entries`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setTimeEntries(d.entries ?? []); setTimeLoading(false); })
            .catch(() => setTimeLoading(false));
    };

    const fmtElapsed = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const fmtDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const startTimer = () => {
        setTimerStart(Date.now() - timerElapsed * 1000);
        setTimerRunning(true);
    };

    const stopTimer = () => {
        setTimerRunning(false);
        const mins = Math.max(1, Math.round(timerElapsed / 60));
        const hh = Math.floor(mins / 60);
        const mm = mins % 60;
        setTimeForm({ ...BLANK_TIME_FORM, hours: String(hh), minutes: String(mm), entry_date: new Date().toISOString().slice(0, 10) });
        setEditTimeEntry(null); setTimeErr(""); setShowTimeModal(true);
    };

    const resetTimer = () => { setTimerRunning(false); setTimerElapsed(0); setTimerStart(null); };

    // Live timer tick
    useEffect(() => {
        if (!timerRunning || timerStart === null) return;
        const id = setInterval(() => {
            setTimerElapsed(Math.floor((Date.now() - timerStart) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [timerRunning, timerStart]);

    const openTimeModal = (entry?: TimeEntry) => {
        if (entry) {
            setEditTimeEntry(entry);
            setTimeForm({
                description: entry.description ?? "",
                entry_date: entry.entry_date,
                hours: String(Math.floor(entry.duration_minutes / 60)),
                minutes: String(entry.duration_minutes % 60),
                hourly_rate: String(entry.hourly_rate),
                billable: entry.billable === 1,
            });
        } else {
            setEditTimeEntry(null);
            setTimeForm({ ...BLANK_TIME_FORM, entry_date: new Date().toISOString().slice(0, 10) });
        }
        setTimeErr(""); setShowTimeModal(true);
    };

    const saveTimeEntry = async () => {
        const hrs = parseInt(timeForm.hours || "0");
        const mins = parseInt(timeForm.minutes || "0");
        const totalMins = hrs * 60 + mins;
        if (totalMins <= 0) { setTimeErr("Duration must be greater than 0."); return; }
        if (!timeForm.entry_date) { setTimeErr("Date is required."); return; }
        if (!detail) return;
        setTimeSaving(true); setTimeErr("");
        const body = {
            duration_minutes: totalMins,
            entry_date: timeForm.entry_date,
            description: timeForm.description.trim() || undefined,
            hourly_rate: parseInt(timeForm.hourly_rate || "0"),
            billable: timeForm.billable ? 1 : 0,
        };
        try {
            const url = editTimeEntry
                ? `/matters/${detail.matter_id}/time-entries/${editTimeEntry.entry_id}`
                : `/matters/${detail.matter_id}/time-entries`;
            const method = editTimeEntry ? "PATCH" : "POST";
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setTimeErr(d.error ?? "Save failed."); }
            else { setShowTimeModal(false); setTimerElapsed(0); loadTimeEntries(detail.matter_id); }
        } catch { setTimeErr("Network error."); }
        finally { setTimeSaving(false); }
    };

    const deleteTimeEntryUI = async (entry: TimeEntry) => {
        if (!detail || !confirm("Delete this time entry?")) return;
        await fetch(`/matters/${detail.matter_id}/time-entries/${entry.entry_id}`, { method: "DELETE", headers: authHeaders() });
        loadTimeEntries(detail.matter_id);
    };

    const billSelected = async () => {
        if (!detail || selectedEntries.size === 0) return;
        setBilling(true);
        try {
            const r = await fetch(`/matters/${detail.matter_id}/time-entries/bill`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ entry_ids: [...selectedEntries], description: billDesc || "Time charges" }),
            });
            if (r.ok) {
                setShowBillModal(false); setSelectedEntries(new Set()); setBillDesc("");
                loadTimeEntries(detail.matter_id);
                alert("Fee created! View it in the Fees & Invoices tab.");
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d.error ?? "Failed to create fee.");
            }
        } catch { alert("Network error."); }
        finally { setBilling(false); }
    };

    const openDetail = (m: Matter) => {
        setDetailTab("documents");
        setFees([]);
        setOrders([]);
        setAdverseParties([]);
        setTimeEntries([]);
        setSelectedEntries(new Set());
        resetTimer();
        fetch(`/matters/${m.matter_id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setDetail(d); setEditDetail(false); });
        loadAdverseParties(m.matter_id);
    };

    const loadFees = (matterId: string) => {
        setFeesLoading(true);
        fetch(`/fees?matter_id=${matterId}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setFees(Array.isArray(d) ? d : []); setFeesLoading(false); })
            .catch(() => setFeesLoading(false));
    };

    const openFeeModal = (fee?: Fee) => {
        if (fee) {
            setEditFee(fee);
            setFeeForm({ description: fee.description, fee_type: fee.fee_type, amount: String(fee.amount), fee_date: fee.fee_date, notes: fee.notes ?? "" });
        } else {
            setEditFee(null);
            const today = new Date().toISOString().slice(0, 10);
            setFeeForm({ description: "", fee_type: "Consultation", amount: "", fee_date: today, notes: "" });
        }
        setFeeErr(""); setShowFeeModal(true);
    };

    const saveFee = async () => {
        if (!feeForm.description.trim() || !feeForm.fee_date || !feeForm.amount) {
            setFeeErr("Description, date, and amount are required."); return;
        }
        const amount = parseInt(feeForm.amount);
        if (isNaN(amount) || amount < 0) { setFeeErr("Amount must be a positive number."); return; }
        setFeeSaving(true); setFeeErr("");
        const body = { description: feeForm.description.trim(), fee_type: feeForm.fee_type, amount, fee_date: feeForm.fee_date, notes: feeForm.notes || undefined, matter_id: detail?.matter_id };
        try {
            const r = editFee
                ? await fetch(`/fees/${editFee.fee_id}`, { method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) })
                : await fetch("/fees", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setFeeErr(d.error ?? "Save failed."); }
            else { setShowFeeModal(false); if (detail) loadFees(detail.matter_id); }
        } catch { setFeeErr("Network error."); }
        finally { setFeeSaving(false); }
    };

    const deleteFee = async (fee: Fee) => {
        if (!confirm(`Delete fee "${fee.description}"?`)) return;
        await fetch(`/fees/${fee.fee_id}`, { method: "DELETE", headers: authHeaders() });
        if (detail) loadFees(detail.matter_id);
    };

    const toggleFeePaid = async (fee: Fee) => {
        await fetch(`/fees/${fee.fee_id}`, {
            method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ is_paid: fee.is_paid ? 0 : 1 }),
        });
        if (detail) loadFees(detail.matter_id);
    };

    const generateInvoice = async () => {
        if (!detail) return;
        const unbilled = fees.filter(f => !f.invoice_id && !f.is_paid);
        if (unbilled.length === 0) { alert("No unbilled fees to invoice."); return; }
        setGenInvLoading(true);
        const today = new Date().toISOString().slice(0, 10);
        try {
            const r = await fetch("/invoices", {
                method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    matter_id: detail.matter_id, title: `Invoice — ${detail.title}`,
                    issued_date: today, client_id: detail.client_id,
                }),
            });
            if (r.ok) { loadFees(detail.matter_id); alert("Invoice created! View it in the Invoices panel."); }
            else { const d = await r.json().catch(() => ({})); alert(d.error ?? "Failed to create invoice."); }
        } catch { alert("Network error."); }
        finally { setGenInvLoading(false); }
    };

    const saveMatter = async () => {
        if (!form.client_id || !form.title.trim() || !form.matter_type) {
            setFormErr("Client, title, and matter type are required."); return;
        }
        setSaving(true); setFormErr(null);
        const body: any = { ...form };
        if (!body.team_id) body.team_id = null;
        try {
            const res = await fetch("/matters", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setFormErr(data.error ?? "Failed."); setSaving(false); return; }
            setShowModal(false);
            loadAll();
        } catch { setFormErr("Network error."); }
        setSaving(false);
    };

    const saveDetailEdit = async () => {
        if (!detail) return;
        setSaving(true); setFormErr(null);
        const body: any = { ...form };
        if (!body.team_id) body.team_id = null;
        try {
            const res = await fetch(`/matters/${detail.matter_id}`, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setFormErr(data.error ?? "Failed."); setSaving(false); return; }
            setDetail(data);
            setMatters(prev => prev.map(m => m.matter_id === data.matter_id ? { ...m, ...data } : m));
            setEditDetail(false);
        } catch { setFormErr("Network error."); }
        setSaving(false);
    };

    const removeMatter = async (m: Matter) => {
        if (!confirm(`Delete matter "${m.title}"?`)) return;
        setRemoving(m.matter_id);
        await fetch(`/matters/${m.matter_id}`, { method: "DELETE", headers: authHeaders() });
        setMatters(prev => prev.filter(x => x.matter_id !== m.matter_id));
        if (detail?.matter_id === m.matter_id) setDetail(null);
        setRemoving(null);
    };

    const unlinkDoc = async (docId: string) => {
        if (!detail) return;
        await fetch(`/matters/${detail.matter_id}/documents/${docId}`, { method: "DELETE", headers: authHeaders() });
        setDetail(prev => prev ? { ...prev, documents: (prev.documents ?? []).filter(d => d.doc_id !== docId) } : prev);
    };

    const openLinkModal = () => {
        fetch("/documents", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                const docs: DocFile[] = (d.documents ?? []).map((doc: any) => ({
                    doc_id: doc.doc_id, name: doc.filename,
                    size: fmtBytes(doc.size_bytes ?? 0), size_bytes: doc.size_bytes ?? 0,
                    uploaded: fmtDate(doc.uploaded_at ?? ""), status: doc.status,
                    category_id: doc.category_id ?? null, category_name: doc.category_name ?? null,
                    matter_id: doc.matter_id ?? null,
                }));
                // Show only docs not linked to another matter
                setAllDocs(docs.filter((d: any) => !d.matter_id || d.matter_id === detail?.matter_id));
                setShowLinkModal(true);
            });
    };

    const linkDoc = async (docId: string) => {
        if (!detail) return;
        setLinkingDoc(docId);
        const res = await fetch(`/matters/${detail.matter_id}/documents/${docId}`, { method: "POST", headers: authHeaders() });
        if (res.ok) {
            // Refresh matter detail
            fetch(`/matters/${detail.matter_id}`, { headers: authHeaders() })
                .then(r => r.json()).then(d => setDetail(d));
            setAllDocs(prev => prev.filter(d => d.doc_id !== docId));
        }
        setLinkingDoc(null);
    };

    const addCourt = async () => {
        const name = newCourtName.trim();
        if (!name) return;
        setAddingCourt(true);
        try {
            const res = await fetch("/courts", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (res.ok) {
                setCustomCourts(prev => [...prev, data]);
                setNewCourtName("");
            }
        } catch { /* silent */ }
        setAddingCourt(false);
    };

    const filtered = matters.filter(m =>
        (filterStatus === "all" || m.status === filterStatus) &&
        (filterType   === "all" || m.matter_type === filterType)
    );

    const MatterForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
        <>
            {formErr && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {formErr}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Title *</label>
                    <input className={styles.formInput} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Khan vs State — Criminal Appeal 2024" autoFocus />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Client *</label>
                    <select className={styles.formSelect} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                        <option value="">Select client…</option>
                        {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Matter Type *</label>
                    <select className={styles.formSelect} value={form.matter_type} onChange={e => setForm({ ...form, matter_type: e.target.value })}>
                        {MATTER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Status</label>
                    <select className={styles.formSelect} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                        {MATTER_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Assigned Team</label>
                    <select className={styles.formSelect} value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}>
                        <option value="">No team</option>
                        {matterTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Court</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <select className={styles.formSelect} value={form.court_name} onChange={e => setForm({ ...form, court_name: e.target.value })}>
                            <option value="">Select court…</option>
                            {allCourts.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                        <input className={styles.formInput} placeholder="Add custom court…" value={newCourtName}
                            onChange={e => setNewCourtName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addCourt()}
                            style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }} />
                        <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", whiteSpace: "nowrap" }}
                            onClick={addCourt} disabled={addingCourt || !newCourtName.trim()}>
                            {addingCourt ? "…" : "+ Add"}
                        </button>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Case Number</label>
                    <input className={styles.formInput} value={form.case_number} onChange={e => setForm({ ...form, case_number: e.target.value })} placeholder="e.g. 2024/LHC/4512" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Filing Date</label>
                    <input className={styles.formInput} type="date" value={form.filing_date} onChange={e => setForm({ ...form, filing_date: e.target.value })} />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Opposing Party</label>
                    <input className={styles.formInput} value={form.opposing_party} onChange={e => setForm({ ...form, opposing_party: e.target.value })} placeholder="Name of opposing counsel or party" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Notes</label>
                    <input className={styles.formInput} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes…" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Vakalatnama Status</label>
                    <select className={styles.formSelect} value={form.vakalatnama_status} onChange={e => setForm({ ...form, vakalatnama_status: e.target.value })}>
                        {VAKALATNAMA_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                {/* Limitation fields */}
                <div className={styles.formGroup} style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <label className={styles.formLabel} style={{ color: "var(--gold)", fontWeight: 700 }}>⚠ Limitation (Limitation Act 1908)</label>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Suit / Appeal Type</label>
                    <select className={styles.formSelect} value={form.limitation_type} onChange={e => {
                        const lt = e.target.value;
                        const newLimDate = lt && form.cause_of_action_date ? computeLimitationDate(lt, form.cause_of_action_date) : "";
                        setForm({ ...form, limitation_type: lt, limitation_date: newLimDate });
                    }}>
                        <option value="">Not set</option>
                        {LIMITATION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cause of Action Date</label>
                    <input type="date" className={styles.formInput} value={form.cause_of_action_date} onChange={e => {
                        const coa = e.target.value;
                        const newLimDate = form.limitation_type && coa ? computeLimitationDate(form.limitation_type, coa) : form.limitation_date;
                        setForm({ ...form, cause_of_action_date: coa, limitation_date: newLimDate });
                    }} />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Limitation Deadline <span className={styles.muted} style={{ fontWeight: 400 }}>(auto-computed or override)</span></label>
                    <input type="date" className={styles.formInput} value={form.limitation_date} onChange={e => setForm({ ...form, limitation_date: e.target.value })}
                        style={form.limitation_date && limitationDaysRemaining(form.limitation_date) <= 30 ? { borderColor: "#c94040" } : {}} />
                    {form.limitation_date && (() => {
                        const d = limitationDaysRemaining(form.limitation_date);
                        return <div style={{ fontSize: "0.78rem", marginTop: "0.3rem", color: d < 0 ? "#c94040" : d <= 30 ? "#c97c2a" : "var(--text-3)" }}>
                            {d < 0 ? `⚠ Limitation expired ${Math.abs(d)} days ago` : d === 0 ? "⚠ Limitation expires TODAY" : `${d} days remaining`}
                        </div>;
                    })()}
                </div>
            </div>
            <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={onCancel}>Cancel</button>
                <button className={styles.btnPrimary} onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save Matter"}</button>
            </div>
        </>
    );

    // ─ Matter detail view ─
    if (detail) {
        const grouped = groupDocsByCategory(detail.documents ?? []);
        return (
            <div className={styles.panelContent}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                    <button className={styles.backBtn} onClick={() => setDetail(null)}>← Back to Matters</button>
                    {!editDetail && (
                        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => {
                                setForm({
                                    client_id: detail.client_id, title: detail.title,
                                    matter_type: detail.matter_type, status: detail.status,
                                    court_name: detail.court_name ?? "", case_number: detail.case_number ?? "",
                                    filing_date: detail.filing_date ?? "", opposing_party: detail.opposing_party ?? "",
                                    team_id: detail.team_id ?? "", notes: detail.notes ?? "",
                                    limitation_type: detail.limitation_type ?? "",
                                    cause_of_action_date: detail.cause_of_action_date ?? "",
                                    limitation_date: detail.limitation_date ?? "",
                                    vakalatnama_status: detail.vakalatnama_status ?? "Pending",
                                });
                                setFormErr(null); setEditDetail(true);
                            }}>Edit</button>
                            <button className={styles.actionBtnDanger} style={{ fontSize: "0.8rem" }} onClick={() => removeMatter(detail)}>Delete</button>
                        </div>
                    )}
                </div>

                {editDetail ? (
                    <div className={styles.settingsCard} style={{ marginBottom: "1.5rem" }}>
                        <div className={styles.settingsCardTitle}>Edit Matter</div>
                        <MatterForm onSave={saveDetailEdit} onCancel={() => setEditDetail(false)} />
                    </div>
                ) : (
                    <div className={styles.matterDetailHeader}>
                        <div>
                            <h2 className={styles.detailTitle}>{detail.title}</h2>
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                                <span className={(styles as any)[STATUS_BADGE[detail.status] ?? "badgeGray"]}>{detail.status}</span>
                                <span className={styles.badgeGray}>{detail.matter_type}</span>
                                {detail.team_name && <span className={styles.badgeGold}>👥 {detail.team_name}</span>}
                            </div>
                        </div>
                        <div className={styles.detailInfoGrid} style={{ marginTop: "1rem" }}>
                            <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Client</span><span>{detail.client_name}</span></div>
                            {detail.court_name    && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Court</span><span>{detail.court_name}</span></div>}
                            {detail.case_number   && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Case #</span><span>{detail.case_number}</span></div>}
                            {detail.filing_date   && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Filed</span><span>{detail.filing_date}</span></div>}
                            {detail.opposing_party && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Opposing Party</span><span>{detail.opposing_party}</span></div>}
                            {detail.notes         && <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}><span className={styles.detailInfoLabel}>Notes</span><span>{detail.notes}</span></div>}
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Vakalatnama</span>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span className={
                                        detail.vakalatnama_status === "Filed"        ? styles.badgeGreen :
                                        detail.vakalatnama_status === "Not Required" ? styles.badgeGray  : styles.badgeAmber
                                    } style={{ fontSize: "0.72rem" }}>
                                        {detail.vakalatnama_status ?? "Pending"}
                                    </span>
                                    {VAKALATNAMA_STATUSES.filter(s => s !== (detail.vakalatnama_status ?? "Pending")).map(s => (
                                        <button key={s} className={styles.btnGhost} style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem" }}
                                            onClick={async () => {
                                                const r = await fetch(`/matters/${detail.matter_id}`, {
                                                    method: "PATCH",
                                                    headers: { ...authHeaders(), "Content-Type": "application/json" },
                                                    body: JSON.stringify({ vakalatnama_status: s }),
                                                });
                                                if (r.ok) {
                                                    const updated = await r.json();
                                                    setDetail(updated);
                                                    setMatters(prev => prev.map(m => m.matter_id === updated.matter_id ? { ...m, vakalatnama_status: updated.vakalatnama_status } : m));
                                                }
                                            }}>
                                            → {s}
                                        </button>
                                    ))}
                                </span>
                            </div>
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Adjournments</span>
                                <span>
                                    <span className={
                                        (detail.adjournment_count ?? 0) >= 10 ? styles.limBadgeCritical :
                                        (detail.adjournment_count ?? 0) >= 5  ? styles.badgeAmber : styles.badgeGray
                                    } style={{ fontSize: "0.78rem" }}>
                                        {detail.adjournment_count ?? 0} adjournment{(detail.adjournment_count ?? 0) !== 1 ? "s" : ""}
                                    </span>
                                    <span className={styles.muted} style={{ fontSize: "0.75rem", marginLeft: "0.4rem" }}>(from Court Orders log)</span>
                                </span>
                            </div>
                            {detail.limitation_date && (() => {
                                const d = limitationDaysRemaining(detail.limitation_date!);
                                return (
                                    <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}>
                                        <span className={styles.detailInfoLabel}>Limitation Deadline</span>
                                        <span>
                                            {detail.limitation_date}
                                            {detail.limitation_type && <span className={styles.muted}> ({detail.limitation_type})</span>}
                                            <span className={d < 0 ? styles.limBadgeCritical : d <= 30 ? styles.limBadgeCritical : d <= 60 ? styles.limBadgeWarn : styles.badgeGreen} style={{ marginLeft: "0.5rem", fontSize: "0.72rem" }}>
                                                {d < 0 ? `EXPIRED ${Math.abs(d)}d ago` : d === 0 ? "EXPIRES TODAY" : `${d} days left`}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ── Adverse Parties section ── */}
                <div className={styles.adversePartiesSection}>
                    <div className={styles.adversePartiesSectionHeader}>
                        <span className={styles.adversePartiesSectionTitle}>⚖ Opposing Parties</span>
                        <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.25rem 0.65rem" }} onClick={() => openPartyModal()}>+ Add</button>
                    </div>
                    {adverseParties.length === 0 ? (
                        <span className={styles.muted} style={{ fontSize: "0.8rem" }}>None recorded.</span>
                    ) : (
                        <div className={styles.adversePartyList}>
                            {adverseParties.map(p => (
                                <div key={p.party_id} className={styles.adversePartyCard}>
                                    <div className={styles.adversePartyCardMain}>
                                        <span className={styles.adversePartyName}>{p.party_name}</span>
                                        <span className={styles.badgeGray} style={{ fontSize: "0.68rem" }}>{p.party_type}</span>
                                    </div>
                                    {(p.counsel_name || p.counsel_firm) && (
                                        <div className={styles.adversePartyMeta}>
                                            {p.counsel_name && <span>Counsel: <strong>{p.counsel_name}</strong></span>}
                                            {p.counsel_firm && <span> · {p.counsel_firm}</span>}
                                            {p.counsel_phone && <span> · {p.counsel_phone}</span>}
                                        </div>
                                    )}
                                    {p.notes && <div className={styles.adversePartyNotes}>{p.notes}</div>}
                                    <div className={styles.adversePartyActions}>
                                        <button className={styles.actionBtn} onClick={() => openPartyModal(p)}>Edit</button>
                                        <button className={styles.actionBtnDanger} onClick={() => deleteParty(p)}>Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Adverse Party modal ── */}
                {showPartyModal && (
                    <div className={styles.overlay} onClick={() => setShowPartyModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                            <div className={styles.modalTitle}>{editParty ? "Edit Opposing Party" : "Add Opposing Party"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                                    <label className={styles.formLabel}>Party Name *</label>
                                    <input className={styles.formInput} value={partyForm.party_name} onChange={e => setPartyForm(f => ({ ...f, party_name: e.target.value }))} placeholder="e.g. Muhammad Arif Khan" autoFocus />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Party Type</label>
                                    <select className={styles.formSelect} value={partyForm.party_type} onChange={e => setPartyForm(f => ({ ...f, party_type: e.target.value }))}>
                                        {["Individual", "Company", "Government", "Other"].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Counsel Name</label>
                                    <input className={styles.formInput} value={partyForm.counsel_name} onChange={e => setPartyForm(f => ({ ...f, counsel_name: e.target.value }))} placeholder="Opposing advocate" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Counsel Phone</label>
                                    <input className={styles.formInput} value={partyForm.counsel_phone} onChange={e => setPartyForm(f => ({ ...f, counsel_phone: e.target.value }))} placeholder="+92 300 0000000" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Counsel Firm</label>
                                    <input className={styles.formInput} value={partyForm.counsel_firm} onChange={e => setPartyForm(f => ({ ...f, counsel_firm: e.target.value }))} placeholder="Law firm name" />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                                    <label className={styles.formLabel}>Notes</label>
                                    <input className={styles.formInput} value={partyForm.notes} onChange={e => setPartyForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes…" />
                                </div>
                            </div>
                            {partyErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{partyErr}</div>}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowPartyModal(false)} disabled={partySaving}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveParty} disabled={partySaving}>{partySaving ? "Saving…" : editParty ? "Save Changes" : "Add Party"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail tabs */}
                <div className={styles.detailTabBar}>
                    <button className={`${styles.detailTabBtn}${detailTab === "documents" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => setDetailTab("documents")}>
                        Documents ({(detail.documents ?? []).length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "fees" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("fees"); if (detail) loadFees(detail.matter_id); }}>
                        Fees &amp; Invoices
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "orders" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("orders"); if (detail) loadOrders(detail.matter_id); }}>
                        Court Orders ({orders.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "time" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("time"); if (detail) loadTimeEntries(detail.matter_id); }}>
                        Time ({timeEntries.length})
                    </button>
                </div>

                {/* ── Documents tab ── */}
                {detailTab === "documents" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>{(detail.documents ?? []).length} document{(detail.documents ?? []).length !== 1 ? "s" : ""} linked</span>
                        <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={openLinkModal}>
                            + Link Documents
                        </button>
                    </div>
                    {grouped.length === 0 ? (
                        <div className={styles.emptyHint}>No documents linked yet. Click "Link Documents" to attach files from your library.</div>
                    ) : (
                        <div className={styles.docHierarchy}>
                            {grouped.map(([catName, docs]) => (
                                <div key={catName} className={styles.docHierarchyGroup}>
                                    <div className={styles.docHierarchyGroupHeader}>
                                        <span className={styles.docHierarchyCat}>📁 {catName}</span>
                                        <span className={styles.docHierarchyCount}>{docs.length}</span>
                                    </div>
                                    {docs.map(doc => (
                                        <div key={doc.doc_id} className={styles.docHierarchyRow}>
                                            <span className={styles.fileIcon} style={{ fontSize: "0.55rem" }}>F</span>
                                            <span className={styles.docHierarchyName}>{doc.filename}</span>
                                            <span className={styles.docHierarchySize}>{fmtBytes(doc.size_bytes)}</span>
                                            <span className={doc.status === "ready" ? styles.badgeGreen : styles.badgeAmber} style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem" }}>
                                                {doc.status === "ready" ? "Ready" : "Processing"}
                                            </span>
                                            <button className={styles.queueRemove} title="Unlink from matter" onClick={() => unlinkDoc(doc.doc_id)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </>)}

                {/* ── Fees tab ── */}
                {detailTab === "fees" && (<>
                    {(() => {
                        const unbilled  = fees.filter(f => !f.invoice_id);
                        const billed    = fees.filter(f => !!f.invoice_id);
                        const totalUnbilled = unbilled.reduce((s, f) => s + f.amount, 0);
                        const totalAll  = fees.reduce((s, f) => s + f.amount, 0);
                        return (
                            <>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "var(--text-2)" }}>
                                        <span>Total: <strong style={{ color: "var(--text-1)" }}>{fmtPKR(totalAll)}</strong></span>
                                        <span>Unbilled: <strong style={{ color: "var(--gold)" }}>{fmtPKR(totalUnbilled)}</strong></span>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        {unbilled.length > 0 && (
                                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }}
                                                disabled={genInvLoading} onClick={generateInvoice}>
                                                {genInvLoading ? "Creating…" : "Generate Invoice"}
                                            </button>
                                        )}
                                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openFeeModal()}>
                                            + Add Fee
                                        </button>
                                    </div>
                                </div>

                                {feesLoading ? (
                                    <div className={styles.emptyHint}>Loading…</div>
                                ) : fees.length === 0 ? (
                                    <div className={styles.emptyHint}>No fees recorded yet. Click "+ Add Fee" to start tracking.</div>
                                ) : (
                                    <div className={styles.tableWrap}>
                                        <table className={styles.table}>
                                            <thead><tr>
                                                <th>Description</th><th>Type</th><th>Date</th>
                                                <th style={{ textAlign: "right" }}>Amount (PKR)</th>
                                                <th>Paid</th><th>Invoice</th><th>Actions</th>
                                            </tr></thead>
                                            <tbody>
                                                {fees.map(fee => (
                                                    <tr key={fee.fee_id} style={{ opacity: fee.is_paid ? 0.6 : 1 }}>
                                                        <td>{fee.description}{fee.notes && <span className={styles.muted}> · {fee.notes}</span>}</td>
                                                        <td className={styles.muted}>{fee.fee_type}</td>
                                                        <td className={styles.muted}>{fee.fee_date}</td>
                                                        <td style={{ textAlign: "right", fontWeight: 600 }}>{fee.amount.toLocaleString("en-PK")}</td>
                                                        <td>
                                                            <button
                                                                className={fee.is_paid ? styles.badgeGreen : styles.badgeGray}
                                                                style={{ border: "none", cursor: "pointer", fontSize: "0.72rem" }}
                                                                onClick={() => toggleFeePaid(fee)}>
                                                                {fee.is_paid ? "Paid" : "Unpaid"}
                                                            </button>
                                                        </td>
                                                        <td className={styles.muted}>{fee.invoice_id ? <span className={styles.badgeBlue} style={{ fontSize: "0.68rem" }}>Billed</span> : "—"}</td>
                                                        <td style={{ display: "flex", gap: "0.35rem" }}>
                                                            <button className={styles.actionBtn} onClick={() => openFeeModal(fee)}>Edit</button>
                                                            <button className={styles.actionBtnDanger} onClick={() => deleteFee(fee)}>Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: "0.82rem" }}>Total</td>
                                                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>{totalAll.toLocaleString("en-PK")}</td>
                                                    <td colSpan={3} />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </>)}

                {/* ── Court Orders tab ── */}
                {detailTab === "orders" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.82rem", color: "var(--text-2)" }}>
                            <span>{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
                            {(() => {
                                const adj = orders.filter(o => o.outcome === "Adjourned").length;
                                return adj > 0 ? (
                                    <span className={adj >= 10 ? styles.limBadgeCritical : adj >= 5 ? styles.badgeAmber : styles.badgeGray}
                                        style={{ fontSize: "0.72rem" }}>
                                        {adj} adjournment{adj !== 1 ? "s" : ""}
                                    </span>
                                ) : null;
                            })()}
                        </div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openOrderModal()}>+ Add Order</button>
                    </div>
                    {ordersLoading ? (
                        <div className={styles.emptyHint}>Loading…</div>
                    ) : orders.length === 0 ? (
                        <div className={styles.emptyHint}>No court orders recorded yet. Click "+ Add Order" after each hearing to build the case timeline.</div>
                    ) : (
                        <div className={styles.ordersTimeline}>
                            {orders.map((o, idx) => {
                                const outcomeColor: Record<string, string> = {
                                    "Adjourned":       "var(--text-3)",
                                    "Heard":           "var(--gold)",
                                    "Decided":         "#2d8a4e",
                                    "Partially Heard": "#c97c2a",
                                };
                                return (
                                    <div key={o.order_id} className={styles.orderCard}>
                                        <div className={styles.orderCardLeft}>
                                            <div className={styles.orderDot} style={{ background: outcomeColor[o.outcome] ?? "var(--border)" }} />
                                            {idx < orders.length - 1 && <div className={styles.orderLine} />}
                                        </div>
                                        <div className={styles.orderCardBody}>
                                            <div className={styles.orderCardHeader}>
                                                <div>
                                                    <span className={styles.orderDate}>{o.hearing_date}</span>
                                                    {o.court_name && <span className={styles.orderCourt}> · {o.court_name}</span>}
                                                </div>
                                                <span className={styles.orderOutcomeBadge} style={{ color: outcomeColor[o.outcome] }}>{o.outcome}</span>
                                            </div>
                                            <div className={styles.orderBrief}>{o.order_brief}</div>
                                            {o.next_date && (
                                                <div className={styles.orderNextDate}>Next date: <strong>{o.next_date}</strong></div>
                                            )}
                                            <div className={styles.orderActions}>
                                                <button className={styles.actionBtn} onClick={() => openOrderModal(o)}>Edit</button>
                                                <button className={styles.actionBtnDanger} onClick={() => deleteOrder(o)}>Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>)}

                {/* ── Time Tracking tab ── */}
                {detailTab === "time" && (() => {
                    const billable   = timeEntries.filter(e => e.billable === 1 && !e.fee_id);
                    const totalMins  = timeEntries.reduce((s, e) => s + e.duration_minutes, 0);
                    const billMins   = billable.reduce((s, e) => s + e.duration_minutes, 0);
                    const totalValue = billable.reduce((s, e) => s + Math.round(e.duration_minutes / 60 * e.hourly_rate), 0);
                    return (
                        <>
                            {/* Timer widget */}
                            <div className={styles.timerWidget}>
                                <div className={styles.timerDisplay}>{fmtElapsed(timerElapsed)}</div>
                                <div className={styles.timerControls}>
                                    {!timerRunning ? (
                                        <button className={styles.btnPrimary} style={{ fontSize: "0.82rem" }} onClick={startTimer}>▶ Start Timer</button>
                                    ) : (
                                        <button className={styles.btnGold} style={{ fontSize: "0.82rem" }} onClick={stopTimer}>⏹ Stop &amp; Log</button>
                                    )}
                                    {timerElapsed > 0 && !timerRunning && (
                                        <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={resetTimer}>Reset</button>
                                    )}
                                    <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => openTimeModal()}>+ Manual Entry</button>
                                </div>
                            </div>

                            {/* Summary row */}
                            <div className={styles.timeSummaryRow}>
                                <span>Total: <strong>{fmtDuration(totalMins)}</strong></span>
                                <span>Unbilled billable: <strong style={{ color: "var(--gold)" }}>{fmtDuration(billMins)}</strong></span>
                                <span>Value: <strong>{totalValue.toLocaleString("en-PK")} PKR</strong></span>
                                {selectedEntries.size > 0 && (
                                    <button className={styles.btnPrimary} style={{ fontSize: "0.8rem", marginLeft: "auto" }}
                                        onClick={() => setShowBillModal(true)}>
                                        Convert {selectedEntries.size} to Fee
                                    </button>
                                )}
                            </div>

                            {/* Entries table */}
                            {timeLoading ? (
                                <div className={styles.emptyHint}>Loading…</div>
                            ) : timeEntries.length === 0 ? (
                                <div className={styles.emptyHint}>No time logged yet. Start the timer or add a manual entry.</div>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr>
                                            <th style={{ width: 32 }}></th>
                                            <th>Date</th><th>Description</th><th>Duration</th>
                                            <th>Rate (PKR/hr)</th><th>Value</th><th>Billable</th><th>Billed</th><th>Actions</th>
                                        </tr></thead>
                                        <tbody>
                                            {timeEntries.map(e => {
                                                const val = Math.round(e.duration_minutes / 60 * e.hourly_rate);
                                                const canSelect = e.billable === 1 && !e.fee_id;
                                                const checked   = selectedEntries.has(e.entry_id);
                                                return (
                                                    <tr key={e.entry_id} style={{ opacity: e.fee_id ? 0.55 : 1 }}>
                                                        <td>
                                                            {canSelect && (
                                                                <input type="checkbox" checked={checked}
                                                                    onChange={() => {
                                                                        setSelectedEntries(prev => {
                                                                            const n = new Set(prev);
                                                                            checked ? n.delete(e.entry_id) : n.add(e.entry_id);
                                                                            return n;
                                                                        });
                                                                    }} />
                                                            )}
                                                        </td>
                                                        <td className={styles.muted}>{e.entry_date}</td>
                                                        <td>{e.description || <span className={styles.muted}>—</span>}</td>
                                                        <td><strong>{fmtDuration(e.duration_minutes)}</strong></td>
                                                        <td className={styles.muted}>{e.hourly_rate > 0 ? e.hourly_rate.toLocaleString("en-PK") : "—"}</td>
                                                        <td>{val > 0 ? val.toLocaleString("en-PK") : "—"}</td>
                                                        <td>{e.billable === 1 ? <span className={styles.badgeGreen} style={{ fontSize: "0.68rem" }}>Yes</span> : <span className={styles.badgeGray} style={{ fontSize: "0.68rem" }}>No</span>}</td>
                                                        <td>{e.fee_id ? <span className={styles.badgeBlue} style={{ fontSize: "0.68rem" }}>Billed</span> : "—"}</td>
                                                        <td style={{ display: "flex", gap: "0.35rem" }}>
                                                            <button className={styles.actionBtn} onClick={() => openTimeModal(e)} disabled={!!e.fee_id}>Edit</button>
                                                            <button className={styles.actionBtnDanger} onClick={() => deleteTimeEntryUI(e)} disabled={!!e.fee_id}>Delete</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Convert to fee modal */}
                            {showBillModal && (
                                <div className={styles.overlay} onClick={() => setShowBillModal(false)}>
                                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                                        <div className={styles.modalTitle}>Convert Time to Fee</div>
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-2)", marginBottom: "1rem" }}>
                                            This will create a single fee entry from {selectedEntries.size} selected time entries and mark them as billed.
                                        </p>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Fee Description</label>
                                            <input className={styles.formInput} value={billDesc}
                                                onChange={e => setBillDesc(e.target.value)}
                                                placeholder="e.g. Legal services — July 2025" />
                                        </div>
                                        <div className={styles.modalActions}>
                                            <button className={styles.btnGhost} onClick={() => setShowBillModal(false)} disabled={billing}>Cancel</button>
                                            <button className={styles.btnPrimary} onClick={billSelected} disabled={billing}>{billing ? "Creating…" : "Create Fee"}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time entry add/edit modal */}
                            {showTimeModal && (
                                <div className={styles.overlay} onClick={() => setShowTimeModal(false)}>
                                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                                        <div className={styles.modalTitle}>{editTimeEntry ? "Edit Time Entry" : "Log Time"}</div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Description</label>
                                            <input className={styles.formInput} value={timeForm.description}
                                                onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))}
                                                placeholder="e.g. Court appearance, research, drafting" autoFocus />
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Hours</label>
                                                <input type="number" min="0" className={styles.formInput} value={timeForm.hours}
                                                    onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))} placeholder="0" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Minutes</label>
                                                <input type="number" min="0" max="59" className={styles.formInput} value={timeForm.minutes}
                                                    onChange={e => setTimeForm(f => ({ ...f, minutes: e.target.value }))} placeholder="30" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Date</label>
                                                <input type="date" className={styles.formInput} value={timeForm.entry_date}
                                                    onChange={e => setTimeForm(f => ({ ...f, entry_date: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Hourly Rate (PKR)</label>
                                                <input type="number" min="0" className={styles.formInput} value={timeForm.hourly_rate}
                                                    onChange={e => setTimeForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="e.g. 5000" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Billable?</label>
                                                <select className={styles.formSelect} value={timeForm.billable ? "yes" : "no"}
                                                    onChange={e => setTimeForm(f => ({ ...f, billable: e.target.value === "yes" }))}>
                                                    <option value="yes">Yes</option>
                                                    <option value="no">No</option>
                                                </select>
                                            </div>
                                        </div>
                                        {timeErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{timeErr}</div>}
                                        <div className={styles.modalActions}>
                                            <button className={styles.btnGhost} onClick={() => setShowTimeModal(false)} disabled={timeSaving}>Cancel</button>
                                            <button className={styles.btnPrimary} onClick={saveTimeEntry} disabled={timeSaving}>{timeSaving ? "Saving…" : editTimeEntry ? "Save Changes" : "Log Time"}</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* ── Court Order add/edit modal ── */}
                {showOrderModal && (
                    <div className={styles.overlay} onClick={() => setShowOrderModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className={styles.modalTitle}>{editOrder ? "Edit Court Order" : "Add Court Order"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Hearing Date *</label>
                                    <input type="date" className={styles.formInput} value={orderForm.hearing_date} onChange={e => setOrderForm(f => ({ ...f, hearing_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Outcome</label>
                                    <select className={styles.formSelect} value={orderForm.outcome} onChange={e => setOrderForm(f => ({ ...f, outcome: e.target.value }))}>
                                        {["Adjourned", "Heard", "Partially Heard", "Decided"].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Court (optional)</label>
                                <select className={styles.formSelect} value={orderForm.court_name} onChange={e => setOrderForm(f => ({ ...f, court_name: e.target.value }))}>
                                    <option value="">Same as matter</option>
                                    {allCourts.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Order Summary *</label>
                                <textarea className={styles.formInput} rows={4} style={{ resize: "vertical" }} value={orderForm.order_brief} onChange={e => setOrderForm(f => ({ ...f, order_brief: e.target.value }))} placeholder="e.g. Case adjourned on application of plaintiff's counsel. Next date fixed for arguments on maintainability." />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Next Date Fixed</label>
                                <input type="date" className={styles.formInput} value={orderForm.next_date} onChange={e => setOrderForm(f => ({ ...f, next_date: e.target.value }))} />
                            </div>
                            {orderErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{orderErr}</div>}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowOrderModal(false)} disabled={orderSaving}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveOrder} disabled={orderSaving}>{orderSaving ? "Saving…" : editOrder ? "Save Changes" : "Add Order"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Fee add/edit modal ── */}
                {showFeeModal && (
                    <div className={styles.overlay} onClick={() => setShowFeeModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                            <div className={styles.modalTitle}>{editFee ? "Edit Fee" : "Add Fee"}</div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description *</label>
                                <input className={styles.formInput} value={feeForm.description} onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Court appearance — Session 1" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formSelect} value={feeForm.fee_type} onChange={e => setFeeForm(f => ({ ...f, fee_type: e.target.value }))}>
                                        {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Amount (PKR) *</label>
                                    <input type="number" min="0" className={styles.formInput} value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 25000" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Date *</label>
                                <input type="date" className={styles.formInput} value={feeForm.fee_date} onChange={e => setFeeForm(f => ({ ...f, fee_date: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <input className={styles.formInput} value={feeForm.notes} onChange={e => setFeeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                            </div>
                            {feeErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{feeErr}</div>}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowFeeModal(false)} disabled={feeSaving}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveFee} disabled={feeSaving}>{feeSaving ? "Saving…" : editFee ? "Save Changes" : "Add Fee"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Link document modal */}
                {showLinkModal && (
                    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowLinkModal(false); }}>
                        <div className={styles.modal} style={{ maxWidth: 520 }}>
                            <h3 className={styles.modalTitle}>Link Documents</h3>
                            <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                                Select documents from your library to link to this matter.
                            </p>
                            {allDocs.length === 0 ? (
                                <div className={styles.emptyHint}>All available documents are already linked to matters, or your library is empty.</div>
                            ) : (
                                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                                    {allDocs.map(doc => (
                                        <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span className={styles.fileIcon} style={{ fontSize: "0.55rem", flexShrink: 0 }}>F</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: "0.85rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                                                <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{doc.category_name ?? "No category"} · {doc.size}</div>
                                            </div>
                                            <button className={styles.btnPrimary} style={{ fontSize: "0.75rem", padding: "0.3rem 0.8rem" }}
                                                disabled={linkingDoc === doc.doc_id}
                                                onClick={() => linkDoc(doc.doc_id)}>
                                                {linkingDoc === doc.doc_id ? "…" : "Link"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowLinkModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─ Matter list view ─
    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={styles.resultCount}>{filtered.length} matter{filtered.length !== 1 ? "s" : ""}</span>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All statuses</option>
                        {MATTER_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All types</option>
                        {MATTER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                {clients.length === 0 ? (
                    <span className={styles.muted} style={{ fontSize: "0.8rem" }}>Add a client first</span>
                ) : (
                    <button className={styles.btnPrimary} onClick={() => { setForm({ ...BLANK_MATTER }); setFormErr(null); setShowModal(true); }}>
                        + New Matter
                    </button>
                )}
            </div>

            {/* Limitation alerts banner */}
            {limAlerts.length > 0 && (
                <div className={styles.limAlertBanner}>
                    <strong>⚠ Limitation Approaching</strong>
                    <div className={styles.limAlertList}>
                        {limAlerts.map(a => {
                            const critical = a.days_remaining <= 30;
                            return (
                                <div key={a.matter_id} className={critical ? styles.limAlertItemCritical : styles.limAlertItem}>
                                    <button className={styles.linkBtn} onClick={() => { const m = matters.find(x => x.matter_id === a.matter_id); if (m) openDetail(m); }}>
                                        {a.title}
                                    </button>
                                    <span className={styles.muted}> · {a.client_name}</span>
                                    <span className={critical ? styles.limBadgeCritical : styles.limBadgeWarn}>
                                        {a.days_remaining < 0 ? `EXPIRED ${Math.abs(a.days_remaining)}d ago` : a.days_remaining === 0 ? "EXPIRES TODAY" : `${a.days_remaining}d left`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyHint}>
                    {matters.length === 0 ? "No matters yet. Create a client first, then open a matter." : "No matters match the selected filters."}
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead><tr>
                            <th>Title</th><th>Client</th><th>Type</th><th>Status</th><th>Vakalatnama</th><th>Adj.</th><th>Court</th><th>Case #</th><th>Team</th><th>Docs</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map(m => {
                                const limDays = m.limitation_date ? limitationDaysRemaining(m.limitation_date) : null;
                                return (
                                <tr key={m.matter_id}>
                                    <td>
                                        <button className={styles.linkBtn} onClick={() => openDetail(m)}>{m.title}</button>
                                        {limDays !== null && limDays <= 60 && (
                                            <span className={limDays <= 30 ? styles.limBadgeCritical : styles.limBadgeWarn} style={{ marginLeft: "0.4rem" }}>
                                                {limDays < 0 ? "LIM EXPIRED" : limDays === 0 ? "LIM TODAY" : `LIM ${limDays}d`}
                                            </span>
                                        )}
                                    </td>
                                    <td className={styles.muted}>{m.client_name}</td>
                                    <td className={styles.muted}>{m.matter_type}</td>
                                    <td><span className={(styles as any)[STATUS_BADGE[m.status] ?? "badgeGray"]}>{m.status}</span></td>
                                    <td>
                                        <span className={
                                            m.vakalatnama_status === "Filed"        ? styles.badgeGreen :
                                            m.vakalatnama_status === "Not Required" ? styles.badgeGray  : styles.badgeAmber
                                        } style={{ fontSize: "0.7rem" }}>
                                            {m.vakalatnama_status ?? "Pending"}
                                        </span>
                                    </td>
                                    <td>
                                        {(m.adjournment_count ?? 0) > 0 ? (
                                            <span className={
                                                (m.adjournment_count ?? 0) >= 10 ? styles.limBadgeCritical :
                                                (m.adjournment_count ?? 0) >= 5  ? styles.badgeAmber : styles.badgeGray
                                            } style={{ fontSize: "0.7rem" }}>
                                                {m.adjournment_count}
                                            </span>
                                        ) : <span className={styles.muted}>0</span>}
                                    </td>
                                    <td className={styles.muted}>{m.court_name ?? "—"}</td>
                                    <td className={styles.muted}>{m.case_number ?? "—"}</td>
                                    <td className={styles.muted}>{m.team_name ?? "—"}</td>
                                    <td className={styles.muted}>{m.doc_count ?? 0}</td>
                                    <td style={{ display: "flex", gap: "0.4rem" }}>
                                        <button className={styles.actionBtn} onClick={() => openDetail(m)}>View</button>
                                        <button className={styles.actionBtnDanger} disabled={removing === m.matter_id} onClick={() => removeMatter(m)}>
                                            {removing === m.matter_id ? "…" : "Delete"}
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal} style={{ maxWidth: 560 }}>
                        <h3 className={styles.modalTitle}>New Matter</h3>
                        <MatterForm onSave={saveMatter} onCancel={() => setShowModal(false)} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Audit Panel ───────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
    login_success:  "Login",
    login_fail:     "Failed Login",
    logout:         "Logout",
    password_change:"Password Change",
    doc_upload:     "Document Upload",
    doc_delete:     "Document Delete",
    search:         "Search",
    member_invite:  "Member Invited",
    member_remove:  "Member Removed",
    client_create:  "Client Created",
    client_update:  "Client Updated",
    client_delete:  "Client Deleted",
    matter_create:  "Matter Created",
    matter_update:  "Matter Updated",
    matter_delete:  "Matter Deleted",
    org_update:     "Settings Updated",
    access_denied:  "Access Denied",
};

const EVENT_BADGE: Record<string, string> = {
    login_success:  "badgeGreen",
    login_fail:     "badgeRed",
    access_denied:  "badgeRed",
    logout:         "badgeGray",
    password_change:"badgeAmber",
    doc_upload:     "badgeGold",
    doc_delete:     "badgeRed",
    search:         "badgeBlue",
    member_invite:  "badgeGreen",
    member_remove:  "badgeRed",
    client_create:  "badgeGreen",
    client_update:  "badgeAmber",
    client_delete:  "badgeRed",
    matter_create:  "badgeGreen",
    matter_update:  "badgeAmber",
    matter_delete:  "badgeRed",
    org_update:     "badgeAmber",
};

const ALL_EVENT_TYPES = Object.keys(EVENT_LABELS);

const AuditPanel = () => {
    const [logs,       setLogs]       = useState<AuditLog[]>([]);
    const [total,      setTotal]      = useState(0);
    const [loading,    setLoading]    = useState(true);
    const [filterType, setFilterType] = useState("all");
    const [dateFrom,   setDateFrom]   = useState("");
    const [dateTo,     setDateTo]     = useState("");
    const [page,       setPage]       = useState(0);
    const PAGE_SIZE = 100;

    const load = (pg = 0) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterType !== "all") params.set("event_type", filterType);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo)   params.set("date_to",   dateTo);
        params.set("limit",  String(PAGE_SIZE));
        params.set("offset", String(pg * PAGE_SIZE));
        fetch(`/audit-logs?${params}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { setPage(0); load(0); }, [filterType, dateFrom, dateTo]);

    const exportCsv = () => {
        const header = "Timestamp,Event,Actor,Role,Resource,IP Address,Details\n";
        const rows = logs.map(l => {
            const details = l.details ? (() => { try { return JSON.stringify(JSON.parse(l.details)); } catch { return l.details; } })() : "";
            return [
                l.created_at,
                EVENT_LABELS[l.event_type] ?? l.event_type,
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
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className={styles.panelContent}>
            {/* Toolbar */}
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All events</option>
                        {ALL_EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
                    </select>
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
                    <span className={styles.resultCount}>{total} event{total !== 1 ? "s" : ""}</span>
                </div>
                <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={exportCsv} disabled={logs.length === 0}>
                    ↓ Export CSV
                </button>
            </div>

            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : logs.length === 0 ? (
                <div className={styles.emptyHint}>No audit events match the selected filters.</div>
            ) : (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead><tr>
                                <th>Timestamp</th><th>Event</th><th>Actor</th><th>Role</th><th>Resource</th><th>IP</th><th>Details</th>
                            </tr></thead>
                            <tbody>
                                {logs.map(l => {
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
                                            <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{l.created_at.slice(0, 19).replace("T", " ")}</td>
                                            <td>
                                                <span className={(styles as any)[EVENT_BADGE[l.event_type] ?? "badgeGray"]}>
                                                    {EVENT_LABELS[l.event_type] ?? l.event_type}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "0.82rem" }}>{l.actor_name ?? "—"}</td>
                                            <td className={styles.muted}>{l.actor_role ?? "—"}</td>
                                            <td className={styles.muted} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {[l.resource_type, l.resource_name].filter(Boolean).join(": ") || "—"}
                                            </td>
                                            <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{l.ip_address ?? "—"}</td>
                                            <td className={styles.muted} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={detailStr}>
                                                {detailStr || "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem", justifyContent: "center" }}>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }}
                                disabled={page === 0} onClick={() => { setPage(page - 1); load(page - 1); }}>
                                ← Prev
                            </button>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                                Page {page + 1} of {totalPages}
                            </span>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }}
                                disabled={page >= totalPages - 1} onClick={() => { setPage(page + 1); load(page + 1); }}>
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── Overview Panel ────────────────────────────────────────────────────────────

const OverviewPanel = ({ orgName, docs, team, usage }: {
    orgName: string; docs: DocFile[]; team: TeamMember[]; usage: Usage;
}) => {
    const stats = [
        { label: "Documents",    value: docs.length,           icon: "D", sub: "In your library"  },
        { label: "Team Members", value: team.length,           icon: "T", sub: "With access"       },
        { label: "Storage Used", value: fmtBytes(usage.total_bytes), icon: "S", sub: "Across all docs" },
        { label: "Queries",      value: "--",                  icon: "Q", sub: "Requires analytics" },
    ];

    return (
        <div className={styles.panelContent}>
            <div className={styles.welcomeBanner}>
                <div className={styles.welcomeTitle}>Welcome back, {orgName}</div>
                <div className={styles.welcomeSub}>
                    Your workspace is set up and ready. Upload documents and your team can start asking questions immediately.
                </div>
            </div>

            <div className={styles.statsGrid}>
                {stats.map(s => (
                    <div key={s.label} className={styles.statCard}>
                        <div className={styles.statBadge}>{s.icon}</div>
                        <div className={styles.statValue}>{s.value}</div>
                        <div className={styles.statLabel}>{s.label}</div>
                        <div className={styles.statSub}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div className={styles.quickActions}>
                <div className={styles.sectionTitle}>Quick Actions</div>
                <div className={styles.actionCards}>
                    <div className={styles.actionCard}>
                        <div className={styles.actionCardIcon}>D</div>
                        <div>
                            <div className={styles.actionCardTitle}>Upload Documents</div>
                            <div className={styles.actionCardSub}>Add contracts, case files, or reports to your library</div>
                        </div>
                    </div>
                    <div className={styles.actionCard}>
                        <div className={styles.actionCardIcon}>T</div>
                        <div>
                            <div className={styles.actionCardTitle}>Invite Team Members</div>
                            <div className={styles.actionCardSub}>Give your staff access to the workspace</div>
                        </div>
                    </div>
                    <div className={styles.actionCard}>
                        <div className={styles.actionCardIcon}>C</div>
                        <div>
                            <div className={styles.actionCardTitle}>Ask a Question</div>
                            <div className={styles.actionCardSub}>Search your documents using plain language</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Documents Panel ────────────────────────────────────────────────────────────

type QueueStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
    id:      string;
    file:    File;
    status:  QueueStatus;
    error?:  string;
}

const MAX_FILE_MB = 50;

const DocumentsPanel = ({ docs, setDocs, usage, plan, onUpgrade }: {
    docs: DocFile[];
    setDocs: React.Dispatch<React.SetStateAction<DocFile[]>>;
    usage: Usage;
    plan: string;
    onUpgrade: () => void;
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging,         setDragging]         = useState(false);
    const [uploadError,      setUploadError]      = useState<string | null>(null);
    const [docLimitReached,  setDocLimitReached]  = useState(false);
    const [categories,       setCategories]       = useState<Category[]>([]);
    const [filterCat,        setFilterCat]        = useState<string>("all");
    const [confirmDelete,    setConfirmDelete]    = useState<DocFile | null>(null);
    const [deleting,         setDeleting]         = useState<string | null>(null);

    // Category modal state
    const [showCatModal, setShowCatModal] = useState(false);
    const [newCatName,   setNewCatName]   = useState("");
    const [catError,     setCatError]     = useState<string | null>(null);

    // Upload queue state
    const [queue,       setQueue]       = useState<QueueItem[]>([]);
    const [queueCatId,  setQueueCatId]  = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);

    const limit    = (PLAN_LIMITS[plan] ?? PLAN_LIMITS.free).docs;
    const usagePct = limit >= 9_999_999 ? 0 : Math.min(100, Math.round((usage.total_docs / limit) * 100));

    const queuedCount  = queue.filter(q => q.status === "queued").length;
    const doneCount    = queue.filter(q => q.status === "done").length;
    const errorCount   = queue.filter(q => q.status === "error").length;
    const remainingSlots = limit >= 9_999_999 ? Infinity : Math.max(0, limit - usage.total_docs);
    const batchWillExceed = queuedCount > remainingSlots;

    useEffect(() => {
        fetch("/categories", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                setCategories(d.categories ?? []);
                setQueueCatId(d.categories?.[0]?.category_id ?? "");
            })
            .catch(() => {});
    }, []);

    const addToQueue = (files: File[]) => {
        if (!files.length) return;
        const items: QueueItem[] = files.map(f => ({
            id:     `q-${Date.now()}-${Math.random()}`,
            file:   f,
            status: "queued",
        }));
        setQueue(prev => [...prev, ...items]);
    };

    const removeFromQueue = (id: string) => {
        if (isUploading) return;
        setQueue(prev => prev.filter(q => q.id !== id));
    };

    const clearQueue = () => {
        if (isUploading) return;
        setQueue([]);
    };

    const uploadOne = async (item: QueueItem, catId: string) => {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading" } : q));
        const kb   = item.file.size / 1024;
        const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
        const tmpId = `tmp-${item.id}`;
        const placeholder: DocFile = {
            doc_id: tmpId, name: item.file.name, size,
            size_bytes: item.file.size,
            uploaded:   new Date().toISOString().slice(0, 10),
            status:     "processing",
            category_id:   catId || null,
            category_name: categories.find(c => c.category_id === catId)?.name ?? null,
        };
        setDocs(prev => [placeholder, ...prev]);

        try {
            const formData = new FormData();
            formData.append("file", item.file);
            if (catId) formData.append("category_id", catId);
            const res  = await fetch("/upload", { method: "POST", headers: authHeaders(), body: formData });
            const data = await res.json();

            if (!res.ok) {
                setDocs(prev => prev.filter(d => d.doc_id !== tmpId));
                if (data.limit_reached === "docs") {
                    setDocLimitReached(true);
                    setQueue(prev => prev.map(q => q.id === item.id
                        ? { ...q, status: "error", error: "Document limit reached — upgrade your plan." }
                        : q
                    ));
                } else {
                    setQueue(prev => prev.map(q => q.id === item.id
                        ? { ...q, status: "error", error: data.error ?? "Upload failed." }
                        : q
                    ));
                }
            } else {
                const doc = data.doc as { doc_id: string };
                setDocs(prev => prev.map(d =>
                    d.doc_id === tmpId ? { ...d, doc_id: doc.doc_id, status: "ready" } : d
                ));
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done" } : q));
            }
        } catch {
            setDocs(prev => prev.filter(d => d.doc_id !== tmpId));
            setQueue(prev => prev.map(q => q.id === item.id
                ? { ...q, status: "error", error: "Network error — could not reach the server." }
                : q
            ));
        }
    };

    const startUpload = async () => {
        const toUpload = queue.filter(q => q.status === "queued");
        if (!toUpload.length || isUploading) return;
        setIsUploading(true);
        setUploadError(null);
        for (const item of toUpload) {
            await uploadOne(item, queueCatId);
        }
        setIsUploading(false);
    };

    const retryFile = async (item: QueueItem) => {
        if (isUploading) return;
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "queued", error: undefined } : q));
        setIsUploading(true);
        await uploadOne({ ...item, status: "queued" }, queueCatId);
        setIsUploading(false);
    };

    const handleDelete = async (doc: DocFile) => {
        setDeleting(doc.doc_id);
        setConfirmDelete(null);
        try {
            const res = await fetch(`/documents/${doc.doc_id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });
            if (res.ok) {
                setDocs(prev => prev.filter(d => d.doc_id !== doc.doc_id));
            } else {
                const d = await res.json();
                setUploadError(d.error ?? "Delete failed.");
            }
        } catch {
            setUploadError("Network error during delete.");
        }
        setDeleting(null);
    };

    const addCategory = async () => {
        const name = newCatName.trim();
        if (!name) return;
        try {
            const res = await fetch("/categories", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!res.ok) { setCatError(data.error ?? "Failed"); return; }
            setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewCatName("");
            setCatError(null);
            setShowCatModal(false);
        } catch {
            setCatError("Network error.");
        }
    };

    const visibleDocs = filterCat === "all"
        ? docs
        : docs.filter(d => d.category_id === filterCat);

    return (
        <div className={styles.panelContent}>
            {/* Doc limit upgrade banner */}
            {docLimitReached && (
                <div className={styles.limitBanner}>
                    <span>
                        🔒 Document limit reached ({usage.total_docs} / {limit} docs on your current plan).
                    </span>
                    <button className={styles.limitUpgradeBtn} onClick={onUpgrade}>Upgrade Plan →</button>
                </div>
            )}

            {/* Toolbar */}
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
                <select
                    className={styles.formSelect}
                    style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                    value={filterCat}
                    onChange={e => setFilterCat(e.target.value)}
                >
                    <option value="all">All categories</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </select>
                <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => setShowCatModal(true)}>
                    + Category
                </button>
                <button className={styles.btnPrimary} onClick={() => fileRef.current?.click()}>
                    + Upload Files
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    style={{ display: "none" }}
                    onChange={e => { addToQueue(Array.from(e.target.files ?? [])); e.target.value = ""; }}
                />
            </div>

            {/* Usage meter */}
            {limit !== Infinity && (
                <div className={styles.usageMeter}>
                    <div className={styles.usageMeterLabel}>
                        <span>{usage.total_docs} / {limit} documents used</span>
                        <span className={usagePct >= 80 ? styles.usageWarn : styles.usageMuted}>{usagePct}%</span>
                    </div>
                    <div className={styles.usageBar}>
                        <div
                            className={`${styles.usageBarFill} ${usagePct >= 80 ? styles.usageBarWarn : ""}`}
                            style={{ width: `${usagePct}%` }}
                        />
                    </div>
                    {usagePct >= 80 && (
                        <div className={styles.usageWarnText}>
                            ⚠ Approaching your plan limit.{" "}
                            <button
                                style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", padding: 0, fontSize: "inherit", fontWeight: 600 }}
                                onClick={onUpgrade}
                            >Upgrade plan →</button>
                        </div>
                    )}
                </div>
            )}

            {/* Drop zone */}
            <div
                className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addToQueue(Array.from(e.dataTransfer.files)); }}
                onClick={() => fileRef.current?.click()}
            >
                <div className={styles.dropIcon}>↑</div>
                <div className={styles.dropTitle}>Drag & drop files here, or click to browse</div>
                <div className={styles.dropSub}>PDF · Word · PowerPoint · Excel · Images · TXT &nbsp;·&nbsp; Up to {MAX_FILE_MB} MB per file</div>
            </div>

            {/* Upload Queue */}
            {queue.length > 0 && (
                <div className={styles.uploadQueue}>
                    {/* Queue header */}
                    <div className={styles.queueHeader}>
                        <div className={styles.queueSummary}>
                            <span>{queue.length} file{queue.length !== 1 ? "s" : ""} selected</span>
                            {doneCount  > 0 && <span className={styles.queueDone}> · {doneCount} done</span>}
                            {errorCount > 0 && <span className={styles.queueErr}> · {errorCount} failed</span>}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <select
                                className={styles.formSelect}
                                style={{ width: "auto", fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                                value={queueCatId}
                                onChange={e => setQueueCatId(e.target.value)}
                                disabled={isUploading}
                            >
                                <option value="">No category</option>
                                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                            </select>
                            {!isUploading && (
                                <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem" }} onClick={clearQueue}>
                                    Clear
                                </button>
                            )}
                            {queuedCount > 0 && (
                                <button
                                    className={styles.btnPrimary}
                                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.9rem" }}
                                    onClick={startUpload}
                                    disabled={isUploading || batchWillExceed}
                                >
                                    {isUploading ? "Uploading…" : `Upload ${queuedCount} file${queuedCount !== 1 ? "s" : ""}`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Limit warning */}
                    {batchWillExceed && (
                        <div className={styles.queueLimitWarn}>
                            ⚠ Only {remainingSlots} slot{remainingSlots !== 1 ? "s" : ""} remaining on your plan.
                            Remove {queuedCount - remainingSlots} file{queuedCount - remainingSlots !== 1 ? "s" : ""} or upgrade your plan.
                        </div>
                    )}

                    {/* Per-file rows */}
                    <div className={styles.queueList}>
                        {queue.map(item => {
                            const mb   = item.file.size / (1024 * 1024);
                            const size = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(item.file.size / 1024)} KB`;
                            const oversize = mb > MAX_FILE_MB;
                            return (
                                <div key={item.id} className={styles.queueRow}>
                                    <div className={styles.queueFileName}>
                                        {oversize && <span className={styles.queueSizeWarn} title={`File exceeds ${MAX_FILE_MB} MB`}>⚠</span>}
                                        <span className={styles.queueName}>{item.file.name}</span>
                                        <span className={styles.queueSize}>{size}</span>
                                    </div>
                                    <div className={styles.queueRowRight}>
                                        {item.status === "queued"    && <span className={styles.queueStatusQueued}>Queued</span>}
                                        {item.status === "uploading" && <span className={styles.queueStatusUploading}>Uploading…</span>}
                                        {item.status === "done"      && <span className={styles.queueStatusDone}>✓ Done</span>}
                                        {item.status === "error"     && (
                                            <span className={styles.queueStatusError} title={item.error}>✗ Failed</span>
                                        )}
                                        {item.status === "error" && !isUploading && (
                                            <button className={styles.queueRetry} onClick={() => retryFile(item)}>Retry</button>
                                        )}
                                        {(item.status === "queued" || item.status === "error") && !isUploading && (
                                            <button className={styles.queueRemove} onClick={() => removeFromQueue(item.id)}>✕</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error banner */}
            {uploadError && (
                <div className={styles.errorBanner}>
                    ⚠ {uploadError}
                    <button className={styles.errorDismiss} onClick={() => setUploadError(null)}>×</button>
                </div>
            )}

            {/* Documents table */}
            {visibleDocs.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Category</th>
                                <th>Size</th>
                                <th>Uploaded</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleDocs.map(doc => (
                                <tr key={doc.doc_id}>
                                    <td>
                                        <div className={styles.fileName}>
                                            <span className={styles.fileIcon}>F</span>
                                            {doc.name}
                                        </div>
                                    </td>
                                    <td className={styles.muted}>
                                        {doc.category_name
                                            ? <span className={styles.catChip}>{doc.category_name}</span>
                                            : <span className={styles.muted}>—</span>
                                        }
                                    </td>
                                    <td className={styles.muted}>{doc.size}</td>
                                    <td className={styles.muted}>{doc.uploaded}</td>
                                    <td>
                                        {doc.status === "ready"
                                            ? <span className={styles.badgeGreen}>Ready</span>
                                            : doc.status === "error"
                                            ? <span className={styles.badgeRed}>Error</span>
                                            : <span className={styles.badgeAmber}>Processing…</span>
                                        }
                                    </td>
                                    <td>
                                        <button
                                            className={styles.actionBtnDanger}
                                            disabled={deleting === doc.doc_id}
                                            onClick={() => setConfirmDelete(doc)}
                                        >
                                            {deleting === doc.doc_id ? "…" : "Remove"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete confirm modal */}
            {confirmDelete && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Remove Document</h3>
                        <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                            This will permanently delete <strong style={{ color: "var(--text-1)" }}>{confirmDelete.name}</strong> from the index and storage. This cannot be undone.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className={styles.btnDanger} onClick={() => handleDelete(confirmDelete)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* New category modal */}
            {showCatModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) { setShowCatModal(false); setCatError(null); } }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>New Category</h3>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Category Name</label>
                            <input
                                className={styles.formInput}
                                placeholder="e.g. Contracts, HR, Finance…"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addCategory()}
                                autoFocus
                            />
                        </div>
                        {catError && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {catError}</div>}
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => { setShowCatModal(false); setCatError(null); }}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={addCategory}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Permissions Modal ─────────────────────────────────────────────────────────

const PermissionsModal = ({ member, onClose }: { member: TeamMember; onClose: () => void }) => {
    const [categories,   setCategories]   = useState<Category[]>([]);
    const [granted,      setGranted]      = useState<Set<string>>(new Set());
    const [loading,      setLoading]      = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [saved,        setSaved]        = useState(false);

    // WhatsApp number state
    const [waNumber,   setWaNumber]   = useState(member.whatsapp_number ?? "");
    const [waSaving,   setWaSaving]   = useState(false);
    const [waMsg,      setWaMsg]      = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        Promise.all([
            fetch("/categories",                                  { headers: authHeaders() }).then(r => r.json()),
            fetch(`/team/${member.user_id}/permissions`,          { headers: authHeaders() }).then(r => r.json()),
        ]).then(([catData, permData]) => {
            setCategories(catData.categories ?? []);
            setGranted(new Set(permData.category_ids ?? []));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [member.user_id]);

    const toggle = (catId: string) => {
        setGranted(prev => {
            const next = new Set(prev);
            next.has(catId) ? next.delete(catId) : next.add(catId);
            return next;
        });
        setSaved(false);
    };

    const save = async () => {
        setSaving(true);
        await fetch(`/team/${member.user_id}/permissions`, {
            method: "PUT",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ category_ids: Array.from(granted) }),
        });
        setSaving(false);
        setSaved(true);
    };

    const saveWhatsApp = async () => {
        setWaSaving(true);
        setWaMsg(null);
        try {
            const res = await fetch(`/team/${member.user_id}/whatsapp`, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ whatsapp_number: waNumber.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setWaMsg({ ok: true, text: "WhatsApp number saved." });
            } else {
                setWaMsg({ ok: false, text: data.error ?? "Failed to save." });
            }
        } catch {
            setWaMsg({ ok: false, text: "Network error." });
        } finally {
            setWaSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal}>
                <h3 className={styles.modalTitle}>Settings — {member.name}</h3>
                <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                    Manage document access and WhatsApp configuration for this team member.
                </p>

                {/* Document Category Permissions */}
                <div style={{ marginBottom: "1.25rem" }}>
                    <div className={styles.settingsCardTitle} style={{ marginBottom: "0.6rem" }}>
                        Document Access
                    </div>
                    {loading ? (
                        <div style={{ padding: "1rem 0", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                    ) : categories.length === 0 ? (
                        <div style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>
                            No categories yet. Create categories in the Documents tab first.
                        </div>
                    ) : (
                        <div className={styles.permList}>
                            {categories.map(cat => (
                                <label key={cat.category_id} className={styles.permRow}>
                                    <input
                                        type="checkbox"
                                        className={styles.permCheck}
                                        checked={granted.has(cat.category_id)}
                                        onChange={() => toggle(cat.category_id)}
                                    />
                                    <span className={styles.permLabel}>{cat.name}</span>
                                    {granted.has(cat.category_id)
                                        ? <span className={styles.badgeGreen} style={{ marginLeft: "auto" }}>Access granted</span>
                                        : <span className={styles.badgeGray}  style={{ marginLeft: "auto" }}>No access</span>
                                    }
                                </label>
                            ))}
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
                        <span className={styles.permSummary}>{granted.size} of {categories.length} categories accessible</span>
                        <button className={styles.btnPrimary} onClick={save} disabled={saving || categories.length === 0} style={{ padding: "0.4rem 1rem" }}>
                            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Access"}
                        </button>
                    </div>
                </div>

                {/* WhatsApp Number */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.1rem" }}>
                    <div className={styles.settingsCardTitle} style={{ marginBottom: "0.5rem" }}>
                        WhatsApp Number
                    </div>
                    <p className={styles.muted} style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                        When set, this employee can query their documents directly from WhatsApp. Use E.164 format (e.g. +923001234567).
                    </p>
                    {waMsg && (
                        <div className={waMsg.ok ? styles.successBanner : styles.errorBanner} style={{ marginBottom: "0.6rem", fontSize: "0.8rem" }}>
                            {waMsg.text}
                        </div>
                    )}
                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                        <input
                            className={styles.formInput}
                            type="tel"
                            placeholder="+923001234567"
                            value={waNumber}
                            onChange={e => { setWaNumber(e.target.value); setWaMsg(null); }}
                            style={{ flex: 1 }}
                        />
                        <button className={styles.btnPrimary} onClick={saveWhatsApp} disabled={waSaving} style={{ padding: "0.4rem 1rem", whiteSpace: "nowrap" }}>
                            {waSaving ? "Saving…" : "Save"}
                        </button>
                        {waNumber && (
                            <button className={styles.btnGhost} onClick={() => { setWaNumber(""); setWaMsg(null); }} style={{ padding: "0.4rem 0.75rem" }}>
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button className={styles.btnGhost} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// ── Team Panel ────────────────────────────────────────────────────────────────

const TeamPanel = ({ team, setTeam, maxUsers, onUpgrade }: {
    team: TeamMember[];
    setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
    maxUsers: number;
    onUpgrade: () => void;
}) => {
    const [showModal,    setShowModal]    = useState(false);
    const [form,         setForm]         = useState({ name: "", email: "", role: "employee" });
    const [inviteError,  setInviteError]  = useState<string | null>(null);
    const [limitReached, setLimitReached] = useState(false);
    const [tempCreds,    setTempCreds]    = useState<{ email: string; password: string } | null>(null);
    const [removing,     setRemoving]     = useState<string | null>(null);
    const [permMember,   setPermMember]   = useState<TeamMember | null>(null);

    const atLimit = maxUsers > 0 && team.length >= maxUsers;

    const invite = async () => {
        if (!form.name.trim() || !form.email.trim()) { setInviteError("Name and email are required."); return; }
        try {
            const res = await fetch("/team", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.limit_reached === "users") { setLimitReached(true); setShowModal(false); return; }
                setInviteError(data.error ?? "Failed to invite."); return;
            }
            setTeam(prev => [...prev, {
                user_id: data.user_id,
                name: data.name,
                email: data.email,
                role: data.role,
                joined: new Date().toISOString().slice(0, 10),
            }]);
            setTempCreds({ email: data.email, password: data.temp_password });
            setShowModal(false);
            setForm({ name: "", email: "", role: "employee" });
            setInviteError(null);
        } catch {
            setInviteError("Network error.");
        }
    };

    const removeMember = async (member: TeamMember) => {
        setRemoving(member.user_id);
        try {
            await fetch(`/team/${member.user_id}`, { method: "DELETE", headers: authHeaders() });
            setTeam(prev => prev.filter(m => m.user_id !== member.user_id));
        } catch { /* silent */ }
        setRemoving(null);
    };

    return (
        <div className={styles.panelContent}>
            {/* Seat limit upgrade banner */}
            {(limitReached || atLimit) && (
                <div className={styles.limitBanner}>
                    <span>
                        🔒 You've reached your seat limit ({team.length} / {maxUsers} users on your current plan).
                    </span>
                    <button className={styles.limitUpgradeBtn} onClick={onUpgrade}>Upgrade Plan →</button>
                </div>
            )}

            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>
                    {team.length} / {maxUsers > 0 ? maxUsers : "∞"} seats used
                </span>
                <button
                    className={styles.btnPrimary}
                    onClick={() => { if (atLimit) { setLimitReached(true); return; } setShowModal(true); setInviteError(null); }}
                    title={atLimit ? "Seat limit reached — upgrade to add more members" : undefined}
                >
                    + Invite Member
                </button>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team.map(m => (
                            <tr key={m.user_id}>
                                <td><strong>{m.name}</strong></td>
                                <td className={styles.muted}>{m.email}</td>
                                <td>
                                    <span className={m.role === "org_owner" ? styles.badgeGold : styles.badgeGray}>
                                        {ROLE_LABELS[m.role] ?? m.role}
                                    </span>
                                </td>
                                <td className={styles.muted}>{fmtDate(m.joined)}</td>
                                <td style={{ display: "flex", gap: "0.5rem" }}>
                                    {m.role !== "org_owner" && (
                                        <>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => setPermMember(m)}
                                            >
                                                Permissions
                                            </button>
                                            <button
                                                className={styles.actionBtnDanger}
                                                disabled={removing === m.user_id}
                                                onClick={() => removeMember(m)}
                                            >
                                                {removing === m.user_id ? "…" : "Remove"}
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite modal */}
            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Invite Team Member</h3>
                        {inviteError && (
                            <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {inviteError}</div>
                        )}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Full Name</label>
                            <input className={styles.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Hassan Nasir" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email Address</label>
                            <input className={styles.formInput} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@yourfirm.com" type="email" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Role</label>
                            <select className={styles.formSelect} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="employee">Employee</option>
                                <option value="org_owner">Firm Owner</option>
                            </select>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={invite}>Send Invite</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permissions modal */}
            {permMember && (
                <PermissionsModal member={permMember} onClose={() => setPermMember(null)} />
            )}

            {/* Temp credentials modal */}
            {tempCreds && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setTempCreds(null); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Member Invited ✓</h3>
                        <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                            Share these temporary credentials with the new member. They will be prompted to set a new password on first login.
                        </p>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email</label>
                            <input className={styles.formInput} readOnly value={tempCreds.email} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Temporary Password</label>
                            <input className={styles.formInput} readOnly value={tempCreds.password} />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnPrimary} onClick={() => setTempCreds(null)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Subscription Panel ────────────────────────────────────────────────────────

// ── Invoices Panel ────────────────────────────────────────────────────────────

const InvoicesPanel = () => {
    const [invoices,     setInvoices]     = useState<Invoice[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [viewInvoice,  setViewInvoice]  = useState<Invoice | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [updating,     setUpdating]     = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        fetch("/invoices", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openInvoice = (inv: Invoice) => {
        fetch(`/invoices/${inv.invoice_id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setViewInvoice(d))
            .catch(() => {});
    };

    const updateStatus = async (inv: Invoice, status: string) => {
        setUpdating(inv.invoice_id);
        await fetch(`/invoices/${inv.invoice_id}`, {
            method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        setUpdating(null);
        load();
        if (viewInvoice?.invoice_id === inv.invoice_id) {
            setViewInvoice(v => v ? { ...v, status: status as Invoice["status"] } : v);
        }
    };

    const printInvoice = (inv: Invoice) => {
        const fees = inv.fees ?? [];
        const total = fees.reduce((s, f) => s + f.amount, 0);
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b8972e; padding-bottom: 20px; margin-bottom: 24px; }
  .brand { font-size: 1.4rem; font-weight: 700; color: #b8972e; }
  .invoice-meta { text-align: right; }
  .invoice-num { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; }
  .badge { display: inline-block; background: #b8972e22; color: #b8972e; border: 1px solid #b8972e55; border-radius: 100px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #888; font-weight: 600; margin-bottom: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f8f4e8; text-align: left; padding: 8px 10px; font-size: 0.78rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 0.875rem; }
  .amount { text-align: right; font-weight: 600; }
  .total-row td { font-weight: 700; font-size: 1rem; background: #f8f4e8; border-top: 2px solid #b8972e; }
  .footer { margin-top: 40px; font-size: 0.78rem; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 0; } button { display: none; } }
</style></head><body>
<div class="header">
  <div><div class="brand">Project Ease</div><div style="font-size:0.8rem;color:#888;margin-top:4px;">Legal Document Intelligence</div></div>
  <div class="invoice-meta">
    <div class="invoice-num">${inv.invoice_number}</div>
    <div style="margin:4px 0"><span class="badge">${inv.status}</span></div>
    <div style="font-size:0.8rem;color:#888;">Issued: ${inv.issued_date}</div>
    ${inv.due_date ? `<div style="font-size:0.8rem;color:#888;">Due: ${inv.due_date}</div>` : ""}
  </div>
</div>
<div class="grid2">
  <div class="section">
    <div class="section-title">Bill To</div>
    <div style="font-weight:600">${inv.client_name ?? "—"}</div>
    ${inv.client_email ? `<div style="font-size:0.83rem;color:#666">${inv.client_email}</div>` : ""}
    ${inv.client_phone ? `<div style="font-size:0.83rem;color:#666">${inv.client_phone}</div>` : ""}
  </div>
  <div class="section">
    <div class="section-title">Matter</div>
    <div style="font-weight:600">${inv.matter_title ?? "—"}</div>
    ${inv.case_number ? `<div style="font-size:0.83rem;color:#666">Case #${inv.case_number}</div>` : ""}
  </div>
</div>
<div class="section">
  <div class="section-title">Invoice Title</div>
  <div style="font-weight:600">${inv.title}</div>
</div>
<table>
  <thead><tr><th>Description</th><th>Type</th><th>Date</th><th class="amount">Amount (PKR)</th></tr></thead>
  <tbody>
    ${fees.map(f => `<tr><td>${f.description}</td><td>${f.fee_type}</td><td>${f.fee_date}</td><td class="amount">${f.amount.toLocaleString("en-PK")}</td></tr>`).join("")}
  </tbody>
  <tfoot>
    <tr class="total-row"><td colspan="3" style="text-align:right">Total</td><td class="amount">PKR ${total.toLocaleString("en-PK")}</td></tr>
  </tfoot>
</table>
${inv.notes ? `<div class="section" style="margin-top:20px"><div class="section-title">Notes</div><div>${inv.notes}</div></div>` : ""}
<div class="footer">Generated by Project Ease &nbsp;·&nbsp; projectease.ai</div>
</body></html>`;
        const w = window.open("", "_blank");
        if (!w) { alert("Please allow pop-ups to print invoices."); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    const filtered = statusFilter === "all" ? invoices : invoices.filter(i => i.status === statusFilter);

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {(["all","draft","sent","paid","cancelled"] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            style={{
                                padding: "0.28rem 0.75rem", borderRadius: 100, fontSize: "0.78rem", fontWeight: 600,
                                cursor: "pointer", textTransform: "capitalize",
                                border: statusFilter === s ? "1px solid var(--gold)" : "1px solid var(--border)",
                                background: statusFilter === s ? "var(--gold)" : "transparent",
                                color: statusFilter === s ? "#1a1200" : "var(--text-2)",
                            }}>{s}</button>
                    ))}
                    <span className={styles.muted} style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyHint}>
                    No invoices yet. Open a matter, add fees, then click "Generate Invoice".
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead><tr>
                            <th>Invoice #</th><th>Title</th><th>Matter</th><th>Client</th>
                            <th style={{ textAlign: "right" }}>Amount (PKR)</th>
                            <th>Issued</th><th>Status</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map(inv => (
                                <tr key={inv.invoice_id}>
                                    <td><button className={styles.linkBtn} onClick={() => openInvoice(inv)}>{inv.invoice_number}</button></td>
                                    <td>{inv.title}</td>
                                    <td className={styles.muted}>{inv.matter_title ?? "—"}</td>
                                    <td className={styles.muted}>{inv.client_name ?? "—"}</td>
                                    <td style={{ textAlign: "right", fontWeight: 600 }}>{inv.total_amount.toLocaleString("en-PK")}</td>
                                    <td className={styles.muted}>{inv.issued_date}</td>
                                    <td><span className={(styles as any)[INVOICE_STATUS_BADGE[inv.status] ?? "badgeGray"]} style={{ fontSize: "0.72rem" }}>{inv.status}</span></td>
                                    <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                        <button className={styles.actionBtn} onClick={() => openInvoice(inv)}>View</button>
                                        <button className={styles.actionBtn} onClick={() => printInvoice(inv)}>Print</button>
                                        {inv.status === "draft" && (
                                            <button className={styles.actionBtn} disabled={updating === inv.invoice_id}
                                                onClick={() => updateStatus(inv, "sent")}>Mark Sent</button>
                                        )}
                                        {inv.status === "sent" && (
                                            <button className={styles.actionBtn} disabled={updating === inv.invoice_id}
                                                onClick={() => updateStatus(inv, "paid")}>Mark Paid</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invoice detail modal */}
            {viewInvoice && (
                <div className={styles.overlay} onClick={() => setViewInvoice(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{viewInvoice.invoice_number}</div>
                                <div className={styles.muted} style={{ fontSize: "0.82rem" }}>{viewInvoice.title}</div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <span className={(styles as any)[INVOICE_STATUS_BADGE[viewInvoice.status] ?? "badgeGray"]}>{viewInvoice.status}</span>
                                <button className={styles.btnGhost} style={{ fontSize: "0.78rem" }} onClick={() => printInvoice(viewInvoice)}>🖨 Print</button>
                                <button className={styles.btnGhost} onClick={() => setViewInvoice(null)}>Close</button>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", fontSize: "0.83rem" }}>
                            <div><span className={styles.muted}>Client: </span>{viewInvoice.client_name ?? "—"}</div>
                            <div><span className={styles.muted}>Matter: </span>{viewInvoice.matter_title ?? "—"}</div>
                            <div><span className={styles.muted}>Issued: </span>{viewInvoice.issued_date}</div>
                            {viewInvoice.due_date && <div><span className={styles.muted}>Due: </span>{viewInvoice.due_date}</div>}
                        </div>

                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead><tr><th>Description</th><th>Type</th><th>Date</th><th style={{ textAlign: "right" }}>PKR</th></tr></thead>
                                <tbody>
                                    {(viewInvoice.fees ?? []).map(f => (
                                        <tr key={f.fee_id}>
                                            <td>{f.description}</td>
                                            <td className={styles.muted}>{f.fee_type}</td>
                                            <td className={styles.muted}>{f.fee_date}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>{f.amount.toLocaleString("en-PK")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--gold)" }}>
                                            PKR {viewInvoice.total_amount.toLocaleString("en-PK")}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className={styles.modalActions} style={{ marginTop: "1rem", justifyContent: "flex-end" }}>
                            {viewInvoice.status === "draft" && <button className={styles.btnGhost} onClick={() => updateStatus(viewInvoice, "sent")}>Mark Sent</button>}
                            {viewInvoice.status === "sent"  && <button className={styles.btnPrimary} onClick={() => updateStatus(viewInvoice, "paid")}>Mark Paid</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Court Calendar Panel ──────────────────────────────────────────────────────

interface Hearing {
    hearing_id:   string;
    matter_id:    string | null;
    title:        string;
    hearing_date: string;   // YYYY-MM-DD
    hearing_time: string | null;
    court_name:   string | null;
    judge_name:   string | null;
    notes:        string | null;
    wa_reminder:  number;
    matter_title: string | null;
    case_number:  string | null;
}

interface Deadline {
    deadline_id:    string;
    matter_id:      string | null;
    title:          string;
    due_date:       string;   // YYYY-MM-DD
    deadline_type:  string;
    notes:          string | null;
    is_completed:   number;
    wa_reminder:    number;
    matter_title:   string | null;
    case_number:    string | null;
}

type CalEvent = ({ kind: "hearing" } & Hearing) | ({ kind: "deadline" } & Deadline);

const DEADLINE_TYPES = ["Filing", "Response", "Appeal", "Service", "Payment", "Other"] as const;

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DOW    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function isoDate(y: number, m: number, d: number): string {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function daysInMonth(y: number, m: number): number {
    return new Date(y, m + 1, 0).getDate();
}

function firstDow(y: number, m: number): number {
    return new Date(y, m, 1).getDay();
}

const CalendarPanel = () => {
    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [hearings,  setHearings]  = useState<Hearing[]>([]);
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [matters,   setMatters]   = useState<{ matter_id: string; title: string }[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [selected,  setSelected]  = useState<string | null>(null);  // YYYY-MM-DD

    // Modal state — shared for add/edit
    type ModalMode = "add-hearing" | "add-deadline" | "edit-hearing" | "edit-deadline" | null;
    const [modal,     setModal]     = useState<ModalMode>(null);
    const [editTarget, setEditTarget] = useState<Hearing | Deadline | null>(null);

    // Form fields
    const [fTitle,     setFTitle]     = useState("");
    const [fDate,      setFDate]      = useState("");
    const [fTime,      setFTime]      = useState("");
    const [fCourt,     setFCourt]     = useState("");
    const [fJudge,     setFJudge]     = useState("");
    const [fDLType,    setFDLType]    = useState<string>("Filing");
    const [fMatter,    setFMatter]    = useState("");
    const [fNotes,     setFNotes]     = useState("");
    const [fWA,        setFWA]        = useState(false);
    const [fSaving,    setFSaving]    = useState(false);
    const [fErr,       setFErr]       = useState("");

    const fromDate = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-01`;
    const toDate   = isoDate(viewYear, viewMonth, daysInMonth(viewYear, viewMonth));

    const load = () => {
        setLoading(true);
        Promise.all([
            fetch(`/hearings?from_date=${fromDate}&to_date=${toDate}`, { headers: authHeaders() }).then(r => r.json()),
            fetch(`/deadlines?from_date=${fromDate}&to_date=${toDate}`, { headers: authHeaders() }).then(r => r.json()),
            fetch("/matters", { headers: authHeaders() }).then(r => r.json()),
        ]).then(([h, d, m]) => {
            setHearings(Array.isArray(h) ? h : []);
            setDeadlines(Array.isArray(d) ? d : []);
            setMatters(Array.isArray(m) ? m.map((x: any) => ({ matter_id: x.matter_id, title: x.title })) : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, [viewYear, viewMonth]);

    // Map date → events
    const eventsByDate: Record<string, CalEvent[]> = {};
    hearings.forEach(h => {
        const k = h.hearing_date;
        eventsByDate[k] = [...(eventsByDate[k] ?? []), { kind: "hearing", ...h }];
    });
    deadlines.forEach(d => {
        const k = d.due_date;
        eventsByDate[k] = [...(eventsByDate[k] ?? []), { kind: "deadline", ...d }];
    });

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
        setSelected(null);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
        setSelected(null);
    };

    const openAdd = (kind: "hearing" | "deadline", date?: string) => {
        setFTitle(""); setFDate(date ?? ""); setFTime(""); setFCourt(""); setFJudge("");
        setFDLType("Filing"); setFMatter(""); setFNotes(""); setFWA(false);
        setFErr(""); setEditTarget(null);
        setModal(kind === "hearing" ? "add-hearing" : "add-deadline");
    };

    const openEdit = (ev: CalEvent) => {
        setEditTarget(ev);
        setFErr(""); setFSaving(false);
        if (ev.kind === "hearing") {
            setFTitle(ev.title); setFDate(ev.hearing_date); setFTime(ev.hearing_time ?? "");
            setFCourt(ev.court_name ?? ""); setFJudge(ev.judge_name ?? "");
            setFMatter(ev.matter_id ?? ""); setFNotes(ev.notes ?? "");
            setFWA(!!ev.wa_reminder); setModal("edit-hearing");
        } else {
            setFTitle(ev.title); setFDate(ev.due_date); setFDLType(ev.deadline_type);
            setFMatter(ev.matter_id ?? ""); setFNotes(ev.notes ?? "");
            setFWA(!!ev.wa_reminder); setModal("edit-deadline");
        }
    };

    const closeModal = () => { setModal(null); setEditTarget(null); };

    const saveHearing = async () => {
        if (!fTitle.trim() || !fDate) { setFErr("Title and date are required."); return; }
        setFSaving(true); setFErr("");
        const body = {
            title: fTitle.trim(), hearing_date: fDate,
            hearing_time: fTime || undefined, court_name: fCourt || undefined,
            judge_name: fJudge || undefined, matter_id: fMatter || undefined,
            notes: fNotes || undefined, wa_reminder: fWA,
        };
        try {
            let r: Response;
            if (modal === "edit-hearing" && editTarget) {
                r = await fetch(`/hearings/${(editTarget as Hearing).hearing_id}`, {
                    method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                r = await fetch("/hearings", {
                    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }
            if (!r.ok) { const d = await r.json().catch(() => ({})); setFErr(d.error ?? "Save failed."); }
            else { closeModal(); load(); }
        } catch { setFErr("Network error."); }
        finally { setFSaving(false); }
    };

    const saveDeadline = async () => {
        if (!fTitle.trim() || !fDate) { setFErr("Title and date are required."); return; }
        setFSaving(true); setFErr("");
        const body = {
            title: fTitle.trim(), due_date: fDate, deadline_type: fDLType,
            matter_id: fMatter || undefined, notes: fNotes || undefined, wa_reminder: fWA,
        };
        try {
            let r: Response;
            if (modal === "edit-deadline" && editTarget) {
                r = await fetch(`/deadlines/${(editTarget as Deadline).deadline_id}`, {
                    method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                r = await fetch("/deadlines", {
                    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }
            if (!r.ok) { const d = await r.json().catch(() => ({})); setFErr(d.error ?? "Save failed."); }
            else { closeModal(); load(); }
        } catch { setFErr("Network error."); }
        finally { setFSaving(false); }
    };

    const toggleComplete = async (dl: Deadline) => {
        await fetch(`/deadlines/${dl.deadline_id}`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ is_completed: dl.is_completed ? 0 : 1 }),
        });
        load();
    };

    const deleteEvent = async (ev: CalEvent) => {
        if (!confirm(`Delete "${ev.title}"?`)) return;
        if (ev.kind === "hearing") {
            await fetch(`/hearings/${ev.hearing_id}`, { method: "DELETE", headers: authHeaders() });
        } else {
            await fetch(`/deadlines/${ev.deadline_id}`, { method: "DELETE", headers: authHeaders() });
        }
        load();
    };

    // Upcoming events across the whole loaded month, sorted by date
    const allEvents: CalEvent[] = [
        ...hearings.map(h => ({ kind: "hearing" as const, ...h })),
        ...deadlines.map(d => ({ kind: "deadline" as const, ...d })),
    ].sort((a, b) => {
        const da = a.kind === "hearing" ? a.hearing_date : a.due_date;
        const db = b.kind === "hearing" ? b.hearing_date : b.due_date;
        return da.localeCompare(db);
    });

    const selectedEvents = selected ? (eventsByDate[selected] ?? []) : [];
    const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

    // Calendar grid
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDow  = firstDow(viewYear, viewMonth);
    const cells: (number | null)[] = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const isHearing = (ev: CalEvent): ev is { kind: "hearing" } & Hearing => ev.kind === "hearing";

    return (
        <div className={styles.panelContent}>
            <div className={styles.calLayout}>

                {/* ── Left: Month grid ── */}
                <div className={styles.calMain}>
                    {/* Month nav */}
                    <div className={styles.calMonthNav}>
                        <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
                        <span className={styles.calMonthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
                        <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
                        <button className={styles.btnGhost} style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelected(todayStr); }}>
                            Today
                        </button>
                    </div>

                    {/* Day-of-week header */}
                    <div className={styles.calGrid}>
                        {DOW.map(d => (
                            <div key={d} className={styles.calDowCell}>{d}</div>
                        ))}

                        {loading ? (
                            <div style={{ gridColumn: "1/-1", padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                        ) : cells.map((day, idx) => {
                            if (day === null) return <div key={`e${idx}`} className={styles.calEmptyCell} />;
                            const dateStr = isoDate(viewYear, viewMonth, day);
                            const evs     = eventsByDate[dateStr] ?? [];
                            const isToday = dateStr === todayStr;
                            const isSel   = dateStr === selected;
                            return (
                                <div
                                    key={dateStr}
                                    className={[
                                        styles.calDayCell,
                                        isToday ? styles.calToday : "",
                                        isSel   ? styles.calSelected : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => setSelected(isSel ? null : dateStr)}
                                >
                                    <span className={styles.calDayNum}>{day}</span>
                                    {evs.length > 0 && (
                                        <div className={styles.calDots}>
                                            {evs.slice(0, 3).map((ev, i) => (
                                                <span
                                                    key={i}
                                                    className={isHearing(ev) ? styles.calDotHearing : styles.calDotDeadline}
                                                    style={isHearing(ev) ? {} : { opacity: ev.is_completed ? 0.35 : 1 }}
                                                />
                                            ))}
                                            {evs.length > 3 && <span className={styles.calDotMore}>+{evs.length-3}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className={styles.calLegend}>
                        <span className={styles.calDotHearing} /> Hearing
                        <span className={styles.calDotDeadline} style={{ marginLeft: "0.75rem" }} /> Deadline
                    </div>
                </div>

                {/* ── Right: Sidebar ── */}
                <div className={styles.calSidebar}>
                    <div className={styles.calSidebarHeader}>
                        <span className={styles.calSidebarTitle}>
                            {selected
                                ? new Date(selected + "T00:00:00").toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })
                                : "Upcoming This Month"}
                        </span>
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                            <button className={styles.btnPrimary} style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                                onClick={() => openAdd("hearing", selected ?? undefined)}>
                                + Hearing
                            </button>
                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                                onClick={() => openAdd("deadline", selected ?? undefined)}>
                                + Deadline
                            </button>
                        </div>
                    </div>

                    <div className={styles.calEventList}>
                        {(selected ? selectedEvents : allEvents).length === 0 ? (
                            <div className={styles.emptyHint}>
                                {selected ? "No events on this day." : "No events this month."}
                            </div>
                        ) : (
                            (selected ? selectedEvents : allEvents).map((ev, i) => {
                                const dateLabel = isHearing(ev) ? ev.hearing_date : ev.due_date;
                                const timeLabel = isHearing(ev) && ev.hearing_time ? ` · ${ev.hearing_time}` : "";
                                const subLabel  = isHearing(ev)
                                    ? ev.court_name ?? ev.matter_title ?? ""
                                    : `${ev.deadline_type}${ev.matter_title ? " · " + ev.matter_title : ""}`;
                                return (
                                    <div key={i} className={[
                                        styles.calEventCard,
                                        isHearing(ev) ? styles.calEventHearing : styles.calEventDeadline,
                                        !isHearing(ev) && ev.is_completed ? styles.calEventCompleted : "",
                                    ].filter(Boolean).join(" ")}>
                                        <div className={styles.calEventTop}>
                                            <div className={styles.calEventTitle}>
                                                {!isHearing(ev) && ev.is_completed && <span style={{ textDecoration: "line-through", opacity: 0.5 }}>{ev.title}</span>}
                                                {(isHearing(ev) || !ev.is_completed) && ev.title}
                                            </div>
                                            <div className={styles.calEventActions}>
                                                {!isHearing(ev) && (
                                                    <button className={styles.calCheckBtn}
                                                        title={ev.is_completed ? "Mark incomplete" : "Mark complete"}
                                                        onClick={() => toggleComplete(ev as Deadline)}>
                                                        {ev.is_completed ? "↩" : "✓"}
                                                    </button>
                                                )}
                                                <button className={styles.calEditBtn} onClick={() => openEdit(ev)}>✎</button>
                                                <button className={styles.calDelBtn} onClick={() => deleteEvent(ev)}>✕</button>
                                            </div>
                                        </div>
                                        <div className={styles.calEventMeta}>
                                            {!selected && <span>{dateLabel}{timeLabel}</span>}
                                            {selected && isHearing(ev) && ev.hearing_time && <span>{ev.hearing_time}</span>}
                                            {subLabel && <span>{subLabel}</span>}
                                            {ev.wa_reminder === 1 && <span className={styles.calWABadge}>📲 WA</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Add/Edit Modal ── */}
            {modal && (
                <div className={styles.overlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className={styles.modalTitle}>
                            {modal === "add-hearing"   && "Add Hearing"}
                            {modal === "edit-hearing"  && "Edit Hearing"}
                            {modal === "add-deadline"  && "Add Deadline"}
                            {modal === "edit-deadline" && "Edit Deadline"}
                        </div>

                        {/* Title */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Title *</label>
                            <input className={styles.formInput} value={fTitle} onChange={e => setFTitle(e.target.value)}
                                placeholder={modal?.includes("hearing") ? "e.g. First Hearing — ABC v XYZ" : "e.g. File written statement"} />
                        </div>

                        {/* Date + Time / Deadline type */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{modal?.includes("hearing") ? "Hearing Date *" : "Due Date *"}</label>
                                <input type="date" className={styles.formInput} value={fDate} onChange={e => setFDate(e.target.value)} />
                            </div>
                            {modal?.includes("hearing") ? (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Time</label>
                                    <input type="time" className={styles.formInput} value={fTime} onChange={e => setFTime(e.target.value)} />
                                </div>
                            ) : (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formSelect} value={fDLType} onChange={e => setFDLType(e.target.value)}>
                                        {DEADLINE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Court + Judge (hearing only) */}
                        {modal?.includes("hearing") && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Court</label>
                                    <input className={styles.formInput} value={fCourt} onChange={e => setFCourt(e.target.value)} placeholder="e.g. Lahore High Court" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Judge</label>
                                    <input className={styles.formInput} value={fJudge} onChange={e => setFJudge(e.target.value)} placeholder="Justice Name" />
                                </div>
                            </div>
                        )}

                        {/* Linked matter */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Linked Matter</label>
                            <select className={styles.formSelect} value={fMatter} onChange={e => setFMatter(e.target.value)}>
                                <option value="">— None —</option>
                                {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title}</option>)}
                            </select>
                        </div>

                        {/* Notes */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Notes</label>
                            <textarea className={styles.formTextarea} value={fNotes} onChange={e => setFNotes(e.target.value)}
                                placeholder="Optional notes for this event" rows={2} />
                        </div>

                        {/* WhatsApp reminder */}
                        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: "1rem", cursor: "pointer" }}>
                            <input type="checkbox" checked={fWA} onChange={e => setFWA(e.target.checked)} />
                            Send WhatsApp reminder 24 hours before
                        </label>

                        {fErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{fErr}</div>}

                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={closeModal} disabled={fSaving}>Cancel</button>
                            <button className={styles.btnPrimary} disabled={fSaving}
                                onClick={modal?.includes("hearing") ? saveHearing : saveDeadline}>
                                {fSaving ? "Saving…" : (modal?.startsWith("edit") ? "Save Changes" : "Add")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Subscription helpers ──────────────────────────────────────────────────────

interface PlanTierConfig {
    max_docs:      number;
    max_users:     number;
    max_bytes:     number;
    max_searches:  number | null;
    trial_days?:   number;
    price_monthly: number;
    price_annual:  number;
    features:      string[];
}

interface PlanConfigResponse {
    plans:             Record<string, PlanTierConfig>;
    current_plan:      string;
    bank: {
        name:    string;
        account: string;
        iban:    string;
        title:   string;
    };
    support_whatsapp:  string;
}

const TIER_ORDER = ["trial", "starter", "pro", "enterprise"] as const;

const TIER_LABELS: Record<string, string> = {
    trial:      "Trial",
    starter:    "Starter",
    pro:        "Pro",
    enterprise: "Enterprise",
};

const SubscriptionPanel = ({
    plan, usage, maxDocs, maxUsers, teamCount,
}: {
    plan:      string;
    usage:     Usage;
    maxDocs:   number;
    maxUsers:  number;
    teamCount: number;
}) => {
    const [config,        setConfig]        = useState<PlanConfigResponse | null>(null);
    const [trialEndsAt,   setTrialEndsAt]   = useState<string | null>(null);
    const [pendingPlan,   setPendingPlan]   = useState<string | null>(null);
    const [pendingAt,     setPendingAt]     = useState<string | null>(null);
    const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
    const [payRef,        setPayRef]        = useState("");
    const [notes,         setNotes]         = useState("");
    const [submitting,    setSubmitting]    = useState(false);
    const [submitDone,    setSubmitDone]    = useState(false);
    const [submitErr,     setSubmitErr]     = useState("");

    useEffect(() => {
        fetch("/plan-config", { headers: authHeaders() })
            .then(r => r.json())
            .then((d: PlanConfigResponse) => setConfig(d))
            .catch(() => {});
        fetch("/org", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                if (d.trial_ends_at)          setTrialEndsAt(d.trial_ends_at);
                if (d.requested_plan)         setPendingPlan(d.requested_plan);
                if (d.upgrade_requested_at)   setPendingAt(d.upgrade_requested_at);
            })
            .catch(() => {});
    }, []);

    // Trial countdown
    const trialDaysLeft = (() => {
        if (!trialEndsAt) return null;
        const diff = new Date(trialEndsAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / 86_400_000));
    })();

    // Usage calculations
    const unlimited = maxDocs >= 9_999_999;
    const maxStorageBytes = config?.plans[plan]?.max_bytes ?? 0;
    const unlimitedStorage = maxStorageBytes >= 25_000_000_000 * 0.99;

    const docPct  = unlimited ? 0 : Math.min(100, Math.round((usage.total_docs  / maxDocs)   * 100));
    const userPct = unlimited ? 0 : Math.min(100, Math.round((teamCount         / maxUsers)   * 100));
    const stPct   = unlimitedStorage ? 0 : maxStorageBytes > 0
        ? Math.min(100, Math.round((usage.total_bytes / maxStorageBytes) * 100))
        : 0;

    const openUpgrade = (tier: string) => {
        setUpgradeTarget(tier);
        setPayRef(""); setNotes(""); setSubmitDone(false); setSubmitErr("");
    };
    const closeModal = () => setUpgradeTarget(null);

    const submitUpgrade = async () => {
        if (!payRef.trim()) { setSubmitErr("Please enter your payment / transaction reference."); return; }
        setSubmitting(true); setSubmitErr("");
        try {
            const r = await fetch("/upgrade-request", {
                method:  "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body:    JSON.stringify({ requested_plan: upgradeTarget, payment_ref: payRef.trim(), notes: notes.trim() || undefined }),
            });
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                setSubmitErr(d.error ?? "Something went wrong. Please try again.");
            } else {
                setSubmitDone(true);
                setPendingPlan(upgradeTarget);
                setPendingAt(new Date().toISOString());
            }
        } catch {
            setSubmitErr("Network error — please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.panelContent}>

            {/* Trial countdown banner */}
            {plan === "trial" && trialDaysLeft !== null && (
                <div className={`${styles.trialBanner}${trialDaysLeft <= 3 ? " " + styles.trialBannerUrgent : ""}`}>
                    <span className={styles.trialBannerIcon}>⏳</span>
                    <span className={styles.trialBannerText}>
                        {trialDaysLeft === 0
                            ? <><strong>Your trial has ended.</strong> Upgrade now to continue using Project Ease.</>
                            : <><strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left on your trial.</strong>{" "}
                               Upgrade before it expires to keep your documents and access.</>}
                    </span>
                </div>
            )}

            {/* Pending upgrade notice */}
            {pendingPlan && (
                <div className={styles.upgradePendingBanner}>
                    <span className={styles.pendingBannerIcon}>🕐</span>
                    <div className={styles.pendingBannerBody}>
                        <div className={styles.pendingBannerTitle}>
                            Upgrade to {TIER_LABELS[pendingPlan] ?? pendingPlan} — Under Review
                        </div>
                        <div className={styles.pendingBannerSub}>
                            Your payment is being verified. We'll activate your new plan within 1–2 business hours
                            {pendingAt ? ` (submitted ${new Date(pendingAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })})` : ""}.
                            Questions? WhatsApp us at {config?.support_whatsapp ?? "our support number"}.
                        </div>
                    </div>
                </div>
            )}

            {/* ── Usage ── */}
            <div className={styles.subUsageCard}>
                <div className={styles.subUsageTitle}>Current Usage — {TIER_LABELS[plan] ?? plan} Plan</div>
                <div className={styles.subUsageGrid}>

                    {/* Documents */}
                    <div className={styles.subUsageItem}>
                        <div className={styles.subUsageLabel}>
                            <span>Documents</span>
                            <span className={styles.subUsageValue}>
                                {unlimited ? `${usage.total_docs} / ∞` : `${usage.total_docs} / ${maxDocs}`}
                            </span>
                        </div>
                        {!unlimited && (
                            <div className={styles.usageBar}>
                                <div
                                    className={`${styles.usageBarFill}${docPct >= 80 ? " " + styles.usageBarWarn : ""}`}
                                    style={{ width: `${docPct}%` }}
                                />
                            </div>
                        )}
                        {docPct >= 80 && !unlimited && (
                            <div className={styles.subUpgradeHint}>
                                {docPct >= 100 ? "Limit reached — upgrade to upload more." : `${docPct}% used — consider upgrading.`}
                            </div>
                        )}
                    </div>

                    {/* Team */}
                    <div className={styles.subUsageItem}>
                        <div className={styles.subUsageLabel}>
                            <span>Team Members</span>
                            <span className={styles.subUsageValue}>
                                {unlimited ? `${teamCount} / ∞` : `${teamCount} / ${maxUsers}`}
                            </span>
                        </div>
                        {!unlimited && (
                            <div className={styles.usageBar}>
                                <div
                                    className={`${styles.usageBarFill}${userPct >= 80 ? " " + styles.usageBarWarn : ""}`}
                                    style={{ width: `${userPct}%` }}
                                />
                            </div>
                        )}
                        {userPct >= 80 && !unlimited && (
                            <div className={styles.subUpgradeHint}>
                                {userPct >= 100 ? "Limit reached — upgrade to invite more." : `${userPct}% used — consider upgrading.`}
                            </div>
                        )}
                    </div>

                    {/* Storage */}
                    <div className={styles.subUsageItem}>
                        <div className={styles.subUsageLabel}>
                            <span>Storage</span>
                            <span className={styles.subUsageValue}>{fmtBytes(usage.total_bytes)}</span>
                        </div>
                        {!unlimitedStorage && maxStorageBytes > 0 && (
                            <div className={styles.usageBar}>
                                <div
                                    className={`${styles.usageBarFill}${stPct >= 80 ? " " + styles.usageBarWarn : ""}`}
                                    style={{ width: `${stPct}%` }}
                                />
                            </div>
                        )}
                        {stPct >= 80 && !unlimitedStorage && (
                            <div className={styles.subUpgradeHint}>
                                {stPct >= 100 ? "Storage full — upgrade for more space." : `${stPct}% used.`}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* ── Plan comparison cards ── */}
            <div className={styles.planTierGrid}>
                {TIER_ORDER.map(tier => {
                    const cfg         = config?.plans[tier];
                    const isCurrent   = tier === plan;
                    const isPopular   = tier === "pro";
                    const isUnlimited = (cfg?.max_docs ?? 0) >= 9_999_999;
                    const hasPending  = !!pendingPlan;

                    // Can upgrade: must be higher tier and no pending request
                    const tierIdx    = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
                    const currentIdx = TIER_ORDER.indexOf(plan as typeof TIER_ORDER[number]);
                    const canUpgrade = !isCurrent && tierIdx > currentIdx && !hasPending;

                    return (
                        <div
                            key={tier}
                            className={[
                                styles.planTierCard,
                                isCurrent ? styles.planTierCardCurrent : "",
                                isPopular && !isCurrent ? styles.planTierCardPopular : "",
                            ].filter(Boolean).join(" ")}
                        >
                            {isCurrent && <div className={styles.planTierCurrentBadge}>Current Plan</div>}
                            {isPopular && !isCurrent && <div className={styles.planTierPopularBadge}>Most Popular</div>}

                            <div className={styles.planTierName}>{TIER_LABELS[tier]}</div>

                            <div className={styles.planTierPrice}>
                                {cfg ? fmtPKR(cfg.price_monthly) : "—"}
                            </div>
                            <div className={styles.planTierPriceSub}>
                                {cfg && cfg.price_monthly > 0 ? "per month" : tier === "trial" ? "14-day trial" : ""}
                                {cfg && cfg.price_annual > 0 ? ` · PKR ${cfg.price_annual.toLocaleString("en-PK")}/yr` : ""}
                            </div>

                            <div className={styles.planTierDivider} />

                            <div className={styles.planTierLimits}>
                                {isUnlimited
                                    ? "Unlimited docs · Unlimited users"
                                    : `${cfg?.max_docs ?? "—"} docs · ${cfg?.max_users ?? "—"} users`}
                                <br />
                                {cfg && cfg.max_bytes >= 25_000_000_000 * 0.99
                                    ? "25 GB storage"
                                    : cfg ? fmtBytes(cfg.max_bytes) + " storage" : ""}
                                {cfg?.max_searches != null ? ` · ${cfg.max_searches} searches` : ""}
                            </div>

                            {cfg?.features && cfg.features.length > 0 && (
                                <ul className={styles.planTierFeatureList}>
                                    {cfg.features.map((f, i) => (
                                        <li key={i} className={styles.planTierFeatureItem}>{f}</li>
                                    ))}
                                </ul>
                            )}

                            {tier === "enterprise" ? (
                                <button
                                    className={`${styles.planTierBtn} ${styles.planTierBtnGhost}`}
                                    onClick={() => window.open("mailto:support@projectease.ai?subject=Enterprise Plan Inquiry", "_blank")}
                                >
                                    Contact Sales
                                </button>
                            ) : isCurrent ? (
                                <button className={styles.planTierBtn} disabled>
                                    Active
                                </button>
                            ) : canUpgrade ? (
                                <button className={styles.planTierBtn} onClick={() => openUpgrade(tier)}>
                                    Upgrade to {TIER_LABELS[tier]}
                                </button>
                            ) : hasPending ? (
                                <button className={styles.planTierBtn} disabled title="An upgrade request is already pending">
                                    Request Pending
                                </button>
                            ) : (
                                <button className={styles.planTierBtn} disabled>
                                    {tierIdx < currentIdx ? "Downgrade not available" : "Current"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Upgrade modal ── */}
            {upgradeTarget && (
                <div className={styles.overlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>

                        {submitDone ? (
                            <>
                                <div className={styles.upgradeSuccessBanner}>
                                    <div className={styles.upgradeSuccessTitle}>✓ Upgrade Request Submitted</div>
                                    Your request to upgrade to <strong>{TIER_LABELS[upgradeTarget]}</strong> has been received.
                                    We will verify your payment and activate your plan within 1–2 business hours (Mon–Sat, 9 AM–6 PM PKT).
                                    {config?.support_whatsapp && (
                                        <> Questions? WhatsApp us at <strong>{config.support_whatsapp}</strong>.</>
                                    )}
                                </div>
                                <div className={styles.modalActions} style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
                                    <button className={styles.btnPrimary} onClick={closeModal}>Done</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.upgradeModalTitle}>
                                    Upgrade to {TIER_LABELS[upgradeTarget]} Plan
                                </div>
                                <div className={styles.upgradeModalSub}>
                                    Transfer the subscription amount to our bank account, then enter your transaction
                                    reference below. We'll verify and activate your plan within 1–2 business hours.
                                </div>

                                {/* Bank details */}
                                {config?.bank && (
                                    <div className={styles.bankCard}>
                                        <div className={styles.bankCardTitle}>Bank Transfer Details</div>
                                        {[
                                            ["Bank",    config.bank.name],
                                            ["Account", config.bank.account],
                                            ["IBAN",    config.bank.iban],
                                            ["Title",   config.bank.title],
                                        ].map(([label, val]) => val && val !== "" && (
                                            <div key={label} className={styles.bankRow}>
                                                <span className={styles.bankLabel}>{label}</span>
                                                <span className={styles.bankValue}>{val}</span>
                                            </div>
                                        ))}
                                        {config?.plans[upgradeTarget] && (
                                            <div className={styles.bankRow} style={{ marginTop: "0.4rem", borderTop: "1px solid var(--border)", paddingTop: "0.4rem" }}>
                                                <span className={styles.bankLabel}>Amount</span>
                                                <span className={styles.bankValue} style={{ color: "var(--gold)" }}>
                                                    {fmtPKR(config.plans[upgradeTarget].price_monthly)}/month
                                                    {config.plans[upgradeTarget].price_annual > 0 && (
                                                        <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: "0.75rem" }}>
                                                            {" "}· or PKR {config.plans[upgradeTarget].price_annual.toLocaleString("en-PK")}/yr
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Payment reference */}
                                <div className={styles.upgradeFormSection}>
                                    <label className={styles.upgradeFormLabel}>
                                        Transaction / Payment Reference <span style={{ color: "var(--danger, #c94040)" }}>*</span>
                                    </label>
                                    <input
                                        className={styles.upgradeFormInput}
                                        placeholder="e.g. TRX-20240723-1234 or screenshot reference"
                                        value={payRef}
                                        onChange={e => setPayRef(e.target.value)}
                                    />
                                </div>

                                {/* Notes */}
                                <div className={styles.upgradeFormSection}>
                                    <label className={styles.upgradeFormLabel}>Notes (optional)</label>
                                    <textarea
                                        className={`${styles.upgradeFormInput} ${styles.upgradeFormTextarea}`}
                                        placeholder="Any additional info for our team"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>

                                {submitErr && (
                                    <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.75rem" }}>
                                        {submitErr}
                                    </div>
                                )}

                                <div className={styles.modalActions}>
                                    <button className={styles.btnGhost} onClick={closeModal} disabled={submitting}>Cancel</button>
                                    <button className={styles.btnPrimary} onClick={submitUpgrade} disabled={submitting}>
                                        {submitting ? "Submitting…" : "Submit Upgrade Request"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Settings Panel ────────────────────────────────────────────────────────────

const INDUSTRIES = ["Law Practice", "CA / Accounting", "Logistics", "Financial Services", "Healthcare", "Real Estate", "Other"];

const PK_CITIES = [
    "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
    "Hyderabad", "Abbottabad", "Bahawalpur", "Sukkur", "Dera Ghazi Khan",
];

const PRACTICE_AREAS = [
    "Corporate & Commercial", "Criminal Defence", "Family & Personal Law",
    "Civil Litigation", "Property & Real Estate", "Tax & Revenue",
    "Constitutional & Public Law", "Banking & Finance", "Labour & Employment",
    "Intellectual Property",
];

const TEAM_SIZES = ["1–5", "6–15", "16–30", "31–60", "60+"];

const SettingsPanel = ({
    orgName,
    orgIndustry,
    onOrgUpdate,
}: {
    orgName:     string;
    orgIndustry: string;
    onOrgUpdate: (name: string, industry: string) => void;
}) => {
    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string } : { name: "", email: "" };

    // Org profile state
    const [name,      setName]      = useState(orgName);
    const [industry,  setIndustry]  = useState(orgIndustry);
    const [orgSaving, setOrgSaving] = useState(false);
    const [orgMsg,    setOrgMsg]    = useState<{ ok: boolean; text: string } | null>(null);

    // Optional profile fields (completion section)
    const [phone,        setPhone]        = useState("");
    const [city,         setCity]         = useState("");
    const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
    const [barCouncilNo, setBarCouncilNo] = useState("");
    const [website,      setWebsite]      = useState("");
    const [teamSize,     setTeamSize]     = useState("");
    const [profSaving,   setProfSaving]   = useState(false);
    const [profMsg,      setProfMsg]      = useState<{ ok: boolean; text: string } | null>(null);

    // Load existing optional profile on mount
    useEffect(() => {
        fetch("/org", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                if (d.phone)          setPhone(d.phone);
                if (d.city)           setCity(d.city);
                if (d.bar_council_no) setBarCouncilNo(d.bar_council_no);
                if (d.website)        setWebsite(d.website);
                if (d.team_size)      setTeamSize(d.team_size);
                if (d.practice_areas) setPracticeAreas(d.practice_areas.split(",").map((s: string) => s.trim()).filter(Boolean));
            })
            .catch(() => {});
    }, []);

    const togglePracticeArea = (area: string) => {
        setPracticeAreas(prev =>
            prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
        );
    };

    const saveProfile = async () => {
        setProfSaving(true); setProfMsg(null);
        try {
            const r = await fetch("/org/profile", {
                method: "PUT",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    city,
                    practice_areas: practiceAreas.join(","),
                    bar_council_no: barCouncilNo,
                    website,
                    team_size:      teamSize,
                }),
            });
            if (r.ok) {
                setProfMsg({ ok: true, text: "Firm profile saved." });
            } else {
                const d = await r.json().catch(() => ({}));
                setProfMsg({ ok: false, text: (d as any).error ?? "Failed to save." });
            }
        } catch { setProfMsg({ ok: false, text: "Network error." }); }
        setProfSaving(false);
        setTimeout(() => setProfMsg(null), 3500);
    };

    // Profile completion % (4 required at signup = 40%, 6 optional = 10% each)
    const optionalFilled = [phone, city, practiceAreas.length > 0, barCouncilNo, website, teamSize].filter(Boolean).length;
    const completionPct  = Math.round(40 + optionalFilled * 10);

    // Password state
    const [currentPw, setCurrentPw] = useState("");
    const [newPw,     setNewPw]     = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwSaving,  setPwSaving]  = useState(false);
    const [pwMsg,     setPwMsg]     = useState<{ ok: boolean; text: string } | null>(null);

    // Delete org modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Practice Teams state
    const [matterTeams,   setMatterTeams]   = useState<MatterTeam[]>([]);
    const [orgMembers,    setOrgMembers]    = useState<TeamMember[]>([]);
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [newTeamName,   setNewTeamName]   = useState("");
    const [teamSaving,    setTeamSaving]    = useState(false);
    const [teamErr,       setTeamErr]       = useState<string | null>(null);
    const [addMemberSelects, setAddMemberSelects] = useState<Record<string, string>>({});

    useEffect(() => {
        Promise.all([
            fetch("/matter-teams", { headers: authHeaders() }).then(r => r.json()),
            fetch("/team",         { headers: authHeaders() }).then(r => r.json()),
        ]).then(([td, tm]) => {
            setMatterTeams(td.teams ?? []);
            setOrgMembers((tm.members ?? []).map((m: any) => ({
                user_id: m.user_id, name: m.name, email: m.email,
                role: m.role, joined: m.created_at ?? "",
            })));
        }).catch(() => {});
    }, []);

    const toggleExpand = (id: string) =>
        setExpandedTeams(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

    const createTeam = async () => {
        if (!newTeamName.trim()) { setTeamErr("Team name is required."); return; }
        setTeamSaving(true); setTeamErr(null);
        try {
            const res = await fetch("/matter-teams", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTeamName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setTeamErr(data.error ?? "Failed."); setTeamSaving(false); return; }
            setMatterTeams(prev => [...prev, { ...data, members: [] }]);
            setNewTeamName(""); setShowTeamModal(false);
        } catch { setTeamErr("Network error."); }
        setTeamSaving(false);
    };

    const deleteTeam = async (teamId: string) => {
        if (!confirm("Delete this team? It will be unassigned from all matters.")) return;
        await fetch(`/matter-teams/${teamId}`, { method: "DELETE", headers: authHeaders() });
        setMatterTeams(prev => prev.filter(t => t.team_id !== teamId));
    };

    const addMember = async (teamId: string) => {
        const userId = addMemberSelects[teamId];
        if (!userId) return;
        const res = await fetch(`/matter-teams/${teamId}/members/${userId}`, { method: "POST", headers: authHeaders() });
        if (res.ok) {
            const member = orgMembers.find(m => m.user_id === userId);
            if (member) {
                setMatterTeams(prev => prev.map(t =>
                    t.team_id === teamId
                        ? { ...t, members: [...t.members, { user_id: member.user_id, name: member.name }] }
                        : t
                ));
            }
            setAddMemberSelects(prev => ({ ...prev, [teamId]: "" }));
        }
    };

    const removeMember = async (teamId: string, userId: string) => {
        await fetch(`/matter-teams/${teamId}/members/${userId}`, { method: "DELETE", headers: authHeaders() });
        setMatterTeams(prev => prev.map(t =>
            t.team_id === teamId ? { ...t, members: t.members.filter(m => m.user_id !== userId) } : t
        ));
    };

    const saveOrg = async () => {
        if (!name.trim()) { setOrgMsg({ ok: false, text: "Firm name cannot be empty." }); return; }
        setOrgSaving(true); setOrgMsg(null);
        try {
            const r = await fetch("/org", {
                method: "PUT",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), industry }),
            });
            if (r.ok) {
                onOrgUpdate(name.trim(), industry);
                setOrgMsg({ ok: true, text: "Organization profile saved." });
            } else {
                const d = await r.json().catch(() => ({}));
                setOrgMsg({ ok: false, text: (d as any).error ?? "Failed to save." });
            }
        } catch { setOrgMsg({ ok: false, text: "Network error." }); }
        setOrgSaving(false);
        setTimeout(() => setOrgMsg(null), 3500);
    };

    const changePassword = async () => {
        if (!currentPw || !newPw) { setPwMsg({ ok: false, text: "Fill in all password fields." }); return; }
        if (newPw !== confirmPw)  { setPwMsg({ ok: false, text: "Passwords do not match." }); return; }
        if (newPw.length < 8)    { setPwMsg({ ok: false, text: "New password must be at least 8 characters." }); return; }
        setPwSaving(true); setPwMsg(null);
        try {
            const r = await fetch("/auth/change-password", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) {
                setPwMsg({ ok: true, text: "Password changed successfully." });
                setCurrentPw(""); setNewPw(""); setConfirmPw("");
            } else {
                setPwMsg({ ok: false, text: (d as any).error ?? "Failed to change password." });
            }
        } catch { setPwMsg({ ok: false, text: "Network error." }); }
        setPwSaving(false);
        setTimeout(() => setPwMsg(null), 4000);
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.settingsGrid}>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Organization Profile</div>
                    {orgMsg && (
                        <div className={`${styles.errorBanner}${orgMsg.ok ? " " + styles.successBanner : ""}`}>
                            {orgMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setOrgMsg(null)}>✕</button>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Firm Name</label>
                        <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Industry</label>
                        <select className={styles.formSelect} value={industry} onChange={e => setIndustry(e.target.value)}>
                            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                        </select>
                    </div>
                    <button className={styles.btnPrimary} onClick={saveOrg} disabled={orgSaving}>
                        {orgSaving ? "Saving…" : "Save Changes"}
                    </button>
                </div>

                {/* ── Profile Completion ── */}
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Firm Profile Completion</div>
                    <div className={styles.completionBarWrap}>
                        <div className={styles.completionBarFill} style={{ width: `${completionPct}%` }} />
                    </div>
                    <div className={styles.completionLabel}>
                        {completionPct}% complete — {optionalFilled}/6 optional fields filled
                    </div>

                    {profMsg && (
                        <div className={`${styles.errorBanner}${profMsg.ok ? " " + styles.successBanner : ""}`}>
                            {profMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setProfMsg(null)}>✕</button>
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Phone</label>
                            <input className={styles.formInput} type="tel" placeholder="+92 300 0000000"
                                value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>City</label>
                            <select className={styles.formSelect} value={city} onChange={e => setCity(e.target.value)}>
                                <option value="">Select city</option>
                                {PK_CITIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Bar Council No.</label>
                            <input className={styles.formInput} type="text" placeholder="e.g. LHC-2019-1234"
                                value={barCouncilNo} onChange={e => setBarCouncilNo(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Team Size</label>
                            <select className={styles.formSelect} value={teamSize} onChange={e => setTeamSize(e.target.value)}>
                                <option value="">Select size</option>
                                {TEAM_SIZES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Website (optional)</label>
                        <input className={styles.formInput} type="url" placeholder="https://yourfirm.com"
                            value={website} onChange={e => setWebsite(e.target.value)} />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Practice Areas</label>
                        <div className={styles.practiceAreaGrid}>
                            {PRACTICE_AREAS.map(area => (
                                <label key={area} className={styles.practiceAreaChip}>
                                    <input
                                        type="checkbox"
                                        checked={practiceAreas.includes(area)}
                                        onChange={() => togglePracticeArea(area)}
                                        style={{ display: "none" }}
                                    />
                                    <span className={practiceAreas.includes(area) ? styles.chipActive : styles.chipInactive}>
                                        {area}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button className={styles.btnPrimary} onClick={saveProfile} disabled={profSaving}>
                        {profSaving ? "Saving…" : "Save Firm Profile"}
                    </button>
                </div>

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Your Account</div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Full Name</label>
                        <input className={styles.formInput} defaultValue={user.name} readOnly />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email</label>
                        <input className={styles.formInput} defaultValue={user.email} readOnly />
                    </div>
                    {pwMsg && (
                        <div className={`${styles.errorBanner}${pwMsg.ok ? " " + styles.successBanner : ""}`}>
                            {pwMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setPwMsg(null)}>✕</button>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Current Password</label>
                        <input className={styles.formInput} type="password" value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>New Password</label>
                        <input className={styles.formInput} type="password" value={newPw}
                            onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Confirm New Password</label>
                        <input className={styles.formInput} type="password" value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
                    </div>
                    <button className={styles.btnGhost} onClick={changePassword} disabled={pwSaving}>
                        {pwSaving ? "Changing…" : "Change Password"}
                    </button>
                </div>

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Preferences</div>
                    <div className={styles.prefRow}>
                        <div>
                            <div className={styles.prefLabel}>Theme</div>
                            <div className={styles.prefSub}>Switch between dark and light mode</div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>

                {/* ── Practice Teams ── */}
                <div className={styles.settingsCard} style={{ gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <div className={styles.settingsCardTitle} style={{ marginBottom: 0 }}>Practice Teams</div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => { setNewTeamName(""); setTeamErr(null); setShowTeamModal(true); }}>
                            + Create Team
                        </button>
                    </div>

                    {matterTeams.length === 0 ? (
                        <div className={styles.emptyHint}>No practice teams yet. Create teams to assign staff groups to matters.</div>
                    ) : (
                        <div className={styles.teamsList}>
                            {matterTeams.map(team => {
                                const isOpen = expandedTeams.has(team.team_id);
                                const nonMembers = orgMembers.filter(m => !team.members.some(tm => tm.user_id === m.user_id));
                                return (
                                    <div key={team.team_id} className={styles.teamsItem}>
                                        <div className={styles.teamsItemHeader}>
                                            <button className={styles.teamsExpandBtn} onClick={() => toggleExpand(team.team_id)}>
                                                <span className={styles.teamsExpandArrow}>{isOpen ? "▾" : "▸"}</span>
                                                <span className={styles.teamsItemName}>{team.name}</span>
                                                <span className={styles.muted} style={{ fontSize: "0.78rem" }}>
                                                    {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                                                </span>
                                            </button>
                                            <button className={styles.actionBtnDanger} style={{ fontSize: "0.75rem" }} onClick={() => deleteTeam(team.team_id)}>
                                                Delete
                                            </button>
                                        </div>
                                        {isOpen && (
                                            <div className={styles.teamsMemberList}>
                                                {team.members.length === 0 ? (
                                                    <div className={styles.muted} style={{ fontSize: "0.8rem", padding: "0.4rem 0" }}>No members yet.</div>
                                                ) : (
                                                    team.members.map(m => (
                                                        <div key={m.user_id} className={styles.teamsMemberRow}>
                                                            <span className={styles.teamsMemberName}>{m.name}</span>
                                                            <button className={styles.queueRemove} title="Remove from team" onClick={() => removeMember(team.team_id, m.user_id)}>✕</button>
                                                        </div>
                                                    ))
                                                )}
                                                {nonMembers.length > 0 && (
                                                    <div className={styles.teamsAddMemberRow}>
                                                        <select
                                                            className={styles.formSelect}
                                                            style={{ flex: 1, fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                                                            value={addMemberSelects[team.team_id] ?? ""}
                                                            onChange={e => setAddMemberSelects(prev => ({ ...prev, [team.team_id]: e.target.value }))}
                                                        >
                                                            <option value="">Add member…</option>
                                                            {nonMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>)}
                                                        </select>
                                                        <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
                                                            disabled={!addMemberSelects[team.team_id]}
                                                            onClick={() => addMember(team.team_id)}>
                                                            Add
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Danger Zone</div>
                    <p className={styles.dangerText}>
                        Deleting your organization will permanently remove all documents and team access. This cannot be undone.
                    </p>
                    <button className={styles.btnDanger} onClick={() => setShowDeleteModal(true)}>
                        Delete Organization
                    </button>
                </div>
            </div>

            {/* Create team modal */}
            {showTeamModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowTeamModal(false); }}>
                    <div className={styles.modal} style={{ maxWidth: 400 }}>
                        <h3 className={styles.modalTitle}>Create Practice Team</h3>
                        {teamErr && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {teamErr}</div>}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Team Name</label>
                            <input className={styles.formInput} value={newTeamName} autoFocus
                                onChange={e => setNewTeamName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && createTeam()}
                                placeholder="e.g. Litigation Team, Corporate Group" />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowTeamModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={createTeam} disabled={teamSaving}>
                                {teamSaving ? "Creating…" : "Create Team"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete org info modal */}
            {showDeleteModal && (
                <div
                    className={styles.overlay}
                    onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
                >
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Organization Deletion</h3>
                        <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
                            For security and compliance, organization deletion must be requested through our support team. We'll verify your identity and ensure all data is properly handled before removing your account.
                        </p>
                        <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem", color: "var(--text-2)" }}>
                            Contact us at{" "}
                            <a
                                href="mailto:support@projectease.ai"
                                style={{ color: "var(--gold)", textDecoration: "none" }}
                            >
                                support@projectease.ai
                            </a>{" "}
                            with the subject line <strong style={{ color: "var(--text-1)" }}>Delete Organization Request</strong> from your registered email address.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowDeleteModal(false)}>Close</button>
                            <a
                                href="mailto:support@projectease.ai?subject=Delete%20Organization%20Request"
                                className={styles.btnDanger}
                                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                            >
                                Email Support
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Drafting Panel ────────────────────────────────────────────────────────────

const TEMPLATE_TYPES_UI = [
    { value: "vakalatnama", label: "Vakalatnama" },
    { value: "plaint",      label: "Plaint / Petition" },
    { value: "agreement",   label: "Agreement" },
    { value: "notice",      label: "Legal Notice" },
    { value: "general",     label: "General" },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
    vakalatnama: `VAKALATNAMA

I, {{client_name}}, S/O or D/O _________________________, CNIC No. {{client_cnic}}, resident of _________________________, do hereby appoint and authorise {{advocate_name}} of {{org_name}} to act and appear on my behalf in the case of:

Matter: {{matter_title}}
Case No.: {{case_number}}
Court: {{court_name}}

I hereby confer upon my said counsel full authority to do all acts, deeds, and things as may be necessary for the conduct of the said case, including filing of pleadings, appearances, and taking such steps as may be required.

Date: {{date_long}}

_______________________
Signature of Executant
{{client_name}}`,

    plaint: `IN THE COURT OF LEARNED {{court_name}}

Case No.: {{case_number}}

{{client_name}}
                                                                   …Plaintiff
versus

[Defendant Name]
                                                                   …Defendant

PLAINT

Most respectfully sheweth that:

1. The Plaintiff is {{client_name}}, CNIC No. {{client_cnic}}, resident of _________________________.

2. The brief facts of the matter are as follows:
   {{matter_description}}

3. The Plaintiff therefore prays that this Honourable Court may be pleased to:
   (a) [Relief sought]
   (b) Any other relief deemed fit and proper.

Place: _____________
Date: {{date_long}}

_______________________
Advocate for Plaintiff
{{org_name}}`,

    notice: `LEGAL NOTICE
Date: {{date_long}}

To,
[Recipient Name]
[Recipient Address]

Subject: Legal Notice regarding {{matter_title}}

Dear Sir/Madam,

Under instructions from and on behalf of my client {{client_name}}, I hereby issue this Legal Notice to you as under:

1. [Background facts]

2. {{matter_description}}

3. You are hereby called upon to [action required] within 15 (fifteen) days from the receipt of this notice, failing which my client shall be constrained to initiate legal proceedings against you before the competent court of law without further notice, at your risk, cost, and consequences.

This notice is being issued without prejudice to all other rights and remedies available to my client.

Yours faithfully,

_______________________
{{advocate_name}}
{{org_name}}`,

    agreement: `AGREEMENT

This Agreement is entered into on {{date_long}} between:

Party A: {{client_name}}, CNIC No. {{client_cnic}}
                                                ("Party A")
AND
Party B: _______________________________
                                                ("Party B")

RECITALS

1. [Background / Recital]

TERMS AND CONDITIONS

1. [Term 1]
2. [Term 2]
3. [Term 3]

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

Party A: _______________________          Party B: _______________________
{{client_name}}                           [Name]
CNIC: {{client_cnic}}                     CNIC: ___________________________
Date: {{date_long}}                       Date: ___________________________

WITNESSES:
1. _______________________
2. _______________________`,

    general: `{{org_name}}

Date: {{date_long}}
Ref: {{case_number}}

Subject: {{matter_title}}

Dear Sir/Madam,

[Body of document]

Yours faithfully,

_______________________
{{advocate_name}}
{{org_name}}`,
};

const DraftingPanel = () => {
    const [templates,    setTemplates]    = useState<Template[]>([]);
    const [matters,      setMatters]      = useState<Matter[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [filterType,   setFilterType]   = useState<string>("all");

    // Editor modal
    const [editorOpen,   setEditorOpen]   = useState(false);
    const [editing,      setEditing]      = useState<Template | null>(null);
    const [eTitle,       setETitle]       = useState("");
    const [eType,        setEType]        = useState("general");
    const [eContent,     setEContent]     = useState("");
    const [eDesc,        setEDesc]        = useState("");
    const [saving,       setSaving]       = useState(false);
    const [saveErr,      setSaveErr]      = useState("");

    // Draft modal
    const [draftOpen,    setDraftOpen]    = useState(false);
    const [draftTmpl,    setDraftTmpl]    = useState<Template | null>(null);
    const [draftMatter,  setDraftMatter]  = useState("");
    const [drafting,     setDrafting]     = useState(false);
    const [draftErr,     setDraftErr]     = useState("");

    const [deleteId,     setDeleteId]     = useState<string | null>(null);
    const [deleting,     setDeleting]     = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [tRes, mRes] = await Promise.all([
                fetch("/templates", { headers: authHeaders() }),
                fetch("/matters",   { headers: authHeaders() }),
            ]);
            if (tRes.ok) setTemplates(await tRes.json());
            if (mRes.ok) setMatters(await mRes.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => {
        setEditing(null);
        setETitle(""); setEType("general"); setEDesc("");
        setEContent(DEFAULT_TEMPLATES["general"]);
        setSaveErr(""); setEditorOpen(true);
    };

    const openEdit = (t: Template) => {
        setEditing(t);
        setETitle(t.title); setEType(t.template_type);
        setEDesc(t.description ?? ""); setEContent(t.content);
        setSaveErr(""); setEditorOpen(true);
    };

    const handleTypeChange = (v: string) => {
        setEType(v);
        if (!editing) setEContent(DEFAULT_TEMPLATES[v] ?? "");
    };

    const handleSave = async () => {
        if (!eTitle.trim()) { setSaveErr("Title is required."); return; }
        setSaving(true); setSaveErr("");
        try {
            const url    = editing ? `/templates/${editing.template_id}` : "/templates";
            const method = editing ? "PATCH" : "POST";
            const res    = await fetch(url, {
                method,
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ title: eTitle, template_type: eType, content: eContent, description: eDesc }),
            });
            if (!res.ok) { const d = await res.json(); setSaveErr(d.error ?? "Save failed"); return; }
            setEditorOpen(false);
            load();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await fetch(`/templates/${deleteId}`, { method: "DELETE", headers: authHeaders() });
            setDeleteId(null);
            load();
        } finally { setDeleting(false); }
    };

    const openDraft = (t: Template) => {
        setDraftTmpl(t);
        setDraftMatter("");
        setDraftErr("");
        setDraftOpen(true);
    };

    const handleDraft = async () => {
        if (!draftTmpl) return;
        setDrafting(true); setDraftErr("");
        try {
            const res = await fetch("/draft", {
                method:  "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body:    JSON.stringify({ template_id: draftTmpl.template_id, matter_id: draftMatter || null }),
            });
            if (!res.ok) {
                const d = await res.json();
                setDraftErr(d.error ?? "Draft failed");
                return;
            }
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `Draft_${draftTmpl.title.replace(/\s+/g, "_")}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDraftOpen(false);
        } finally { setDrafting(false); }
    };

    const filtered = filterType === "all"
        ? templates
        : templates.filter(t => t.template_type === filterType);

    const extractVars = (content: string) => {
        const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
        return [...new Set(matches)];
    };

    if (loading) return <div style={{ padding: "2rem", color: "var(--text-3)" }}>Loading templates…</div>;

    return (
        <div className={styles.draftingWrap}>
            {/* Header row */}
            <div className={styles.draftingHeader}>
                <div className={styles.filterChips}>
                    <button
                        className={filterType === "all" ? styles.chipActive : styles.chip}
                        onClick={() => setFilterType("all")}
                    >All</button>
                    {TEMPLATE_TYPES_UI.map(t => (
                        <button
                            key={t.value}
                            className={filterType === t.value ? styles.chipActive : styles.chip}
                            onClick={() => setFilterType(t.value)}
                        >{t.label}</button>
                    ))}
                </div>
                <button className={styles.addBtn} onClick={openNew}>+ New Template</button>
            </div>

            {/* Template grid */}
            {filtered.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No templates yet. Create your first template to get started.</p>
                    <button className={styles.addBtn} onClick={openNew}>Create Template</button>
                </div>
            ) : (
                <div className={styles.templateGrid}>
                    {filtered.map(t => {
                        const vars = extractVars(t.content);
                        const typeLabel = TEMPLATE_TYPES_UI.find(x => x.value === t.template_type)?.label ?? t.template_type;
                        return (
                            <div key={t.template_id} className={styles.templateCard}>
                                <div className={styles.templateCardHead}>
                                    <span className={styles.templateTypeBadge}>{typeLabel}</span>
                                    <span className={styles.templateDate}>{fmtDate(t.modified_at)}</span>
                                </div>
                                <div className={styles.templateTitle}>{t.title}</div>
                                {t.description && <div className={styles.templateDesc}>{t.description}</div>}
                                {vars.length > 0 && (
                                    <div className={styles.templateVars}>
                                        {vars.slice(0, 4).map(v => (
                                            <span key={v} className={styles.varChip}>{v}</span>
                                        ))}
                                        {vars.length > 4 && <span className={styles.varChip}>+{vars.length - 4}</span>}
                                    </div>
                                )}
                                <div className={styles.templateCardActions}>
                                    <button className={styles.draftBtn} onClick={() => openDraft(t)}>
                                        ↓ Draft Document
                                    </button>
                                    <button className={styles.editBtn} onClick={() => openEdit(t)}>Edit</button>
                                    <button className={styles.deleteBtn} onClick={() => setDeleteId(t.template_id)}>Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Editor Modal ─────────────────────────────────────────── */}
            {editorOpen && (
                <div className={styles.modalOverlay} onClick={() => setEditorOpen(false)}>
                    <div className={styles.draftModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHead}>
                            <h2>{editing ? "Edit Template" : "New Template"}</h2>
                            <button className={styles.modalClose} onClick={() => setEditorOpen(false)}>✕</button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.fieldRow}>
                                <div className={styles.fieldGroup} style={{ flex: 2 }}>
                                    <label className={styles.fieldLabel}>Title</label>
                                    <input
                                        className={styles.fieldInput}
                                        value={eTitle}
                                        onChange={e => setETitle(e.target.value)}
                                        placeholder="e.g. Standard Vakalatnama"
                                    />
                                </div>
                                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                                    <label className={styles.fieldLabel}>Type</label>
                                    <select
                                        className={styles.fieldSelect}
                                        value={eType}
                                        onChange={e => handleTypeChange(e.target.value)}
                                    >
                                        {TEMPLATE_TYPES_UI.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Description (optional)</label>
                                <input
                                    className={styles.fieldInput}
                                    value={eDesc}
                                    onChange={e => setEDesc(e.target.value)}
                                    placeholder="Brief description of when to use this template"
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>
                                    Template Content
                                    <span className={styles.varHint}>Use &#123;&#123;variable_name&#125;&#125; for auto-fill placeholders</span>
                                </label>
                                <textarea
                                    className={styles.templateTextarea}
                                    value={eContent}
                                    onChange={e => setEContent(e.target.value)}
                                    rows={20}
                                    spellCheck={false}
                                />
                            </div>

                            <div className={styles.varPreview}>
                                <span className={styles.varPreviewLabel}>Variables detected:</span>
                                {extractVars(eContent).length === 0
                                    ? <span className={styles.varChip} style={{ opacity: 0.5 }}>none</span>
                                    : extractVars(eContent).map(v => <span key={v} className={styles.varChip}>{v}</span>)
                                }
                            </div>

                            {saveErr && <div className={styles.formError}>{saveErr}</div>}
                        </div>

                        <div className={styles.modalFoot}>
                            <button className={styles.cancelBtn} onClick={() => setEditorOpen(false)}>Cancel</button>
                            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                                {saving ? "Saving…" : editing ? "Save Changes" : "Create Template"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Draft Modal ──────────────────────────────────────────── */}
            {draftOpen && draftTmpl && (
                <div className={styles.modalOverlay} onClick={() => setDraftOpen(false)}>
                    <div className={styles.draftModal} style={{ maxWidth: "520px" }} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHead}>
                            <h2>Draft: {draftTmpl.title}</h2>
                            <button className={styles.modalClose} onClick={() => setDraftOpen(false)}>✕</button>
                        </div>

                        <div className={styles.modalBody}>
                            <p style={{ color: "var(--text-2)", marginBottom: "1rem", fontSize: "0.875rem" }}>
                                Select a matter to auto-fill client and case details. AI will fill any remaining placeholders.
                            </p>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Link to Matter (optional)</label>
                                <select
                                    className={styles.fieldSelect}
                                    value={draftMatter}
                                    onChange={e => setDraftMatter(e.target.value)}
                                >
                                    <option value="">— No matter (fill manually after download) —</option>
                                    {matters.filter(m => m.status !== "Closed").map(m => (
                                        <option key={m.matter_id} value={m.matter_id}>
                                            {m.title} — {m.client_name} ({m.matter_type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.varPreview} style={{ marginTop: "1rem" }}>
                                <span className={styles.varPreviewLabel}>Variables in this template:</span>
                                {extractVars(draftTmpl.content).map(v => (
                                    <span key={v} className={styles.varChip}>{v}</span>
                                ))}
                            </div>

                            {draftErr && <div className={styles.formError}>{draftErr}</div>}
                        </div>

                        <div className={styles.modalFoot}>
                            <button className={styles.cancelBtn} onClick={() => setDraftOpen(false)}>Cancel</button>
                            <button className={styles.draftBtnLg} onClick={handleDraft} disabled={drafting}>
                                {drafting ? "Generating…" : "↓ Download .docx"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ───────────────────────────────────────── */}
            {deleteId && (
                <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
                    <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
                        <p>Delete this template? This cannot be undone.</p>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                            <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                                {deleting ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Theme Toggle ──────────────────────────────────────────────────────────────

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return <button className={styles.themeToggle} onClick={handle}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
};

// ── Shell ─────────────────────────────────────────────────────────────────────

const OwnerPortal = () => {
    const [panel,    setPanel]    = useState<Panel>("overview");
    const [docs,     setDocs]     = useState<DocFile[]>([]);
    const [team,     setTeam]     = useState<TeamMember[]>([]);
    const [usage,    setUsage]    = useState<Usage>({ total_docs: 0, total_bytes: 0 });
    const [plan,     setPlan]     = useState("free");
    const [orgName,  setOrgName]  = useState("Your Organization");
    const [industry, setIndustry] = useState("Other");
    const [maxDocs,  setMaxDocs]  = useState(20);
    const [maxUsers, setMaxUsers] = useState(5);
    const [loading,  setLoading]  = useState(true);
    const [navOpen,  setNavOpen]  = useState(false);  // mobile sidebar toggle

    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string; role: string; org: string } : { name: "Owner", email: "", role: "org_owner", org: "" };

    // Load documents, team, and org on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [docsRes, teamRes, orgRes] = await Promise.all([
                    fetch("/documents", { headers: authHeaders() }),
                    fetch("/team",      { headers: authHeaders() }),
                    fetch("/org",       { headers: authHeaders() }),
                ]);

                if (docsRes.ok) {
                    const d = await docsRes.json();
                    const mapped: DocFile[] = (d.documents ?? []).map((doc: any) => ({
                        doc_id:        doc.doc_id,
                        name:          doc.filename,
                        size:          fmtBytes(doc.size_bytes ?? 0),
                        size_bytes:    doc.size_bytes ?? 0,
                        uploaded:      fmtDate(doc.uploaded_at ?? ""),
                        status:        doc.status as DocFile["status"],
                        category_id:   doc.category_id ?? null,
                        category_name: doc.category_name ?? null,
                    }));
                    setDocs(mapped);
                    setUsage(d.usage ?? { total_docs: 0, total_bytes: 0 });
                }

                if (teamRes.ok) {
                    const t = await teamRes.json();
                    const mapped: TeamMember[] = (t.members ?? []).map((m: any) => ({
                        user_id:          m.user_id,
                        name:             m.name,
                        email:            m.email,
                        role:             m.role,
                        joined:           m.created_at ?? "",
                        whatsapp_number:  m.whatsapp_number ?? null,
                    }));
                    setTeam(mapped);
                }

                if (orgRes.ok) {
                    const o = await orgRes.json();
                    setOrgName(o.name ?? "Your Organization");
                    setIndustry(o.industry ?? "Other");
                    setPlan(o.plan ?? "free");
                    setMaxDocs(o.max_docs ?? 20);
                    setMaxUsers(o.max_users ?? 5);
                }
            } catch { /* silent — fallback to empty state */ }
            setLoading(false);
        };
        load();
    }, []);

    // Keep usage in sync when docs change
    useEffect(() => {
        setUsage({
            total_docs:  docs.length,
            total_bytes: docs.reduce((sum, d) => sum + (d.size_bytes ?? 0), 0),
        });
    }, [docs]);

    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        window.location.hash = "/";
    };

    const navClick = (id: Panel) => { setPanel(id); setNavOpen(false); };

    return (
        <div className={styles.shell}>
            {/* Mobile top bar */}
            <div className={styles.mobileTopBar}>
                <button className={styles.hamburger} onClick={() => setNavOpen(v => !v)} aria-label="Menu">
                    <span /><span /><span />
                </button>
                <span className={styles.mobileLogoText}>Project<span className={styles.logoAccent}> Ease</span></span>
            </div>

            {/* Mobile overlay */}
            {navOpen && <div className={styles.navOverlay} onClick={() => setNavOpen(false)} />}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ""}`}>
                <div className={styles.sidebarLogo}>
                    Project<span className={styles.logoAccent}> Ease</span>
                </div>

                <div className={styles.orgBadge}>
                    <div className={styles.orgBadgeName}>{orgName}</div>
                    <div className={styles.orgBadgeType}>Firm Owner</div>
                </div>

                <nav className={styles.nav}>
                    {NAV.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            className={`${styles.navItem} ${panel === id ? styles.navItemActive : ""}`}
                            onClick={() => navClick(id)}
                        >
                            <span className={styles.navIconBox}>{icon}</span>
                            {label}
                        </button>
                    ))}

                    <div className={styles.navDivider} />

                    <button className={styles.navItemChat} onClick={() => { window.location.hash = "/app"; }}>
                        <span className={styles.navIconBox}>A</span>
                        Ask a Question
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.sidebarUserBox}>
                        <div className={styles.sidebarUserName}>{user.name}</div>
                        <div className={styles.sidebarUserRole}>Firm Owner</div>
                    </div>
                    <button
                        className={styles.themeToggle}
                        style={{ textAlign: "left", width: "100%", marginBottom: "0.35rem" }}
                        onClick={() => { window.location.hash = "/settings"; }}
                    >
                        Account Settings
                    </button>
                    <button className={styles.signOutBtn} onClick={signOut}>Sign Out</button>
                </div>
            </aside>

            {/* Main */}
            <div className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.headerTitle}>{PANEL_TITLES[panel]}</h1>
                        <p className={styles.headerSub}>{PANEL_SUBS[panel]}</p>
                    </div>
                    <ThemeToggle />
                </header>

                <div className={styles.body}>
                    {loading ? (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                    ) : (
                        <>
                            {panel === "overview"      && <OverviewPanel orgName={orgName} docs={docs} team={team} usage={usage} />}
                            {panel === "documents"     && <DocumentsPanel docs={docs} setDocs={setDocs} usage={usage} plan={plan} onUpgrade={() => setPanel("subscription")} />}
                            {panel === "clients"       && <ClientsPanel />}
                            {panel === "matters"       && <MattersPanel />}
                            {panel === "calendar"      && <CalendarPanel />}
                            {panel === "invoices"      && <InvoicesPanel />}
                            {panel === "team"          && <TeamPanel team={team} setTeam={setTeam} maxUsers={maxUsers} onUpgrade={() => setPanel("subscription")} />}
                            {panel === "drafting"      && <DraftingPanel />}
                            {panel === "audit"         && <AuditPanel />}
                            {panel === "subscription"  && (
                                <SubscriptionPanel
                                    plan={plan}
                                    usage={usage}
                                    maxDocs={maxDocs}
                                    maxUsers={maxUsers}
                                    teamCount={team.length}
                                />
                            )}
                            {panel === "settings"      && (
                                <SettingsPanel
                                    orgName={orgName}
                                    orgIndustry={industry}
                                    onOrgUpdate={(n, i) => { setOrgName(n); setIndustry(i); }}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OwnerPortal;
