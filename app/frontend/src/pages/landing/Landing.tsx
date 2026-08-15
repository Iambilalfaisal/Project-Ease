import { useState, useEffect, KeyboardEvent, MouseEvent } from "react";
import styles from "./Landing.module.css";

type Modal = "signin" | "signup" | "demo" | "forgot" | "reset" | null;

const PK_CITIES = [
    "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
    "Hyderabad", "Abbottabad", "Bahawalpur", "Sukkur", "Dera Ghazi Khan",
];

const PRACTICE_AREAS = [
    "Corporate & Commercial",
    "Criminal Defence",
    "Family & Personal Law",
    "Civil Litigation",
    "Property & Real Estate",
    "Tax & Revenue",
    "Constitutional & Public Law",
    "Banking & Finance",
    "Labour & Employment",
    "Intellectual Property",
];

const SIGNUP_PLANS = [
    { id: "starter",    label: "Starter",      price: "PKR 5,999 / month",  users: "Up to 5 users"  },
    { id: "pro",        label: "Pro",          price: "PKR 14,999 / month", users: "Up to 20 users" },
    { id: "enterprise", label: "Enterprise",   price: "PKR 34,999 / month", users: "Unlimited users" },
];

const PLANS = [
    {
        id:       "trial",
        label:    "14-Day Trial",
        price:    "Free",
        period:   "",
        docs:     "10 documents",
        users:    "2 users",
        features: ["Full AI search", "Document upload", "English & Urdu queries", "Email support"],
        popular:  false,
        cta:      "Start Free Trial",
    },
    {
        id:       "starter",
        label:    "Starter",
        price:    "PKR 5,999",
        period:   "/ month",
        docs:     "75 documents",
        users:    "5 users",
        features: ["Everything in Trial", "Court calendar", "Fee tracking", "Invoice generation"],
        popular:  false,
        cta:      "Get Started",
    },
    {
        id:       "pro",
        label:    "Pro",
        price:    "PKR 14,999",
        period:   "/ month",
        docs:     "500 documents",
        users:    "20 users",
        features: ["Everything in Starter", "Priority support", "Audit log export", "WhatsApp reminders"],
        popular:  true,
        cta:      "Get Started",
    },
    {
        id:       "enterprise",
        label:    "Enterprise",
        price:    "PKR 34,999",
        period:   "/ month",
        docs:     "Unlimited",
        users:    "Unlimited users",
        features: ["Everything in Pro", "Dedicated onboarding", "Custom integrations", "SLA guarantee"],
        popular:  false,
        cta:      "Contact Us",
    },
];

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: "⚖️",
        title: "Built for Pakistani Courts",
        desc: "Search across PLD, SCMR, and MLD volumes alongside your firm's own case files. Ask 'What did the Lahore High Court hold on adverse possession?' and get a cited answer instantly.",
    },
    {
        icon: "⚡",
        title: "Find Any Answer in Seconds",
        desc: "Ask any question about your documents in plain English or Urdu — just like asking a colleague. The system searches your entire library and returns a precise, sourced answer instantly.",
    },
    {
        icon: "✅",
        title: "Answers You Can Actually Trust",
        desc: "Every response is automatically verified for accuracy before it reaches your team. You always see which document the answer came from — cite it, rely on it, act on it.",
    },
    {
        icon: "🌐",
        title: "English, Roman Urdu, or Urdu Script",
        desc: "Type your question however your team thinks. The system understands all three naturally. No language settings to configure. Your advocates and clerks work in the language they prefer.",
    },
    {
        icon: "📁",
        title: "Any Document, Any Format",
        desc: "Upload vakalatnamas, plaints, FIR copies, property deeds, tax returns, scanned court orders — any format. Everything is read, organized, and made instantly searchable without manual tagging.",
    },
    {
        icon: "🗓️",
        title: "Court Calendar & WhatsApp Reminders",
        desc: "Track hearing dates, filing deadlines, and adjournments in one calendar. Receive WhatsApp reminders the day before so no court date is ever missed.",
    },
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
        title: "Litigation & Advocacy",
        desc: "Search your case files, court orders, and PLD judgments in one query. Draft arguments citing real precedents. Track hearings at the Lahore, Sindh, and Islamabad High Courts with WhatsApp reminders the day before.",
        tags: ["PLD / SCMR Search", "Precedent Research", "Hearing Tracker", "Court Order Analysis"],
    },
    {
        icon: "🏢",
        title: "Corporate & Commercial Law",
        desc: "Analyse contracts, shareholder agreements, SECP filings, and M&A documents at speed. Ask 'What are the termination clauses in this agreement?' and get an exact answer with the clause number.",
        tags: ["Contract Review", "Due Diligence", "SECP Compliance", "M&A Documents"],
    },
    {
        icon: "📋",
        title: "CA & Tax Practices",
        desc: "Navigate the Income Tax Ordinance, Sales Tax Act, and FBR circulars alongside your client files. Surface the exact provision or ruling your team needs in seconds — cited to the source.",
        tags: ["FBR Circulars", "Tax Ordinance Search", "Audit Documentation", "Regulatory Filings"],
    },
];

