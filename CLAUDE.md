# Project Ease — Claude Context

## What this project is
Project Ease is a multi-tenant, AI-powered document intelligence and case management SaaS built specifically for Pakistani law firms — not a generic legal tool. Ground-up design for Lahore/Pakistan: Urdu script, LHC (Lahore High Court) cause lists, PKR pricing, WhatsApp-first notifications, and Pakistan-specific legal workflows (PPC sections, FIRs, bail bonds, vakalatnamas, etc.).

Business model: per-seat SaaS, free tier (20 docs, 5 users) + paid tiers. Payments via JazzCash/Easypaisa (placeholders for now — `PLACEHOLDER_JAZZCASH_NO`, `PLACEHOLDER_EASYPAISA_NO`). Target customers: law firms in Lahore with 2–30 lawyers.
- Revenue model: Starter 4,500 PKR / Professional 9,000 PKR / Business 20,000 PKR/month

Originally scaffolded from a fork of the Azure Search OpenAI Demo (https://github.com/Azure-Samples/azure-search-openai-demo), but the product has since diverged heavily into a purpose-built legal vertical SaaS. The AI/RAG plumbing (Azure AI Search, Document Intelligence, blob storage, azd deployment) is still Azure-based; almost everything else — the app itself, the data model, the UI — is custom.

## Tech stack
- **Frontend**: React 18 + TypeScript + Vite, port 3000. Single-page app, hash-based routing (`/#/owner`, `/#/app`, `/#/admin`, `/#/portal`, `/#/compliance`). CSS Modules with design tokens (`--bg-0/1/2`, `--gold`, `--border`, `--text-1/2/3`, `--radius`). Urdu font: Noto Nastaliq Urdu (Google Fonts, loaded in `index.html`).
- **Backend**: Python, **Quart** (async Flask), port 50505. SQLite via `db.py`. Bearer token auth stored client-side in `sessionStorage` as `pe_token`.
- **AI/RAG**: Azure AI Search (hybrid BM25 + vector), Azure OpenAI, Azure AI Document Intelligence (Form Recognizer) for OCR/parsing.
- **WhatsApp**: Twilio + Whisper for voice transcription.
- **Email**: SMTP (`SMTP_*` env vars).
- **Deployment**: Azure Developer CLI (`azd`), infra defined in `infra/` (bicep).

Key env vars (all placeholders until user fills in): `AZURE_SEARCH_SERVICE`, `AZURE_SEARCH_KEY`, `AZURE_OPENAI_*`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WA_FROM`, `SMTP_*`, `PLACEHOLDER_JAZZCASH_NO`, `PLACEHOLDER_EASYPAISA_NO`.

## Azure environment (for RAG/infra work)
- azd environment name: `project-ease-dev2`
- Target region: `eastus2` (eastus has AKS capacity issues — always use eastus2)
- Azure subscription: Azure subscription 1 (`59310e93-5c42-49a8-9bcf-e31b45c222ef`)
- Logged in as: bilal.faisal@acme-one.com
- Known machine issue: ISP (ConnecTel Pakistan) blocks Microsoft TLS endpoints, so `azd auth login`/`az`/`azd` commands fail on WiFi. Fix: mobile hotspot or Cloudflare WARP VPN before running any `azd`/`az` command. DNS was changed to 8.8.8.8 / 8.8.4.4 to fix resolution.
- Soft-deleted Cognitive Services resources block re-deployment under the same name — use `azd down --force --purge` to clean up before redeploying.
- Free tier during dev — do not enable features that incur cost (CosmosDB, full GPT-4o, etc.) without checking first.

## File structure (important files only)
```
app/
├── frontend/
│   ├── src/
│   │   ├── index.tsx                        # Route registration
│   │   ├── pages/
│   │   │   ├── owner/
│   │   │   │   ├── OwnerPortal.tsx           # ~10,500+ lines — main file
│   │   │   │   └── OwnerPortal.module.css
│   │   │   ├── employee/
│   │   │   │   ├── EmployeePortal.tsx
│   │   │   │   └── EmployeePortal.module.css
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboard.tsx
│   │   │   ├── portal/                       # external client portal (/#/portal)
│   │   │   ├── compliance/                   # /#/compliance
│   │   │   └── Landing.tsx
│   │   └── index.css                         # Global CSS + Urdu RTL utilities
│   └── index.html                            # PWA manifest + Noto Nastaliq font
└── backend/
    ├── app.py                                # All routes, Quart app (~5,600+ lines)
    ├── db.py                                  # All SQLite helpers
    ├── email_helper.py                        # SMTP email sending
    └── approaches/                            # Azure AI search / RAG logic
```

## Auth pattern
Every protected backend route:
```python
session = _get_session()
if not session or session.get("role") != "org_owner":
    return jsonify({"error": "Unauthorized"}), 401
org_id = session.get("org") or ""
```
Three roles: `admin`, `org_owner`, `employee`.

Frontend auth headers:
```typescript
const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem("pe_token") ?? ""}` });
```

