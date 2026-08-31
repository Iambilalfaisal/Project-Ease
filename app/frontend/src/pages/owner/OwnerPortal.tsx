import { useState, useEffect, useRef } from "react";
import styles from "./OwnerPortal.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";
import { initOfflineSync, getPendingCount } from "../../offline/offlineQueue";

// ── Types ─────────────────────────────────────────────────────────────────────
// Extracted to ./types.ts — all domain interfaces + the Panel union live there now.

import type { Panel, DocFile, TeamMember, Usage, Client } from "./types";
import { fmtBytes, fmtDate } from "./types";

// ── Screens ───────────────────────────────────────────────────────────────────
// Each panel used to be defined inline in this file — they now live under
// ./screens, split into services/hooks/screens per panel/domain.

import { ClientsPanel } from "./screens/ClientsPanel";
import { MattersPanel } from "./screens/matters/MattersPanel";
import { IntelligencePanel } from "./screens/IntelligencePanel";
import { VakalatnamaPanel } from "./screens/VakalatnamaPanel";
import { CauseListPanel } from "./screens/CauseListPanel";
import { AuditPanel } from "./screens/AuditPanel";
import { OverviewPanel } from "./screens/OverviewPanel";
import { DocumentsPanel } from "./screens/DocumentsPanel";
import { TeamPanel } from "./screens/TeamPanel";
import { InvoicesPanel } from "./screens/InvoicesPanel";
import { CalendarPanel } from "./screens/CalendarPanel";
import { SubscriptionPanel } from "./screens/SubscriptionPanel";
import { SettingsPanel } from "./screens/SettingsPanel";
import { DraftingPanel } from "./screens/DraftingPanel";
import { DiaryPanel } from "./screens/DiaryPanel";
import { LegalNoticesPanel } from "./screens/LegalNoticesPanel";
import { OutstandingDuesPanel } from "./screens/OutstandingDuesPanel";
import { StaffPanel } from "./screens/StaffPanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
    const token = sessionStorage.getItem("pe_token") ?? "";
    return { Authorization: `Bearer ${token}` };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NAV: { id: Panel; icon: string; label: string }[] = [
    { id: "overview",     icon: "H", label: "Overview"     },
    { id: "documents",    icon: "D", label: "Documents"    },
    { id: "clients",      icon: "C", label: "Clients"      },
    { id: "matters",      icon: "M", label: "Matters"      },
    { id: "calendar",     icon: "K", label: "Calendar"     },
    { id: "invoices",     icon: "I", label: "Invoices"     },
    { id: "team",         icon: "T",  label: "Team"         },
    { id: "drafting",     icon: "Dr", label: "Drafting"     },
    { id: "diary",        icon: "📅", label: "Daily Diary"  },
    { id: "notices",      icon: "📨", label: "Legal Notices" },
    { id: "dues",         icon: "💰", label: "Outstanding Dues" },
    { id: "staff",        icon: "👥", label: "Staff & Salary" },
    { id: "causelist",    icon: "CL", label: "Cause List"   },
    { id: "vakalat",      icon: "VK", label: "Vakalatnama"  },
    { id: "intelligence", icon: "IN", label: "Intelligence"  },
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
    diary:        "Daily Diary",
    notices:      "Legal Notices",
    dues:         "Outstanding Dues",
    staff:        "Staff & Salary",
    causelist:    "Cause List",
    vakalat:      "Vakalatnama Register",
    intelligence: "Counsel & Judge Intelligence",
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
    diary:        "Today's court appearances and deadlines — printable & shareable",
    notices:      "Draft, dispatch and track 30-day legal notice responses",
    dues:         "Outstanding invoice aging — 0-30, 31-60, 60+ days overdue",
    staff:        "Munshi, junior associates — attendance and monthly salary",
    causelist:    "Daily court cause list — parse and match to your matters",
    vakalat:      "Cross-matter vakalatnama filing status register",
    intelligence: "Private notes on opposing counsel and judges",
};

// ── Task #173: Urdu UI translations ──────────────────────────────────────────
const NAV_LABELS_UR: Record<Panel, string> = {
    overview:     "جائزہ",
    documents:    "دستاویزات",
    clients:      "موکلین",
    matters:      "مقدمات",
    calendar:     "کیلنڈر",
    invoices:     "بل / فیس",
    team:         "ٹیم",
    drafting:     "مسودہ نویسی",
    diary:        "یومیہ ڈائری",
    notices:      "قانونی نوٹس",
    dues:         "واجبات",
    staff:        "عملہ و تنخواہ",
    causelist:    "فہرست مقدمات",
    vakalat:      "وکالت نامہ",
    intelligence: "مشاورت",
    audit:        "آڈٹ لاگ",
    subscription: "سبسکرپشن",
    settings:     "ترتیبات",
};

