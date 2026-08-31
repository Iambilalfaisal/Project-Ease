import { useState, useEffect } from "react";
import styles from "./ClientPortal.module.css";
import { Badge, Button, EmptyState, BadgeTone } from "../../components/ui";

const MATTER_STATUS_TONE: Record<string, BadgeTone> = {
    active: "green", closed: "gray", pending: "gold", settled: "blue",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortalInfo {
    client_name:   string;
    client_email:  string | null;
    client_phone:  string | null;
    matter_title:  string | null;
    matter_type:   string | null;
    case_number:   string | null;
    court_name:    string | null;
    matter_status: string | null;
    org_name:      string;
    label:         string | null;
}

interface PortalDoc {
    doc_id:        string;
    name:          string;
    size_bytes:    number;
    status:        string;
    uploaded_at:   string;
    category_name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024)        return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
}

function fmtDate(iso: string): string {
    return iso ? iso.slice(0, 10) : "";
}

function getToken(): string {
    const hash   = window.location.hash; // e.g. "#/portal?token=xxx"
    const search = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
    return new URLSearchParams(search).get("token") ?? "";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientPortal() {
    const [info,       setInfo]       = useState<PortalInfo | null>(null);
    const [docs,       setDocs]       = useState<PortalDoc[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    const token = getToken();

    useEffect(() => {
        if (!token) {
            setError("No access token found in URL. Please use the link provided by your legal representative.");
            setLoading(false);
            return;
        }
        const load = async () => {
            try {
                const [meRes, docsRes] = await Promise.all([
                    fetch(`/portal/me?token=${encodeURIComponent(token)}`),
                    fetch(`/portal/documents?token=${encodeURIComponent(token)}`),
                ]);
                if (!meRes.ok) {
                    const d = await meRes.json();
                    setError(d.error ?? "Access denied. Your link may have expired.");
                    return;
                }
                setInfo(await meRes.json());
                if (docsRes.ok) setDocs(await docsRes.json());
            } catch {
                setError("Could not connect to the server. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const download = async (doc: PortalDoc) => {
        setDownloading(doc.doc_id);
        try {
            const res = await fetch(`/portal/documents/${doc.doc_id}/download?token=${encodeURIComponent(token)}`);
            if (!res.ok) { alert("Download failed — the file may not be available."); return; }
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = doc.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setDownloading(null);
        }
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className={styles.page}>
                <nav className={styles.nav}><span className={styles.navLogo}>Project Ease</span></nav>
                <div className={styles.centered}>
                    <div className={styles.spinner} />
                    <p style={{ color: "var(--text-3)", marginTop: "1rem" }}>Loading your portal…</p>
                </div>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error || !info) {
        return (
            <div className={styles.page}>
                <nav className={styles.nav}><span className={styles.navLogo}>Project Ease</span></nav>
                <div className={styles.centered}>
                    <div className={styles.errorIcon}>🔒</div>
                    <h2 className={styles.errorTitle}>Access Denied</h2>
                    <p className={styles.errorSub}>{error ?? "Invalid or expired link."}</p>
                    <p className={styles.errorSub} style={{ marginTop: "0.5rem" }}>
                        Please contact your legal representative for a new link.
                    </p>
                </div>
            </div>
        );
    }

    // ── Portal ───────────────────────────────────────────────────────────────
    return (
        <div className={styles.page}>
            {/* Nav */}
            <nav className={styles.nav}>
                <span className={styles.navLogo}>{info.org_name}</span>
                <span className={styles.navTag}>Client Portal</span>
            </nav>

            <div className={styles.content}>
                {/* Welcome card */}
                <div className={styles.welcomeCard}>
                    <div className={styles.welcomeIcon}>👤</div>
                    <div>
                        <h1 className={styles.welcomeTitle}>Welcome, {info.client_name}</h1>
                        {info.label && (
                            <p className={styles.welcomeSub}>{info.label}</p>
                        )}
                        {info.client_email && (
                            <p className={styles.welcomeMeta}>{info.client_email}</p>
                        )}
                    </div>
                </div>

                {/* Matter info */}
                {info.matter_title && (
                    <div className={styles.matterCard}>
                        <h2 className={styles.matterTitle}>Your Matter</h2>
                        <div className={styles.matterGrid}>
                            <div className={styles.matterField}>
                                <span className={styles.matterLabel}>Matter</span>
                                <span className={styles.matterValue}>{info.matter_title}</span>
                            </div>
                            {info.matter_type && (
                                <div className={styles.matterField}>
                                    <span className={styles.matterLabel}>Type</span>
                                    <span className={styles.matterValue}>{info.matter_type}</span>
                                </div>
                            )}
                            {info.case_number && (
                                <div className={styles.matterField}>
                                    <span className={styles.matterLabel}>Case No.</span>
                                    <span className={styles.matterValue}>{info.case_number}</span>
                                </div>
                            )}
                            {info.court_name && (
                                <div className={styles.matterField}>
                                    <span className={styles.matterLabel}>Court</span>
                                    <span className={styles.matterValue}>{info.court_name}</span>
                                </div>
                            )}
                            {info.matter_status && (
                                <div className={styles.matterField}>
                                    <span className={styles.matterLabel}>Status</span>
                                    <Badge tone={MATTER_STATUS_TONE[info.matter_status.toLowerCase()] ?? "gray"}>
                                        {info.matter_status}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Documents */}
                <div className={styles.docsSection}>
                    <h2 className={styles.docsTitle}>
                        Your Documents
                        <span className={styles.docsCount}>{docs.length}</span>
                    </h2>

                    {docs.length === 0 ? (
                        <EmptyState message="No documents have been shared with you yet. Your legal representative will add documents here as your matter progresses." />
                    ) : (
                        <div className={styles.docList}>
                            {docs.map(doc => (
                                <div key={doc.doc_id} className={styles.docRow}>
                                    <div className={styles.docIcon}>📄</div>
                                    <div className={styles.docInfo}>
                                        <div className={styles.docName}>{doc.name}</div>
                                        <div className={styles.docMeta}>
                                            {fmtBytes(doc.size_bytes)}
                                            {doc.uploaded_at && ` · Added ${fmtDate(doc.uploaded_at)}`}
                                            {doc.category_name && ` · ${doc.category_name}`}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => download(doc)}
                                        loading={downloading === doc.doc_id}
                                    >
                                        ↓ Download
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer note */}
                <div className={styles.securityNote}>
                    🔒 This portal is secured by Project Ease. Your documents are encrypted and only accessible via this private link.
                    Do not share this URL with others.
                </div>
            </div>

            <footer className={styles.footer}>
                <span>Powered by <strong>Project Ease</strong> · {info.org_name}</span>
            </footer>
        </div>
    );
}
