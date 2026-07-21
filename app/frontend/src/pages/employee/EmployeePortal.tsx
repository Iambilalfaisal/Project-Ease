import { useState, useEffect, useRef } from "react";
import readNDJSONStream from "ndjson-readablestream";
import styles from "./EmployeePortal.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "chat" | "documents" | "profile";

interface PermittedCategory {
    category_id: string;
    name: string;
}

interface MyProfile {
    user_id: string;
    name: string;
    email: string;
    role: string;
    org_name: string;
    permitted_categories: PermittedCategory[];
}

interface DocFile {
    doc_id: string;
    filename: string;
    category_id: string | null;
    category_name: string | null;
    size_bytes: number;
    uploaded_at: string;
    status: "ready" | "processing" | "error";
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    citations?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
    const token = sessionStorage.getItem("pe_token") ?? "";
    return { Authorization: `Bearer ${token}` };
}

function fmtBytes(b: number): string {
    if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
    if (b >= 1024)      return `${Math.round(b / 1024)} KB`;
    return `${b} B`;
}

function fmtDate(iso: string): string {
    return iso ? iso.slice(0, 10) : "—";
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return <button className={styles.themeToggle} onClick={handle}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
};

// ── Chat Panel ────────────────────────────────────────────────────────────────

const EXAMPLES = [
    "What are the key clauses in this contract?",
    "Summarise the main obligations",
    "Are there any penalty clauses?",
    "What is the notice period mentioned?",
];