const PANEL_TITLES_UR: Record<Panel, string> = {
    overview:     "کام کی جگہ کا جائزہ",
    documents:    "دستاویزی کتب خانہ",
    clients:      "موکلین کا نظم",
    matters:      "مقدمات کا نظم",
    calendar:     "عدالتی کیلنڈر",
    invoices:     "بل اور فیس",
    team:         "ٹیم کے ارکان",
    drafting:     "مسودہ نویسی",
    audit:        "آڈٹ لاگ",
    subscription: "پلان اور سبسکرپشن",
    settings:     "ادارہ ترتیبات",
    diary:        "یومیہ ڈائری",
    notices:      "قانونی نوٹس",
    dues:         "واجبات",
    staff:        "عملہ و تنخواہ",
    causelist:    "فہرست مقدمات",
    vakalat:      "وکالت نامہ رجسٹر",
    intelligence: "وکیل اور جج کی معلومات",
};

const PANEL_SUBS_UR: Record<Panel, string> = {
    overview:     "فرم کی سرگرمیوں کا خلاصہ",
    documents:    "فرم کی دستاویزات اپ لوڈ اور منظم کریں",
    clients:      "موکلین کی تفصیلات کا نظم",
    matters:      "مقدمات اور متعلقہ دستاویزات کی نگرانی",
    calendar:     "سماعتیں، مہلتیں اور واٹس ایپ یادداشتیں",
    invoices:     "تمام مقدمات کی فیس اور بل",
    team:         "فرم تک رسائی کا نظم",
    drafting:     "مصنوعی ذہانت سے وکالت نامے اور دیگر دستاویزات",
    audit:        "لاگ ان، تلاش اور دستاویزی سرگرمی",
    subscription: "موجودہ پلان، استعمال اور ادائیگی",
    settings:     "فرم کی پروفائل اور ترجیحات",
    diary:        "آج کی عدالتی پیشیاں اور مہلتیں",
    notices:      "قانونی نوٹس کا اجراء، ارسال اور ردعمل",
    dues:         "واجب البقا بل — 30، 60 اور 60+ دن",
    staff:        "منشی اور عملہ — حاضری اور ماہانہ تنخواہ",
    causelist:    "روزانہ فہرست مقدمات — مطابقت سازی",
    vakalat:      "وکالت نامہ فائلنگ کی حیثیت",
    intelligence: "فریق مخالف اور ججوں کے نجی نوٹس",
};

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return <button className={styles.themeToggle} onClick={handle}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
};

// ── Disabled Feature Placeholder — Task #162 ─────────────────────────────────
const DisabledFeature = ({ name }: { name: string }) => (
    <div className={styles.panelContent} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 14, textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-1)" }}>{name} is disabled</div>
        <div style={{ color: "var(--text-3)", fontSize: 13, maxWidth: 360 }}>
            This feature has been turned off for your organisation by the platform administrator.<br />
            Contact support to have it re-enabled.
        </div>
    </div>
);

// ── Daily Diary Panel — Task #161 ────────────────────────────────────────────
interface DiaryHearing {
    hearing_id: string; title: string; hearing_time?: string;
    court_name?: string; judge_name?: string;
    matter_title?: string; case_number?: string; notes?: string;
}
interface DiaryDeadline {
    deadline_id: string; title: string; priority?: string;
    matter_title?: string; case_number?: string; notes?: string;
}