### Dev credentials
- Platform Admin: `admin@projectease.com` / `admin123` → `/#/admin`
- Org Owner: `owner@acmelegal.com` / `owner123` → `/#/owner`
- Employee: `employee@acmelegal.com` / `emp123` → `/#/app`

## Database conventions (`db.py`)
- Primary keys: `secrets.token_hex(10)` (20-char hex string)
- Timestamps: `_now()` helper → ISO format string
- Soft deletes: `is_active INTEGER DEFAULT 1`
- Audit columns on every table: `created_at`, `created_by`, `updated_at` (a.k.a. `modified_at`), `updated_by` (a.k.a. `modified_by`, value is user_id or `'system'`)
- **Multi-tenancy: every table has `organization_id` — always filter by it.**

## OwnerPortal.tsx architecture
Everything lives in one large file, in this order:
```
Module-level constants (interfaces, NAV, PANEL_TITLES, etc.)
    ↓
Sub-panel components (ClientsPanel, MattersPanel, CalendarPanel, etc.)
    ↓
// ── Shell ─────
const OwnerPortal = () => {   ← main shell component at the very bottom
```
- **Panel routing**: `const [panel, setPanel] = useState<Panel>("overview")` — the `Panel` union type lists every panel ID. The `NAV` array drives the sidebar. A render block at the bottom switches on `panel`.
- **Feature flags**: `org_feature_flags` table. `feat("key")` helper returns `true` if enabled (defaults to `true` if not explicitly disabled). `ALWAYS_ON` panels: `["overview", "subscription", "settings"]`.
- **Matter detail tabs**: `detailTab` state union controls which tab renders inside the matter detail view: `"overview" | "hearings" | "deadlines" | "fees" | "docs" | "orders" | "adversary" | "limitation" | "timelog" | "vakalat" | "adjcount" | "notes" | "witnesses" | "internaldl" | "expenses" | "correspondence" | "relief" | "outcome" | "charges" | "fir" | "challan" | "conflict" | "physfile" | "courtfee" | "assocfees" | "cheques" | "bailbonds" | "transfers"`

### Conventions to follow when editing OwnerPortal.tsx
- Standalone panel components go before `// ── Shell ─────` at the bottom of the file.
- Tab content for matter detail goes before `{/* ── Relief add/edit modal ── */}` inside `MattersPanel`.
- CSS design tokens only — no hardcoded colors except status badges (green `#16a34a`, red `#dc2626`, amber `#d97706`).
- `const body: any = { ...form }` pattern for PATCH/POST — adding a field to the form object automatically includes it in API calls.

## Verify commands
- **TypeScript**:
  ```bash
  timeout 60 node_modules/.bin/tsc --noEmit --ignoreConfig --strict --jsx react-jsx --esModuleInterop --module esnext --moduleResolution bundler src/pages/owner/OwnerPortal.tsx 2>&1 | grep -v "TS2307" | head -30
  ```
  No output = clean.
- **Python syntax**:
  ```bash
  python3 -c "import ast; ast.parse(open('app.py').read()); print('OK')"
  ```

## What's fully built

**Core SaaS infrastructure**: multi-tenant org registration + admin approval flow; token auth with role-based access; per-seat pricing enforcement (hard limits at Free/Pro/Enterprise); self-service plan upgrade (JazzCash/Easypaisa payment reference); feature flags per org; audit log (logins, searches, document access); email notifications (SMTP); PWA (service worker + manifest, offline shell only — see gaps).

**Document intelligence**: bulk drag-and-drop upload with per-file progress; Azure AI Search hybrid (BM25 + vector) with citation enforcement; Urdu OCR support; case law (PLD/SCMR) unified search with 📖 badge; two-pass anti-hallucination verification; answer export to PDF and Word (.docx); Document Drafting panel (AI fills firm templates — vakalatnamas, plaints, agreements).

