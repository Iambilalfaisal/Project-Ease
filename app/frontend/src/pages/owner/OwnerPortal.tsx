import { useState, useEffect, useRef } from "react";
import styles from "./OwnerPortal.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "overview" | "documents" | "clients" | "matters" | "team" | "subscription" | "settings" | "audit";

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
    client_id:   string;
    name:        string;
    client_type: "Individual" | "Corporate";
    email?:      string;
    phone?:      string;
    address?:    string;
    cnic_ntn?:   string;
    notes?:      string;
    created_at:  string;
    matter_count?: number;
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
    notes?:          string;
    created_at:      string;
    doc_count?:      number;
    documents?:      MatterDoc[];
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
    { id: "team",         icon: "T", label: "Team"         },
    { id: "audit",        icon: "A", label: "Audit Log"    },
    { id: "subscription", icon: "P", label: "Subscription" },
    { id: "settings",     icon: "S", label: "Settings"     },
];

const PANEL_TITLES: Record<Panel, string> = {
    overview:     "Workspace Overview",
    documents:    "Document Library",
    clients:      "Client Management",
    matters:      "Matter Management",
    team:         "Team Members",
    audit:        "Audit Log",
    subscription: "Plan & Subscription",
    settings:     "Organization Settings",
};

const PANEL_SUBS: Record<Panel, string> = {
    overview:     "Your firm's activity at a glance",
    documents:    "Upload and manage your firm's documents",
    clients:      "Manage your firm's clients and their details",
    matters:      "Track cases, matters, and linked documents",
    team:         "Manage who has access to your workspace",
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

const BLANK_CLIENT = {
    name: "", client_type: "Individual" as "Individual" | "Corporate",
    email: "", phone: "", address: "", cnic_ntn: "", notes: "",
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
                    {detail.cnic_ntn && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>CNIC / NTN</span><span>{detail.cnic_ntn}</span></div>}
                    {detail.address  && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Address</span><span>{detail.address}</span></div>}
                    {detail.notes    && <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}><span className={styles.detailInfoLabel}>Notes</span><span>{detail.notes}</span></div>}
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
                            <th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>Matters</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {clients.map(c => (
                                <tr key={c.client_id}>
                                    <td>
                                        <button className={styles.linkBtn} onClick={() => openDetail(c)}>{c.name}</button>
                                    </td>
                                    <td><span className={c.client_type === "Corporate" ? styles.badgeGold : styles.badgeGray}>{c.client_type}</span></td>
                                    <td className={styles.muted}>{c.email ?? "—"}</td>
                                    <td className={styles.muted}>{c.phone ?? "—"}</td>
                                    <td className={styles.muted}>{c.matter_count ?? 0}</td>
                                    <td style={{ display: "flex", gap: "0.4rem" }}>
                                        <button className={styles.actionBtn} onClick={() => openDetail(c)}>View</button>
                                        <button className={styles.actionBtn} onClick={() => openEdit(c)}>Edit</button>
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
        </div>
    );
};

// ── Matters Panel ─────────────────────────────────────────────────────────────

const BLANK_MATTER = {
    client_id: "", title: "", matter_type: MATTER_TYPES[0], status: "Active" as const,
    court_name: "", case_number: "", filing_date: "", opposing_party: "", team_id: "", notes: "",
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

    const allCourts = [...DEFAULT_COURTS, ...customCourts.map(c => c.name)];

    const loadAll = () => {
        Promise.all([
            fetch("/matters",      { headers: authHeaders() }).then(r => r.json()),
            fetch("/clients",      { headers: authHeaders() }).then(r => r.json()),
            fetch("/matter-teams", { headers: authHeaders() }).then(r => r.json()),
            fetch("/courts",       { headers: authHeaders() }).then(r => r.json()),
        ]).then(([md, cd, td, co]) => {
            setMatters(md.matters ?? []);
            setClients(cd.clients ?? []);
            setMatterTeams(td.teams ?? []);
            setCustomCourts(co.custom ?? []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { loadAll(); }, []);

    const openDetail = (m: Matter) => {
        fetch(`/matters/${m.matter_id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setDetail(d); setEditDetail(false); });
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
                        </div>
                    </div>
                )}

                {/* Document hierarchy */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1.5rem 0 0.75rem" }}>
                    <div className={styles.sectionTitle} style={{ margin: 0 }}>
                        Linked Documents ({(detail.documents ?? []).length})
                    </div>
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
                            <th>Title</th><th>Client</th><th>Type</th><th>Status</th><th>Court</th><th>Case #</th><th>Team</th><th>Docs</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map(m => (
                                <tr key={m.matter_id}>
                                    <td><button className={styles.linkBtn} onClick={() => openDetail(m)}>{m.title}</button></td>
                                    <td className={styles.muted}>{m.client_name}</td>
                                    <td className={styles.muted}>{m.matter_type}</td>
                                    <td><span className={(styles as any)[STATUS_BADGE[m.status] ?? "badgeGray"]}>{m.status}</span></td>
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
                            ))}
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

const DocumentsPanel = ({ docs, setDocs, usage, plan }: {
    docs: DocFile[];
    setDocs: React.Dispatch<React.SetStateAction<DocFile[]>>;
    usage: Usage;
    plan: string;
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging,      setDragging]      = useState(false);
    const [uploadError,   setUploadError]   = useState<string | null>(null);
    const [categories,    setCategories]    = useState<Category[]>([]);
    const [filterCat,     setFilterCat]     = useState<string>("all");
    const [confirmDelete, setConfirmDelete] = useState<DocFile | null>(null);
    const [deleting,      setDeleting]      = useState<string | null>(null);

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
                setQueue(prev => prev.map(q => q.id === item.id
                    ? { ...q, status: "error", error: data.error ?? "Upload failed." }
                    : q
                ));
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
                        <div className={styles.usageWarnText}>⚠ Approaching your plan limit. Consider upgrading.</div>
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

const TeamPanel = ({ team, setTeam }: {
    team: TeamMember[];
    setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
}) => {
    const [showModal,   setShowModal]   = useState(false);
    const [form,        setForm]        = useState({ name: "", email: "", role: "employee" });
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [tempCreds,   setTempCreds]   = useState<{ email: string; password: string } | null>(null);
    const [removing,    setRemoving]    = useState<string | null>(null);
    const [permMember,  setPermMember]  = useState<TeamMember | null>(null);

    const invite = async () => {
        if (!form.name.trim() || !form.email.trim()) { setInviteError("Name and email are required."); return; }
        try {
            const res = await fetch("/team", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setInviteError(data.error ?? "Failed to invite."); return; }
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
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{team.length} member{team.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={() => { setShowModal(true); setInviteError(null); }}>
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

const PLAN_BADGE_CLASS: Record<string, string> = {
    free:       "badgeGray",
    pro:        "badgeGold",
    enterprise: "badgeGreen",
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
    free:       "Up to 20 documents and 5 team members.",
    pro:        "Up to 500 documents and 25 team members.",
    enterprise: "Unlimited documents and team members.",
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
    const unlimited = maxDocs >= 9_999_999;
    const docPct    = unlimited ? 0 : Math.min(100, Math.round((usage.total_docs / maxDocs)  * 100));
    const userPct   = unlimited ? 0 : Math.min(100, Math.round((teamCount        / maxUsers) * 100));
    const warnDoc   = docPct  >= 80;
    const warnUser  = userPct >= 80;
    const badgeClass = PLAN_BADGE_CLASS[plan] ?? "badgeGray";

    return (
        <div className={styles.panelContent}>
            <div className={styles.settingsGrid}>
                {/* Current plan */}
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Current Plan</div>
                    <div style={{ marginBottom: "0.85rem" }}>
                        <span className={(styles as any)[badgeClass]}>
                            {plan.charAt(0).toUpperCase() + plan.slice(1)}
                        </span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginBottom: "1.25rem" }}>
                        {PLAN_DESCRIPTIONS[plan] ?? "Custom plan — contact support for details."}
                    </p>
                    {plan !== "enterprise" ? (
                        <button className={styles.btnPrimary} onClick={() => alert("Contact support@projectease.ai to upgrade.")}>
                            Upgrade Plan
                        </button>
                    ) : (
                        <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
                            To change your enterprise plan, contact your account manager.
                        </p>
                    )}
                </div>

                {/* Usage */}
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Usage</div>

                    <div className={styles.usageMeterLabel}>
                        <span>Documents</span>
                        <span className={styles.usageMuted}>
                            {unlimited ? `${usage.total_docs} / unlimited` : `${usage.total_docs} / ${maxDocs}`}
                        </span>
                    </div>
                    {!unlimited && (
                        <div className={styles.usageBar}>
                            <div
                                className={`${styles.usageBarFill}${warnDoc ? " " + styles.usageBarWarn : ""}`}
                                style={{ width: `${docPct}%` }}
                            />
                        </div>
                    )}
                    {warnDoc && (
                        <div className={styles.usageWarnText}>
                            {docPct >= 100
                                ? "Document limit reached — upgrade to add more."
                                : `${docPct}% of document limit used.`}
                        </div>
                    )}

                    <div className={styles.usageMeterLabel} style={{ marginTop: "1.1rem" }}>
                        <span>Team Members</span>
                        <span className={styles.usageMuted}>
                            {unlimited ? `${teamCount} / unlimited` : `${teamCount} / ${maxUsers}`}
                        </span>
                    </div>
                    {!unlimited && (
                        <div className={styles.usageBar}>
                            <div
                                className={`${styles.usageBarFill}${warnUser ? " " + styles.usageBarWarn : ""}`}
                                style={{ width: `${userPct}%` }}
                            />
                        </div>
                    )}
                    {warnUser && (
                        <div className={styles.usageWarnText}>
                            {userPct >= 100
                                ? "User limit reached — upgrade to add more."
                                : `${userPct}% of user limit used.`}
                        </div>
                    )}

                    <div className={styles.usageMeterLabel} style={{ marginTop: "1.1rem" }}>
                        <span>Storage Used</span>
                        <span className={styles.usageMuted}>{fmtBytes(usage.total_bytes)}</span>
                    </div>
                </div>

                {/* Support */}
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Need More Capacity?</div>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginBottom: "1.25rem" }}>
                        Contact us to discuss enterprise pricing, custom document limits, or a dedicated support plan.
                    </p>
                    <a
                        href="mailto:support@projectease.ai"
                        className={styles.btnGhost}
                        style={{ display: "inline-block", textDecoration: "none" }}
                    >
                        Contact Support
                    </a>
                </div>
            </div>
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

    return (
        <div className={styles.shell}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
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
                            onClick={() => setPanel(id)}
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
                            {panel === "documents"     && <DocumentsPanel docs={docs} setDocs={setDocs} usage={usage} plan={plan} />}
                            {panel === "clients"       && <ClientsPanel />}
                            {panel === "matters"       && <MattersPanel />}
                            {panel === "team"          && <TeamPanel team={team} setTeam={setTeam} />}
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
