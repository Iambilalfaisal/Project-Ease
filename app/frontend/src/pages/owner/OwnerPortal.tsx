import { useState, useEffect, useRef } from "react";
import styles from "./OwnerPortal.module.css";
import { toggleTheme, getTheme, Theme } from "../../theme";
import { queueWrite, initOfflineSync, fetchWithCache, getPendingCount } from "../../offline/offlineQueue";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "overview" | "documents" | "clients" | "matters" | "calendar" | "diary" | "invoices" | "team" | "subscription" | "settings" | "audit" | "drafting" | "causelist" | "vakalat" | "intelligence" | "notices" | "dues" | "staff";

interface Category {
    category_id: string;
    name: string;
}

interface DocFile {
    doc_id: string;
    name: string;         // filename
    size: string;         // formatted string, e.g. "1.2 MB"
    size_bytes: number;
    uploaded: string;     // date string
    status: "ready" | "processing" | "error";
    category_id: string | null;
    category_name: string | null;
}

interface TeamMember {
    user_id: string;
    name: string;
    email: string;
    role: string;
    joined: string;
    whatsapp_number?: string | null;
}

interface Usage {
    total_docs: number;
    total_bytes: number;
}

interface Client {
    client_id:        string;
    name:             string;
    client_type:      "Individual" | "Corporate";
    email?:           string;
    phone?:           string;
    address?:         string;
    cnic_ntn?:        string;
    notes?:           string;
    referral_source?: string;
    created_at:       string;
    matter_count?:    number;
}

interface MatterTeam {
    team_id: string;
    name:    string;
    members: { user_id: string; name: string }[];
}

interface MatterDoc {
    doc_id:        string;
    filename:      string;
    size_bytes:    number;
    status:        string;
    category_id:   string | null;
    category_name: string | null;
    uploaded_at:   string;
    matter_id?:    string | null;
}

interface Matter {
    matter_id:       string;
    client_id:       string;
    client_name:     string;
    client_phone?:   string;
    title:           string;
    matter_type:     string;
    status:          "Active" | "Pending" | "Closed" | "Settled" | "Withdrawn";
    court_name?:     string;
    case_number?:    string;
    filing_date?:    string;
    opposing_party?: string;
    team_id?:        string;
    team_name?:      string;
    notes?:               string;
    limitation_type?:      string;
    cause_of_action_date?: string;
    limitation_date?:      string;
    vakalatnama_status?:   string;
    adjournment_count?:    number;
    priority?:             string;
    physical_file_ref?:    string;
    rack_no?:              string;
    bundle_no?:            string;
    parent_matter_id?:     string | null;   // Task #166
    matter_stage?:         string | null;   // Task #166
    created_at:            string;
    doc_count?:            number;
    documents?:            MatterDoc[];
}

interface ClientToken {
    token_id:   string;
    token:      string;
    client_id:  string;
    matter_id:  string | null;
    label:      string | null;
    expires_at: string | null;
    is_active:  number;
    created_at: string;
}

interface Fee {
    fee_id:       string;
    matter_id:    string | null;
    description:  string;
    fee_type:     string;
    amount:       number;
    fee_date:     string;
    is_paid:      number;
    paid_at:      string | null;
    invoice_id:   string | null;
    notes:        string | null;
    matter_title: string | null;
}

interface Invoice {
    invoice_id:     string;
    matter_id:      string | null;
    client_id:      string | null;
    invoice_number: string;
    title:          string;
    status:         "draft" | "sent" | "paid" | "cancelled";
    issued_date:    string;
    due_date:       string | null;
    total_amount:   number;
    wht_rate:       number;
    wht_amount:     number;
    net_payable:    number;
    org_ntn:        string | null;
    client_ntn:     string | null;
    notes:          string | null;
    matter_title:   string | null;
    case_number:    string | null;
    client_name:    string | null;
    client_email:   string | null;
    client_phone:   string | null;
    fees?:          Fee[];
}

interface TimeEntry {
    entry_id:         string;
    matter_id:        string;
    user_id:          string | null;
    user_name:        string | null;
    description:      string | null;
    entry_date:       string;
    duration_minutes: number;
    hourly_rate:      number;
    billable:         number;
    fee_id:           string | null;
    created_at:       string;
}

interface MatterDeadline {
    deadline_id:  string;
    matter_id:    string;
    title:        string;
    due_date:     string;
    priority:     string;
    completed:    number;
    completed_at: string | null;
    notes:        string | null;
    created_at:   string;
}

interface MatterExpense {
    expense_id:   string;
    matter_id:    string;
    description:  string;
    amount_pkr:   number;
    expense_date: string;
    category:     string;
    billable:     number;
    receipt_ref:  string | null;
    created_at:   string;
}

interface MatterCorrespondence {
    corr_id:      string;
    matter_id:    string;
    corr_date:    string;
    direction:    string;
    corr_type:    string;
    subject:      string;
    party:        string | null;
    reference_no: string | null;
    notes:        string | null;
    created_at:   string;
}

interface CourtFeePayment {
    fee_payment_id:   string;
    matter_id:        string;
    claim_amount_pkr: number;
    fee_type:         string;
    calculated_fee:   number;
    actual_paid:      number;
    payment_date:     string | null;
    challan_no:       string | null;
    court:            string | null;
    notes:            string | null;
    created_at:       string;
}

interface MatterCheque {
    cheque_id:      string;
    matter_id:      string;
    cheque_no:      string;
    bank_name:      string | null;
    account_title:  string | null;
    amount_pkr:     number;
    cheque_date:    string | null;
    cheque_type:    string;
    status:         string;
    received_date:  string | null;
    presented_date: string | null;
    notes:          string | null;
    created_at:     string;
}

// ── Task #167: Bail Bonds ────────────────────────────────────────────────────
interface BailBond {
    bond_id:           string;
    matter_id:         string;
    accused_name:      string;
    bail_type:         string;
    bail_amount_pkr:   number;
    surety_name:       string | null;
    surety_cnic:       string | null;
    surety_address:    string | null;
    surety_property:   string | null;
    property_value:    number | null;
    court:             string | null;
    judge:             string | null;
    granted_date:      string | null;
    expiry_date:       string | null;
    status:            string;
    bail_order_ref:    string | null;
    notes:             string | null;
    created_at:        string;
}

// ── Task #170: Court Transfers ───────────────────────────────────────────────
interface CourtTransfer {
    transfer_id:   string;
    matter_id:     string;
    transfer_date: string | null;
    from_court:    string;
    to_court:      string;
    from_judge:    string | null;
    to_judge:      string | null;
    reason:        string | null;
    order_ref:     string | null;
    notes:         string | null;
    created_at:    string;
}

// ── Task #165: Legal Notice ──────────────────────────────────────────────────
interface LegalNotice {
    notice_id:    string;
    matter_id:    string | null;
    client_id:    string | null;
    notice_type:  string;
    sent_to:      string;
    sent_via:     string;
    sent_date:    string | null;
    response_due: string | null;
    response_date:string | null;
    status:       string;
    subject:      string | null;
    content:      string | null;
    tracking_no:  string | null;
    notes:        string | null;
    created_at:   string;
}

// ── Task #169: Outstanding Dues ──────────────────────────────────────────────
interface OutstandingInvoice {
    invoice_id:   string;
    matter_title: string;
    client_name:  string;
    total_pkr:    number;
    paid_pkr:     number;
    balance:      number;
    invoice_date: string;
    due_date:     string | null;
    status:       string;
    aging_bucket: string;
}

// ── Task #171: Staff ─────────────────────────────────────────────────────────
interface StaffMember {
    staff_id:           string;
    name:               string;
    role:               string;
    monthly_salary_pkr: number;
    join_date:          string | null;
    cnic:               string | null;
    phone:              string | null;
    status:             string;
    notes:              string | null;
}
interface StaffAttendance {
    att_id:    string;
    staff_id:  string;
    att_date:  string;
    status:    string;
    time_in:   string | null;
    time_out:  string | null;
    notes:     string | null;
}
interface SalaryPayment {
    payment_id:          string;
    staff_id:            string;
    month:               string;
    gross_pkr:           number;
    advance_deduction:   number;
    absence_deduction:   number;
    net_paid_pkr:        number;
    paid_date:           string | null;
    payment_mode:        string;
    notes:               string | null;
}

interface AssociateFee {
    assoc_fee_id:    string;
    matter_id:       string;
    advocate_name:   string;
    bar_no:          string | null;
    appearance_date: string | null;
    amount_pkr:      number;
    paid:            number;
    payment_date:    string | null;
    notes:           string | null;
    created_at:      string;
}

interface MatterChallan {
    challan_id:        string;
    matter_id:         string;
    challan_date:      string | null;
    challan_type:      string;
    submitted_in_time: number;
    witnesses_count:   number;
    challan_court:     string | null;
    status:            string;
    notes:             string | null;
    created_at:        string;
}

interface MatterFir {
    fir_id:                   string;
    matter_id:                string;
    fir_number:               string;
    police_station:           string;
    district:                 string | null;
    io_name:                  string | null;
    complainant:              string | null;
    arrest_date:              string | null;
    sections_at_fir:          string | null;
    sections_after_challan:   string | null;
    fir_date:                 string | null;
    notes:                    string | null;
    created_at:               string;
}

interface MatterCharge {
    charge_id:          string;
    matter_id:          string;
    section_no:         string;
    description:        string | null;
    plea:               string;
    charge_framed:      number;
    charge_framed_date: string | null;
    court:              string | null;
    notes:              string | null;
    created_at:         string;
}

interface MatterOutcome {
    outcome_id:        string;
    matter_id:         string;
    disposal_date:     string | null;
    outcome_type:      string;
    court:             string | null;
    judge:             string | null;
    decree_amount_pkr: number | null;
    appeal_filed:      number;
    appeal_deadline:   string | null;
    notes:             string | null;
    modified_at:       string;
}

interface MatterRelief {
    relief_id:         string;
    matter_id:         string;
    application_date:  string;
    relief_type:       string;
    court:             string | null;
    judge:             string | null;
    status:            string;
    conditions:        string | null;
    surety_amount_pkr: number | null;
    surety_name:       string | null;
    notes:             string | null;
    created_at:        string;
}

interface Witness {
    witness_id:      string;
    matter_id:       string;
    witness_name:    string;
    witness_type:    string;
    contact_number:  string | null;
    address:         string | null;
    statement_status: string;
    notes:           string | null;
    created_at:      string;
}

interface DocRequest {
    request_id:     string;
    matter_id:      string;
    doc_name:       string;
    requested_date: string;
    due_date:       string | null;
    status:         string;
    notes:          string | null;
    received_date:  string | null;
    created_at:     string;
}

interface AdverseParty {
    party_id:     string;
    matter_id:    string;
    party_name:   string;
    party_type:   string;
    counsel_name:  string | null;
    counsel_phone: string | null;
    counsel_firm:  string | null;
    notes:         string | null;
    created_at:    string;
}

interface CourtOrder {
    order_id:     string;
    matter_id:    string;
    hearing_date: string;
    court_name:   string | null;
    order_brief:  string;
    next_date:    string | null;
    outcome:      "Adjourned" | "Heard" | "Decided" | "Partially Heard";
    created_at:   string;
    _offline?:    boolean;   // client-side only: queued locally, not yet synced
}

interface AuditLog {
    log_id:        string;
    org_id:        string | null;
    user_id:       string | null;
    actor_name:    string | null;
    actor_role:    string | null;
    event_type:    string;
    resource_type: string | null;
    resource_id:   string | null;
    resource_name: string | null;
    details:       string | null;  // JSON string
    ip_address:    string | null;
    created_at:    string;
}

interface Template {
    template_id:   string;
    org_id:        string;
    title:         string;
    template_type: string;
    content:       string;
    description:   string | null;
    created_at:    string;
    modified_at:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
    const token = sessionStorage.getItem("pe_token") ?? "";
    return { Authorization: `Bearer ${token}` };
}

function fmtBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024)        return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
}

function fmtDate(iso: string): string {
    return iso ? iso.slice(0, 10) : "";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
    org_owner: "Firm Owner",
    employee:  "Employee",
};

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

// ── Matter / Court constants ──────────────────────────────────────────────────

const MATTER_TYPES = [
    "Criminal Defence", "Civil Litigation", "Family & Personal Law",
    "Property & Real Estate", "Corporate & Commercial", "Tax & Revenue",
    "Constitutional & Public Law", "Banking & Finance",
    "Labour & Employment", "Intellectual Property",
];

const MATTER_STATUSES = ["Active", "Pending", "Closed", "Settled", "Withdrawn"] as const;

const FEE_TYPES = ["Consultation", "Court Appearance", "Filing Fee", "Legal Research", "Document Drafting", "Miscellaneous"] as const;

const INVOICE_STATUS_BADGE: Record<string, string> = {
    draft:     "badgeGray",
    sent:      "badgeBlue",
    paid:      "badgeGreen",
    cancelled: "badgeAmber",
};

function fmtPKR(n: number): string {
    if (n === 0) return "Free";
    return "PKR " + n.toLocaleString("en-PK");
}

const DEFAULT_COURTS = [
    "Supreme Court of Pakistan", "Federal Shariat Court",
    "Lahore High Court", "Sindh High Court", "Islamabad High Court",
    "Peshawar High Court", "Balochistan High Court",
    "Gilgit-Baltistan Chief Court", "Azad Kashmir High Court",
    "District & Sessions Court", "Civil Judge Court", "Magistrate Court",
    "Banking Court", "Labour Court", "National Accountability Court",
    "Customs Appellate Tribunal", "Income Tax Appellate Tribunal",
    "Anti-Corruption Establishment Court", "Service Tribunal", "Family Court",
];

const STATUS_BADGE: Record<string, string> = {
    Active:    "badgeGreen",
    Pending:   "badgeAmber",
    Closed:    "badgeGray",
    Settled:   "badgeBlue",
    Withdrawn: "badgeRed",
};

function groupDocsByCategory(docs: MatterDoc[]): [string, MatterDoc[]][] {
    const groups: Record<string, MatterDoc[]> = {};
    docs.forEach(d => {
        const key = d.category_name ?? "— Uncategorized";
        (groups[key] = groups[key] || []).push(d);
    });
    return Object.entries(groups).sort(([a], [b]) => {
        if (a === "— Uncategorized") return 1;
        if (b === "— Uncategorized") return -1;
        return a.localeCompare(b);
    });
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.png,.jpg,.jpeg,.tiff,.bmp";

const PLAN_LIMITS: Record<string, { docs: number; users: number }> = {
    free:       { docs: 20,        users: 5         },
    pro:        { docs: 500,       users: 25        },
    enterprise: { docs: 9_999_999, users: 9_999_999 },
};

// ── Clients Panel ─────────────────────────────────────────────────────────────

const REFERRAL_SOURCES = [
    "Walk-in", "Referral – Existing Client", "Referral – Colleague",
    "Bar Association", "Online / Website", "Social Media", "WhatsApp", "Other",
] as const;

const BLANK_CLIENT = {
    name: "", client_type: "Individual" as "Individual" | "Corporate",
    email: "", phone: "", address: "", cnic_ntn: "", notes: "", referral_source: "",
};

const ClientsPanel = () => {
    const [clients,  setClients]  = useState<Client[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [detail,   setDetail]   = useState<(Client & { matters: Matter[] }) | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editMode,  setEditMode] = useState(false);
    const [form,     setForm]     = useState({ ...BLANK_CLIENT });
    const [saving,   setSaving]   = useState(false);
    const [formErr,  setFormErr]  = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);

    // ─ Portal sharing state ─
    const [portalClient,  setPortalClient]  = useState<Client | null>(null);
    const [portalTokens,  setPortalTokens]  = useState<ClientToken[]>([]);
    const [portalMatters, setPortalMatters] = useState<Matter[]>([]);
    const [portalLoading, setPortalLoading] = useState(false);
    const [portalForm,    setPortalForm]    = useState({ matter_id: "", label: "", expires_days: "30" });
    const [portalCreating, setPortalCreating] = useState(false);
    const [newTokenUrl,   setNewTokenUrl]   = useState<string | null>(null);
    const [revoking,      setRevoking]      = useState<string | null>(null);
    const [copied,        setCopied]        = useState(false);

    const loadClients = () => {
        fetch("/clients", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setClients(d.clients ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    };
    useEffect(() => { loadClients(); }, []);

    const openDetail = (c: Client) => {
        fetch(`/clients/${c.client_id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setDetail(d))
            .catch(() => {});
    };

    const openAdd = () => {
        setForm({ ...BLANK_CLIENT }); setEditMode(false); setFormErr(null); setShowModal(true);
    };

    const openEdit = (c: Client) => {
        setForm({
            name: c.name, client_type: c.client_type,
            email: c.email ?? "", phone: c.phone ?? "",
            address: c.address ?? "", cnic_ntn: c.cnic_ntn ?? "", notes: c.notes ?? "",
            referral_source: c.referral_source ?? "",
        });
        setEditMode(true); setFormErr(null); setShowModal(true);
    };

    const saveClient = async () => {
        if (!form.name.trim()) { setFormErr("Client name is required."); return; }
        setSaving(true); setFormErr(null);
        try {
            const url    = editMode && detail ? `/clients/${detail.client_id}` : "/clients";
            const method = editMode ? "PATCH" : "POST";
            const res    = await fetch(url, {
                method,
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setFormErr(data.error ?? "Failed."); setSaving(false); return; }
            setShowModal(false);
            loadClients();
            if (editMode && detail) {
                setDetail({ ...detail, ...data });
            }
        } catch { setFormErr("Network error."); }
        setSaving(false);
    };

    const removeClient = async (c: Client) => {
        if (!confirm(`Remove client "${c.name}" and all their matters?`)) return;
        setRemoving(c.client_id);
        await fetch(`/clients/${c.client_id}`, { method: "DELETE", headers: authHeaders() });
        setClients(prev => prev.filter(x => x.client_id !== c.client_id));
        if (detail?.client_id === c.client_id) setDetail(null);
        setRemoving(null);
    };

    const openPortal = async (c: Client) => {
        setPortalClient(c);
        setPortalForm({ matter_id: "", label: "", expires_days: "30" });
        setNewTokenUrl(null);
        setCopied(false);
        setPortalLoading(true);
        const [tokRes, matRes] = await Promise.all([
            fetch(`/client-tokens?client_id=${c.client_id}`, { headers: authHeaders() }),
            fetch(`/clients/${c.client_id}`, { headers: authHeaders() }),
        ]);
        if (tokRes.ok)  setPortalTokens((await tokRes.json()).tokens ?? []);
        if (matRes.ok)  setPortalMatters((await matRes.json()).matters ?? []);
        setPortalLoading(false);
    };

    const createPortalLink = async () => {
        if (!portalClient) return;
        setPortalCreating(true); setNewTokenUrl(null);
        try {
            const body: Record<string, string> = { client_id: portalClient.client_id };
            if (portalForm.matter_id)   body.matter_id   = portalForm.matter_id;
            if (portalForm.label)       body.label        = portalForm.label;
            if (portalForm.expires_days) body.expires_days = portalForm.expires_days;
            const res = await fetch("/client-tokens", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                const d = await res.json();
                const url = `${window.location.origin}${window.location.pathname}#/portal?token=${d.token}`;
                setNewTokenUrl(url);
                setPortalTokens(prev => [d as ClientToken, ...prev]);
                setPortalForm({ matter_id: "", label: "", expires_days: "30" });
            }
        } finally {
            setPortalCreating(false);
        }
    };

    const revokePortalToken = async (tokenId: string) => {
        if (!confirm("Revoke this portal link? The client will no longer be able to access their portal via this link.")) return;
        setRevoking(tokenId);
        await fetch(`/client-tokens/${tokenId}`, { method: "DELETE", headers: authHeaders() });
        setPortalTokens(prev => prev.filter(t => t.token_id !== tokenId));
        setRevoking(null);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    // ─ Trust Ledger — Task #154 ─
    const BLANK_TL = { txn_type: "Credit", amount_pkr: 0, description: "", txn_date: new Date().toISOString().slice(0, 10), reference_no: "", notes: "", matter_id: "" };
    const [trustClient,   setTrustClient]   = useState<Client | null>(null);
    const [trustEntries,  setTrustEntries]  = useState<{ ledger_id: string; txn_type: string; amount_pkr: number; balance_pkr: number; description: string; txn_date: string; reference_no: string | null; notes: string | null; matter_id: string | null; created_at: string }[]>([]);
    const [trustBalance,  setTrustBalance]  = useState(0);
    const [trustLoading,  setTrustLoading]  = useState(false);
    const [showTLModal,   setShowTLModal]   = useState(false);
    const [tlForm,        setTlForm]        = useState<typeof BLANK_TL>({ ...BLANK_TL });
    const [tlSaving,      setTlSaving]      = useState(false);
    const [tlErr,         setTlErr]         = useState("");

    const openTrustLedger = (c: Client) => {
        setTrustClient(c); setTrustLoading(true); setTrustEntries([]); setTrustBalance(0);
        fetch(`/clients/${c.client_id}/trust-ledger`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setTrustEntries(d.entries || []); setTrustBalance(d.balance || 0); setTrustLoading(false); })
            .catch(() => setTrustLoading(false));
    };
    const saveTLEntry = async () => {
        if (!trustClient) return;
        if (!tlForm.description.trim()) { setTlErr("Description is required"); return; }
        if (!tlForm.txn_date) { setTlErr("Date is required"); return; }
        setTlSaving(true); setTlErr("");
        const res = await fetch(`/clients/${trustClient.client_id}/trust-ledger`, {
            method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(tlForm),
        });
        setTlSaving(false);
        if (res.ok) {
            setShowTLModal(false); setTlForm({ ...BLANK_TL });
            openTrustLedger(trustClient);
        } else { const e = await res.json(); setTlErr(e.error || "Save failed"); }
    };
    const deleteTLEntry = (ledgerId: string) => {
        if (!trustClient || !confirm("Delete this ledger entry? Balance will be recomputed.")) return;
        fetch(`/clients/${trustClient.client_id}/trust-ledger/${ledgerId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => openTrustLedger(trustClient));
    };

    const PortalModal = () => (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setPortalClient(null); }}>
            <div className={styles.modal} style={{ maxWidth: 560 }}>
                <h3 className={styles.modalTitle}>🔗 Share Portal — {portalClient?.name}</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: "1rem", lineHeight: 1.5 }}>
                    Generate a secure link for your client to view their documents online. Links expire automatically.
                </p>

                {/* Generate new link form */}
                <div className={styles.portalForm}>
                    <h4 className={styles.portalFormTitle}>Generate New Link</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Matter (optional)</label>
                            <select className={styles.formSelect} value={portalForm.matter_id} onChange={e => setPortalForm({ ...portalForm, matter_id: e.target.value })}>
                                <option value="">— All matters —</option>
                                {portalMatters.map(m => (
                                    <option key={m.matter_id} value={m.matter_id}>{m.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Expires in (days)</label>
                            <select className={styles.formSelect} value={portalForm.expires_days} onChange={e => setPortalForm({ ...portalForm, expires_days: e.target.value })}>
                                <option value="7">7 days</option>
                                <option value="30">30 days</option>
                                <option value="90">90 days</option>
                                <option value="365">1 year</option>
                                <option value="">Never expires</option>
                            </select>
                        </div>
                        <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                            <label className={styles.formLabel}>Label (optional)</label>
                            <input className={styles.formInput} value={portalForm.label} onChange={e => setPortalForm({ ...portalForm, label: e.target.value })} placeholder="e.g. Court documents — July 2026" />
                        </div>
                    </div>
                    <button className={styles.btnPrimary} style={{ marginTop: "0.75rem" }} onClick={createPortalLink} disabled={portalCreating}>
                        {portalCreating ? "Generating…" : "Generate Link"}
                    </button>
                </div>

                {/* Newly created link */}
                {newTokenUrl && (
                    <div className={styles.portalNewLink}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginBottom: "0.4rem", fontWeight: 600 }}>
                            ✅ Link generated — copy and send to your client:
                        </div>
                        <div className={styles.portalLinkRow}>
                            <code className={styles.portalLinkCode}>{newTokenUrl}</code>
                            <button className={styles.portalCopyBtn} onClick={() => copyToClipboard(newTokenUrl)}>
                                {copied ? "✓ Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Existing tokens */}
                <div style={{ marginTop: "1.25rem" }}>
                    <h4 className={styles.portalFormTitle}>Active Links</h4>
                    {portalLoading ? (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>Loading…</div>
                    ) : portalTokens.filter(t => t.is_active).length === 0 ? (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>No active portal links yet.</div>
                    ) : (
                        <div className={styles.portalTokenList}>
                            {portalTokens.filter(t => t.is_active).map(t => {
                                const tUrl = `${window.location.origin}${window.location.pathname}#/portal?token=${t.token}`;
                                return (
                                    <div key={t.token_id} className={styles.portalTokenRow}>
                                        <div className={styles.portalTokenInfo}>
                                            <span className={styles.portalTokenLabel}>{t.label || "Portal Link"}</span>
                                            <span className={styles.portalTokenMeta}>
                                                Created {t.created_at?.slice(0, 10)}
                                                {t.expires_at && ` · Expires ${t.expires_at.slice(0, 10)}`}
                                                {t.matter_id && " · Matter-scoped"}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                                            <button className={styles.portalCopyBtn} onClick={() => copyToClipboard(tUrl)}>Copy</button>
                                            <button className={styles.actionBtnDanger} style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                                                disabled={revoking === t.token_id} onClick={() => revokePortalToken(t.token_id)}>
                                                {revoking === t.token_id ? "…" : "Revoke"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.modalActions}>
                    <button className={styles.btnGhost} onClick={() => setPortalClient(null)}>Close</button>
                </div>
            </div>
        </div>
    );

    const ClientModal = () => (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className={styles.modal} style={{ maxWidth: 480 }}>
                <h3 className={styles.modalTitle}>{editMode ? "Edit Client" : "Add Client"}</h3>
                {formErr && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {formErr}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>Name *</label>
                        <input className={styles.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client or firm name" autoFocus />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Type</label>
                        <select className={styles.formSelect} value={form.client_type} onChange={e => setForm({ ...form, client_type: e.target.value as any })}>
                            <option>Individual</option>
                            <option>Corporate</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Phone</label>
                        <input className={styles.formInput} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" />
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>Email</label>
                        <input className={styles.formInput} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>CNIC / NTN</label>
                        <input className={styles.formInput} value={form.cnic_ntn} onChange={e => setForm({ ...form, cnic_ntn: e.target.value })} placeholder="42201-0000000-0" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Address</label>
                        <input className={styles.formInput} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City, Province" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Referral Source</label>
                        <select className={styles.formSelect} value={form.referral_source} onChange={e => setForm({ ...form, referral_source: e.target.value })}>
                            <option value="">Not specified</option>
                            {REFERRAL_SOURCES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                        <label className={styles.formLabel}>Notes</label>
                        <input className={styles.formInput} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional internal notes" />
                    </div>
                </div>
                <div className={styles.modalActions}>
                    <button className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={saveClient} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                </div>
            </div>
        </div>
    );

    // ─ Detail view ─
    if (detail) {
        return (
            <div className={styles.panelContent}>
                <button className={styles.backBtn} onClick={() => setDetail(null)}>← Back to Clients</button>
                <div className={styles.detailHeader}>
                    <div>
                        <h2 className={styles.detailTitle}>{detail.name}</h2>
                        <span className={detail.client_type === "Corporate" ? styles.badgeGold : styles.badgeGray} style={{ marginTop: "0.35rem", display: "inline-block" }}>
                            {detail.client_type}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => openEdit(detail)}>Edit</button>
                        <button className={styles.actionBtnDanger} style={{ fontSize: "0.8rem" }} onClick={() => removeClient(detail)}>Delete</button>
                    </div>
                </div>

                <div className={styles.detailInfoGrid}>
                    {detail.email    && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Email</span><span>{detail.email}</span></div>}
                    {detail.phone    && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Phone</span><span>{detail.phone}</span></div>}
                    {detail.cnic_ntn        && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>CNIC / NTN</span><span>{detail.cnic_ntn}</span></div>}
                    {detail.address         && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Address</span><span>{detail.address}</span></div>}
                    {detail.referral_source && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Referral Source</span><span className={styles.badgeGray} style={{ fontSize: "0.78rem" }}>{detail.referral_source}</span></div>}
                    {detail.notes           && <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}><span className={styles.detailInfoLabel}>Notes</span><span>{detail.notes}</span></div>}
                </div>

                <div className={styles.sectionTitle} style={{ marginTop: "1.75rem" }}>
                    Matters ({detail.matters.length})
                </div>
                {detail.matters.length === 0 ? (
                    <div className={styles.emptyHint}>No matters yet for this client.</div>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead><tr>
                                <th>Title</th><th>Type</th><th>Status</th><th>Court</th><th>Case #</th><th>Filed</th>
                            </tr></thead>
                            <tbody>
                                {detail.matters.map(m => (
                                    <tr key={m.matter_id}>
                                        <td><strong>{m.title}</strong></td>
                                        <td className={styles.muted}>{m.matter_type}</td>
                                        <td><span className={(styles as any)[STATUS_BADGE[m.status] ?? "badgeGray"]}>{m.status}</span></td>
                                        <td className={styles.muted}>{m.court_name ?? "—"}</td>
                                        <td className={styles.muted}>{m.case_number ?? "—"}</td>
                                        <td className={styles.muted}>{m.filing_date ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {showModal && <ClientModal />}
            </div>
        );
    }

    // ─ List view ─
    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{clients.length} client{clients.length !== 1 ? "s" : ""}</span>
                <button className={styles.btnPrimary} onClick={openAdd}>+ Add Client</button>
            </div>
            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : clients.length === 0 ? (
                <div className={styles.emptyHint}>No clients yet. Add your first client to start tracking matters.</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead><tr>
                            <th>Name</th><th>Type</th><th>Referral Source</th><th>Email</th><th>Phone</th><th>Matters</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {clients.map(c => (
                                <tr key={c.client_id}>
                                    <td>
                                        <button className={styles.linkBtn} onClick={() => openDetail(c)}>{c.name}</button>
                                    </td>
                                    <td><span className={c.client_type === "Corporate" ? styles.badgeGold : styles.badgeGray}>{c.client_type}</span></td>
                                    <td className={styles.muted} style={{ fontSize: "0.8rem" }}>{c.referral_source ?? <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                                    <td className={styles.muted}>{c.email ?? "—"}</td>
                                    <td className={styles.muted}>{c.phone ?? "—"}</td>
                                    <td className={styles.muted}>{c.matter_count ?? 0}</td>
                                    <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                        <button className={styles.actionBtn} onClick={() => openDetail(c)}>View</button>
                                        <button className={styles.actionBtn} onClick={() => openEdit(c)}>Edit</button>
                                        <button className={styles.actionBtnPortal} onClick={() => openPortal(c)}>Share Portal</button>
                                        <button className={styles.actionBtn} onClick={() => openTrustLedger(c)}>Trust A/C</button>
                                        <button className={styles.actionBtnDanger} disabled={removing === c.client_id} onClick={() => removeClient(c)}>
                                            {removing === c.client_id ? "…" : "Delete"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {showModal && <ClientModal />}
            {portalClient && <PortalModal />}

            {/* ── Trust Ledger Sheet — Task #154 ── */}
            {trustClient && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setTrustClient(null); }}>
                    <div className={styles.modal} style={{ maxWidth: 680 }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>💰 Trust / Advance Ledger — {trustClient.name}</h3>
                            <button className={styles.modalClose} onClick={() => setTrustClient(null)}>✕</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                            <div>
                                <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Running Balance: </span>
                                <strong style={{ fontSize: "1.1rem", color: trustBalance >= 0 ? "#16a34a" : "#dc2626" }}>
                                    PKR {trustBalance.toLocaleString()}
                                </strong>
                                {trustBalance < 0 && <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", color: "#dc2626" }}>(Overdrawn)</span>}
                            </div>
                            <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => { setTlForm({ ...BLANK_TL }); setTlErr(""); setShowTLModal(true); }}>+ Add Entry</button>
                        </div>
                        {trustLoading ? (
                            <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                        ) : trustEntries.length === 0 ? (
                            <div className={styles.emptyHint}>No entries yet. Record advance payments received from the client (Credit) or disbursements made on their behalf (Debit).</div>
                        ) : (
                            <table className={styles.feeTable}>
                                <thead><tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Balance</th>
                                    <th>Ref</th>
                                    <th style={{ width: 50 }}></th>
                                </tr></thead>
                                <tbody>
                                    {trustEntries.map(e => (
                                        <tr key={e.ledger_id}>
                                            <td className={styles.muted}>{e.txn_date}</td>
                                            <td>
                                                <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: e.txn_type === "Credit" ? "#dcfce7" : "#fee2e2", color: e.txn_type === "Credit" ? "#16a34a" : "#dc2626" }}>
                                                    {e.txn_type}
                                                </span>
                                            </td>
                                            <td>{e.description}</td>
                                            <td style={{ fontVariantNumeric: "tabular-nums" }}>
                                                <span style={{ color: e.txn_type === "Credit" ? "#16a34a" : "#dc2626" }}>
                                                    {e.txn_type === "Credit" ? "+" : "−"}PKR {e.amount_pkr.toLocaleString()}
                                                </span>
                                            </td>
                                            <td style={{ fontVariantNumeric: "tabular-nums", color: e.balance_pkr < 0 ? "#dc2626" : "var(--text-1)" }}>
                                                PKR {e.balance_pkr.toLocaleString()}
                                            </td>
                                            <td className={styles.muted} style={{ fontSize: "0.78rem" }}>{e.reference_no || "—"}</td>
                                            <td>
                                                <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 6px" }} onClick={() => deleteTLEntry(e.ledger_id)}>Del</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {showTLModal && (
                            <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                                <h4 style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>New Entry</h4>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Type</label>
                                        <select className={styles.formInput} value={tlForm.txn_type} onChange={e => setTlForm(f => ({ ...f, txn_type: e.target.value }))}>
                                            <option>Credit</option>
                                            <option>Debit</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Date *</label>
                                        <input type="date" className={styles.formInput} value={tlForm.txn_date} onChange={e => setTlForm(f => ({ ...f, txn_date: e.target.value }))} />
                                    </div>
                                    <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                                        <label className={styles.formLabel}>Description *</label>
                                        <input className={styles.formInput} value={tlForm.description} onChange={e => setTlForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Advance received for Supreme Court appeal" />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Amount (PKR) *</label>
                                        <input type="number" className={styles.formInput} min={0} value={tlForm.amount_pkr} onChange={e => setTlForm(f => ({ ...f, amount_pkr: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Reference No.</label>
                                        <input className={styles.formInput} value={tlForm.reference_no} onChange={e => setTlForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Cheque / receipt no." />
                                    </div>
                                </div>
                                {tlErr && <div className={styles.formError}>{tlErr}</div>}
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                                    <button className={styles.btnGhost} onClick={() => setShowTLModal(false)}>Cancel</button>
                                    <button className={styles.btnPrimary} onClick={saveTLEntry} disabled={tlSaving}>{tlSaving ? "Saving…" : "Save Entry"}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Matters Panel ─────────────────────────────────────────────────────────────

type MatterStatus = "Active" | "Pending" | "Closed" | "Settled" | "Withdrawn";

const LIMITATION_TYPES = [
    "Contract / Money Recovery",
    "Immovable Property (Title)",
    "Mortgage Enforcement",
    "Tort / Personal Injury",
    "Service / Employment",
    "Execution of Decree",
    "Appeal — High Court",
    "Appeal — Supreme Court",
    "Revision",
    "Constitutional Petition",
];

// Pre-computed periods in days matching backend LIMITATION_PERIODS
const LIMITATION_DAYS: Record<string, number | null> = {
    "Contract / Money Recovery":  3 * 365,
    "Immovable Property (Title)": 12 * 365,
    "Mortgage Enforcement":       30 * 365,
    "Tort / Personal Injury":     365,
    "Service / Employment":       3 * 365,
    "Execution of Decree":        3 * 365,
    "Appeal — High Court":        90,
    "Appeal — Supreme Court":     30,
    "Revision":                   90,
    "Constitutional Petition":    null,
};

function computeLimitationDate(limType: string, coaDate: string): string {
    const days = LIMITATION_DAYS[limType];
    if (!days || !coaDate) return "";
    const d = new Date(coaDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function limitationDaysRemaining(limitationDate: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lim = new Date(limitationDate); lim.setHours(0, 0, 0, 0);
    return Math.round((lim.getTime() - today.getTime()) / 86400000);
}

const VAKALATNAMA_STATUSES = ["Not Required", "Pending", "Filed"] as const;
const MATTER_PRIORITIES    = ["Urgent", "High", "Normal", "Low"] as const;

const BLANK_MATTER: {
    client_id: string; title: string; matter_type: string; status: MatterStatus;
    court_name: string; case_number: string; filing_date: string; opposing_party: string;
    team_id: string; notes: string;
    limitation_type: string; cause_of_action_date: string; limitation_date: string;
    vakalatnama_status: string; priority: string;
    physical_file_ref: string; rack_no: string; bundle_no: string;
    parent_matter_id: string; matter_stage: string;
} = {
    client_id: "", title: "", matter_type: MATTER_TYPES[0], status: "Active",
    court_name: "", case_number: "", filing_date: "", opposing_party: "", team_id: "", notes: "",
    limitation_type: "", cause_of_action_date: "", limitation_date: "",
    vakalatnama_status: "Pending", priority: "Normal",
    physical_file_ref: "", rack_no: "", bundle_no: "",
    parent_matter_id: "", matter_stage: "",
};

// ── Bail Workflow Checklist — per bail bond, org-configurable stages ─────────
interface BailStage {
    stage_key: string; label: string; sort_order: number;
    completed_at?: string | null; completed_by?: string | null;
    is_active?: number;
}

const BailChecklist = ({ matterId, bondId }: { matterId: string; bondId: string }) => {
    const [stages,  setStages]  = useState<BailStage[] | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const load = () => {
        fetch(`/matters/${matterId}/bail-bonds/${bondId}/stages`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setStages(d.stages ?? []))
            .catch(() => setStages([]));
    };
    useEffect(() => { load(); }, [bondId]);

    const toggle = async (stage: BailStage) => {
        setBusyKey(stage.stage_key);
        try {
            await fetch(`/matters/${matterId}/bail-bonds/${bondId}/stages/${stage.stage_key}`, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ completed: !stage.completed_at }),
            });
            load();
        } finally { setBusyKey(null); }
    };

    if (stages === null) return <div className={styles.muted} style={{ fontSize: "0.78rem" }}>Loading checklist…</div>;
    if (stages.length === 0) return null;

    const doneCount = stages.filter(s => s.completed_at).length;

    return (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-2)" }}>Bail Process Checklist</span>
                <span className={styles.muted} style={{ fontSize: "0.75rem" }}>{doneCount}/{stages.length} complete</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {stages.map(s => (
                    <label key={s.stage_key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", cursor: busyKey ? "wait" : "pointer" }}>
                        <input type="checkbox" checked={!!s.completed_at} disabled={busyKey === s.stage_key} onChange={() => toggle(s)} />
                        <span style={{ textDecoration: s.completed_at ? "line-through" : "none", color: s.completed_at ? "var(--text-3)" : "var(--text-1)" }}>
                            {s.label}
                        </span>
                        {s.completed_at && <span className={styles.muted} style={{ fontSize: "0.72rem" }}>· {s.completed_at.slice(0, 10)}</span>}
                    </label>
                ))}
            </div>
        </div>
    );
};

const MattersPanel = () => {
    const [matters,     setMatters]     = useState<Matter[]>([]);
    const [clients,     setClients]     = useState<Client[]>([]);
    const [matterTeams, setMatterTeams] = useState<MatterTeam[]>([]);
    const [customCourts, setCustomCourts] = useState<{ court_id: string; name: string }[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [detail,      setDetail]      = useState<Matter | null>(null);
    const [editDetail,  setEditDetail]  = useState(false);
    const [showModal,   setShowModal]   = useState(false);
    const [form,        setForm]        = useState({ ...BLANK_MATTER });
    const [saving,      setSaving]      = useState(false);
    const [formErr,     setFormErr]     = useState<string | null>(null);
    const [filterStatus,   setFilterStatus]   = useState("all");
    const [filterType,     setFilterType]     = useState("all");
    const [filterPriority, setFilterPriority] = useState("all");
    const [removing,    setRemoving]    = useState<string | null>(null);
    // Link doc modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [allDocs,       setAllDocs]       = useState<DocFile[]>([]);
    const [linkingDoc,    setLinkingDoc]    = useState<string | null>(null);
    // New court input
    const [newCourtName, setNewCourtName] = useState("");
    const [addingCourt,  setAddingCourt]  = useState(false);
    // Conflict checker — Task #150
    const [conflictResults, setConflictResults] = useState<{ matter_id: string; matter_title: string; client_name: string; opposing_party: string | null; status: string; reasons: string[] }[]>([]);
    const [conflictChecking, setConflictChecking] = useState(false);
    const [showConflictModal, setShowConflictModal] = useState(false);
    // Detail tabs & fees
    const [detailTab,  setDetailTab]  = useState<"documents" | "fees" | "orders" | "time" | "notes" | "docreqs" | "witnesses" | "deadlines" | "expenses" | "correspondence" | "relief" | "outcome" | "charges" | "fir" | "challan" | "courtfees" | "assocfees" | "cheques" | "bailbonds" | "transfers">("documents");
    const [fees,       setFees]       = useState<Fee[]>([]);
    const [feesLoading, setFeesLoading] = useState(false);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [editFee,      setEditFee]      = useState<Fee | null>(null);
    const [feeForm,      setFeeForm]      = useState({ description: "", fee_type: "Consultation", amount: "", fee_date: "", notes: "" });
    const [feeSaving,    setFeeSaving]    = useState(false);
    const [feeErr,       setFeeErr]       = useState("");
    const [genInvLoading, setGenInvLoading] = useState(false);
    // Court Orders — Task #130
    const [orders,        setOrders]        = useState<CourtOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [editOrder,      setEditOrder]      = useState<CourtOrder | null>(null);
    const [orderForm,      setOrderForm]      = useState({ hearing_date: "", court_name: "", order_brief: "", next_date: "", outcome: "Adjourned", notify_client: true });
    const [orderSaving,    setOrderSaving]    = useState(false);
    const [orderErr,       setOrderErr]       = useState("");
    // Voice input for hearing outcomes (Urdu/English) — Task: voice-log-outcome
    const [voiceRecording,  setVoiceRecording]  = useState(false);
    const [voiceProcessing, setVoiceProcessing] = useState(false);
    const [voiceErr,        setVoiceErr]        = useState("");
    const [voiceResult,     setVoiceResult]     = useState<{ transcript: string; outcome: string | null; next_date: string | null; order_brief: string } | null>(null);
    const voiceRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceChunksRef   = useRef<Blob[]>([]);
    // Adverse Parties — Task #131
    const BLANK_PARTY = { party_name: "", party_type: "Individual", counsel_name: "", counsel_phone: "", counsel_firm: "", notes: "" };
    const [adverseParties,   setAdverseParties]   = useState<AdverseParty[]>([]);
    const [showPartyModal,   setShowPartyModal]   = useState(false);
    const [editParty,        setEditParty]        = useState<AdverseParty | null>(null);
    const [partyForm,        setPartyForm]        = useState({ ...BLANK_PARTY });
    const [partySaving,      setPartySaving]      = useState(false);
    const [partyErr,         setPartyErr]         = useState("");
    // Time Tracking — Task #133
    const BLANK_TIME_FORM = { description: "", entry_date: new Date().toISOString().slice(0, 10), hours: "", minutes: "", hourly_rate: "", billable: true };
    const [timeEntries,    setTimeEntries]    = useState<TimeEntry[]>([]);
    const [timeLoading,    setTimeLoading]    = useState(false);
    const [showTimeModal,  setShowTimeModal]  = useState(false);
    const [editTimeEntry,  setEditTimeEntry]  = useState<TimeEntry | null>(null);
    const [timeForm,       setTimeForm]       = useState({ ...BLANK_TIME_FORM });
    const [timeSaving,     setTimeSaving]     = useState(false);
    const [timeErr,        setTimeErr]        = useState("");
    const [timerRunning,   setTimerRunning]   = useState(false);
    const [timerStart,     setTimerStart]     = useState<number | null>(null);
    const [timerElapsed,   setTimerElapsed]   = useState(0);   // seconds
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [billing,        setBilling]        = useState(false);
    const [billDesc,       setBillDesc]       = useState("");
    const [showBillModal,  setShowBillModal]  = useState(false);
    // Matter Notes — Task #138
    const NOTE_TYPES_UI = ["Note", "Call", "Meeting", "Instruction", "Email", "WhatsApp", "Other"];
    const BLANK_NOTE_FORM = { note_type: "Note", note_text: "", note_date: new Date().toISOString().slice(0, 10) };
    const [matterNotes,    setMatterNotes]    = useState<{ note_id: string; note_type: string; note_text: string; note_date: string; author_name?: string; created_at: string }[]>([]);
    const [notesLoading,   setNotesLoading]   = useState(false);
    const [showNoteModal,  setShowNoteModal]  = useState(false);
    const [editNote,       setEditNote]       = useState<{ note_id: string; note_type: string; note_text: string; note_date: string } | null>(null);
    const [noteForm,       setNoteForm]       = useState({ ...BLANK_NOTE_FORM });
    const [noteSaving,     setNoteSaving]     = useState(false);
    const [noteErr,        setNoteErr]        = useState("");
    // Document Requests — Task #140
    const DOC_REQUEST_STATUSES_UI = ["Pending", "Received", "Waived", "Overdue"];
    const BLANK_DOC_REQ = { doc_name: "", requested_date: new Date().toISOString().slice(0, 10), due_date: "", notes: "", status: "Pending", received_date: "" };
    const [docRequests,      setDocRequests]      = useState<DocRequest[]>([]);
    const [docReqLoading,    setDocReqLoading]    = useState(false);
    const [showDocReqModal,  setShowDocReqModal]  = useState(false);
    const [editDocReq,       setEditDocReq]       = useState<DocRequest | null>(null);
    const [docReqForm,       setDocReqForm]       = useState({ ...BLANK_DOC_REQ });
    const [docReqSaving,     setDocReqSaving]     = useState(false);
    const [docReqErr,        setDocReqErr]        = useState("");
    // Witnesses — Task #141
    const WITNESS_TYPES_UI    = ["Prosecution", "Defence", "Expert", "Character", "Other"];
    const STATEMENT_STATUSES_UI = ["Not Taken", "Taken", "Filed", "Cross-Examined"];
    const BLANK_WITNESS = { witness_name: "", witness_type: "Defence", contact_number: "", address: "", statement_status: "Not Taken", notes: "" };
    const [witnesses,       setWitnesses]       = useState<Witness[]>([]);
    const [witnessLoading,  setWitnessLoading]  = useState(false);
    const [showWitnessModal, setShowWitnessModal] = useState(false);
    const [editWitness,     setEditWitness]     = useState<Witness | null>(null);
    const [witnessForm,     setWitnessForm]     = useState({ ...BLANK_WITNESS });
    const [witnessSaving,   setWitnessSaving]   = useState(false);
    const [witnessErr,      setWitnessErr]      = useState("");
    // Matter Deadlines — Task #142
    const DEADLINE_PRIORITIES_UI = ["High", "Medium", "Low"];
    const BLANK_DEADLINE = { title: "", due_date: new Date().toISOString().slice(0, 10), priority: "Medium", notes: "" };
    const [matterDeadlines,    setMatterDeadlines]    = useState<MatterDeadline[]>([]);
    const [deadlinesLoading,   setDeadlinesLoading]   = useState(false);
    const [showDeadlineModal,  setShowDeadlineModal]  = useState(false);
    const [editDeadline,       setEditDeadline]       = useState<MatterDeadline | null>(null);
    const [deadlineForm,       setDeadlineForm]       = useState({ ...BLANK_DEADLINE });
    const [deadlineSaving,     setDeadlineSaving]     = useState(false);
    const [deadlineErr,        setDeadlineErr]        = useState("");
    // Expenses — Task #143
    const EXPENSE_CATEGORIES_UI = ["Court Fees", "Filing", "Travel", "Printing", "Misc"];
    const BLANK_EXPENSE = { description: "", amount_pkr: "", expense_date: new Date().toISOString().slice(0, 10), category: "Misc", billable: true, receipt_ref: "" };
    const [matterExpenses,    setMatterExpenses]    = useState<MatterExpense[]>([]);
    const [expensesLoading,   setExpensesLoading]   = useState(false);
    const [showExpenseModal,  setShowExpenseModal]  = useState(false);
    const [editExpense,       setEditExpense]       = useState<MatterExpense | null>(null);
    const [expenseForm,       setExpenseForm]       = useState<{ description: string; amount_pkr: string; expense_date: string; category: string; billable: boolean; receipt_ref: string }>({ ...BLANK_EXPENSE });
    const [expenseSaving,     setExpenseSaving]     = useState(false);
    const [expenseErr,        setExpenseErr]        = useState("");
    // Correspondence — Task #144
    const CORR_DIRECTIONS_UI = ["Sent", "Received"];
    const CORR_TYPES_UI = ["Letter", "Email", "Notice", "Legal Notice", "Application", "Other"];
    const BLANK_CORR = { subject: "", corr_date: new Date().toISOString().slice(0, 10), direction: "Sent", corr_type: "Letter", party: "", reference_no: "", notes: "" };
    const [correspondence,    setCorrespondence]    = useState<MatterCorrespondence[]>([]);
    const [corrLoading,       setCorrLoading]       = useState(false);
    const [showCorrModal,     setShowCorrModal]     = useState(false);
    const [editCorr,          setEditCorr]          = useState<MatterCorrespondence | null>(null);
    const [corrForm,          setCorrForm]          = useState({ ...BLANK_CORR });
    const [corrSaving,        setCorrSaving]        = useState(false);
    const [corrErr,           setCorrErr]           = useState("");
    // Relief — Task #145
    const RELIEF_TYPES_UI    = ["Bail", "Stay Order", "Injunction", "Ad-interim Relief", "Anticipatory Bail", "Other"];
    const RELIEF_STATUSES_UI = ["Pending", "Granted", "Rejected", "Recalled", "Expired", "Withdrawn"];
    const BLANK_RELIEF = { application_date: new Date().toISOString().slice(0, 10), relief_type: "Bail", court: "", judge: "", status: "Pending", conditions: "", surety_amount_pkr: "", surety_name: "", notes: "" };
    const [matterRelief,      setMatterRelief]      = useState<MatterRelief[]>([]);
    const [reliefLoading,     setReliefLoading]     = useState(false);
    const [showReliefModal,   setShowReliefModal]   = useState(false);
    const [editRelief,        setEditRelief]        = useState<MatterRelief | null>(null);
    const [reliefForm,        setReliefForm]        = useState<{ application_date: string; relief_type: string; court: string; judge: string; status: string; conditions: string; surety_amount_pkr: string; surety_name: string; notes: string }>({ ...BLANK_RELIEF });
    const [reliefSaving,      setReliefSaving]      = useState(false);
    const [reliefErr,         setReliefErr]         = useState("");
    // Outcome — Task #146
    const OUTCOME_TYPES_UI = ["Pending", "Decree", "Acquittal", "Conviction", "Compromise", "Dismissed", "Withdrawn", "Settlement", "Other"];
    const BLANK_OUTCOME = { outcome_type: "Pending", disposal_date: "", court: "", judge: "", decree_amount_pkr: "", appeal_filed: false, appeal_deadline: "", notes: "" };
    const [matterOutcome,     setMatterOutcome]     = useState<MatterOutcome | null>(null);
    const [outcomeLoading,    setOutcomeLoading]    = useState(false);
    const [outcomeForm,       setOutcomeForm]       = useState<{ outcome_type: string; disposal_date: string; court: string; judge: string; decree_amount_pkr: string; appeal_filed: boolean; appeal_deadline: string; notes: string }>({ ...BLANK_OUTCOME });
    const [outcomeSaving,     setOutcomeSaving]     = useState(false);
    const [outcomeErr,        setOutcomeErr]        = useState("");
    const [outcomeSaved,      setOutcomeSaved]      = useState(false);
    // Charges — Task #147
    const PLEA_OPTIONS_UI = ["No Plea", "Not Guilty", "Guilty", "Absconder"];
    const BLANK_CHARGE = { section_no: "", description: "", plea: "No Plea", charge_framed: false, charge_framed_date: "", court: "", notes: "" };
    const [matterCharges,     setMatterCharges]     = useState<MatterCharge[]>([]);
    const [chargesLoading,    setChargesLoading]    = useState(false);
    const [showChargeModal,   setShowChargeModal]   = useState(false);
    const [editCharge,        setEditCharge]        = useState<MatterCharge | null>(null);
    const [chargeForm,        setChargeForm]        = useState<{ section_no: string; description: string; plea: string; charge_framed: boolean; charge_framed_date: string; court: string; notes: string }>({ ...BLANK_CHARGE });
    const [chargeSaving,      setChargeSaving]      = useState(false);
    const [chargeErr,         setChargeErr]         = useState("");
    // Court Fees — Task #152
    const COURT_FEE_TYPES_UI = ["Ad Valorem", "Fixed"];
    const BLANK_CF = { claim_amount_pkr: 0, fee_type: "Ad Valorem", calculated_fee: 0, actual_paid: 0, payment_date: "", challan_no: "", court: "", notes: "" };
    const [courtFeeList,     setCourtFeeList]     = useState<CourtFeePayment[]>([]);
    const [courtFeeLoading,  setCourtFeeLoading]  = useState(false);
    const [showCFModal,      setShowCFModal]      = useState(false);
    const [editCF,           setEditCF]           = useState<CourtFeePayment | null>(null);
    const [cfForm,           setCfForm]           = useState<{ claim_amount_pkr: number; fee_type: string; calculated_fee: number; actual_paid: number; payment_date: string; challan_no: string; court: string; notes: string }>({ ...BLANK_CF });
    const [cfSaving,         setCfSaving]         = useState(false);
    const [cfErr,            setCfErr]            = useState("");
    const [cfCalcPreview,    setCfCalcPreview]    = useState<number | null>(null);

    // ── LHC Case Status — Task #159 ──────────────────────────────────────────
    const [lhcChecking, setLhcChecking] = useState(false);
    const [lhcResult,   setLhcResult]   = useState<{ status: string; message?: string; raw_text?: string } | null>(null);

    const checkLhcStatus = async () => {
        if (!detail?.case_number) return;
        setLhcChecking(true); setLhcResult(null);
        try {
            const res = await fetch(`/lhc/case-status?case_no=${encodeURIComponent(detail.case_number)}`, { headers: authHeaders() });
            const d = await res.json();
            setLhcResult(d);
        } catch { setLhcResult({ status: "error", message: "Network error" }); }
        setLhcChecking(false);
    };

    // ── Cheques — Task #155 ──────────────────────────────────────────────────
    const BLANK_CHQ = { cheque_no: "", bank_name: "", account_title: "", amount_pkr: 0, cheque_date: "", cheque_type: "Post-Dated", status: "Held", received_date: "", presented_date: "", notes: "" };
    const [chequeList,    setChequeList]    = useState<MatterCheque[]>([]);
    const [chequeLoading, setChequeLoading] = useState(false);
    const [showCHQModal,  setShowCHQModal]  = useState(false);
    const [editCHQ,       setEditCHQ]       = useState<MatterCheque | null>(null);
    const [chqForm,       setChqForm]       = useState<typeof BLANK_CHQ>({ ...BLANK_CHQ });
    const [chqSaving,     setChqSaving]     = useState(false);
    const [chqErr,        setChqErr]        = useState("");

    // ── Bail Bonds — Task #167 ────────────────────────────────────────────────
    const BLANK_BOND = { accused_name: "", bail_type: "Pre-Arrest", bail_amount_pkr: 0, surety_name: "", surety_cnic: "", surety_address: "", surety_property: "", property_value: 0, court: "", judge: "", granted_date: "", expiry_date: "", status: "Active", bail_order_ref: "", notes: "" };
    const [bailBondList,    setBailBondList]    = useState<BailBond[]>([]);
    const [bailBondLoading, setBailBondLoading] = useState(false);
    const [showBondModal,   setShowBondModal]   = useState(false);
    const [editBond,        setEditBond]        = useState<BailBond | null>(null);
    const [bondForm,        setBondForm]        = useState<typeof BLANK_BOND>({ ...BLANK_BOND });
    const [bondSaving,      setBondSaving]      = useState(false);
    const [bondErr,         setBondErr]         = useState("");

    // ── Court Transfers — Task #170 ───────────────────────────────────────────
    const BLANK_TRANSFER = { transfer_date: "", from_court: "", to_court: "", from_judge: "", to_judge: "", reason: "", order_ref: "", notes: "" };
    const [transferList,    setTransferList]    = useState<CourtTransfer[]>([]);
    const [transferLoading, setTransferLoading] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [editTransfer,    setEditTransfer]    = useState<CourtTransfer | null>(null);
    const [transferForm,    setTransferForm]    = useState<typeof BLANK_TRANSFER>({ ...BLANK_TRANSFER });
    const [transferSaving,  setTransferSaving]  = useState(false);
    const [transferErr,     setTransferErr]     = useState("");

    // ── Associate Fees — Task #153 ────────────────────────────────────────────
    const BLANK_AF = { advocate_name: "", bar_no: "", appearance_date: "", amount_pkr: 0, paid: 0, payment_date: "", notes: "" };
    const [assocFeeList,    setAssocFeeList]    = useState<AssociateFee[]>([]);
    const [assocFeeLoading, setAssocFeeLoading] = useState(false);
    const [showAFModal,     setShowAFModal]     = useState(false);
    const [editAF,          setEditAF]          = useState<AssociateFee | null>(null);
    const [afForm,          setAfForm]          = useState<typeof BLANK_AF>({ ...BLANK_AF });
    const [afSaving,        setAfSaving]        = useState(false);
    const [afErr,           setAfErr]           = useState("");
    // Challan — Task #149
    const CHALLAN_TYPES_UI   = ["Complete", "Incomplete", "Supplementary"];
    const CHALLAN_STATUSES_UI = ["Pending", "Submitted", "Returned", "Accepted"];
    const BLANK_CHALLAN = { challan_date: "", challan_type: "Complete", submitted_in_time: true, witnesses_count: 0, challan_court: "", status: "Pending", notes: "" };
    const [matterChallanList, setMatterChallanList] = useState<MatterChallan[]>([]);
    const [challanLoading,    setChallanLoading]    = useState(false);
    const [showChallanModal,  setShowChallanModal]  = useState(false);
    const [editChallan,       setEditChallan]       = useState<MatterChallan | null>(null);
    const [challanForm,       setChallanForm]       = useState<{ challan_date: string; challan_type: string; submitted_in_time: boolean; witnesses_count: number; challan_court: string; status: string; notes: string }>({ ...BLANK_CHALLAN });
    const [challanSaving,     setChallanSaving]     = useState(false);
    const [challanErr,        setChallanErr]        = useState("");
    // FIR — Task #148
    const BLANK_FIR = { fir_number: "", police_station: "", district: "", io_name: "", complainant: "", arrest_date: "", sections_at_fir: "", sections_after_challan: "", fir_date: "", notes: "" };
    const [matterFirList,   setMatterFirList]   = useState<MatterFir[]>([]);
    const [firLoading,      setFirLoading]      = useState(false);
    const [showFirModal,    setShowFirModal]    = useState(false);
    const [editFir,         setEditFir]         = useState<MatterFir | null>(null);
    const [firForm,         setFirForm]         = useState<typeof BLANK_FIR>({ ...BLANK_FIR });
    const [firSaving,       setFirSaving]       = useState(false);
    const [firErr,          setFirErr]          = useState("");
    // FIR OCR scan (beta) — Task: extract-fir
    const [firScanning,     setFirScanning]     = useState(false);
    const [firScanErr,      setFirScanErr]      = useState("");
    const [firScanRawText,  setFirScanRawText]  = useState("");
    // Limitation alerts — Task #132
    const [limAlerts, setLimAlerts] = useState<{ matter_id: string; title: string; limitation_date: string; limitation_type: string; days_remaining: number; client_name: string }[]>([]);
    const [causeListAlerts, setCauseListAlerts] = useState<{ matter_id: string; matter_title: string; case_number: string | null; item_no: string | null; court_name: string | null }[]>([]);

    const allCourts = [...DEFAULT_COURTS, ...customCourts.map(c => c.name)];

    const loadAll = () => {
        Promise.all([
            fetch("/matters",                    { headers: authHeaders() }).then(r => r.json()),
            fetch("/clients",                    { headers: authHeaders() }).then(r => r.json()),
            fetch("/matter-teams",               { headers: authHeaders() }).then(r => r.json()),
            fetch("/courts",                     { headers: authHeaders() }).then(r => r.json()),
            fetch("/matters/limitation-alerts",  { headers: authHeaders() }).then(r => r.json()).catch(() => ({ alerts: [] })),
            fetch("/cause-list/today-matches",   { headers: authHeaders() }).then(r => r.json()).catch(() => ({ matches: [] })),
        ]).then(([md, cd, td, co, la, cl]) => {
            setMatters(md.matters ?? []);
            setClients(cd.clients ?? []);
            setMatterTeams(td.teams ?? []);
            setCustomCourts(co.custom ?? []);
            setLimAlerts(la.alerts ?? []);
            setCauseListAlerts(cl.matches ?? []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { loadAll(); }, []);

    const loadOrders = (matterId: string) => {
        setOrdersLoading(true);
        fetch(`/matters/${matterId}/orders`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setOrders(d.orders ?? []); setOrdersLoading(false); })
            .catch(() => setOrdersLoading(false));
    };

    // Re-pull orders once queued offline writes have synced, so optimistic
    // "⏳ Saved offline" cards get replaced by the real server records.
    useEffect(() => {
        const onFlushed = () => { if (detail) loadOrders(detail.matter_id); };
        window.addEventListener("pe-offline-flushed", onFlushed);
        return () => window.removeEventListener("pe-offline-flushed", onFlushed);
    }, [detail]);

    const openOrderModal = (order?: CourtOrder) => {
        const today = new Date().toISOString().slice(0, 10);
        if (order) {
            setEditOrder(order);
            setOrderForm({ hearing_date: order.hearing_date, court_name: order.court_name ?? "", order_brief: order.order_brief, next_date: order.next_date ?? "", outcome: order.outcome, notify_client: true });
        } else {
            setEditOrder(null);
            setOrderForm({ hearing_date: today, court_name: detail?.court_name ?? "", order_brief: "", next_date: "", outcome: "Adjourned", notify_client: true });
        }
        setOrderErr(""); setVoiceErr(""); setVoiceResult(null); setShowOrderModal(true);
    };

    const startVoiceRecording = async () => {
        setVoiceErr(""); setVoiceResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            voiceChunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
                setVoiceProcessing(true);
                try {
                    const fd = new FormData();
                    fd.append("audio", blob, "hearing_note.webm");
                    const r = await fetch("/voice/log-outcome", { method: "POST", headers: authHeaders(), body: fd });
                    const d = await r.json();
                    if (!r.ok) setVoiceErr(d.error ?? "Could not process the recording.");
                    else setVoiceResult(d);
                } catch { setVoiceErr("Network error while processing the recording."); }
                finally { setVoiceProcessing(false); }
            };
            recorder.start();
            voiceRecorderRef.current = recorder;
            setVoiceRecording(true);
        } catch {
            setVoiceErr("Could not access the microphone — check browser permissions.");
        }
    };

    const stopVoiceRecording = () => {
        voiceRecorderRef.current?.stop();
        setVoiceRecording(false);
    };

    const applyVoiceResult = () => {
        if (!voiceResult) return;
        setOrderForm(f => ({
            ...f,
            order_brief: voiceResult.order_brief || f.order_brief,
            outcome:     voiceResult.outcome ?? f.outcome,
            next_date:   voiceResult.next_date ?? f.next_date,
        }));
        setVoiceResult(null);
    };

    const saveOrder = async () => {
        if (!orderForm.hearing_date || !orderForm.order_brief.trim()) {
            setOrderErr("Hearing date and order summary are required."); return;
        }
        if (!detail) return;
        setOrderSaving(true); setOrderErr("");
        const body = {
            hearing_date: orderForm.hearing_date,
            court_name:   orderForm.court_name.trim() || undefined,
            order_brief:  orderForm.order_brief.trim(),
            next_date:    orderForm.next_date || undefined,
            outcome:      orderForm.outcome,
            notify_client: orderForm.notify_client,
        };
        const url = editOrder
            ? `/matters/${detail.matter_id}/orders/${editOrder.order_id}`
            : `/matters/${detail.matter_id}/orders`;
        const method: "POST" | "PATCH" = editOrder ? "PATCH" : "POST";
        if (!navigator.onLine) {
            // Don't even attempt the request — go straight to the offline queue.
            await queueWrite(url, method, body, "Court Order", detail.title);
            setOrders(prev => [{ order_id: `offline-${Date.now()}`, matter_id: detail.matter_id, ...body, court_name: body.court_name ?? null, next_date: body.next_date ?? null, created_at: new Date().toISOString(), _offline: true } as CourtOrder, ...prev]);
            setShowOrderModal(false); setOrderSaving(false);
            return;
        }
        try {
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setOrderErr(d.error ?? "Save failed."); }
            else { setShowOrderModal(false); loadOrders(detail.matter_id); }
        } catch {
            // fetch() threw — treat as a network drop mid-request, queue it rather than losing the entry
            await queueWrite(url, method, body, "Court Order", detail.title);
            setOrders(prev => [{ order_id: `offline-${Date.now()}`, matter_id: detail.matter_id, ...body, court_name: body.court_name ?? null, next_date: body.next_date ?? null, created_at: new Date().toISOString(), _offline: true } as CourtOrder, ...prev]);
            setShowOrderModal(false);
        }
        finally { setOrderSaving(false); }
    };

    const deleteOrder = async (order: CourtOrder) => {
        if (!detail || !confirm("Delete this court order entry?")) return;
        await fetch(`/matters/${detail.matter_id}/orders/${order.order_id}`, { method: "DELETE", headers: authHeaders() });
        loadOrders(detail.matter_id);
    };

    const loadAdverseParties = (matterId: string) => {
        fetch(`/matters/${matterId}/adverse-parties`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setAdverseParties(d.parties ?? []))
            .catch(() => {});
    };

    const openPartyModal = (party?: AdverseParty) => {
        if (party) {
            setEditParty(party);
            setPartyForm({ party_name: party.party_name, party_type: party.party_type, counsel_name: party.counsel_name ?? "", counsel_phone: party.counsel_phone ?? "", counsel_firm: party.counsel_firm ?? "", notes: party.notes ?? "" });
        } else {
            setEditParty(null);
            setPartyForm({ ...BLANK_PARTY });
        }
        setPartyErr(""); setShowPartyModal(true);
    };

    const saveParty = async () => {
        if (!partyForm.party_name.trim()) { setPartyErr("Party name is required."); return; }
        if (!detail) return;
        setPartySaving(true); setPartyErr("");
        const body = {
            party_name:   partyForm.party_name.trim(),
            party_type:   partyForm.party_type,
            counsel_name:  partyForm.counsel_name.trim() || undefined,
            counsel_phone: partyForm.counsel_phone.trim() || undefined,
            counsel_firm:  partyForm.counsel_firm.trim() || undefined,
            notes:         partyForm.notes.trim() || undefined,
        };
        try {
            const url = editParty
                ? `/matters/${detail.matter_id}/adverse-parties/${editParty.party_id}`
                : `/matters/${detail.matter_id}/adverse-parties`;
            const method = editParty ? "PATCH" : "POST";
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setPartyErr(d.error ?? "Save failed."); }
            else { setShowPartyModal(false); loadAdverseParties(detail.matter_id); }
        } catch { setPartyErr("Network error."); }
        finally { setPartySaving(false); }
    };

    const deleteParty = async (party: AdverseParty) => {
        if (!detail || !confirm(`Remove "${party.party_name}" from this matter?`)) return;
        await fetch(`/matters/${detail.matter_id}/adverse-parties/${party.party_id}`, { method: "DELETE", headers: authHeaders() });
        loadAdverseParties(detail.matter_id);
    };

    // ── Time Tracking helpers ──
    const loadTimeEntries = (matterId: string) => {
        setTimeLoading(true);
        fetch(`/matters/${matterId}/time-entries`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setTimeEntries(d.entries ?? []); setTimeLoading(false); })
            .catch(() => setTimeLoading(false));
    };

    // Matter Notes — Task #138
    const loadNotes = (matterId: string) => {
        setNotesLoading(true);
        fetch(`/matters/${matterId}/notes`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setMatterNotes(d.notes ?? []); setNotesLoading(false); })
            .catch(() => setNotesLoading(false));
    };

    const openNoteModal = (note?: typeof matterNotes[0]) => {
        if (note) {
            setEditNote(note);
            setNoteForm({ note_type: note.note_type, note_text: note.note_text, note_date: note.note_date });
        } else {
            setEditNote(null);
            setNoteForm({ ...BLANK_NOTE_FORM });
        }
        setNoteErr("");
        setShowNoteModal(true);
    };

    const saveNote = () => {
        if (!detail) return;
        if (!noteForm.note_text.trim()) { setNoteErr("Note text is required."); return; }
        setNoteSaving(true);
        const url    = editNote ? `/matters/${detail.matter_id}/notes/${editNote.note_id}` : `/matters/${detail.matter_id}/notes`;
        const method = editNote ? "PATCH" : "POST";
        fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(noteForm) })
            .then(r => r.json())
            .then(() => { setShowNoteModal(false); loadNotes(detail.matter_id); })
            .catch(() => setNoteErr("Save failed."))
            .finally(() => setNoteSaving(false));
    };

    const deleteNoteUI = (noteId: string) => {
        if (!detail || !confirm("Delete this note?")) return;
        fetch(`/matters/${detail.matter_id}/notes/${noteId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadNotes(detail.matter_id));
    };

    // Document Requests — Task #140
    const loadDocRequests = (matterId: string) => {
        setDocReqLoading(true);
        fetch(`/matters/${matterId}/doc-requests`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setDocRequests(d.requests ?? []); setDocReqLoading(false); })
            .catch(() => setDocReqLoading(false));
    };

    const openDocReqModal = (req?: DocRequest) => {
        if (req) {
            setEditDocReq(req);
            setDocReqForm({
                doc_name:       req.doc_name,
                requested_date: req.requested_date,
                due_date:       req.due_date ?? "",
                notes:          req.notes ?? "",
                status:         req.status,
                received_date:  req.received_date ?? "",
            });
        } else {
            setEditDocReq(null);
            setDocReqForm({ ...BLANK_DOC_REQ });
        }
        setDocReqErr("");
        setShowDocReqModal(true);
    };

    const saveDocReq = () => {
        if (!detail) return;
        if (!docReqForm.doc_name.trim()) { setDocReqErr("Document name is required."); return; }
        setDocReqSaving(true);
        const url    = editDocReq ? `/matters/${detail.matter_id}/doc-requests/${editDocReq.request_id}` : `/matters/${detail.matter_id}/doc-requests`;
        const method = editDocReq ? "PATCH" : "POST";
        const body   = { ...docReqForm, due_date: docReqForm.due_date || null, received_date: docReqForm.received_date || null, notes: docReqForm.notes || null };
        fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) })
            .then(r => r.json())
            .then(() => { setShowDocReqModal(false); loadDocRequests(detail.matter_id); })
            .catch(() => setDocReqErr("Save failed."))
            .finally(() => setDocReqSaving(false));
    };

    const deleteDocReqUI = (reqId: string) => {
        if (!detail || !confirm("Delete this request?")) return;
        fetch(`/matters/${detail.matter_id}/doc-requests/${reqId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadDocRequests(detail.matter_id));
    };

    const markDocReqReceived = (req: DocRequest) => {
        if (!detail) return;
        const today = new Date().toISOString().slice(0, 10);
        fetch(`/matters/${detail.matter_id}/doc-requests/${req.request_id}`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Received", received_date: today }),
        }).then(() => loadDocRequests(detail.matter_id));
    };

    // Witnesses — Task #141
    const loadWitnesses = (matterId: string) => {
        setWitnessLoading(true);
        fetch(`/matters/${matterId}/witnesses`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setWitnesses(d.witnesses ?? []); setWitnessLoading(false); })
            .catch(() => setWitnessLoading(false));
    };

    const openWitnessModal = (w?: Witness) => {
        if (w) {
            setEditWitness(w);
            setWitnessForm({
                witness_name:    w.witness_name,
                witness_type:    w.witness_type,
                contact_number:  w.contact_number ?? "",
                address:         w.address ?? "",
                statement_status: w.statement_status,
                notes:           w.notes ?? "",
            });
        } else {
            setEditWitness(null);
            setWitnessForm({ ...BLANK_WITNESS });
        }
        setWitnessErr("");
        setShowWitnessModal(true);
    };

    const saveWitness = () => {
        if (!detail) return;
        if (!witnessForm.witness_name.trim()) { setWitnessErr("Witness name is required."); return; }
        setWitnessSaving(true);
        const url    = editWitness ? `/matters/${detail.matter_id}/witnesses/${editWitness.witness_id}` : `/matters/${detail.matter_id}/witnesses`;
        const method = editWitness ? "PATCH" : "POST";
        const body   = { ...witnessForm, contact_number: witnessForm.contact_number || null, address: witnessForm.address || null, notes: witnessForm.notes || null };
        fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) })
            .then(r => r.json())
            .then(() => { setShowWitnessModal(false); loadWitnesses(detail.matter_id); })
            .catch(() => setWitnessErr("Save failed."))
            .finally(() => setWitnessSaving(false));
    };

    const deleteWitnessUI = (witnessId: string) => {
        if (!detail || !confirm("Delete this witness?")) return;
        fetch(`/matters/${detail.matter_id}/witnesses/${witnessId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadWitnesses(detail.matter_id));
    };

    // ── Deadlines (Task #142) ──────────────────────────────────────────────
    const loadDeadlines = (matterId: string) => {
        setDeadlinesLoading(true);
        fetch(`/matters/${matterId}/deadlines`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setMatterDeadlines(d.deadlines ?? []); })
            .finally(() => setDeadlinesLoading(false));
    };

    const openDeadlineModal = (dl?: MatterDeadline) => {
        if (dl) {
            setEditDeadline(dl);
            setDeadlineForm({ title: dl.title, due_date: dl.due_date, priority: dl.priority, notes: dl.notes ?? "" });
        } else {
            setEditDeadline(null);
            setDeadlineForm({ ...BLANK_DEADLINE });
        }
        setDeadlineErr(""); setShowDeadlineModal(true);
    };

    const saveDeadline = async () => {
        if (!detail) return;
        if (!deadlineForm.title.trim()) { setDeadlineErr("Title is required."); return; }
        if (!deadlineForm.due_date) { setDeadlineErr("Due date is required."); return; }
        setDeadlineSaving(true); setDeadlineErr("");
        const url = editDeadline
            ? `/matters/${detail.matter_id}/deadlines/${editDeadline.deadline_id}`
            : `/matters/${detail.matter_id}/deadlines`;
        const method = editDeadline ? "PATCH" : "POST";
        try {
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(deadlineForm) });
            if (!r.ok) { const e = await r.json(); setDeadlineErr(e.error ?? "Save failed."); return; }
            setShowDeadlineModal(false);
            loadDeadlines(detail.matter_id);
        } catch { setDeadlineErr("Network error."); }
        finally { setDeadlineSaving(false); }
    };

    const deleteDeadlineUI = (deadlineId: string) => {
        if (!detail || !confirm("Delete this deadline?")) return;
        fetch(`/matters/${detail.matter_id}/deadlines/${deadlineId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadDeadlines(detail.matter_id));
    };

    const toggleDeadlineComplete = (dl: MatterDeadline) => {
        if (!detail) return;
        const completed = dl.completed === 1 ? 0 : 1;
        fetch(`/matters/${detail.matter_id}/deadlines/${dl.deadline_id}`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ completed }),
        }).then(() => loadDeadlines(detail.matter_id));
    };

    // ── Expenses (Task #143) ───────────────────────────────────────────────────
    const loadExpenses = (matterId: string) => {
        setExpensesLoading(true);
        fetch(`/matters/${matterId}/expenses`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setMatterExpenses(d.expenses ?? []))
            .finally(() => setExpensesLoading(false));
    };

    const openExpenseModal = (exp?: MatterExpense) => {
        if (exp) {
            setEditExpense(exp);
            setExpenseForm({
                description: exp.description,
                amount_pkr: String(exp.amount_pkr),
                expense_date: exp.expense_date,
                category: exp.category,
                billable: exp.billable === 1,
                receipt_ref: exp.receipt_ref ?? "",
            });
        } else {
            setEditExpense(null);
            setExpenseForm({ ...BLANK_EXPENSE });
        }
        setExpenseErr(""); setShowExpenseModal(true);
    };

    const saveExpense = async () => {
        if (!detail) return;
        if (!expenseForm.description.trim()) { setExpenseErr("Description is required."); return; }
        const amt = parseFloat(expenseForm.amount_pkr);
        if (isNaN(amt) || amt < 0) { setExpenseErr("Enter a valid amount."); return; }
        if (!expenseForm.expense_date) { setExpenseErr("Date is required."); return; }
        setExpenseSaving(true); setExpenseErr("");
        const url = editExpense
            ? `/matters/${detail.matter_id}/expenses/${editExpense.expense_id}`
            : `/matters/${detail.matter_id}/expenses`;
        const method = editExpense ? "PATCH" : "POST";
        const body = { ...expenseForm, amount_pkr: amt, billable: expenseForm.billable ? 1 : 0 };
        try {
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const e = await r.json(); setExpenseErr(e.error ?? "Save failed."); return; }
            setShowExpenseModal(false);
            loadExpenses(detail.matter_id);
        } catch { setExpenseErr("Network error."); }
        finally { setExpenseSaving(false); }
    };

    const deleteExpenseUI = (expenseId: string) => {
        if (!detail || !confirm("Delete this expense?")) return;
        fetch(`/matters/${detail.matter_id}/expenses/${expenseId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadExpenses(detail.matter_id));
    };

    // ── Correspondence (Task #144) ────────────────────────────────────────────
    const loadCorrespondence = (matterId: string) => {
        setCorrLoading(true);
        fetch(`/matters/${matterId}/correspondence`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setCorrespondence(d.correspondence ?? []))
            .finally(() => setCorrLoading(false));
    };

    const openCorrModal = (item?: MatterCorrespondence) => {
        if (item) {
            setEditCorr(item);
            setCorrForm({
                subject: item.subject,
                corr_date: item.corr_date,
                direction: item.direction,
                corr_type: item.corr_type,
                party: item.party ?? "",
                reference_no: item.reference_no ?? "",
                notes: item.notes ?? "",
            });
        } else {
            setEditCorr(null);
            setCorrForm({ ...BLANK_CORR });
        }
        setCorrErr(""); setShowCorrModal(true);
    };

    const saveCorr = async () => {
        if (!detail) return;
        if (!corrForm.subject.trim()) { setCorrErr("Subject is required."); return; }
        if (!corrForm.corr_date) { setCorrErr("Date is required."); return; }
        setCorrSaving(true); setCorrErr("");
        const url = editCorr
            ? `/matters/${detail.matter_id}/correspondence/${editCorr.corr_id}`
            : `/matters/${detail.matter_id}/correspondence`;
        const method = editCorr ? "PATCH" : "POST";
        const body = { ...corrForm, party: corrForm.party || null, reference_no: corrForm.reference_no || null, notes: corrForm.notes || null };
        try {
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const e = await r.json(); setCorrErr(e.error ?? "Save failed."); return; }
            setShowCorrModal(false);
            loadCorrespondence(detail.matter_id);
        } catch { setCorrErr("Network error."); }
        finally { setCorrSaving(false); }
    };

    const deleteCorrUI = (corrId: string) => {
        if (!detail || !confirm("Delete this correspondence record?")) return;
        fetch(`/matters/${detail.matter_id}/correspondence/${corrId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadCorrespondence(detail.matter_id));
    };

    // ── Bail & Interim Relief (Task #145) ────────────────────────────────────
    const loadRelief = (matterId: string) => {
        setReliefLoading(true);
        fetch(`/matters/${matterId}/relief`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setMatterRelief(d.relief ?? []))
            .finally(() => setReliefLoading(false));
    };

    const openReliefModal = (item?: MatterRelief) => {
        if (item) {
            setEditRelief(item);
            setReliefForm({
                application_date: item.application_date,
                relief_type: item.relief_type,
                court: item.court ?? "",
                judge: item.judge ?? "",
                status: item.status,
                conditions: item.conditions ?? "",
                surety_amount_pkr: item.surety_amount_pkr !== null ? String(item.surety_amount_pkr) : "",
                surety_name: item.surety_name ?? "",
                notes: item.notes ?? "",
            });
        } else {
            setEditRelief(null);
            setReliefForm({ ...BLANK_RELIEF });
        }
        setReliefErr(""); setShowReliefModal(true);
    };

    const saveRelief = async () => {
        if (!detail) return;
        if (!reliefForm.application_date) { setReliefErr("Application date is required."); return; }
        setReliefSaving(true); setReliefErr("");
        const url = editRelief
            ? `/matters/${detail.matter_id}/relief/${editRelief.relief_id}`
            : `/matters/${detail.matter_id}/relief`;
        const method = editRelief ? "PATCH" : "POST";
        const suretyAmt = reliefForm.surety_amount_pkr ? parseFloat(reliefForm.surety_amount_pkr) : null;
        const body = {
            ...reliefForm,
            court: reliefForm.court || null,
            judge: reliefForm.judge || null,
            conditions: reliefForm.conditions || null,
            surety_amount_pkr: suretyAmt,
            surety_name: reliefForm.surety_name || null,
            notes: reliefForm.notes || null,
        };
        try {
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const e = await r.json(); setReliefErr(e.error ?? "Save failed."); return; }
            setShowReliefModal(false);
            loadRelief(detail.matter_id);
        } catch { setReliefErr("Network error."); }
        finally { setReliefSaving(false); }
    };

    const deleteReliefUI = (reliefId: string) => {
        if (!detail || !confirm("Delete this relief record?")) return;
        fetch(`/matters/${detail.matter_id}/relief/${reliefId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadRelief(detail.matter_id));
    };

    // ── Outcome (Task #146) ───────────────────────────────────────────────────
    const loadOutcome = (matterId: string) => {
        setOutcomeLoading(true);
        fetch(`/matters/${matterId}/outcome`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                const o: MatterOutcome | null = d.outcome && d.outcome.outcome_id ? d.outcome : null;
                setMatterOutcome(o);
                setOutcomeForm({
                    outcome_type: o?.outcome_type ?? "Pending",
                    disposal_date: o?.disposal_date ?? "",
                    court: o?.court ?? "",
                    judge: o?.judge ?? "",
                    decree_amount_pkr: o?.decree_amount_pkr !== null && o?.decree_amount_pkr !== undefined ? String(o.decree_amount_pkr) : "",
                    appeal_filed: o?.appeal_filed === 1,
                    appeal_deadline: o?.appeal_deadline ?? "",
                    notes: o?.notes ?? "",
                });
            })
            .finally(() => setOutcomeLoading(false));
    };

    const saveOutcome = async () => {
        if (!detail) return;
        setOutcomeSaving(true); setOutcomeErr(""); setOutcomeSaved(false);
        const body = {
            ...outcomeForm,
            decree_amount_pkr: outcomeForm.decree_amount_pkr ? parseFloat(outcomeForm.decree_amount_pkr) : null,
            appeal_filed: outcomeForm.appeal_filed ? 1 : 0,
        };
        try {
            const r = await fetch(`/matters/${detail.matter_id}/outcome`, {
                method: "PUT",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!r.ok) { const e = await r.json(); setOutcomeErr(e.error ?? "Save failed."); return; }
            const saved = await r.json();
            setMatterOutcome(saved);
            setOutcomeSaved(true);
            setTimeout(() => setOutcomeSaved(false), 2500);
        } catch { setOutcomeErr("Network error."); }
        finally { setOutcomeSaving(false); }
    };

    // ── Charges (Task #147) ───────────────────────────────────────────────────
    const loadCharges = (matterId: string) => {
        setChargesLoading(true);
        fetch(`/matters/${matterId}/charges`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setMatterCharges(d.charges ?? []))
            .finally(() => setChargesLoading(false));
    };

    const openChargeModal = (ch?: MatterCharge) => {
        if (ch) {
            setEditCharge(ch);
            setChargeForm({
                section_no: ch.section_no,
                description: ch.description ?? "",
                plea: ch.plea,
                charge_framed: ch.charge_framed === 1,
                charge_framed_date: ch.charge_framed_date ?? "",
                court: ch.court ?? "",
                notes: ch.notes ?? "",
            });
        } else {
            setEditCharge(null);
            setChargeForm({ ...BLANK_CHARGE });
        }
        setChargeErr(""); setShowChargeModal(true);
    };

    const saveCharge = async () => {
        if (!detail) return;
        if (!chargeForm.section_no.trim()) { setChargeErr("Section number is required."); return; }
        setChargeSaving(true); setChargeErr("");
        const url = editCharge
            ? `/matters/${detail.matter_id}/charges/${editCharge.charge_id}`
            : `/matters/${detail.matter_id}/charges`;
        const method = editCharge ? "PATCH" : "POST";
        const body = {
            ...chargeForm,
            charge_framed: chargeForm.charge_framed ? 1 : 0,
            charge_framed_date: chargeForm.charge_framed_date || null,
            court: chargeForm.court || null,
            description: chargeForm.description || null,
            notes: chargeForm.notes || null,
        };
        try {
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const e = await r.json(); setChargeErr(e.error ?? "Save failed."); return; }
            setShowChargeModal(false);
            loadCharges(detail.matter_id);
        } catch { setChargeErr("Network error."); }
        finally { setChargeSaving(false); }
    };

    const deleteChargeUI = (chargeId: string) => {
        if (!detail || !confirm("Delete this charge?")) return;
        fetch(`/matters/${detail.matter_id}/charges/${chargeId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadCharges(detail.matter_id));
    };

    // ── FIR functions — Task #148 ──────────────────────────────────────────
    const BLANK_FIR_FN = { fir_number: "", police_station: "", district: "", io_name: "", complainant: "", arrest_date: "", sections_at_fir: "", sections_after_challan: "", fir_date: "", notes: "" };
    const loadFir = (matterId: string) => {
        setFirLoading(true);
        fetch(`/matters/${matterId}/fir`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setMatterFirList(d.fir || []); setFirLoading(false); })
            .catch(() => setFirLoading(false));
    };
    const openFirModal = (f?: MatterFir) => {
        setEditFir(f || null);
        setFirErr("");
        setFirForm(f ? {
            fir_number: f.fir_number, police_station: f.police_station,
            district: f.district || "", io_name: f.io_name || "",
            complainant: f.complainant || "", arrest_date: f.arrest_date || "",
            sections_at_fir: f.sections_at_fir || "",
            sections_after_challan: f.sections_after_challan || "",
            fir_date: f.fir_date || "", notes: f.notes || "",
        } : { ...BLANK_FIR_FN });
        setFirScanErr(""); setFirScanRawText("");
        setShowFirModal(true);
    };
    const scanFirFile = async (file: File) => {
        setFirScanning(true); setFirScanErr(""); setFirScanRawText("");
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch("/documents/extract-fir", { method: "POST", headers: authHeaders(), body: fd });
            const d = await r.json();
            if (!r.ok) { setFirScanErr(d.error ?? "Could not read that document."); return; }
            setFirForm(f => ({
                ...f,
                fir_number:      d.fir_number      || f.fir_number,
                police_station:  d.police_station  || f.police_station,
                district:        d.district        || f.district,
                io_name:         d.io_name         || f.io_name,
                complainant:     d.complainant     || f.complainant,
                arrest_date:     d.arrest_date     || f.arrest_date,
                sections_at_fir: d.sections_at_fir || f.sections_at_fir,
                fir_date:        d.fir_date        || f.fir_date,
                notes: [f.notes, d.accused_name ? `Accused (AI-extracted): ${d.accused_name}` : ""].filter(Boolean).join("\n"),
            }));
            setFirScanRawText(d.raw_text || "");
        } catch { setFirScanErr("Network error while scanning."); }
        finally { setFirScanning(false); }
    };
    const saveFir = async () => {
        if (!detail) return;
        if (!firForm.fir_number.trim()) { setFirErr("FIR number is required"); return; }
        if (!firForm.police_station.trim()) { setFirErr("Police station is required"); return; }
        setFirSaving(true); setFirErr("");
        const url = editFir ? `/matters/${detail.matter_id}/fir/${editFir.fir_id}` : `/matters/${detail.matter_id}/fir`;
        const method = editFir ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(firForm) });
        setFirSaving(false);
        if (res.ok) { setShowFirModal(false); loadFir(detail.matter_id); }
        else { const d = await res.json(); setFirErr(d.error || "Save failed"); }
    };
    const deleteFirUI = (firId: string) => {
        if (!detail || !confirm("Delete this FIR record?")) return;
        fetch(`/matters/${detail.matter_id}/fir/${firId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadFir(detail.matter_id));
    };

    // ── Court Fee functions — Task #152 ────────────────────────────────────
    const BLANK_CF_FN = { claim_amount_pkr: 0, fee_type: "Ad Valorem", calculated_fee: 0, actual_paid: 0, payment_date: "", challan_no: "", court: "", notes: "" };
    const loadCourtFees = (matterId: string) => {
        setCourtFeeLoading(true);
        fetch(`/matters/${matterId}/court-fees`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setCourtFeeList(d.payments || []); setCourtFeeLoading(false); })
            .catch(() => setCourtFeeLoading(false));
    };
    const previewCourtFee = async (claim: number, ftype: string) => {
        if (claim <= 0) { setCfCalcPreview(null); return; }
        const res = await fetch("/court-fees/calculate", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ claim_amount_pkr: claim, fee_type: ftype }) });
        const d = await res.json();
        setCfCalcPreview(d.calculated_fee ?? null);
        setCfForm(f => ({ ...f, calculated_fee: d.calculated_fee ?? f.calculated_fee }));
    };
    const openCFModal = (cf?: CourtFeePayment) => {
        setEditCF(cf || null); setCfErr(""); setCfCalcPreview(null);
        setCfForm(cf ? { claim_amount_pkr: cf.claim_amount_pkr, fee_type: cf.fee_type, calculated_fee: cf.calculated_fee, actual_paid: cf.actual_paid, payment_date: cf.payment_date || "", challan_no: cf.challan_no || "", court: cf.court || "", notes: cf.notes || "" } : { ...BLANK_CF_FN });
        setShowCFModal(true);
    };
    const saveCF = async () => {
        if (!detail) return;
        setCfSaving(true); setCfErr("");
        const url = editCF ? `/matters/${detail.matter_id}/court-fees/${editCF.fee_payment_id}` : `/matters/${detail.matter_id}/court-fees`;
        const method = editCF ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(cfForm) });
        setCfSaving(false);
        if (res.ok) { setShowCFModal(false); loadCourtFees(detail.matter_id); }
        else { const d = await res.json(); setCfErr(d.error || "Save failed"); }
    };
    const deleteCFUI = (fpId: string) => {
        if (!detail || !confirm("Delete this court fee record?")) return;
        fetch(`/matters/${detail.matter_id}/court-fees/${fpId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadCourtFees(detail.matter_id));
    };

    // ── Associate Fee functions — Task #153 ──────────────────────────────────
    const loadAssocFees = (matterId: string) => {
        setAssocFeeLoading(true);
        fetch(`/matters/${matterId}/associate-fees`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setAssocFeeList(d.fees || []); setAssocFeeLoading(false); })
            .catch(() => setAssocFeeLoading(false));
    };
    const openAFModal = (af?: AssociateFee) => {
        setEditAF(af || null);
        setAfForm(af ? { advocate_name: af.advocate_name, bar_no: af.bar_no || "", appearance_date: af.appearance_date || "", amount_pkr: af.amount_pkr, paid: af.paid, payment_date: af.payment_date || "", notes: af.notes || "" } : { ...BLANK_AF });
        setAfErr(""); setShowAFModal(true);
    };
    const saveAssocFee = async () => {
        if (!detail) return;
        if (!afForm.advocate_name.trim()) { setAfErr("Advocate name is required"); return; }
        setAfSaving(true); setAfErr("");
        const url = editAF ? `/matters/${detail.matter_id}/associate-fees/${editAF.assoc_fee_id}` : `/matters/${detail.matter_id}/associate-fees`;
        const method = editAF ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(afForm) });
        setAfSaving(false);
        if (res.ok) { setShowAFModal(false); loadAssocFees(detail.matter_id); }
        else { const e = await res.json(); setAfErr(e.error || "Save failed"); }
    };
    const deleteAssocFeeUI = (afId: string) => {
        if (!detail || !confirm("Delete this associate fee record?")) return;
        fetch(`/matters/${detail.matter_id}/associate-fees/${afId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadAssocFees(detail.matter_id));
    };

    // ── Cheque functions — Task #155 ──────────────────────────────────────────
    const loadCheques = (matterId: string) => {
        setChequeLoading(true);
        fetch(`/matters/${matterId}/cheques`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setChequeList(d.cheques || []); setChequeLoading(false); })
            .catch(() => setChequeLoading(false));
    };
    const openCHQModal = (c?: MatterCheque) => {
        setEditCHQ(c || null);
        setChqForm(c ? { cheque_no: c.cheque_no, bank_name: c.bank_name || "", account_title: c.account_title || "", amount_pkr: c.amount_pkr, cheque_date: c.cheque_date || "", cheque_type: c.cheque_type, status: c.status, received_date: c.received_date || "", presented_date: c.presented_date || "", notes: c.notes || "" } : { ...BLANK_CHQ });
        setChqErr(""); setShowCHQModal(true);
    };
    const saveCHQ = async () => {
        if (!detail) return;
        if (!chqForm.cheque_no.trim()) { setChqErr("Cheque number is required"); return; }
        setChqSaving(true); setChqErr("");
        const url = editCHQ ? `/matters/${detail.matter_id}/cheques/${editCHQ.cheque_id}` : `/matters/${detail.matter_id}/cheques`;
        const method = editCHQ ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(chqForm) });
        setChqSaving(false);
        if (res.ok) { setShowCHQModal(false); loadCheques(detail.matter_id); }
        else { const e = await res.json(); setChqErr(e.error || "Save failed"); }
    };
    const deleteCHQUI = (chequeId: string) => {
        if (!detail || !confirm("Delete this cheque record?")) return;
        fetch(`/matters/${detail.matter_id}/cheques/${chequeId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadCheques(detail.matter_id));
    };

    // ── Bail Bond functions — Task #167 ──────────────────────────────────────
    const loadBailBonds = (matterId: string) => {
        setBailBondLoading(true);
        fetch(`/matters/${matterId}/bail-bonds`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setBailBondList(d.bonds || []); setBailBondLoading(false); })
            .catch(() => setBailBondLoading(false));
    };
    const openBondModal = (b?: BailBond) => {
        setEditBond(b || null);
        setBondForm(b ? { accused_name: b.accused_name, bail_type: b.bail_type, bail_amount_pkr: b.bail_amount_pkr, surety_name: b.surety_name || "", surety_cnic: b.surety_cnic || "", surety_address: b.surety_address || "", surety_property: b.surety_property || "", property_value: b.property_value || 0, court: b.court || "", judge: b.judge || "", granted_date: b.granted_date || "", expiry_date: b.expiry_date || "", status: b.status, bail_order_ref: b.bail_order_ref || "", notes: b.notes || "" } : { ...BLANK_BOND });
        setBondErr(""); setShowBondModal(true);
    };
    const saveBond = async () => {
        if (!detail) return;
        if (!bondForm.accused_name.trim()) { setBondErr("Accused name is required"); return; }
        setBondSaving(true); setBondErr("");
        const url = editBond ? `/matters/${detail.matter_id}/bail-bonds/${editBond.bond_id}` : `/matters/${detail.matter_id}/bail-bonds`;
        const method = editBond ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(bondForm) });
        setBondSaving(false);
        if (res.ok) { setShowBondModal(false); loadBailBonds(detail.matter_id); }
        else { const e = await res.json(); setBondErr(e.error || "Save failed"); }
    };
    const deleteBondUI = (bondId: string) => {
        if (!detail || !confirm("Delete this bail bond record?")) return;
        fetch(`/matters/${detail.matter_id}/bail-bonds/${bondId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadBailBonds(detail.matter_id));
    };

    // ── Court Transfer functions — Task #170 ─────────────────────────────────
    const loadTransfers = (matterId: string) => {
        setTransferLoading(true);
        fetch(`/matters/${matterId}/transfers`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setTransferList(d.transfers || []); setTransferLoading(false); })
            .catch(() => setTransferLoading(false));
    };
    const openTransferModal = (t?: CourtTransfer) => {
        setEditTransfer(t || null);
        setTransferForm(t ? { transfer_date: t.transfer_date || "", from_court: t.from_court, to_court: t.to_court, from_judge: t.from_judge || "", to_judge: t.to_judge || "", reason: t.reason || "", order_ref: t.order_ref || "", notes: t.notes || "" } : { ...BLANK_TRANSFER });
        setTransferErr(""); setShowTransferModal(true);
    };
    const saveTransfer = async () => {
        if (!detail) return;
        if (!transferForm.from_court.trim() || !transferForm.to_court.trim()) { setTransferErr("From court and To court are required"); return; }
        setTransferSaving(true); setTransferErr("");
        const url = editTransfer ? `/matters/${detail.matter_id}/transfers/${editTransfer.transfer_id}` : `/matters/${detail.matter_id}/transfers`;
        const method = editTransfer ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(transferForm) });
        setTransferSaving(false);
        if (res.ok) { setShowTransferModal(false); loadTransfers(detail.matter_id); }
        else { const e = await res.json(); setTransferErr(e.error || "Save failed"); }
    };
    const deleteTransferUI = (transferId: string) => {
        if (!detail || !confirm("Delete this court transfer record?")) return;
        fetch(`/matters/${detail.matter_id}/transfers/${transferId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadTransfers(detail.matter_id));
    };

    // ── Challan functions — Task #149 ──────────────────────────────────────
    const BLANK_CHALLAN_FN = { challan_date: "", challan_type: "Complete", submitted_in_time: true, witnesses_count: 0, challan_court: "", status: "Pending", notes: "" };
    const loadChallan = (matterId: string) => {
        setChallanLoading(true);
        fetch(`/matters/${matterId}/challan`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setMatterChallanList(d.challan || []); setChallanLoading(false); })
            .catch(() => setChallanLoading(false));
    };
    const openChallanModal = (c?: MatterChallan) => {
        setEditChallan(c || null);
        setChallanErr("");
        setChallanForm(c ? {
            challan_date: c.challan_date || "", challan_type: c.challan_type,
            submitted_in_time: !!c.submitted_in_time, witnesses_count: c.witnesses_count,
            challan_court: c.challan_court || "", status: c.status, notes: c.notes || "",
        } : { ...BLANK_CHALLAN_FN });
        setShowChallanModal(true);
    };
    const saveChallan = async () => {
        if (!detail) return;
        setChallanSaving(true); setChallanErr("");
        const url = editChallan ? `/matters/${detail.matter_id}/challan/${editChallan.challan_id}` : `/matters/${detail.matter_id}/challan`;
        const method = editChallan ? "PATCH" : "POST";
        const body = { ...challanForm, submitted_in_time: challanForm.submitted_in_time ? 1 : 0 };
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
        setChallanSaving(false);
        if (res.ok) { setShowChallanModal(false); loadChallan(detail.matter_id); }
        else { const d = await res.json(); setChallanErr(d.error || "Save failed"); }
    };
    const deleteChallanUI = (challanId: string) => {
        if (!detail || !confirm("Delete this challan record?")) return;
        fetch(`/matters/${detail.matter_id}/challan/${challanId}`, { method: "DELETE", headers: authHeaders() })
            .then(() => loadChallan(detail.matter_id));
    };

    const fmtElapsed = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const fmtDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const startTimer = () => {
        setTimerStart(Date.now() - timerElapsed * 1000);
        setTimerRunning(true);
    };

    const stopTimer = () => {
        setTimerRunning(false);
        const mins = Math.max(1, Math.round(timerElapsed / 60));
        const hh = Math.floor(mins / 60);
        const mm = mins % 60;
        setTimeForm({ ...BLANK_TIME_FORM, hours: String(hh), minutes: String(mm), entry_date: new Date().toISOString().slice(0, 10) });
        setEditTimeEntry(null); setTimeErr(""); setShowTimeModal(true);
    };

    const resetTimer = () => { setTimerRunning(false); setTimerElapsed(0); setTimerStart(null); };

    // Live timer tick
    useEffect(() => {
        if (!timerRunning || timerStart === null) return;
        const id = setInterval(() => {
            setTimerElapsed(Math.floor((Date.now() - timerStart) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [timerRunning, timerStart]);

    const openTimeModal = (entry?: TimeEntry) => {
        if (entry) {
            setEditTimeEntry(entry);
            setTimeForm({
                description: entry.description ?? "",
                entry_date: entry.entry_date,
                hours: String(Math.floor(entry.duration_minutes / 60)),
                minutes: String(entry.duration_minutes % 60),
                hourly_rate: String(entry.hourly_rate),
                billable: entry.billable === 1,
            });
        } else {
            setEditTimeEntry(null);
            setTimeForm({ ...BLANK_TIME_FORM, entry_date: new Date().toISOString().slice(0, 10) });
        }
        setTimeErr(""); setShowTimeModal(true);
    };

    const saveTimeEntry = async () => {
        const hrs = parseInt(timeForm.hours || "0");
        const mins = parseInt(timeForm.minutes || "0");
        const totalMins = hrs * 60 + mins;
        if (totalMins <= 0) { setTimeErr("Duration must be greater than 0."); return; }
        if (!timeForm.entry_date) { setTimeErr("Date is required."); return; }
        if (!detail) return;
        setTimeSaving(true); setTimeErr("");
        const body = {
            duration_minutes: totalMins,
            entry_date: timeForm.entry_date,
            description: timeForm.description.trim() || undefined,
            hourly_rate: parseInt(timeForm.hourly_rate || "0"),
            billable: timeForm.billable ? 1 : 0,
        };
        try {
            const url = editTimeEntry
                ? `/matters/${detail.matter_id}/time-entries/${editTimeEntry.entry_id}`
                : `/matters/${detail.matter_id}/time-entries`;
            const method = editTimeEntry ? "PATCH" : "POST";
            const r = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setTimeErr(d.error ?? "Save failed."); }
            else { setShowTimeModal(false); setTimerElapsed(0); loadTimeEntries(detail.matter_id); }
        } catch { setTimeErr("Network error."); }
        finally { setTimeSaving(false); }
    };

    const deleteTimeEntryUI = async (entry: TimeEntry) => {
        if (!detail || !confirm("Delete this time entry?")) return;
        await fetch(`/matters/${detail.matter_id}/time-entries/${entry.entry_id}`, { method: "DELETE", headers: authHeaders() });
        loadTimeEntries(detail.matter_id);
    };

    const billSelected = async () => {
        if (!detail || selectedEntries.size === 0) return;
        setBilling(true);
        try {
            const r = await fetch(`/matters/${detail.matter_id}/time-entries/bill`, {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ entry_ids: [...selectedEntries], description: billDesc || "Time charges" }),
            });
            if (r.ok) {
                setShowBillModal(false); setSelectedEntries(new Set()); setBillDesc("");
                loadTimeEntries(detail.matter_id);
                alert("Fee created! View it in the Fees & Invoices tab.");
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d.error ?? "Failed to create fee.");
            }
        } catch { alert("Network error."); }
        finally { setBilling(false); }
    };

    const openDetail = (m: Matter) => {
        setDetailTab("documents");
        setFees([]);
        setOrders([]);
        setAdverseParties([]);
        setTimeEntries([]);
        setSelectedEntries(new Set());
        resetTimer();
        fetch(`/matters/${m.matter_id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setDetail(d); setEditDetail(false); });
        loadAdverseParties(m.matter_id);
    };

    const loadFees = (matterId: string) => {
        setFeesLoading(true);
        fetch(`/fees?matter_id=${matterId}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setFees(Array.isArray(d) ? d : []); setFeesLoading(false); })
            .catch(() => setFeesLoading(false));
    };

    const openFeeModal = (fee?: Fee) => {
        if (fee) {
            setEditFee(fee);
            setFeeForm({ description: fee.description, fee_type: fee.fee_type, amount: String(fee.amount), fee_date: fee.fee_date, notes: fee.notes ?? "" });
        } else {
            setEditFee(null);
            const today = new Date().toISOString().slice(0, 10);
            setFeeForm({ description: "", fee_type: "Consultation", amount: "", fee_date: today, notes: "" });
        }
        setFeeErr(""); setShowFeeModal(true);
    };

    const saveFee = async () => {
        if (!feeForm.description.trim() || !feeForm.fee_date || !feeForm.amount) {
            setFeeErr("Description, date, and amount are required."); return;
        }
        const amount = parseInt(feeForm.amount);
        if (isNaN(amount) || amount < 0) { setFeeErr("Amount must be a positive number."); return; }
        setFeeSaving(true); setFeeErr("");
        const body = { description: feeForm.description.trim(), fee_type: feeForm.fee_type, amount, fee_date: feeForm.fee_date, notes: feeForm.notes || undefined, matter_id: detail?.matter_id };
        try {
            const r = editFee
                ? await fetch(`/fees/${editFee.fee_id}`, { method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) })
                : await fetch("/fees", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!r.ok) { const d = await r.json().catch(() => ({})); setFeeErr(d.error ?? "Save failed."); }
            else { setShowFeeModal(false); if (detail) loadFees(detail.matter_id); }
        } catch { setFeeErr("Network error."); }
        finally { setFeeSaving(false); }
    };

    const deleteFee = async (fee: Fee) => {
        if (!confirm(`Delete fee "${fee.description}"?`)) return;
        await fetch(`/fees/${fee.fee_id}`, { method: "DELETE", headers: authHeaders() });
        if (detail) loadFees(detail.matter_id);
    };

    const toggleFeePaid = async (fee: Fee) => {
        await fetch(`/fees/${fee.fee_id}`, {
            method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ is_paid: fee.is_paid ? 0 : 1 }),
        });
        if (detail) loadFees(detail.matter_id);
    };

    const generateInvoice = async () => {
        if (!detail) return;
        const unbilled = fees.filter(f => !f.invoice_id && !f.is_paid);
        if (unbilled.length === 0) { alert("No unbilled fees to invoice."); return; }
        setGenInvLoading(true);
        const today = new Date().toISOString().slice(0, 10);
        try {
            const r = await fetch("/invoices", {
                method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    matter_id: detail.matter_id, title: `Invoice — ${detail.title}`,
                    issued_date: today, client_id: detail.client_id,
                }),
            });
            if (r.ok) { loadFees(detail.matter_id); alert("Invoice created! View it in the Invoices panel."); }
            else { const d = await r.json().catch(() => ({})); alert(d.error ?? "Failed to create invoice."); }
        } catch { alert("Network error."); }
        finally { setGenInvLoading(false); }
    };

    const checkConflicts = async () => {
        const clientName = clients.find(c => c.client_id === form.client_id)?.name || "";
        const opponent = form.opposing_party || "";
        if (!clientName && !opponent) { alert("Enter a client and/or opposing party first."); return; }
        setConflictChecking(true);
        const res = await fetch("/conflicts/check", {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ new_client_name: clientName, opponent_name: opponent }),
        });
        const d = await res.json();
        setConflictResults(d.conflicts || []);
        setConflictChecking(false);
        setShowConflictModal(true);
    };

    const saveMatter = async () => {
        if (!form.client_id || !form.title.trim() || !form.matter_type) {
            setFormErr("Client, title, and matter type are required."); return;
        }
        setSaving(true); setFormErr(null);
        const body: any = { ...form };
        if (!body.team_id) body.team_id = null;
        try {
            const res = await fetch("/matters", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setFormErr(data.error ?? "Failed."); setSaving(false); return; }
            setShowModal(false);
            loadAll();
        } catch { setFormErr("Network error."); }
        setSaving(false);
    };

    const saveDetailEdit = async () => {
        if (!detail) return;
        setSaving(true); setFormErr(null);
        const body: any = { ...form };
        if (!body.team_id) body.team_id = null;
        try {
            const res = await fetch(`/matters/${detail.matter_id}`, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setFormErr(data.error ?? "Failed."); setSaving(false); return; }
            setDetail(data);
            setMatters(prev => prev.map(m => m.matter_id === data.matter_id ? { ...m, ...data } : m));
            setEditDetail(false);
        } catch { setFormErr("Network error."); }
        setSaving(false);
    };

    const removeMatter = async (m: Matter) => {
        if (!confirm(`Delete matter "${m.title}"?`)) return;
        setRemoving(m.matter_id);
        await fetch(`/matters/${m.matter_id}`, { method: "DELETE", headers: authHeaders() });
        setMatters(prev => prev.filter(x => x.matter_id !== m.matter_id));
        if (detail?.matter_id === m.matter_id) setDetail(null);
        setRemoving(null);
    };

    const unlinkDoc = async (docId: string) => {
        if (!detail) return;
        await fetch(`/matters/${detail.matter_id}/documents/${docId}`, { method: "DELETE", headers: authHeaders() });
        setDetail(prev => prev ? { ...prev, documents: (prev.documents ?? []).filter(d => d.doc_id !== docId) } : prev);
    };

    const openLinkModal = () => {
        fetch("/documents", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                const docs: DocFile[] = (d.documents ?? []).map((doc: any) => ({
                    doc_id: doc.doc_id, name: doc.filename,
                    size: fmtBytes(doc.size_bytes ?? 0), size_bytes: doc.size_bytes ?? 0,
                    uploaded: fmtDate(doc.uploaded_at ?? ""), status: doc.status,
                    category_id: doc.category_id ?? null, category_name: doc.category_name ?? null,
                    matter_id: doc.matter_id ?? null,
                }));
                // Show only docs not linked to another matter
                setAllDocs(docs.filter((d: any) => !d.matter_id || d.matter_id === detail?.matter_id));
                setShowLinkModal(true);
            });
    };

    const linkDoc = async (docId: string) => {
        if (!detail) return;
        setLinkingDoc(docId);
        const res = await fetch(`/matters/${detail.matter_id}/documents/${docId}`, { method: "POST", headers: authHeaders() });
        if (res.ok) {
            // Refresh matter detail
            fetch(`/matters/${detail.matter_id}`, { headers: authHeaders() })
                .then(r => r.json()).then(d => setDetail(d));
            setAllDocs(prev => prev.filter(d => d.doc_id !== docId));
        }
        setLinkingDoc(null);
    };

    const addCourt = async () => {
        const name = newCourtName.trim();
        if (!name) return;
        setAddingCourt(true);
        try {
            const res = await fetch("/courts", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (res.ok) {
                setCustomCourts(prev => [...prev, data]);
                setNewCourtName("");
            }
        } catch { /* silent */ }
        setAddingCourt(false);
    };

    const filtered = matters.filter(m =>
        (filterStatus   === "all" || m.status        === filterStatus)   &&
        (filterType     === "all" || m.matter_type   === filterType)     &&
        (filterPriority === "all" || (m.priority ?? "Normal") === filterPriority)
    );

    const MatterForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
        <>
            {formErr && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {formErr}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Title *</label>
                    <input className={styles.formInput} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Khan vs State — Criminal Appeal 2024" autoFocus />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Client *</label>
                    <select className={styles.formSelect} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                        <option value="">Select client…</option>
                        {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Matter Type *</label>
                    <select className={styles.formSelect} value={form.matter_type} onChange={e => setForm({ ...form, matter_type: e.target.value })}>
                        {MATTER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Status</label>
                    <select className={styles.formSelect} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                        {MATTER_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Assigned Team</label>
                    <select className={styles.formSelect} value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}>
                        <option value="">No team</option>
                        {matterTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Court</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <select className={styles.formSelect} value={form.court_name} onChange={e => setForm({ ...form, court_name: e.target.value })}>
                            <option value="">Select court…</option>
                            {allCourts.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                        <input className={styles.formInput} placeholder="Add custom court…" value={newCourtName}
                            onChange={e => setNewCourtName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addCourt()}
                            style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }} />
                        <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", whiteSpace: "nowrap" }}
                            onClick={addCourt} disabled={addingCourt || !newCourtName.trim()}>
                            {addingCourt ? "…" : "+ Add"}
                        </button>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Case Number</label>
                    <input className={styles.formInput} value={form.case_number} onChange={e => setForm({ ...form, case_number: e.target.value })} placeholder="e.g. 2024/LHC/4512" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Filing Date</label>
                    <input className={styles.formInput} type="date" value={form.filing_date} onChange={e => setForm({ ...form, filing_date: e.target.value })} />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Opposing Party</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input className={styles.formInput} value={form.opposing_party} onChange={e => setForm({ ...form, opposing_party: e.target.value })} placeholder="Name of opposing counsel or party" style={{ flex: 1 }} />
                        <button type="button" className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", whiteSpace: "nowrap", borderColor: "#dc2626", color: "#dc2626" }}
                            onClick={checkConflicts} disabled={conflictChecking}>
                            {conflictChecking ? "Checking…" : "⚖ Check Conflicts"}
                        </button>
                    </div>
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Notes</label>
                    <input className={styles.formInput} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes…" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Vakalatnama Status</label>
                    <select className={styles.formSelect} value={form.vakalatnama_status} onChange={e => setForm({ ...form, vakalatnama_status: e.target.value })}>
                        {VAKALATNAMA_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Priority</label>
                    <select className={styles.formSelect} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                        {MATTER_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
                {/* Physical File — Task #151 */}
                <div className={styles.formGroup} style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <label className={styles.formLabel} style={{ fontWeight: 700 }}>📁 Physical File Location</label>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>File Ref No.</label>
                    <input className={styles.formInput} value={form.physical_file_ref} onChange={e => setForm({ ...form, physical_file_ref: e.target.value })} placeholder="e.g. PF-2024-042" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Rack No.</label>
                    <input className={styles.formInput} value={form.rack_no} onChange={e => setForm({ ...form, rack_no: e.target.value })} placeholder="e.g. R3" />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Bundle / Folder No.</label>
                    <input className={styles.formInput} value={form.bundle_no} onChange={e => setForm({ ...form, bundle_no: e.target.value })} placeholder="e.g. B12" />
                </div>
                {/* Appeal Hierarchy — Task #166 */}
                <div className={styles.formGroup} style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <label className={styles.formLabel} style={{ fontWeight: 700 }}>⚖ Appeal Hierarchy</label>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Matter Stage</label>
                    <select className={styles.formSelect} value={form.matter_stage} onChange={e => setForm({ ...form, matter_stage: e.target.value })}>
                        <option value="">— Not set —</option>
                        {["Trial Court (Original)", "First Appeal", "Second Appeal", "Revision", "Constitutional Petition (LHC)", "Constitutional Petition (SC)", "Civil/Criminal Appeal (SC)", "Execution Proceedings", "Review Petition"].map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Parent Matter (linked appeal from)</label>
                    <select className={styles.formSelect} value={form.parent_matter_id} onChange={e => setForm({ ...form, parent_matter_id: e.target.value })}>
                        <option value="">— None / Original matter —</option>
                        {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title} [{m.matter_type}]</option>)}
                    </select>
                </div>

                {/* Limitation fields */}
                <div className={styles.formGroup} style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <label className={styles.formLabel} style={{ color: "var(--gold)", fontWeight: 700 }}>⚠ Limitation (Limitation Act 1908)</label>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Suit / Appeal Type</label>
                    <select className={styles.formSelect} value={form.limitation_type} onChange={e => {
                        const lt = e.target.value;
                        const newLimDate = lt && form.cause_of_action_date ? computeLimitationDate(lt, form.cause_of_action_date) : "";
                        setForm({ ...form, limitation_type: lt, limitation_date: newLimDate });
                    }}>
                        <option value="">Not set</option>
                        {LIMITATION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cause of Action Date</label>
                    <input type="date" className={styles.formInput} value={form.cause_of_action_date} onChange={e => {
                        const coa = e.target.value;
                        const newLimDate = form.limitation_type && coa ? computeLimitationDate(form.limitation_type, coa) : form.limitation_date;
                        setForm({ ...form, cause_of_action_date: coa, limitation_date: newLimDate });
                    }} />
                </div>
                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                    <label className={styles.formLabel}>Limitation Deadline <span className={styles.muted} style={{ fontWeight: 400 }}>(auto-computed or override)</span></label>
                    <input type="date" className={styles.formInput} value={form.limitation_date} onChange={e => setForm({ ...form, limitation_date: e.target.value })}
                        style={form.limitation_date && limitationDaysRemaining(form.limitation_date) <= 30 ? { borderColor: "#c94040" } : {}} />
                    {form.limitation_date && (() => {
                        const d = limitationDaysRemaining(form.limitation_date);
                        return <div style={{ fontSize: "0.78rem", marginTop: "0.3rem", color: d < 0 ? "#c94040" : d <= 30 ? "#c97c2a" : "var(--text-3)" }}>
                            {d < 0 ? `⚠ Limitation expired ${Math.abs(d)} days ago` : d === 0 ? "⚠ Limitation expires TODAY" : `${d} days remaining`}
                        </div>;
                    })()}
                </div>
            </div>
            <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={onCancel}>Cancel</button>
                <button className={styles.btnPrimary} onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save Matter"}</button>
            </div>
        </>
    );

    // ─ Matter detail view ─
    if (detail) {
        const grouped = groupDocsByCategory(detail.documents ?? []);
        return (
            <div className={styles.panelContent}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                    <button className={styles.backBtn} onClick={() => setDetail(null)}>← Back to Matters</button>
                    {!editDetail && (
                        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => {
                                setForm({
                                    client_id: detail.client_id, title: detail.title,
                                    matter_type: detail.matter_type, status: detail.status,
                                    court_name: detail.court_name ?? "", case_number: detail.case_number ?? "",
                                    filing_date: detail.filing_date ?? "", opposing_party: detail.opposing_party ?? "",
                                    team_id: detail.team_id ?? "", notes: detail.notes ?? "",
                                    limitation_type: detail.limitation_type ?? "",
                                    cause_of_action_date: detail.cause_of_action_date ?? "",
                                    limitation_date: detail.limitation_date ?? "",
                                    vakalatnama_status: detail.vakalatnama_status ?? "Pending",
                                    priority: detail.priority ?? "Normal",
                                    physical_file_ref: detail.physical_file_ref ?? "",
                                    rack_no: detail.rack_no ?? "",
                                    bundle_no: detail.bundle_no ?? "",
                                    parent_matter_id: detail.parent_matter_id ?? "",
                                    matter_stage: detail.matter_stage ?? "",
                                });
                                setFormErr(null); setEditDetail(true);
                            }}>Edit</button>
                            <button className={styles.actionBtnDanger} style={{ fontSize: "0.8rem" }} onClick={() => removeMatter(detail)}>Delete</button>
                            {detail.case_number && (
                                <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }}
                                    onClick={checkLhcStatus} disabled={lhcChecking}>
                                    {lhcChecking ? "Checking…" : "🏛 LHC Status"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                {lhcResult && (
                    <div style={{ margin: "0.5rem 0", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: lhcResult.status === "ok" ? "var(--bg-1)" : "rgba(220,38,38,0.06)", fontSize: "0.82rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{lhcResult.status === "ok" ? "🏛 LHC Result" : lhcResult.status === "unavailable" ? "⚠ LHC lookup not yet configured" : "✗ LHC lookup error"}</strong>
                            <button className={styles.btnGhost} style={{ fontSize: "0.72rem", padding: "1px 6px" }} onClick={() => setLhcResult(null)}>✕</button>
                        </div>
                        {lhcResult.message && <div className={styles.muted} style={{ marginTop: "0.25rem" }}>{lhcResult.message}</div>}
                        {lhcResult.raw_text && <pre style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap", fontSize: "0.78rem", maxHeight: 200, overflow: "auto" }}>{lhcResult.raw_text}</pre>}
                    </div>
                )}

                {editDetail ? (
                    <div className={styles.settingsCard} style={{ marginBottom: "1.5rem" }}>
                        <div className={styles.settingsCardTitle}>Edit Matter</div>
                        <MatterForm onSave={saveDetailEdit} onCancel={() => setEditDetail(false)} />
                    </div>
                ) : (
                    <div className={styles.matterDetailHeader}>
                        <div>
                            <h2 className={styles.detailTitle}>{detail.title}</h2>
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                                <span className={(styles as any)[STATUS_BADGE[detail.status] ?? "badgeGray"]}>{detail.status}</span>
                                <span className={styles.badgeGray}>{detail.matter_type}</span>
                                {detail.team_name && <span className={styles.badgeGold}>👥 {detail.team_name}</span>}
                            </div>
                        </div>
                        <div className={styles.detailInfoGrid} style={{ marginTop: "1rem" }}>
                            <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Client</span><span>{detail.client_name}</span></div>
                            {detail.court_name    && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Court</span><span>{detail.court_name}</span></div>}
                            {detail.case_number   && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Case #</span><span>{detail.case_number}</span></div>}
                            {detail.filing_date   && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Filed</span><span>{detail.filing_date}</span></div>}
                            {detail.opposing_party && <div className={styles.detailInfoItem}><span className={styles.detailInfoLabel}>Opposing Party</span><span>{detail.opposing_party}</span></div>}
                            {detail.notes         && <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}><span className={styles.detailInfoLabel}>Notes</span><span>{detail.notes}</span></div>}
                            {(detail.physical_file_ref || detail.rack_no || detail.bundle_no) && (
                                <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}>
                                    <span className={styles.detailInfoLabel}>📁 Physical File</span>
                                    <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                                        {[detail.physical_file_ref && `Ref: ${detail.physical_file_ref}`, detail.rack_no && `Rack: ${detail.rack_no}`, detail.bundle_no && `Bundle: ${detail.bundle_no}`].filter(Boolean).join(" · ")}
                                    </span>
                                </div>
                            )}
                            {detail.matter_stage && (
                                <div className={styles.detailInfoItem}>
                                    <span className={styles.detailInfoLabel}>⚖ Stage</span>
                                    <span className={styles.badgeAmber} style={{ fontSize: "0.75rem" }}>{detail.matter_stage}</span>
                                </div>
                            )}
                            {detail.parent_matter_id && (
                                <div className={styles.detailInfoItem}>
                                    <span className={styles.detailInfoLabel}>🔗 Appeal Of</span>
                                    <span style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
                                        {matters.find(m => m.matter_id === detail.parent_matter_id)?.title ?? detail.parent_matter_id}
                                    </span>
                                </div>
                            )}
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Vakalatnama</span>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span className={
                                        detail.vakalatnama_status === "Filed"        ? styles.badgeGreen :
                                        detail.vakalatnama_status === "Not Required" ? styles.badgeGray  : styles.badgeAmber
                                    } style={{ fontSize: "0.72rem" }}>
                                        {detail.vakalatnama_status ?? "Pending"}
                                    </span>
                                    {VAKALATNAMA_STATUSES.filter(s => s !== (detail.vakalatnama_status ?? "Pending")).map(s => (
                                        <button key={s} className={styles.btnGhost} style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem" }}
                                            onClick={async () => {
                                                const r = await fetch(`/matters/${detail.matter_id}`, {
                                                    method: "PATCH",
                                                    headers: { ...authHeaders(), "Content-Type": "application/json" },
                                                    body: JSON.stringify({ vakalatnama_status: s }),
                                                });
                                                if (r.ok) {
                                                    const updated = await r.json();
                                                    setDetail(updated);
                                                    setMatters(prev => prev.map(m => m.matter_id === updated.matter_id ? { ...m, vakalatnama_status: updated.vakalatnama_status } : m));
                                                }
                                            }}>
                                            → {s}
                                        </button>
                                    ))}
                                </span>
                            </div>
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Adjournments</span>
                                <span>
                                    <span className={
                                        (detail.adjournment_count ?? 0) >= 10 ? styles.limBadgeCritical :
                                        (detail.adjournment_count ?? 0) >= 5  ? styles.badgeAmber : styles.badgeGray
                                    } style={{ fontSize: "0.78rem" }}>
                                        {detail.adjournment_count ?? 0} adjournment{(detail.adjournment_count ?? 0) !== 1 ? "s" : ""}
                                    </span>
                                    <span className={styles.muted} style={{ fontSize: "0.75rem", marginLeft: "0.4rem" }}>(from Court Orders log)</span>
                                </span>
                            </div>
                            <div className={styles.detailInfoItem}>
                                <span className={styles.detailInfoLabel}>Priority</span>
                                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span className={styles.priorityBadge} data-priority={detail.priority ?? "Normal"}>
                                        {detail.priority ?? "Normal"}
                                    </span>
                                    {MATTER_PRIORITIES.filter(p => p !== (detail.priority ?? "Normal")).map(p => (
                                        <button key={p} className={styles.btnGhost} style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem" }}
                                            onClick={async () => {
                                                const r = await fetch(`/matters/${detail.matter_id}`, {
                                                    method: "PATCH",
                                                    headers: { ...authHeaders(), "Content-Type": "application/json" },
                                                    body: JSON.stringify({ priority: p }),
                                                });
                                                if (r.ok) {
                                                    const updated = await r.json();
                                                    setDetail(updated);
                                                    setMatters(prev => prev.map(m => m.matter_id === updated.matter_id ? { ...m, priority: updated.priority } : m));
                                                }
                                            }}>
                                            → {p}
                                        </button>
                                    ))}
                                </span>
                            </div>
                            {detail.limitation_date && (() => {
                                const d = limitationDaysRemaining(detail.limitation_date!);
                                return (
                                    <div className={styles.detailInfoItem} style={{ gridColumn: "1/-1" }}>
                                        <span className={styles.detailInfoLabel}>Limitation Deadline</span>
                                        <span>
                                            {detail.limitation_date}
                                            {detail.limitation_type && <span className={styles.muted}> ({detail.limitation_type})</span>}
                                            <span className={d < 0 ? styles.limBadgeCritical : d <= 30 ? styles.limBadgeCritical : d <= 60 ? styles.limBadgeWarn : styles.badgeGreen} style={{ marginLeft: "0.5rem", fontSize: "0.72rem" }}>
                                                {d < 0 ? `EXPIRED ${Math.abs(d)}d ago` : d === 0 ? "EXPIRES TODAY" : `${d} days left`}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ── Adverse Parties section ── */}
                <div className={styles.adversePartiesSection}>
                    <div className={styles.adversePartiesSectionHeader}>
                        <span className={styles.adversePartiesSectionTitle}>⚖ Opposing Parties</span>
                        <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.25rem 0.65rem" }} onClick={() => openPartyModal()}>+ Add</button>
                    </div>
                    {adverseParties.length === 0 ? (
                        <span className={styles.muted} style={{ fontSize: "0.8rem" }}>None recorded.</span>
                    ) : (
                        <div className={styles.adversePartyList}>
                            {adverseParties.map(p => (
                                <div key={p.party_id} className={styles.adversePartyCard}>
                                    <div className={styles.adversePartyCardMain}>
                                        <span className={styles.adversePartyName}>{p.party_name}</span>
                                        <span className={styles.badgeGray} style={{ fontSize: "0.68rem" }}>{p.party_type}</span>
                                    </div>
                                    {(p.counsel_name || p.counsel_firm) && (
                                        <div className={styles.adversePartyMeta}>
                                            {p.counsel_name && <span>Counsel: <strong>{p.counsel_name}</strong></span>}
                                            {p.counsel_firm && <span> · {p.counsel_firm}</span>}
                                            {p.counsel_phone && <span> · {p.counsel_phone}</span>}
                                        </div>
                                    )}
                                    {p.notes && <div className={styles.adversePartyNotes}>{p.notes}</div>}
                                    <div className={styles.adversePartyActions}>
                                        <button className={styles.actionBtn} onClick={() => openPartyModal(p)}>Edit</button>
                                        <button className={styles.actionBtnDanger} onClick={() => deleteParty(p)}>Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Adverse Party modal ── */}
                {showPartyModal && (
                    <div className={styles.overlay} onClick={() => setShowPartyModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                            <div className={styles.modalTitle}>{editParty ? "Edit Opposing Party" : "Add Opposing Party"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                                    <label className={styles.formLabel}>Party Name *</label>
                                    <input className={styles.formInput} value={partyForm.party_name} onChange={e => setPartyForm(f => ({ ...f, party_name: e.target.value }))} placeholder="e.g. Muhammad Arif Khan" autoFocus />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Party Type</label>
                                    <select className={styles.formSelect} value={partyForm.party_type} onChange={e => setPartyForm(f => ({ ...f, party_type: e.target.value }))}>
                                        {["Individual", "Company", "Government", "Other"].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Counsel Name</label>
                                    <input className={styles.formInput} value={partyForm.counsel_name} onChange={e => setPartyForm(f => ({ ...f, counsel_name: e.target.value }))} placeholder="Opposing advocate" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Counsel Phone</label>
                                    <input className={styles.formInput} value={partyForm.counsel_phone} onChange={e => setPartyForm(f => ({ ...f, counsel_phone: e.target.value }))} placeholder="+92 300 0000000" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Counsel Firm</label>
                                    <input className={styles.formInput} value={partyForm.counsel_firm} onChange={e => setPartyForm(f => ({ ...f, counsel_firm: e.target.value }))} placeholder="Law firm name" />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: "1/-1" }}>
                                    <label className={styles.formLabel}>Notes</label>
                                    <input className={styles.formInput} value={partyForm.notes} onChange={e => setPartyForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any relevant notes…" />
                                </div>
                            </div>
                            {partyErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{partyErr}</div>}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowPartyModal(false)} disabled={partySaving}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveParty} disabled={partySaving}>{partySaving ? "Saving…" : editParty ? "Save Changes" : "Add Party"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail tabs */}
                <div className={styles.detailTabBar}>
                    <button className={`${styles.detailTabBtn}${detailTab === "documents" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => setDetailTab("documents")}>
                        Documents ({(detail.documents ?? []).length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "fees" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("fees"); if (detail) loadFees(detail.matter_id); }}>
                        Fees &amp; Invoices
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "orders" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("orders"); if (detail) loadOrders(detail.matter_id); }}>
                        Court Orders ({orders.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "time" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("time"); if (detail) loadTimeEntries(detail.matter_id); }}>
                        Time ({timeEntries.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "notes" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("notes"); if (detail) loadNotes(detail.matter_id); }}>
                        Notes ({matterNotes.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "docreqs" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("docreqs"); if (detail) loadDocRequests(detail.matter_id); }}>
                        Doc Requests ({docRequests.filter(r => r.status === "Pending" || r.status === "Overdue").length} pending)
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "witnesses" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("witnesses"); if (detail) loadWitnesses(detail.matter_id); }}>
                        Witnesses ({witnesses.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "deadlines" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("deadlines"); if (detail) loadDeadlines(detail.matter_id); }}>
                        Deadlines ({matterDeadlines.filter(d => !d.completed).length} open)
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "expenses" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("expenses"); if (detail) loadExpenses(detail.matter_id); }}>
                        Expenses (PKR {matterExpenses.reduce((s, e) => s + e.amount_pkr, 0).toLocaleString()})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "correspondence" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("correspondence"); if (detail) loadCorrespondence(detail.matter_id); }}>
                        Correspondence ({correspondence.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "relief" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("relief"); if (detail) loadRelief(detail.matter_id); }}>
                        Relief ({matterRelief.filter(r => r.status === "Pending" || r.status === "Granted").length} active)
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "outcome" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("outcome"); if (detail) loadOutcome(detail.matter_id); }}>
                        Outcome {matterOutcome && matterOutcome.outcome_type !== "Pending" ? `(${matterOutcome.outcome_type})` : ""}
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "charges" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("charges"); if (detail) loadCharges(detail.matter_id); }}>
                        Charges ({matterCharges.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "fir" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("fir"); if (detail) loadFir(detail.matter_id); }}>
                        FIR ({matterFirList.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "challan" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("challan"); if (detail) loadChallan(detail.matter_id); }}>
                        Challan ({matterChallanList.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "courtfees" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("courtfees"); if (detail) loadCourtFees(detail.matter_id); }}>
                        Court Fees ({courtFeeList.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "assocfees" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("assocfees"); if (detail) loadAssocFees(detail.matter_id); }}>
                        Assoc. Fees ({assocFeeList.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "cheques" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("cheques"); if (detail) loadCheques(detail.matter_id); }}>
                        Cheques ({chequeList.length})
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "bailbonds" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("bailbonds"); if (detail) loadBailBonds(detail.matter_id); }}>
                        ⛓ Bail Bonds
                    </button>
                    <button className={`${styles.detailTabBtn}${detailTab === "transfers" ? " " + styles.detailTabBtnActive : ""}`}
                        onClick={() => { setDetailTab("transfers"); if (detail) loadTransfers(detail.matter_id); }}>
                        🔀 Transfers
                    </button>
                </div>

                {/* ── Documents tab ── */}
                {detailTab === "documents" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>{(detail.documents ?? []).length} document{(detail.documents ?? []).length !== 1 ? "s" : ""} linked</span>
                        <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={openLinkModal}>
                            + Link Documents
                        </button>
                    </div>
                    {grouped.length === 0 ? (
                        <div className={styles.emptyHint}>No documents linked yet. Click "Link Documents" to attach files from your library.</div>
                    ) : (
                        <div className={styles.docHierarchy}>
                            {grouped.map(([catName, docs]) => (
                                <div key={catName} className={styles.docHierarchyGroup}>
                                    <div className={styles.docHierarchyGroupHeader}>
                                        <span className={styles.docHierarchyCat}>📁 {catName}</span>
                                        <span className={styles.docHierarchyCount}>{docs.length}</span>
                                    </div>
                                    {docs.map(doc => (
                                        <div key={doc.doc_id} className={styles.docHierarchyRow}>
                                            <span className={styles.fileIcon} style={{ fontSize: "0.55rem" }}>F</span>
                                            <span className={styles.docHierarchyName}>{doc.filename}</span>
                                            <span className={styles.docHierarchySize}>{fmtBytes(doc.size_bytes)}</span>
                                            <span className={doc.status === "ready" ? styles.badgeGreen : styles.badgeAmber} style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem" }}>
                                                {doc.status === "ready" ? "Ready" : "Processing"}
                                            </span>
                                            <button className={styles.queueRemove} title="Unlink from matter" onClick={() => unlinkDoc(doc.doc_id)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </>)}

                {/* ── Fees tab ── */}
                {detailTab === "fees" && (<>
                    {(() => {
                        const unbilled  = fees.filter(f => !f.invoice_id);
                        const billed    = fees.filter(f => !!f.invoice_id);
                        const totalUnbilled = unbilled.reduce((s, f) => s + f.amount, 0);
                        const totalAll  = fees.reduce((s, f) => s + f.amount, 0);
                        return (
                            <>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "var(--text-2)" }}>
                                        <span>Total: <strong style={{ color: "var(--text-1)" }}>{fmtPKR(totalAll)}</strong></span>
                                        <span>Unbilled: <strong style={{ color: "var(--gold)" }}>{fmtPKR(totalUnbilled)}</strong></span>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        {unbilled.length > 0 && (
                                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }}
                                                disabled={genInvLoading} onClick={generateInvoice}>
                                                {genInvLoading ? "Creating…" : "Generate Invoice"}
                                            </button>
                                        )}
                                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openFeeModal()}>
                                            + Add Fee
                                        </button>
                                    </div>
                                </div>

                                {feesLoading ? (
                                    <div className={styles.emptyHint}>Loading…</div>
                                ) : fees.length === 0 ? (
                                    <div className={styles.emptyHint}>No fees recorded yet. Click "+ Add Fee" to start tracking.</div>
                                ) : (
                                    <div className={styles.tableWrap}>
                                        <table className={styles.table}>
                                            <thead><tr>
                                                <th>Description</th><th>Type</th><th>Date</th>
                                                <th style={{ textAlign: "right" }}>Amount (PKR)</th>
                                                <th>Paid</th><th>Invoice</th><th>Actions</th>
                                            </tr></thead>
                                            <tbody>
                                                {fees.map(fee => (
                                                    <tr key={fee.fee_id} style={{ opacity: fee.is_paid ? 0.6 : 1 }}>
                                                        <td>{fee.description}{fee.notes && <span className={styles.muted}> · {fee.notes}</span>}</td>
                                                        <td className={styles.muted}>{fee.fee_type}</td>
                                                        <td className={styles.muted}>{fee.fee_date}</td>
                                                        <td style={{ textAlign: "right", fontWeight: 600 }}>{fee.amount.toLocaleString("en-PK")}</td>
                                                        <td>
                                                            <button
                                                                className={fee.is_paid ? styles.badgeGreen : styles.badgeGray}
                                                                style={{ border: "none", cursor: "pointer", fontSize: "0.72rem" }}
                                                                onClick={() => toggleFeePaid(fee)}>
                                                                {fee.is_paid ? "Paid" : "Unpaid"}
                                                            </button>
                                                        </td>
                                                        <td className={styles.muted}>{fee.invoice_id ? <span className={styles.badgeBlue} style={{ fontSize: "0.68rem" }}>Billed</span> : "—"}</td>
                                                        <td style={{ display: "flex", gap: "0.35rem" }}>
                                                            <button className={styles.actionBtn} onClick={() => openFeeModal(fee)}>Edit</button>
                                                            <button className={styles.actionBtnDanger} onClick={() => deleteFee(fee)}>Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: "0.82rem" }}>Total</td>
                                                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>{totalAll.toLocaleString("en-PK")}</td>
                                                    <td colSpan={3} />
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </>)}

                {/* ── Court Orders tab ── */}
                {detailTab === "orders" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.82rem", color: "var(--text-2)" }}>
                            <span>{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
                            {(() => {
                                const adj = orders.filter(o => o.outcome === "Adjourned").length;
                                return adj > 0 ? (
                                    <span className={adj >= 10 ? styles.limBadgeCritical : adj >= 5 ? styles.badgeAmber : styles.badgeGray}
                                        style={{ fontSize: "0.72rem" }}>
                                        {adj} adjournment{adj !== 1 ? "s" : ""}
                                    </span>
                                ) : null;
                            })()}
                        </div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openOrderModal()}>+ Add Order</button>
                    </div>
                    {ordersLoading ? (
                        <div className={styles.emptyHint}>Loading…</div>
                    ) : orders.length === 0 ? (
                        <div className={styles.emptyHint}>No court orders recorded yet. Click "+ Add Order" after each hearing to build the case timeline.</div>
                    ) : (
                        <div className={styles.ordersTimeline}>
                            {orders.map((o, idx) => {
                                const outcomeColor: Record<string, string> = {
                                    "Adjourned":       "var(--text-3)",
                                    "Heard":           "var(--gold)",
                                    "Decided":         "#2d8a4e",
                                    "Partially Heard": "#c97c2a",
                                };
                                return (
                                    <div key={o.order_id} className={styles.orderCard}>
                                        <div className={styles.orderCardLeft}>
                                            <div className={styles.orderDot} style={{ background: outcomeColor[o.outcome] ?? "var(--border)" }} />
                                            {idx < orders.length - 1 && <div className={styles.orderLine} />}
                                        </div>
                                        <div className={styles.orderCardBody}>
                                            <div className={styles.orderCardHeader}>
                                                <div>
                                                    <span className={styles.orderDate}>{o.hearing_date}</span>
                                                    {o.court_name && <span className={styles.orderCourt}> · {o.court_name}</span>}
                                                </div>
                                                <span className={styles.orderOutcomeBadge} style={{ color: outcomeColor[o.outcome] }}>{o.outcome}</span>
                                            </div>
                                            <div className={styles.orderBrief}>{o.order_brief}</div>
                                            {o.next_date && (
                                                <div className={styles.orderNextDate}>Next date: <strong>{o.next_date}</strong></div>
                                            )}
                                            {o._offline ? (
                                                <div className={styles.muted} style={{ fontSize: "0.78rem", marginTop: "0.3rem" }}>⏳ Saved offline — will sync automatically once you're back online.</div>
                                            ) : (
                                                <div className={styles.orderActions}>
                                                    <button className={styles.actionBtn} onClick={() => openOrderModal(o)}>Edit</button>
                                                    <button className={styles.actionBtnDanger} onClick={() => deleteOrder(o)}>Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>)}

                {/* ── Time Tracking tab ── */}
                {detailTab === "time" && (() => {
                    const billable   = timeEntries.filter(e => e.billable === 1 && !e.fee_id);
                    const totalMins  = timeEntries.reduce((s, e) => s + e.duration_minutes, 0);
                    const billMins   = billable.reduce((s, e) => s + e.duration_minutes, 0);
                    const totalValue = billable.reduce((s, e) => s + Math.round(e.duration_minutes / 60 * e.hourly_rate), 0);
                    return (
                        <>
                            {/* Timer widget */}
                            <div className={styles.timerWidget}>
                                <div className={styles.timerDisplay}>{fmtElapsed(timerElapsed)}</div>
                                <div className={styles.timerControls}>
                                    {!timerRunning ? (
                                        <button className={styles.btnPrimary} style={{ fontSize: "0.82rem" }} onClick={startTimer}>▶ Start Timer</button>
                                    ) : (
                                        <button className={styles.btnGold} style={{ fontSize: "0.82rem" }} onClick={stopTimer}>⏹ Stop &amp; Log</button>
                                    )}
                                    {timerElapsed > 0 && !timerRunning && (
                                        <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={resetTimer}>Reset</button>
                                    )}
                                    <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => openTimeModal()}>+ Manual Entry</button>
                                </div>
                            </div>

                            {/* Summary row */}
                            <div className={styles.timeSummaryRow}>
                                <span>Total: <strong>{fmtDuration(totalMins)}</strong></span>
                                <span>Unbilled billable: <strong style={{ color: "var(--gold)" }}>{fmtDuration(billMins)}</strong></span>
                                <span>Value: <strong>{totalValue.toLocaleString("en-PK")} PKR</strong></span>
                                {selectedEntries.size > 0 && (
                                    <button className={styles.btnPrimary} style={{ fontSize: "0.8rem", marginLeft: "auto" }}
                                        onClick={() => setShowBillModal(true)}>
                                        Convert {selectedEntries.size} to Fee
                                    </button>
                                )}
                            </div>

                            {/* Entries table */}
                            {timeLoading ? (
                                <div className={styles.emptyHint}>Loading…</div>
                            ) : timeEntries.length === 0 ? (
                                <div className={styles.emptyHint}>No time logged yet. Start the timer or add a manual entry.</div>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead><tr>
                                            <th style={{ width: 32 }}></th>
                                            <th>Date</th><th>Description</th><th>Duration</th>
                                            <th>Rate (PKR/hr)</th><th>Value</th><th>Billable</th><th>Billed</th><th>Actions</th>
                                        </tr></thead>
                                        <tbody>
                                            {timeEntries.map(e => {
                                                const val = Math.round(e.duration_minutes / 60 * e.hourly_rate);
                                                const canSelect = e.billable === 1 && !e.fee_id;
                                                const checked   = selectedEntries.has(e.entry_id);
                                                return (
                                                    <tr key={e.entry_id} style={{ opacity: e.fee_id ? 0.55 : 1 }}>
                                                        <td>
                                                            {canSelect && (
                                                                <input type="checkbox" checked={checked}
                                                                    onChange={() => {
                                                                        setSelectedEntries(prev => {
                                                                            const n = new Set(prev);
                                                                            checked ? n.delete(e.entry_id) : n.add(e.entry_id);
                                                                            return n;
                                                                        });
                                                                    }} />
                                                            )}
                                                        </td>
                                                        <td className={styles.muted}>{e.entry_date}</td>
                                                        <td>{e.description || <span className={styles.muted}>—</span>}</td>
                                                        <td><strong>{fmtDuration(e.duration_minutes)}</strong></td>
                                                        <td className={styles.muted}>{e.hourly_rate > 0 ? e.hourly_rate.toLocaleString("en-PK") : "—"}</td>
                                                        <td>{val > 0 ? val.toLocaleString("en-PK") : "—"}</td>
                                                        <td>{e.billable === 1 ? <span className={styles.badgeGreen} style={{ fontSize: "0.68rem" }}>Yes</span> : <span className={styles.badgeGray} style={{ fontSize: "0.68rem" }}>No</span>}</td>
                                                        <td>{e.fee_id ? <span className={styles.badgeBlue} style={{ fontSize: "0.68rem" }}>Billed</span> : "—"}</td>
                                                        <td style={{ display: "flex", gap: "0.35rem" }}>
                                                            <button className={styles.actionBtn} onClick={() => openTimeModal(e)} disabled={!!e.fee_id}>Edit</button>
                                                            <button className={styles.actionBtnDanger} onClick={() => deleteTimeEntryUI(e)} disabled={!!e.fee_id}>Delete</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Convert to fee modal */}
                            {showBillModal && (
                                <div className={styles.overlay} onClick={() => setShowBillModal(false)}>
                                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                                        <div className={styles.modalTitle}>Convert Time to Fee</div>
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-2)", marginBottom: "1rem" }}>
                                            This will create a single fee entry from {selectedEntries.size} selected time entries and mark them as billed.
                                        </p>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Fee Description</label>
                                            <input className={styles.formInput} value={billDesc}
                                                onChange={e => setBillDesc(e.target.value)}
                                                placeholder="e.g. Legal services — July 2025" />
                                        </div>
                                        <div className={styles.modalActions}>
                                            <button className={styles.btnGhost} onClick={() => setShowBillModal(false)} disabled={billing}>Cancel</button>
                                            <button className={styles.btnPrimary} onClick={billSelected} disabled={billing}>{billing ? "Creating…" : "Create Fee"}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Time entry add/edit modal */}
                            {showTimeModal && (
                                <div className={styles.overlay} onClick={() => setShowTimeModal(false)}>
                                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                                        <div className={styles.modalTitle}>{editTimeEntry ? "Edit Time Entry" : "Log Time"}</div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Description</label>
                                            <input className={styles.formInput} value={timeForm.description}
                                                onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))}
                                                placeholder="e.g. Court appearance, research, drafting" autoFocus />
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Hours</label>
                                                <input type="number" min="0" className={styles.formInput} value={timeForm.hours}
                                                    onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))} placeholder="0" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Minutes</label>
                                                <input type="number" min="0" max="59" className={styles.formInput} value={timeForm.minutes}
                                                    onChange={e => setTimeForm(f => ({ ...f, minutes: e.target.value }))} placeholder="30" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Date</label>
                                                <input type="date" className={styles.formInput} value={timeForm.entry_date}
                                                    onChange={e => setTimeForm(f => ({ ...f, entry_date: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Hourly Rate (PKR)</label>
                                                <input type="number" min="0" className={styles.formInput} value={timeForm.hourly_rate}
                                                    onChange={e => setTimeForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="e.g. 5000" />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>Billable?</label>
                                                <select className={styles.formSelect} value={timeForm.billable ? "yes" : "no"}
                                                    onChange={e => setTimeForm(f => ({ ...f, billable: e.target.value === "yes" }))}>
                                                    <option value="yes">Yes</option>
                                                    <option value="no">No</option>
                                                </select>
                                            </div>
                                        </div>
                                        {timeErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{timeErr}</div>}
                                        <div className={styles.modalActions}>
                                            <button className={styles.btnGhost} onClick={() => setShowTimeModal(false)} disabled={timeSaving}>Cancel</button>
                                            <button className={styles.btnPrimary} onClick={saveTimeEntry} disabled={timeSaving}>{timeSaving ? "Saving…" : editTimeEntry ? "Save Changes" : "Log Time"}</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* ── Notes tab ── Task #138 */}
                {detailTab === "notes" && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>{matterNotes.length} note{matterNotes.length !== 1 ? "s" : ""}</span>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => openNoteModal()}>+ Add Note</button>
                        </div>

                        {notesLoading ? (
                            <div className={styles.emptyHint}>Loading…</div>
                        ) : matterNotes.length === 0 ? (
                            <div className={styles.emptyHint}>No notes yet. Log calls, meetings, client instructions, and more.</div>
                        ) : (
                            <div className={styles.notesFeed}>
                                {matterNotes.map(n => (
                                    <div key={n.note_id} className={styles.noteCard}>
                                        <div className={styles.noteCardHeader}>
                                            <span className={styles.noteTypeBadge} data-type={n.note_type}>{n.note_type}</span>
                                            <span className={styles.muted} style={{ fontSize: "0.75rem" }}>{n.note_date}</span>
                                            {n.author_name && <span className={styles.muted} style={{ fontSize: "0.75rem" }}>· {n.author_name}</span>}
                                            <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem" }}>
                                                <button className={styles.actionBtn} onClick={() => openNoteModal(n)}>Edit</button>
                                                <button className={styles.actionBtnDanger} onClick={() => deleteNoteUI(n.note_id)}>Delete</button>
                                            </div>
                                        </div>
                                        <div className={styles.noteCardBody}>{n.note_text}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Note add/edit modal */}
                        {showNoteModal && (
                            <div className={styles.overlay} onClick={() => setShowNoteModal(false)}>
                                <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                                    <div className={styles.modalTitle}>{editNote ? "Edit Note" : "Add Note"}</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Type</label>
                                            <select className={styles.formSelect} value={noteForm.note_type}
                                                onChange={e => setNoteForm(f => ({ ...f, note_type: e.target.value }))}>
                                                {NOTE_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Date</label>
                                            <input type="date" className={styles.formInput} value={noteForm.note_date}
                                                onChange={e => setNoteForm(f => ({ ...f, note_date: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Note *</label>
                                        <textarea className={styles.formInput} rows={5} value={noteForm.note_text}
                                            onChange={e => setNoteForm(f => ({ ...f, note_text: e.target.value }))}
                                            placeholder="Enter note details…" autoFocus />
                                    </div>
                                    {noteErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{noteErr}</div>}
                                    <div className={styles.modalActions}>
                                        <button className={styles.btnGhost} onClick={() => setShowNoteModal(false)} disabled={noteSaving}>Cancel</button>
                                        <button className={styles.btnPrimary} onClick={saveNote} disabled={noteSaving}>{noteSaving ? "Saving…" : editNote ? "Save Changes" : "Add Note"}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── Document Requests tab ── Task #140 */}
                {detailTab === "docreqs" && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                                {docRequests.length} request{docRequests.length !== 1 ? "s" : ""} &nbsp;·&nbsp;
                                {docRequests.filter(r => r.status === "Received").length} received
                            </span>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => openDocReqModal()}>+ Add Request</button>
                        </div>

                        {docReqLoading ? (
                            <div className={styles.emptyHint}>Loading…</div>
                        ) : docRequests.length === 0 ? (
                            <div className={styles.emptyHint}>No document requests yet. Track what you've asked from the client.</div>
                        ) : (
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr>
                                        <th>Document</th><th>Requested</th><th>Due</th><th>Status</th><th>Received</th><th>Notes</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {docRequests.map(r => (
                                            <tr key={r.request_id}>
                                                <td><strong>{r.doc_name}</strong></td>
                                                <td className={styles.muted}>{r.requested_date}</td>
                                                <td className={styles.muted}>{r.due_date ?? "—"}</td>
                                                <td>
                                                    <span className={
                                                        r.status === "Received" ? styles.badgeGreen :
                                                        r.status === "Overdue"  ? styles.limBadgeCritical :
                                                        r.status === "Waived"   ? styles.badgeGray : styles.badgeAmber
                                                    } style={{ fontSize: "0.7rem" }}>{r.status}</span>
                                                </td>
                                                <td className={styles.muted}>{r.received_date ?? "—"}</td>
                                                <td className={styles.muted} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes ?? "—"}</td>
                                                <td style={{ display: "flex", gap: "0.35rem" }}>
                                                    {r.status === "Pending" && (
                                                        <button className={styles.actionBtn} style={{ fontSize: "0.72rem" }} onClick={() => markDocReqReceived(r)}>✓ Received</button>
                                                    )}
                                                    <button className={styles.actionBtn} onClick={() => openDocReqModal(r)}>Edit</button>
                                                    <button className={styles.actionBtnDanger} onClick={() => deleteDocReqUI(r.request_id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Doc request modal */}
                        {showDocReqModal && (
                            <div className={styles.overlay} onClick={() => setShowDocReqModal(false)}>
                                <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                    <div className={styles.modalTitle}>{editDocReq ? "Edit Document Request" : "Add Document Request"}</div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Document Name *</label>
                                        <input className={styles.formInput} value={docReqForm.doc_name}
                                            onChange={e => setDocReqForm(f => ({ ...f, doc_name: e.target.value }))}
                                            placeholder="e.g. CNIC copy, Property title deed, Prior judgments" autoFocus />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Requested Date</label>
                                            <input type="date" className={styles.formInput} value={docReqForm.requested_date}
                                                onChange={e => setDocReqForm(f => ({ ...f, requested_date: e.target.value }))} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Due Date</label>
                                            <input type="date" className={styles.formInput} value={docReqForm.due_date}
                                                onChange={e => setDocReqForm(f => ({ ...f, due_date: e.target.value }))} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Status</label>
                                            <select className={styles.formSelect} value={docReqForm.status}
                                                onChange={e => setDocReqForm(f => ({ ...f, status: e.target.value }))}>
                                                {DOC_REQUEST_STATUSES_UI.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Received Date</label>
                                            <input type="date" className={styles.formInput} value={docReqForm.received_date}
                                                onChange={e => setDocReqForm(f => ({ ...f, received_date: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Notes</label>
                                        <input className={styles.formInput} value={docReqForm.notes}
                                            onChange={e => setDocReqForm(f => ({ ...f, notes: e.target.value }))}
                                            placeholder="Optional — e.g. remind client on Monday" />
                                    </div>
                                    {docReqErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{docReqErr}</div>}
                                    <div className={styles.modalActions}>
                                        <button className={styles.btnGhost} onClick={() => setShowDocReqModal(false)} disabled={docReqSaving}>Cancel</button>
                                        <button className={styles.btnPrimary} onClick={saveDocReq} disabled={docReqSaving}>{docReqSaving ? "Saving…" : editDocReq ? "Save Changes" : "Add Request"}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── Witnesses tab ── Task #141 */}
                {detailTab === "witnesses" && (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                                {witnesses.length} witness{witnesses.length !== 1 ? "es" : ""}
                            </span>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => openWitnessModal()}>+ Add Witness</button>
                        </div>

                        {witnessLoading ? (
                            <div className={styles.emptyHint}>Loading…</div>
                        ) : witnesses.length === 0 ? (
                            <div className={styles.emptyHint}>No witnesses recorded. Add prosecution, defence, and expert witnesses.</div>
                        ) : (
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr>
                                        <th>Name</th><th>Type</th><th>Contact</th><th>Statement</th><th>Notes</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {witnesses.map(w => (
                                            <tr key={w.witness_id}>
                                                <td><strong>{w.witness_name}</strong></td>
                                                <td>
                                                    <span className={styles.witnessTypeBadge} data-wtype={w.witness_type}>
                                                        {w.witness_type}
                                                    </span>
                                                </td>
                                                <td className={styles.muted}>{w.contact_number ?? "—"}</td>
                                                <td>
                                                    <span className={
                                                        w.statement_status === "Filed"           ? styles.badgeGreen  :
                                                        w.statement_status === "Cross-Examined"  ? styles.badgeBlue   :
                                                        w.statement_status === "Taken"           ? styles.badgeAmber  : styles.badgeGray
                                                    } style={{ fontSize: "0.7rem" }}>{w.statement_status}</span>
                                                </td>
                                                <td className={styles.muted} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.notes ?? "—"}</td>
                                                <td style={{ display: "flex", gap: "0.35rem" }}>
                                                    <button className={styles.actionBtn} onClick={() => openWitnessModal(w)}>Edit</button>
                                                    <button className={styles.actionBtnDanger} onClick={() => deleteWitnessUI(w.witness_id)}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Witness add/edit modal */}
                        {showWitnessModal && (
                            <div className={styles.overlay} onClick={() => setShowWitnessModal(false)}>
                                <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                    <div className={styles.modalTitle}>{editWitness ? "Edit Witness" : "Add Witness"}</div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Full Name *</label>
                                        <input className={styles.formInput} value={witnessForm.witness_name}
                                            onChange={e => setWitnessForm(f => ({ ...f, witness_name: e.target.value }))}
                                            placeholder="e.g. Muhammad Ali Shah" autoFocus />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Witness Type</label>
                                            <select className={styles.formSelect} value={witnessForm.witness_type}
                                                onChange={e => setWitnessForm(f => ({ ...f, witness_type: e.target.value }))}>
                                                {WITNESS_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Statement Status</label>
                                            <select className={styles.formSelect} value={witnessForm.statement_status}
                                                onChange={e => setWitnessForm(f => ({ ...f, statement_status: e.target.value }))}>
                                                {STATEMENT_STATUSES_UI.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Contact Number</label>
                                            <input className={styles.formInput} value={witnessForm.contact_number}
                                                onChange={e => setWitnessForm(f => ({ ...f, contact_number: e.target.value }))}
                                                placeholder="e.g. 0300-1234567" />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Address</label>
                                            <input className={styles.formInput} value={witnessForm.address}
                                                onChange={e => setWitnessForm(f => ({ ...f, address: e.target.value }))}
                                                placeholder="City / area" />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Notes</label>
                                        <input className={styles.formInput} value={witnessForm.notes}
                                            onChange={e => setWitnessForm(f => ({ ...f, notes: e.target.value }))}
                                            placeholder="Reliability, relationship to case, etc." />
                                    </div>
                                    {witnessErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{witnessErr}</div>}
                                    <div className={styles.modalActions}>
                                        <button className={styles.btnGhost} onClick={() => setShowWitnessModal(false)} disabled={witnessSaving}>Cancel</button>
                                        <button className={styles.btnPrimary} onClick={saveWitness} disabled={witnessSaving}>{witnessSaving ? "Saving…" : editWitness ? "Save Changes" : "Add Witness"}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── Deadlines tab ── */}
                {detailTab === "deadlines" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                            {matterDeadlines.filter(d => !d.completed).length} open · {matterDeadlines.filter(d => d.completed).length} done
                        </span>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openDeadlineModal()}>+ Add Deadline</button>
                    </div>
                    {deadlinesLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : matterDeadlines.length === 0 ? (
                        <div className={styles.emptyHint}>No deadlines yet. Add internal tasks and due dates to stay on track.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th style={{ width: 32 }}></th>
                                <th>Title</th>
                                <th>Due Date</th>
                                <th>Priority</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {matterDeadlines.map(dl => {
                                    const isOverdue = !dl.completed && dl.due_date < new Date().toISOString().slice(0, 10);
                                    const priorityColour = dl.priority === "High" ? "var(--red, #dc2626)" : dl.priority === "Medium" ? "var(--amber, #d97706)" : "var(--text-2)";
                                    return (
                                        <tr key={dl.deadline_id} style={{ opacity: dl.completed ? 0.5 : 1 }}>
                                            <td>
                                                <input type="checkbox" checked={dl.completed === 1} onChange={() => toggleDeadlineComplete(dl)} title={dl.completed ? "Mark incomplete" : "Mark complete"} />
                                            </td>
                                            <td style={{ textDecoration: dl.completed ? "line-through" : "none", color: isOverdue ? "var(--red, #dc2626)" : undefined }}>
                                                {dl.title}
                                                {isOverdue && <span style={{ fontSize: "0.7rem", marginLeft: 6, fontWeight: 600, color: "var(--red, #dc2626)" }}>OVERDUE</span>}
                                            </td>
                                            <td style={{ whiteSpace: "nowrap", color: isOverdue && !dl.completed ? "var(--red, #dc2626)" : undefined }}>{dl.due_date}</td>
                                            <td><span style={{ fontSize: "0.75rem", fontWeight: 600, color: priorityColour }}>{dl.priority}</span></td>
                                            <td style={{ display: "flex", gap: 4 }}>
                                                <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openDeadlineModal(dl)}>Edit</button>
                                                <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteDeadlineUI(dl.deadline_id)}>Del</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>)}

                {/* ── Expenses tab ── */}
                {detailTab === "expenses" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                            {matterExpenses.length} expense{matterExpenses.length !== 1 ? "s" : ""} · Total: PKR {matterExpenses.reduce((s, e) => s + e.amount_pkr, 0).toLocaleString()}
                            {matterExpenses.some(e => e.billable) && (
                                <> · Billable: PKR {matterExpenses.filter(e => e.billable).reduce((s, e) => s + e.amount_pkr, 0).toLocaleString()}</>
                            )}
                        </span>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openExpenseModal()}>+ Add Expense</button>
                    </div>
                    {expensesLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : matterExpenses.length === 0 ? (
                        <div className={styles.emptyHint}>No expenses recorded yet. Track disbursements like court fees, filing charges, and travel costs here.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Category</th>
                                <th style={{ textAlign: "right" }}>Amount (PKR)</th>
                                <th>Billable</th>
                                <th>Receipt</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {matterExpenses.map(exp => (
                                    <tr key={exp.expense_id}>
                                        <td style={{ whiteSpace: "nowrap" }}>{exp.expense_date}</td>
                                        <td>{exp.description}</td>
                                        <td><span style={{ fontSize: "0.75rem", background: "var(--bg-2)", padding: "2px 6px", borderRadius: "var(--radius)" }}>{exp.category}</span></td>
                                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{exp.amount_pkr.toLocaleString()}</td>
                                        <td style={{ textAlign: "center" }}>{exp.billable ? "✓" : "—"}</td>
                                        <td style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{exp.receipt_ref || "—"}</td>
                                        <td style={{ display: "flex", gap: 4 }}>
                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openExpenseModal(exp)}>Edit</button>
                                            <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteExpenseUI(exp.expense_id)}>Del</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} style={{ fontWeight: 600, fontSize: "0.85rem" }}>Total</td>
                                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                                        {matterExpenses.reduce((s, e) => s + e.amount_pkr, 0).toLocaleString()}
                                    </td>
                                    <td colSpan={3}></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </>)}

                {/* ── Correspondence tab ── */}
                {detailTab === "correspondence" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                            {correspondence.filter(c => c.direction === "Sent").length} sent · {correspondence.filter(c => c.direction === "Received").length} received
                        </span>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openCorrModal()}>+ Add Entry</button>
                    </div>
                    {corrLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : correspondence.length === 0 ? (
                        <div className={styles.emptyHint}>No correspondence recorded yet. Log letters, emails, and notices sent or received.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Date</th>
                                <th>Dir.</th>
                                <th>Type</th>
                                <th>Subject</th>
                                <th>Party</th>
                                <th>Ref #</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {correspondence.map(c => (
                                    <tr key={c.corr_id}>
                                        <td style={{ whiteSpace: "nowrap" }}>{c.corr_date}</td>
                                        <td>
                                            <span style={{
                                                fontSize: "0.72rem", fontWeight: 700, padding: "2px 6px", borderRadius: "var(--radius)",
                                                background: c.direction === "Sent" ? "rgba(var(--gold-rgb,212,160,23),0.15)" : "rgba(59,130,246,0.12)",
                                                color: c.direction === "Sent" ? "var(--gold)" : "#3b82f6",
                                            }}>{c.direction}</span>
                                        </td>
                                        <td style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{c.corr_type}</td>
                                        <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.subject}>{c.subject}</td>
                                        <td style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>{c.party || "—"}</td>
                                        <td style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{c.reference_no || "—"}</td>
                                        <td style={{ display: "flex", gap: 4 }}>
                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openCorrModal(c)}>Edit</button>
                                            <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteCorrUI(c.corr_id)}>Del</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>)}

                {/* ── Relief tab ── */}
                {detailTab === "relief" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                            {matterRelief.filter(r => r.status === "Granted").length} granted · {matterRelief.filter(r => r.status === "Pending").length} pending · {matterRelief.filter(r => r.status === "Rejected").length} rejected
                        </span>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openReliefModal()}>+ Add Application</button>
                    </div>
                    {reliefLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : matterRelief.length === 0 ? (
                        <div className={styles.emptyHint}>No bail or interim relief applications recorded. Add bail, stay orders, injunctions, and other interim orders here.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Court / Judge</th>
                                <th>Status</th>
                                <th>Surety (PKR)</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {matterRelief.map(r => {
                                    const statusColour = r.status === "Granted" ? "#16a34a" : r.status === "Rejected" || r.status === "Recalled" ? "#dc2626" : r.status === "Pending" ? "var(--gold)" : "var(--text-2)";
                                    return (
                                        <tr key={r.relief_id}>
                                            <td style={{ whiteSpace: "nowrap" }}>{r.application_date}</td>
                                            <td style={{ fontSize: "0.82rem" }}>{r.relief_type}</td>
                                            <td style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
                                                {r.court || "—"}{r.judge ? ` / ${r.judge}` : ""}
                                            </td>
                                            <td>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: statusColour }}>{r.status}</span>
                                            </td>
                                            <td style={{ fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>
                                                {r.surety_amount_pkr !== null ? r.surety_amount_pkr.toLocaleString() : "—"}
                                                {r.surety_name ? <span style={{ color: "var(--text-2)", fontSize: "0.75rem" }}> ({r.surety_name})</span> : null}
                                            </td>
                                            <td style={{ display: "flex", gap: 4 }}>
                                                <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openReliefModal(r)}>Edit</button>
                                                <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteReliefUI(r.relief_id)}>Del</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>)}

                {/* ── Court Fees tab ── */}
                {detailTab === "courtfees" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <div>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                                Total paid: <strong>PKR {courtFeeList.reduce((s, r) => s + r.actual_paid, 0).toLocaleString()}</strong>
                                {" · "}Calculated: <strong>PKR {courtFeeList.reduce((s, r) => s + r.calculated_fee, 0).toLocaleString()}</strong>
                            </span>
                        </div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openCFModal()}>+ Add Payment</button>
                    </div>
                    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.6rem 0.9rem", marginBottom: "0.75rem", fontSize: "0.78rem", color: "var(--text-2)" }}>
                        ℹ Punjab Court Fees Act slab calculator (ad valorem). Rates are approximate — verify current gazette for exact amounts.
                    </div>
                    {courtFeeLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : courtFeeList.length === 0 ? (
                        <div className={styles.emptyHint}>No court fee records yet. Use this tab to track court fee calculations, challan numbers, and payments for this matter.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Date</th>
                                <th>Claim (PKR)</th>
                                <th>Type</th>
                                <th>Calculated</th>
                                <th>Paid</th>
                                <th>Challan No.</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {courtFeeList.map(r => (
                                    <tr key={r.fee_payment_id}>
                                        <td style={{ fontSize: "0.82rem" }}>{r.payment_date || "—"}</td>
                                        <td style={{ fontSize: "0.82rem" }}>PKR {r.claim_amount_pkr.toLocaleString()}</td>
                                        <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{r.fee_type}</td>
                                        <td style={{ fontSize: "0.82rem", fontWeight: 600 }}>PKR {r.calculated_fee.toLocaleString()}</td>
                                        <td style={{ fontSize: "0.82rem", color: r.actual_paid >= r.calculated_fee ? "#16a34a" : "#dc2626", fontWeight: 600 }}>PKR {r.actual_paid.toLocaleString()}</td>
                                        <td style={{ fontSize: "0.78rem", fontFamily: "monospace" }}>{r.challan_no || "—"}</td>
                                        <td style={{ display: "flex", gap: 4 }}>
                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openCFModal(r)}>Edit</button>
                                            <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteCFUI(r.fee_payment_id)}>Del</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>)}

                {/* ── Court Fee modal ── */}
                {showCFModal && (
                    <div className={styles.overlay} onClick={() => setShowCFModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className={styles.modalTitle}>{editCF ? "Edit Court Fee" : "Add Court Fee Payment"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Claim Amount (PKR)</label>
                                    <input type="number" className={styles.formInput} min={0} value={cfForm.claim_amount_pkr}
                                        onChange={e => { const v = parseFloat(e.target.value) || 0; setCfForm(f => ({ ...f, claim_amount_pkr: v })); previewCourtFee(v, cfForm.fee_type); }} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Fee Type</label>
                                    <select className={styles.formInput} value={cfForm.fee_type} onChange={e => { setCfForm(f => ({ ...f, fee_type: e.target.value })); previewCourtFee(cfForm.claim_amount_pkr, e.target.value); }}>
                                        {COURT_FEE_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            {cfCalcPreview !== null && (
                                <div style={{ background: "var(--bg-1)", border: "1px solid var(--gold)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                                    📐 Calculated court fee: <strong>PKR {cfCalcPreview.toLocaleString()}</strong>
                                </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Calculated Fee (PKR)</label>
                                    <input type="number" className={styles.formInput} min={0} value={cfForm.calculated_fee} onChange={e => setCfForm(f => ({ ...f, calculated_fee: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Actual Paid (PKR)</label>
                                    <input type="number" className={styles.formInput} min={0} value={cfForm.actual_paid} onChange={e => setCfForm(f => ({ ...f, actual_paid: parseFloat(e.target.value) || 0 }))} />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Payment Date</label>
                                    <input type="date" className={styles.formInput} value={cfForm.payment_date} onChange={e => setCfForm(f => ({ ...f, payment_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Challan No.</label>
                                    <input className={styles.formInput} value={cfForm.challan_no} onChange={e => setCfForm(f => ({ ...f, challan_no: e.target.value }))} placeholder="Treasury challan number" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Court</label>
                                <input className={styles.formInput} value={cfForm.court} onChange={e => setCfForm(f => ({ ...f, court: e.target.value }))} placeholder="Optional" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={cfForm.notes} onChange={e => setCfForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                            </div>
                            {cfErr && <div className={styles.formError}>{cfErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowCFModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveCF} disabled={cfSaving}>{cfSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Associate Fees tab — Task #153 ── */}
                {detailTab === "assocfees" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <div>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Associate / Wakeel appearance fees for this matter</span>
                            {assocFeeList.length > 0 && (
                                <span style={{ marginLeft: "0.75rem", fontSize: "0.82rem" }}>
                                    Total: <strong>PKR {assocFeeList.reduce((s, r) => s + r.amount_pkr, 0).toLocaleString()}</strong>
                                    {" · "}Paid: <strong style={{ color: "#16a34a" }}>PKR {assocFeeList.filter(r => r.paid).reduce((s, r) => s + r.amount_pkr, 0).toLocaleString()}</strong>
                                    {" · "}Unpaid: <strong style={{ color: "#dc2626" }}>PKR {assocFeeList.filter(r => !r.paid).reduce((s, r) => s + r.amount_pkr, 0).toLocaleString()}</strong>
                                </span>
                            )}
                        </div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openAFModal()}>+ Add Fee</button>
                    </div>
                    {assocFeeLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : assocFeeList.length === 0 ? (
                        <div className={styles.emptyHint}>No associate fee records yet. Track fees paid to junior advocates, wakeels, or associates who appeared on behalf of the firm.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Advocate</th>
                                <th>Bar No.</th>
                                <th>Appearance Date</th>
                                <th>Amount (PKR)</th>
                                <th>Status</th>
                                <th>Payment Date</th>
                                <th style={{ width: 90 }}></th>
                            </tr></thead>
                            <tbody>
                                {assocFeeList.map(r => (
                                    <tr key={r.assoc_fee_id} style={{ background: r.paid ? "transparent" : "rgba(220,38,38,0.04)" }}>
                                        <td><strong>{r.advocate_name}</strong></td>
                                        <td className={styles.muted}>{r.bar_no || "—"}</td>
                                        <td>{r.appearance_date || "—"}</td>
                                        <td>PKR {r.amount_pkr.toLocaleString()}</td>
                                        <td>
                                            <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: r.paid ? "#dcfce7" : "#fee2e2", color: r.paid ? "#16a34a" : "#dc2626" }}>
                                                {r.paid ? "Paid" : "Unpaid"}
                                            </span>
                                        </td>
                                        <td className={styles.muted}>{r.payment_date || "—"}</td>
                                        <td style={{ display: "flex", gap: "0.25rem" }}>
                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openAFModal(r)}>Edit</button>
                                            <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteAssocFeeUI(r.assoc_fee_id)}>Del</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>)}

                {showAFModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} style={{ maxWidth: 480 }}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>{editAF ? "Edit Associate Fee" : "Add Associate Fee"}</h3>
                                <button className={styles.modalClose} onClick={() => setShowAFModal(false)}>✕</button>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Advocate Name *</label>
                                <input className={styles.formInput} value={afForm.advocate_name} onChange={e => setAfForm(f => ({ ...f, advocate_name: e.target.value }))} placeholder="Full name" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Bar Registration No.</label>
                                <input className={styles.formInput} value={afForm.bar_no} onChange={e => setAfForm(f => ({ ...f, bar_no: e.target.value }))} placeholder="Optional" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Appearance Date</label>
                                <input type="date" className={styles.formInput} value={afForm.appearance_date} onChange={e => setAfForm(f => ({ ...f, appearance_date: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Amount (PKR) *</label>
                                <input type="number" className={styles.formInput} min={0} value={afForm.amount_pkr} onChange={e => setAfForm(f => ({ ...f, amount_pkr: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                    <input type="checkbox" checked={!!afForm.paid} onChange={e => setAfForm(f => ({ ...f, paid: e.target.checked ? 1 : 0 }))} />
                                    Mark as Paid
                                </label>
                            </div>
                            {afForm.paid ? (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Payment Date</label>
                                    <input type="date" className={styles.formInput} value={afForm.payment_date} onChange={e => setAfForm(f => ({ ...f, payment_date: e.target.value }))} />
                                </div>
                            ) : null}
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={afForm.notes} onChange={e => setAfForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                            </div>
                            {afErr && <div className={styles.formError}>{afErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowAFModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveAssocFee} disabled={afSaving}>{afSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Cheques tab — Task #155 ── */}
                {detailTab === "cheques" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <div>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Post-dated & undated cheques held or presented for this matter</span>
                            {chequeList.length > 0 && (
                                <span style={{ marginLeft: "0.75rem", fontSize: "0.82rem" }}>
                                    Total: <strong>PKR {chequeList.reduce((s, c) => s + c.amount_pkr, 0).toLocaleString()}</strong>
                                </span>
                            )}
                        </div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openCHQModal()}>+ Add Cheque</button>
                    </div>
                    {chequeLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : chequeList.length === 0 ? (
                        <div className={styles.emptyHint}>No cheque records yet. Track post-dated, undated, or bearer cheques received from clients as security or payment.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Cheque No.</th>
                                <th>Bank</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th style={{ width: 90 }}></th>
                            </tr></thead>
                            <tbody>
                                {chequeList.map(c => {
                                    const statusColor = c.status === "Cleared" ? "#16a34a" : c.status === "Bounced" ? "#dc2626" : c.status === "Presented" ? "#2563eb" : c.status === "Returned" || c.status === "Cancelled" ? "#9ca3af" : "var(--text-2)";
                                    return (
                                        <tr key={c.cheque_id}>
                                            <td><strong>{c.cheque_no}</strong></td>
                                            <td className={styles.muted}>{c.bank_name || "—"}{c.account_title ? ` / ${c.account_title}` : ""}</td>
                                            <td>PKR {c.amount_pkr.toLocaleString()}</td>
                                            <td className={styles.muted}>{c.cheque_date || "Undated"}</td>
                                            <td><span style={{ fontSize: "0.78rem" }}>{c.cheque_type}</span></td>
                                            <td><span style={{ fontWeight: 600, fontSize: "0.8rem", color: statusColor }}>{c.status}</span></td>
                                            <td style={{ display: "flex", gap: "0.25rem" }}>
                                                <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openCHQModal(c)}>Edit</button>
                                                <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteCHQUI(c.cheque_id)}>Del</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>)}

                {showCHQModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} style={{ maxWidth: 500 }}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>{editCHQ ? "Edit Cheque" : "Add Cheque"}</h3>
                                <button className={styles.modalClose} onClick={() => setShowCHQModal(false)}>✕</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Cheque No. *</label>
                                    <input className={styles.formInput} value={chqForm.cheque_no} onChange={e => setChqForm(f => ({ ...f, cheque_no: e.target.value }))} placeholder="e.g. 000123" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Amount (PKR)</label>
                                    <input type="number" className={styles.formInput} min={0} value={chqForm.amount_pkr} onChange={e => setChqForm(f => ({ ...f, amount_pkr: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Bank Name</label>
                                    <input className={styles.formInput} value={chqForm.bank_name} onChange={e => setChqForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. HBL" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Account Title</label>
                                    <input className={styles.formInput} value={chqForm.account_title} onChange={e => setChqForm(f => ({ ...f, account_title: e.target.value }))} placeholder="Optional" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Cheque Date</label>
                                    <input type="date" className={styles.formInput} value={chqForm.cheque_date} onChange={e => setChqForm(f => ({ ...f, cheque_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formInput} value={chqForm.cheque_type} onChange={e => setChqForm(f => ({ ...f, cheque_type: e.target.value }))}>
                                        {["Post-Dated", "Undated", "Bearer", "Crossed"].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Status</label>
                                    <select className={styles.formInput} value={chqForm.status} onChange={e => setChqForm(f => ({ ...f, status: e.target.value }))}>
                                        {["Held", "Presented", "Cleared", "Bounced", "Returned", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Received Date</label>
                                    <input type="date" className={styles.formInput} value={chqForm.received_date} onChange={e => setChqForm(f => ({ ...f, received_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                                    <label className={styles.formLabel}>Notes</label>
                                    <textarea className={styles.formInput} rows={2} value={chqForm.notes} onChange={e => setChqForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                                </div>
                            </div>
                            {chqErr && <div className={styles.formError}>{chqErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowCHQModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveCHQ} disabled={chqSaving}>{chqSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Challan tab ── */}
                {detailTab === "challan" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Charge sheet / challan submissions</span>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openChallanModal()}>+ Add Challan</button>
                    </div>
                    {challanLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : matterChallanList.length === 0 ? (
                        <div className={styles.emptyHint}>No challan records yet. Track when police submits the charge sheet, whether it was submitted in time, and how many witnesses were included.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>In Time</th>
                                <th>Witnesses</th>
                                <th>Court</th>
                                <th>Status</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {matterChallanList.map(c => {
                                    const statusColour = c.status === "Accepted" ? "#16a34a" : c.status === "Returned" ? "#dc2626" : c.status === "Submitted" ? "#2563eb" : "var(--text-2)";
                                    return (
                                        <tr key={c.challan_id}>
                                            <td style={{ fontSize: "0.82rem" }}>{c.challan_date || "—"}</td>
                                            <td style={{ fontSize: "0.82rem" }}>{c.challan_type}</td>
                                            <td style={{ textAlign: "center" }}>
                                                {c.submitted_in_time
                                                    ? <span style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.8rem" }}>✓ Yes</span>
                                                    : <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.8rem" }}>✗ No</span>}
                                            </td>
                                            <td style={{ textAlign: "center", fontSize: "0.82rem" }}>{c.witnesses_count}</td>
                                            <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{c.challan_court || "—"}</td>
                                            <td><span style={{ fontSize: "0.75rem", fontWeight: 700, color: statusColour }}>{c.status}</span></td>
                                            <td style={{ display: "flex", gap: 4 }}>
                                                <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openChallanModal(c)}>Edit</button>
                                                <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteChallanUI(c.challan_id)}>Del</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>)}

                {/* ── Challan modal ── */}
                {showChallanModal && (
                    <div className={styles.overlay} onClick={() => setShowChallanModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                            <div className={styles.modalTitle}>{editChallan ? "Edit Challan" : "Add Challan"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Challan Date</label>
                                    <input type="date" className={styles.formInput} value={challanForm.challan_date} onChange={e => setChallanForm(f => ({ ...f, challan_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formInput} value={challanForm.challan_type} onChange={e => setChallanForm(f => ({ ...f, challan_type: e.target.value }))}>
                                        {CHALLAN_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "0.75rem", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <input type="checkbox" id="ch-in-time" checked={challanForm.submitted_in_time} onChange={e => setChallanForm(f => ({ ...f, submitted_in_time: e.target.checked }))} />
                                    <label htmlFor="ch-in-time" style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>Submitted in Time</label>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Witnesses</label>
                                    <input type="number" className={styles.formInput} min={0} value={challanForm.witnesses_count} onChange={e => setChallanForm(f => ({ ...f, witnesses_count: parseInt(e.target.value) || 0 }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Status</label>
                                    <select className={styles.formInput} value={challanForm.status} onChange={e => setChallanForm(f => ({ ...f, status: e.target.value }))}>
                                        {CHALLAN_STATUSES_UI.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Court</label>
                                <input className={styles.formInput} value={challanForm.challan_court} onChange={e => setChallanForm(f => ({ ...f, challan_court: e.target.value }))} placeholder="Optional" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={challanForm.notes} onChange={e => setChallanForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                            </div>
                            {challanErr && <div className={styles.formError}>{challanErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowChallanModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveChallan} disabled={challanSaving}>{challanSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── FIR tab ── */}
                {detailTab === "fir" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>First Information Reports &amp; police station records</span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <label className={styles.btnSecondary} style={{ fontSize: "0.8rem", cursor: "pointer" }}>
                                📷 Scan FIR (beta)
                                <input type="file" accept="image/*,.pdf" style={{ display: "none" }}
                                    onChange={e => { const file = e.target.files?.[0]; if (file) { openFirModal(); scanFirFile(file); } e.target.value = ""; }} />
                            </label>
                            <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openFirModal()}>+ Add FIR</button>
                        </div>
                    </div>
                    {firLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : matterFirList.length === 0 ? (
                        <div className={styles.emptyHint}>No FIR records yet. Add FIR details for criminal matters — police station, IO, complainant, and arrest date.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {matterFirList.map(f => (
                                <div key={f.fir_id} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.9rem 1rem" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>FIR No. {f.fir_number}</span>
                                            <span style={{ color: "var(--text-2)", fontSize: "0.82rem", marginLeft: "0.75rem" }}>P/S {f.police_station}{f.district ? `, ${f.district}` : ""}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openFirModal(f)}>Edit</button>
                                            <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteFirUI(f.fir_id)}>Del</button>
                                        </div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.4rem 1rem", marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--text-2)" }}>
                                        {f.fir_date && <span><strong>Date:</strong> {f.fir_date}</span>}
                                        {f.arrest_date && <span><strong>Arrest:</strong> {f.arrest_date}</span>}
                                        {f.io_name && <span><strong>IO:</strong> {f.io_name}</span>}
                                        {f.complainant && <span><strong>Complainant:</strong> {f.complainant}</span>}
                                        {f.sections_at_fir && <span><strong>Sections (FIR):</strong> {f.sections_at_fir}</span>}
                                        {f.sections_after_challan && <span><strong>Sections (Challan):</strong> {f.sections_after_challan}</span>}
                                    </div>
                                    {f.notes && <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-3)", fontStyle: "italic" }}>{f.notes}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </>)}

                {/* ── FIR modal ── */}
                {showFirModal && (
                    <div className={styles.overlay} onClick={() => setShowFirModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                            <div className={styles.modalTitle}>{editFir ? "Edit FIR Record" : "Add FIR Record"}</div>
                            {firScanning && <div className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "0.6rem" }}>🔍 Reading document…</div>}
                            {firScanErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.82rem", marginBottom: "0.6rem" }}>{firScanErr}</div>}
                            {firScanRawText && !firScanning && (
                                <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginBottom: "0.75rem" }}>
                                    ✓ Fields below were AI-extracted from the scanned document — please verify each one before saving.
                                </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>FIR Number *</label>
                                    <input className={styles.formInput} value={firForm.fir_number} onChange={e => setFirForm(f => ({ ...f, fir_number: e.target.value }))} placeholder="e.g. 123/2024" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>FIR Date</label>
                                    <input type="date" className={styles.formInput} value={firForm.fir_date} onChange={e => setFirForm(f => ({ ...f, fir_date: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Police Station *</label>
                                    <input className={styles.formInput} value={firForm.police_station} onChange={e => setFirForm(f => ({ ...f, police_station: e.target.value }))} placeholder="e.g. Gulberg" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>District</label>
                                    <input className={styles.formInput} value={firForm.district} onChange={e => setFirForm(f => ({ ...f, district: e.target.value }))} placeholder="e.g. Lahore" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Investigating Officer</label>
                                    <input className={styles.formInput} value={firForm.io_name} onChange={e => setFirForm(f => ({ ...f, io_name: e.target.value }))} placeholder="IO Name / Rank" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Arrest Date</label>
                                    <input type="date" className={styles.formInput} value={firForm.arrest_date} onChange={e => setFirForm(f => ({ ...f, arrest_date: e.target.value }))} />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Complainant</label>
                                <input className={styles.formInput} value={firForm.complainant} onChange={e => setFirForm(f => ({ ...f, complainant: e.target.value }))} placeholder="Name of complainant" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sections at time of FIR</label>
                                <input className={styles.formInput} value={firForm.sections_at_fir} onChange={e => setFirForm(f => ({ ...f, sections_at_fir: e.target.value }))} placeholder="e.g. 302, 324 PPC" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sections after Challan</label>
                                <input className={styles.formInput} value={firForm.sections_after_challan} onChange={e => setFirForm(f => ({ ...f, sections_after_challan: e.target.value }))} placeholder="e.g. 302, 109 PPC (if changed)" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={firForm.notes} onChange={e => setFirForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                            </div>
                            {firErr && <div className={styles.formError}>{firErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowFirModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveFir} disabled={firSaving}>{firSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Charges tab ── */}
                {detailTab === "charges" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                            {matterCharges.length} section{matterCharges.length !== 1 ? "s" : ""} · {matterCharges.filter(c => c.charge_framed).length} framed
                        </span>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openChargeModal()}>+ Add Section</button>
                    </div>
                    {chargesLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : matterCharges.length === 0 ? (
                        <div className={styles.emptyHint}>No charges or sections added yet. Use this tab for criminal matters to track PPC, CNS, PECA, NAB, and other statutory sections.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Section</th>
                                <th>Description</th>
                                <th>Plea</th>
                                <th>Framed</th>
                                <th>Court</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {matterCharges.map(ch => {
                                    const pleaColour = ch.plea === "Guilty" ? "#dc2626" : ch.plea === "Not Guilty" ? "#16a34a" : ch.plea === "Absconder" ? "#7c3aed" : "var(--text-2)";
                                    return (
                                        <tr key={ch.charge_id}>
                                            <td><strong style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{ch.section_no}</strong></td>
                                            <td style={{ fontSize: "0.82rem", color: "var(--text-2)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.description || "—"}</td>
                                            <td><span style={{ fontSize: "0.75rem", fontWeight: 700, color: pleaColour }}>{ch.plea}</span></td>
                                            <td style={{ textAlign: "center" }}>
                                                {ch.charge_framed
                                                    ? <span style={{ color: "#16a34a", fontSize: "0.8rem" }}>✓ {ch.charge_framed_date || ""}</span>
                                                    : <span style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>—</span>}
                                            </td>
                                            <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{ch.court || "—"}</td>
                                            <td style={{ display: "flex", gap: 4 }}>
                                                <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openChargeModal(ch)}>Edit</button>
                                                <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteChargeUI(ch.charge_id)}>Del</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>)}

                {/* ── Charge add/edit modal ── */}
                {showChargeModal && (
                    <div className={styles.overlay} onClick={() => setShowChargeModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className={styles.modalTitle}>{editCharge ? "Edit Charge" : "Add Charge / Section"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Section / Offence *</label>
                                    <input className={styles.formInput} value={chargeForm.section_no} onChange={e => setChargeForm(f => ({ ...f, section_no: e.target.value }))} placeholder="e.g. 302 PPC, 9(c) CNS" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Plea</label>
                                    <select className={styles.formInput} value={chargeForm.plea} onChange={e => setChargeForm(f => ({ ...f, plea: e.target.value }))}>
                                        {PLEA_OPTIONS_UI.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description</label>
                                <input className={styles.formInput} value={chargeForm.description} onChange={e => setChargeForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Murder, Hurt, Possession of narcotics…" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem", alignItems: "end" }}>
                                <div className={styles.formGroup} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 0 }}>
                                    <input type="checkbox" id="charge-framed" checked={chargeForm.charge_framed} onChange={e => setChargeForm(f => ({ ...f, charge_framed: e.target.checked }))} />
                                    <label htmlFor="charge-framed" style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>Charge Framed</label>
                                </div>
                                {chargeForm.charge_framed && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Date Framed</label>
                                        <input type="date" className={styles.formInput} value={chargeForm.charge_framed_date} onChange={e => setChargeForm(f => ({ ...f, charge_framed_date: e.target.value }))} />
                                    </div>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Court</label>
                                <input className={styles.formInput} value={chargeForm.court} onChange={e => setChargeForm(f => ({ ...f, court: e.target.value }))} placeholder="Optional" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={chargeForm.notes} onChange={e => setChargeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                            </div>
                            {chargeErr && <div className={styles.formError}>{chargeErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowChargeModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveCharge} disabled={chargeSaving}>{chargeSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Outcome tab ── */}
                {detailTab === "outcome" && (
                    <div style={{ maxWidth: 560, marginTop: "0.75rem" }}>
                        {outcomeLoading ? (
                            <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                        ) : (<>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Outcome Type</label>
                                    <select className={styles.formInput} value={outcomeForm.outcome_type} onChange={e => setOutcomeForm(f => ({ ...f, outcome_type: e.target.value }))}>
                                        {OUTCOME_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Disposal Date</label>
                                    <input type="date" className={styles.formInput} value={outcomeForm.disposal_date} onChange={e => setOutcomeForm(f => ({ ...f, disposal_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Decree Amount (PKR)</label>
                                    <input type="number" min="0" className={styles.formInput} value={outcomeForm.decree_amount_pkr} onChange={e => setOutcomeForm(f => ({ ...f, decree_amount_pkr: e.target.value }))} placeholder="If applicable" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Court</label>
                                    <input className={styles.formInput} value={outcomeForm.court} onChange={e => setOutcomeForm(f => ({ ...f, court: e.target.value }))} placeholder="e.g. Supreme Court of Pakistan" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Judge</label>
                                    <input className={styles.formInput} value={outcomeForm.judge} onChange={e => setOutcomeForm(f => ({ ...f, judge: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "center" }}>
                                <div className={styles.formGroup} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 0 }}>
                                    <input type="checkbox" id="appeal-filed" checked={outcomeForm.appeal_filed} onChange={e => setOutcomeForm(f => ({ ...f, appeal_filed: e.target.checked }))} />
                                    <label htmlFor="appeal-filed" style={{ fontSize: "0.85rem" }}>Appeal Filed</label>
                                </div>
                                {outcomeForm.appeal_filed && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Appeal Deadline</label>
                                        <input type="date" className={styles.formInput} value={outcomeForm.appeal_deadline} onChange={e => setOutcomeForm(f => ({ ...f, appeal_deadline: e.target.value }))} />
                                    </div>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={3} value={outcomeForm.notes} onChange={e => setOutcomeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Summary of judgment, settlement terms, or other relevant details…" />
                            </div>
                            {outcomeErr && <div className={styles.formError}>{outcomeErr}</div>}
                            {outcomeSaved && <div style={{ color: "#16a34a", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Saved successfully.</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button className={styles.btnPrimary} onClick={saveOutcome} disabled={outcomeSaving}>{outcomeSaving ? "Saving…" : "Save Outcome"}</button>
                            </div>
                        </>)}
                    </div>
                )}

                {/* ── Bail Bonds tab — Task #167 ── */}
                {detailTab === "bailbonds" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <div>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Bail bonds & surety register for this matter</span>
                            {bailBondList.length > 0 && (
                                <span style={{ marginLeft: "0.75rem", fontSize: "0.82rem" }}>
                                    Total bail: <strong>PKR {bailBondList.reduce((s, b) => s + b.bail_amount_pkr, 0).toLocaleString()}</strong>
                                </span>
                            )}
                        </div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openBondModal()}>+ Add Bail Bond</button>
                    </div>
                    {bailBondLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : bailBondList.length === 0 ? (
                        <div className={styles.emptyHint}>No bail bond records yet. Track pre-arrest bail, post-arrest bail, and surety details including property and CNIC.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {bailBondList.map(b => {
                                const statusColour = b.status === "Active" ? "#16a34a" : b.status === "Cancelled" ? "#dc2626" : b.status === "Expired" ? "#f59e0b" : "var(--text-2)";
                                return (
                                    <div key={b.bond_id} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.9rem 1rem" }}>
                                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                                            <div>
                                                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{b.accused_name}</span>
                                                <span style={{ margin: "0 0.5rem", color: "var(--text-3)" }}>·</span>
                                                <span style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{b.bail_type}</span>
                                                <span style={{ marginLeft: "0.75rem", padding: "2px 8px", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: 700, background: b.status === "Active" ? "#dcfce7" : "#fee2e2", color: statusColour }}>{b.status}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                                <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openBondModal(b)}>Edit</button>
                                                <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteBondUI(b.bond_id)}>Del</button>
                                            </div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.4rem 1rem", marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--text-2)" }}>
                                            <span><strong>Amount:</strong> PKR {b.bail_amount_pkr.toLocaleString()}</span>
                                            {b.court && <span><strong>Court:</strong> {b.court}</span>}
                                            {b.judge && <span><strong>Judge:</strong> {b.judge}</span>}
                                            {b.granted_date && <span><strong>Granted:</strong> {b.granted_date}</span>}
                                            {b.expiry_date && <span><strong>Expires:</strong> {b.expiry_date}</span>}
                                            {b.surety_name && <span><strong>Surety:</strong> {b.surety_name}</span>}
                                            {b.surety_cnic && <span><strong>CNIC:</strong> {b.surety_cnic}</span>}
                                            {b.property_value ? <span><strong>Property Val:</strong> PKR {b.property_value.toLocaleString()}</span> : null}
                                            {b.bail_order_ref && <span><strong>Order Ref:</strong> {b.bail_order_ref}</span>}
                                        </div>
                                        {b.notes && <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-3)", fontStyle: "italic" }}>{b.notes}</div>}
                                        {detail && <BailChecklist matterId={detail.matter_id} bondId={b.bond_id} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>)}

                {/* Bail Bond modal */}
                {showBondModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} style={{ maxWidth: 560 }}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>{editBond ? "Edit Bail Bond" : "Add Bail Bond"}</h3>
                                <button className={styles.modalClose} onClick={() => setShowBondModal(false)}>✕</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Accused Name *</label>
                                    <input className={styles.formInput} value={bondForm.accused_name} onChange={e => setBondForm(f => ({ ...f, accused_name: e.target.value }))} placeholder="Full name" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Bail Type</label>
                                    <select className={styles.formInput} value={bondForm.bail_type} onChange={e => setBondForm(f => ({ ...f, bail_type: e.target.value }))}>
                                        {["Pre-Arrest","Post-Arrest","Anticipatory","Interim","Regular","Transit"].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Bail Amount (PKR) *</label>
                                    <input type="number" min={0} className={styles.formInput} value={bondForm.bail_amount_pkr} onChange={e => setBondForm(f => ({ ...f, bail_amount_pkr: parseFloat(e.target.value) || 0 }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Granted Date</label>
                                    <input type="date" className={styles.formInput} value={bondForm.granted_date} onChange={e => setBondForm(f => ({ ...f, granted_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Expiry Date</label>
                                    <input type="date" className={styles.formInput} value={bondForm.expiry_date} onChange={e => setBondForm(f => ({ ...f, expiry_date: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Court</label>
                                    <input className={styles.formInput} value={bondForm.court} onChange={e => setBondForm(f => ({ ...f, court: e.target.value }))} placeholder="e.g. LHC" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Judge</label>
                                    <input className={styles.formInput} value={bondForm.judge} onChange={e => setBondForm(f => ({ ...f, judge: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Status</label>
                                    <select className={styles.formInput} value={bondForm.status} onChange={e => setBondForm(f => ({ ...f, status: e.target.value }))}>
                                        {["Active","Cancelled","Expired","Forfeited"].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Bail Order Ref</label>
                                    <input className={styles.formInput} value={bondForm.bail_order_ref} onChange={e => setBondForm(f => ({ ...f, bail_order_ref: e.target.value }))} placeholder="Order reference" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Surety Name</label>
                                    <input className={styles.formInput} value={bondForm.surety_name} onChange={e => setBondForm(f => ({ ...f, surety_name: e.target.value }))} placeholder="Full name" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Surety CNIC</label>
                                    <input className={styles.formInput} value={bondForm.surety_cnic} onChange={e => setBondForm(f => ({ ...f, surety_cnic: e.target.value }))} placeholder="xxxxx-xxxxxxx-x" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Surety Property</label>
                                    <input className={styles.formInput} value={bondForm.surety_property} onChange={e => setBondForm(f => ({ ...f, surety_property: e.target.value }))} placeholder="Property description" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Property Value (PKR)</label>
                                    <input type="number" min={0} className={styles.formInput} value={bondForm.property_value} onChange={e => setBondForm(f => ({ ...f, property_value: parseFloat(e.target.value) || 0 }))} />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={bondForm.notes} onChange={e => setBondForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                            </div>
                            {bondErr && <div className={styles.formError}>{bondErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowBondModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveBond} disabled={bondSaving}>{bondSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Court Transfers tab — Task #170 ── */}
                {detailTab === "transfers" && (<>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                        <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Court transfer orders for this matter</span>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => openTransferModal()}>+ Add Transfer</button>
                    </div>
                    {transferLoading ? (
                        <div className={styles.muted} style={{ textAlign: "center", padding: "1rem" }}>Loading…</div>
                    ) : transferList.length === 0 ? (
                        <div className={styles.emptyHint}>No court transfer records yet. Track when a case is transferred from one court/bench to another, including the transferring judge and order reference.</div>
                    ) : (
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Date</th>
                                <th>From Court</th>
                                <th>To Court</th>
                                <th>From Judge</th>
                                <th>To Judge</th>
                                <th>Order Ref</th>
                                <th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>
                                {transferList.map(t => (
                                    <tr key={t.transfer_id}>
                                        <td style={{ fontSize: "0.82rem" }}>{t.transfer_date || "—"}</td>
                                        <td style={{ fontSize: "0.82rem" }}>{t.from_court}</td>
                                        <td style={{ fontSize: "0.82rem", fontWeight: 600 }}>{t.to_court}</td>
                                        <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{t.from_judge || "—"}</td>
                                        <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{t.to_judge || "—"}</td>
                                        <td style={{ fontSize: "0.78rem", fontFamily: "monospace" }}>{t.order_ref || "—"}</td>
                                        <td style={{ display: "flex", gap: 4 }}>
                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openTransferModal(t)}>Edit</button>
                                            <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteTransferUI(t.transfer_id)}>Del</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>)}

                {/* Court Transfer modal */}
                {showTransferModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} style={{ maxWidth: 520 }}>
                            <div className={styles.modalHeader}>
                                <h3 className={styles.modalTitle}>{editTransfer ? "Edit Transfer" : "Add Court Transfer"}</h3>
                                <button className={styles.modalClose} onClick={() => setShowTransferModal(false)}>✕</button>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Transfer Date</label>
                                <input type="date" className={styles.formInput} value={transferForm.transfer_date} onChange={e => setTransferForm(f => ({ ...f, transfer_date: e.target.value }))} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>From Court *</label>
                                    <input className={styles.formInput} value={transferForm.from_court} onChange={e => setTransferForm(f => ({ ...f, from_court: e.target.value }))} placeholder="e.g. LHC Division Bench" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>To Court *</label>
                                    <input className={styles.formInput} value={transferForm.to_court} onChange={e => setTransferForm(f => ({ ...f, to_court: e.target.value }))} placeholder="e.g. LHC Single Bench" />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>From Judge</label>
                                    <input className={styles.formInput} value={transferForm.from_judge} onChange={e => setTransferForm(f => ({ ...f, from_judge: e.target.value }))} placeholder="Optional" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>To Judge</label>
                                    <input className={styles.formInput} value={transferForm.to_judge} onChange={e => setTransferForm(f => ({ ...f, to_judge: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Reason</label>
                                <input className={styles.formInput} value={transferForm.reason} onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Administrative transfer by Chief Justice" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Order Reference</label>
                                <input className={styles.formInput} value={transferForm.order_ref} onChange={e => setTransferForm(f => ({ ...f, order_ref: e.target.value }))} placeholder="Transfer order number" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                            </div>
                            {transferErr && <div className={styles.formError}>{transferErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowTransferModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveTransfer} disabled={transferSaving}>{transferSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Relief add/edit modal ── */}
                {showReliefModal && (
                    <div className={styles.overlay} onClick={() => setShowReliefModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                            <div className={styles.modalTitle}>{editRelief ? "Edit Relief Application" : "Add Relief Application"}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Date *</label>
                                    <input type="date" className={styles.formInput} value={reliefForm.application_date} onChange={e => setReliefForm(f => ({ ...f, application_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formInput} value={reliefForm.relief_type} onChange={e => setReliefForm(f => ({ ...f, relief_type: e.target.value }))}>
                                        {RELIEF_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Status</label>
                                    <select className={styles.formInput} value={reliefForm.status} onChange={e => setReliefForm(f => ({ ...f, status: e.target.value }))}>
                                        {RELIEF_STATUSES_UI.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Court</label>
                                    <input className={styles.formInput} value={reliefForm.court} onChange={e => setReliefForm(f => ({ ...f, court: e.target.value }))} placeholder="e.g. Lahore High Court" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Judge</label>
                                    <input className={styles.formInput} value={reliefForm.judge} onChange={e => setReliefForm(f => ({ ...f, judge: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Conditions</label>
                                <textarea className={styles.formInput} rows={2} value={reliefForm.conditions} onChange={e => setReliefForm(f => ({ ...f, conditions: e.target.value }))} placeholder="Bail/order conditions, if any…" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Surety Amount (PKR)</label>
                                    <input type="number" min="0" className={styles.formInput} value={reliefForm.surety_amount_pkr} onChange={e => setReliefForm(f => ({ ...f, surety_amount_pkr: e.target.value }))} placeholder="0" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Surety Name</label>
                                    <input className={styles.formInput} value={reliefForm.surety_name} onChange={e => setReliefForm(f => ({ ...f, surety_name: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={2} value={reliefForm.notes} onChange={e => setReliefForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context…" />
                            </div>
                            {reliefErr && <div className={styles.formError}>{reliefErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowReliefModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveRelief} disabled={reliefSaving}>{reliefSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Correspondence add/edit modal ── */}
                {showCorrModal && (
                    <div className={styles.overlay} onClick={() => setShowCorrModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                            <div className={styles.modalTitle}>{editCorr ? "Edit Correspondence" : "Add Correspondence"}</div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Subject *</label>
                                <input className={styles.formInput} value={corrForm.subject} onChange={e => setCorrForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Notice of Hearing — 15 Aug 2026" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Date *</label>
                                    <input type="date" className={styles.formInput} value={corrForm.corr_date} onChange={e => setCorrForm(f => ({ ...f, corr_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Direction</label>
                                    <select className={styles.formInput} value={corrForm.direction} onChange={e => setCorrForm(f => ({ ...f, direction: e.target.value }))}>
                                        {CORR_DIRECTIONS_UI.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formInput} value={corrForm.corr_type} onChange={e => setCorrForm(f => ({ ...f, corr_type: e.target.value }))}>
                                        {CORR_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Party</label>
                                    <input className={styles.formInput} value={corrForm.party} onChange={e => setCorrForm(f => ({ ...f, party: e.target.value }))} placeholder="From / To party name" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Reference #</label>
                                    <input className={styles.formInput} value={corrForm.reference_no} onChange={e => setCorrForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Optional ref number" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={3} value={corrForm.notes} onChange={e => setCorrForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional summary or follow-up actions…" />
                            </div>
                            {corrErr && <div className={styles.formError}>{corrErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowCorrModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveCorr} disabled={corrSaving}>{corrSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Expense add/edit modal ── */}
                {showExpenseModal && (
                    <div className={styles.overlay} onClick={() => setShowExpenseModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className={styles.modalTitle}>{editExpense ? "Edit Expense" : "Add Expense"}</div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description *</label>
                                <input className={styles.formInput} value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. High Court filing fee" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Amount (PKR) *</label>
                                    <input type="number" min="0" className={styles.formInput} value={expenseForm.amount_pkr} onChange={e => setExpenseForm(f => ({ ...f, amount_pkr: e.target.value }))} placeholder="0" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Date *</label>
                                    <input type="date" className={styles.formInput} value={expenseForm.expense_date} onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Category</label>
                                    <select className={styles.formInput} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                                        {EXPENSE_CATEGORIES_UI.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Receipt Ref</label>
                                    <input className={styles.formInput} value={expenseForm.receipt_ref} onChange={e => setExpenseForm(f => ({ ...f, receipt_ref: e.target.value }))} placeholder="Optional" />
                                </div>
                            </div>
                            <div className={styles.formGroup} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <input type="checkbox" id="exp-billable" checked={expenseForm.billable} onChange={e => setExpenseForm(f => ({ ...f, billable: e.target.checked }))} />
                                <label htmlFor="exp-billable" style={{ fontSize: "0.85rem" }}>Billable to client</label>
                            </div>
                            {expenseErr && <div className={styles.formError}>{expenseErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowExpenseModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveExpense} disabled={expenseSaving}>{expenseSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Deadline add/edit modal ── */}
                {showDeadlineModal && (
                    <div className={styles.overlay} onClick={() => setShowDeadlineModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                            <div className={styles.modalTitle}>{editDeadline ? "Edit Deadline" : "Add Deadline"}</div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Title *</label>
                                <input className={styles.formInput} value={deadlineForm.title} onChange={e => setDeadlineForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. File written arguments" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Due Date *</label>
                                    <input type="date" className={styles.formInput} value={deadlineForm.due_date} onChange={e => setDeadlineForm(f => ({ ...f, due_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Priority</label>
                                    <select className={styles.formInput} value={deadlineForm.priority} onChange={e => setDeadlineForm(f => ({ ...f, priority: e.target.value }))}>
                                        {DEADLINE_PRIORITIES_UI.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <textarea className={styles.formInput} rows={3} value={deadlineForm.notes} onChange={e => setDeadlineForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional context…" />
                            </div>
                            {deadlineErr && <div className={styles.formError}>{deadlineErr}</div>}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                                <button className={styles.btnGhost} onClick={() => setShowDeadlineModal(false)}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveDeadline} disabled={deadlineSaving}>{deadlineSaving ? "Saving…" : "Save"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Court Order add/edit modal ── */}
                {showOrderModal && (
                    <div className={styles.overlay} onClick={() => setShowOrderModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div className={styles.modalTitle}>{editOrder ? "Edit Court Order" : "Add Court Order"}</div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem", padding: "0.6rem", borderRadius: "var(--radius)", background: "var(--bg-1)", border: "1px solid var(--border)" }}>
                                {!voiceRecording ? (
                                    <button type="button" className={styles.btnSecondary} onClick={startVoiceRecording} disabled={voiceProcessing}>
                                        🎤 Record voice note
                                    </button>
                                ) : (
                                    <button type="button" className={styles.btnPrimary} onClick={stopVoiceRecording} style={{ background: "#c94040", borderColor: "#c94040" }}>
                                        ⏹ Stop recording…
                                    </button>
                                )}
                                <span className={styles.muted} style={{ fontSize: "0.78rem" }}>
                                    {voiceProcessing ? "Transcribing…" : "Speak the outcome in Urdu or English — review before it fills the form."}
                                </span>
                            </div>
                            {voiceErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{voiceErr}</div>}
                            {voiceResult && (
                                <div style={{ marginBottom: "0.85rem", padding: "0.65rem", borderRadius: "var(--radius)", background: "var(--bg-1)", border: "1px solid var(--gold)" }}>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginBottom: "0.3rem" }}>Heard: "{voiceResult.transcript}"</div>
                                    <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                                        <strong>Suggested:</strong> {voiceResult.order_brief}
                                        {voiceResult.outcome && <> · <strong>{voiceResult.outcome}</strong></>}
                                        {voiceResult.next_date && <> · Next: <strong>{voiceResult.next_date}</strong></>}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button type="button" className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={applyVoiceResult}>✓ Use this — fill form</button>
                                        <button type="button" className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => setVoiceResult(null)}>Discard</button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Hearing Date *</label>
                                    <input type="date" className={styles.formInput} value={orderForm.hearing_date} onChange={e => setOrderForm(f => ({ ...f, hearing_date: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Outcome</label>
                                    <select className={styles.formSelect} value={orderForm.outcome} onChange={e => setOrderForm(f => ({ ...f, outcome: e.target.value }))}>
                                        {["Adjourned", "Heard", "Partially Heard", "Decided"].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Court (optional)</label>
                                <select className={styles.formSelect} value={orderForm.court_name} onChange={e => setOrderForm(f => ({ ...f, court_name: e.target.value }))}>
                                    <option value="">Same as matter</option>
                                    {allCourts.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Order Summary *</label>
                                <textarea className={styles.formInput} rows={4} style={{ resize: "vertical" }} value={orderForm.order_brief} onChange={e => setOrderForm(f => ({ ...f, order_brief: e.target.value }))} placeholder="e.g. Case adjourned on application of plaintiff's counsel. Next date fixed for arguments on maintainability." />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Next Date Fixed</label>
                                <input type="date" className={styles.formInput} value={orderForm.next_date} onChange={e => setOrderForm(f => ({ ...f, next_date: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                                <input type="checkbox" id="notifyClientWa" checked={orderForm.notify_client} onChange={e => setOrderForm(f => ({ ...f, notify_client: e.target.checked }))} style={{ marginTop: "0.2rem" }} />
                                <label htmlFor="notifyClientWa" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                                    📲 Notify client via WhatsApp{detail?.client_phone ? ` (${detail.client_phone})` : " — no phone number on file for this client"}
                                </label>
                            </div>
                            {orderErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{orderErr}</div>}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowOrderModal(false)} disabled={orderSaving}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveOrder} disabled={orderSaving}>{orderSaving ? "Saving…" : editOrder ? "Save Changes" : "Add Order"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Fee add/edit modal ── */}
                {showFeeModal && (
                    <div className={styles.overlay} onClick={() => setShowFeeModal(false)}>
                        <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                            <div className={styles.modalTitle}>{editFee ? "Edit Fee" : "Add Fee"}</div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description *</label>
                                <input className={styles.formInput} value={feeForm.description} onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Court appearance — Session 1" />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formSelect} value={feeForm.fee_type} onChange={e => setFeeForm(f => ({ ...f, fee_type: e.target.value }))}>
                                        {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Amount (PKR) *</label>
                                    <input type="number" min="0" className={styles.formInput} value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 25000" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Date *</label>
                                <input type="date" className={styles.formInput} value={feeForm.fee_date} onChange={e => setFeeForm(f => ({ ...f, fee_date: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notes</label>
                                <input className={styles.formInput} value={feeForm.notes} onChange={e => setFeeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                            </div>
                            {feeErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{feeErr}</div>}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowFeeModal(false)} disabled={feeSaving}>Cancel</button>
                                <button className={styles.btnPrimary} onClick={saveFee} disabled={feeSaving}>{feeSaving ? "Saving…" : editFee ? "Save Changes" : "Add Fee"}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Link document modal */}
                {showLinkModal && (
                    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowLinkModal(false); }}>
                        <div className={styles.modal} style={{ maxWidth: 520 }}>
                            <h3 className={styles.modalTitle}>Link Documents</h3>
                            <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                                Select documents from your library to link to this matter.
                            </p>
                            {allDocs.length === 0 ? (
                                <div className={styles.emptyHint}>All available documents are already linked to matters, or your library is empty.</div>
                            ) : (
                                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                                    {allDocs.map(doc => (
                                        <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span className={styles.fileIcon} style={{ fontSize: "0.55rem", flexShrink: 0 }}>F</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: "0.85rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                                                <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{doc.category_name ?? "No category"} · {doc.size}</div>
                                            </div>
                                            <button className={styles.btnPrimary} style={{ fontSize: "0.75rem", padding: "0.3rem 0.8rem" }}
                                                disabled={linkingDoc === doc.doc_id}
                                                onClick={() => linkDoc(doc.doc_id)}>
                                                {linkingDoc === doc.doc_id ? "…" : "Link"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className={styles.modalActions}>
                                <button className={styles.btnGhost} onClick={() => setShowLinkModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─ Matter list view ─
    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={styles.resultCount}>{filtered.length} matter{filtered.length !== 1 ? "s" : ""}</span>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All statuses</option>
                        {MATTER_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All types</option>
                        {MATTER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="all">All priorities</option>
                        {MATTER_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
                {clients.length === 0 ? (
                    <span className={styles.muted} style={{ fontSize: "0.8rem" }}>Add a client first</span>
                ) : (
                    <button className={styles.btnPrimary} onClick={() => { setForm({ ...BLANK_MATTER }); setFormErr(null); setShowModal(true); }}>
                        + New Matter
                    </button>
                )}
            </div>

            {/* Today's cause list alert banner */}
            {causeListAlerts.length > 0 && (
                <div className={styles.limAlertBanner} style={{ borderColor: "var(--gold)", background: "rgba(200,160,40,0.06)" }}>
                    <strong>📋 Today's Cause List — {causeListAlerts.length} matter{causeListAlerts.length !== 1 ? "s" : ""} listed in court</strong>
                    <div className={styles.limAlertList}>
                        {causeListAlerts.map(a => (
                            <div key={a.matter_id} className={styles.limAlertItem}>
                                <button className={styles.linkBtn} onClick={() => { const m = matters.find(x => x.matter_id === a.matter_id); if (m) openDetail(m); }}>
                                    {a.matter_title}
                                </button>
                                {a.case_number && <span className={styles.muted}> · {a.case_number}</span>}
                                {a.item_no     && <span className={styles.badgeGold} style={{ fontSize: "0.68rem" }}>Item {a.item_no}</span>}
                                {a.court_name  && <span className={styles.muted} style={{ fontSize: "0.78rem" }}> · {a.court_name}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Limitation alerts banner */}
            {limAlerts.length > 0 && (
                <div className={styles.limAlertBanner}>
                    <strong>⚠ Limitation Approaching</strong>
                    <div className={styles.limAlertList}>
                        {limAlerts.map(a => {
                            const critical = a.days_remaining <= 30;
                            return (
                                <div key={a.matter_id} className={critical ? styles.limAlertItemCritical : styles.limAlertItem}>
                                    <button className={styles.linkBtn} onClick={() => { const m = matters.find(x => x.matter_id === a.matter_id); if (m) openDetail(m); }}>
                                        {a.title}
                                    </button>
                                    <span className={styles.muted}> · {a.client_name}</span>
                                    <span className={critical ? styles.limBadgeCritical : styles.limBadgeWarn}>
                                        {a.days_remaining < 0 ? `EXPIRED ${Math.abs(a.days_remaining)}d ago` : a.days_remaining === 0 ? "EXPIRES TODAY" : `${a.days_remaining}d left`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyHint}>
                    {matters.length === 0 ? "No matters yet. Create a client first, then open a matter." : "No matters match the selected filters."}
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead><tr>
                            <th>Title</th><th>Client</th><th>Type</th><th>Status</th><th>Priority</th><th>Vakalatnama</th><th>Adj.</th><th>Court</th><th>Case #</th><th>Team</th><th>Docs</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map(m => {
                                const limDays = m.limitation_date ? limitationDaysRemaining(m.limitation_date) : null;
                                return (
                                <tr key={m.matter_id}>
                                    <td>
                                        <button className={styles.linkBtn} onClick={() => openDetail(m)}>{m.title}</button>
                                        {limDays !== null && limDays <= 60 && (
                                            <span className={limDays <= 30 ? styles.limBadgeCritical : styles.limBadgeWarn} style={{ marginLeft: "0.4rem" }}>
                                                {limDays < 0 ? "LIM EXPIRED" : limDays === 0 ? "LIM TODAY" : `LIM ${limDays}d`}
                                            </span>
                                        )}
                                    </td>
                                    <td className={styles.muted}>{m.client_name}</td>
                                    <td className={styles.muted}>{m.matter_type}</td>
                                    <td><span className={(styles as any)[STATUS_BADGE[m.status] ?? "badgeGray"]}>{m.status}</span></td>
                                    <td>
                                        <span className={styles.priorityBadge} data-priority={m.priority ?? "Normal"}>
                                            {m.priority ?? "Normal"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={
                                            m.vakalatnama_status === "Filed"        ? styles.badgeGreen :
                                            m.vakalatnama_status === "Not Required" ? styles.badgeGray  : styles.badgeAmber
                                        } style={{ fontSize: "0.7rem" }}>
                                            {m.vakalatnama_status ?? "Pending"}
                                        </span>
                                    </td>
                                    <td>
                                        {(m.adjournment_count ?? 0) > 0 ? (
                                            <span className={
                                                (m.adjournment_count ?? 0) >= 10 ? styles.limBadgeCritical :
                                                (m.adjournment_count ?? 0) >= 5  ? styles.badgeAmber : styles.badgeGray
                                            } style={{ fontSize: "0.7rem" }}>
                                                {m.adjournment_count}
                                            </span>
                                        ) : <span className={styles.muted}>0</span>}
                                    </td>
                                    <td className={styles.muted}>{m.court_name ?? "—"}</td>
                                    <td className={styles.muted}>{m.case_number ?? "—"}</td>
                                    <td className={styles.muted}>{m.team_name ?? "—"}</td>
                                    <td className={styles.muted}>{m.doc_count ?? 0}</td>
                                    <td style={{ display: "flex", gap: "0.4rem" }}>
                                        <button className={styles.actionBtn} onClick={() => openDetail(m)}>View</button>
                                        <button className={styles.actionBtnDanger} disabled={removing === m.matter_id} onClick={() => removeMatter(m)}>
                                            {removing === m.matter_id ? "…" : "Delete"}
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal} style={{ maxWidth: 560 }}>
                        <h3 className={styles.modalTitle}>New Matter</h3>
                        <MatterForm onSave={saveMatter} onCancel={() => setShowModal(false)} />
                    </div>
                </div>
            )}

            {/* ── Conflict of Interest Results Modal — Task #150 ── */}
            {showConflictModal && (
                <div className={styles.overlay} onClick={() => setShowConflictModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
                        <div className={styles.modalTitle} style={{ color: conflictResults.length > 0 ? "#dc2626" : "#16a34a" }}>
                            {conflictResults.length > 0 ? `⚠ ${conflictResults.length} Potential Conflict${conflictResults.length > 1 ? "s" : ""} Found` : "✓ No Conflicts Found"}
                        </div>
                        {conflictResults.length === 0 ? (
                            <p style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>No existing matters involve this client or opposing party. You may proceed.</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: 360, overflowY: "auto" }}>
                                {conflictResults.map((c, i) => (
                                    <div key={i} style={{ background: "var(--bg-1)", border: "1px solid #dc2626", borderRadius: "var(--radius)", padding: "0.75rem" }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.matter_title}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: "0.2rem" }}>
                                            Client: {c.client_name} · Opponent: {c.opposing_party || "—"} · Status: {c.status}
                                        </div>
                                        <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0, fontSize: "0.8rem", color: "#dc2626" }}>
                                            {c.reasons.map((r, j) => <li key={j}>{r}</li>)}
                                        </ul>
                                    </div>
                                ))}
                                <p style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: 0 }}>Review these conflicts carefully before proceeding. You may still create the matter if you determine there is no actual conflict.</p>
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                            <button className={styles.btnPrimary} onClick={() => setShowConflictModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Audit Panel ───────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
    login_success:  "Login",
    login_fail:     "Failed Login",
    logout:         "Logout",
    password_change:"Password Change",
    doc_upload:     "Document Upload",
    doc_delete:     "Document Delete",
    search:         "Search",
    member_invite:  "Member Invited",
    member_remove:  "Member Removed",
    client_create:  "Client Created",
    client_update:  "Client Updated",
    client_delete:  "Client Deleted",
    matter_create:  "Matter Created",
    matter_update:  "Matter Updated",
    matter_delete:  "Matter Deleted",
    org_update:     "Settings Updated",
    access_denied:  "Access Denied",
};

const EVENT_BADGE: Record<string, string> = {
    login_success:  "badgeGreen",
    login_fail:     "badgeRed",
    access_denied:  "badgeRed",
    logout:         "badgeGray",
    password_change:"badgeAmber",
    doc_upload:     "badgeGold",
    doc_delete:     "badgeRed",
    search:         "badgeBlue",
    member_invite:  "badgeGreen",
    member_remove:  "badgeRed",
    client_create:  "badgeGreen",
    client_update:  "badgeAmber",
    client_delete:  "badgeRed",
    matter_create:  "badgeGreen",
    matter_update:  "badgeAmber",
    matter_delete:  "badgeRed",
    org_update:     "badgeAmber",
};

const ALL_EVENT_TYPES = Object.keys(EVENT_LABELS);

// ── Cause List Panel — Task #137 ─────────────────────────────────────────────

interface CauseListEntry {
    entry_id:     string;
    list_date:    string;
    court_name:   string | null;
    item_no:      string | null;
    case_number:  string | null;
    parties:      string | null;
    matter_id:    string | null;
    matter_title: string | null;
    matter_status: string | null;
}

const PAKISTAN_COURTS = [
    "Supreme Court of Pakistan",
    "Lahore High Court",
    "Islamabad High Court",
    "Sindh High Court",
    "Peshawar High Court",
    "Balochistan High Court",
    "Federal Shariat Court",
    "Sessions Court",
    "Civil Court",
    "Other",
];

// ── Intelligence Panel — Task #158 ───────────────────────────────────────────
// Firm's own track record with a judge — computed from this org's own
// hearings/bail bonds, never external/published data.
const JudgeStats = ({ judgeId }: { judgeId: string }) => {
    const [stats, setStats] = useState<{ hearings_count: number; outcome_breakdown: Record<string, number>; adjournment_rate: number | null; bail_bonds_count: number } | null>(null);

    useEffect(() => {
        fetch(`/judge-notes/${judgeId}/stats`, { headers: authHeaders() })
            .then(r => r.json())
            .then(setStats)
            .catch(() => setStats(null));
    }, [judgeId]);

    if (!stats) return <div className={styles.muted} style={{ fontSize: "0.78rem" }}>Loading track record…</div>;

    if (stats.hearings_count === 0 && stats.bail_bonds_count === 0) {
        return (
            <div className={styles.muted} style={{ fontSize: "0.78rem", fontStyle: "italic" }}>
                No hearing history logged with this judge yet — this builds up automatically as you record hearing outcomes.
            </div>
        );
    }

    return (
        <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Your Firm's History With This Judge
            </div>
            <div style={{ fontSize: "0.82rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <span>{stats.hearings_count} hearing{stats.hearings_count === 1 ? "" : "s"} logged</span>
                {stats.adjournment_rate !== null && <span>{stats.adjournment_rate}% adjourned</span>}
                {stats.bail_bonds_count > 0 && <span>{stats.bail_bonds_count} bail bond{stats.bail_bonds_count === 1 ? "" : "s"}</span>}
            </div>
            {Object.keys(stats.outcome_breakdown).length > 0 && (
                <div style={{ fontSize: "0.76rem", color: "var(--text-2)", marginTop: "0.3rem" }}>
                    {Object.entries(stats.outcome_breakdown).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </div>
            )}
        </div>
    );
};

const IntelligencePanel = () => {
    type Counsel = { counsel_id: string; name: string; bar_no: string | null; firm_name: string | null; phone: string | null; email: string | null; court_preference: string | null; known_tactics: string | null; private_notes: string | null };
    type Judge   = { judge_id: string; name: string; court_name: string | null; designation: string | null; known_for: string | null; private_notes: string | null };
    const [tab,          setTab]          = useState<"counsel" | "judges">("counsel");
    const [counselList,  setCounselList]  = useState<Counsel[]>([]);
    const [judgeList,    setJudgeList]    = useState<Judge[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [showModal,    setShowModal]    = useState(false);
    const [editItem,     setEditItem]     = useState<Counsel | Judge | null>(null);
    const [form,         setForm]         = useState<Record<string, string>>({});
    const [saving,       setSaving]       = useState(false);
    const [err,          setErr]          = useState("");
    const [expanded,     setExpanded]     = useState<string | null>(null);

    const loadAll = () => {
        setLoading(true);
        Promise.all([
            fetch("/opposing-counsel", { headers: authHeaders() }).then(r => r.json()),
            fetch("/judge-notes",      { headers: authHeaders() }).then(r => r.json()),
        ]).then(([c, j]) => {
            setCounselList(c.counsel || []);
            setJudgeList(j.judges || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };
    useEffect(() => { loadAll(); }, []);

    const openModal = (item?: Counsel | Judge) => {
        setEditItem(item || null);
        if (tab === "counsel") {
            const c = item as Counsel | undefined;
            setForm({ name: c?.name || "", bar_no: c?.bar_no || "", firm_name: c?.firm_name || "", phone: c?.phone || "", email: c?.email || "", court_preference: c?.court_preference || "", known_tactics: c?.known_tactics || "", private_notes: c?.private_notes || "" });
        } else {
            const j = item as Judge | undefined;
            setForm({ name: j?.name || "", court_name: j?.court_name || "", designation: j?.designation || "", known_for: j?.known_for || "", private_notes: j?.private_notes || "" });
        }
        setErr(""); setShowModal(true);
    };

    const save = async () => {
        if (!form.name?.trim()) { setErr("Name is required"); return; }
        setSaving(true); setErr("");
        const isCounsel = tab === "counsel";
        const base = isCounsel ? "/opposing-counsel" : "/judge-notes";
        const idKey = isCounsel ? (editItem as Counsel | null)?.counsel_id : (editItem as Judge | null)?.judge_id;
        const url = idKey ? `${base}/${idKey}` : base;
        const method = idKey ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setShowModal(false); loadAll(); }
        else { const e = await res.json(); setErr(e.error || "Save failed"); }
    };

    const deleteItem = async (id: string) => {
        if (!confirm("Delete this record?")) return;
        const base = tab === "counsel" ? `/opposing-counsel/${id}` : `/judge-notes/${id}`;
        await fetch(base, { method: "DELETE", headers: authHeaders() });
        loadAll();
    };

    return (
        <div className={styles.panelContent}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
                <button className={tab === "counsel" ? styles.btnPrimary : styles.btnGhost} style={{ fontSize: "0.82rem" }} onClick={() => setTab("counsel")}>
                    ⚖ Opposing Counsel ({counselList.length})
                </button>
                <button className={tab === "judges" ? styles.btnPrimary : styles.btnGhost} style={{ fontSize: "0.82rem" }} onClick={() => setTab("judges")}>
                    🏛 Judges ({judgeList.length})
                </button>
                <button className={styles.btnPrimary} style={{ marginLeft: "auto", fontSize: "0.82rem" }} onClick={() => openModal()}>
                    + Add {tab === "counsel" ? "Counsel" : "Judge"}
                </button>
            </div>
            {loading ? (
                <div className={styles.muted} style={{ textAlign: "center", padding: "2rem" }}>Loading…</div>
            ) : tab === "counsel" ? (
                counselList.length === 0 ? (
                    <div className={styles.emptyHint}>No opposing counsel records yet. Build your private intelligence file on lawyers you frequently face — their tactics, preferred courts, and contact info.</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {counselList.map(c => (
                            <div key={c.counsel_id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <strong>{c.name}</strong>
                                        {c.bar_no && <span className={styles.muted} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>Bar: {c.bar_no}</span>}
                                        {c.firm_name && <span className={styles.muted} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>{c.firm_name}</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => setExpanded(expanded === c.counsel_id ? null : c.counsel_id)}>
                                            {expanded === c.counsel_id ? "Less" : "Notes"}
                                        </button>
                                        <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openModal(c)}>Edit</button>
                                        <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteItem(c.counsel_id)}>Del</button>
                                    </div>
                                </div>
                                {(c.phone || c.email || c.court_preference) && (
                                    <div className={styles.muted} style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                        {c.phone && `📞 ${c.phone}`}{c.phone && c.email && " · "}{c.email && `✉ ${c.email}`}
                                        {c.court_preference && ` · Prefers: ${c.court_preference}`}
                                    </div>
                                )}
                                {expanded === c.counsel_id && (
                                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                                        {c.known_tactics && <div style={{ fontSize: "0.82rem", marginBottom: "0.25rem" }}><strong>Known Tactics:</strong> {c.known_tactics}</div>}
                                        {c.private_notes && <div style={{ fontSize: "0.82rem", color: "var(--text-2)", fontStyle: "italic" }}>{c.private_notes}</div>}
                                        {!c.known_tactics && !c.private_notes && <div className={styles.muted} style={{ fontSize: "0.8rem" }}>No detailed notes yet.</div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : (
                judgeList.length === 0 ? (
                    <div className={styles.emptyHint}>No judge records yet. Keep private notes on judges you appear before — their known inclinations, preferences, and important observations.</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {judgeList.map(j => (
                            <div key={j.judge_id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <strong>{j.name}</strong>
                                        {j.designation && <span className={styles.muted} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>{j.designation}</span>}
                                        {j.court_name && <span className={styles.muted} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>@ {j.court_name}</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => setExpanded(expanded === j.judge_id ? null : j.judge_id)}>
                                            {expanded === j.judge_id ? "Less" : "Notes"}
                                        </button>
                                        <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openModal(j)}>Edit</button>
                                        <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteItem(j.judge_id)}>Del</button>
                                    </div>
                                </div>
                                {expanded === j.judge_id && (
                                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                                        {j.known_for && <div style={{ fontSize: "0.82rem", marginBottom: "0.25rem" }}><strong>Known For:</strong> {j.known_for}</div>}
                                        {j.private_notes && <div style={{ fontSize: "0.82rem", color: "var(--text-2)", fontStyle: "italic" }}>{j.private_notes}</div>}
                                        {!j.known_for && !j.private_notes && <div className={styles.muted} style={{ fontSize: "0.8rem" }}>No detailed notes yet.</div>}
                                        <JudgeStats judgeId={j.judge_id} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal} style={{ maxWidth: 480 }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{editItem ? "Edit" : "Add"} {tab === "counsel" ? "Opposing Counsel" : "Judge"}</h3>
                            <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Full Name *</label>
                            <input className={styles.formInput} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ch. Hamid Iqbal" />
                        </div>
                        {tab === "counsel" ? (<>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Bar Registration No.</label>
                                    <input className={styles.formInput} value={form.bar_no || ""} onChange={e => setForm(f => ({ ...f, bar_no: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Firm Name</label>
                                    <input className={styles.formInput} value={form.firm_name || ""} onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Phone</label>
                                    <input className={styles.formInput} value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Email</label>
                                    <input className={styles.formInput} value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Preferred Court</label>
                                <input className={styles.formInput} value={form.court_preference || ""} onChange={e => setForm(f => ({ ...f, court_preference: e.target.value }))} placeholder="e.g. LHC Banking Court" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Known Tactics / Style</label>
                                <textarea className={styles.formInput} rows={2} value={form.known_tactics || ""} onChange={e => setForm(f => ({ ...f, known_tactics: e.target.value }))} placeholder="e.g. Often requests adjournments, strong on procedure…" />
                            </div>
                        </>) : (<>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Court</label>
                                    <input className={styles.formInput} value={form.court_name || ""} onChange={e => setForm(f => ({ ...f, court_name: e.target.value }))} placeholder="e.g. LHC Civil" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Designation</label>
                                    <input className={styles.formInput} value={form.designation || ""} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Senior Civil Judge" />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Known For</label>
                                <textarea className={styles.formInput} rows={2} value={form.known_for || ""} onChange={e => setForm(f => ({ ...f, known_for: e.target.value }))} placeholder="e.g. Strict on time limits, favours written submissions…" />
                            </div>
                        </>)}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Private Notes (not shared with client)</label>
                            <textarea className={styles.formInput} rows={3} value={form.private_notes || ""} onChange={e => setForm(f => ({ ...f, private_notes: e.target.value }))} placeholder="Confidential observations…" />
                        </div>
                        {err && <div className={styles.formError}>{err}</div>}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                            <button className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Vakalatnama Register Panel — Task #156 ────────────────────────────────────
const VakalatnamaPanel = () => {
    type VEntry = { matter_id: string; title: string; matter_no: string | null; client_name: string; court_name: string | null; vakalatnama_status: string; status: string; created_at: string };
    const [register,  setRegister]  = useState<VEntry[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [filter,    setFilter]    = useState<"All" | "Pending" | "Filed" | "Rejected">("All");
    const [search,    setSearch]    = useState("");
    const [updating,  setUpdating]  = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        fetch("/vakalatnama-register", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setRegister(d.register || []); setLoading(false); })
            .catch(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const updateStatus = async (matterId: string, newStatus: string) => {
        setUpdating(matterId);
        const res = await fetch(`/matters/${matterId}/vakalatnama`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ vakalatnama_status: newStatus }),
        });
        if (res.ok) {
            setRegister(prev => prev.map(e => e.matter_id === matterId ? { ...e, vakalatnama_status: newStatus } : e));
        }
        setUpdating(null);
    };

    const visible = register.filter(e => {
        if (filter !== "All" && e.vakalatnama_status !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return e.title.toLowerCase().includes(q) || e.client_name.toLowerCase().includes(q) || (e.matter_no || "").toLowerCase().includes(q);
        }
        return true;
    });

    const counts = { All: register.length, Pending: 0, Filed: 0, Rejected: 0 };
    register.forEach(e => { if (e.vakalatnama_status in counts) (counts as Record<string,number>)[e.vakalatnama_status]++; });

    const statusColor = (s: string) => s === "Filed" ? "#16a34a" : s === "Rejected" ? "#dc2626" : "#d97706";

    return (
        <div className={styles.panelContent}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
                {(["All", "Pending", "Filed", "Rejected"] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={filter === f ? styles.btnPrimary : styles.btnGhost}
                        style={{ fontSize: "0.82rem" }}>
                        {f} ({counts[f]})
                    </button>
                ))}
                <input className={styles.searchInput} placeholder="Search matter / client…" value={search}
                    onChange={e => setSearch(e.target.value)} style={{ marginLeft: "auto", width: 220 }} />
            </div>
            {loading ? (
                <div className={styles.muted} style={{ textAlign: "center", padding: "2rem" }}>Loading…</div>
            ) : visible.length === 0 ? (
                <div className={styles.emptyHint}>No matters match the current filter. All matters with a vakalatnama status appear here.</div>
            ) : (
                <table className={styles.feeTable}>
                    <thead><tr>
                        <th>Matter No.</th>
                        <th>Title</th>
                        <th>Client</th>
                        <th>Court</th>
                        <th>Matter Status</th>
                        <th>Vakalatnama</th>
                        <th style={{ width: 160 }}>Update</th>
                    </tr></thead>
                    <tbody>
                        {visible.map(e => (
                            <tr key={e.matter_id}>
                                <td className={styles.muted} style={{ fontSize: "0.8rem" }}>{e.matter_no || "—"}</td>
                                <td><strong style={{ fontSize: "0.88rem" }}>{e.title}</strong></td>
                                <td className={styles.muted}>{e.client_name}</td>
                                <td className={styles.muted} style={{ fontSize: "0.8rem" }}>{e.court_name || "—"}</td>
                                <td><span style={{ fontSize: "0.78rem" }}>{e.status}</span></td>
                                <td>
                                    <span style={{ fontWeight: 700, fontSize: "0.82rem", color: statusColor(e.vakalatnama_status) }}>
                                        {e.vakalatnama_status}
                                    </span>
                                </td>
                                <td>
                                    <select
                                        className={styles.formInput}
                                        style={{ fontSize: "0.78rem", padding: "2px 6px" }}
                                        value={e.vakalatnama_status}
                                        disabled={updating === e.matter_id}
                                        onChange={ev => updateStatus(e.matter_id, ev.target.value)}>
                                        <option>Pending</option>
                                        <option>Filed</option>
                                        <option>Rejected</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const CauseListPanel = () => {
    const [entries,    setEntries]    = useState<CauseListEntry[]>([]);
    const [loading,    setLoading]    = useState(false);
    const [parsing,    setParsing]    = useState(false);
    const [parseErr,   setParseErr]   = useState("");
    const [parseResult, setParseResult] = useState<{ total: number; matched: number } | null>(null);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
    const [text,       setText]       = useState("");
    const [file,       setFile]       = useState<File | null>(null);
    const [listDate,   setListDate]   = useState(new Date().toISOString().slice(0, 10));
    const [courtName,  setCourtName]  = useState("");
    const [showInput,  setShowInput]  = useState(false);
    const [matters,    setMatters]    = useState<{ matter_id: string; title: string; case_number: string | null }[]>([]);
    const [linkingId,  setLinkingId]  = useState<string | null>(null);
    const [linkTarget, setLinkTarget] = useState("");

    const loadEntries = (date: string) => {
        setLoading(true);
        fetch(`/cause-list?date=${date}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setEntries(d.entries ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const loadMatters = () => {
        fetch("/matters", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setMatters((d.matters ?? []).map((m: any) => ({ matter_id: m.matter_id, title: m.title, case_number: m.case_number }))));
    };

    useEffect(() => { loadEntries(filterDate); loadMatters(); }, []);

    const parseCauseList = async () => {
        if (!text.trim() && !file) { setParseErr("Paste the cause list text or upload a photo/PDF first."); return; }
        setParsing(true); setParseErr(""); setParseResult(null);
        try {
            let r: Response;
            if (file) {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("list_date", listDate);
                fd.append("court_name", courtName);
                r = await fetch("/cause-list/parse", { method: "POST", headers: authHeaders(), body: fd });
            } else {
                r = await fetch("/cause-list/parse", {
                    method: "POST",
                    headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ text, list_date: listDate, court_name: courtName }),
                });
            }
            const d = await r.json();
            if (!r.ok) { setParseErr(d.error ?? "Parse failed."); }
            else {
                setParseResult({ total: d.total_count, matched: d.matched_count });
                setShowInput(false); setText(""); setFile(null);
                setFilterDate(listDate);
                loadEntries(listDate);
            }
        } catch { setParseErr("Network error."); }
        finally { setParsing(false); }
    };

    const deleteEntry = async (entry: CauseListEntry) => {
        await fetch(`/cause-list/${entry.entry_id}`, { method: "DELETE", headers: authHeaders() });
        loadEntries(filterDate);
    };

    const saveLink = async (entry: CauseListEntry) => {
        await fetch(`/cause-list/${entry.entry_id}`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ matter_id: linkTarget || null }),
        });
        setLinkingId(null); setLinkTarget("");
        loadEntries(filterDate);
    };

    const matched   = entries.filter(e => e.matter_id);
    const unmatched = entries.filter(e => !e.matter_id);

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.85rem" }}
                        value={filterDate} onChange={e => { setFilterDate(e.target.value); loadEntries(e.target.value); }} />
                    <span className={styles.muted} style={{ fontSize: "0.82rem" }}>{entries.length} entries</span>
                    {matched.length > 0 && (
                        <span className={styles.badgeGreen} style={{ fontSize: "0.72rem" }}>{matched.length} matched</span>
                    )}
                </div>
                <button className={styles.btnPrimary} onClick={() => { setShowInput(!showInput); setParseErr(""); setParseResult(null); }}>
                    {showInput ? "Cancel" : "+ Import Cause List"}
                </button>
            </div>

            {/* Parse result banner */}
            {parseResult && (
                <div className={styles.limAlertBanner} style={{ background: "var(--bg-1)", borderColor: "var(--gold)", marginBottom: "0.75rem" }}>
                    Parsed {parseResult.total} entries — <strong>{parseResult.matched} matched</strong> to your matters.
                    {parseResult.matched === 0 && " Check that matter case numbers are filled in."}
                </div>
            )}

            {/* Import form */}
            {showInput && (
                <div className={styles.settingsCard} style={{ marginBottom: "1.25rem" }}>
                    <div className={styles.settingsCardTitle}>Import Cause List</div>
                    <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
                        Paste the plain text of any Pakistani court's cause list, or upload a photo/PDF and let OCR read it. Case numbers will be detected automatically and matched against your matters — matched matters get sent to you automatically as a WhatsApp digest at 8am.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Cause List Date</label>
                            <input type="date" className={styles.formInput} value={listDate} onChange={e => setListDate(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Court</label>
                            <select className={styles.formSelect} value={courtName} onChange={e => setCourtName(e.target.value)}>
                                <option value="">Select court…</option>
                                {PAKISTAN_COURTS.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Cause List Text</label>
                        <textarea className={styles.formInput} rows={10} style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.8rem" }}
                            value={text} onChange={e => { setText(e.target.value); if (e.target.value) setFile(null); }}
                            disabled={!!file}
                            placeholder={"Paste cause list text here…\n\nExample:\n1. W.P. No. 1234/2024 — Muhammad Ali v Federation of Pakistan\n2. C.S. No. 89/2023 — ABC Ltd v XYZ Ltd"} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>— or upload a photo / scanned PDF —</label>
                        <input type="file" accept="image/*,.pdf" className={styles.formInput}
                            onChange={e => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) setText(""); }} />
                        {file && (
                            <p className={styles.muted} style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
                                📎 {file.name} — will be read automatically (OCR). <button type="button" className={styles.btnGhost} style={{ padding: "0.1rem 0.5rem", fontSize: "0.75rem" }} onClick={() => setFile(null)}>Remove</button>
                            </p>
                        )}
                    </div>
                    {parseErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{parseErr}</div>}
                    <div className={styles.modalActions}>
                        <button className={styles.btnGhost} onClick={() => { setShowInput(false); setText(""); }}>Cancel</button>
                        <button className={styles.btnPrimary} onClick={parseCauseList} disabled={parsing}>{parsing ? "Parsing…" : "Parse & Match"}</button>
                    </div>
                </div>
            )}

            {/* Entries */}
            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : entries.length === 0 ? (
                <div className={styles.emptyHint}>No cause list entries for this date. Click "+ Import Cause List" to paste a court cause list.</div>
            ) : (
                <>
                    {/* Matched matters */}
                    {matched.length > 0 && (
                        <>
                            <div className={styles.sectionTitle} style={{ color: "#2d8a4e", marginBottom: "0.5rem" }}>
                                Matched to Your Matters ({matched.length})
                            </div>
                            <div className={styles.tableWrap} style={{ marginBottom: "1.5rem" }}>
                                <table className={styles.table}>
                                    <thead><tr>
                                        <th>Item</th><th>Case Number</th><th>Parties</th><th>Matter</th><th>Court</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {matched.map(e => (
                                            <tr key={e.entry_id} style={{ background: "rgba(45,138,78,0.06)" }}>
                                                <td className={styles.muted}>{e.item_no || "—"}</td>
                                                <td><strong style={{ fontSize: "0.82rem" }}>{e.case_number || "—"}</strong></td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem", maxWidth: 200 }}>{e.parties || "—"}</td>
                                                <td>
                                                    <span className={styles.badgeGreen} style={{ fontSize: "0.72rem" }}>{e.matter_title}</span>
                                                </td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem" }}>{e.court_name || "—"}</td>
                                                <td style={{ display: "flex", gap: "0.35rem" }}>
                                                    {linkingId === e.entry_id ? (
                                                        <>
                                                            <select className={styles.formSelect} style={{ fontSize: "0.78rem", padding: "0.2rem" }}
                                                                value={linkTarget} onChange={ev => setLinkTarget(ev.target.value)}>
                                                                <option value="">Unlink</option>
                                                                {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title}{m.case_number ? ` (${m.case_number})` : ""}</option>)}
                                                            </select>
                                                            <button className={styles.actionBtn} onClick={() => saveLink(e)}>Save</button>
                                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem" }} onClick={() => setLinkingId(null)}>✕</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className={styles.actionBtn} onClick={() => { setLinkingId(e.entry_id); setLinkTarget(e.matter_id ?? ""); }}>Relink</button>
                                                            <button className={styles.actionBtnDanger} onClick={() => deleteEntry(e)}>✕</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Unmatched entries */}
                    {unmatched.length > 0 && (
                        <>
                            <div className={styles.sectionTitle} style={{ marginBottom: "0.5rem" }}>
                                Unmatched Entries ({unmatched.length})
                                <span className={styles.muted} style={{ fontSize: "0.78rem", fontWeight: 400, marginLeft: "0.5rem" }}>
                                    — link manually or ensure case numbers are set on your matters
                                </span>
                            </div>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <thead><tr>
                                        <th>Item</th><th>Case Number</th><th>Parties</th><th>Court</th><th>Link to Matter</th><th></th>
                                    </tr></thead>
                                    <tbody>
                                        {unmatched.map(e => (
                                            <tr key={e.entry_id}>
                                                <td className={styles.muted}>{e.item_no || "—"}</td>
                                                <td style={{ fontSize: "0.82rem" }}>{e.case_number || <span className={styles.muted}>not detected</span>}</td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem", maxWidth: 220 }}>{e.parties || "—"}</td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem" }}>{e.court_name || "—"}</td>
                                                <td>
                                                    {linkingId === e.entry_id ? (
                                                        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                                                            <select className={styles.formSelect} style={{ fontSize: "0.78rem", padding: "0.2rem" }}
                                                                value={linkTarget} onChange={ev => setLinkTarget(ev.target.value)}>
                                                                <option value="">No link</option>
                                                                {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title}{m.case_number ? ` (${m.case_number})` : ""}</option>)}
                                                            </select>
                                                            <button className={styles.actionBtn} onClick={() => saveLink(e)}>Save</button>
                                                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem" }} onClick={() => setLinkingId(null)}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <button className={styles.btnGhost} style={{ fontSize: "0.78rem" }}
                                                            onClick={() => { setLinkingId(e.entry_id); setLinkTarget(""); }}>
                                                            Link…
                                                        </button>
                                                    )}
                                                </td>
                                                <td>
                                                    <button className={styles.actionBtnDanger} onClick={() => deleteEntry(e)}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

const AuditPanel = () => {
    const [logs,       setLogs]       = useState<AuditLog[]>([]);
    const [total,      setTotal]      = useState(0);
    const [loading,    setLoading]    = useState(true);
    const [filterType, setFilterType] = useState("all");
    const [dateFrom,   setDateFrom]   = useState("");
    const [dateTo,     setDateTo]     = useState("");
    const [page,       setPage]       = useState(0);
    const PAGE_SIZE = 100;

    const load = (pg = 0) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterType !== "all") params.set("event_type", filterType);
        if (dateFrom) params.set("date_from", dateFrom);
        if (dateTo)   params.set("date_to",   dateTo);
        params.set("limit",  String(PAGE_SIZE));
        params.set("offset", String(pg * PAGE_SIZE));
        fetch(`/audit-logs?${params}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { setPage(0); load(0); }, [filterType, dateFrom, dateTo]);

    const exportCsv = () => {
        const header = "Timestamp,Event,Actor,Role,Resource,IP Address,Details\n";
        const rows = logs.map(l => {
            const details = l.details ? (() => { try { return JSON.stringify(JSON.parse(l.details)); } catch { return l.details; } })() : "";
            return [
                l.created_at,
                EVENT_LABELS[l.event_type] ?? l.event_type,
                l.actor_name ?? "",
                l.actor_role ?? "",
                [l.resource_type, l.resource_name].filter(Boolean).join(": "),
                l.ip_address ?? "",
                details,
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
        }).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className={styles.panelContent}>
            {/* Toolbar */}
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All events</option>
                        {ALL_EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
                    </select>
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
                    <span className={styles.resultCount}>{total} event{total !== 1 ? "s" : ""}</span>
                </div>
                <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={exportCsv} disabled={logs.length === 0}>
                    ↓ Export CSV
                </button>
            </div>

            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : logs.length === 0 ? (
                <div className={styles.emptyHint}>No audit events match the selected filters.</div>
            ) : (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead><tr>
                                <th>Timestamp</th><th>Event</th><th>Actor</th><th>Role</th><th>Resource</th><th>IP</th><th>Details</th>
                            </tr></thead>
                            <tbody>
                                {logs.map(l => {
                                    let detailStr = "";
                                    if (l.details) {
                                        try {
                                            const parsed = JSON.parse(l.details);
                                            if (parsed.query) detailStr = `"${parsed.query}"`;
                                            else if (parsed.email) detailStr = parsed.email;
                                            else detailStr = Object.entries(parsed).filter(([,v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(", ");
                                        } catch { detailStr = l.details; }
                                    }
                                    return (
                                        <tr key={l.log_id}>
                                            <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{l.created_at.slice(0, 19).replace("T", " ")}</td>
                                            <td>
                                                <span className={(styles as any)[EVENT_BADGE[l.event_type] ?? "badgeGray"]}>
                                                    {EVENT_LABELS[l.event_type] ?? l.event_type}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "0.82rem" }}>{l.actor_name ?? "—"}</td>
                                            <td className={styles.muted}>{l.actor_role ?? "—"}</td>
                                            <td className={styles.muted} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {[l.resource_type, l.resource_name].filter(Boolean).join(": ") || "—"}
                                            </td>
                                            <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{l.ip_address ?? "—"}</td>
                                            <td className={styles.muted} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={detailStr}>
                                                {detailStr || "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem", justifyContent: "center" }}>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }}
                                disabled={page === 0} onClick={() => { setPage(page - 1); load(page - 1); }}>
                                ← Prev
                            </button>
                            <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                                Page {page + 1} of {totalPages}
                            </span>
                            <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }}
                                disabled={page >= totalPages - 1} onClick={() => { setPage(page + 1); load(page + 1); }}>
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── Overview Panel ────────────────────────────────────────────────────────────

const OverviewPanel = ({ orgName, docs, team, usage }: {
    orgName: string; docs: DocFile[]; team: TeamMember[]; usage: Usage;
}) => {
    const stats = [
        { label: "Documents",    value: docs.length,           icon: "D", sub: "In your library"  },
        { label: "Team Members", value: team.length,           icon: "T", sub: "With access"       },
        { label: "Storage Used", value: fmtBytes(usage.total_bytes), icon: "S", sub: "Across all docs" },
        { label: "Queries",      value: "--",                  icon: "Q", sub: "Requires analytics" },
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

// ── Documents Panel ────────────────────────────────────────────────────────────

type QueueStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
    id:      string;
    file:    File;
    status:  QueueStatus;
    error?:  string;
}

const MAX_FILE_MB = 50;

const DocumentsPanel = ({ docs, setDocs, usage, plan, onUpgrade }: {
    docs: DocFile[];
    setDocs: React.Dispatch<React.SetStateAction<DocFile[]>>;
    usage: Usage;
    plan: string;
    onUpgrade: () => void;
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging,         setDragging]         = useState(false);
    const [uploadError,      setUploadError]      = useState<string | null>(null);
    const [docLimitReached,  setDocLimitReached]  = useState(false);
    const [categories,       setCategories]       = useState<Category[]>([]);
    const [filterCat,        setFilterCat]        = useState<string>("all");
    const [confirmDelete,    setConfirmDelete]    = useState<DocFile | null>(null);
    const [deleting,         setDeleting]         = useState<string | null>(null);

    // Category modal state
    const [showCatModal, setShowCatModal] = useState(false);
    const [newCatName,   setNewCatName]   = useState("");
    const [catError,     setCatError]     = useState<string | null>(null);

    // Upload queue state
    const [queue,       setQueue]       = useState<QueueItem[]>([]);
    const [queueCatId,  setQueueCatId]  = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);

    const limit    = (PLAN_LIMITS[plan] ?? PLAN_LIMITS.free).docs;
    const usagePct = limit >= 9_999_999 ? 0 : Math.min(100, Math.round((usage.total_docs / limit) * 100));

    const queuedCount  = queue.filter(q => q.status === "queued").length;
    const doneCount    = queue.filter(q => q.status === "done").length;
    const errorCount   = queue.filter(q => q.status === "error").length;
    const remainingSlots = limit >= 9_999_999 ? Infinity : Math.max(0, limit - usage.total_docs);
    const batchWillExceed = queuedCount > remainingSlots;

    useEffect(() => {
        fetch("/categories", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                setCategories(d.categories ?? []);
                setQueueCatId(d.categories?.[0]?.category_id ?? "");
            })
            .catch(() => {});
    }, []);

    const addToQueue = (files: File[]) => {
        if (!files.length) return;
        const items: QueueItem[] = files.map(f => ({
            id:     `q-${Date.now()}-${Math.random()}`,
            file:   f,
            status: "queued",
        }));
        setQueue(prev => [...prev, ...items]);
    };

    const removeFromQueue = (id: string) => {
        if (isUploading) return;
        setQueue(prev => prev.filter(q => q.id !== id));
    };

    const clearQueue = () => {
        if (isUploading) return;
        setQueue([]);
    };

    const uploadOne = async (item: QueueItem, catId: string) => {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading" } : q));
        const kb   = item.file.size / 1024;
        const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
        const tmpId = `tmp-${item.id}`;
        const placeholder: DocFile = {
            doc_id: tmpId, name: item.file.name, size,
            size_bytes: item.file.size,
            uploaded:   new Date().toISOString().slice(0, 10),
            status:     "processing",
            category_id:   catId || null,
            category_name: categories.find(c => c.category_id === catId)?.name ?? null,
        };
        setDocs(prev => [placeholder, ...prev]);

        try {
            const formData = new FormData();
            formData.append("file", item.file);
            if (catId) formData.append("category_id", catId);
            const res  = await fetch("/upload", { method: "POST", headers: authHeaders(), body: formData });
            const data = await res.json();

            if (!res.ok) {
                setDocs(prev => prev.filter(d => d.doc_id !== tmpId));
                if (data.limit_reached === "docs") {
                    setDocLimitReached(true);
                    setQueue(prev => prev.map(q => q.id === item.id
                        ? { ...q, status: "error", error: "Document limit reached — upgrade your plan." }
                        : q
                    ));
                } else {
                    setQueue(prev => prev.map(q => q.id === item.id
                        ? { ...q, status: "error", error: data.error ?? "Upload failed." }
                        : q
                    ));
                }
            } else {
                const doc = data.doc as { doc_id: string };
                setDocs(prev => prev.map(d =>
                    d.doc_id === tmpId ? { ...d, doc_id: doc.doc_id, status: "ready" } : d
                ));
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done" } : q));
            }
        } catch {
            setDocs(prev => prev.filter(d => d.doc_id !== tmpId));
            setQueue(prev => prev.map(q => q.id === item.id
                ? { ...q, status: "error", error: "Network error — could not reach the server." }
                : q
            ));
        }
    };

    const startUpload = async () => {
        const toUpload = queue.filter(q => q.status === "queued");
        if (!toUpload.length || isUploading) return;
        setIsUploading(true);
        setUploadError(null);
        for (const item of toUpload) {
            await uploadOne(item, queueCatId);
        }
        setIsUploading(false);
    };

    const retryFile = async (item: QueueItem) => {
        if (isUploading) return;
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "queued", error: undefined } : q));
        setIsUploading(true);
        await uploadOne({ ...item, status: "queued" }, queueCatId);
        setIsUploading(false);
    };

    const handleDelete = async (doc: DocFile) => {
        setDeleting(doc.doc_id);
        setConfirmDelete(null);
        try {
            const res = await fetch(`/documents/${doc.doc_id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });
            if (res.ok) {
                setDocs(prev => prev.filter(d => d.doc_id !== doc.doc_id));
            } else {
                const d = await res.json();
                setUploadError(d.error ?? "Delete failed.");
            }
        } catch {
            setUploadError("Network error during delete.");
        }
        setDeleting(null);
    };

    const addCategory = async () => {
        const name = newCatName.trim();
        if (!name) return;
        try {
            const res = await fetch("/categories", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!res.ok) { setCatError(data.error ?? "Failed"); return; }
            setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
            setNewCatName("");
            setCatError(null);
            setShowCatModal(false);
        } catch {
            setCatError("Network error.");
        }
    };

    const visibleDocs = filterCat === "all"
        ? docs
        : docs.filter(d => d.category_id === filterCat);

    return (
        <div className={styles.panelContent}>
            {/* Doc limit upgrade banner */}
            {docLimitReached && (
                <div className={styles.limitBanner}>
                    <span>
                        🔒 Document limit reached ({usage.total_docs} / {limit} docs on your current plan).
                    </span>
                    <button className={styles.limitUpgradeBtn} onClick={onUpgrade}>Upgrade Plan →</button>
                </div>
            )}

            {/* Toolbar */}
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
                <select
                    className={styles.formSelect}
                    style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                    value={filterCat}
                    onChange={e => setFilterCat(e.target.value)}
                >
                    <option value="all">All categories</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </select>
                <button className={styles.btnGhost} style={{ fontSize: "0.8rem" }} onClick={() => setShowCatModal(true)}>
                    + Category
                </button>
                <button className={styles.btnPrimary} onClick={() => fileRef.current?.click()}>
                    + Upload Files
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    style={{ display: "none" }}
                    onChange={e => { addToQueue(Array.from(e.target.files ?? [])); e.target.value = ""; }}
                />
            </div>

            {/* Usage meter */}
            {limit !== Infinity && (
                <div className={styles.usageMeter}>
                    <div className={styles.usageMeterLabel}>
                        <span>{usage.total_docs} / {limit} documents used</span>
                        <span className={usagePct >= 80 ? styles.usageWarn : styles.usageMuted}>{usagePct}%</span>
                    </div>
                    <div className={styles.usageBar}>
                        <div
                            className={`${styles.usageBarFill} ${usagePct >= 80 ? styles.usageBarWarn : ""}`}
                            style={{ width: `${usagePct}%` }}
                        />
                    </div>
                    {usagePct >= 80 && (
                        <div className={styles.usageWarnText}>
                            ⚠ Approaching your plan limit.{" "}
                            <button
                                style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", padding: 0, fontSize: "inherit", fontWeight: 600 }}
                                onClick={onUpgrade}
                            >Upgrade plan →</button>
                        </div>
                    )}
                </div>
            )}

            {/* Drop zone */}
            <div
                className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addToQueue(Array.from(e.dataTransfer.files)); }}
                onClick={() => fileRef.current?.click()}
            >
                <div className={styles.dropIcon}>↑</div>
                <div className={styles.dropTitle}>Drag & drop files here, or click to browse</div>
                <div className={styles.dropSub}>PDF · Word · PowerPoint · Excel · Images · TXT &nbsp;·&nbsp; Up to {MAX_FILE_MB} MB per file</div>
            </div>

            {/* Upload Queue */}
            {queue.length > 0 && (
                <div className={styles.uploadQueue}>
                    {/* Queue header */}
                    <div className={styles.queueHeader}>
                        <div className={styles.queueSummary}>
                            <span>{queue.length} file{queue.length !== 1 ? "s" : ""} selected</span>
                            {doneCount  > 0 && <span className={styles.queueDone}> · {doneCount} done</span>}
                            {errorCount > 0 && <span className={styles.queueErr}> · {errorCount} failed</span>}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <select
                                className={styles.formSelect}
                                style={{ width: "auto", fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                                value={queueCatId}
                                onChange={e => setQueueCatId(e.target.value)}
                                disabled={isUploading}
                            >
                                <option value="">No category</option>
                                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                            </select>
                            {!isUploading && (
                                <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem" }} onClick={clearQueue}>
                                    Clear
                                </button>
                            )}
                            {queuedCount > 0 && (
                                <button
                                    className={styles.btnPrimary}
                                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.9rem" }}
                                    onClick={startUpload}
                                    disabled={isUploading || batchWillExceed}
                                >
                                    {isUploading ? "Uploading…" : `Upload ${queuedCount} file${queuedCount !== 1 ? "s" : ""}`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Limit warning */}
                    {batchWillExceed && (
                        <div className={styles.queueLimitWarn}>
                            ⚠ Only {remainingSlots} slot{remainingSlots !== 1 ? "s" : ""} remaining on your plan.
                            Remove {queuedCount - remainingSlots} file{queuedCount - remainingSlots !== 1 ? "s" : ""} or upgrade your plan.
                        </div>
                    )}

                    {/* Per-file rows */}
                    <div className={styles.queueList}>
                        {queue.map(item => {
                            const mb   = item.file.size / (1024 * 1024);
                            const size = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(item.file.size / 1024)} KB`;
                            const oversize = mb > MAX_FILE_MB;
                            return (
                                <div key={item.id} className={styles.queueRow}>
                                    <div className={styles.queueFileName}>
                                        {oversize && <span className={styles.queueSizeWarn} title={`File exceeds ${MAX_FILE_MB} MB`}>⚠</span>}
                                        <span className={styles.queueName}>{item.file.name}</span>
                                        <span className={styles.queueSize}>{size}</span>
                                    </div>
                                    <div className={styles.queueRowRight}>
                                        {item.status === "queued"    && <span className={styles.queueStatusQueued}>Queued</span>}
                                        {item.status === "uploading" && <span className={styles.queueStatusUploading}>Uploading…</span>}
                                        {item.status === "done"      && <span className={styles.queueStatusDone}>✓ Done</span>}
                                        {item.status === "error"     && (
                                            <span className={styles.queueStatusError} title={item.error}>✗ Failed</span>
                                        )}
                                        {item.status === "error" && !isUploading && (
                                            <button className={styles.queueRetry} onClick={() => retryFile(item)}>Retry</button>
                                        )}
                                        {(item.status === "queued" || item.status === "error") && !isUploading && (
                                            <button className={styles.queueRemove} onClick={() => removeFromQueue(item.id)}>✕</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error banner */}
            {uploadError && (
                <div className={styles.errorBanner}>
                    ⚠ {uploadError}
                    <button className={styles.errorDismiss} onClick={() => setUploadError(null)}>×</button>
                </div>
            )}

            {/* Documents table */}
            {visibleDocs.length > 0 && (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Category</th>
                                <th>Size</th>
                                <th>Uploaded</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleDocs.map(doc => (
                                <tr key={doc.doc_id}>
                                    <td>
                                        <div className={styles.fileName}>
                                            <span className={styles.fileIcon}>F</span>
                                            {doc.name}
                                        </div>
                                    </td>
                                    <td className={styles.muted}>
                                        {doc.category_name
                                            ? <span className={styles.catChip}>{doc.category_name}</span>
                                            : <span className={styles.muted}>—</span>
                                        }
                                    </td>
                                    <td className={styles.muted}>{doc.size}</td>
                                    <td className={styles.muted}>{doc.uploaded}</td>
                                    <td>
                                        {doc.status === "ready"
                                            ? <span className={styles.badgeGreen}>Ready</span>
                                            : doc.status === "error"
                                            ? <span className={styles.badgeRed}>Error</span>
                                            : <span className={styles.badgeAmber}>Processing…</span>
                                        }
                                    </td>
                                    <td>
                                        <button
                                            className={styles.actionBtnDanger}
                                            disabled={deleting === doc.doc_id}
                                            onClick={() => setConfirmDelete(doc)}
                                        >
                                            {deleting === doc.doc_id ? "…" : "Remove"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete confirm modal */}
            {confirmDelete && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Remove Document</h3>
                        <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                            This will permanently delete <strong style={{ color: "var(--text-1)" }}>{confirmDelete.name}</strong> from the index and storage. This cannot be undone.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className={styles.btnDanger} onClick={() => handleDelete(confirmDelete)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* New category modal */}
            {showCatModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) { setShowCatModal(false); setCatError(null); } }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>New Category</h3>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Category Name</label>
                            <input
                                className={styles.formInput}
                                placeholder="e.g. Contracts, HR, Finance…"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && addCategory()}
                                autoFocus
                            />
                        </div>
                        {catError && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {catError}</div>}
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => { setShowCatModal(false); setCatError(null); }}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={addCategory}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Permissions Modal ─────────────────────────────────────────────────────────

const PermissionsModal = ({ member, onClose }: { member: TeamMember; onClose: () => void }) => {
    const [categories,   setCategories]   = useState<Category[]>([]);
    const [granted,      setGranted]      = useState<Set<string>>(new Set());
    const [loading,      setLoading]      = useState(true);
    const [saving,       setSaving]       = useState(false);
    const [saved,        setSaved]        = useState(false);

    // WhatsApp number state
    const [waNumber,   setWaNumber]   = useState(member.whatsapp_number ?? "");
    const [waSaving,   setWaSaving]   = useState(false);
    const [waMsg,      setWaMsg]      = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        Promise.all([
            fetch("/categories",                                  { headers: authHeaders() }).then(r => r.json()),
            fetch(`/team/${member.user_id}/permissions`,          { headers: authHeaders() }).then(r => r.json()),
        ]).then(([catData, permData]) => {
            setCategories(catData.categories ?? []);
            setGranted(new Set(permData.category_ids ?? []));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [member.user_id]);

    const toggle = (catId: string) => {
        setGranted(prev => {
            const next = new Set(prev);
            next.has(catId) ? next.delete(catId) : next.add(catId);
            return next;
        });
        setSaved(false);
    };

    const save = async () => {
        setSaving(true);
        await fetch(`/team/${member.user_id}/permissions`, {
            method: "PUT",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ category_ids: Array.from(granted) }),
        });
        setSaving(false);
        setSaved(true);
    };

    const saveWhatsApp = async () => {
        setWaSaving(true);
        setWaMsg(null);
        try {
            const res = await fetch(`/team/${member.user_id}/whatsapp`, {
                method: "PATCH",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ whatsapp_number: waNumber.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setWaMsg({ ok: true, text: "WhatsApp number saved." });
            } else {
                setWaMsg({ ok: false, text: data.error ?? "Failed to save." });
            }
        } catch {
            setWaMsg({ ok: false, text: "Network error." });
        } finally {
            setWaSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal}>
                <h3 className={styles.modalTitle}>Settings — {member.name}</h3>
                <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                    Manage document access and WhatsApp configuration for this team member.
                </p>

                {/* Document Category Permissions */}
                <div style={{ marginBottom: "1.25rem" }}>
                    <div className={styles.settingsCardTitle} style={{ marginBottom: "0.6rem" }}>
                        Document Access
                    </div>
                    {loading ? (
                        <div style={{ padding: "1rem 0", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                    ) : categories.length === 0 ? (
                        <div style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>
                            No categories yet. Create categories in the Documents tab first.
                        </div>
                    ) : (
                        <div className={styles.permList}>
                            {categories.map(cat => (
                                <label key={cat.category_id} className={styles.permRow}>
                                    <input
                                        type="checkbox"
                                        className={styles.permCheck}
                                        checked={granted.has(cat.category_id)}
                                        onChange={() => toggle(cat.category_id)}
                                    />
                                    <span className={styles.permLabel}>{cat.name}</span>
                                    {granted.has(cat.category_id)
                                        ? <span className={styles.badgeGreen} style={{ marginLeft: "auto" }}>Access granted</span>
                                        : <span className={styles.badgeGray}  style={{ marginLeft: "auto" }}>No access</span>
                                    }
                                </label>
                            ))}
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
                        <span className={styles.permSummary}>{granted.size} of {categories.length} categories accessible</span>
                        <button className={styles.btnPrimary} onClick={save} disabled={saving || categories.length === 0} style={{ padding: "0.4rem 1rem" }}>
                            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Access"}
                        </button>
                    </div>
                </div>

                {/* WhatsApp Number */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.1rem" }}>
                    <div className={styles.settingsCardTitle} style={{ marginBottom: "0.5rem" }}>
                        WhatsApp Number
                    </div>
                    <p className={styles.muted} style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                        When set, this employee can query their documents directly from WhatsApp. Use E.164 format (e.g. +923001234567).
                    </p>
                    {waMsg && (
                        <div className={waMsg.ok ? styles.successBanner : styles.errorBanner} style={{ marginBottom: "0.6rem", fontSize: "0.8rem" }}>
                            {waMsg.text}
                        </div>
                    )}
                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                        <input
                            className={styles.formInput}
                            type="tel"
                            placeholder="+923001234567"
                            value={waNumber}
                            onChange={e => { setWaNumber(e.target.value); setWaMsg(null); }}
                            style={{ flex: 1 }}
                        />
                        <button className={styles.btnPrimary} onClick={saveWhatsApp} disabled={waSaving} style={{ padding: "0.4rem 1rem", whiteSpace: "nowrap" }}>
                            {waSaving ? "Saving…" : "Save"}
                        </button>
                        {waNumber && (
                            <button className={styles.btnGhost} onClick={() => { setWaNumber(""); setWaMsg(null); }} style={{ padding: "0.4rem 0.75rem" }}>
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button className={styles.btnGhost} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// ── Team Panel ────────────────────────────────────────────────────────────────

const TeamPanel = ({ team, setTeam, maxUsers, onUpgrade }: {
    team: TeamMember[];
    setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
    maxUsers: number;
    onUpgrade: () => void;
}) => {
    const [showModal,    setShowModal]    = useState(false);
    const [form,         setForm]         = useState({ name: "", email: "", role: "employee" });
    const [inviteError,  setInviteError]  = useState<string | null>(null);
    const [limitReached, setLimitReached] = useState(false);
    const [tempCreds,    setTempCreds]    = useState<{ email: string; password: string } | null>(null);
    const [removing,     setRemoving]     = useState<string | null>(null);
    const [permMember,   setPermMember]   = useState<TeamMember | null>(null);

    const atLimit = maxUsers > 0 && team.length >= maxUsers;

    const invite = async () => {
        if (!form.name.trim() || !form.email.trim()) { setInviteError("Name and email are required."); return; }
        try {
            const res = await fetch("/team", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.limit_reached === "users") { setLimitReached(true); setShowModal(false); return; }
                setInviteError(data.error ?? "Failed to invite."); return;
            }
            setTeam(prev => [...prev, {
                user_id: data.user_id,
                name: data.name,
                email: data.email,
                role: data.role,
                joined: new Date().toISOString().slice(0, 10),
            }]);
            setTempCreds({ email: data.email, password: data.temp_password });
            setShowModal(false);
            setForm({ name: "", email: "", role: "employee" });
            setInviteError(null);
        } catch {
            setInviteError("Network error.");
        }
    };

    const removeMember = async (member: TeamMember) => {
        setRemoving(member.user_id);
        try {
            await fetch(`/team/${member.user_id}`, { method: "DELETE", headers: authHeaders() });
            setTeam(prev => prev.filter(m => m.user_id !== member.user_id));
        } catch { /* silent */ }
        setRemoving(null);
    };

    return (
        <div className={styles.panelContent}>
            {/* Seat limit upgrade banner */}
            {(limitReached || atLimit) && (
                <div className={styles.limitBanner}>
                    <span>
                        🔒 You've reached your seat limit ({team.length} / {maxUsers} users on your current plan).
                    </span>
                    <button className={styles.limitUpgradeBtn} onClick={onUpgrade}>Upgrade Plan →</button>
                </div>
            )}

            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>
                    {team.length} / {maxUsers > 0 ? maxUsers : "∞"} seats used
                </span>
                <button
                    className={styles.btnPrimary}
                    onClick={() => { if (atLimit) { setLimitReached(true); return; } setShowModal(true); setInviteError(null); }}
                    title={atLimit ? "Seat limit reached — upgrade to add more members" : undefined}
                >
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
                        {team.map(m => (
                            <tr key={m.user_id}>
                                <td><strong>{m.name}</strong></td>
                                <td className={styles.muted}>{m.email}</td>
                                <td>
                                    <span className={m.role === "org_owner" ? styles.badgeGold : styles.badgeGray}>
                                        {ROLE_LABELS[m.role] ?? m.role}
                                    </span>
                                </td>
                                <td className={styles.muted}>{fmtDate(m.joined)}</td>
                                <td style={{ display: "flex", gap: "0.5rem" }}>
                                    {m.role !== "org_owner" && (
                                        <>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => setPermMember(m)}
                                            >
                                                Permissions
                                            </button>
                                            <button
                                                className={styles.actionBtnDanger}
                                                disabled={removing === m.user_id}
                                                onClick={() => removeMember(m)}
                                            >
                                                {removing === m.user_id ? "…" : "Remove"}
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Invite modal */}
            {showModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Invite Team Member</h3>
                        {inviteError && (
                            <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {inviteError}</div>
                        )}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Full Name</label>
                            <input className={styles.formInput} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ali Raza" />
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

            {/* Permissions modal */}
            {permMember && (
                <PermissionsModal member={permMember} onClose={() => setPermMember(null)} />
            )}

            {/* Temp credentials modal */}
            {tempCreds && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setTempCreds(null); }}>
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Member Invited ✓</h3>
                        <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                            Share these temporary credentials with the new member. They will be prompted to set a new password on first login.
                        </p>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Email</label>
                            <input className={styles.formInput} readOnly value={tempCreds.email} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Temporary Password</label>
                            <input className={styles.formInput} readOnly value={tempCreds.password} />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnPrimary} onClick={() => setTempCreds(null)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Subscription Panel ────────────────────────────────────────────────────────

// ── Invoices Panel ────────────────────────────────────────────────────────────

const InvoicesPanel = () => {
    const [invoices,     setInvoices]     = useState<Invoice[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [viewInvoice,  setViewInvoice]  = useState<Invoice | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [updating,     setUpdating]     = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        fetch("/invoices", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openInvoice = (inv: Invoice) => {
        fetch(`/invoices/${inv.invoice_id}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setViewInvoice(d))
            .catch(() => {});
    };

    const updateStatus = async (inv: Invoice, status: string) => {
        setUpdating(inv.invoice_id);
        await fetch(`/invoices/${inv.invoice_id}`, {
            method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        setUpdating(null);
        load();
        if (viewInvoice?.invoice_id === inv.invoice_id) {
            setViewInvoice(v => v ? { ...v, status: status as Invoice["status"] } : v);
        }
    };

    const printInvoice = (inv: Invoice) => {
        const fees = inv.fees ?? [];
        const total = fees.reduce((s, f) => s + f.amount, 0);
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b8972e; padding-bottom: 20px; margin-bottom: 24px; }
  .brand { font-size: 1.4rem; font-weight: 700; color: #b8972e; }
  .invoice-meta { text-align: right; }
  .invoice-num { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; }
  .badge { display: inline-block; background: #b8972e22; color: #b8972e; border: 1px solid #b8972e55; border-radius: 100px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #888; font-weight: 600; margin-bottom: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f8f4e8; text-align: left; padding: 8px 10px; font-size: 0.78rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 0.875rem; }
  .amount { text-align: right; font-weight: 600; }
  .total-row td { font-weight: 700; font-size: 1rem; background: #f8f4e8; border-top: 2px solid #b8972e; }
  .footer { margin-top: 40px; font-size: 0.78rem; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 0; } button { display: none; } }
</style></head><body>
<div class="header">
  <div><div class="brand">Project Ease</div><div style="font-size:0.8rem;color:#888;margin-top:4px;">Legal Document Intelligence</div></div>
  <div class="invoice-meta">
    <div class="invoice-num">${inv.invoice_number}</div>
    <div style="margin:4px 0"><span class="badge">${inv.status}</span></div>
    <div style="font-size:0.8rem;color:#888;">Issued: ${inv.issued_date}</div>
    ${inv.due_date ? `<div style="font-size:0.8rem;color:#888;">Due: ${inv.due_date}</div>` : ""}
  </div>
</div>
<div class="grid2">
  <div class="section">
    <div class="section-title">Bill To</div>
    <div style="font-weight:600">${inv.client_name ?? "—"}</div>
    ${inv.client_email ? `<div style="font-size:0.83rem;color:#666">${inv.client_email}</div>` : ""}
    ${inv.client_phone ? `<div style="font-size:0.83rem;color:#666">${inv.client_phone}</div>` : ""}
  </div>
  <div class="section">
    <div class="section-title">Matter</div>
    <div style="font-weight:600">${inv.matter_title ?? "—"}</div>
    ${inv.case_number ? `<div style="font-size:0.83rem;color:#666">Case #${inv.case_number}</div>` : ""}
  </div>
</div>
<div class="section">
  <div class="section-title">Invoice Title</div>
  <div style="font-weight:600">${inv.title}</div>
</div>
<table>
  <thead><tr><th>Description</th><th>Type</th><th>Date</th><th class="amount">Amount (PKR)</th></tr></thead>
  <tbody>
    ${fees.map(f => `<tr><td>${f.description}</td><td>${f.fee_type}</td><td>${f.fee_date}</td><td class="amount">${f.amount.toLocaleString("en-PK")}</td></tr>`).join("")}
  </tbody>
  <tfoot>
    <tr class="total-row"><td colspan="3" style="text-align:right">Total</td><td class="amount">PKR ${total.toLocaleString("en-PK")}</td></tr>
  </tfoot>
</table>
${inv.notes ? `<div class="section" style="margin-top:20px"><div class="section-title">Notes</div><div>${inv.notes}</div></div>` : ""}
<div class="footer">Generated by Project Ease &nbsp;·&nbsp; projectease.ai</div>
</body></html>`;
        const w = window.open("", "_blank");
        if (!w) { alert("Please allow pop-ups to print invoices."); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    // ── Task #168: Cash Receipt (Raseed) print ───────────────────────────────
    const printReceipt = (inv: Invoice) => {
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
  .page { max-width: 420px; margin: 32px auto; border: 2px solid #b8972e; border-radius: 8px; padding: 32px; }
  .title { text-align: center; font-size: 1.4rem; font-weight: 800; color: #b8972e; letter-spacing: 0.05em; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 0.8rem; color: #888; margin-bottom: 24px; }
  .receipt-no { text-align: center; font-size: 0.9rem; font-weight: 600; color: #444; margin-bottom: 24px; }
  .row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ddd; padding: 8px 0; font-size: 0.9rem; }
  .label { color: #888; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .value { font-weight: 600; }
  .amount-box { text-align: center; background: #fdf8ec; border: 2px solid #b8972e; border-radius: 6px; padding: 16px; margin: 20px 0; }
  .amount-label { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.08em; }
  .amount-value { font-size: 1.8rem; font-weight: 800; color: #b8972e; }
  .sig { display: flex; justify-content: space-between; margin-top: 40px; font-size: 0.8rem; color: #888; }
  .sig-line { border-top: 1px solid #888; padding-top: 4px; min-width: 140px; text-align: center; }
  .footer { text-align: center; font-size: 0.72rem; color: #ccc; margin-top: 24px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="page">
  <div class="title">رسید / CASH RECEIPT</div>
  <div class="subtitle">Project Ease — Legal Practice Management</div>
  <div class="receipt-no">Receipt against Invoice: ${inv.invoice_number}</div>
  <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</span></div>
  <div class="row"><span class="label">Received From</span><span class="value">${inv.client_name ?? "—"}</span></div>
  <div class="row"><span class="label">Matter / Case</span><span class="value">${inv.matter_title ?? "—"}${inv.case_number ? ` (${inv.case_number})` : ""}</span></div>
  <div class="row"><span class="label">In Payment Of</span><span class="value">${inv.title}</span></div>
  <div class="amount-box">
    <div class="amount-label">Amount Received (PKR)</div>
    <div class="amount-value">PKR ${inv.total_amount.toLocaleString("en-PK")}</div>
  </div>
  <div class="sig">
    <div class="sig-line">Received By / دستخط</div>
    <div class="sig-line">Date / تاریخ</div>
  </div>
  <div class="footer">This is a computer-generated receipt. For queries call the issuing office.</div>
</div>
</body></html>`;
        const w = window.open("", "_blank");
        if (!w) { alert("Please allow pop-ups to print receipts."); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    const filtered = statusFilter === "all" ? invoices : invoices.filter(i => i.status === statusFilter);

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {(["all","draft","sent","paid","cancelled"] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            style={{
                                padding: "0.28rem 0.75rem", borderRadius: 100, fontSize: "0.78rem", fontWeight: 600,
                                cursor: "pointer", textTransform: "capitalize",
                                border: statusFilter === s ? "1px solid var(--gold)" : "1px solid var(--border)",
                                background: statusFilter === s ? "var(--gold)" : "transparent",
                                color: statusFilter === s ? "#1a1200" : "var(--text-2)",
                            }}>{s}</button>
                    ))}
                    <span className={styles.muted} style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
                </div>
            </div>

            {loading ? (
                <div className={styles.emptyHint}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.emptyHint}>
                    No invoices yet. Open a matter, add fees, then click "Generate Invoice".
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead><tr>
                            <th>Invoice #</th><th>Title</th><th>Matter</th><th>Client</th>
                            <th style={{ textAlign: "right" }}>Amount (PKR)</th>
                            <th>Issued</th><th>Status</th><th>Actions</th>
                        </tr></thead>
                        <tbody>
                            {filtered.map(inv => (
                                <tr key={inv.invoice_id}>
                                    <td><button className={styles.linkBtn} onClick={() => openInvoice(inv)}>{inv.invoice_number}</button></td>
                                    <td>{inv.title}</td>
                                    <td className={styles.muted}>{inv.matter_title ?? "—"}</td>
                                    <td className={styles.muted}>{inv.client_name ?? "—"}</td>
                                    <td style={{ textAlign: "right", fontWeight: 600 }}>{inv.total_amount.toLocaleString("en-PK")}</td>
                                    <td className={styles.muted}>{inv.issued_date}</td>
                                    <td><span className={(styles as any)[INVOICE_STATUS_BADGE[inv.status] ?? "badgeGray"]} style={{ fontSize: "0.72rem" }}>{inv.status}</span></td>
                                    <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                        <button className={styles.actionBtn} onClick={() => openInvoice(inv)}>View</button>
                                        <button className={styles.actionBtn} onClick={() => printInvoice(inv)}>Print</button>
                                        {inv.status === "paid" && <button className={styles.actionBtn} onClick={() => printReceipt(inv)} title="Print cash receipt / raseed">🧾 Raseed</button>}
                                        {inv.status === "draft" && (
                                            <button className={styles.actionBtn} disabled={updating === inv.invoice_id}
                                                onClick={() => updateStatus(inv, "sent")}>Mark Sent</button>
                                        )}
                                        {inv.status === "sent" && (
                                            <button className={styles.actionBtn} disabled={updating === inv.invoice_id}
                                                onClick={() => updateStatus(inv, "paid")}>Mark Paid</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Invoice detail modal */}
            {viewInvoice && (
                <div className={styles.overlay} onClick={() => setViewInvoice(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{viewInvoice.invoice_number}</div>
                                <div className={styles.muted} style={{ fontSize: "0.82rem" }}>{viewInvoice.title}</div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <span className={(styles as any)[INVOICE_STATUS_BADGE[viewInvoice.status] ?? "badgeGray"]}>{viewInvoice.status}</span>
                                <button className={styles.btnGhost} style={{ fontSize: "0.78rem" }} onClick={() => printInvoice(viewInvoice)}>🖨 Print</button>
                                <button className={styles.btnGhost} onClick={() => setViewInvoice(null)}>Close</button>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", fontSize: "0.83rem" }}>
                            <div><span className={styles.muted}>Client: </span>{viewInvoice.client_name ?? "—"}</div>
                            <div><span className={styles.muted}>Matter: </span>{viewInvoice.matter_title ?? "—"}</div>
                            <div><span className={styles.muted}>Issued: </span>{viewInvoice.issued_date}</div>
                            {viewInvoice.due_date && <div><span className={styles.muted}>Due: </span>{viewInvoice.due_date}</div>}
                        </div>

                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead><tr><th>Description</th><th>Type</th><th>Date</th><th style={{ textAlign: "right" }}>PKR</th></tr></thead>
                                <tbody>
                                    {(viewInvoice.fees ?? []).map(f => (
                                        <tr key={f.fee_id}>
                                            <td>{f.description}</td>
                                            <td className={styles.muted}>{f.fee_type}</td>
                                            <td className={styles.muted}>{f.fee_date}</td>
                                            <td style={{ textAlign: "right", fontWeight: 600 }}>{f.amount.toLocaleString("en-PK")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Gross Amount</td>
                                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                                            PKR {viewInvoice.total_amount.toLocaleString("en-PK")}
                                        </td>
                                    </tr>
                                    {(viewInvoice.wht_rate ?? 0) > 0 && (<>
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: "right", color: "#dc2626", fontSize: "0.85rem" }}>
                                                WHT @ {((viewInvoice.wht_rate ?? 0) * 100).toFixed(0)}% (§153 ITO 2001 — Corporate deduction)
                                            </td>
                                            <td style={{ textAlign: "right", color: "#dc2626", fontSize: "0.85rem" }}>
                                                − PKR {(viewInvoice.wht_amount ?? 0).toLocaleString("en-PK")}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Net Payable</td>
                                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--gold)" }}>
                                                PKR {(viewInvoice.net_payable ?? viewInvoice.total_amount).toLocaleString("en-PK")}
                                            </td>
                                        </tr>
                                    </>)}
                                    {!(viewInvoice.wht_rate ?? 0) && (
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Net Payable</td>
                                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--gold)" }}>
                                                PKR {viewInvoice.total_amount.toLocaleString("en-PK")}
                                            </td>
                                        </tr>
                                    )}
                                    {(viewInvoice.client_ntn || viewInvoice.org_ntn) && (
                                        <tr>
                                            <td colSpan={4} style={{ fontSize: "0.78rem", color: "var(--text-3)", paddingTop: "0.4rem" }}>
                                                {viewInvoice.org_ntn && `Firm NTN/Bar: ${viewInvoice.org_ntn}`}
                                                {viewInvoice.org_ntn && viewInvoice.client_ntn && " · "}
                                                {viewInvoice.client_ntn && `Client NTN/CNIC: ${viewInvoice.client_ntn}`}
                                            </td>
                                        </tr>
                                    )}
                                </tfoot>
                            </table>
                        </div>

                        <div className={styles.modalActions} style={{ marginTop: "1rem", justifyContent: "flex-end" }}>
                            {viewInvoice.status === "draft" && <button className={styles.btnGhost} onClick={() => updateStatus(viewInvoice, "sent")}>Mark Sent</button>}
                            {viewInvoice.status === "sent"  && <button className={styles.btnPrimary} onClick={() => updateStatus(viewInvoice, "paid")}>Mark Paid</button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Court Calendar Panel ──────────────────────────────────────────────────────

interface Hearing {
    hearing_id:          string;
    matter_id:           string | null;
    title:               string;
    hearing_date:        string;   // YYYY-MM-DD
    hearing_time:        string | null;
    court_name:          string | null;
    judge_name:          string | null;
    notes:               string | null;
    wa_reminder:         number;
    matter_title:        string | null;
    case_number:         string | null;
    // Task #163/#164
    hearing_outcome:     string | null;
    adj_reason:          string | null;
    next_date_fixed_by:  string | null;
    assigned_to:         string | null;
    assigned_to_name:    string | null;
}

interface Deadline {
    deadline_id:    string;
    matter_id:      string | null;
    title:          string;
    due_date:       string;   // YYYY-MM-DD
    deadline_type:  string;
    notes:          string | null;
    is_completed:   number;
    wa_reminder:    number;
    matter_title:   string | null;
    case_number:    string | null;
}

type CalEvent = ({ kind: "hearing" } & Hearing) | ({ kind: "deadline" } & Deadline);

const DEADLINE_TYPES = ["Filing", "Response", "Appeal", "Service", "Payment", "Other"] as const;

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DOW    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function isoDate(y: number, m: number, d: number): string {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function daysInMonth(y: number, m: number): number {
    return new Date(y, m + 1, 0).getDate();
}

function firstDow(y: number, m: number): number {
    return new Date(y, m, 1).getDay();
}

const CalendarPanel = () => {
    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [hearings,  setHearings]  = useState<Hearing[]>([]);
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [matters,   setMatters]   = useState<{ matter_id: string; title: string }[]>([]);
    const [teamMembers, setTeamMembers] = useState<{ user_id: string; name: string }[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [selected,  setSelected]  = useState<string | null>(null);  // YYYY-MM-DD

    // Modal state — shared for add/edit
    type ModalMode = "add-hearing" | "add-deadline" | "edit-hearing" | "edit-deadline" | null;
    const [modal,     setModal]     = useState<ModalMode>(null);
    const [editTarget, setEditTarget] = useState<Hearing | Deadline | null>(null);

    // Form fields
    const [fTitle,     setFTitle]     = useState("");
    const [fDate,      setFDate]      = useState("");
    const [fTime,      setFTime]      = useState("");
    const [fCourt,     setFCourt]     = useState("");
    const [fJudge,     setFJudge]     = useState("");
    const [fDLType,    setFDLType]    = useState<string>("Filing");
    const [fMatter,    setFMatter]    = useState("");
    const [fNotes,     setFNotes]     = useState("");
    const [fWA,        setFWA]        = useState(false);
    const [fOutcome,   setFOutcome]   = useState("");          // Task #163
    const [fAdjReason, setFAdjReason] = useState("");          // Task #163
    const [fNextBy,    setFNextBy]    = useState("");          // Task #164
    const [fAssignedTo, setFAssignedTo] = useState("");        // Associate dispatch

    // Bulk WhatsApp — court holiday notice
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [holidayFrom, setHolidayFrom] = useState("");
    const [holidayTo,   setHolidayTo]   = useState("");
    const [holidayMsg,  setHolidayMsg]  = useState("");
    const [holidayPreview, setHolidayPreview] = useState<{ client_id: string; client_name: string; matter_titles: string }[] | null>(null);
    const [holidayLoading, setHolidayLoading] = useState(false);
    const [holidaySending, setHolidaySending] = useState(false);
    const [holidayResult,  setHolidayResult]  = useState<{ notified: number; failed: number; skipped_no_phone: number } | null>(null);
    const [holidayErr,     setHolidayErr]     = useState("");
    const [fSaving,    setFSaving]    = useState(false);
    const [fErr,       setFErr]       = useState("");

    const fromDate = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-01`;
    const toDate   = isoDate(viewYear, viewMonth, daysInMonth(viewYear, viewMonth));

    const load = () => {
        setLoading(true);
        Promise.all([
            fetch(`/hearings?from_date=${fromDate}&to_date=${toDate}`, { headers: authHeaders() }).then(r => r.json()),
            fetch(`/deadlines?from_date=${fromDate}&to_date=${toDate}`, { headers: authHeaders() }).then(r => r.json()),
            fetch("/matters", { headers: authHeaders() }).then(r => r.json()),
            fetch("/team", { headers: authHeaders() }).then(r => r.json()).catch(() => ({ members: [] })),
        ]).then(([h, d, m, t]) => {
            setHearings(Array.isArray(h) ? h : []);
            setDeadlines(Array.isArray(d) ? d : []);
            setMatters((m.matters ?? []).map((x: any) => ({ matter_id: x.matter_id, title: x.title })));
            setTeamMembers((t.members ?? []).map((x: any) => ({ user_id: x.user_id, name: x.name })));
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { load(); }, [viewYear, viewMonth]);

    // Map date → events
    const eventsByDate: Record<string, CalEvent[]> = {};
    hearings.forEach(h => {
        const k = h.hearing_date;
        eventsByDate[k] = [...(eventsByDate[k] ?? []), { kind: "hearing", ...h }];
    });
    deadlines.forEach(d => {
        const k = d.due_date;
        eventsByDate[k] = [...(eventsByDate[k] ?? []), { kind: "deadline", ...d }];
    });

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
        setSelected(null);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
        setSelected(null);
    };

    const openAdd = (kind: "hearing" | "deadline", date?: string) => {
        setFTitle(""); setFDate(date ?? ""); setFTime(""); setFCourt(""); setFJudge("");
        setFDLType("Filing"); setFMatter(""); setFNotes(""); setFWA(false);
        setFOutcome(""); setFAdjReason(""); setFNextBy(""); setFAssignedTo("");
        setFErr(""); setEditTarget(null);
        setModal(kind === "hearing" ? "add-hearing" : "add-deadline");
    };

    const openEdit = (ev: CalEvent) => {
        setEditTarget(ev);
        setFErr(""); setFSaving(false);
        if (ev.kind === "hearing") {
            setFTitle(ev.title); setFDate(ev.hearing_date); setFTime(ev.hearing_time ?? "");
            setFCourt(ev.court_name ?? ""); setFJudge(ev.judge_name ?? "");
            setFMatter(ev.matter_id ?? ""); setFNotes(ev.notes ?? "");
            setFWA(!!ev.wa_reminder);
            setFOutcome(ev.hearing_outcome ?? ""); setFAdjReason(ev.adj_reason ?? ""); setFNextBy(ev.next_date_fixed_by ?? "");
            setFAssignedTo(ev.assigned_to ?? "");
            setModal("edit-hearing");
        } else {
            setFTitle(ev.title); setFDate(ev.due_date); setFDLType(ev.deadline_type);
            setFMatter(ev.matter_id ?? ""); setFNotes(ev.notes ?? "");
            setFWA(!!ev.wa_reminder); setModal("edit-deadline");
        }
    };

    const closeModal = () => { setModal(null); setEditTarget(null); };

    const openHolidayModal = () => {
        setHolidayFrom(todayStr); setHolidayTo(todayStr); setHolidayMsg("");
        setHolidayPreview(null); setHolidayResult(null); setHolidayErr("");
        setShowHolidayModal(true);
    };

    const loadHolidayPreview = async () => {
        if (!holidayFrom) return;
        setHolidayLoading(true); setHolidayErr(""); setHolidayResult(null);
        try {
            const r = await fetch(`/calendar/notify-holiday/preview?from_date=${holidayFrom}&to_date=${holidayTo || holidayFrom}`, { headers: authHeaders() });
            const d = await r.json();
            if (!r.ok) setHolidayErr(d.error ?? "Could not load preview.");
            else setHolidayPreview(d.clients ?? []);
        } catch { setHolidayErr("Network error."); }
        finally { setHolidayLoading(false); }
    };

    const sendHolidayNotify = async () => {
        setHolidaySending(true); setHolidayErr("");
        try {
            const r = await fetch("/calendar/notify-holiday", {
                method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ from_date: holidayFrom, to_date: holidayTo || holidayFrom, message: holidayMsg || undefined }),
            });
            const d = await r.json();
            if (!r.ok) setHolidayErr(d.error ?? "Send failed.");
            else setHolidayResult(d);
        } catch { setHolidayErr("Network error."); }
        finally { setHolidaySending(false); }
    };

    const saveHearing = async () => {
        if (!fTitle.trim() || !fDate) { setFErr("Title and date are required."); return; }
        setFSaving(true); setFErr("");
        const body = {
            title: fTitle.trim(), hearing_date: fDate,
            hearing_time: fTime || undefined, court_name: fCourt || undefined,
            judge_name: fJudge || undefined, matter_id: fMatter || undefined,
            notes: fNotes || undefined, wa_reminder: fWA,
            hearing_outcome: fOutcome || undefined,
            adj_reason: fAdjReason || undefined,
            next_date_fixed_by: fNextBy || undefined,
            assigned_to: fAssignedTo || undefined,
        };
        try {
            let r: Response;
            if (modal === "edit-hearing" && editTarget) {
                r = await fetch(`/hearings/${(editTarget as Hearing).hearing_id}`, {
                    method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                r = await fetch("/hearings", {
                    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }
            if (!r.ok) { const d = await r.json().catch(() => ({})); setFErr(d.error ?? "Save failed."); }
            else { closeModal(); load(); }
        } catch { setFErr("Network error."); }
        finally { setFSaving(false); }
    };

    const saveDeadline = async () => {
        if (!fTitle.trim() || !fDate) { setFErr("Title and date are required."); return; }
        setFSaving(true); setFErr("");
        const body = {
            title: fTitle.trim(), due_date: fDate, deadline_type: fDLType,
            matter_id: fMatter || undefined, notes: fNotes || undefined, wa_reminder: fWA,
        };
        try {
            let r: Response;
            if (modal === "edit-deadline" && editTarget) {
                r = await fetch(`/deadlines/${(editTarget as Deadline).deadline_id}`, {
                    method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            } else {
                r = await fetch("/deadlines", {
                    method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
            }
            if (!r.ok) { const d = await r.json().catch(() => ({})); setFErr(d.error ?? "Save failed."); }
            else { closeModal(); load(); }
        } catch { setFErr("Network error."); }
        finally { setFSaving(false); }
    };

    const toggleComplete = async (dl: Deadline) => {
        await fetch(`/deadlines/${dl.deadline_id}`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ is_completed: dl.is_completed ? 0 : 1 }),
        });
        load();
    };

    const deleteEvent = async (ev: CalEvent) => {
        if (!confirm(`Delete "${ev.title}"?`)) return;
        if (ev.kind === "hearing") {
            await fetch(`/hearings/${ev.hearing_id}`, { method: "DELETE", headers: authHeaders() });
        } else {
            await fetch(`/deadlines/${ev.deadline_id}`, { method: "DELETE", headers: authHeaders() });
        }
        load();
    };

    // Upcoming events across the whole loaded month, sorted by date
    const allEvents: CalEvent[] = [
        ...hearings.map(h => ({ kind: "hearing" as const, ...h })),
        ...deadlines.map(d => ({ kind: "deadline" as const, ...d })),
    ].sort((a, b) => {
        const da = a.kind === "hearing" ? a.hearing_date : a.due_date;
        const db = b.kind === "hearing" ? b.hearing_date : b.due_date;
        return da.localeCompare(db);
    });

    const selectedEvents = selected ? (eventsByDate[selected] ?? []) : [];
    const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

    // Calendar grid
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDow  = firstDow(viewYear, viewMonth);
    const cells: (number | null)[] = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const isHearing = (ev: CalEvent): ev is { kind: "hearing" } & Hearing => ev.kind === "hearing";

    return (
        <div className={styles.panelContent}>
            <div className={styles.calLayout}>

                {/* ── Left: Month grid ── */}
                <div className={styles.calMain}>
                    {/* Month nav */}
                    <div className={styles.calMonthNav}>
                        <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
                        <span className={styles.calMonthLabel}>{MONTHS[viewMonth]} {viewYear}</span>
                        <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
                        <button className={styles.btnGhost} style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelected(todayStr); }}>
                            Today
                        </button>
                        <button className={styles.btnSecondary} style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", background: "#25d366", color: "#fff", borderColor: "#25d366" }}
                            onClick={openHolidayModal} title="Notify all clients with hearings/deadlines in a date range that court is closed">
                            📢 Notify Clients — Court Holiday
                        </button>
                    </div>

                    {/* Day-of-week header */}
                    <div className={styles.calGrid}>
                        {DOW.map(d => (
                            <div key={d} className={styles.calDowCell}>{d}</div>
                        ))}

                        {loading ? (
                            <div style={{ gridColumn: "1/-1", padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                        ) : cells.map((day, idx) => {
                            if (day === null) return <div key={`e${idx}`} className={styles.calEmptyCell} />;
                            const dateStr = isoDate(viewYear, viewMonth, day);
                            const evs     = eventsByDate[dateStr] ?? [];
                            const isToday = dateStr === todayStr;
                            const isSel   = dateStr === selected;
                            return (
                                <div
                                    key={dateStr}
                                    className={[
                                        styles.calDayCell,
                                        isToday ? styles.calToday : "",
                                        isSel   ? styles.calSelected : "",
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => setSelected(isSel ? null : dateStr)}
                                >
                                    <span className={styles.calDayNum}>{day}</span>
                                    {evs.length > 0 && (
                                        <div className={styles.calDots}>
                                            {evs.slice(0, 3).map((ev, i) => (
                                                <span
                                                    key={i}
                                                    className={isHearing(ev) ? styles.calDotHearing : styles.calDotDeadline}
                                                    style={isHearing(ev) ? {} : { opacity: ev.is_completed ? 0.35 : 1 }}
                                                />
                                            ))}
                                            {evs.length > 3 && <span className={styles.calDotMore}>+{evs.length-3}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className={styles.calLegend}>
                        <span className={styles.calDotHearing} /> Hearing
                        <span className={styles.calDotDeadline} style={{ marginLeft: "0.75rem" }} /> Deadline
                    </div>
                </div>

                {/* ── Right: Sidebar ── */}
                <div className={styles.calSidebar}>
                    <div className={styles.calSidebarHeader}>
                        <span className={styles.calSidebarTitle}>
                            {selected
                                ? new Date(selected + "T00:00:00").toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })
                                : "Upcoming This Month"}
                        </span>
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                            <button className={styles.btnPrimary} style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                                onClick={() => openAdd("hearing", selected ?? undefined)}>
                                + Hearing
                            </button>
                            <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                                onClick={() => openAdd("deadline", selected ?? undefined)}>
                                + Deadline
                            </button>
                        </div>
                    </div>

                    <div className={styles.calEventList}>
                        {(selected ? selectedEvents : allEvents).length === 0 ? (
                            <div className={styles.emptyHint}>
                                {selected ? "No events on this day." : "No events this month."}
                            </div>
                        ) : (
                            (selected ? selectedEvents : allEvents).map((ev, i) => {
                                const dateLabel = isHearing(ev) ? ev.hearing_date : ev.due_date;
                                const timeLabel = isHearing(ev) && ev.hearing_time ? ` · ${ev.hearing_time}` : "";
                                const subLabel  = isHearing(ev)
                                    ? ev.court_name ?? ev.matter_title ?? ""
                                    : `${ev.deadline_type}${ev.matter_title ? " · " + ev.matter_title : ""}`;
                                return (
                                    <div key={i} className={[
                                        styles.calEventCard,
                                        isHearing(ev) ? styles.calEventHearing : styles.calEventDeadline,
                                        !isHearing(ev) && ev.is_completed ? styles.calEventCompleted : "",
                                    ].filter(Boolean).join(" ")}>
                                        <div className={styles.calEventTop}>
                                            <div className={styles.calEventTitle}>
                                                {!isHearing(ev) && ev.is_completed && <span style={{ textDecoration: "line-through", opacity: 0.5 }}>{ev.title}</span>}
                                                {(isHearing(ev) || !ev.is_completed) && ev.title}
                                            </div>
                                            <div className={styles.calEventActions}>
                                                {!isHearing(ev) && (
                                                    <button className={styles.calCheckBtn}
                                                        title={ev.is_completed ? "Mark incomplete" : "Mark complete"}
                                                        onClick={() => toggleComplete(ev as Deadline)}>
                                                        {ev.is_completed ? "↩" : "✓"}
                                                    </button>
                                                )}
                                                <button className={styles.calEditBtn} onClick={() => openEdit(ev)}>✎</button>
                                                <button className={styles.calDelBtn} onClick={() => deleteEvent(ev)}>✕</button>
                                            </div>
                                        </div>
                                        <div className={styles.calEventMeta}>
                                            {!selected && <span>{dateLabel}{timeLabel}</span>}
                                            {selected && isHearing(ev) && ev.hearing_time && <span>{ev.hearing_time}</span>}
                                            {subLabel && <span>{subLabel}</span>}
                                            {ev.wa_reminder === 1 && <span className={styles.calWABadge}>📲 WA</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Add/Edit Modal ── */}
            {modal && (
                <div className={styles.overlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className={styles.modalTitle}>
                            {modal === "add-hearing"   && "Add Hearing"}
                            {modal === "edit-hearing"  && "Edit Hearing"}
                            {modal === "add-deadline"  && "Add Deadline"}
                            {modal === "edit-deadline" && "Edit Deadline"}
                        </div>

                        {/* Title */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Title *</label>
                            <input className={styles.formInput} value={fTitle} onChange={e => setFTitle(e.target.value)}
                                placeholder={modal?.includes("hearing") ? "e.g. First Hearing — ABC v XYZ" : "e.g. File written statement"} />
                        </div>

                        {/* Date + Time / Deadline type */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{modal?.includes("hearing") ? "Hearing Date *" : "Due Date *"}</label>
                                <input type="date" className={styles.formInput} value={fDate} onChange={e => setFDate(e.target.value)} />
                            </div>
                            {modal?.includes("hearing") ? (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Time</label>
                                    <input type="time" className={styles.formInput} value={fTime} onChange={e => setFTime(e.target.value)} />
                                </div>
                            ) : (
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select className={styles.formSelect} value={fDLType} onChange={e => setFDLType(e.target.value)}>
                                        {DEADLINE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Court + Judge (hearing only) */}
                        {modal?.includes("hearing") && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Court</label>
                                    <input className={styles.formInput} value={fCourt} onChange={e => setFCourt(e.target.value)} placeholder="e.g. Lahore High Court" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Judge</label>
                                    <input className={styles.formInput} value={fJudge} onChange={e => setFJudge(e.target.value)} placeholder="Justice Name" />
                                </div>
                            </div>
                        )}

                        {/* Outcome fields — Task #163/#164 (hearing only) */}
                        {modal?.includes("hearing") && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Hearing Outcome</label>
                                    <select className={styles.formSelect} value={fOutcome} onChange={e => setFOutcome(e.target.value)}>
                                        <option value="">— Not yet held —</option>
                                        {["Heard", "Adjourned", "Partially Heard", "Reserved for Judgment", "Dismissed", "Withdrawn", "ex-parte"].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Next Date Fixed By</label>
                                    <select className={styles.formSelect} value={fNextBy} onChange={e => setFNextBy(e.target.value)}>
                                        <option value="">— N/A —</option>
                                        {["Court (suo motu)", "Mutual Consent", "Plaintiff Application", "Defendant Application", "ex-parte Order"].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        {modal?.includes("hearing") && fOutcome === "Adjourned" && (
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Adjournment Reason</label>
                                <input className={styles.formInput} value={fAdjReason} onChange={e => setFAdjReason(e.target.value)} placeholder="e.g. Counsel not available, court summoned, on application of plaintiff…" />
                            </div>
                        )}
                        {modal?.includes("hearing") && (
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Assign to (associate dispatch)</label>
                                <select className={styles.formSelect} value={fAssignedTo} onChange={e => setFAssignedTo(e.target.value)}>
                                    <option value="">— Not assigned —</option>
                                    {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                                </select>
                                <p className={styles.muted} style={{ fontSize: "0.76rem", marginTop: "0.25rem" }}>
                                    The assigned team member will see this in "My Court Assignments" and can mark the outcome from their portal — you'll get a WhatsApp when they do.
                                </p>
                            </div>
                        )}

                        {/* Linked matter */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Linked Matter</label>
                            <select className={styles.formSelect} value={fMatter} onChange={e => setFMatter(e.target.value)}>
                                <option value="">— None —</option>
                                {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title}</option>)}
                            </select>
                        </div>

                        {/* Notes */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Notes</label>
                            <textarea className={styles.formTextarea} value={fNotes} onChange={e => setFNotes(e.target.value)}
                                placeholder="Optional notes for this event" rows={2} />
                        </div>

                        {/* WhatsApp reminder */}
                        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: "1rem", cursor: "pointer" }}>
                            <input type="checkbox" checked={fWA} onChange={e => setFWA(e.target.checked)} />
                            Send WhatsApp reminder 24 hours before
                        </label>

                        {fErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{fErr}</div>}

                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={closeModal} disabled={fSaving}>Cancel</button>
                            <button className={styles.btnPrimary} disabled={fSaving}
                                onClick={modal?.includes("hearing") ? saveHearing : saveDeadline}>
                                {fSaving ? "Saving…" : (modal?.startsWith("edit") ? "Save Changes" : "Add")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk WhatsApp: Court Holiday notice ── */}
            {showHolidayModal && (
                <div className={styles.overlay} onClick={() => setShowHolidayModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className={styles.modalTitle}>📢 Notify Clients — Court Holiday</div>
                        <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>
                            Every client with a hearing or deadline in this date range gets a WhatsApp notice that court is closed — one click instead of messaging each client by hand.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>From</label>
                                <input type="date" className={styles.formInput} value={holidayFrom} onChange={e => { setHolidayFrom(e.target.value); setHolidayPreview(null); }} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>To</label>
                                <input type="date" className={styles.formInput} value={holidayTo} onChange={e => { setHolidayTo(e.target.value); setHolidayPreview(null); }} />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Message (optional — default holiday notice used if blank)</label>
                            <textarea className={styles.formInput} rows={3} style={{ resize: "vertical" }} value={holidayMsg} onChange={e => setHolidayMsg(e.target.value)}
                                placeholder="e.g. Court will remain closed on 14 August (Independence Day). Hearings will be rescheduled." />
                        </div>

                        {holidayPreview === null ? (
                            <button className={styles.btnSecondary} onClick={loadHolidayPreview} disabled={holidayLoading || !holidayFrom}>
                                {holidayLoading ? "Loading…" : "Preview affected clients"}
                            </button>
                        ) : holidayResult ? (
                            <div className={styles.limAlertBanner} style={{ background: "var(--bg-1)", borderColor: "#2d8a4e" }}>
                                ✅ Sent to {holidayResult.notified} client{holidayResult.notified === 1 ? "" : "s"}.
                                {holidayResult.failed > 0 && ` ${holidayResult.failed} failed.`}
                                {holidayResult.skipped_no_phone > 0 && ` ${holidayResult.skipped_no_phone} had no phone on file.`}
                            </div>
                        ) : (
                            <div style={{ marginBottom: "0.75rem" }}>
                                {holidayPreview.length === 0 ? (
                                    <div className={styles.emptyHint}>No clients have a hearing or deadline in this range — nothing to send.</div>
                                ) : (
                                    <>
                                        <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                                            {holidayPreview.length} client{holidayPreview.length === 1 ? "" : "s"} will be notified:
                                        </div>
                                        <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                            {holidayPreview.map(c => (
                                                <div key={c.client_id} style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
                                                    • {c.client_name} <span className={styles.muted}>({c.matter_titles})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {holidayErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{holidayErr}</div>}

                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowHolidayModal(false)}>{holidayResult ? "Close" : "Cancel"}</button>
                            {holidayPreview !== null && holidayPreview.length > 0 && !holidayResult && (
                                <button className={styles.btnPrimary} disabled={holidaySending} onClick={sendHolidayNotify}>
                                    {holidaySending ? "Sending…" : `Send to ${holidayPreview.length} client${holidayPreview.length === 1 ? "" : "s"}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Subscription helpers ──────────────────────────────────────────────────────

interface PlanTierConfig {
    max_docs:      number;
    max_users:     number;
    max_bytes:     number;
    max_searches:  number | null;
    trial_days?:   number;
    price_monthly: number;
    price_annual:  number;
    features:      string[];
}

interface PlanConfigResponse {
    plans:             Record<string, PlanTierConfig>;
    current_plan:      string;
    bank: {
        name:    string;
        account: string;
        iban:    string;
        title:   string;
    };
    support_whatsapp:  string;
}

const TIER_ORDER = ["trial", "starter", "pro", "enterprise"] as const;

const TIER_LABELS: Record<string, string> = {
    trial:      "Trial",
    starter:    "Starter",
    pro:        "Pro",
    enterprise: "Enterprise",
};

const SubscriptionPanel = ({
    plan, usage, maxDocs, maxUsers, teamCount,
}: {
    plan:      string;
    usage:     Usage;
    maxDocs:   number;
    maxUsers:  number;
    teamCount: number;
}) => {
    const [config,        setConfig]        = useState<PlanConfigResponse | null>(null);
    const [trialEndsAt,   setTrialEndsAt]   = useState<string | null>(null);
    const [pendingPlan,   setPendingPlan]   = useState<string | null>(null);
    const [pendingAt,     setPendingAt]     = useState<string | null>(null);
    const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null);
    const [payRef,        setPayRef]        = useState("");
    const [notes,         setNotes]         = useState("");
    const [submitting,    setSubmitting]    = useState(false);
    const [submitDone,    setSubmitDone]    = useState(false);
    const [submitErr,     setSubmitErr]     = useState("");

    useEffect(() => {
        fetch("/plan-config", { headers: authHeaders() })
            .then(r => r.json())
            .then((d: PlanConfigResponse) => setConfig(d))
            .catch(() => {});
        fetch("/org", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                if (d.trial_ends_at)          setTrialEndsAt(d.trial_ends_at);
                if (d.requested_plan)         setPendingPlan(d.requested_plan);
                if (d.upgrade_requested_at)   setPendingAt(d.upgrade_requested_at);
            })
            .catch(() => {});
    }, []);

    // Trial countdown
    const trialDaysLeft = (() => {
        if (!trialEndsAt) return null;
        const diff = new Date(trialEndsAt).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / 86_400_000));
    })();

    // Usage calculations
    const unlimited = maxDocs >= 9_999_999;
    const maxStorageBytes = config?.plans[plan]?.max_bytes ?? 0;
    const unlimitedStorage = maxStorageBytes >= 25_000_000_000 * 0.99;

    const docPct  = unlimited ? 0 : Math.min(100, Math.round((usage.total_docs  / maxDocs)   * 100));
    const userPct = unlimited ? 0 : Math.min(100, Math.round((teamCount         / maxUsers)   * 100));
    const stPct   = unlimitedStorage ? 0 : maxStorageBytes > 0
        ? Math.min(100, Math.round((usage.total_bytes / maxStorageBytes) * 100))
        : 0;

    const openUpgrade = (tier: string) => {
        setUpgradeTarget(tier);
        setPayRef(""); setNotes(""); setSubmitDone(false); setSubmitErr("");
    };
    const closeModal = () => setUpgradeTarget(null);

    const submitUpgrade = async () => {
        if (!payRef.trim()) { setSubmitErr("Please enter your payment / transaction reference."); return; }
        setSubmitting(true); setSubmitErr("");
        try {
            const r = await fetch("/upgrade-request", {
                method:  "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body:    JSON.stringify({ requested_plan: upgradeTarget, payment_ref: payRef.trim(), notes: notes.trim() || undefined }),
            });
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                setSubmitErr(d.error ?? "Something went wrong. Please try again.");
            } else {
                setSubmitDone(true);
                setPendingPlan(upgradeTarget);
                setPendingAt(new Date().toISOString());
            }
        } catch {
            setSubmitErr("Network error — please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.panelContent}>

            {/* Trial countdown banner */}
            {plan === "trial" && trialDaysLeft !== null && (
                <div className={`${styles.trialBanner}${trialDaysLeft <= 3 ? " " + styles.trialBannerUrgent : ""}`}>
                    <span className={styles.trialBannerIcon}>⏳</span>
                    <span className={styles.trialBannerText}>
                        {trialDaysLeft === 0
                            ? <><strong>Your trial has ended.</strong> Upgrade now to continue using Project Ease.</>
                            : <><strong>{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left on your trial.</strong>{" "}
                               Upgrade before it expires to keep your documents and access.</>}
                    </span>
                </div>
            )}

            {/* Pending upgrade notice */}
            {pendingPlan && (
                <div className={styles.upgradePendingBanner}>
                    <span className={styles.pendingBannerIcon}>🕐</span>
                    <div className={styles.pendingBannerBody}>
                        <div className={styles.pendingBannerTitle}>
                            Upgrade to {TIER_LABELS[pendingPlan] ?? pendingPlan} — Under Review
                        </div>
                        <div className={styles.pendingBannerSub}>
                            Your payment is being verified. We'll activate your new plan within 1–2 business hours
                            {pendingAt ? ` (submitted ${new Date(pendingAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })})` : ""}.
                            Questions? WhatsApp us at {config?.support_whatsapp ?? "our support number"}.
                        </div>
                    </div>
                </div>
            )}

            {/* ── Usage ── */}
            <div className={styles.subUsageCard}>
                <div className={styles.subUsageTitle}>Current Usage — {TIER_LABELS[plan] ?? plan} Plan</div>
                <div className={styles.subUsageGrid}>

                    {/* Documents */}
                    <div className={styles.subUsageItem}>
                        <div className={styles.subUsageLabel}>
                            <span>Documents</span>
                            <span className={styles.subUsageValue}>
                                {unlimited ? `${usage.total_docs} / ∞` : `${usage.total_docs} / ${maxDocs}`}
                            </span>
                        </div>
                        {!unlimited && (
                            <div className={styles.usageBar}>
                                <div
                                    className={`${styles.usageBarFill}${docPct >= 80 ? " " + styles.usageBarWarn : ""}`}
                                    style={{ width: `${docPct}%` }}
                                />
                            </div>
                        )}
                        {docPct >= 80 && !unlimited && (
                            <div className={styles.subUpgradeHint}>
                                {docPct >= 100 ? "Limit reached — upgrade to upload more." : `${docPct}% used — consider upgrading.`}
                            </div>
                        )}
                    </div>

                    {/* Team */}
                    <div className={styles.subUsageItem}>
                        <div className={styles.subUsageLabel}>
                            <span>Team Members</span>
                            <span className={styles.subUsageValue}>
                                {unlimited ? `${teamCount} / ∞` : `${teamCount} / ${maxUsers}`}
                            </span>
                        </div>
                        {!unlimited && (
                            <div className={styles.usageBar}>
                                <div
                                    className={`${styles.usageBarFill}${userPct >= 80 ? " " + styles.usageBarWarn : ""}`}
                                    style={{ width: `${userPct}%` }}
                                />
                            </div>
                        )}
                        {userPct >= 80 && !unlimited && (
                            <div className={styles.subUpgradeHint}>
                                {userPct >= 100 ? "Limit reached — upgrade to invite more." : `${userPct}% used — consider upgrading.`}
                            </div>
                        )}
                    </div>

                    {/* Storage */}
                    <div className={styles.subUsageItem}>
                        <div className={styles.subUsageLabel}>
                            <span>Storage</span>
                            <span className={styles.subUsageValue}>{fmtBytes(usage.total_bytes)}</span>
                        </div>
                        {!unlimitedStorage && maxStorageBytes > 0 && (
                            <div className={styles.usageBar}>
                                <div
                                    className={`${styles.usageBarFill}${stPct >= 80 ? " " + styles.usageBarWarn : ""}`}
                                    style={{ width: `${stPct}%` }}
                                />
                            </div>
                        )}
                        {stPct >= 80 && !unlimitedStorage && (
                            <div className={styles.subUpgradeHint}>
                                {stPct >= 100 ? "Storage full — upgrade for more space." : `${stPct}% used.`}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* ── Plan comparison cards ── */}
            <div className={styles.planTierGrid}>
                {TIER_ORDER.map(tier => {
                    const cfg         = config?.plans[tier];
                    const isCurrent   = tier === plan;
                    const isPopular   = tier === "pro";
                    const isUnlimited = (cfg?.max_docs ?? 0) >= 9_999_999;
                    const hasPending  = !!pendingPlan;

                    // Can upgrade: must be higher tier and no pending request
                    const tierIdx    = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number]);
                    const currentIdx = TIER_ORDER.indexOf(plan as typeof TIER_ORDER[number]);
                    const canUpgrade = !isCurrent && tierIdx > currentIdx && !hasPending;

                    return (
                        <div
                            key={tier}
                            className={[
                                styles.planTierCard,
                                isCurrent ? styles.planTierCardCurrent : "",
                                isPopular && !isCurrent ? styles.planTierCardPopular : "",
                            ].filter(Boolean).join(" ")}
                        >
                            {isCurrent && <div className={styles.planTierCurrentBadge}>Current Plan</div>}
                            {isPopular && !isCurrent && <div className={styles.planTierPopularBadge}>Most Popular</div>}

                            <div className={styles.planTierName}>{TIER_LABELS[tier]}</div>

                            <div className={styles.planTierPrice}>
                                {cfg ? fmtPKR(cfg.price_monthly) : "—"}
                            </div>
                            <div className={styles.planTierPriceSub}>
                                {cfg && cfg.price_monthly > 0 ? "per month" : tier === "trial" ? "14-day trial" : ""}
                                {cfg && cfg.price_annual > 0 ? ` · PKR ${cfg.price_annual.toLocaleString("en-PK")}/yr` : ""}
                            </div>

                            <div className={styles.planTierDivider} />

                            <div className={styles.planTierLimits}>
                                {isUnlimited
                                    ? "Unlimited docs · Unlimited users"
                                    : `${cfg?.max_docs ?? "—"} docs · ${cfg?.max_users ?? "—"} users`}
                                <br />
                                {cfg && cfg.max_bytes >= 25_000_000_000 * 0.99
                                    ? "25 GB storage"
                                    : cfg ? fmtBytes(cfg.max_bytes) + " storage" : ""}
                                {cfg?.max_searches != null ? ` · ${cfg.max_searches} searches` : ""}
                            </div>

                            {cfg?.features && cfg.features.length > 0 && (
                                <ul className={styles.planTierFeatureList}>
                                    {cfg.features.map((f, i) => (
                                        <li key={i} className={styles.planTierFeatureItem}>{f}</li>
                                    ))}
                                </ul>
                            )}

                            {tier === "enterprise" ? (
                                <button
                                    className={`${styles.planTierBtn} ${styles.planTierBtnGhost}`}
                                    onClick={() => window.open("mailto:support@projectease.ai?subject=Enterprise Plan Inquiry", "_blank")}
                                >
                                    Contact Sales
                                </button>
                            ) : isCurrent ? (
                                <button className={styles.planTierBtn} disabled>
                                    Active
                                </button>
                            ) : canUpgrade ? (
                                <button className={styles.planTierBtn} onClick={() => openUpgrade(tier)}>
                                    Upgrade to {TIER_LABELS[tier]}
                                </button>
                            ) : hasPending ? (
                                <button className={styles.planTierBtn} disabled title="An upgrade request is already pending">
                                    Request Pending
                                </button>
                            ) : (
                                <button className={styles.planTierBtn} disabled>
                                    {tierIdx < currentIdx ? "Downgrade not available" : "Current"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Upgrade modal ── */}
            {upgradeTarget && (
                <div className={styles.overlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>

                        {submitDone ? (
                            <>
                                <div className={styles.upgradeSuccessBanner}>
                                    <div className={styles.upgradeSuccessTitle}>✓ Upgrade Request Submitted</div>
                                    Your request to upgrade to <strong>{TIER_LABELS[upgradeTarget]}</strong> has been received.
                                    We will verify your payment and activate your plan within 1–2 business hours (Mon–Sat, 9 AM–6 PM PKT).
                                    {config?.support_whatsapp && (
                                        <> Questions? WhatsApp us at <strong>{config.support_whatsapp}</strong>.</>
                                    )}
                                </div>
                                <div className={styles.modalActions} style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
                                    <button className={styles.btnPrimary} onClick={closeModal}>Done</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={styles.upgradeModalTitle}>
                                    Upgrade to {TIER_LABELS[upgradeTarget]} Plan
                                </div>
                                <div className={styles.upgradeModalSub}>
                                    Transfer the subscription amount to our bank account, then enter your transaction
                                    reference below. We'll verify and activate your plan within 1–2 business hours.
                                </div>

                                {/* Bank details */}
                                {config?.bank && (
                                    <div className={styles.bankCard}>
                                        <div className={styles.bankCardTitle}>Bank Transfer Details</div>
                                        {[
                                            ["Bank",    config.bank.name],
                                            ["Account", config.bank.account],
                                            ["IBAN",    config.bank.iban],
                                            ["Title",   config.bank.title],
                                        ].map(([label, val]) => val && val !== "" && (
                                            <div key={label} className={styles.bankRow}>
                                                <span className={styles.bankLabel}>{label}</span>
                                                <span className={styles.bankValue}>{val}</span>
                                            </div>
                                        ))}
                                        {config?.plans[upgradeTarget] && (
                                            <div className={styles.bankRow} style={{ marginTop: "0.4rem", borderTop: "1px solid var(--border)", paddingTop: "0.4rem" }}>
                                                <span className={styles.bankLabel}>Amount</span>
                                                <span className={styles.bankValue} style={{ color: "var(--gold)" }}>
                                                    {fmtPKR(config.plans[upgradeTarget].price_monthly)}/month
                                                    {config.plans[upgradeTarget].price_annual > 0 && (
                                                        <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: "0.75rem" }}>
                                                            {" "}· or PKR {config.plans[upgradeTarget].price_annual.toLocaleString("en-PK")}/yr
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Task #174 — Local payment methods */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", margin: "0.75rem 0" }}>
                                    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.6rem 0.75rem" }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1a9c3e", marginBottom: "2px" }}>📱 JazzCash</div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>Account: <strong>PLACEHOLDER_JAZZCASH_NO</strong></div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Send to mobile wallet</div>
                                    </div>
                                    <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.6rem 0.75rem" }}>
                                        <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#6d28d9", marginBottom: "2px" }}>📱 Easypaisa</div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>Account: <strong>PLACEHOLDER_EASYPAISA_NO</strong></div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Send to mobile wallet</div>
                                    </div>
                                </div>

                                {/* Payment reference */}
                                <div className={styles.upgradeFormSection}>
                                    <label className={styles.upgradeFormLabel}>
                                        Transaction / Payment Reference <span style={{ color: "var(--danger, #c94040)" }}>*</span>
                                    </label>
                                    <input
                                        className={styles.upgradeFormInput}
                                        placeholder="e.g. TRX-20240723-1234 or JazzCash/Easypaisa transaction ID"
                                        value={payRef}
                                        onChange={e => setPayRef(e.target.value)}
                                    />
                                </div>

                                {/* Notes */}
                                <div className={styles.upgradeFormSection}>
                                    <label className={styles.upgradeFormLabel}>Notes (optional)</label>
                                    <textarea
                                        className={`${styles.upgradeFormInput} ${styles.upgradeFormTextarea}`}
                                        placeholder="Any additional info for our team"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>

                                {submitErr && (
                                    <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.75rem" }}>
                                        {submitErr}
                                    </div>
                                )}

                                <div className={styles.modalActions}>
                                    <button className={styles.btnGhost} onClick={closeModal} disabled={submitting}>Cancel</button>
                                    <button className={styles.btnPrimary} onClick={submitUpgrade} disabled={submitting}>
                                        {submitting ? "Submitting…" : "Submit Upgrade Request"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Settings Panel ────────────────────────────────────────────────────────────

const INDUSTRIES = ["Law Practice", "CA / Accounting", "Logistics", "Financial Services", "Healthcare", "Real Estate", "Other"];

const PK_CITIES = [
    "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
    "Hyderabad", "Abbottabad", "Bahawalpur", "Sukkur", "Dera Ghazi Khan",
];

const PRACTICE_AREAS = [
    "Corporate & Commercial", "Criminal Defence", "Family & Personal Law",
    "Civil Litigation", "Property & Real Estate", "Tax & Revenue",
    "Constitutional & Public Law", "Banking & Finance", "Labour & Employment",
    "Intellectual Property",
];

const TEAM_SIZES = ["1–5", "6–15", "16–30", "31–60", "60+"];

const SettingsPanel = ({
    orgName,
    orgIndustry,
    onOrgUpdate,
}: {
    orgName:     string;
    orgIndustry: string;
    onOrgUpdate: (name: string, industry: string) => void;
}) => {
    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string } : { name: "", email: "" };

    // Org profile state
    const [name,      setName]      = useState(orgName);
    const [industry,  setIndustry]  = useState(orgIndustry);
    const [orgSaving, setOrgSaving] = useState(false);
    const [orgMsg,    setOrgMsg]    = useState<{ ok: boolean; text: string } | null>(null);

    // Optional profile fields (completion section)
    const [phone,        setPhone]        = useState("");
    const [city,         setCity]         = useState("");
    const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
    const [barCouncilNo, setBarCouncilNo] = useState("");
    const [website,      setWebsite]      = useState("");
    const [teamSize,     setTeamSize]     = useState("");
    const [profSaving,   setProfSaving]   = useState(false);
    const [profMsg,      setProfMsg]      = useState<{ ok: boolean; text: string } | null>(null);

    // Load existing optional profile on mount
    useEffect(() => {
        fetch("/org", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => {
                if (d.phone)          setPhone(d.phone);
                if (d.city)           setCity(d.city);
                if (d.bar_council_no) setBarCouncilNo(d.bar_council_no);
                if (d.website)        setWebsite(d.website);
                if (d.team_size)      setTeamSize(d.team_size);
                if (d.practice_areas) setPracticeAreas(d.practice_areas.split(",").map((s: string) => s.trim()).filter(Boolean));
            })
            .catch(() => {});
    }, []);

    const togglePracticeArea = (area: string) => {
        setPracticeAreas(prev =>
            prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
        );
    };

    const saveProfile = async () => {
        setProfSaving(true); setProfMsg(null);
        try {
            const r = await fetch("/org/profile", {
                method: "PUT",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    city,
                    practice_areas: practiceAreas.join(","),
                    bar_council_no: barCouncilNo,
                    website,
                    team_size:      teamSize,
                }),
            });
            if (r.ok) {
                setProfMsg({ ok: true, text: "Firm profile saved." });
            } else {
                const d = await r.json().catch(() => ({}));
                setProfMsg({ ok: false, text: (d as any).error ?? "Failed to save." });
            }
        } catch { setProfMsg({ ok: false, text: "Network error." }); }
        setProfSaving(false);
        setTimeout(() => setProfMsg(null), 3500);
    };

    // Profile completion % (4 required at signup = 40%, 6 optional = 10% each)
    const optionalFilled = [phone, city, practiceAreas.length > 0, barCouncilNo, website, teamSize].filter(Boolean).length;
    const completionPct  = Math.round(40 + optionalFilled * 10);

    // Password state
    const [currentPw, setCurrentPw] = useState("");
    const [newPw,     setNewPw]     = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwSaving,  setPwSaving]  = useState(false);
    const [pwMsg,     setPwMsg]     = useState<{ ok: boolean; text: string } | null>(null);

    // Delete org modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Practice Teams state
    const [matterTeams,   setMatterTeams]   = useState<MatterTeam[]>([]);
    const [orgMembers,    setOrgMembers]    = useState<TeamMember[]>([]);
    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [newTeamName,   setNewTeamName]   = useState("");
    const [teamSaving,    setTeamSaving]    = useState(false);
    const [teamErr,       setTeamErr]       = useState<string | null>(null);
    const [addMemberSelects, setAddMemberSelects] = useState<Record<string, string>>({});

    // Bail checklist stages (configurable, default = 6-stage flow)
    const [bailStages,    setBailStages]    = useState<BailStage[]>([]);
    const [newStageLabel, setNewStageLabel] = useState("");
    const [stageSaving,   setStageSaving]   = useState(false);

    const loadBailStages = () => {
        fetch("/bail-stages?all=1", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setBailStages(d.stages ?? []))
            .catch(() => {});
    };

    const addBailStage = async () => {
        if (!newStageLabel.trim()) return;
        setStageSaving(true);
        try {
            await fetch("/bail-stages", {
                method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ label: newStageLabel.trim() }),
            });
            setNewStageLabel("");
            loadBailStages();
        } finally { setStageSaving(false); }
    };

    const renameBailStage = async (stageKey: string, label: string) => {
        await fetch(`/bail-stages/${stageKey}`, {
            method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ label }),
        });
    };

    const toggleBailStageActive = async (stage: any) => {
        await fetch(`/bail-stages/${stage.stage_key}`, {
            method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: stage.is_active ? 0 : 1 }),
        });
        loadBailStages();
    };

    useEffect(() => {
        Promise.all([
            fetch("/matter-teams", { headers: authHeaders() }).then(r => r.json()),
            fetch("/team",         { headers: authHeaders() }).then(r => r.json()),
        ]).then(([td, tm]) => {
            setMatterTeams(td.teams ?? []);
            setOrgMembers((tm.members ?? []).map((m: any) => ({
                user_id: m.user_id, name: m.name, email: m.email,
                role: m.role, joined: m.created_at ?? "",
            })));
        }).catch(() => {});
        loadBailStages();
    }, []);

    const toggleExpand = (id: string) =>
        setExpandedTeams(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

    const createTeam = async () => {
        if (!newTeamName.trim()) { setTeamErr("Team name is required."); return; }
        setTeamSaving(true); setTeamErr(null);
        try {
            const res = await fetch("/matter-teams", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name: newTeamName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setTeamErr(data.error ?? "Failed."); setTeamSaving(false); return; }
            setMatterTeams(prev => [...prev, { ...data, members: [] }]);
            setNewTeamName(""); setShowTeamModal(false);
        } catch { setTeamErr("Network error."); }
        setTeamSaving(false);
    };

    const deleteTeam = async (teamId: string) => {
        if (!confirm("Delete this team? It will be unassigned from all matters.")) return;
        await fetch(`/matter-teams/${teamId}`, { method: "DELETE", headers: authHeaders() });
        setMatterTeams(prev => prev.filter(t => t.team_id !== teamId));
    };

    const addMember = async (teamId: string) => {
        const userId = addMemberSelects[teamId];
        if (!userId) return;
        const res = await fetch(`/matter-teams/${teamId}/members/${userId}`, { method: "POST", headers: authHeaders() });
        if (res.ok) {
            const member = orgMembers.find(m => m.user_id === userId);
            if (member) {
                setMatterTeams(prev => prev.map(t =>
                    t.team_id === teamId
                        ? { ...t, members: [...t.members, { user_id: member.user_id, name: member.name }] }
                        : t
                ));
            }
            setAddMemberSelects(prev => ({ ...prev, [teamId]: "" }));
        }
    };

    const removeMember = async (teamId: string, userId: string) => {
        await fetch(`/matter-teams/${teamId}/members/${userId}`, { method: "DELETE", headers: authHeaders() });
        setMatterTeams(prev => prev.map(t =>
            t.team_id === teamId ? { ...t, members: t.members.filter(m => m.user_id !== userId) } : t
        ));
    };

    const saveOrg = async () => {
        if (!name.trim()) { setOrgMsg({ ok: false, text: "Firm name cannot be empty." }); return; }
        setOrgSaving(true); setOrgMsg(null);
        try {
            const r = await fetch("/org", {
                method: "PUT",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), industry }),
            });
            if (r.ok) {
                onOrgUpdate(name.trim(), industry);
                setOrgMsg({ ok: true, text: "Organization profile saved." });
            } else {
                const d = await r.json().catch(() => ({}));
                setOrgMsg({ ok: false, text: (d as any).error ?? "Failed to save." });
            }
        } catch { setOrgMsg({ ok: false, text: "Network error." }); }
        setOrgSaving(false);
        setTimeout(() => setOrgMsg(null), 3500);
    };

    const changePassword = async () => {
        if (!currentPw || !newPw) { setPwMsg({ ok: false, text: "Fill in all password fields." }); return; }
        if (newPw !== confirmPw)  { setPwMsg({ ok: false, text: "Passwords do not match." }); return; }
        if (newPw.length < 8)    { setPwMsg({ ok: false, text: "New password must be at least 8 characters." }); return; }
        setPwSaving(true); setPwMsg(null);
        try {
            const r = await fetch("/auth/change-password", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) {
                setPwMsg({ ok: true, text: "Password changed successfully." });
                setCurrentPw(""); setNewPw(""); setConfirmPw("");
            } else {
                setPwMsg({ ok: false, text: (d as any).error ?? "Failed to change password." });
            }
        } catch { setPwMsg({ ok: false, text: "Network error." }); }
        setPwSaving(false);
        setTimeout(() => setPwMsg(null), 4000);
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.settingsGrid}>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Organization Profile</div>
                    {orgMsg && (
                        <div className={`${styles.errorBanner}${orgMsg.ok ? " " + styles.successBanner : ""}`}>
                            {orgMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setOrgMsg(null)}>✕</button>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Firm Name</label>
                        <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Industry</label>
                        <select className={styles.formSelect} value={industry} onChange={e => setIndustry(e.target.value)}>
                            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                        </select>
                    </div>
                    <button className={styles.btnPrimary} onClick={saveOrg} disabled={orgSaving}>
                        {orgSaving ? "Saving…" : "Save Changes"}
                    </button>
                </div>

                {/* ── Profile Completion ── */}
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Firm Profile Completion</div>
                    <div className={styles.completionBarWrap}>
                        <div className={styles.completionBarFill} style={{ width: `${completionPct}%` }} />
                    </div>
                    <div className={styles.completionLabel}>
                        {completionPct}% complete — {optionalFilled}/6 optional fields filled
                    </div>

                    {profMsg && (
                        <div className={`${styles.errorBanner}${profMsg.ok ? " " + styles.successBanner : ""}`}>
                            {profMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setProfMsg(null)}>✕</button>
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Phone</label>
                            <input className={styles.formInput} type="tel" placeholder="+92 300 0000000"
                                value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>City</label>
                            <select className={styles.formSelect} value={city} onChange={e => setCity(e.target.value)}>
                                <option value="">Select city</option>
                                {PK_CITIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Bar Council No.</label>
                            <input className={styles.formInput} type="text" placeholder="e.g. LHC-2019-1234"
                                value={barCouncilNo} onChange={e => setBarCouncilNo(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Team Size</label>
                            <select className={styles.formSelect} value={teamSize} onChange={e => setTeamSize(e.target.value)}>
                                <option value="">Select size</option>
                                {TEAM_SIZES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Website (optional)</label>
                        <input className={styles.formInput} type="url" placeholder="https://yourfirm.com"
                            value={website} onChange={e => setWebsite(e.target.value)} />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Practice Areas</label>
                        <div className={styles.practiceAreaGrid}>
                            {PRACTICE_AREAS.map(area => (
                                <label key={area} className={styles.practiceAreaChip}>
                                    <input
                                        type="checkbox"
                                        checked={practiceAreas.includes(area)}
                                        onChange={() => togglePracticeArea(area)}
                                        style={{ display: "none" }}
                                    />
                                    <span className={practiceAreas.includes(area) ? styles.chipActive : styles.chipInactive}>
                                        {area}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button className={styles.btnPrimary} onClick={saveProfile} disabled={profSaving}>
                        {profSaving ? "Saving…" : "Save Firm Profile"}
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
                    {pwMsg && (
                        <div className={`${styles.errorBanner}${pwMsg.ok ? " " + styles.successBanner : ""}`}>
                            {pwMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setPwMsg(null)}>✕</button>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Current Password</label>
                        <input className={styles.formInput} type="password" value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>New Password</label>
                        <input className={styles.formInput} type="password" value={newPw}
                            onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Confirm New Password</label>
                        <input className={styles.formInput} type="password" value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
                    </div>
                    <button className={styles.btnGhost} onClick={changePassword} disabled={pwSaving}>
                        {pwSaving ? "Changing…" : "Change Password"}
                    </button>
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

                {/* ── Practice Teams ── */}
                <div className={styles.settingsCard} style={{ gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <div className={styles.settingsCardTitle} style={{ marginBottom: 0 }}>Practice Teams</div>
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} onClick={() => { setNewTeamName(""); setTeamErr(null); setShowTeamModal(true); }}>
                            + Create Team
                        </button>
                    </div>

                    {matterTeams.length === 0 ? (
                        <div className={styles.emptyHint}>No practice teams yet. Create teams to assign staff groups to matters.</div>
                    ) : (
                        <div className={styles.teamsList}>
                            {matterTeams.map(team => {
                                const isOpen = expandedTeams.has(team.team_id);
                                const nonMembers = orgMembers.filter(m => !team.members.some(tm => tm.user_id === m.user_id));
                                return (
                                    <div key={team.team_id} className={styles.teamsItem}>
                                        <div className={styles.teamsItemHeader}>
                                            <button className={styles.teamsExpandBtn} onClick={() => toggleExpand(team.team_id)}>
                                                <span className={styles.teamsExpandArrow}>{isOpen ? "▾" : "▸"}</span>
                                                <span className={styles.teamsItemName}>{team.name}</span>
                                                <span className={styles.muted} style={{ fontSize: "0.78rem" }}>
                                                    {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                                                </span>
                                            </button>
                                            <button className={styles.actionBtnDanger} style={{ fontSize: "0.75rem" }} onClick={() => deleteTeam(team.team_id)}>
                                                Delete
                                            </button>
                                        </div>
                                        {isOpen && (
                                            <div className={styles.teamsMemberList}>
                                                {team.members.length === 0 ? (
                                                    <div className={styles.muted} style={{ fontSize: "0.8rem", padding: "0.4rem 0" }}>No members yet.</div>
                                                ) : (
                                                    team.members.map(m => (
                                                        <div key={m.user_id} className={styles.teamsMemberRow}>
                                                            <span className={styles.teamsMemberName}>{m.name}</span>
                                                            <button className={styles.queueRemove} title="Remove from team" onClick={() => removeMember(team.team_id, m.user_id)}>✕</button>
                                                        </div>
                                                    ))
                                                )}
                                                {nonMembers.length > 0 && (
                                                    <div className={styles.teamsAddMemberRow}>
                                                        <select
                                                            className={styles.formSelect}
                                                            style={{ flex: 1, fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                                                            value={addMemberSelects[team.team_id] ?? ""}
                                                            onChange={e => setAddMemberSelects(prev => ({ ...prev, [team.team_id]: e.target.value }))}
                                                        >
                                                            <option value="">Add member…</option>
                                                            {nonMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>)}
                                                        </select>
                                                        <button className={styles.btnGhost} style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
                                                            disabled={!addMemberSelects[team.team_id]}
                                                            onClick={() => addMember(team.team_id)}>
                                                            Add
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Bail Checklist Stages ── */}
                <div className={styles.settingsCard} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.settingsCardTitle}>Bail Checklist Stages</div>
                    <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>
                        The step-by-step tracker shown on every bail bond. Defaults to Surety Identification → CNIC Verification → Property Valuation → Surety Appearance → Court Filing → Result — rename or add stages to match how your firm actually works; existing bonds keep their progress.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.85rem" }}>
                        {bailStages.map(s => (
                            <div key={s.stage_key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ color: "var(--text-3)", fontSize: "0.78rem", width: 20 }}>{s.sort_order + 1}.</span>
                                <input className={styles.formInput} style={{ flex: 1, fontSize: "0.85rem", padding: "0.3rem 0.6rem", opacity: s.is_active ? 1 : 0.5 }}
                                    defaultValue={s.label}
                                    onBlur={e => { if (e.target.value.trim() && e.target.value !== s.label) renameBailStage(s.stage_key, e.target.value.trim()); }} />
                                <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }} onClick={() => toggleBailStageActive(s)}>
                                    {s.is_active ? "Deactivate" : "Reactivate"}
                                </button>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input className={styles.formInput} style={{ flex: 1 }} value={newStageLabel} onChange={e => setNewStageLabel(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addBailStage()} placeholder="Add a custom stage…" />
                        <button className={styles.btnPrimary} style={{ fontSize: "0.8rem" }} disabled={stageSaving || !newStageLabel.trim()} onClick={addBailStage}>
                            + Add
                        </button>
                    </div>
                </div>

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Danger Zone</div>
                    <p className={styles.dangerText}>
                        Deleting your organization will permanently remove all documents and team access. This cannot be undone.
                    </p>
                    <button className={styles.btnDanger} onClick={() => setShowDeleteModal(true)}>
                        Delete Organization
                    </button>
                </div>
            </div>

            {/* Create team modal */}
            {showTeamModal && (
                <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowTeamModal(false); }}>
                    <div className={styles.modal} style={{ maxWidth: 400 }}>
                        <h3 className={styles.modalTitle}>Create Practice Team</h3>
                        {teamErr && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {teamErr}</div>}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Team Name</label>
                            <input className={styles.formInput} value={newTeamName} autoFocus
                                onChange={e => setNewTeamName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && createTeam()}
                                placeholder="e.g. Litigation Team, Corporate Group" />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowTeamModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={createTeam} disabled={teamSaving}>
                                {teamSaving ? "Creating…" : "Create Team"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete org info modal */}
            {showDeleteModal && (
                <div
                    className={styles.overlay}
                    onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
                >
                    <div className={styles.modal}>
                        <h3 className={styles.modalTitle}>Organization Deletion</h3>
                        <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
                            For security and compliance, organization deletion must be requested through our support team. We'll verify your identity and ensure all data is properly handled before removing your account.
                        </p>
                        <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem", color: "var(--text-2)" }}>
                            Contact us at{" "}
                            <a
                                href="mailto:support@projectease.ai"
                                style={{ color: "var(--gold)", textDecoration: "none" }}
                            >
                                support@projectease.ai
                            </a>{" "}
                            with the subject line <strong style={{ color: "var(--text-1)" }}>Delete Organization Request</strong> from your registered email address.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.btnGhost} onClick={() => setShowDeleteModal(false)}>Close</button>
                            <a
                                href="mailto:support@projectease.ai?subject=Delete%20Organization%20Request"
                                className={styles.btnDanger}
                                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                            >
                                Email Support
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Drafting Panel ────────────────────────────────────────────────────────────

const TEMPLATE_TYPES_UI = [
    { value: "vakalatnama", label: "Vakalatnama" },
    { value: "plaint",      label: "Plaint / Petition" },
    { value: "agreement",   label: "Agreement" },
    { value: "notice",      label: "Legal Notice" },
    { value: "general",     label: "General" },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
    vakalatnama: `VAKALATNAMA

I, {{client_name}}, S/O or D/O _________________________, CNIC No. {{client_cnic}}, resident of _________________________, do hereby appoint and authorise {{advocate_name}} of {{org_name}} to act and appear on my behalf in the case of:

Matter: {{matter_title}}
Case No.: {{case_number}}
Court: {{court_name}}

I hereby confer upon my said counsel full authority to do all acts, deeds, and things as may be necessary for the conduct of the said case, including filing of pleadings, appearances, and taking such steps as may be required.

Date: {{date_long}}

_______________________
Signature of Executant
{{client_name}}`,

    plaint: `IN THE COURT OF LEARNED {{court_name}}

Case No.: {{case_number}}

{{client_name}}
                                                                   …Plaintiff
versus

[Defendant Name]
                                                                   …Defendant

PLAINT

Most respectfully sheweth that:

1. The Plaintiff is {{client_name}}, CNIC No. {{client_cnic}}, resident of _________________________.

2. The brief facts of the matter are as follows:
   {{matter_description}}

3. The Plaintiff therefore prays that this Honourable Court may be pleased to:
   (a) [Relief sought]
   (b) Any other relief deemed fit and proper.

Place: _____________
Date: {{date_long}}

_______________________
Advocate for Plaintiff
{{org_name}}`,

    notice: `LEGAL NOTICE
Date: {{date_long}}

To,
[Recipient Name]
[Recipient Address]

Subject: Legal Notice regarding {{matter_title}}

Dear Sir/Madam,

Under instructions from and on behalf of my client {{client_name}}, I hereby issue this Legal Notice to you as under:

1. [Background facts]

2. {{matter_description}}

3. You are hereby called upon to [action required] within 15 (fifteen) days from the receipt of this notice, failing which my client shall be constrained to initiate legal proceedings against you before the competent court of law without further notice, at your risk, cost, and consequences.

This notice is being issued without prejudice to all other rights and remedies available to my client.

Yours faithfully,

_______________________
{{advocate_name}}
{{org_name}}`,

    agreement: `AGREEMENT

This Agreement is entered into on {{date_long}} between:

Party A: {{client_name}}, CNIC No. {{client_cnic}}
                                                ("Party A")
AND
Party B: _______________________________
                                                ("Party B")

RECITALS

1. [Background / Recital]

TERMS AND CONDITIONS

1. [Term 1]
2. [Term 2]
3. [Term 3]

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

Party A: _______________________          Party B: _______________________
{{client_name}}                           [Name]
CNIC: {{client_cnic}}                     CNIC: ___________________________
Date: {{date_long}}                       Date: ___________________________

WITNESSES:
1. _______________________
2. _______________________`,

    general: `{{org_name}}

Date: {{date_long}}
Ref: {{case_number}}

Subject: {{matter_title}}

Dear Sir/Madam,

[Body of document]

Yours faithfully,

_______________________
{{advocate_name}}
{{org_name}}`,
};

const DraftingPanel = () => {
    const [templates,    setTemplates]    = useState<Template[]>([]);
    const [matters,      setMatters]      = useState<Matter[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [filterType,   setFilterType]   = useState<string>("all");

    // Editor modal
    const [editorOpen,   setEditorOpen]   = useState(false);
    const [editing,      setEditing]      = useState<Template | null>(null);
    const [eTitle,       setETitle]       = useState("");
    const [eType,        setEType]        = useState("general");
    const [eContent,     setEContent]     = useState("");
    const [eDesc,        setEDesc]        = useState("");
    const [saving,       setSaving]       = useState(false);
    const [saveErr,      setSaveErr]      = useState("");

    // Draft modal
    const [draftOpen,    setDraftOpen]    = useState(false);
    const [draftTmpl,    setDraftTmpl]    = useState<Template | null>(null);
    const [draftMatter,  setDraftMatter]  = useState("");
    const [drafting,     setDrafting]     = useState(false);
    const [draftErr,     setDraftErr]     = useState("");

    const [deleteId,     setDeleteId]     = useState<string | null>(null);
    const [deleting,     setDeleting]     = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [tRes, mRes] = await Promise.all([
                fetch("/templates", { headers: authHeaders() }),
                fetch("/matters",   { headers: authHeaders() }),
            ]);
            if (tRes.ok) setTemplates(await tRes.json());
            if (mRes.ok) setMatters(await mRes.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => {
        setEditing(null);
        setETitle(""); setEType("general"); setEDesc("");
        setEContent(DEFAULT_TEMPLATES["general"]);
        setSaveErr(""); setEditorOpen(true);
    };

    const openEdit = (t: Template) => {
        setEditing(t);
        setETitle(t.title); setEType(t.template_type);
        setEDesc(t.description ?? ""); setEContent(t.content);
        setSaveErr(""); setEditorOpen(true);
    };

    const handleTypeChange = (v: string) => {
        setEType(v);
        if (!editing) setEContent(DEFAULT_TEMPLATES[v] ?? "");
    };

    const handleSave = async () => {
        if (!eTitle.trim()) { setSaveErr("Title is required."); return; }
        setSaving(true); setSaveErr("");
        try {
            const url    = editing ? `/templates/${editing.template_id}` : "/templates";
            const method = editing ? "PATCH" : "POST";
            const res    = await fetch(url, {
                method,
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ title: eTitle, template_type: eType, content: eContent, description: eDesc }),
            });
            if (!res.ok) { const d = await res.json(); setSaveErr(d.error ?? "Save failed"); return; }
            setEditorOpen(false);
            load();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await fetch(`/templates/${deleteId}`, { method: "DELETE", headers: authHeaders() });
            setDeleteId(null);
            load();
        } finally { setDeleting(false); }
    };

    const openDraft = (t: Template) => {
        setDraftTmpl(t);
        setDraftMatter("");
        setDraftErr("");
        setDraftOpen(true);
    };

    const handleDraft = async () => {
        if (!draftTmpl) return;
        setDrafting(true); setDraftErr("");
        try {
            const res = await fetch("/draft", {
                method:  "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body:    JSON.stringify({ template_id: draftTmpl.template_id, matter_id: draftMatter || null }),
            });
            if (!res.ok) {
                const d = await res.json();
                setDraftErr(d.error ?? "Draft failed");
                return;
            }
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `Draft_${draftTmpl.title.replace(/\s+/g, "_")}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDraftOpen(false);
        } finally { setDrafting(false); }
    };

    const filtered = filterType === "all"
        ? templates
        : templates.filter(t => t.template_type === filterType);

    const extractVars = (content: string) => {
        const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
        return [...new Set(matches)];
    };

    if (loading) return <div style={{ padding: "2rem", color: "var(--text-3)" }}>Loading templates…</div>;

    return (
        <div className={styles.draftingWrap}>
            {/* Header row */}
            <div className={styles.draftingHeader}>
                <div className={styles.filterChips}>
                    <button
                        className={filterType === "all" ? styles.chipActive : styles.chip}
                        onClick={() => setFilterType("all")}
                    >All</button>
                    {TEMPLATE_TYPES_UI.map(t => (
                        <button
                            key={t.value}
                            className={filterType === t.value ? styles.chipActive : styles.chip}
                            onClick={() => setFilterType(t.value)}
                        >{t.label}</button>
                    ))}
                </div>
                <button className={styles.addBtn} onClick={openNew}>+ New Template</button>
            </div>

            {/* Template grid */}
            {filtered.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>No templates yet. Create your first template to get started.</p>
                    <button className={styles.addBtn} onClick={openNew}>Create Template</button>
                </div>
            ) : (
                <div className={styles.templateGrid}>
                    {filtered.map(t => {
                        const vars = extractVars(t.content);
                        const typeLabel = TEMPLATE_TYPES_UI.find(x => x.value === t.template_type)?.label ?? t.template_type;
                        return (
                            <div key={t.template_id} className={styles.templateCard}>
                                <div className={styles.templateCardHead}>
                                    <span className={styles.templateTypeBadge}>{typeLabel}</span>
                                    <span className={styles.templateDate}>{fmtDate(t.modified_at)}</span>
                                </div>
                                <div className={styles.templateTitle}>{t.title}</div>
                                {t.description && <div className={styles.templateDesc}>{t.description}</div>}
                                {vars.length > 0 && (
                                    <div className={styles.templateVars}>
                                        {vars.slice(0, 4).map(v => (
                                            <span key={v} className={styles.varChip}>{v}</span>
                                        ))}
                                        {vars.length > 4 && <span className={styles.varChip}>+{vars.length - 4}</span>}
                                    </div>
                                )}
                                <div className={styles.templateCardActions}>
                                    <button className={styles.draftBtn} onClick={() => openDraft(t)}>
                                        ↓ Draft Document
                                    </button>
                                    <button className={styles.editBtn} onClick={() => openEdit(t)}>Edit</button>
                                    <button className={styles.deleteBtn} onClick={() => setDeleteId(t.template_id)}>Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Editor Modal ─────────────────────────────────────────── */}
            {editorOpen && (
                <div className={styles.modalOverlay} onClick={() => setEditorOpen(false)}>
                    <div className={styles.draftModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHead}>
                            <h2>{editing ? "Edit Template" : "New Template"}</h2>
                            <button className={styles.modalClose} onClick={() => setEditorOpen(false)}>✕</button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.fieldRow}>
                                <div className={styles.fieldGroup} style={{ flex: 2 }}>
                                    <label className={styles.fieldLabel}>Title</label>
                                    <input
                                        className={styles.fieldInput}
                                        value={eTitle}
                                        onChange={e => setETitle(e.target.value)}
                                        placeholder="e.g. Standard Vakalatnama"
                                    />
                                </div>
                                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                                    <label className={styles.fieldLabel}>Type</label>
                                    <select
                                        className={styles.fieldSelect}
                                        value={eType}
                                        onChange={e => handleTypeChange(e.target.value)}
                                    >
                                        {TEMPLATE_TYPES_UI.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Description (optional)</label>
                                <input
                                    className={styles.fieldInput}
                                    value={eDesc}
                                    onChange={e => setEDesc(e.target.value)}
                                    placeholder="Brief description of when to use this template"
                                />
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>
                                    Template Content
                                    <span className={styles.varHint}>Use &#123;&#123;variable_name&#125;&#125; for auto-fill placeholders</span>
                                </label>
                                <textarea
                                    className={styles.templateTextarea}
                                    value={eContent}
                                    onChange={e => setEContent(e.target.value)}
                                    rows={20}
                                    spellCheck={false}
                                />
                            </div>

                            <div className={styles.varPreview}>
                                <span className={styles.varPreviewLabel}>Variables detected:</span>
                                {extractVars(eContent).length === 0
                                    ? <span className={styles.varChip} style={{ opacity: 0.5 }}>none</span>
                                    : extractVars(eContent).map(v => <span key={v} className={styles.varChip}>{v}</span>)
                                }
                            </div>

                            {saveErr && <div className={styles.formError}>{saveErr}</div>}
                        </div>

                        <div className={styles.modalFoot}>
                            <button className={styles.cancelBtn} onClick={() => setEditorOpen(false)}>Cancel</button>
                            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                                {saving ? "Saving…" : editing ? "Save Changes" : "Create Template"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Draft Modal ──────────────────────────────────────────── */}
            {draftOpen && draftTmpl && (
                <div className={styles.modalOverlay} onClick={() => setDraftOpen(false)}>
                    <div className={styles.draftModal} style={{ maxWidth: "520px" }} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHead}>
                            <h2>Draft: {draftTmpl.title}</h2>
                            <button className={styles.modalClose} onClick={() => setDraftOpen(false)}>✕</button>
                        </div>

                        <div className={styles.modalBody}>
                            <p style={{ color: "var(--text-2)", marginBottom: "1rem", fontSize: "0.875rem" }}>
                                Select a matter to auto-fill client and case details. AI will fill any remaining placeholders.
                            </p>

                            <div className={styles.fieldGroup}>
                                <label className={styles.fieldLabel}>Link to Matter (optional)</label>
                                <select
                                    className={styles.fieldSelect}
                                    value={draftMatter}
                                    onChange={e => setDraftMatter(e.target.value)}
                                >
                                    <option value="">— No matter (fill manually after download) —</option>
                                    {matters.filter(m => m.status !== "Closed").map(m => (
                                        <option key={m.matter_id} value={m.matter_id}>
                                            {m.title} — {m.client_name} ({m.matter_type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.varPreview} style={{ marginTop: "1rem" }}>
                                <span className={styles.varPreviewLabel}>Variables in this template:</span>
                                {extractVars(draftTmpl.content).map(v => (
                                    <span key={v} className={styles.varChip}>{v}</span>
                                ))}
                            </div>

                            {draftErr && <div className={styles.formError}>{draftErr}</div>}
                        </div>

                        <div className={styles.modalFoot}>
                            <button className={styles.cancelBtn} onClick={() => setDraftOpen(false)}>Cancel</button>
                            <button className={styles.draftBtnLg} onClick={handleDraft} disabled={drafting}>
                                {drafting ? "Generating…" : "↓ Download .docx"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ───────────────────────────────────────── */}
            {deleteId && (
                <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
                    <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
                        <p>Delete this template? This cannot be undone.</p>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                            <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                                {deleting ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Theme Toggle ──────────────────────────────────────────────────────────────

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return <button className={styles.themeToggle} onClick={handle}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
};

// ── Disabled Feature Placeholder — Task #162 ─────────────────────────────────
const DisabledFeature = ({ name }: { name: string }) => (
    <div className={styles.panel} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 14, textAlign: "center" }}>
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

const DiaryPanel = () => {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate]             = useState<string>(today);
    const [hearings, setHearings]     = useState<DiaryHearing[]>([]);
    const [deadlines, setDeadlines]   = useState<DiaryDeadline[]>([]);
    const [loading, setLoading]       = useState(false);
    const [err, setErr]               = useState<string | null>(null);
    const [showingCached, setShowingCached] = useState<string | null>(null);  // cachedAt timestamp, or null if live

    const loadDiary = async (d: string) => {
        setLoading(true); setErr(null); setShowingCached(null);
        try {
            const { data, fromCache, cachedAt } = await fetchWithCache<{ hearings: DiaryHearing[]; deadlines: DiaryDeadline[] }>(
                `/diary/${d}`, `diary:${d}`, authHeaders()
            );
            setHearings(data.hearings  || []);
            setDeadlines(data.deadlines || []);
            if (fromCache && cachedAt) setShowingCached(new Date(cachedAt).toLocaleString());
        } catch (e: any) {
            setErr(e.message || "Failed to load diary — no offline copy available for this date yet.");
        } finally { setLoading(false); }
    };

    useEffect(() => { loadDiary(date); }, [date]);

    // ── Print / WhatsApp share ─────────────────────────────────────────────
    const buildShareText = () => {
        const fmt = new Date(date + "T00:00:00").toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        let txt = `📅 *Daily Diary — ${fmt}*\n\n`;
        if (hearings.length) {
            txt += `⚖️ *Court Hearings (${hearings.length})*\n`;
            hearings.forEach(h => {
                txt += `• ${h.hearing_time ? h.hearing_time + " — " : ""}${h.title}`;
                if (h.matter_title) txt += ` [${h.matter_title}]`;
                if (h.court_name)   txt += ` @ ${h.court_name}`;
                txt += "\n";
            });
            txt += "\n";
        }
        if (deadlines.length) {
            txt += `⏰ *Deadlines (${deadlines.length})*\n`;
            deadlines.forEach(d => {
                txt += `• ${d.title}`;
                if (d.matter_title) txt += ` [${d.matter_title}]`;
                txt += "\n";
            });
        }
        if (!hearings.length && !deadlines.length) txt += "No hearings or deadlines today.";
        return txt;
    };

    const handlePrint = () => window.print();
    const handleWhatsApp = () => {
        const encoded = encodeURIComponent(buildShareText());
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
    };

    const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const priorityBadge = (p?: string) => {
        const c = p === "High" ? "#e53e3e" : p === "Medium" ? "#d97706" : "#4a90d9";
        return p ? <span style={{ background: c, color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: 11, marginLeft: 6 }}>{p}</span> : null;
    };

    const prev = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)); };
    const next = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().slice(0, 10)); };

    const total = hearings.length + deadlines.length;

    // ── Task #172: WhatsApp Morning Brief ─────────────────────────────────────
    const [showBriefModal, setShowBriefModal] = useState(false);
    const [briefNumber, setBriefNumber]       = useState("");
    const [briefSending, setBriefSending]     = useState(false);
    const [briefStatus, setBriefStatus]       = useState<{ ok: boolean; msg: string } | null>(null);

    const sendBrief = async () => {
        if (!briefNumber.trim()) { setBriefStatus({ ok: false, msg: "Please enter a WhatsApp number." }); return; }
        setBriefSending(true); setBriefStatus(null);
        try {
            const r = await fetch("/diary/send-brief", {
                method: "POST",
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ to_number: briefNumber.trim(), date }),
            });
            const data = await r.json();
            if (data.sent) {
                setBriefStatus({ ok: true, msg: `✅ Brief sent to ${data.to}` });
            } else if (data.reason === "whatsapp_not_configured") {
                // Fallback: open WhatsApp share link with formatted text
                const encoded = encodeURIComponent(data.message || buildShareText());
                const num = briefNumber.replace(/\D/g, "");
                window.open(`https://wa.me/${num}?text=${encoded}`, "_blank");
                setBriefStatus({ ok: true, msg: "WhatsApp opened — Twilio credentials not yet configured, used share link instead." });
            } else {
                setBriefStatus({ ok: false, msg: data.error || "Failed to send." });
            }
        } catch (e: any) {
            setBriefStatus({ ok: false, msg: e.message || "Network error" });
        } finally { setBriefSending(false); }
    };

    return (
        <div className={styles.panel} id="diary-print-area">
            {/* Header row */}
            <div className={styles.panelHeader} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 className={styles.panelTitle}>📅 Daily Diary</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <button className={styles.btnSecondary} onClick={prev}>◀</button>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={styles.filterInput}
                        style={{ width: 160 }}
                    />
                    <button className={styles.btnSecondary} onClick={next}>▶</button>
                    <button className={styles.btnSecondary} onClick={() => setDate(today)}>Today</button>
                    <button className={styles.btnSecondary} onClick={handlePrint} title="Print diary">🖨 Print</button>
                    <button className={styles.btnSecondary} onClick={handleWhatsApp} title="Share via WhatsApp" style={{ background: "#25d366", color: "#fff", borderColor: "#25d366" }}>📲 WhatsApp</button>
                    <button className={styles.btnSecondary} onClick={() => { setBriefStatus(null); setShowBriefModal(true); }} title="Send WhatsApp morning brief" style={{ background: "#075e54", color: "#fff", borderColor: "#075e54" }}>📨 Send Brief</button>
                </div>
            </div>

            {/* Date display */}
            <div style={{ padding: "6px 0 16px", color: "var(--text-2)", fontSize: 14 }}>
                {fmtDate(date)}
                {!loading && <span style={{ marginLeft: 10, color: total === 0 ? "var(--text-3)" : "var(--gold)", fontWeight: 600 }}>
                    {total === 0 ? "— Clear day" : `${total} item${total !== 1 ? "s" : ""}`}
                </span>}
            </div>
            {showingCached && (
                <div className={styles.limAlertBanner} style={{ background: "var(--bg-1)", borderColor: "#c97c2a", marginBottom: "0.75rem", fontSize: "0.82rem" }}>
                    📴 Showing offline copy from {showingCached} — reconnect to refresh.
                </div>
            )}
            {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{err}</div>}

            {loading && <p className={styles.emptyState}>Loading…</p>}
            {err    && <p style={{ color: "#e53e3e", padding: 12 }}>{err}</p>}

            {!loading && !err && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                    {/* ── Hearings column ─────────────────────────────────── */}
                    <div>
                        <h3 style={{ color: "var(--gold)", marginBottom: 10, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
                            ⚖️ Court Hearings ({hearings.length})
                        </h3>
                        {hearings.length === 0 && (
                            <div className={styles.emptyState} style={{ fontSize: 13, padding: "20px 0" }}>No hearings scheduled</div>
                        )}
                        {hearings.map(h => (
                            <div key={h.hearing_id} style={{
                                background: "var(--bg-1)", border: "1px solid var(--border)",
                                borderRadius: 8, padding: "12px 14px", marginBottom: 10,
                                borderLeft: "3px solid var(--gold)"
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                                    {h.hearing_time && (
                                        <span style={{ background: "var(--gold)", color: "#0f1117", borderRadius: 4, padding: "1px 8px", fontSize: 12, fontWeight: 700 }}>
                                            {h.hearing_time}
                                        </span>
                                    )}
                                    {h.title}
                                </div>
                                {h.matter_title && (
                                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
                                        Matter: <strong>{h.matter_title}</strong>
                                        {h.case_number && <span style={{ marginLeft: 6, color: "var(--text-3)" }}>({h.case_number})</span>}
                                    </div>
                                )}
                                {h.court_name  && <div style={{ fontSize: 12, color: "var(--text-2)" }}>🏛 {h.court_name}</div>}
                                {h.judge_name  && <div style={{ fontSize: 12, color: "var(--text-2)" }}>👨‍⚖️ {h.judge_name}</div>}
                                {h.notes       && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>{h.notes}</div>}
                            </div>
                        ))}
                    </div>

                    {/* ── Deadlines column ────────────────────────────────── */}
                    <div>
                        <h3 style={{ color: "#e53e3e", marginBottom: 10, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
                            ⏰ Deadlines ({deadlines.length})
                        </h3>
                        {deadlines.length === 0 && (
                            <div className={styles.emptyState} style={{ fontSize: 13, padding: "20px 0" }}>No deadlines due</div>
                        )}
                        {deadlines.map(d => (
                            <div key={d.deadline_id} style={{
                                background: "var(--bg-1)", border: "1px solid var(--border)",
                                borderRadius: 8, padding: "12px 14px", marginBottom: 10,
                                borderLeft: "3px solid #e53e3e"
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                    {d.title}
                                    {priorityBadge(d.priority)}
                                </div>
                                {d.matter_title && (
                                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
                                        Matter: <strong>{d.matter_title}</strong>
                                        {d.case_number && <span style={{ marginLeft: 6, color: "var(--text-3)" }}>({d.case_number})</span>}
                                    </div>
                                )}
                                {d.notes && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>{d.notes}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Task #172: Morning Brief Modal */}
            {showBriefModal && (
                <div className={styles.modalOverlay} onClick={() => setShowBriefModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>📨 WhatsApp Morning Brief</h3>
                            <button className={styles.modalClose} onClick={() => setShowBriefModal(false)}>✕</button>
                        </div>
                        <div style={{ padding: "1rem 1.25rem" }}>
                            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: "1rem" }}>
                                Send today's diary ({fmtDate(date)}) as a WhatsApp message to a number.
                            </p>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>WhatsApp Number *</label>
                                <input
                                    className={styles.formInput}
                                    value={briefNumber}
                                    onChange={e => setBriefNumber(e.target.value)}
                                    placeholder="+923001234567"
                                    type="tel"
                                />
                                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Include country code, e.g. +92 for Pakistan</div>
                            </div>
                            <div className={styles.formGroup} style={{ marginTop: "0.75rem" }}>
                                <label className={styles.formLabel}>Date</label>
                                <input
                                    className={styles.formInput}
                                    type="date"
                                    value={date}
                                    disabled
                                    style={{ opacity: 0.7 }}
                                />
                            </div>
                            <div style={{ background: "var(--bg-1)", borderRadius: 6, padding: "0.6rem 0.8rem", marginTop: "0.75rem", fontSize: 12, color: "var(--text-2)", borderLeft: "3px solid #25d366" }}>
                                📋 Brief includes {hearings.length} hearing{hearings.length !== 1 ? "s" : ""} and {deadlines.length} deadline{deadlines.length !== 1 ? "s" : ""}.
                            </div>
                            {briefStatus && (
                                <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.8rem", borderRadius: 6, fontSize: 13,
                                    background: briefStatus.ok ? "rgba(37,211,102,0.1)" : "rgba(229,62,62,0.08)",
                                    color: briefStatus.ok ? "#1a9c3e" : "#e53e3e",
                                    border: `1px solid ${briefStatus.ok ? "#25d366" : "#e53e3e"}` }}>
                                    {briefStatus.msg}
                                </div>
                            )}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
                                <button className={styles.btnPrimary} onClick={sendBrief} disabled={briefSending}>
                                    {briefSending ? "Sending…" : "📨 Send via WhatsApp"}
                                </button>
                                <button className={styles.btnSecondary} onClick={() => setShowBriefModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print-only styles */}
            <style>{`
                @media print {
                    body > *:not(#diary-print-area) { display: none !important; }
                    #diary-print-area { display: block !important; color: #000 !important; background: #fff !important; }
                    .${styles.panelHeader} button { display: none !important; }
                }
            `}</style>
        </div>
    );
};

// ── Legal Notices Panel — Task #165 ─────────────────────────────────────────

const LegalNoticesPanel = () => {
    const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem("pe_token") ?? ""}` });

    const [notices, setNotices] = useState<LegalNotice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editNotice, setEditNotice] = useState<LegalNotice | null>(null);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const [filter, setFilter] = useState("All");

    const BLANK = { notice_type: "Legal Notice", sent_to: "", sent_via: "Courier", sent_date: "", status: "Sent", subject: "", content: "", tracking_no: "", notes: "", matter_id: "", client_id: "" };
    const [form, setForm] = useState({ ...BLANK });

    const load = () => {
        setLoading(true);
        fetch("/legal-notices", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setNotices(d.notices || []); setLoading(false); })
            .catch(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const open = (n?: LegalNotice) => {
        setEditNotice(n || null);
        setForm(n ? { notice_type: n.notice_type, sent_to: n.sent_to, sent_via: n.sent_via, sent_date: n.sent_date || "", status: n.status, subject: n.subject || "", content: n.content || "", tracking_no: n.tracking_no || "", notes: n.notes || "", matter_id: n.matter_id || "", client_id: n.client_id || "" } : { ...BLANK });
        setErr(""); setShowModal(true);
    };
    const save = async () => {
        if (!form.sent_to.trim()) { setErr("Recipient (sent to) is required"); return; }
        setSaving(true); setErr("");
        const url = editNotice ? `/legal-notices/${editNotice.notice_id}` : "/legal-notices";
        const method = editNotice ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(form) });
        setSaving(false);
        if (res.ok) { setShowModal(false); load(); }
        else { const e = await res.json(); setErr(e.error || "Save failed"); }
    };
    const del = async (id: string) => {
        if (!confirm("Delete this notice record?")) return;
        await fetch(`/legal-notices/${id}`, { method: "DELETE", headers: authHeaders() });
        load();
    };

    const visible = filter === "All" ? notices : notices.filter(n => n.status === filter);
    const statuses = ["All", "Draft", "Sent", "Acknowledged", "No Response", "Replied", "Withdrawn"];
    const noticeTypes = ["Legal Notice", "Demand Notice", "Eviction Notice", "Vakalatnama", "Reply Notice", "Termination Notice", "Cease & Desist", "Other"];
    const viaOptions = ["Courier", "Registered Post", "Email", "WhatsApp", "Hand Delivery", "Process Server"];

    const statusColour = (s: string) => s === "Sent" ? "#2563eb" : s === "Acknowledged" ? "#16a34a" : s === "No Response" ? "#dc2626" : s === "Replied" ? "#7c3aed" : "var(--text-2)";

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>📨 Legal Notices</h2>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select className={styles.filterInput} value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto" }}>
                        {statuses.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button className={styles.btnPrimary} onClick={() => open()}>+ New Notice</button>
                </div>
            </div>
            <p className={styles.panelSub}>Track legal notices sent and received — demand notices, eviction notices, reply notices, and more.</p>

            {loading ? <div className={styles.emptyState}>Loading…</div> : visible.length === 0 ? (
                <div className={styles.emptyState}>No notice records found. Add your first legal notice to start tracking.</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {visible.map(n => (
                        <div key={n.notice_id} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.9rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{n.subject || n.notice_type}</span>
                                    <span style={{ marginLeft: "0.75rem", padding: "2px 8px", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: 700, background: "var(--bg-2)", color: statusColour(n.status) }}>{n.status}</span>
                                </div>
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                    <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => open(n)}>Edit</button>
                                    <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => del(n.notice_id)}>Del</button>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.4rem 1rem", marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--text-2)" }}>
                                <span><strong>To:</strong> {n.sent_to}</span>
                                <span><strong>Type:</strong> {n.notice_type}</span>
                                <span><strong>Via:</strong> {n.sent_via}</span>
                                {n.sent_date && <span><strong>Sent:</strong> {n.sent_date}</span>}
                                {n.response_due && <span><strong>Reply Due:</strong> {n.response_due}</span>}
                                {n.response_date && <span><strong>Replied:</strong> {n.response_date}</span>}
                                {n.tracking_no && <span><strong>Tracking:</strong> {n.tracking_no}</span>}
                            </div>
                            {n.notes && <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-3)", fontStyle: "italic" }}>{n.notes}</div>}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: 560 }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{editNotice ? "Edit Notice" : "Add Legal Notice"}</h3>
                            <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Notice Type</label>
                                <select className={styles.formInput} value={form.notice_type} onChange={e => setForm(f => ({ ...f, notice_type: e.target.value }))}>
                                    {noticeTypes.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Status</label>
                                <select className={styles.formInput} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                    {["Draft","Sent","Acknowledged","No Response","Replied","Withdrawn"].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Subject</label>
                            <input className={styles.formInput} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Legal Notice for Recovery of PKR 5,00,000" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Sent To (Recipient) *</label>
                            <input className={styles.formInput} value={form.sent_to} onChange={e => setForm(f => ({ ...f, sent_to: e.target.value }))} placeholder="Name and address of recipient" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sent Via</label>
                                <select className={styles.formInput} value={form.sent_via} onChange={e => setForm(f => ({ ...f, sent_via: e.target.value }))}>
                                    {viaOptions.map(v => <option key={v}>{v}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Sent Date</label>
                                <input type="date" className={styles.formInput} value={form.sent_date} onChange={e => setForm(f => ({ ...f, sent_date: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Tracking No.</label>
                                <input className={styles.formInput} value={form.tracking_no} onChange={e => setForm(f => ({ ...f, tracking_no: e.target.value }))} placeholder="Courier/postal ref" />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Notice Content (summary)</label>
                            <textarea className={styles.formInput} rows={3} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Brief summary of notice content…" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Notes</label>
                            <textarea className={styles.formInput} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional follow-up notes…" />
                        </div>
                        {err && <div className={styles.formError}>{err}</div>}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                            <button className={styles.btnGhost} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Outstanding Dues Panel — Task #169 ───────────────────────────────────────

const OutstandingDuesPanel = () => {
    const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem("pe_token") ?? ""}` });
    const [invoices, setInvoices] = useState<OutstandingInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [bucket, setBucket] = useState("All");

    useEffect(() => {
        fetch("/outstanding-dues", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setInvoices(d.invoices || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const buckets = ["All", "Current", "0-30 days", "31-60 days", "60+ days"];
    const visible = bucket === "All" ? invoices : invoices.filter(i => i.aging_bucket === bucket);

    const totalBalance = visible.reduce((s, i) => s + i.balance, 0);

    const bucketColour = (b: string) => b === "Current" ? "#16a34a" : b === "0-30 days" ? "#f59e0b" : b === "31-60 days" ? "#f97316" : b === "60+ days" ? "#dc2626" : "var(--text-2)";

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>💰 Outstanding Dues</h2>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <select className={styles.filterInput} value={bucket} onChange={e => setBucket(e.target.value)} style={{ width: "auto" }}>
                        {buckets.map(b => <option key={b}>{b}</option>)}
                    </select>
                </div>
            </div>
            <p className={styles.panelSub}>Aging report of all unpaid invoices across matters. Filter by overdue bucket.</p>

            {!loading && (
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    {["Current", "0-30 days", "31-60 days", "60+ days"].map(b => {
                        const cnt = invoices.filter(i => i.aging_bucket === b).length;
                        const tot = invoices.filter(i => i.aging_bucket === b).reduce((s, i) => s + i.balance, 0);
                        return (
                            <div key={b} onClick={() => setBucket(b === bucket ? "All" : b)} style={{ cursor: "pointer", flex: "1 1 140px", background: "var(--bg-1)", border: `2px solid ${bucket === b ? bucketColour(b) : "var(--border)"}`, borderRadius: "var(--radius)", padding: "0.75rem", textAlign: "center" }}>
                                <div style={{ fontSize: "0.75rem", color: bucketColour(b), fontWeight: 700, textTransform: "uppercase" }}>{b}</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 4 }}>PKR {tot.toLocaleString()}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{cnt} invoice{cnt !== 1 ? "s" : ""}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {loading ? <div className={styles.emptyState}>Loading…</div> : visible.length === 0 ? (
                <div className={styles.emptyState}>No outstanding invoices{bucket !== "All" ? ` in bucket: ${bucket}` : ""}. All dues are clear!</div>
            ) : (<>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>{visible.length} invoice{visible.length !== 1 ? "s" : ""}</span>
                    <strong style={{ color: "#dc2626" }}>Total Outstanding: PKR {totalBalance.toLocaleString()}</strong>
                </div>
                <table className={styles.feeTable}>
                    <thead><tr>
                        <th>Matter</th>
                        <th>Client</th>
                        <th>Invoice Date</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Aging</th>
                        <th>Status</th>
                    </tr></thead>
                    <tbody>
                        {visible.map(inv => (
                            <tr key={inv.invoice_id}>
                                <td style={{ fontSize: "0.82rem" }}>{inv.matter_title}</td>
                                <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{inv.client_name}</td>
                                <td style={{ fontSize: "0.82rem" }}>{inv.invoice_date}</td>
                                <td style={{ fontSize: "0.82rem" }}>PKR {inv.total_pkr.toLocaleString()}</td>
                                <td style={{ fontSize: "0.82rem", color: "#16a34a" }}>PKR {inv.paid_pkr.toLocaleString()}</td>
                                <td style={{ fontSize: "0.85rem", fontWeight: 700, color: "#dc2626" }}>PKR {inv.balance.toLocaleString()}</td>
                                <td><span style={{ fontSize: "0.72rem", fontWeight: 700, color: bucketColour(inv.aging_bucket) }}>{inv.aging_bucket}</span></td>
                                <td><span style={{ fontSize: "0.72rem", fontWeight: 700 }}>{inv.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </>)}
        </div>
    );
};

// ── Staff & Salary Panel — Task #171 ─────────────────────────────────────────

const StaffPanel = () => {
    const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem("pe_token") ?? ""}` });

    const [tab, setTab] = useState<"staff" | "attendance" | "salary">("staff");
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attList, setAttList] = useState<StaffAttendance[]>([]);
    const [salaryList, setSalaryList] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
    const [staffSaving, setStaffSaving] = useState(false);
    const [staffErr, setStaffErr] = useState("");
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [salaryTarget, setSalaryTarget] = useState<StaffMember | null>(null);
    const [salarySaving, setSalarySaving] = useState(false);
    const [salaryErr, setSalaryErr] = useState("");

    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    const BLANK_STAFF = { name: "", role: "Clerk", monthly_salary_pkr: 0, join_date: "", cnic: "", phone: "", status: "Active", notes: "" };
    const [staffForm, setStaffForm] = useState({ ...BLANK_STAFF });
    const BLANK_SALARY = { month: thisMonth, gross_pkr: 0, advance_deduction: 0, absence_deduction: 0, paid_date: today, payment_mode: "Cash", notes: "" };
    const [salaryForm, setSalaryForm] = useState({ ...BLANK_SALARY });

    const [attDate, setAttDate] = useState(today);
    const [attSaving, setAttSaving] = useState(false);
    const [attMap, setAttMap] = useState<Record<string, { status: string; time_in: string; time_out: string }>>({});

    const loadStaff = () => {
        setLoading(true);
        fetch("/staff", { headers: authHeaders() })
            .then(r => r.json())
            .then(d => { setStaffList(d.staff || []); setLoading(false); })
            .catch(() => setLoading(false));
    };
    const loadAttendance = (d: string) => {
        fetch(`/staff/attendance?date=${d}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(data => {
                const map: Record<string, { status: string; time_in: string; time_out: string }> = {};
                (data.attendance || []).forEach((a: StaffAttendance) => { map[a.staff_id] = { status: a.status, time_in: a.time_in || "", time_out: a.time_out || "" }; });
                setAttList(data.attendance || []);
                setAttMap(map);
            });
    };
    const loadSalary = () => {
        fetch(`/staff/salary?month=${thisMonth}`, { headers: authHeaders() })
            .then(r => r.json())
            .then(d => setSalaryList(d.payments || []));
    };

    useEffect(() => {
        loadStaff();
    }, []);
    useEffect(() => {
        if (tab === "attendance") loadAttendance(attDate);
        if (tab === "salary") loadSalary();
    }, [tab, attDate]);

    const openStaffModal = (s?: StaffMember) => {
        setEditStaff(s || null);
        setStaffForm(s ? { name: s.name, role: s.role, monthly_salary_pkr: s.monthly_salary_pkr, join_date: s.join_date || "", cnic: s.cnic || "", phone: s.phone || "", status: s.status, notes: s.notes || "" } : { ...BLANK_STAFF });
        setStaffErr(""); setShowStaffModal(true);
    };
    const saveStaff = async () => {
        if (!staffForm.name.trim()) { setStaffErr("Name is required"); return; }
        setStaffSaving(true); setStaffErr("");
        const url = editStaff ? `/staff/${editStaff.staff_id}` : "/staff";
        const method = editStaff ? "PATCH" : "POST";
        const res = await fetch(url, { method, headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(staffForm) });
        setStaffSaving(false);
        if (res.ok) { setShowStaffModal(false); loadStaff(); }
        else { const e = await res.json(); setStaffErr(e.error || "Save failed"); }
    };
    const deleteStaff = async (id: string) => {
        if (!confirm("Remove this staff member?")) return;
        await fetch(`/staff/${id}`, { method: "DELETE", headers: authHeaders() });
        loadStaff();
    };

    const saveAttendance = async (staffId: string, status: string, timeIn = "", timeOut = "") => {
        setAttSaving(true);
        await fetch("/staff/attendance", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: staffId, att_date: attDate, status, time_in: timeIn || undefined, time_out: timeOut || undefined }) });
        setAttMap(prev => ({ ...prev, [staffId]: { status, time_in: timeIn, time_out: timeOut } }));
        setAttSaving(false);
    };

    const openSalaryModal = (s: StaffMember) => {
        setSalaryTarget(s);
        setSalaryForm({ ...BLANK_SALARY, gross_pkr: s.monthly_salary_pkr });
        setSalaryErr(""); setShowSalaryModal(true);
    };
    const saveSalary = async () => {
        if (!salaryTarget) return;
        setSalarySaving(true); setSalaryErr("");
        const res = await fetch("/staff/salary", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ staff_id: salaryTarget.staff_id, ...salaryForm }) });
        setSalarySaving(false);
        if (res.ok) { setShowSalaryModal(false); loadSalary(); }
        else { const e = await res.json(); setSalaryErr(e.error || "Save failed"); }
    };
    const deleteSalary = async (id: string) => {
        if (!confirm("Delete this salary payment record?")) return;
        await fetch(`/staff/salary/${id}`, { method: "DELETE", headers: authHeaders() });
        loadSalary();
    };

    const STAFF_ROLES = ["Senior Advocate", "Junior Advocate", "Clerk", "Para-Legal", "Receptionist", "Accountant", "Office Boy", "Driver", "Peon"];
    const ATT_STATUSES = ["Present", "Absent", "Half Day", "Leave", "Holiday"];

    const salaryMap: Record<string, number> = {};
    salaryList.forEach(p => { salaryMap[p.staff_id] = (salaryMap[p.staff_id] || 0) + p.net_paid_pkr; });

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>👥 Staff & Salary</h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {(["staff", "attendance", "salary"] as const).map(t => (
                        <button key={t} className={tab === t ? styles.btnPrimary : styles.btnGhost} style={{ fontSize: "0.8rem", textTransform: "capitalize" }} onClick={() => setTab(t)}>{t === "staff" ? "👤 Staff" : t === "attendance" ? "📋 Attendance" : "💵 Salary"}</button>
                    ))}
                </div>
            </div>
            <p className={styles.panelSub}>Manage office staff — advocates, clerks, and support — with daily attendance and monthly salary records.</p>

            {/* ── Staff tab ── */}
            {tab === "staff" && (<>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
                    <button className={styles.btnPrimary} onClick={() => openStaffModal()}>+ Add Staff</button>
                </div>
                {loading ? <div className={styles.emptyState}>Loading…</div> : staffList.length === 0 ? (
                    <div className={styles.emptyState}>No staff records yet. Add clerks, junior advocates, and office staff to track attendance and salary.</div>
                ) : (
                    <table className={styles.feeTable}>
                        <thead><tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Salary (PKR/mo)</th>
                            <th>Phone</th>
                            <th>Join Date</th>
                            <th>Status</th>
                            <th style={{ width: 120 }}></th>
                        </tr></thead>
                        <tbody>
                            {staffList.map(s => (
                                <tr key={s.staff_id}>
                                    <td><strong>{s.name}</strong></td>
                                    <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.role}</td>
                                    <td>PKR {s.monthly_salary_pkr.toLocaleString()}</td>
                                    <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.phone || "—"}</td>
                                    <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.join_date || "—"}</td>
                                    <td><span style={{ fontSize: "0.75rem", fontWeight: 700, color: s.status === "Active" ? "#16a34a" : "#dc2626" }}>{s.status}</span></td>
                                    <td style={{ display: "flex", gap: 4 }}>
                                        <button className={styles.btnGhost} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openStaffModal(s)}>Edit</button>
                                        <button className={styles.btnPrimary} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openSalaryModal(s)}>💵 Pay</button>
                                        <button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteStaff(s.staff_id)}>Del</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </>)}

            {/* ── Attendance tab ── */}
            {tab === "attendance" && (<>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <label className={styles.formLabel}>Date:</label>
                    <input type="date" className={styles.filterInput} value={attDate} onChange={e => setAttDate(e.target.value)} style={{ width: 160 }} />
                    {attSaving && <span className={styles.muted} style={{ fontSize: "0.78rem" }}>Saving…</span>}
                </div>
                {staffList.length === 0 ? (
                    <div className={styles.emptyState}>No staff found. Add staff members first.</div>
                ) : (
                    <table className={styles.feeTable}>
                        <thead><tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                        </tr></thead>
                        <tbody>
                            {staffList.filter(s => s.status === "Active").map(s => {
                                const att = attMap[s.staff_id] || { status: "Present", time_in: "", time_out: "" };
                                return (
                                    <tr key={s.staff_id}>
                                        <td><strong>{s.name}</strong></td>
                                        <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.role}</td>
                                        <td>
                                            <select className={styles.filterInput} style={{ width: "auto", fontSize: "0.82rem" }} value={att.status}
                                                onChange={e => saveAttendance(s.staff_id, e.target.value, att.time_in, att.time_out)}>
                                                {ATT_STATUSES.map(a => <option key={a}>{a}</option>)}
                                            </select>
                                        </td>
                                        <td>
                                            <input type="time" className={styles.filterInput} style={{ width: 110, fontSize: "0.82rem" }} value={att.time_in}
                                                onChange={e => saveAttendance(s.staff_id, att.status, e.target.value, att.time_out)} />
                                        </td>
                                        <td>
                                            <input type="time" className={styles.filterInput} style={{ width: 110, fontSize: "0.82rem" }} value={att.time_out}
                                                onChange={e => saveAttendance(s.staff_id, att.status, att.time_in, e.target.value)} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </>)}

            {/* ── Salary tab ── */}
            {tab === "salary" && (<>
                <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--text-2)" }}>Showing salary payments for {thisMonth}.</div>
                {staffList.length === 0 ? (
                    <div className={styles.emptyState}>No staff found. Add staff members first.</div>
                ) : (
                    <table className={styles.feeTable}>
                        <thead><tr>
                            <th>Staff Member</th>
                            <th>Role</th>
                            <th>Gross (PKR)</th>
                            <th>Paid This Month</th>
                            <th>Status</th>
                            <th style={{ width: 80 }}></th>
                        </tr></thead>
                        <tbody>
                            {staffList.filter(s => s.status === "Active").map(s => {
                                const paid = salaryMap[s.staff_id] || 0;
                                const isPaid = paid >= s.monthly_salary_pkr;
                                return (
                                    <tr key={s.staff_id}>
                                        <td><strong>{s.name}</strong></td>
                                        <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.role}</td>
                                        <td>PKR {s.monthly_salary_pkr.toLocaleString()}</td>
                                        <td style={{ color: paid > 0 ? "#16a34a" : "var(--text-3)" }}>PKR {paid.toLocaleString()}</td>
                                        <td><span style={{ fontSize: "0.75rem", fontWeight: 700, color: isPaid ? "#16a34a" : "#dc2626" }}>{isPaid ? "✓ Paid" : "Pending"}</span></td>
                                        <td>
                                            <button className={styles.btnPrimary} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openSalaryModal(s)}>+ Pay</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {salaryList.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Payment History — {thisMonth}</div>
                        <table className={styles.feeTable}>
                            <thead><tr>
                                <th>Staff</th>
                                <th>Month</th>
                                <th>Gross</th>
                                <th>Deductions</th>
                                <th>Net Paid</th>
                                <th>Date</th>
                                <th>Mode</th>
                                <th style={{ width: 60 }}></th>
                            </tr></thead>
                            <tbody>
                                {salaryList.map(p => {
                                    const sm = staffList.find(s => s.staff_id === p.staff_id);
                                    return (
                                        <tr key={p.payment_id}>
                                            <td>{sm?.name || "—"}</td>
                                            <td style={{ fontSize: "0.82rem" }}>{p.month}</td>
                                            <td>PKR {p.gross_pkr.toLocaleString()}</td>
                                            <td style={{ color: "#dc2626", fontSize: "0.82rem" }}>-PKR {(p.advance_deduction + p.absence_deduction).toLocaleString()}</td>
                                            <td style={{ fontWeight: 700, color: "#16a34a" }}>PKR {p.net_paid_pkr.toLocaleString()}</td>
                                            <td style={{ fontSize: "0.82rem" }}>{p.paid_date || "—"}</td>
                                            <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{p.payment_mode}</td>
                                            <td><button className={styles.btnDanger} style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteSalary(p.payment_id)}>Del</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </>)}

            {/* Staff add/edit modal */}
            {showStaffModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: 480 }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{editStaff ? "Edit Staff Member" : "Add Staff Member"}</h3>
                            <button className={styles.modalClose} onClick={() => setShowStaffModal(false)}>✕</button>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Full Name *</label>
                            <input className={styles.formInput} value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Role</label>
                                <select className={styles.formInput} value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}>
                                    {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Status</label>
                                <select className={styles.formInput} value={staffForm.status} onChange={e => setStaffForm(f => ({ ...f, status: e.target.value }))}>
                                    {["Active","On Leave","Resigned","Terminated"].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Monthly Salary (PKR)</label>
                                <input type="number" min={0} className={styles.formInput} value={staffForm.monthly_salary_pkr} onChange={e => setStaffForm(f => ({ ...f, monthly_salary_pkr: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Join Date</label>
                                <input type="date" className={styles.formInput} value={staffForm.join_date} onChange={e => setStaffForm(f => ({ ...f, join_date: e.target.value }))} />
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>CNIC</label>
                                <input className={styles.formInput} value={staffForm.cnic} onChange={e => setStaffForm(f => ({ ...f, cnic: e.target.value }))} placeholder="xxxxx-xxxxxxx-x" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Phone</label>
                                <input className={styles.formInput} value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} placeholder="03xx-xxxxxxx" />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Notes</label>
                            <textarea className={styles.formInput} rows={2} value={staffForm.notes} onChange={e => setStaffForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                        </div>
                        {staffErr && <div className={styles.formError}>{staffErr}</div>}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                            <button className={styles.btnGhost} onClick={() => setShowStaffModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={saveStaff} disabled={staffSaving}>{staffSaving ? "Saving…" : "Save"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary payment modal */}
            {showSalaryModal && salaryTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: 460 }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Pay Salary — {salaryTarget.name}</h3>
                            <button className={styles.modalClose} onClick={() => setShowSalaryModal(false)}>✕</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Month</label>
                                <input type="month" className={styles.formInput} value={salaryForm.month} onChange={e => setSalaryForm(f => ({ ...f, month: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Gross (PKR)</label>
                                <input type="number" min={0} className={styles.formInput} value={salaryForm.gross_pkr} onChange={e => setSalaryForm(f => ({ ...f, gross_pkr: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Advance Deduction (PKR)</label>
                                <input type="number" min={0} className={styles.formInput} value={salaryForm.advance_deduction} onChange={e => setSalaryForm(f => ({ ...f, advance_deduction: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Absence Deduction (PKR)</label>
                                <input type="number" min={0} className={styles.formInput} value={salaryForm.absence_deduction} onChange={e => setSalaryForm(f => ({ ...f, absence_deduction: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                        <div style={{ background: "var(--bg-1)", border: "1px solid var(--gold)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                            Net Payable: <strong>PKR {Math.max(0, salaryForm.gross_pkr - salaryForm.advance_deduction - salaryForm.absence_deduction).toLocaleString()}</strong>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Date</label>
                                <input type="date" className={styles.formInput} value={salaryForm.paid_date} onChange={e => setSalaryForm(f => ({ ...f, paid_date: e.target.value }))} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Payment Mode</label>
                                <select className={styles.formInput} value={salaryForm.payment_mode} onChange={e => setSalaryForm(f => ({ ...f, payment_mode: e.target.value }))}>
                                    {["Cash","Bank Transfer","Cheque","JazzCash","Easypaisa"].map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Notes</label>
                            <textarea className={styles.formInput} rows={2} value={salaryForm.notes} onChange={e => setSalaryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                        </div>
                        {salaryErr && <div className={styles.formError}>{salaryErr}</div>}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                            <button className={styles.btnGhost} onClick={() => setShowSalaryModal(false)}>Cancel</button>
                            <button className={styles.btnPrimary} onClick={saveSalary} disabled={salarySaving}>{salarySaving ? "Saving…" : "Record Payment"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Shell ─────────────────────────────────────────────────────────────────────

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
