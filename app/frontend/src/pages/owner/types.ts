// Domain types shared across OwnerPortal's shell and panel screens.
// Mirrors the backend's SQLite row shapes (db.py) — keep in sync when a column changes.

export type Panel =
    | "overview"
    | "documents"
    | "clients"
    | "matters"
    | "calendar"
    | "diary"
    | "invoices"
    | "team"
    | "subscription"
    | "settings"
    | "audit"
    | "drafting"
    | "causelist"
    | "vakalat"
    | "intelligence"
    | "notices"
    | "dues"
    | "staff";

export interface Category {
    category_id: string;
    name: string;
}

export interface DocFile {
    doc_id: string;
    name: string; // filename
    size: string; // formatted string, e.g. "1.2 MB"
    size_bytes: number;
    uploaded: string; // date string
    status: "ready" | "processing" | "error";
    category_id: string | null;
    category_name: string | null;
}

export interface TeamMember {
    user_id: string;
    name: string;
    email: string;
    role: string;
    joined: string;
    whatsapp_number?: string | null;
}

export interface Usage {
    total_docs: number;
    total_bytes: number;
}

export interface Client {
    client_id: string;
    name: string;
    client_type: "Individual" | "Corporate";
    email?: string;
    phone?: string;
    address?: string;
    cnic_ntn?: string;
    notes?: string;
    referral_source?: string;
    created_at: string;
    matter_count?: number;
}

export interface MatterTeam {
    team_id: string;
    name: string;
    members: { user_id: string; name: string }[];
}

export interface MatterDoc {
    doc_id: string;
    filename: string;
    size_bytes: number;
    status: string;
    category_id: string | null;
    category_name: string | null;
    uploaded_at: string;
    matter_id?: string | null;
}

export interface Matter {
    matter_id: string;
    client_id: string;
    client_name: string;
    client_phone?: string;
    title: string;
    matter_type: string;
    status: "Active" | "Pending" | "Closed" | "Settled" | "Withdrawn";
    court_name?: string;
    case_number?: string;
    filing_date?: string;
    opposing_party?: string;
    team_id?: string;
    team_name?: string;
    notes?: string;
    limitation_type?: string;
    cause_of_action_date?: string;
    limitation_date?: string;
    vakalatnama_status?: string;
    adjournment_count?: number;
    priority?: string;
    physical_file_ref?: string;
    rack_no?: string;
    bundle_no?: string;
    parent_matter_id?: string | null;
    matter_stage?: string | null;
    created_at: string;
    doc_count?: number;
    documents?: MatterDoc[];
}

export interface ClientToken {
    token_id: string;
    token: string;
    client_id: string;
    matter_id: string | null;
    label: string | null;
    expires_at: string | null;
    is_active: number;
    created_at: string;
}

export interface Fee {
    fee_id: string;
    matter_id: string | null;
    description: string;
    fee_type: string;
    amount: number;
    fee_date: string;
    is_paid: number;
    paid_at: string | null;
    invoice_id: string | null;
    notes: string | null;
    matter_title: string | null;
}

export interface Invoice {
    invoice_id: string;
    matter_id: string | null;
    client_id: string | null;
    invoice_number: string;
    title: string;
    status: "draft" | "sent" | "paid" | "cancelled";
    issued_date: string;
    due_date: string | null;
    total_amount: number;
    wht_rate: number;
    wht_amount: number;
    net_payable: number;
    org_ntn: string | null;
    client_ntn: string | null;
    notes: string | null;
    matter_title: string | null;
    case_number: string | null;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    fees?: Fee[];
}

export interface TimeEntry {
    entry_id: string;
    matter_id: string;
    user_id: string | null;
    user_name: string | null;
    description: string | null;
    entry_date: string;
    duration_minutes: number;
    hourly_rate: number;
    billable: number;
    fee_id: string | null;
    created_at: string;
}

export interface MatterDeadline {
    deadline_id: string;
    matter_id: string;
    title: string;
    due_date: string;
    priority: string;
    completed: number;
    completed_at: string | null;
    notes: string | null;
    created_at: string;
}

export interface MatterExpense {
    expense_id: string;
    matter_id: string;
    description: string;
    amount_pkr: number;
    expense_date: string;
    category: string;
    billable: number;
    receipt_ref: string | null;
    created_at: string;
}

export interface MatterCorrespondence {
    corr_id: string;
    matter_id: string;
    corr_date: string;
    direction: string;
    corr_type: string;
    subject: string;
    party: string | null;
    reference_no: string | null;
    notes: string | null;
    created_at: string;
}

export interface CourtFeePayment {
    fee_payment_id: string;
    matter_id: string;
    claim_amount_pkr: number;
    fee_type: string;
    calculated_fee: number;
    actual_paid: number;
    payment_date: string | null;
    challan_no: string | null;
    court: string | null;
    notes: string | null;
    created_at: string;
}

export interface MatterCheque {
    cheque_id: string;
    matter_id: string;
    cheque_no: string;
    bank_name: string | null;
    account_title: string | null;
    amount_pkr: number;
    cheque_date: string | null;
    cheque_type: string;
    status: string;
    received_date: string | null;
    presented_date: string | null;
    notes: string | null;
    created_at: string;
}