const TRUST_BADGES = [
    "⚖️  High Court Advocates",
    "🏛️  Supreme Court Practices",
    "📋  District Court Firms",
    "🏢  Corporate Legal Teams",
    "📑  CA & Accounting Firms",
    "🏗️  Commercial Law Chambers",
];

// ─── Component ───────────────────────────────────────────────────────────────

const Landing = () => {
    const [scrolled, setScrolled]       = useState(false);
    const [modal, setModal]             = useState<Modal>(null);
    const [demoSent, setDemoSent]       = useState(false);
    const [contactSent, setContactSent] = useState(false);
    const [resetToken, setResetToken]   = useState<string | null>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Detect password reset token in URL hash: /#/?reset_token=xxx
    useEffect(() => {
        const hash   = window.location.hash;          // "#/?reset_token=xxx"
        const search = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
        const tok    = new URLSearchParams(search).get("reset_token");
        if (tok) { setResetToken(tok); setModal("reset"); }
    }, []);

    const open  = (m: Modal) => { setModal(m); setDemoSent(false); };
    const close = ()          => setModal(null);

    // Plain href="#id" anchors don't work here — this app uses createHashRouter,
    // so the hash IS the router's path and "#features" gets matched as a route
    // (there is none), landing on the router's default 404 instead of scrolling.
    // Scroll manually and never touch location.hash.
    const scrollToSection = (id: string) => (e: MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className={styles.page}>

            {/* ══════════════ NAVBAR ══════════════ */}
            <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
                <span className={styles.navLogo}>
                    Project<span className={styles.navLogoAccent}> Ease</span>
                </span>

                <ul className={styles.navLinks}>
                    <li><a href="#features" onClick={scrollToSection("features")}>Features</a></li>
                    <li><a href="#pld" onClick={scrollToSection("pld")}>PLD / SCMR</a></li>
                    <li><a href="#pricing" onClick={scrollToSection("pricing")}>Pricing</a></li>
                    <li><a href="#security" onClick={scrollToSection("security")}>Security</a></li>
                    <li><a href="#contact" onClick={scrollToSection("contact")}>Contact</a></li>
                </ul>

                <div className={styles.navActions}>
                    <a
                        href="https://wa.me/923224255722?text=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20Project%20Ease"
                        className={styles.btnWa}
                        target="_blank"
                        rel="noreferrer"
                    >
                        💬 WhatsApp
                    </a>
                    <button className={styles.btnGhost} onClick={() => open("signin")}>
                        Sign In
                    </button>
                    <button className={styles.btnGold} onClick={() => open("signup")}>
                        Free Trial
                    </button>
                </div>
            </nav>

            {/* ══════════════ HERO ══════════════ */}
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroEyebrow}>
                        ✦ &nbsp;AI Document Intelligence for Pakistan's Legal Profession
                    </div>

                    <h1 className={styles.heroTitle}>
                        Your Entire Case Library —<br />
                        <span className={styles.heroTitleGold}>Answered in Seconds</span>
                    </h1>

                    <p className={styles.heroSub}>
                        Search PLD judgments, SCMR precedents, contracts, and your own case
                        files in one query. Ask in English or Urdu. Get a cited, verified
                        answer your team can act on — instantly.
                    </p>

                    <div className={styles.heroCtas}>
                        <button
                            className={`${styles.btnGold} ${styles.btnGoldLg}`}
                            onClick={() => open("signup")}
                        >
                            Start 14-Day Free Trial &nbsp;→
                        </button>
                        <a
                            href="https://wa.me/923224255722?text=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20Project%20Ease"
                            className={`${styles.btnWa} ${styles.btnWaLg}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            💬 &nbsp;Chat on WhatsApp
                        </a>
                    </div>

                    <p className={styles.heroCaveat}>
                        Free for 14 days · No credit card · Setup in under 10 minutes
                    </p>
                </div>
            </section>

            {/* ══════════════ TRUST BAR ══════════════ */}
            <div className={styles.trust}>
                <p className={styles.trustLabel}>
                    Trusted by legal professionals across Pakistan
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
                        Built for Pakistan's Legal Professionals
                    </h2>
                    <p className={styles.sectionSub}>
                        Everything your firm needs to research faster, never miss a court date,
                        and bill more accurately — without any technical knowledge.
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
                        Designed for Every Practice Area
                    </h2>
                    <p className={styles.sectionSub}>
                        Whether you practise at the Supreme Court, a district court, or a
                        corporate chamber — Project Ease speaks your language and knows your documents.
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

            {/* ══════════════ PLD / SCMR CALLOUT ══════════════ */}
            <div id="pld" className={styles.pldWrap}>
                <div className={styles.pldInner}>
                    <div className={styles.pldText}>
                        <span className={styles.eyebrow}>Pakistani Case Law</span>
                        <h2 className={styles.sectionTitle}>
                            PLD & SCMR — At Your<br />Fingertips
                        </h2>
                        <p className={styles.securityDesc}>
                            Pakistan Law Digest (PLD) and Supreme Court Monthly Review (SCMR)
                            contain decades of binding precedent. Finding the right judgment
                            used to take hours of manual searching.
                        </p>
                        <p className={styles.securityDesc} style={{ marginTop: "0.75rem" }}>
                            With Project Ease, you upload your PLD volumes and SCMR reports
                            alongside your own case files. Then ask a single question — and the
                            system searches all of them at once, returning a cited answer with
                            the exact volume, year, and page.
                        </p>
                        <div className={styles.pldBadges}>
                            <span className={styles.pldBadge}>PLD volumes</span>
                            <span className={styles.pldBadge}>SCMR reports</span>
                            <span className={styles.pldBadge}>MLD judgments</span>
                            <span className={styles.pldBadge}>CLC decisions</span>
                            <span className={styles.pldBadge}>Your own case files</span>
                        </div>
                    </div>
                    <div className={styles.pldVisual}>
                        <div className={styles.pldCard}>
                            <div className={styles.pldCardQ}>
                                "What did the Supreme Court hold on adverse possession in agricultural land disputes?"
                            </div>
                            <div className={styles.pldCardDivider} />
                            <div className={styles.pldCardA}>
                                <div className={styles.pldCardALabel}>Answer</div>
                                The Supreme Court held that adverse possession requires uninterrupted, hostile, and open possession for the statutory period under Section 28, Limitation Act. The burden of proof lies on the claimant to show animus possidendi throughout.
                            </div>
                            <div className={styles.pldCardCitations}>
                                <span className={styles.pldCit}>PLD 2019 SC 412</span>
                                <span className={styles.pldCit}>SCMR 2021 1048</span>
                                <span className={styles.pldCit}>Your Matter — Khan v. Ahmad</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════ PRICING ══════════════ */}
            <div id="pricing">
                <div className={`${styles.section} ${styles.sectionCenter}`}>
                    <span className={styles.eyebrow}>Transparent Pricing</span>
                    <h2 className={styles.sectionTitle}>
                        Simple PKR Pricing — No Hidden Fees
                    </h2>
                    <p className={styles.sectionSub}>
                        Start free for 14 days. No credit card required.
                        Upgrade only when you're ready.
                    </p>
                    <div className={styles.pricingGrid}>
                        {PLANS.map(plan => (
                            <div
                                key={plan.id}
                                className={`${styles.pricingCard} ${plan.popular ? styles.pricingCardPopular : ""}`}
                            >
                                {plan.popular && (
                                    <div className={styles.pricingPopularBadge}>Most Popular</div>
                                )}
                                <div className={styles.pricingPlanName}>{plan.label}</div>
                                <div className={styles.pricingPrice}>
                                    {plan.price}
                                    {plan.period && <span className={styles.pricingPeriod}>{plan.period}</span>}
                                </div>
                                <div className={styles.pricingMeta}>
                                    {plan.docs} &nbsp;·&nbsp; {plan.users}
                                </div>
                                <div className={styles.pricingDivider} />
                                <ul className={styles.pricingFeatureList}>
                                    {plan.features.map(f => (
                                        <li key={f} className={styles.pricingFeatureItem}>
                                            <span className={styles.pricingCheck}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    className={plan.popular ? styles.btnGold : styles.btnGhost}
                                    style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}
                                    onClick={() => plan.id === "enterprise" ? open("demo") : open("signup")}
                                >
                                    {plan.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className={styles.pricingNote}>
                        All plans paid via bank transfer to our HBL account. Account activates within 24 hours of payment confirmation.
                    </p>
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
                                        <input className={styles.formInput} type="text" placeholder="Ali" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Last Name</label>
                                        <input className={styles.formInput} type="text" placeholder="Raza" />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Firm / Company Name</label>
                                    <input className={styles.formInput} type="text" placeholder="Raza & Co" />
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
                        <a
                            href="https://wa.me/923224255722?text=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20Project%20Ease"
                            className={`${styles.contactCard} ${styles.contactCardWa}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <span className={styles.contactIcon}>💬</span>
                            <span className={styles.contactCardLabel}>WhatsApp Us</span>
                            <span className={styles.contactCardValue}>Fastest response · Usually within 1 hour</span>
                        </a>
                        <a href="mailto:Bilalfaisal100@gmail.com" className={styles.contactCard}>
                            <span className={styles.contactIcon}>✉</span>
                            <span className={styles.contactCardLabel}>Email Us</span>
                            <span className={styles.contactCardValue}>Bilalfaisal100@gmail.com</span>
                        </a>
                        <div className={styles.contactCard} onClick={() => open("demo")} style={{ cursor: "pointer" }}>
                            <span className={styles.contactIcon}>📅</span>
                            <span className={styles.contactCardLabel}>Book a Live Demo</span>
                            <span className={styles.contactCardValue}>Free session using your own documents</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════ FOOTER ══════════════ */}
            <footer className={styles.footer}>
                <span className={styles.footerLogo}>Project Ease</span>
                <span className={styles.footerCopy}>© 2026 Project Ease. All rights reserved.</span>
                <div className={styles.footerRight}>
                    <a href="/#/compliance" className={styles.footerContact} style={{ marginRight: "1.25rem" }}>
                        Compliance & Security
                    </a>
                    <a href="mailto:Bilalfaisal100@gmail.com" className={styles.footerContact}>
                        Bilalfaisal100@gmail.com
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

                        {modal === "signin"  ? <SignInForm onSignUp={() => open("signup")} onForgot={() => open("forgot")} /> :
                         modal === "signup"  ? <SignUpForm onSignIn={() => open("signin")} /> :
                         modal === "forgot"  ? <ForgotPasswordForm onBack={() => open("signin")} /> :
                         modal === "reset"   ? <ResetPasswordForm token={resetToken ?? ""} onDone={() => open("signin")} /> :
                         <DemoModal sent={demoSent} onSend={() => setDemoSent(true)} onSwitch={() => open("signin")} />
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Sign In Modal ────────────────────────────────────────────────────────────

const SignInForm = ({ onSignUp, onForgot }: { onSignUp?: () => void; onForgot?: () => void }) => {
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    // Force-change-password state
    const [forceChange, setForceChange] = useState(false);
    const [tempToken,   setTempToken]   = useState("");
    const [tempPw,      setTempPw]      = useState(""); // the password they just logged in with
    const [pendingRole, setPendingRole] = useState("");
    const [newPw,       setNewPw]       = useState("");
    const [confirmPw,   setConfirmPw]   = useState("");

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

            if (data.user?.must_change_password) {
                // Store token and temp password; show force-change screen
                sessionStorage.setItem("pe_token", data.token);
                sessionStorage.setItem("pe_user", JSON.stringify(data.user));
                setTempToken(data.token);
                setTempPw(password);
                setPendingRole(data.user?.role ?? "");
                setForceChange(true);
                return;
            }

            sessionStorage.setItem("pe_token", data.token);
            sessionStorage.setItem("pe_user", JSON.stringify(data.user));
            const role: string = data.user?.role ?? "";
            window.location.hash = role === "platform_admin" ? "/admin"
                                 : role === "org_owner"      ? "/owner"
                                 : "/employee";
        } catch {
            setError("Could not reach the server. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    const submitNewPassword = async () => {
        setError("");
        if (!newPw) { setError("Please enter a new password."); return; }
        if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
        setLoading(true);
        try {
            const res = await fetch("/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tempToken}`,
                },
                body: JSON.stringify({ current_password: tempPw, new_password: newPw }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Could not change password."); return; }
            window.location.hash = pendingRole === "platform_admin" ? "/admin"
                                 : pendingRole === "org_owner"      ? "/owner"
                                 : "/employee";
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const onKey    = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") submit(); };
    const onKeyNew = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") submitNewPassword(); };

    if (forceChange) {
        return (
            <>
                <h2 className={styles.modalTitle}>Set Your Password</h2>
                <p className={styles.modalSub}>
                    Your account was set up with a temporary password. Please choose a new password before continuing.
                </p>

                {error && <p className={styles.formError}>{error}</p>}

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>New Password</label>
                    <input
                        className={styles.formInput}
                        type="password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        onKeyDown={onKeyNew}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Confirm New Password</label>
                    <input
                        className={styles.formInput}
                        type="password"
                        placeholder="Repeat your new password"
                        autoComplete="new-password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        onKeyDown={onKeyNew}
                    />
                </div>

                <button className={styles.formSubmit} onClick={submitNewPassword} disabled={loading}>
                    {loading ? "Saving…" : "Set Password & Continue"}
                </button>
            </>
        );
    }

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

            <p className={styles.formSwitch} style={{ marginTop: "0.5rem" }}>
                <button className={styles.formSwitchBtn} onClick={onForgot}>
                    Forgot password?
                </button>
            </p>

            {onSignUp && (
                <p className={styles.formSwitch}>
                    New firm?&nbsp;
                    <button className={styles.formSwitchBtn} onClick={onSignUp}>
                        Register your firm
                    </button>
                </p>
            )}
        </>
    );
};

// ─── Forgot Password Form ─────────────────────────────────────────────────────

const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
    const [email,   setEmail]   = useState("");
    const [sent,    setSent]    = useState(false);
    const [error,   setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!email) { setError("Please enter your email address."); return; }
        setError(""); setLoading(true);
        try {
            await fetch("/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    base_url: `${window.location.origin}${window.location.pathname}`,
                }),
            });
            setSent(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <>
                <h2 className={styles.modalTitle}>Check your email</h2>
                <p className={styles.modalSub}>
                    If an account with <strong>{email}</strong> exists, we've sent a password reset link.
                    It expires in 1 hour.
                </p>
                <p className={styles.formSwitch} style={{ marginTop: "1rem" }}>
                    <button className={styles.formSwitchBtn} onClick={onBack}>Back to Sign In</button>
                </p>
            </>
        );
    }

    return (
        <>
            <h2 className={styles.modalTitle}>Forgot Password</h2>
            <p className={styles.modalSub}>Enter your email and we'll send you a reset link.</p>
            {error && <p className={styles.formError}>{error}</p>}
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email</label>
                <input
                    className={styles.formInput}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submit(); }}
                    autoFocus
                />
            </div>
            <button className={styles.formSubmit} onClick={submit} disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <p className={styles.formSwitch} style={{ marginTop: "0.5rem" }}>
                <button className={styles.formSwitchBtn} onClick={onBack}>Back to Sign In</button>
            </p>
        </>
    );
};