const OwnerPortal = () => {
    const [panel,    setPanel]    = useState<Panel>("overview");
    const [flags,    setFlags]    = useState<Record<string, boolean>>({});  // Task #162 feature flags
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
    const [lang,     setLang]     = useState<"en" | "ur">("en");  // Task #173
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [offlinePendingCount, setOfflinePendingCount] = useState(0);
    const [offlineSyncNotice,   setOfflineSyncNotice]   = useState<string | null>(null);

    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string; role: string; org: string } : { name: "Owner", email: "", role: "org_owner", org: "" };

    // Load documents, team, and org on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [docsRes, teamRes, orgRes, flagsRes] = await Promise.all([
                    fetch("/documents", { headers: authHeaders() }),
                    fetch("/team",      { headers: authHeaders() }),
                    fetch("/org",       { headers: authHeaders() }),
                    fetch("/org-flags", { headers: authHeaders() }),
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

                if (flagsRes.ok) {
                    const f = await flagsRes.json();
                    setFlags(f.flags ?? {});
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

    // Offline write queue: track connectivity + pending count, auto-flush on reconnect/focus.
    useEffect(() => {
        const goOnline  = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);

        const refreshCount = () => { getPendingCount().then(setOfflinePendingCount); };
        window.addEventListener("pe-offline-queued", refreshCount);
        refreshCount();

        const cleanupSync = initOfflineSync(authHeaders, (res) => {
            setOfflineSyncNotice(`✅ Synced ${res.flushed} queued update${res.flushed === 1 ? "" : "s"}.`);
            window.dispatchEvent(new CustomEvent("pe-offline-flushed"));
            refreshCount();
            setTimeout(() => setOfflineSyncNotice(null), 6000);
        });

        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
            window.removeEventListener("pe-offline-queued", refreshCount);
            cleanupSync();
        };
    }, []);

    const signOut = () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        window.location.hash = "/";
    };

    /** Returns true if a feature is enabled for this org (default true if flags not yet loaded) */
    const feat = (key: string) => flags[key] !== false;

    // Panels always visible regardless of flags
    const ALWAYS_ON: Panel[] = ["overview", "subscription", "settings"];
    // Filter nav by flags — always-on panels are never hidden
    const visibleNav = NAV.filter(({ id }) =>
        ALWAYS_ON.includes(id as Panel) || feat(id)
    );

    const navClick = (id: Panel) => {
        // If navigating to a disabled panel, redirect to overview
        if (!ALWAYS_ON.includes(id) && !feat(id)) { setPanel("overview"); setNavOpen(false); return; }
        setPanel(id); setNavOpen(false);
    };

    return (
        <div className={styles.shell}>
            {/* Offline / sync status banner */}
            {(!isOnline || offlinePendingCount > 0 || offlineSyncNotice) && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
                    textAlign: "center", padding: "0.4rem 1rem", fontSize: "0.82rem", fontWeight: 600,
                    background: offlineSyncNotice ? "#2d8a4e" : (!isOnline ? "#c97c2a" : "var(--gold)"),
                    color: "#fff",
                }}>
                    {offlineSyncNotice
                        ? offlineSyncNotice
                        : !isOnline
                            ? `📴 You're offline — hearing outcomes you log will be saved on this device and synced automatically once you're back online.${offlinePendingCount > 0 ? ` (${offlinePendingCount} queued)` : ""}`
                            : `⏳ ${offlinePendingCount} update${offlinePendingCount === 1 ? "" : "s"} queued from earlier — syncing…`}
                </div>
            )}

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

                <div className={styles.orgBadge} dir={lang === "ur" ? "rtl" : undefined}>
                    <div className={styles.orgBadgeName}>{orgName}</div>
                    <div className={styles.orgBadgeType}>{lang === "ur" ? "فرم مالک" : "Firm Owner"}</div>
                </div>

                <nav className={styles.nav}>
                    {visibleNav.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            className={`${styles.navItem} ${panel === id ? styles.navItemActive : ""}`}
                            onClick={() => navClick(id)}
                            dir={lang === "ur" ? "rtl" : undefined}
                        >
                            <span className={styles.navIconBox}>{icon}</span>
                            {lang === "ur" ? NAV_LABELS_UR[id] : label}
                        </button>
                    ))}

                    <div className={styles.navDivider} />

                    <button className={styles.navItemChat} onClick={() => { window.location.hash = "/app"; }}
                        dir={lang === "ur" ? "rtl" : undefined}>
                        <span className={styles.navIconBox}>A</span>
                        {lang === "ur" ? "سوال پوچھیں" : "Ask a Question"}
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.sidebarUserBox}>
                        <div className={styles.sidebarUserName}>{user.name}</div>
                        <div className={styles.sidebarUserRole} dir={lang === "ur" ? "rtl" : undefined}>
                            {lang === "ur" ? "فرم مالک" : "Firm Owner"}
                        </div>
                    </div>
                    <button
                        className={styles.themeToggle}
                        style={{ textAlign: lang === "ur" ? "right" : "left", width: "100%", marginBottom: "0.35rem" }}
                        onClick={() => { window.location.hash = "/settings"; }}
                        dir={lang === "ur" ? "rtl" : undefined}
                    >
                        {lang === "ur" ? "اکاؤنٹ ترتیبات" : "Account Settings"}
                    </button>
                    <button className={styles.signOutBtn} onClick={signOut}
                        dir={lang === "ur" ? "rtl" : undefined}>
                        {lang === "ur" ? "لاگ آؤٹ" : "Sign Out"}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className={styles.main}>
                <header className={styles.header}>
                    <div dir={lang === "ur" ? "rtl" : undefined}>
                        <h1 className={styles.headerTitle}>
                            {lang === "ur" ? PANEL_TITLES_UR[panel] : PANEL_TITLES[panel]}
                        </h1>
                        <p className={styles.headerSub}>
                            {lang === "ur" ? PANEL_SUBS_UR[panel] : PANEL_SUBS[panel]}
                        </p>
                    </div>
                    {/* Task #173: Language toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ display: "flex", border: "1px solid var(--border-md)", borderRadius: "8px", overflow: "hidden" }}>
                            <button
                                style={{
                                    padding: "0.4rem 0.75rem",
                                    fontSize: "0.78rem",
                                    fontWeight: lang === "en" ? 700 : 400,
                                    background: lang === "en" ? "var(--gold)" : "var(--bg-2)",
                                    color: lang === "en" ? "#fff" : "var(--text-2)",
                                    border: "none",
                                    cursor: "pointer",
                                    transition: "background 0.15s",
                                }}
                                onClick={() => setLang("en")}
                                title="Switch to English"
                            >EN</button>
                            <button
                                style={{
                                    padding: "0.4rem 0.75rem",
                                    fontSize: "0.85rem",
                                    fontFamily: "'Noto Nastaliq Urdu', serif",
                                    fontWeight: lang === "ur" ? 700 : 400,
                                    background: lang === "ur" ? "var(--gold)" : "var(--bg-2)",
                                    color: lang === "ur" ? "#fff" : "var(--text-2)",
                                    border: "none",
                                    cursor: "pointer",
                                    transition: "background 0.15s",
                                }}
                                onClick={() => setLang("ur")}
                                title="اردو میں تبدیل کریں"
                            >اردو</button>
                        </div>
                        <ThemeToggle />
                    </div>
                </header>

                <div className={styles.body}>
                    {loading ? (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                    ) : (
                        <>
                            {panel === "overview"      && <OverviewPanel orgName={orgName} docs={docs} team={team} usage={usage} />}
                            {panel === "documents"     && (feat("documents")    ? <DocumentsPanel docs={docs} setDocs={setDocs} usage={usage} plan={plan} onUpgrade={() => setPanel("subscription")} /> : <DisabledFeature name="Document Library" />)}
                            {panel === "clients"       && (feat("clients")      ? <ClientsPanel />      : <DisabledFeature name="Client Management" />)}
                            {panel === "matters"       && (feat("matters")      ? <MattersPanel />      : <DisabledFeature name="Matter Management" />)}
                            {panel === "calendar"      && (feat("calendar")     ? <CalendarPanel />     : <DisabledFeature name="Court Calendar" />)}
                            {panel === "invoices"      && (feat("invoices")     ? <InvoicesPanel />     : <DisabledFeature name="Invoices & Fees" />)}
                            {panel === "team"          && (feat("team")         ? <TeamPanel team={team} setTeam={setTeam} maxUsers={maxUsers} onUpgrade={() => setPanel("subscription")} /> : <DisabledFeature name="Team Members" />)}
                            {panel === "drafting"      && (feat("drafting")     ? <DraftingPanel />     : <DisabledFeature name="Document Drafting" />)}
                            {panel === "diary"         && (feat("diary")        ? <DiaryPanel />        : <DisabledFeature name="Daily Diary" />)}
                            {panel === "causelist"     && (feat("causelist")    ? <CauseListPanel />    : <DisabledFeature name="Cause List" />)}
                            {panel === "vakalat"       && (feat("vakalat")      ? <VakalatnamaPanel />  : <DisabledFeature name="Vakalatnama Register" />)}
                            {panel === "intelligence"  && (feat("intelligence") ? <IntelligencePanel /> : <DisabledFeature name="Counsel Intelligence" />)}
                            {panel === "audit"         && (feat("audit")        ? <AuditPanel />        : <DisabledFeature name="Audit Log" />)}
                            {panel === "notices"       && (feat("notices")      ? <LegalNoticesPanel /> : <DisabledFeature name="Legal Notices" />)}
                            {panel === "dues"          && (feat("dues")         ? <OutstandingDuesPanel /> : <DisabledFeature name="Outstanding Dues" />)}
                            {panel === "staff"         && (feat("staff")        ? <StaffPanel />        : <DisabledFeature name="Staff & Salary" />)}
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
