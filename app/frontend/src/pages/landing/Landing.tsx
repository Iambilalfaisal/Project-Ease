import { useState, useEffect, KeyboardEvent } from "react";
import styles from "./Landing.module.css";

type Modal = "signin" | "demo" | null;

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: "🔐",
        title: "Your Files Stay Completely Private",
        desc: "Every firm gets its own completely isolated workspace. Your documents are never mixed with another firm's — it's like having a private filing room that only your team can access."
    },
    {
        icon: "⚡",
        title: "Find Any Answer in Seconds",
        desc: "Ask any question about your documents in plain English or Urdu — just like asking a colleague. The system searches your entire library and returns a precise, sourced answer instantly."
    },
    {
        icon: "✅",
        title: "Answers You Can Actually Trust",
        desc: "Every response is automatically verified for accuracy before it reaches your team. You always see which document the answer came from, so you can act with complete confidence."
    },
    {
        icon: "🌐",
        title: "Works in English and Urdu",
        desc: "Type your question in English, Roman Urdu, or Urdu script — the system understands all three naturally. No language settings. Your team works however feels comfortable."
    },
    {
        icon: "📁",
        title: "Any Document, Any Format",
        desc: "Upload contracts, case files, tax returns, scanned documents, spreadsheets — any format. Everything is automatically read, organized, and made instantly searchable. No manual sorting needed."
    },
    {
        icon: "📈",
        title: "Simple Management Dashboard",
        desc: "See how your team is using the system, how quickly questions are being answered, and how accurate the results are — presented simply for partners and managers, not IT teams."
    }
];

const STEPS = [
    {
        n: "01",
        title: "Upload Your Documents",
        desc: "Upload contracts, case files, tax returns, audit reports — any format. Everything is read and organized automatically. No technical setup, no manual tagging."
    },
    {
        n: "02",
        title: "Ask in Plain Language",
        desc: "Type any question in English or Urdu, just like asking a colleague. The system searches across all your documents and finds exactly what you need — in seconds."
    },
    {
        n: "03",
        title: "Get a Clear, Sourced Answer",
        desc: "Receive a concise answer with the exact document and page it came from. Your team can verify the source instantly and act with complete confidence."
    }
];

const SECURITY_ROWS = [
    ["Your Firm's Files",         "Completely Isolated — Private to Your Team"],
    ["Sign-In Security",          "Verified Identity · Sessions Auto-Expire"],
    ["Inactivity Timeout",        "15 Minutes — Automatic Sign-Out"],
    ["Passwords",                 "Encrypted Beyond Recovery"],
    ["Files During Upload",       "Encrypted End-to-End"],
    ["Files in Storage",          "Bank-Grade Encryption at Rest"],
    ["Login Sessions",            "Expire Automatically for Safety"],
    ["Admin Access",              "Restricted to Authorised Personnel Only"],
];

const SECURITY_POINTS = [
    "All documents are encrypted — both while stored and while travelling to your screen",
    "Each firm's files are completely separated — your documents never touch another firm's",
    "Sessions automatically sign out after inactivity to prevent unauthorised access",
    "Each team member sees only what they are permitted to see — nothing more",
    "Passwords are encrypted in a way that even we cannot read them",
    "Multiple failed login attempts are automatically blocked to prevent break-ins",
    "Your firm's identity is verified at the server — not based on what a user types in",
];

const INDUSTRIES = [
    {
        icon: "⚖️",
        title: "Law Practices",
        desc: "Instant access to case precedents, contract clauses, court orders, and legal briefs. Search in English or Urdu and get cited answers your team can act on immediately.",
        tags: ["Contract Analysis", "Case Research", "Precedent Search", "Due Diligence"]
    },
    {
        icon: "📋",
        title: "CA & Accounting Firms",
        desc: "Navigate tax codes, audit reports, financial statements, and regulatory filings with AI precision. Surface the exact clause or figure your team needs in seconds.",
        tags: ["Tax Compliance", "Audit Documentation", "Regulatory Filings", "Financial Reports"]
    },
    {
        icon: "🚢",
        title: "Enterprise Logistics",
        desc: "Manage shipping manifests, vendor contracts, compliance records, and operational documents at scale. Instant cross-document search across your entire library.",
        tags: ["Shipping Manifests", "Vendor Contracts", "Compliance Records", "Operations"]
    }
];

const TRUST_BADGES = [
    "Law Practices", "CA & Accounting Firms", "Enterprise Logistics",
    "Financial Services", "Corporate Legal Teams", "Compliance Departments"
];

// ─── Component ───────────────────────────────────────────────────────────────