// ─── Reset Password Form (token from URL hash) ────────────────────────────────

const ResetPasswordForm = ({ token, onDone }: { token: string; onDone: () => void }) => {
    const [newPw,     setNewPw]     = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [error,     setError]     = useState("");
    const [loading,   setLoading]   = useState(false);
    const [done,      setDone]      = useState(false);

    const submit = async () => {
        if (!newPw) { setError("Please enter a new password."); return; }
        if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
        setError(""); setLoading(true);
        try {
            const res = await fetch("/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: newPw }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Could not reset password."); return; }
            // Clear the token from the URL so it can't be reused
            window.history.replaceState(null, "", window.location.pathname + "#/");
            setDone(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <>
                <h2 className={styles.modalTitle}>Password Reset</h2>
                <p className={styles.modalSub}>
                    Your password has been updated. You can now sign in with your new password.
                </p>
                <button className={styles.formSubmit} onClick={onDone}>Sign In</button>
            </>
        );
    }

    return (
        <>
            <h2 className={styles.modalTitle}>Set New Password</h2>
            <p className={styles.modalSub}>Choose a new password for your account.</p>
            {error && <p className={styles.formError}>{error}</p>}
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>New Password</label>
                <input
                    className={styles.formInput}
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoFocus
                />
            </div>
            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Confirm Password</label>
                <input
                    className={styles.formInput}
                    type="password"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submit(); }}
                />
            </div>
            <button className={styles.formSubmit} onClick={submit} disabled={loading}>
                {loading ? "Saving…" : "Reset Password"}
            </button>
        </>
    );
};