export interface BailBond {
    bond_id: string;
    matter_id: string;
    accused_name: string;
    bail_type: string;
    bail_amount_pkr: number;
    surety_name: string | null;
    surety_cnic: string | null;
    surety_address: string | null;
    surety_property: string | null;
    property_value: number | null;
    court: string | null;
    judge: string | null;
    granted_date: string | null;
    expiry_date: string | null;
    status: string;
    bail_order_ref: string | null;
    notes: string | null;
    created_at: string;
}

export interface CourtTransfer {
    transfer_id: string;
    matter_id: string;
    transfer_date: string | null;
    from_court: string;
    to_court: string;
    from_judge: string | null;
    to_judge: string | null;
    reason: string | null;
    order_ref: string | null;
    notes: string | null;
    created_at: string;
}

export interface LegalNotice {
    notice_id: string;
    matter_id: string | null;
    client_id: string | null;
    notice_type: string;
    sent_to: string;
    sent_via: string;
    sent_date: string | null;
    response_due: string | null;
    response_date: string | null;
    status: string;
    subject: string | null;
    content: string | null;
    tracking_no: string | null;
    notes: string | null;
    created_at: string;
}

export interface OutstandingInvoice {
    invoice_id: string;
    matter_title: string;
    client_name: string;
    total_pkr: number;
    paid_pkr: number;
    balance: number;
    invoice_date: string;
    due_date: string | null;
    status: string;
    aging_bucket: string;
}

export interface StaffMember {
    staff_id: string;
    name: string;
    role: string;
    monthly_salary_pkr: number;
    join_date: string | null;
    cnic: string | null;
    phone: string | null;
    status: string;
    notes: string | null;
}

export interface StaffAttendance {
    att_id: string;
    staff_id: string;
    att_date: string;
    status: string;
    time_in: string | null;
    time_out: string | null;
    notes: string | null;
}

export interface SalaryPayment {
    payment_id: string;
    staff_id: string;
    month: string;
    gross_pkr: number;
    advance_deduction: number;
    absence_deduction: number;
    net_paid_pkr: number;
    paid_date: string | null;
    payment_mode: string;
    notes: string | null;
}

export interface AssociateFee {
    assoc_fee_id: string;
    matter_id: string;
    advocate_name: string;
    bar_no: string | null;
    appearance_date: string | null;
    amount_pkr: number;
    paid: number;
    payment_date: string | null;
    notes: string | null;
    created_at: string;
}

export interface MatterChallan {
    challan_id: string;
    matter_id: string;
    challan_date: string | null;
    challan_type: string;
    submitted_in_time: number;
    witnesses_count: number;
    challan_court: string | null;
    status: string;
    notes: string | null;
    created_at: string;
}

export interface MatterFir {
    fir_id: string;
    matter_id: string;
    fir_number: string;
    police_station: string;
    district: string | null;
    io_name: string | null;
    complainant: string | null;
    arrest_date: string | null;
    sections_at_fir: string | null;
    sections_after_challan: string | null;
    fir_date: string | null;
    notes: string | null;
    created_at: string;
}

export interface MatterCharge {
    charge_id: string;
    matter_id: string;
    section_no: string;
    description: string | null;
    plea: string;
    charge_framed: number;
    charge_framed_date: string | null;
    court: string | null;
    notes: string | null;
    created_at: string;
}

export interface MatterOutcome {
    outcome_id: string;
    matter_id: string;
    disposal_date: string | null;
    outcome_type: string;
    court: string | null;
    judge: string | null;
    decree_amount_pkr: number | null;
    appeal_filed: number;
    appeal_deadline: string | null;
    notes: string | null;
    modified_at: string;
}

export interface MatterRelief {
    relief_id: string;
    matter_id: string;
    application_date: string;
    relief_type: string;
    court: string | null;
    judge: string | null;
    status: string;
    conditions: string | null;
    surety_amount_pkr: number | null;
    surety_name: string | null;
    notes: string | null;
    created_at: string;
}

export interface Witness {
    witness_id: string;
    matter_id: string;
    witness_name: string;
    witness_type: string;
    contact_number: string | null;
    address: string | null;
    statement_status: string;
    notes: string | null;
    created_at: string;
}

export interface DocRequest {
    request_id: string;
    matter_id: string;
    doc_name: string;
    requested_date: string;
    due_date: string | null;
    status: string;
    notes: string | null;
    received_date: string | null;
    created_at: string;
}

export interface AdverseParty {
    party_id: string;
    matter_id: string;
    party_name: string;
    party_type: string;
    counsel_name: string | null;
    counsel_phone: string | null;
    counsel_firm: string | null;
    notes: string | null;
    created_at: string;
}

export interface CourtOrder {
    order_id: string;
    matter_id: string;
    hearing_date: string;
    court_name: string | null;
    order_brief: string;
    next_date: string | null;
    outcome: "Adjourned" | "Heard" | "Decided" | "Partially Heard";
    created_at: string;
    _offline?: boolean; // client-side only: queued locally, not yet synced
}

export interface AuditLog {
    log_id: string;
    org_id: string | null;
    user_id: string | null;
    actor_name: string | null;
    actor_role: string | null;
    event_type: string;
    resource_type: string | null;
    resource_id: string | null;
    resource_name: string | null;
    details: string | null; // JSON string
    ip_address: string | null;
    created_at: string;
}

export interface Template {
    template_id: string;
    org_id: string;
    title: string;
    template_type: string;
    content: string;
    description: string | null;
    created_at: string;
    modified_at: string;
}

export function fmtBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
}

export function fmtDate(iso: string): string {
    return iso ? iso.slice(0, 10) : "";
}
