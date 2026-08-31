// Shared constants, option lists, and small pure helpers used across the
// Matters screens. Mirrors module-level constants that lived above
// MattersPanel in the pre-split OwnerPortal.tsx — duplicated here rather than
// imported since OwnerPortal.tsx's copies aren't exported and that file isn't
// touched by this migration pass.
import type { BadgeTone } from "../../../../components/ui";
import type { MatterDoc } from "../../types";

export const MATTER_TYPES = [
    "Criminal Defence", "Civil Litigation", "Family & Personal Law",
    "Property & Real Estate", "Corporate & Commercial", "Tax & Revenue",
    "Constitutional & Public Law", "Banking & Finance",
    "Labour & Employment", "Intellectual Property",
];

export const MATTER_STATUSES = ["Active", "Pending", "Closed", "Settled", "Withdrawn"] as const;
export type MatterStatus = typeof MATTER_STATUSES[number];

export const FEE_TYPES = ["Consultation", "Court Appearance", "Filing Fee", "Legal Research", "Document Drafting", "Miscellaneous"] as const;

export function fmtPKR(n: number): string {
    if (n === 0) return "Free";
    return "PKR " + n.toLocaleString("en-PK");
}

export const DEFAULT_COURTS = [
    "Supreme Court of Pakistan", "Federal Shariat Court",
    "Lahore High Court", "Sindh High Court", "Islamabad High Court",
    "Peshawar High Court", "Balochistan High Court",
    "Gilgit-Baltistan Chief Court", "Azad Kashmir High Court",
    "District & Sessions Court", "Civil Judge Court", "Magistrate Court",
    "Banking Court", "Labour Court", "National Accountability Court",
    "Customs Appellate Tribunal", "Income Tax Appellate Tribunal",
    "Anti-Corruption Establishment Court", "Service Tribunal", "Family Court",
];

export const STATUS_BADGE: Record<string, string> = {
    Active:    "badgeGreen",
    Pending:   "badgeAmber",
    Closed:    "badgeGray",
    Settled:   "badgeBlue",
    Withdrawn: "badgeRed",
};

export function badgeClassToTone(cls: string | undefined): BadgeTone {
    switch (cls) {
        case "badgeGreen": return "green";
        case "badgeAmber": return "amber";
        case "badgeGold":  return "gold";
        case "badgeRed":   return "red";
        case "badgeBlue":  return "blue";
        default:           return "gray";
    }
}