// ─── Sign Up Form ─────────────────────────────────────────────────────────────

const SignUpForm = ({ onSignIn }: { onSignIn: () => void }) => {
    const [step, setStep]           = useState<1 | 2>(1);
    const [firmName, setFirmName]   = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [email, setEmail]         = useState("");
    const [password, setPassword]   = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [city, setCity]           = useState("");
    const [phone, setPhone]         = useState("");
    const [plan, setPlan]           = useState("pro");
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState("");
    const [done, setDone]           = useState(false);

    const nextStep = () => {
        setError("");
        if (!firmName.trim())  { setError("Please enter your firm name."); return; }
        if (!ownerName.trim()) { setError("Please enter your name."); return; }
        if (!email.trim())     { setError("Please enter your email."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (password !== confirmPw) { setError("Passwords do not match."); return; }
        setStep(2);
    };

    const submit = async () => {
        setError(""); setLoading(true);
        try {
            const res = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firm_name:   firmName.trim(),
                    owner_name:  ownerName.trim(),
                    owner_email: email.trim().toLowerCase(),
                    password,
                    city,
                    phone,
                    plan,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Registration failed. Please try again."); return; }
            setDone(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className={styles.successMsg}>
                <div className={styles.successIcon}>✓</div>
                <h3 className={styles.successTitle}>Registration Submitted</h3>
                <p className={styles.successSub}>
                    Thank you! We've received your registration for <strong>{firmName}</strong>.
                    Our team will verify your payment and activate your account within 24 hours.
                    Check your email for a confirmation.
                </p>
                <button className={styles.formSubmit} onClick={onSignIn} style={{ marginTop: "1rem" }}>
                    Back to Sign In
                </button>
            </div>
        );
    }

    return (
        <>
            <h2 className={styles.modalTitle}>Register Your Firm</h2>
            <p className={styles.modalSub}>
                {step === 1 ? "Step 1 of 2 — Your account details" : "Step 2 of 2 — Firm details & plan"}
            </p>

            {error && <p className={styles.formError}>{error}</p>}

            {step === 1 ? (
                <>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Firm Name <span className={styles.required}>*</span></label>
                        <input className={styles.formInput} type="text" placeholder="Khan & Associates"
                            value={firmName} onChange={e => setFirmName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Your Full Name <span className={styles.required}>*</span></label>
                        <input className={styles.formInput} type="text" placeholder="Ali Raza"
                            value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Work Email <span className={styles.required}>*</span></label>
                        <input className={styles.formInput} type="email" placeholder="partner@lawfirm.com"
                            value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Password <span className={styles.required}>*</span></label>
                        <input className={styles.formInput} type="password" placeholder="At least 8 characters"
                            autoComplete="new-password"
                            value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Confirm Password <span className={styles.required}>*</span></label>
                        <input className={styles.formInput} type="password" placeholder="Repeat your password"
                            autoComplete="new-password"
                            value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                    </div>
                    <button className={styles.formSubmit} onClick={nextStep}>
                        Next &nbsp;→
                    </button>
                </>
            ) : (
                <>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>City</label>
                            <select className={styles.formSelect} value={city} onChange={e => setCity(e.target.value)}>
                                <option value="">Select city</option>
                                {PK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Phone (optional)</label>
                            <input className={styles.formInput} type="tel" placeholder="+92 300 0000000"
                                value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Select Plan</label>
                        <div className={styles.planCards}>
                            {SIGNUP_PLANS.map(p => (
                                <div
                                    key={p.id}
                                    className={`${styles.planCard} ${plan === p.id ? styles.planCardActive : ""}`}
                                    onClick={() => setPlan(p.id)}
                                >
                                    <div className={styles.planCardName}>{p.label}</div>
                                    <div className={styles.planCardPrice}>{p.price}</div>
                                    <div className={styles.planCardUsers}>{p.users}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className={styles.planNote}>
                        You will receive payment instructions by email after registration.
                        Your account activates once payment is verified.
                    </p>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button className={styles.btnGhost} onClick={() => setStep(1)} style={{ flex: "0 0 auto", padding: "0.75rem 1.25rem" }}>
                            ← Back
                        </button>
                        <button className={styles.formSubmit} onClick={submit} disabled={loading} style={{ flex: 1 }}>
                            {loading ? "Submitting…" : "Submit Registration"}
                        </button>
                    </div>
                </>
            )}

            <p className={styles.formSwitch}>
                Already have an account?&nbsp;
                <button className={styles.formSwitchBtn} onClick={onSignIn}>Sign in</button>
            </p>
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
                    <input className={styles.formInput} type="text" placeholder="Ali" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Last Name</label>
                    <input className={styles.formInput} type="text" placeholder="Raza" />
                </div>
            </div>

            <div className={styles.formGroup}>
                <label className={styles.formLabel}>Firm Name</label>
                <input className={styles.formInput} type="text" placeholder="Raza & Co" />
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
