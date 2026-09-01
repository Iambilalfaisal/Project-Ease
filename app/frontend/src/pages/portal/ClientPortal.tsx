import { useState, useEffect } from "react";
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
            <div className="flex min-h-screen flex-col bg-bg-0 font-sans text-ink-1">
                <nav className="flex h-[56px] shrink-0 items-center justify-between border-b border-border bg-bg-1 px-8 max-[641px]:px-4">
                    <span className="font-serif text-[1.1rem] font-bold tracking-tight text-gold">Project Ease</span>
                </nav>
                <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
                    <div className="h-[36px] w-[36px] animate-[spin_0.8s_linear_infinite] rounded-full border-[3px] border-border [border-top-color:var(--gold)]" />
                    <p className="mt-4 text-ink-3">Loading your portal…</p>
                </div>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error || !info) {
        return (
            <div className="flex min-h-screen flex-col bg-bg-0 font-sans text-ink-1">
                <nav className="flex h-[56px] shrink-0 items-center justify-between border-b border-border bg-bg-1 px-8 max-[641px]:px-4">
                    <span className="font-serif text-[1.1rem] font-bold tracking-tight text-gold">Project Ease</span>
                </nav>
                <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
                    <div className="mb-3 text-[2.5rem]">🔒</div>
                    <h2 className="m-0 mb-2 text-lg font-bold text-ink-1">Access Denied</h2>
                    <p className="m-0 text-[0.88rem] text-ink-2">{error ?? "Invalid or expired link."}</p>
                    <p className="m-0 mt-2 text-[0.88rem] text-ink-2">
                        Please contact your legal representative for a new link.
                    </p>
                </div>
            </div>
        );
    }

    // ── Portal ───────────────────────────────────────────────────────────────
    return (
        <div className="flex min-h-screen flex-col bg-bg-0 font-sans text-ink-1">
            {/* Nav */}
            <nav className="flex h-[56px] shrink-0 items-center justify-between border-b border-border bg-bg-1 px-8 max-[641px]:px-4">
                <span className="font-serif text-[1.1rem] font-bold tracking-tight text-gold">{info.org_name}</span>
                <span className="rounded-pill border border-border bg-bg-2 px-[0.65rem] py-[0.2rem] text-[0.75rem] font-medium tracking-[0.04em] text-ink-3">Client Portal</span>
            </nav>

            <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-8 py-10 max-[641px]:gap-4 max-[641px]:px-4 max-[641px]:py-5">
                {/* Welcome card */}
                <div className="flex items-center gap-5 rounded-[12px] border border-[rgba(184,150,76,0.25)] bg-[linear-gradient(135deg,rgba(184,150,76,0.08)_0%,var(--bg-1)_100%)] px-7 py-6 max-[641px]:flex-col max-[641px]:gap-3 max-[641px]:px-4 max-[641px]:py-[1.1rem]">
                    <div className="shrink-0 text-[2.25rem]">👤</div>
                    <div>
                        <h1 className="m-0 mb-[0.2rem] font-serif text-[1.35rem] font-bold text-ink-1">Welcome, {info.client_name}</h1>
                        {info.label && (
                            <p className="m-0 mb-[0.15rem] text-[0.88rem] text-ink-2">{info.label}</p>
                        )}
                        {info.client_email && (
                            <p className="m-0 text-[0.78rem] text-ink-3">{info.client_email}</p>
                        )}
                    </div>
                </div>

                {/* Matter info */}
                {info.matter_title && (
                    <div className="rounded-[10px] border border-border bg-bg-1 px-6 py-5">
                        <h2 className="m-0 mb-[0.85rem] text-[0.85rem] font-bold uppercase tracking-[0.06em] text-gold">Your Matter</h2>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 max-[641px]:grid-cols-2">
                            <div className="flex flex-col gap-[0.2rem]">
                                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-ink-3">Matter</span>
                                <span className="text-[0.88rem] font-medium text-ink-1">{info.matter_title}</span>
                            </div>
                            {info.matter_type && (
                                <div className="flex flex-col gap-[0.2rem]">
                                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-ink-3">Type</span>
                                    <span className="text-[0.88rem] font-medium text-ink-1">{info.matter_type}</span>
                                </div>
                            )}
                            {info.case_number && (
                                <div className="flex flex-col gap-[0.2rem]">
                                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-ink-3">Case No.</span>
                                    <span className="text-[0.88rem] font-medium text-ink-1">{info.case_number}</span>
                                </div>
                            )}
                            {info.court_name && (
                                <div className="flex flex-col gap-[0.2rem]">
                                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-ink-3">Court</span>
                                    <span className="text-[0.88rem] font-medium text-ink-1">{info.court_name}</span>
                                </div>
                            )}
                            {info.matter_status && (
                                <div className="flex flex-col gap-[0.2rem]">
                                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-ink-3">Status</span>
                                    <Badge tone={MATTER_STATUS_TONE[info.matter_status.toLowerCase()] ?? "gray"}>
                                        {info.matter_status}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Documents */}
                <div className="flex flex-col gap-[0.85rem]">
                    <h2 className="m-0 flex items-center gap-[0.6rem] text-[1rem] font-bold text-ink-1">
                        Your Documents
                        <span className="rounded-pill border border-border bg-bg-2 px-2 py-[0.1rem] text-xs font-semibold text-ink-3">{docs.length}</span>
                    </h2>

                    {docs.length === 0 ? (
                        <EmptyState message="No documents have been shared with you yet. Your legal representative will add documents here as your matter progresses." />
                    ) : (
                        <div className="flex flex-col gap-[0.6rem]">
                            {docs.map(doc => (
                                <div key={doc.doc_id} className="flex items-center gap-4 rounded-sm border border-border bg-bg-1 px-4 py-[0.85rem] transition-[border-color] duration-150 hover:border-gold max-[641px]:flex-wrap max-[641px]:gap-[0.6rem]">
                                    <div className="shrink-0 text-[1.3rem]">📄</div>
                                    <div className="min-w-0 flex-1 max-[641px]:min-w-0 max-[641px]:flex-[1_1_100%]">
                                        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] font-semibold text-ink-1">{doc.name}</div>
                                        <div className="mt-[0.15rem] text-xs text-ink-3">
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
                <div className="rounded-sm border border-border bg-bg-1 px-4 py-3 text-[0.75rem] leading-[1.5] text-ink-3">
                    🔒 This portal is secured by Project Ease. Your documents are encrypted and only accessible via this private link.
                    Do not share this URL with others.
                </div>
            </div>

            <footer className="border-t border-border px-8 py-4 text-center text-[0.75rem] text-ink-3">
                <span>Powered by <strong>Project Ease</strong> · {info.org_name}</span>
            </footer>
        </div>
    );
}
