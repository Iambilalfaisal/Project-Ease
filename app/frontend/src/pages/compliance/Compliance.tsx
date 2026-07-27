import styles from "./Compliance.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";
import { useState } from "react";

// ── Mini components ────────────────────────────────────────────────────────────

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return <button className={styles.themeBtn} onClick={handle}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
};

// ── Section helpers ────────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className={styles.section}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <div className={styles.sectionBody}>{children}</div>
        </section>
    );
}

function Badge({ label, color }: { label: string; color?: string }) {
    return <span className={styles.badge} style={{ borderColor: color, color }}>{label}</span>;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className={styles.infoRow}>
            <span className={styles.infoIcon}>{icon}</span>
            <div>
                <div className={styles.infoLabel}>{label}</div>
                <div className={styles.infoValue}>{value}</div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Compliance() {
    return (
        <div className={styles.page}>
            {/* ── Nav ───────────────────────────────────────────────────────── */}
            <nav className={styles.nav}>
                <a href="/#/" className={styles.navLogo}>Project Ease</a>
                <div className={styles.navRight}>
                    <ThemeToggle />
                    <a href="/#/" className={styles.navBack}>← Back to Home</a>
                </div>
            </nav>

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <header className={styles.hero}>
                <div className={styles.heroInner}>
                    <div className={styles.heroTag}>Security & Compliance</div>
                    <h1 className={styles.heroTitle}>Your Data, Protected.<br />Your Firm, Compliant.</h1>
                    <p className={styles.heroSub}>
                        Project Ease is built on Microsoft Azure with enterprise-grade security, strict multi-tenant
                        isolation, and data residency options that meet Pakistani legal and international standards.
                    </p>
                    <div className={styles.badgeRow}>
                        <Badge label="Azure-Hosted" color="#0078D4" />
                        <Badge label="TLS 1.2+" color="#3ab57a" />
                        <Badge label="AES-256 at Rest" color="#3ab57a" />
                        <Badge label="Tenant-Isolated" color="var(--gold)" />
                        <Badge label="SOC 2 Type II *" color="#94A3B8" />
                    </div>
                </div>
            </header>

            <div className={styles.content}>

                {/* ── Data Residency ─────────────────────────────────────────── */}
                <Section id="residency" title="Data Residency">
                    <p>
                        Project Ease stores all firm data — documents, case notes, chat history, and database records —
                        in your chosen Azure region. We offer two primary regions for Pakistani law firms:
                    </p>
                    <div className={styles.regionGrid}>
                        <div className={styles.regionCard}>
                            <div className={styles.regionFlag}>🇦🇪</div>
                            <div className={styles.regionName}>UAE North</div>
                            <div className={styles.regionSub}>Dubai, United Arab Emirates</div>
                            <div className={styles.regionNote}>Lowest latency from Pakistan. Data does not leave UAE jurisdiction.</div>
                        </div>
                        <div className={styles.regionCard}>
                            <div className={styles.regionFlag}>🇸🇬</div>
                            <div className={styles.regionName}>Southeast Asia</div>
                            <div className={styles.regionSub}>Singapore</div>
                            <div className={styles.regionNote}>ISO 27001-certified Azure zone. PDPA-compliant storage.</div>
                        </div>
                        <div className={styles.regionCard}>
                            <div className={styles.regionFlag}>🇵🇰</div>
                            <div className={styles.regionName}>Pakistan (on request)</div>
                            <div className={styles.regionSub}>When Azure PKR region launches</div>
                            <div className={styles.regionNote}>Enterprise plan customers will be migrated at no extra cost.</div>
                        </div>
                    </div>
                    <p className={styles.noteText}>
                        * Your organisation's Azure resource group and subscription can be specified in the Enterprise plan, giving you
                        full control over data location and billing.
                    </p>
                </Section>

                {/* ── Encryption ─────────────────────────────────────────────── */}
                <Section id="encryption" title="Encryption">
                    <div className={styles.infoGrid}>
                        <InfoRow icon="🔒" label="Data at Rest" value="AES-256 encryption via Azure Storage Service Encryption (SSE). All documents, embeddings, and database records are encrypted at rest." />
                        <InfoRow icon="🔐" label="Data in Transit" value="TLS 1.2 minimum enforced on all API calls, document uploads, and search queries. HTTPS-only; HTTP is redirected." />
                        <InfoRow icon="🔑" label="Key Management" value="Azure Key Vault for all secrets, connection strings, and API keys. Keys are rotated automatically and never stored in source code." />
                        <InfoRow icon="🛡️" label="Search Index" value="Azure AI Search index is scoped per organisation via the category filter. One firm's data is never returned in another firm's search results." />
                    </div>
                </Section>

                {/* ── Multi-Tenant Isolation ─────────────────────────────────── */}
                <Section id="isolation" title="Multi-Tenant Isolation">
                    <p>
                        Every organisation on Project Ease is logically isolated at every layer of the stack:
                    </p>
                    <div className={styles.isolationList}>
                        <div className={styles.isolationItem}>
                            <span className={styles.isolationIcon}>🗂️</span>
                            <div>
                                <strong>Document Storage</strong> — Each uploaded file is tagged with your{" "}
                                <code className={styles.code}>organisation_id</code> in Azure Blob Storage metadata and in
                                the Azure AI Search index (<code className={styles.code}>category</code> field).
                            </div>
                        </div>
                        <div className={styles.isolationItem}>
                            <span className={styles.isolationIcon}>🔍</span>
                            <div>
                                <strong>Search Queries</strong> — Every AI search request includes an OData filter:{" "}
                                <code className={styles.code}>category eq '&lt;org_id&gt;'</code>. Results from other
                                organisations are structurally impossible to return.
                            </div>
                        </div>
                        <div className={styles.isolationItem}>
                            <span className={styles.isolationIcon}>🗃️</span>
                            <div>
                                <strong>Database</strong> — All SQLite tables include an <code className={styles.code}>org_id</code>{" "}
                                foreign key. Every API endpoint validates the authenticated user's organisation before
                                reading or writing any row.
                            </div>
                        </div>
                        <div className={styles.isolationItem}>
                            <span className={styles.isolationIcon}>👥</span>
                            <div>
                                <strong>Team Permissions</strong> — Employees are granted access only to document
                                categories explicitly permitted by their Firm Owner. Sub-category scoping is enforced at
                                the AI Search filter level, not just the UI.
                            </div>
                        </div>
                        <div className={styles.isolationItem}>
                            <span className={styles.isolationIcon}>📜</span>
                            <div>
                                <strong>Case Law Pool</strong> — Public PLD/SCMR/MLD/CLC documents are stored under a
                                separate <code className={styles.code}>__case_law__</code> category and are read-only for all
                                tenants. No firm can modify or delete shared case law.
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ── Access Control ─────────────────────────────────────────── */}
                <Section id="access" title="Access Control & Authentication">
                    <div className={styles.infoGrid}>
                        <InfoRow icon="🪪" label="Authentication" value="All sessions use Bearer tokens stored in sessionStorage. Tokens expire on browser close. Passwords are hashed with bcrypt (12 rounds)." />
                        <InfoRow icon="🔏" label="Role-Based Access" value="Three distinct roles: Platform Admin, Firm Owner, and Employee. Each role has separate endpoints with server-side enforcement — role claims cannot be spoofed by the frontend." />
                        <InfoRow icon="📋" label="Audit Log" value="Every login, document upload, AI search, and permission change is recorded in the audit log with timestamp, IP address, and actor identity. Logs are retained for 12 months." />
                        <InfoRow icon="📲" label="WhatsApp 2FA (optional)" value="Employees can register a WhatsApp number for document queries. The WhatsApp webhook validates the sender number before processing any request." />
                    </div>
                </Section>

                {/* ── AI & Data Processing ───────────────────────────────────── */}
                <Section id="ai" title="AI & Data Processing">
                    <p>
                        Project Ease uses <strong>Azure OpenAI Service</strong> — Microsoft's enterprise-grade, privacy-first
                        deployment of GPT models. Key points:
                    </p>
                    <div className={styles.aiPoints}>
                        <div className={styles.aiPoint}>
                            <span className={styles.aiCheck}>✓</span>
                            <span>Your document content is <strong>not used to train OpenAI models</strong>. Azure OpenAI is a
                            managed service with no data leakage to the public OpenAI API.</span>
                        </div>
                        <div className={styles.aiPoint}>
                            <span className={styles.aiCheck}>✓</span>
                            <span>AI queries go to your organisation's <strong>dedicated Azure OpenAI deployment</strong>,
                            not a shared endpoint.</span>
                        </div>
                        <div className={styles.aiPoint}>
                            <span className={styles.aiCheck}>✓</span>
                            <span>The AI only answers from your uploaded documents. It will explicitly say{" "}
                            <em>"I don't have enough information in your documents"</em> rather than hallucinate from
                            general knowledge.</span>
                        </div>
                        <div className={styles.aiPoint}>
                            <span className={styles.aiCheck}>✓</span>
                            <span>Every AI answer is <strong>verified against source documents</strong> by a second AI
                            pass before delivery to the user (two-pass verification).</span>
                        </div>
                        <div className={styles.aiPoint}>
                            <span className={styles.aiCheck}>✓</span>
                            <span>Prompt injections are mitigated by strict system-message controls.
                            Users cannot override the citation-enforcement or tenant-isolation rules via chat.</span>
                        </div>
                    </div>
                </Section>

                {/* ── PDPA / Pakistan Regulatory ─────────────────────────────── */}
                <Section id="pdpa" title="Pakistan Data Protection & Regulatory Notes">
                    <p>
                        Pakistan's <strong>Personal Data Protection Bill (PDPB)</strong> and existing Electronic Transactions
                        Ordinance (ETO 2002) place obligations on data processors. Project Ease is designed to help your firm meet these:
                    </p>
                    <div className={styles.pdpaGrid}>
                        <div className={styles.pdpaCard}>
                            <div className={styles.pdpaCardTitle}>Lawful Basis</div>
                            <p>Client documents are processed under explicit contractual necessity.
                            Firms collect client consent separately; Project Ease processes only at the firm's direction.</p>
                        </div>
                        <div className={styles.pdpaCard}>
                            <div className={styles.pdpaCardTitle}>Data Subject Rights</div>
                            <p>Firm Owners can permanently delete any client's documents and data via the danger-zone
                            controls in Settings. Deletion cascades to the Azure Search index within 24 hours.</p>
                        </div>
                        <div className={styles.pdpaCard}>
                            <div className={styles.pdpaCardTitle}>Data Processor Agreement</div>
                            <p>Enterprise customers can request a signed DPA (Data Processing Agreement) confirming
                            Project Ease acts as a processor and your firm as controller.</p>
                        </div>
                        <div className={styles.pdpaCard}>
                            <div className={styles.pdpaCardTitle}>Bar Council Obligations</div>
                            <p>Client confidentiality under Pakistan Bar Council rules is maintained.
                            No document content is ever shared outside your firm's tenant, and no human at Project Ease
                            can read your uploaded files.</p>
                        </div>
                    </div>
                </Section>

                {/* ── Certifications ─────────────────────────────────────────── */}
                <Section id="certs" title="Infrastructure Certifications">
                    <p>
                        Project Ease inherits Azure's compliance certifications for all infrastructure it uses.
                        Azure holds <strong>over 90 certifications</strong> — the following are most relevant to Pakistani legal firms:
                    </p>
                    <div className={styles.certGrid}>
                        {[
                            { name: "ISO/IEC 27001", desc: "Information security management system", scope: "Azure infrastructure" },
                            { name: "SOC 2 Type II",  desc: "Trust services criteria (security, availability, confidentiality)", scope: "Azure infrastructure" },
                            { name: "ISO/IEC 27018", desc: "Protection of PII in public clouds", scope: "Azure infrastructure" },
                            { name: "GDPR",           desc: "EU data protection regulation alignment", scope: "Azure infrastructure" },
                            { name: "CSA STAR",       desc: "Cloud Security Alliance certification", scope: "Azure infrastructure" },
                            { name: "TLS 1.2+",       desc: "Transport encryption enforced end-to-end", scope: "Project Ease application" },
                        ].map(c => (
                            <div key={c.name} className={styles.certCard}>
                                <div className={styles.certName}>{c.name}</div>
                                <div className={styles.certDesc}>{c.desc}</div>
                                <div className={styles.certScope}>{c.scope}</div>
                            </div>
                        ))}
                    </div>
                    <p className={styles.noteText}>
                        * Certifications listed for Azure infrastructure are held by Microsoft. Project Ease is a SaaS
                        application running on Azure; independent application-layer certifications (SOC 2 for the Project
                        Ease service itself) are in progress.
                    </p>
                </Section>

                {/* ── Incident Response ──────────────────────────────────────── */}
                <Section id="incidents" title="Incident Response & Breach Notification">
                    <div className={styles.infoGrid}>
                        <InfoRow icon="🚨" label="Breach Detection" value="Abnormal access patterns are monitored via Azure Monitor. Suspicious login attempts trigger account lockout after 5 failed attempts." />
                        <InfoRow icon="📢" label="Notification" value="In the event of a confirmed data breach, affected Firm Owners will be notified within 72 hours — consistent with GDPR Article 33 standards and Pakistan PDPB draft requirements." />
                        <InfoRow icon="🔄" label="Recovery" value="Daily automated backups of the SQLite database and Azure Blob Storage. Recovery Point Objective (RPO): 24 hours. Recovery Time Objective (RTO): 4 hours." />
                    </div>
                </Section>

                {/* ── Contact / DPA Request ──────────────────────────────────── */}
                <Section id="contact" title="Request a DPA or Security Review">
                    <p>
                        Enterprise customers and legal firms requiring a signed Data Processing Agreement, security
                        questionnaire responses, or a custom compliance review can contact us directly.
                    </p>
                    <div className={styles.contactBox}>
                        <div className={styles.contactItem}>
                            <span className={styles.contactIcon}>📧</span>
                            <div>
                                <div className={styles.contactLabel}>Email</div>
                                <a href="mailto:hasan.nasir.acmeone@gmail.com" className={styles.contactLink}>
                                    hasan.nasir.acmeone@gmail.com
                                </a>
                            </div>
                        </div>
                        <div className={styles.contactItem}>
                            <span className={styles.contactIcon}>💬</span>
                            <div>
                                <div className={styles.contactLabel}>WhatsApp</div>
                                <a href="https://wa.me/923000000000" className={styles.contactLink} target="_blank" rel="noreferrer">
                                    +92 300 000 0000
                                </a>
                            </div>
                        </div>
                    </div>
                    <p className={styles.noteText} style={{ marginTop: "1rem" }}>
                        We aim to respond to all DPA and compliance requests within 2 business days.
                    </p>
                </Section>

            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <footer className={styles.footer}>
                <span>© 2026 Project Ease. All rights reserved.</span>
                <div className={styles.footerLinks}>
                    <a href="/#/" className={styles.footerLink}>Home</a>
                    <a href="/#/compliance" className={styles.footerLink}>Compliance</a>
                    <a href="mailto:hasan.nasir.acmeone@gmail.com" className={styles.footerLink}>Contact</a>
                </div>
            </footer>
        </div>
    );
}