const ChatPanel = ({ orgName, categories }: { orgName: string; categories: PermittedCategory[] }) => {
    const [messages,      setMessages]      = useState<ChatMessage[]>([]);
    const [streamText,    setStreamText]    = useState("");
    const [input,         setInput]         = useState("");
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState<string | null>(null);
    const abortRef  = useRef<AbortController | null>(null);
    const anchorRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        anchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamText]);

    const send = async (question: string) => {
        const q = question.trim();
        if (!q || loading) return;
        setInput("");
        setError(null);

        const userMsg: ChatMessage = { role: "user", content: q };
        const history = [...messages, userMsg];
        setMessages(history);
        setLoading(true);
        setStreamText("");

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            const res = await fetch("/chat/stream", {
                method:  "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body:    JSON.stringify({
                    messages: history.map(m => ({ role: m.role, content: m.content })),
                    context: {
                        overrides: {
                            retrieval_mode:   "hybrid",
                            semantic_ranker:  true,
                            top:              5,
                            suggest_followup_questions: false,
                        }
                    },
                    session_state: null,
                }),
                signal: ctrl.signal,
            });

            if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

            let fullText  = "";
            let citations: string[] = [];

            for await (const event of readNDJSONStream(res.body)) {
                if (ctrl.signal.aborted) break;
                if (event.type === "response.context" && event.context?.data_points) {
                    citations = event.context.data_points.citations ?? [];
                } else if (event.type === "response.output_text.delta" && event.delta !== undefined) {
                    setLoading(false);
                    fullText += event.delta;
                    setStreamText(fullText);
                } else if (event.error) {
                    throw new Error(event.error);
                }
            }

            const assistantMsg: ChatMessage = { role: "assistant", content: fullText, citations };
            setMessages([...history, assistantMsg]);
            setStreamText("");
        } catch (e: any) {
            if (e?.name !== "AbortError") {
                setError(e?.message ?? "Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
            setStreamText("");
            abortRef.current = null;
        }
    };

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
    };

    const stop = () => { abortRef.current?.abort(); };

    const clear = () => {
        abortRef.current?.abort();
        setMessages([]);
        setStreamText("");
        setError(null);
        setInput("");
    };

    const isEmpty = messages.length === 0 && !loading;

    return (
        <div className={styles.chatShell}>
            <div className={styles.chatMessages}>
                {isEmpty ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>💬</div>
                        <div className={styles.emptyTitle}>Ask anything about your documents</div>
                        <div className={styles.emptySub}>
                            {categories.length > 0
                                ? `You have access to: ${categories.map(c => c.name).join(", ")}.`
                                : "Your manager hasn't granted access to any document categories yet."}
                        </div>
                        {categories.length > 0 && (
                            <div className={styles.exampleGrid}>
                                {EXAMPLES.map(ex => (
                                    <button key={ex} className={styles.exampleBtn} onClick={() => send(ex)}>
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <div key={i} className={`${styles.msgRow} ${msg.role === "user" ? styles.msgRowUser : styles.msgRowAssistant}`}>
                                <div className={`${styles.msgBubble} ${msg.role === "user" ? styles.msgBubbleUser : styles.msgBubbleAssistant}`}>
                                    {msg.content}
                                </div>
                                {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                                    <div className={styles.msgCitations}>
                                        {msg.citations.map(c => (
                                            <span key={c} className={styles.citationTag}>{c}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Streaming in-progress */}
                        {(loading || streamText) && (
                            <div className={`${styles.msgRow} ${styles.msgRowAssistant}`}>
                                <div className={`${styles.msgBubble} ${styles.msgBubbleAssistant}`}>
                                    {streamText || <span style={{ color: "var(--text-3)" }}>Searching your documents…</span>}
                                    {(loading || streamText) && <span className={styles.streamingDot} />}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{ color: "#e05260", fontSize: "0.85rem", padding: "0.5rem" }}>
                                ⚠ {error}
                            </div>
                        )}
                    </>
                )}
                <div ref={anchorRef} className={styles.chatScrollAnchor} />
            </div>

            <div className={styles.chatInputBar}>
                <div className={styles.chatInputRow}>
                    <textarea
                        className={styles.chatInput}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Ask a question about your documents…"
                        rows={1}
                        disabled={loading && !streamText}
                    />
                    {loading || streamText ? (
                        <button className={styles.sendBtn} onClick={stop}>Stop</button>
                    ) : (
                        <button className={styles.sendBtn} onClick={() => send(input)} disabled={!input.trim()}>
                            Ask
                        </button>
                    )}
                </div>
                {messages.length > 0 && (
                    <div className={styles.chatHint}>
                        Press Enter to send · Shift+Enter for new line ·{" "}
                        <button
                            onClick={clear}
                            style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: "inherit", padding: 0 }}
                        >
                            Clear chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Documents Panel ───────────────────────────────────────────────────────────

const DocumentsPanel = ({ docs }: { docs: DocFile[] }) => {
    if (docs.length === 0) {
        return (
            <div className={styles.panelContent}>
                <div className={styles.emptyDocs}>
                    No documents are accessible to you yet. Ask your manager to assign category permissions.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.panelContent}>
            <table className={styles.docTable}>
                <thead>
                    <tr>
                        <th>Document</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {docs.map(doc => (
                        <tr key={doc.doc_id}>
                            <td><span className={styles.docName}>{doc.filename}</span></td>
                            <td>
                                {doc.category_name
                                    ? <span className={styles.catBadge}>{doc.category_name}</span>
                                    : <span style={{ color: "var(--text-3)" }}>—</span>}
                            </td>
                            <td style={{ color: "var(--text-3)" }}>{fmtBytes(doc.size_bytes ?? 0)}</td>
                            <td style={{ color: "var(--text-3)" }}>{fmtDate(doc.uploaded_at ?? "")}</td>
                            <td>
                                {doc.status === "ready"      && <span className={styles.statusReady}>Ready</span>}
                                {doc.status === "processing" && <span className={styles.statusProc}>Processing…</span>}
                                {doc.status === "error"      && <span className={styles.statusError}>Error</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ── Profile Panel ─────────────────────────────────────────────────────────────

const ProfilePanel = ({ profile }: { profile: MyProfile }) => (
    <div className={styles.panelContent}>
        <div className={styles.profileGrid}>
            <div className={styles.profileCard}>
                <div className={styles.profileCardTitle}>Your Account</div>
                <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Full Name</span>
                    <span className={styles.profileValue}>{profile.name}</span>
                </div>
                <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Email</span>
                    <span className={styles.profileValue}>{profile.email}</span>
                </div>
                <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Role</span>
                    <span className={styles.profileValue}>Employee</span>
                </div>
                <div className={styles.profileRow}>
                    <span className={styles.profileLabel}>Organization</span>
                    <span className={styles.profileValue}>{profile.org_name}</span>
                </div>
            </div>

            <div className={styles.profileCard}>
                <div className={styles.profileCardTitle}>Document Access</div>
                {profile.permitted_categories.length === 0 ? (
                    <p className={styles.noCats}>
                        No categories assigned yet. Contact your manager to get access.
                    </p>
                ) : (
                    <>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: "0.85rem" }}>
                            You can search documents in these categories:
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            {profile.permitted_categories.map(c => (
                                <span key={c.category_id} className={styles.catChip}>{c.name}</span>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>
);

// ── Shell ─────────────────────────────────────────────────────────────────────

const NAV: { id: Panel; icon: string; label: string }[] = [
    { id: "chat",      icon: "Q", label: "Ask a Question" },
    { id: "documents", icon: "D", label: "My Documents"   },
    { id: "profile",   icon: "P", label: "Profile"        },
];

const PANEL_TITLES: Record<Panel, string> = {
    chat:      "Ask a Question",
    documents: "My Documents",
    profile:   "My Profile",
};

const PANEL_SUBS: Record<Panel, string> = {
    chat:      "Search and query your firm's documents using AI",
    documents: "Documents you have access to",
    profile:   "Your account and access permissions",
};

const EmployeePortal = () => {
    const [panel,   setPanel]   = useState<Panel>("chat");
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [docs,    setDocs]    = useState<DocFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [profileRes, docsRes] = await Promise.all([
                    fetch("/me",        { headers: authHeaders() }),
                    fetch("/documents", { headers: authHeaders() }),
                ]);
                if (profileRes.ok) setProfile(await profileRes.json());
                if (docsRes.ok) {
                    const d = await docsRes.json();
                    setDocs(d.documents ?? []);
                }
            } catch { /* silent fallback */ }
            setLoading(false);
        };
        load();
    }, []);

    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        window.location.hash = "/";
    };

    if (loading) {
        return <div className={styles.loadingWrap}>Loading…</div>;
    }

    const orgName    = profile?.org_name ?? "Your Organization";
    const userName   = profile?.name ?? "Employee";
    const categories = profile?.permitted_categories ?? [];

    return (
        <div className={styles.shell}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    Project<span className={styles.logoAccent}> Ease</span>
                </div>

                <div className={styles.orgBadge}>
                    <div className={styles.orgBadgeName}>{orgName}</div>
                    <div className={styles.orgBadgeRole}>Employee</div>
                </div>

                {categories.length > 0 && (
                    <div className={styles.catList}>
                        <div className={styles.catListLabel}>My Access</div>
                        {categories.map(c => (
                            <span key={c.category_id} className={styles.catChip}>{c.name}</span>
                        ))}
                    </div>
                )}

                <nav className={styles.nav}>
                    <div className={styles.navDivider} />
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
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.sidebarUserName}>{userName}</div>
                    <div className={styles.sidebarUserRole}>Employee</div>
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

                {panel === "chat"      && <ChatPanel orgName={orgName} categories={categories} />}
                {panel === "documents" && <DocumentsPanel docs={docs} />}
                {panel === "profile"   && profile && <ProfilePanel profile={profile} />}
            </div>
        </div>
    );
};

export default EmployeePortal;
