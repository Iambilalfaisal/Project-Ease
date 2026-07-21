import { useState, useEffect, useRef } from "react";
import styles from "./OwnerPortal.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "overview" | "documents" | "team" | "subscription" | "settings";

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
}

interface Usage {
    total_docs: number;
    total_bytes: number;
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
    { id: "overview",      icon: "H", label: "Overview"      },
    { id: "documents",     icon: "D", label: "Documents"     },
    { id: "team",          icon: "T", label: "Team"          },
    { id: "subscription",  icon: "P", label: "Subscription"  },
    { id: "settings",      icon: "S", label: "Settings"      },
];

const PANEL_TITLES: Record<Panel, string> = {
    overview:     "Workspace Overview",
    documents:    "Document Library",
    team:         "Team Members",
    subscription: "Plan & Subscription",
    settings:     "Organization Settings",
};

const PANEL_SUBS: Record<Panel, string> = {
    overview:     "Your firm's activity at a glance",
    documents:    "Upload and manage your firm's documents",
    team:         "Manage who has access to your workspace",
    subscription: "Your current plan, usage, and billing",
    settings:     "Firm profile and account preferences",
};

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.png,.jpg,.jpeg,.tiff,.bmp";

const PLAN_LIMITS: Record<string, { docs: number; users: number }> = {
    free:       { docs: 20,        users: 5         },
    pro:        { docs: 500,       users: 25        },
    enterprise: { docs: 9_999_999, users: 9_999_999 },
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

const DocumentsPanel = ({ docs, setDocs, usage, plan }: {
    docs: DocFile[];
    setDocs: React.Dispatch<React.SetStateAction<DocFile[]>>;
    usage: Usage;
    plan: string;
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging,   setDragging]   = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filterCat,  setFilterCat]  = useState<string>("all");
    const [confirmDelete, setConfirmDelete] = useState<DocFile | null>(null);
    const [deleting,   setDeleting]   = useState<string | null>(null);

    // Category modal state
    const [showCatModal,  setShowCatModal]  = useState(false);
    const [newCatName,    setNewCatName]    = useState("");
    const [catError,      setCatError]      = useState<string | null>(null);

    // Upload modal state — pick category before upload
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadCatId,  setUploadCatId]  = useState<string>("");

    const limit = (PLAN_LIMITS[plan] ?? PLAN_LIMITS.free).docs;
    const usagePct = limit >= 9_999_999 ? 0 : Math.min(100, Math.round((usage.total_docs / limit) * 100));

    useEffect(() => {
        fetch("/categories", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setCategories(d.categories ?? []))
            .catch(() => {});
    }, []);

    const openUpload = (files: File[]) => {
        if (!files.length) return;
        setPendingFiles(files);
        setUploadCatId(categories[0]?.category_id ?? "");
    };

    const confirmUpload = async () => {
        const files = pendingFiles;
        setPendingFiles([]);

        for (const file of files) {
            const kb = file.size / 1024;
            const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
            const tmpId = `tmp-${Date.now()}-${Math.random()}`;
            const placeholder: DocFile = {
                doc_id: tmpId, name: file.name, size,
                size_bytes: file.size,
                uploaded: new Date().toISOString().slice(0, 10),
                status: "processing",
                category_id: uploadCatId || null,
                category_name: categories.find(c => c.category_id === uploadCatId)?.name ?? null,
            };
            setDocs(prev => [placeholder, ...prev]);
            setUploadError(null);

            try {
                const formData = new FormData();
                formData.append("file", file);
                if (uploadCatId) formData.append("category_id", uploadCatId);

                const res = await fetch("/upload", {
                    method: "POST",
                    headers: authHeaders(),
                    body: formData,
                });
                const data = await res.json();

                if (!res.ok) {
                    setUploadError(data.error ?? "Upload failed.");
                    setDocs(prev => prev.filter(d => d.doc_id !== tmpId));
                } else {
                    const doc = data.doc as { doc_id: string };
                    setDocs(prev => prev.map(d =>
                        d.doc_id === tmpId
                            ? { ...d, doc_id: doc.doc_id, status: "ready" }
                            : d
                    ));
                }
            } catch {
                setUploadError("Network error — could not reach the server.");
                setDocs(prev => prev.filter(d => d.doc_id !== tmpId));
            }
        }
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
                    + Upload Document
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    style={{ display: "none" }}
                    onChange={e => { openUpload(Array.from(e.target.files ?? [])); e.target.value = ""; }}
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
                onDrop={e => { e.preventDefault(); setDragging(false); openUpload(Array.from(e.dataTransfer.files)); }}
                onClick={() => fileRef.current?.click()}
            >
                <div className={styles.dropIcon}>D</div>
                <div className={styles.dropTitle}>Drag and drop files here</div>
                <div className={styles.dropSub}>PDF, Word, PowerPoint, Excel, images, TXT and more</div>
            </div>

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

            {/* Upload category picker modal */}
            {pendingFiles.length > 0 && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setPendingFiles([]); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Assign Category</h3>
                        <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                            Uploading {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}. Assign a category so employees can find them.
                        </p>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Category</label>
                            <select
                                className={styles.formSelect}
                                value={uploadCatId}
                                onChange={e => setUploadCatId(e.target.value)}
                            >
                                <option value="">No category</option>
                                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setPendingFiles([])}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={confirmUpload}>Upload</button>
                        </div>
                    </div>
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

    return (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal}>
                <h3 className={styles.modalTitle}>Permissions — {member.name}</h3>
                <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                    Select which document categories this employee can search and view. Unchecked categories are invisible to them.
                </p>

                {loading ? (
                    <div style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                ) : categories.length === 0 ? (
                    <div style={{ padding: "1rem 0", color: "var(--text-3)", fontSize: "0.85rem" }}>
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

                <div className={styles.permFooter}>
                    <span className={styles.permSummary}>
                        {granted.size} of {categories.length} categories accessible
                    </span>
                    <div className={styles.modalActions} style={{ marginTop: 0 }}>
                        <button className={styles.btnGhost} onClick={onClose}>Close</button>
                        <button className={styles.btnPrimary} onClick={save} disabled={saving || categories.length === 0}>
                            {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
                        </button>
                    </div>
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

    // Password state
    const [currentPw, setCurrentPw] = useState("");
    const [newPw,     setNewPw]     = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwSaving,  setPwSaving]  = useState(false);
    const [pwMsg,     setPwMsg]     = useState<{ ok: boolean; text: string } | null>(null);

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

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Danger Zone</div>
                    <p className={styles.dangerText}>
                        Deleting your organization will permanently remove all documents and team access. This cannot be undone.
                    </p>
                    <button className={styles.btnDanger}>Delete Organization</button>
                </div>
            </div>
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
                        user_id: m.user_id,
                        name:    m.name,
                        email:   m.email,
                        role:    m.role,
                        joined:  m.created_at ?? "",
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
                            {panel === "team"          && <TeamPanel team={team} setTeam={setTeam} />}
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