export function groupDocsByCategory(docs: MatterDoc[]): [string, MatterDoc[]][] {
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

export const LIMITATION_TYPES = [
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

export function computeLimitationDate(limType: string, coaDate: string): string {
    const days = LIMITATION_DAYS[limType];
    if (!days || !coaDate) return "";
    const d = new Date(coaDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

export function limitationDaysRemaining(limitationDate: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lim = new Date(limitationDate); lim.setHours(0, 0, 0, 0);
    return Math.round((lim.getTime() - today.getTime()) / 86400000);
}

export const VAKALATNAMA_STATUSES = ["Not Required", "Pending", "Filed"] as const;
export const MATTER_PRIORITIES    = ["Urgent", "High", "Normal", "Low"] as const;

export const BLANK_MATTER: {
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

export const MATTER_STAGES = [
    "Trial Court (Original)", "First Appeal", "Second Appeal", "Revision",
    "Constitutional Petition (LHC)", "Constitutional Petition (SC)",
    "Civil/Criminal Appeal (SC)", "Execution Proceedings", "Review Petition",
];

// ── Tab-scoped option lists & blank form shapes ─────────────────────────────

export const WITNESS_TYPES_UI = ["Prosecution", "Defence", "Expert", "Character", "Other"];
export const STATEMENT_STATUSES_UI = ["Not Taken", "Taken", "Filed", "Cross-Examined"];
export const BLANK_WITNESS = { witness_name: "", witness_type: "Defence", contact_number: "", address: "", statement_status: "Not Taken", notes: "" };

export const BLANK_PARTY = { party_name: "", party_type: "Individual", counsel_name: "", counsel_phone: "", counsel_firm: "", notes: "" };

export const RELIEF_TYPES_UI    = ["Bail", "Stay Order", "Injunction", "Ad-interim Relief", "Anticipatory Bail", "Other"];
export const RELIEF_STATUSES_UI = ["Pending", "Granted", "Rejected", "Recalled", "Expired", "Withdrawn"];
export const BLANK_RELIEF = { application_date: new Date().toISOString().slice(0, 10), relief_type: "Bail", court: "", judge: "", status: "Pending", conditions: "", surety_amount_pkr: "", surety_name: "", notes: "" };

export const BLANK_TIME_FORM = { description: "", entry_date: new Date().toISOString().slice(0, 10), hours: "", minutes: "", hourly_rate: "", billable: true };

export const BLANK_EXPENSE = { description: "", amount_pkr: "", expense_date: new Date().toISOString().slice(0, 10), category: "Misc", billable: true, receipt_ref: "" };
export const EXPENSE_CATEGORIES_UI = ["Court Fees", "Filing", "Travel", "Printing", "Misc"];

export const COURT_FEE_TYPES_UI = ["Ad Valorem", "Fixed"];
export const BLANK_CF = { claim_amount_pkr: 0, fee_type: "Ad Valorem", calculated_fee: 0, actual_paid: 0, payment_date: "", challan_no: "", court: "", notes: "" };

export const BLANK_AF = { advocate_name: "", bar_no: "", appearance_date: "", amount_pkr: 0, paid: 0, payment_date: "", notes: "" };

export const BLANK_CHQ = { cheque_no: "", bank_name: "", account_title: "", amount_pkr: 0, cheque_date: "", cheque_type: "Post-Dated", status: "Held", received_date: "", presented_date: "", notes: "" };

export const CHALLAN_TYPES_UI   = ["Complete", "Incomplete", "Supplementary"];
export const CHALLAN_STATUSES_UI = ["Pending", "Submitted", "Returned", "Accepted"];
export const BLANK_CHALLAN = { challan_date: "", challan_type: "Complete", submitted_in_time: true, witnesses_count: 0, challan_court: "", status: "Pending", notes: "" };

export const BLANK_FIR_FN = { fir_number: "", police_station: "", district: "", io_name: "", complainant: "", arrest_date: "", sections_at_fir: "", sections_after_challan: "", fir_date: "", notes: "" };

export const PLEA_OPTIONS_UI = ["No Plea", "Not Guilty", "Guilty", "Absconder"];
export const BLANK_CHARGE = { section_no: "", description: "", plea: "No Plea", charge_framed: false, charge_framed_date: "", court: "", notes: "" };

export const BLANK_BOND = { accused_name: "", bail_type: "Pre-Arrest", bail_amount_pkr: 0, surety_name: "", surety_cnic: "", surety_address: "", surety_property: "", property_value: 0, court: "", judge: "", granted_date: "", expiry_date: "", status: "Active", bail_order_ref: "", notes: "" };

export const BLANK_TRANSFER = { transfer_date: "", from_court: "", to_court: "", from_judge: "", to_judge: "", reason: "", order_ref: "", notes: "" };

export const NOTE_TYPES_UI = ["Note", "Call", "Meeting", "Instruction", "Email", "WhatsApp", "Other"];
export const BLANK_NOTE_FORM = { note_type: "Note", note_text: "", note_date: new Date().toISOString().slice(0, 10) };

export const DOC_REQUEST_STATUSES_UI = ["Pending", "Received", "Waived", "Overdue"];
export const BLANK_DOC_REQ = { doc_name: "", requested_date: new Date().toISOString().slice(0, 10), due_date: "", notes: "", status: "Pending", received_date: "" };

export const DEADLINE_PRIORITIES_UI = ["High", "Medium", "Low"];
export const BLANK_DEADLINE = { title: "", due_date: new Date().toISOString().slice(0, 10), priority: "Medium", notes: "" };

export const CORR_DIRECTIONS_UI = ["Sent", "Received"];
export const CORR_TYPES_UI = ["Letter", "Email", "Notice", "Legal Notice", "Application", "Other"];
export const BLANK_CORR = { subject: "", corr_date: new Date().toISOString().slice(0, 10), direction: "Sent", corr_type: "Letter", party: "", reference_no: "", notes: "" };

export const OUTCOME_TYPES_UI = ["Pending", "Decree", "Acquittal", "Conviction", "Compromise", "Dismissed", "Withdrawn", "Settlement", "Other"];
export const BLANK_OUTCOME = { outcome_type: "Pending", disposal_date: "", court: "", judge: "", decree_amount_pkr: "", appeal_filed: false, appeal_deadline: "", notes: "" };
