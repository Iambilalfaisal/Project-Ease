import { useState, useEffect, useRef } from "react";
import styles from "./OwnerPortal.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";

// -- Types --------------------------------------------------------------------

type Panel = "overview" | "documents" | "team" | "settings";

interface DocFile {
    id: string;
    name: string;
    size: string;
    uploaded: string;
    status: "ready" | "processing";
}

interface TeamMember {
    name: string;
    email: string;
    role: string;
    joined: string;
}

// -- Static placeholder data --------------------------------------------------

const PLACEHOLDER_DOCS: DocFile[] = [
    { id: "1", name: "Client_Contract_2025.pdf",     size: "1.2 MB", uploaded: "2025-07-10", status: "ready" },
    { id: "2", name: "Court_Order_Hassan_v_Ali.pdf", size: "840 KB", uploaded: "2025-07-12", status: "ready" },
    { id: "3", name: "Corporate_MOU_Draft.docx",     size: "320 KB", uploaded: "2025-07-14", status: "ready" },
];

const PLACEHOLDER_TEAM: TeamMember[] = [
    { name: "Firm Owner",  email: "owner@lawfirm.com",    role: "org_owner", joined: "2025-07-15" },
    { name: "Team Member", email: "employee@lawfirm.com", role: "employee",  joined: "2025-07-15" },
];

const ROLE_LABELS: Record<string, string> = {
    org_owner: "Firm Owner",
    employee:  "Employee",
};

// -- Nav config ---------------------------------------------------------------

const NAV: { id: Panel; icon: string; label: string }[] = [
    { id: "overview",   icon: "Home",  label: "Overview"   },
    { id: "documents",  icon: "Docs",  label: "Documents"  },
    { id: "team",       icon: "Team",  label: "Team"       },
    { id: "settings",   icon: "Gear",  label: "Settings"   },
];

const PANEL_TITLES: Record<Panel, string> = {
    overview:  "Workspace Overview",
    documents: "Document Library",
    team:      "Team Members",
    settings:  "Organization Settings",
};

const PANEL_SUBS: Record<Panel, string> = {
    overview:  "Your firm's activity at a glance",
    documents: "Upload and manage your firm's documents",
    team:      "Manage who has access to your workspace",
    settings:  "Firm profile and account preferences",
};

// -- Panels -------------------------------------------------------------------

