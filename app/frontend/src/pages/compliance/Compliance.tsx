import { useState, type ReactNode } from "react";
import { toggleTheme, getTheme, Theme } from "../../theme";

// ── Mini components ────────────────────────────────────────────────────────────

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return (
        <button
            className="cursor-pointer rounded-[6px] border border-border bg-transparent px-[0.7rem] py-[0.3rem] text-[0.78rem] text-ink-2"
            onClick={handle}
        >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
    );
};

// ── Section helpers ────────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section id={id} className="scroll-mt-[70px]">
            <h2 className="m-0 mb-5 border-b border-border pb-[0.6rem] font-serif text-lg font-bold text-gold">
                {title}
            </h2>
            <div className="flex flex-col gap-4 text-base leading-[1.7] text-ink-2 [&_p]:m-0">{children}</div>
        </section>
    );
}

function Badge({ label, color }: { label: string; color?: string }) {
    return (
        <span
            className="rounded-pill border px-3 py-[0.2rem] text-xs font-semibold tracking-wide"
            style={{ borderColor: color, color }}
        >
            {label}
        </span>
    );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex items-start gap-4 rounded-sm border border-border bg-bg-1 px-[1.1rem] py-[0.9rem] shadow-sm">
            <span className="mt-[0.05rem] shrink-0 text-[1.3rem]">{icon}</span>
            <div>
                <div className="mb-[0.2rem] text-sm font-bold text-ink-1">{label}</div>
                <div className="text-sm leading-[1.6] text-ink-2">{value}</div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Compliance() {
    return (
        <div className="flex min-h-screen flex-col bg-bg-0 font-sans text-ink-1">
            {/* ── Nav ───────────────────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 flex h-[58px] items-center justify-between border-b border-border bg-bg-0 px-8 max-sm:gap-2 max-sm:px-4">
                <a href="/#/" className="font-serif text-[1.1rem] font-bold tracking-tight text-gold no-underline">
                    Project Ease
                </a>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <a href="/#/" className="text-[0.85rem] font-medium text-gold no-underline hover:underline">
                        ← Back to Home
                    </a>
                </div>
            </nav>

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <header className="border-b border-border bg-[linear-gradient(160deg,var(--bg-0)_0%,var(--bg-2)_100%)] p-[4.5rem_2rem_3.5rem] max-sm:p-[3rem_1.25rem_2.25rem]">
                <div className="mx-auto max-w-[860px]">
                    <div className="mb-5 inline-block rounded-pill border border-[rgba(184,150,76,0.25)] bg-[rgba(184,150,76,0.12)] px-[0.85rem] py-[0.2rem] text-xs font-semibold uppercase tracking-eyebrow text-gold">
                        Security &amp; Compliance
                    </div>
                    <h1 className="m-0 mb-4 font-serif text-display font-bold leading-[1.15] tracking-tight text-ink-1 max-sm:text-[1.75rem] max-sm:leading-[1.2]">
                        Your Data, Protected.<br />Your Firm, Compliant.
                    </h1>
                    <p className="m-0 mb-7 max-w-[680px] text-md leading-[1.7] text-ink-2">
                        Project Ease is built on Microsoft Azure with enterprise-grade security, strict multi-tenant
                        isolation, and data residency options that meet Pakistani legal and international standards.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Badge label="Azure-Hosted" color="#0078D4" />
                        <Badge label="TLS 1.2+" color="#3ab57a" />
                        <Badge label="AES-256 at Rest" color="#3ab57a" />
                        <Badge label="Tenant-Isolated" color="var(--gold)" />
                        <Badge label="SOC 2 Type II *" color="#94A3B8" />
                    </div>
                </div>
            </header>

            <div className="mx-auto flex max-w-[860px] flex-1 flex-col gap-14 px-8 py-12">

                {/* ── Data Residency ─────────────────────────────────────────── */}
                <Section id="residency" title="Data Residency">
                    <p>
                        Project Ease stores all firm data — documents, case notes, chat history, and database records —
                        in your chosen Azure region. We offer two primary regions for Pakistani law firms:
                    </p>
                    <div className="my-2 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-sm:grid-cols-1">
                        <div className="flex flex-col gap-1 rounded-[10px] border border-border bg-bg-1 p-[1.1rem] shadow-sm transition-[border-color,transform] duration-150 ease-standard hover:-translate-y-0.5 hover:border-gold">
                            <div className="text-2xl">🇦🇪</div>
                            <div className="text-sm font-bold text-ink-1">UAE North</div>
                            <div className="text-xs text-ink-3">Dubai, United Arab Emirates</div>
                            <div className="mt-[0.35rem] text-xs leading-[1.5] text-ink-2">Lowest latency from Pakistan. Data does not leave UAE jurisdiction.</div>
                        </div>
                        <div className="flex flex-col gap-1 rounded-[10px] border border-border bg-bg-1 p-[1.1rem] shadow-sm transition-[border-color,transform] duration-150 ease-standard hover:-translate-y-0.5 hover:border-gold">
                            <div className="text-2xl">🇸🇬</div>
                            <div className="text-sm font-bold text-ink-1">Southeast Asia</div>
                            <div className="text-xs text-ink-3">Singapore</div>
                            <div className="mt-[0.35rem] text-xs leading-[1.5] text-ink-2">ISO 27001-certified Azure zone. PDPA-compliant storage.</div>
                        </div>
                        <div className="flex flex-col gap-1 rounded-[10px] border border-border bg-bg-1 p-[1.1rem] shadow-sm transition-[border-color,transform] duration-150 ease-standard hover:-translate-y-0.5 hover:border-gold">
                            <div className="text-2xl">🇵🇰</div>
                            <div className="text-sm font-bold text-ink-1">Pakistan (on request)</div>
                            <div className="text-xs text-ink-3">When Azure PKR region launches</div>
                            <div className="mt-[0.35rem] text-xs leading-[1.5] text-ink-2">Enterprise plan customers will be migrated at no extra cost.</div>
                        </div>
                    </div>
                    <p className="m-0 text-xs italic leading-[1.6] text-ink-3">
                        * Your organisation's Azure resource group and subscription can be specified in the Enterprise plan, giving you
                        full control over data location and billing.
                    </p>
                </Section>

                {/* ── Encryption ─────────────────────────────────────────────── */}
                <Section id="encryption" title="Encryption">
                    <div className="flex flex-col gap-4">
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
                    <div className="flex flex-col gap-3 max-sm:p-[1rem_1.25rem]">
                        <div className="flex items-start gap-[0.9rem] rounded-sm border border-border bg-bg-1 px-4 py-3 text-sm leading-[1.6] text-ink-2 shadow-sm">
                            <span className="mt-[0.1rem] shrink-0 text-[1.1rem]">🗂️</span>
                            <div>
                                <strong>Document Storage</strong> — Each uploaded file is tagged with your{" "}
                                <code className="rounded-[4px] border border-border bg-bg-2 px-[0.35rem] py-[0.05rem] font-mono text-[0.8rem] text-gold">organisation_id</code> in Azure Blob Storage metadata and in
                                the Azure AI Search index (<code className="rounded-[4px] border border-border bg-bg-2 px-[0.35rem] py-[0.05rem] font-mono text-[0.8rem] text-gold">category</code> field).
                            </div>
                        </div>
                        <div className="flex items-start gap-[0.9rem] rounded-sm border border-border bg-bg-1 px-4 py-3 text-sm leading-[1.6] text-ink-2 shadow-sm">
                            <span className="mt-[0.1rem] shrink-0 text-[1.1rem]">🔍</span>
                            <div>
                                <strong>Search Queries</strong> — Every AI search request includes an OData filter:{" "}
                                <code className="rounded-[4px] border border-border bg-bg-2 px-[0.35rem] py-[0.05rem] font-mono text-[0.8rem] text-gold">category eq '&lt;org_id&gt;'</code>. Results from other
                                organisations are structurally impossible to return.
                            </div>
                        </div>
                        <div className="flex items-start gap-[0.9rem] rounded-sm border border-border bg-bg-1 px-4 py-3 text-sm leading-[1.6] text-ink-2 shadow-sm">
                            <span className="mt-[0.1rem] shrink-0 text-[1.1rem]">🗃️</span>
                            <div>
                                <strong>Database</strong> — All SQLite tables include an <code className="rounded-[4px] border border-border bg-bg-2 px-[0.35rem] py-[0.05rem] font-mono text-[0.8rem] text-gold">org_id</code>{" "}
                                foreign key. Every API endpoint validates the authenticated user's organisation before
                                reading or writing any row.
                            </div>
                        </div>
                        <div className="flex items-start gap-[0.9rem] rounded-sm border border-border bg-bg-1 px-4 py-3 text-sm leading-[1.6] text-ink-2 shadow-sm">
                            <span className="mt-[0.1rem] shrink-0 text-[1.1rem]">👥</span>
                            <div>
                                <strong>Team Permissions</strong> — Employees are granted access only to document
                                categories explicitly permitted by their Firm Owner. Sub-category scoping is enforced at
                                the AI Search filter level, not just the UI.
                            </div>
                        </div>
                        <div className="flex items-start gap-[0.9rem] rounded-sm border border-border bg-bg-1 px-4 py-3 text-sm leading-[1.6] text-ink-2 shadow-sm">
                            <span className="mt-[0.1rem] shrink-0 text-[1.1rem]">📜</span>
                            <div>
                                <strong>Case Law Pool</strong> — Public PLD/SCMR/MLD/CLC documents are stored under a
                                separate <code className="rounded-[4px] border border-border bg-bg-2 px-[0.35rem] py-[0.05rem] font-mono text-[0.8rem] text-gold">__case_law__</code> category and are read-only for all
                                tenants. No firm can modify or delete shared case law.
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ── Access Control ─────────────────────────────────────────── */}
                <Section id="access" title="Access Control & Authentication">
                    <div className="flex flex-col gap-4">
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
                    <div className="flex flex-col gap-[0.65rem]">
                        <div className="flex items-start gap-3 text-[0.85rem] leading-[1.6] text-ink-2">
                            <span className="mt-[0.05rem] shrink-0 text-base font-bold text-[#3ab57a]">✓</span>
                            <span>Your document content is <strong>not used to train OpenAI models</strong>. Azure OpenAI is a
                            managed service with no data leakage to the public OpenAI API.</span>
                        </div>
                        <div className="flex items-start gap-3 text-[0.85rem] leading-[1.6] text-ink-2">
                            <span className="mt-[0.05rem] shrink-0 text-base font-bold text-[#3ab57a]">✓</span>
                            <span>AI queries go to your organisation's <strong>dedicated Azure OpenAI deployment</strong>,
                            not a shared endpoint.</span>
                        </div>
                        <div className="flex items-start gap-3 text-[0.85rem] leading-[1.6] text-ink-2">
                            <span className="mt-[0.05rem] shrink-0 text-base font-bold text-[#3ab57a]">✓</span>
                            <span>The AI only answers from your uploaded documents. It will explicitly say{" "}
                            <em>"I don't have enough information in your documents"</em> rather than hallucinate from
                            general knowledge.</span>
                        </div>
                        <div className="flex items-start gap-3 text-[0.85rem] leading-[1.6] text-ink-2">
                            <span className="mt-[0.05rem] shrink-0 text-base font-bold text-[#3ab57a]">✓</span>
                            <span>Every AI answer is <strong>verified against source documents</strong> by a second AI
                            pass before delivery to the user (two-pass verification).</span>
                        </div>
                        <div className="flex items-start gap-3 text-[0.85rem] leading-[1.6] text-ink-2">
                            <span className="mt-[0.05rem] shrink-0 text-base font-bold text-[#3ab57a]">✓</span>
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
                    <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 max-sm:grid-cols-1">
                        <div className="rounded-[10px] border border-border bg-bg-1 p-[1.1rem] text-sm leading-[1.6] text-ink-2 shadow-sm [&_p]:mt-[0.4rem] [&_p]:mb-0">
                            <div className="mb-[0.4rem] text-sm font-bold text-ink-1">Lawful Basis</div>
                            <p>Client documents are processed under explicit contractual necessity.
                            Firms collect client consent separately; Project Ease processes only at the firm's direction.</p>
                        </div>
                        <div className="rounded-[10px] border border-border bg-bg-1 p-[1.1rem] text-sm leading-[1.6] text-ink-2 shadow-sm [&_p]:mt-[0.4rem] [&_p]:mb-0">
                            <div className="mb-[0.4rem] text-sm font-bold text-ink-1">Data Subject Rights</div>
                            <p>Firm Owners can permanently delete any client's documents and data via the danger-zone
                            controls in Settings. Deletion cascades to the Azure Search index within 24 hours.</p>
                        </div>
                        <div className="rounded-[10px] border border-border bg-bg-1 p-[1.1rem] text-sm leading-[1.6] text-ink-2 shadow-sm [&_p]:mt-[0.4rem] [&_p]:mb-0">
                            <div className="mb-[0.4rem] text-sm font-bold text-ink-1">Data Processor Agreement</div>
                            <p>Enterprise customers can request a signed DPA (Data Processing Agreement) confirming
                            Project Ease acts as a processor and your firm as controller.</p>
                        </div>
                        <div className="rounded-[10px] border border-border bg-bg-1 p-[1.1rem] text-sm leading-[1.6] text-ink-2 shadow-sm [&_p]:mt-[0.4rem] [&_p]:mb-0">
                            <div className="mb-[0.4rem] text-sm font-bold text-ink-1">Bar Council Obligations</div>
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
                    <div className="my-2 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[0.85rem] max-sm:grid-cols-2">
                        {[
                            { name: "ISO/IEC 27001", desc: "Information security management system", scope: "Azure infrastructure" },
                            { name: "SOC 2 Type II",  desc: "Trust services criteria (security, availability, confidentiality)", scope: "Azure infrastructure" },
                            { name: "ISO/IEC 27018", desc: "Protection of PII in public clouds", scope: "Azure infrastructure" },
                            { name: "GDPR",           desc: "EU data protection regulation alignment", scope: "Azure infrastructure" },
                            { name: "CSA STAR",       desc: "Cloud Security Alliance certification", scope: "Azure infrastructure" },
                            { name: "TLS 1.2+",       desc: "Transport encryption enforced end-to-end", scope: "Project Ease application" },
                        ].map(c => (
                            <div key={c.name} className="rounded-sm border border-border bg-bg-1 px-4 py-[0.9rem] shadow-sm transition-[border-color,transform] duration-150 ease-standard hover:-translate-y-0.5 hover:border-gold">
                                <div className="mb-1 text-sm font-bold text-gold">{c.name}</div>
                                <div className="text-xs leading-[1.5] text-ink-2">{c.desc}</div>
                                <div className="mt-[0.35rem] text-xs text-ink-3">{c.scope}</div>
                            </div>
                        ))}
                    </div>
                    <p className="m-0 text-xs italic leading-[1.6] text-ink-3">
                        * Certifications listed for Azure infrastructure are held by Microsoft. Project Ease is a SaaS
                        application running on Azure; independent application-layer certifications (SOC 2 for the Project
                        Ease service itself) are in progress.
                    </p>
                </Section>

                {/* ── Incident Response ──────────────────────────────────────── */}
                <Section id="incidents" title="Incident Response & Breach Notification">
                    <div className="flex flex-col gap-4">
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
                    <div className="mt-3 flex flex-wrap gap-5 max-sm:flex-col max-sm:gap-3">
                        <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-[10px] border border-border bg-bg-1 px-5 py-[0.9rem] shadow-sm max-sm:p-5">
                            <span className="shrink-0 text-2xl">📧</span>
                            <div>
                                <div className="mb-[0.2rem] text-xs uppercase tracking-wide text-ink-3">Email</div>
                                <a href="mailto:Bilalfaisal100@gmail.com" className="text-sm font-medium text-gold no-underline hover:underline">
                                    Bilalfaisal100@gmail.com
                                </a>
                            </div>
                        </div>
                        <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-[10px] border border-border bg-bg-1 px-5 py-[0.9rem] shadow-sm max-sm:p-5">
                            <span className="shrink-0 text-2xl">💬</span>
                            <div>
                                <div className="mb-[0.2rem] text-xs uppercase tracking-wide text-ink-3">WhatsApp</div>
                                <a href="https://wa.me/923224255722" className="text-sm font-medium text-gold no-underline hover:underline" target="_blank" rel="noreferrer">
                                    +92 322 425 5722
                                </a>
                            </div>
                        </div>
                    </div>
                    <p className="m-0 mt-4 text-xs italic leading-[1.6] text-ink-3">
                        We aim to respond to all DPA and compliance requests within 2 business days.
                    </p>
                </Section>

            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-8 py-5 text-[0.78rem] text-ink-3 max-sm:flex-col max-sm:px-4 max-sm:text-center">
                <span>© 2026 Project Ease. All rights reserved.</span>
                <div className="flex flex-wrap justify-center gap-5">
                    <a href="/#/" className="text-ink-3 no-underline transition-colors duration-150 hover:text-gold">Home</a>
                    <a href="/#/compliance" className="text-ink-3 no-underline transition-colors duration-150 hover:text-gold">Compliance</a>
                    <a href="mailto:Bilalfaisal100@gmail.com" className="text-ink-3 no-underline transition-colors duration-150 hover:text-gold">Contact</a>
                </div>
            </footer>
        </div>
    );
}