const Landing = () => {
    const [scrolled, setScrolled]     = useState(false);
    const [modal, setModal]           = useState<Modal>(null);
    const [demoSent, setDemoSent]     = useState(false);
    const [contactSent, setContactSent] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const open  = (m: Modal) => { setModal(m); setDemoSent(false); };
    const close = ()          => setModal(null);

    return (
        <div className={styles.page}>

            {/* ══════════════ NAVBAR ══════════════ */}
            <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
                <span className={styles.navLogo}>
                    Project<span className={styles.navLogoAccent}> Ease</span>
                </span>

                <ul className={styles.navLinks}>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#how-it-works">How It Works</a></li>
                    <li><a href="#security">Security</a></li>
                    <li><a href="#industries">Industries</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>

                <div className={styles.navActions}>
                    <button className={styles.btnGhost} onClick={() => open("signin")}>
                        Sign In
                    </button>
                    <button className={styles.btnGold} onClick={() => open("demo")}>
                        Request a Demo
                    </button>
                </div>
            </nav>

            {/* ══════════════ HERO ══════════════ */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroEyebrow}>
                        ✦ &nbsp;Enterprise Document Intelligence
                    </div>

                    <h1 className={styles.heroTitle}>
                        Intelligence That<br />
                        <span className={styles.heroTitleGold}>Earns Your Trust</span>
                    </h1>

                    <p className={styles.heroSub}>
                        Project Ease transforms how law practices, CA firms, and enterprise
                        organizations search, analyze, and act on their documents — with
                        verified AI precision, multi-tenant security, and answers in the
                        language you work in.
                    </p>

                    <div className={styles.heroCtas}>
                        <button
                            className={`${styles.btnGold} ${styles.btnGoldLg}`}
                            onClick={() => open("demo")}
                        >
                            Request a Demo &nbsp;→
                        </button>
                        <button
                            className={`${styles.btnGhost} ${styles.btnGhostLg}`}
                            onClick={() => open("signin")}
                        >
                            Sign In
                        </button>
                    </div>

                    <p className={styles.heroCaveat}>
                        Start with a free demo using your own documents. No commitment required.
                    </p>
                </div>
            </section>

            {/* ══════════════ TRUST BAR ══════════════ */}
            <div className={styles.trust}>
                <p className={styles.trustLabel}>
                    Built for professional excellence across industries
                </p>
                <div className={styles.trustBadges}>
                    {TRUST_BADGES.map(b => (
                        <span key={b} className={styles.trustBadge}>{b}</span>
                    ))}
                </div>
            </div>

            {/* ══════════════ FEATURES ══════════════ */}
            <div id="features">
                <div className={`${styles.section} ${styles.sectionCenter}`}>
                    <span className={styles.eyebrow}>Core Capabilities</span>
                    <h2 className={styles.sectionTitle}>
                        Built for Firms That Operate at the Highest Level
                    </h2>
                    <p className={styles.sectionSub}>
                        Everything your firm needs to work faster, stay protected,
                        and make better decisions — without needing any technical knowledge.
                    </p>
                    <div className={styles.featuresGrid}>
                        {FEATURES.map(f => (
                            <div key={f.title} className={styles.featureCard}>
                                <div className={styles.featureIcon}>{f.icon}</div>
                                <h3 className={styles.featureTitle}>{f.title}</h3>
                                <p className={styles.featureDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ HOW IT WORKS ══════════════ */}
            <div id="how-it-works" className={styles.stepsWrap}>
                <div className={`${styles.section} ${styles.sectionCenter}`}>
                    <span className={styles.eyebrow}>How It Works</span>
                    <h2 className={styles.sectionTitle}>
                        From Upload to Answer in Three Steps
                    </h2>
                    <p className={styles.sectionSub}>
                        No training courses. No IT department required. Your team is up and running the same day.
                    </p>
                    <div className={styles.stepsGrid}>
                        {STEPS.map(s => (
                            <div key={s.n} className={styles.step}>
                                <div className={styles.stepNumber}>{s.n}</div>
                                <h3 className={styles.stepTitle}>{s.title}</h3>
                                <p className={styles.stepDesc}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ SECURITY ══════════════ */}
            <div id="security" className={styles.securityWrap}>
                <div className={styles.securityInner}>
                    <div>
                        <span className={styles.eyebrow}>Enterprise Security</span>
                        <h2 className={styles.securityTitle}>
                            Security Designed for Client Confidentiality
                        </h2>
                        <p className={styles.securityDesc}>
                            Law firms and CA practices handle some of the most sensitive data
                            in existence. Project Ease was built with that responsibility at
                            the core — not as an afterthought.
                        </p>
                        <ul className={styles.securityPoints}>
                            {SECURITY_POINTS.map(p => (
                                <li key={p} className={styles.securityPoint}>
                                    <i className={styles.checkIcon}>✓</i>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.securityVisual}>
                        <div className={styles.securityVisualHeader}>
                            How We Keep You Safe
                        </div>
                        {SECURITY_ROWS.map(([label, value]) => (
                            <div key={label} className={styles.securityRow}>
                                <span className={styles.securityRowLabel}>{label}</span>
                                <span className={styles.securityRowValue}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ INDUSTRIES ══════════════ */}
            <div id="industries">
                <div className={`${styles.section} ${styles.sectionCenter}`}>
                    <span className={styles.eyebrow}>Who It's For</span>
                    <h2 className={styles.sectionTitle}>
                        Purpose-Built for Professional Industries
                    </h2>
                    <p className={styles.sectionSub}>
                        Tailored to the document workflows, terminology, and compliance
                        requirements of high-stakes professional environments.
                    </p>
                    <div className={styles.industriesGrid}>
                        {INDUSTRIES.map(ind => (
                            <div key={ind.title} className={styles.industryCard}>
                                <span className={styles.industryIcon}>{ind.icon}</span>
                                <h3 className={styles.industryTitle}>{ind.title}</h3>
                                <p className={styles.industryDesc}>{ind.desc}</p>
                                <div className={styles.industryTags}>
                                    {ind.tags.map(t => (
                                        <span key={t} className={styles.industryTag}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ REQUEST A DEMO ══════════════ */}
            <div id="demo" className={styles.demoWrap}>
                <div className={styles.demoInner}>
                    <div className={styles.demoLeft}>
                        <span className={styles.eyebrow}>Free Demo</span>
                        <h2 className={styles.sectionTitle}>
                            See It Work With<br />Your Own Documents
                        </h2>
                        <p className={styles.securityDesc}>
                            We'll set up a live demo using your actual documents so you can
                            see exactly how Project Ease performs for your firm — before any
                            commitment or payment.
                        </p>
                        <div className={styles.demoPoints}>
                            {[
                                "Live session using your real documents",
                                "No credit card or commitment required",
                                "We come to you — in person or over a call",
                                "Full Q&A with the team after the demo",
                            ].map(p => (
                                <div key={p} className={styles.demoPoint}>
                                    <i className={styles.checkIcon}>✓</i>
                                    <span>{p}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.demoFormCard}>
                        {contactSent ? (
                            <div className={styles.successMsg}>
                                <div className={styles.successIcon}>✓</div>
                                <h3 className={styles.successTitle}>Request Received</h3>
                                <p className={styles.successSub}>
                                    Thank you. We'll reach out within 24 hours to schedule your demo.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 className={styles.demoFormTitle}>Request Your Demo</h3>
                                <p className={styles.demoFormSub}>Fill in your details and we'll be in touch.</p>

                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>First Name</label>
                                        <input className={styles.formInput} type="text" placeholder="Hassan" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Last Name</label>
                                        <input className={styles.formInput} type="text" placeholder="Nasir" />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Firm / Company Name</label>
                                    <input className={styles.formInput} type="text" placeholder="Hassan & Associates" />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Industry</label>
                                    <select className={styles.formSelect} defaultValue="">
                                        <option value="" disabled>Select your industry</option>
                                        <option value="law">Law Practice</option>
                                        <option value="ca">CA / Accounting Firm</option>
                                        <option value="logistics">Logistics & Supply Chain</option>
                                        <option value="finance">Financial Services</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Work Email</label>
                                    <input className={styles.formInput} type="email" placeholder="partner@lawfirm.com" />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Phone (optional)</label>
                                    <input className={styles.formInput} type="tel" placeholder="+92 300 0000000" />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>What are you looking to solve?</label>
                                    <textarea
                                        className={styles.formTextarea}
                                        rows={3}
                                        placeholder="e.g. We want to search across 5 years of case files instantly..."
                                    />
                                </div>

                                {/* TODO: wire to POST /demo/request */}
                                <button
                                    className={styles.formSubmit}
                                    onClick={() => setContactSent(true)}
                                >
                                    Request Demo &nbsp;→
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════ CONTACT ══════════════ */}
            <div id="contact" className={styles.contactWrap}>
                <div className={`${styles.section} ${styles.sectionCenter}`}>
                    <span className={styles.eyebrow}>Get in Touch</span>
                    <h2 className={styles.sectionTitle}>Have Questions? Let's Talk.</h2>
                    <p className={styles.sectionSub}>
                        Whether you want a demo, have a technical question, or want to discuss
                        pricing — we're here.
                    </p>
                    <div className={styles.contactCards}>
                        <a href="mailto:hasan.nasir.acmeone@gmail.com" className={styles.contactCard}>
                            <span className={styles.contactIcon}>✉</span>
                            <span className={styles.contactCardLabel}>Email Us</span>
                            <span className={styles.contactCardValue}>hasan.nasir.acmeone@gmail.com</span>
                        </a>
                        <a href="https://wa.me/923000000000" className={styles.contactCard} target="_blank" rel="noreferrer">
                            <span className={styles.contactIcon}>💬</span>
                            <span className={styles.contactCardLabel}>WhatsApp</span>
                            <span className={styles.contactCardValue}>Message us directly</span>
                        </a>
                        <div className={styles.contactCard} onClick={() => open("demo")} style={{ cursor: "pointer" }}>
                            <span className={styles.contactIcon}>📅</span>
                            <span className={styles.contactCardLabel}>Book a Demo</span>
                            <span className={styles.contactCardValue}>We come to you</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════ FOOTER ══════════════ */}
            <footer className={styles.footer}>
                <span className={styles.footerLogo}>Project Ease</span>
                <span className={styles.footerCopy}>© 2025 Project Ease. All rights reserved.</span>
                <div className={styles.footerRight}>
                    <a href="mailto:hasan.nasir.acmeone@gmail.com" className={styles.footerContact}>
                        hasan.nasir.acmeone@gmail.com
                    </a>
                </div>
            </footer>

            {/* ══════════════ MODALS ══════════════ */}
            {modal && (
                <div
                    className={styles.overlay}
                    onClick={e => { if (e.target === e.currentTarget) close(); }}
                >
                    <div className={styles.modal}>
                        <button className={styles.modalClose} onClick={close}>✕</button>

                        {modal === "signin"
                            ? <SignInForm />
                            : <DemoModal sent={demoSent} onSend={() => setDemoSent(true)} onSwitch={() => open("signin")} />
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Sign In Modal ────────────────────────────────────────────────────────────

const SignInForm = () => {
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    const submit = async () => {
        setError("");
        if (!email || !password) { setError("Please enter your email and password."); return; }
        setLoading(true);
        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Invalid email or password."); return; }
            sessionStorage.setItem("pe_token", data.token);
            sessionStorage.setItem("pe_user", JSON.stringify(data.user));
            // Route by role — admin goes to /admin dashboard, everyone else to /app
            const role: string = data.user?.role ?? "";
            window.location.hash = role === "platform_admin" ? "/admin" : role === "org_owner" ? "/owner" : "/app";
        } catch {
            setError("Could not reach the server. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") submit(); };

    return (
        <>
            <h2 className={styles.modalTitle}>Welcome back</h2>
            <p className={styles.modalSub}>Sign in to your organization's workspace.</p>

            {error && <p className={styles.formError}>{error}</p>}

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email</label>
                <input
                    className={styles.formInput}
                    type="email"
                    placeholder="admin@gmail.com"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={onKey}
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Password</label>
                <input
                    className={styles.formInput}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={onKey}
                />
            </div>

            <button className={styles.formSubmit} onClick={submit} disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
            </button>
        </>
    );
};

// ─── Demo Request Modal ───────────────────────────────────────────────────────

const DemoModal = ({
    sent,
    onSend,
    onSwitch,
}: {
    sent: boolean;
    onSend: () => void;
    onSwitch: () => void;
}) => {
    if (sent) {
        return (
            <div className={styles.successMsg}>
                <div className={styles.successIcon}>&#10003;</div>
                <h3 className={styles.successTitle}>Request Received</h3>
                <p className={styles.successSub}>
                    Thank you. We will reach out within 24 hours to schedule your demo.
                </p>
            </div>
        );
    }

    return (
        <>
            <h2 className={styles.modalTitle}>Request a Demo</h2>
            <p className={styles.modalSub}>
                We will set up a live session using your own documents. Free, no commitment.
            </p>

            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>First Name</label>
                    <input className={styles.formInput} type="text" placeholder="Hassan" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Last Name</label>
                    <input className={styles.formInput} type="text" placeholder="Nasir" />
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Firm Name</label>
                <input className={styles.formInput} type="text" placeholder="Hassan & Associates" />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Work Email</label>
                <input className={styles.formInput} type="email" placeholder="partner@lawfirm.com" />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Industry</label>
                <select className={styles.formSelect} defaultValue="">
                    <option value="" disabled>Select industry</option>
                    <option value="law">Law Practice</option>
                    <option value="ca">CA / Accounting Firm</option>
                    <option value="logistics">Logistics & Supply Chain</option>
                    <option value="finance">Financial Services</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {/* TODO: wire to POST /demo/request + send email notification */}
            <button className={styles.formSubmit} onClick={onSend}>
                Request Demo &nbsp;&rarr;
            </button>

            <p className={styles.formSwitch}>
                Already a client?&nbsp;
                <button className={styles.formSwitchBtn} onClick={onSwitch}>Sign in</button>
            </p>
        </>
    );
};

export default Landing;