const OverviewPanel = ({ orgName, docs, team }: { orgName: string; docs: DocFile[]; team: TeamMember[] }) => {
    const stats = [
        { label: "Documents",    value: docs.length,  icon: "D", sub: "In your library" },
        { label: "Team Members", value: team.length,  icon: "T", sub: "With access"     },
        { label: "Queries",      value: "--",         icon: "Q", sub: "Requires Azure"  },
        { label: "Storage Used", value: "--",         icon: "S", sub: "Requires Azure"  },
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

const DocumentsPanel = ({ docs, setDocs }: { docs: DocFile[]; setDocs: (d: DocFile[]) => void }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const addFile = (file: File) => {
        const kb = file.size / 1024;
        const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
        const newDoc: DocFile = {
            id:       Date.now().toString(),
            name:     file.name,
            size,
            uploaded: new Date().toISOString().slice(0, 10),
            status:   "processing",
        };
        setDocs([newDoc, ...docs]);
        // Simulate processing -> ready after 2s
        setTimeout(() => {
            setDocs(prev => prev.map(d => d.id === newDoc.id ? { ...d, status: "ready" } : d));
        }, 2000);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        Array.from(e.dataTransfer.files).forEach(addFile);
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={() => fileRef.current?.click()}>
                    + Upload Document
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={e => Array.from(e.target.files ?? []).forEach(addFile)}
                />
            </div>

            <div
                className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
            >
                <div className={styles.dropIcon}>D</div>
                <div className={styles.dropTitle}>Drag and drop files here</div>
                <div className={styles.dropSub}>PDF, Word, Excel, TXT supported</div>
            </div>

            {docs.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Size</th>
                                <th>Uploaded</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map(doc => (
                                <tr key={doc.id}>
                                    <td>
                                        <div className={styles.fileName}>
                                            <span className={styles.fileIcon}>F</span>
                                            {doc.name}
                                        </div>
                                    </td>
                                    <td className={styles.muted}>{doc.size}</td>
                                    <td className={styles.muted}>{doc.uploaded}</td>
                                    <td>
                                        {doc.status === "ready"
                                            ? <span className={styles.badgeGreen}>Ready</span>
                                            : <span className={styles.badgeAmber}>Processing...</span>
                                        }
                                    </td>
                                    <td>
                                        <button
                                            className={styles.actionBtnDanger}
                                            onClick={() => setDocs(docs.filter(d => d.id !== doc.id))}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const TeamPanel = ({ team, setTeam }: { team: TeamMember[]; setTeam: (t: TeamMember[]) => void }) => {
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", role: "employee" });

    const invite = () => {
        if (!form.name.trim() || !form.email.trim()) return;
        setTeam([...team, {
            name:   form.name,
            email:  form.email,
            role:   form.role,
            joined: new Date().toISOString().slice(0, 10),
        }]);
        setShowModal(false);
        setForm({ name: "", email: "", role: "employee" });
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{team.length} member{team.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
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
                        {team.map((m, i) => (
                            <tr key={m.email}>
                                <td><strong>{m.name}</strong></td>
                                <td className={styles.muted}>{m.email}</td>
                                <td>
                                    <span className={m.role === "org_owner" ? styles.badgeGold : styles.badgeGray}>
                                        {ROLE_LABELS[m.role] ?? m.role}
                                    </span>
                                </td>
                                <td className={styles.muted}>{m.joined}</td>
                                <td>
                                    {m.role !== "org_owner" && (
                                        <button
                                            className={styles.actionBtnDanger}
                                            onClick={() => setTeam(team.filter((_, j) => j !== i))}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Invite Team Member</h3>
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
        </div>
    );
};

const SettingsPanel = ({ orgName, setOrgName }: { orgName: string; setOrgName: (n: string) => void }) => {
    const raw = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string } : { name: "", email: "" };
    const [name, setName] = useState(orgName);
    const [saved, setSaved] = useState(false);

    const save = () => {
        setOrgName(name);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.settingsGrid}>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Organization Profile</div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Firm Name</label>
                        <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Industry</label>
                        <select className={styles.formSelect} defaultValue="Law Practice">
                            <option>Law Practice</option>
                            <option>CA / Accounting</option>
                            <option>Logistics</option>
                            <option>Financial Services</option>
                            <option>Other</option>
                        </select>
                    </div>
                    <button className={styles.btnPrimary} onClick={save}>
                        {saved ? "Saved!" : "Save Changes"}
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
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>New Password</label>
                        <input className={styles.formInput} type="password" placeholder="Leave blank to keep current" />
                    </div>
                    <button className={styles.btnGhost}>Change Password</button>
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

// -- Theme toggle (reusable) --------------------------------------------------

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return (
        <button className={styles.themeToggle} onClick={handle}>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
    );
};

// -- Shell --------------------------------------------------------------------

const OwnerPortal = () => {
    const [panel, setPanel]   = useState<Panel>("overview");
    const [docs,  setDocs]    = useState<DocFile[]>(PLACEHOLDER_DOCS);
    const [team,  setTeam]    = useState<TeamMember[]>(PLACEHOLDER_TEAM);
    const [orgName, setOrgName] = useState("Hassan & Associates");

    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string; role: string } : { name: "Owner", email: "", role: "org_owner" };

    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        window.location.hash = "/";
    };

    const goToChat = () => { window.location.hash = "/app"; };

    return (
        <div className={styles.shell}>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    Project<span className={styles.logoAccent}> Ease</span>
                </div>

                <div className={styles.orgBadge}>
                    <div className={styles.orgBadgeName}>{orgName}</div>
                    <div className={styles.orgBadgeType}>Law Practice</div>
                </div>

                <nav className={styles.nav}>
                    {NAV.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            className={`${styles.navItem} ${panel === id ? styles.navItemActive : ""}`}
                            onClick={() => setPanel(id)}
                        >
                            <span className={styles.navIconBox}>{icon[0]}</span>
                            {label}
                        </button>
                    ))}

                    <div className={styles.navDivider} />

                    <button className={styles.navItemChat} onClick={goToChat}>
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
                    {panel === "overview"  && <OverviewPanel orgName={orgName} docs={docs} team={team} />}
                    {panel === "documents" && <DocumentsPanel docs={docs} setDocs={setDocs} />}
                    {panel === "team"      && <TeamPanel team={team} setTeam={setTeam} />}
                    {panel === "settings"  && <SettingsPanel orgName={orgName} setOrgName={setOrgName} />}
                </div>
            </div>
        </div>
    );
};

export default OwnerPortal;