**Case management (MattersPanel — the heart of the app)** — all as tabs inside a matter's detail view: overview (title, type, court, judge, case number, stage, client, status, priority, referral source); appeal hierarchy (`matter_stage` + `parent_matter_id`); hearings (outcome, adjournment reason, next-date-fixed-by); deadlines (Limitation Act 1908 warnings, red/amber badges); fees; documents; court orders log; adverse party + opposing counsel tracking; time tracking (billable hours timer); vakalatnama status; adjournment counter; matter notes/activity journal; witnesses; internal deadlines; expenses; correspondence log; bail & interim relief tracker; matter outcome & disposal; charge/section tracker (PPC, PECA, etc.); FIR & police station module; challan/charge sheet tracker; conflict of interest checker; physical file reference & rack system; court fee & stamp duty calculator; associate/wakeel appearance fee tracker; post-dated/undated cheque tracker; bail bonds (Pre-Arrest/Post-Arrest/Anticipatory/Interim/Regular/Transit + surety details); court transfers; LHC case status live lookup per matter (`/lhc/case-status`).

**Standalone panels (sidebar nav)**: Clients (with Trust Ledger/Advance Money per client); Matters; Court Calendar (month view, WhatsApp reminders); Daily Diary (date navigator, printable, WhatsApp share, Send Brief modal → `POST /diary/send-brief`); Invoices (fee entries, WHT-compliant tax invoice with §153 ITO 2001, bilingual Cash Receipt/Raseed print); Legal Notices (draft, dispatch, track 30-day responses); Outstanding Dues (aging buckets: Current / 0-30 / 31-60 / 60+ days); Staff & Salary (CRUD, daily attendance, monthly salary with deductions); Cause List (daily LHC cause list scrape + matter matching — see gaps); Vakalatnama Register (cross-matter filing status); Counsel & Judge Intelligence (private notes); Document Drafting; Team Members (seat counter, invite, WhatsApp number, permissions); Audit Log (filters + CSV export); Plan & Subscription; Organization Settings.

**Employee Portal (`/#/app`)**: scoped AI chat (org's documents only); EN/اردو language toggle (AI responds in Urdu when toggled); RTL auto-detect in chat; PDF/Word export of AI answers; profile + password change.

**WhatsApp integration**: Twilio webhook for inbound messages; Whisper voice-to-text; hearing/deadline reminders (day before, auto-sent); WhatsApp onboarding flow (self-registration); morning brief send (`/diary/send-brief`, falls back to `wa.me` share link if Twilio not configured); client self-update after hearing outcome (infra ready, bot not fully live — see gaps).

**Other**: Client Portal (`/#/portal`) — read-only, token-based, external clients; Compliance page (`/#/compliance`) — DPA, data residency, security transparency; Landing page — PKR pricing, PLD/SCMR callout, WhatsApp CTA; Admin Dashboard — org management, user management, case law uploads, upgrade requests, cross-org audit log, per-org feature flags; Urdu UI Labels toggle (EN/اردو) in OwnerPortal — nav, headers, panel titles all switch.

## What's still missing (honest gap assessment)
1. **LHC Cause List scraper** that actually works reliably — current implementation is a stub; real LHC HTML parsing still needed.
2. **Automatic client WhatsApp after hearing outcome is marked** — the biggest time-saver, not yet wired end-to-end.
3. **Offline mode** — PWA shell exists but data isn't cached for offline court use.
4. **Voice input (Urdu)** — Web Speech API or Whisper-based voice logging of hearing outcomes.
5. **OCR on physical documents** — point camera at FIR/order, auto-populate matter fields.
6. **Associate dispatch & reporting** — assign junior to a hearing, they report back through the app, client gets notified.
7. **Client self-service WhatsApp bot** — client texts "mera case", gets an automatic update.
8. **Bulk WhatsApp for court holiday notifications** — one-click notify all clients with pending dates.

## Key conventions / constraints
- Never hardcode real credentials — always use `PLACEHOLDER_*` strings.
- Do not touch GitHub Actions workflows.
- Do not upgrade Python dependencies without checking compatibility.
- Keep all Azure resources in `eastus2`.
- Multi-tenancy is load-bearing: every new table/query must filter by `organization_id`.
