// Fees/invoicing, time tracking, expenses, court fees, associate fees, and
// cheque tracking for a single matter.
import { apiRequest } from "./apiRequest";
import type { Fee, TimeEntry, MatterExpense, CourtFeePayment, AssociateFee, MatterCheque, Invoice } from "../pages/owner/types";

// ── Fees ─────────────────────────────────────────────────────────────────────

export function fetchMatterFees(matterId: string): Promise<Fee[]> {
    return apiRequest(`/fees?matter_id=${matterId}`, { cacheKey: `matter-${matterId}-fees` });
}

export interface FeeInput {
    description: string;
    fee_type: string;
    amount: number;
    fee_date: string;
    notes?: string;
    matter_id?: string;
}

export function createFee(body: FeeInput): Promise<Fee> {
    return apiRequest("/fees", { method: "POST", body });
}

export function updateFee(feeId: string, body: Partial<FeeInput> | { is_paid: number }): Promise<Fee> {
    return apiRequest(`/fees/${feeId}`, { method: "PATCH", body });
}

export function deleteFee(feeId: string): Promise<void> {
    return apiRequest(`/fees/${feeId}`, { method: "DELETE" });
}

export function generateInvoiceFromFees(body: { matter_id: string; title: string; issued_date: string; client_id: string }): Promise<Invoice> {
    return apiRequest("/invoices", { method: "POST", body });
}

// ── Time tracking ────────────────────────────────────────────────────────────

export interface TimeEntryInput {
    duration_minutes: number;
    entry_date: string;
    description?: string;
    hourly_rate: number;
    billable: number;
}

export function fetchTimeEntries(matterId: string): Promise<{ entries: TimeEntry[] }> {
    return apiRequest(`/matters/${matterId}/time-entries`, { cacheKey: `matter-${matterId}-time-entries` });
}

export function createTimeEntry(matterId: string, body: TimeEntryInput): Promise<TimeEntry> {
    return apiRequest(`/matters/${matterId}/time-entries`, { method: "POST", body });
}

export function updateTimeEntry(matterId: string, entryId: string, body: TimeEntryInput): Promise<TimeEntry> {
    return apiRequest(`/matters/${matterId}/time-entries/${entryId}`, { method: "PATCH", body });
}

export function deleteTimeEntry(matterId: string, entryId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/time-entries/${entryId}`, { method: "DELETE" });
}

export function billTimeEntries(matterId: string, entryIds: string[], description: string): Promise<unknown> {
    return apiRequest(`/matters/${matterId}/time-entries/bill`, { method: "POST", body: { entry_ids: entryIds, description } });
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpenseInput {
    description: string;
    amount_pkr: number;
    expense_date: string;
    category: string;
    billable: number;
    receipt_ref?: string;
}

export function fetchMatterExpenses(matterId: string): Promise<{ expenses: MatterExpense[] }> {
    return apiRequest(`/matters/${matterId}/expenses`, { cacheKey: `matter-${matterId}-expenses` });
}

export function createExpense(matterId: string, body: ExpenseInput): Promise<MatterExpense> {
    return apiRequest(`/matters/${matterId}/expenses`, { method: "POST", body });
}

export function updateExpense(matterId: string, expenseId: string, body: ExpenseInput): Promise<MatterExpense> {
    return apiRequest(`/matters/${matterId}/expenses/${expenseId}`, { method: "PATCH", body });
}

export function deleteExpense(matterId: string, expenseId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/expenses/${expenseId}`, { method: "DELETE" });
}

// ── Court fees (Punjab Court Fees Act calculator) ───────────────────────────

export interface CourtFeeInput {
    claim_amount_pkr: number;
    fee_type: string;
    calculated_fee: number;
    actual_paid: number;
    payment_date?: string;
    challan_no?: string;
    court?: string;
    notes?: string;
}

export function fetchCourtFees(matterId: string): Promise<{ payments: CourtFeePayment[] }> {
    return apiRequest(`/matters/${matterId}/court-fees`, { cacheKey: `matter-${matterId}-court-fees` });
}

export function calculateCourtFee(claimAmountPkr: number, feeType: string): Promise<{ calculated_fee: number | null }> {
    return apiRequest("/court-fees/calculate", { method: "POST", body: { claim_amount_pkr: claimAmountPkr, fee_type: feeType } });
}

export function createCourtFee(matterId: string, body: CourtFeeInput): Promise<CourtFeePayment> {
    return apiRequest(`/matters/${matterId}/court-fees`, { method: "POST", body });
}

export function updateCourtFee(matterId: string, feePaymentId: string, body: CourtFeeInput): Promise<CourtFeePayment> {
    return apiRequest(`/matters/${matterId}/court-fees/${feePaymentId}`, { method: "PATCH", body });
}

export function deleteCourtFee(matterId: string, feePaymentId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/court-fees/${feePaymentId}`, { method: "DELETE" });
}

// ── Associate / wakeel appearance fees ──────────────────────────────────────

export interface AssociateFeeInput {
    advocate_name: string;
    bar_no?: string;
    appearance_date?: string;
    amount_pkr: number;
    paid: number;
    payment_date?: string;
    notes?: string;
}

export function fetchAssociateFees(matterId: string): Promise<{ fees: AssociateFee[] }> {
    return apiRequest(`/matters/${matterId}/associate-fees`, { cacheKey: `matter-${matterId}-associate-fees` });
}

export function createAssociateFee(matterId: string, body: AssociateFeeInput): Promise<AssociateFee> {
    return apiRequest(`/matters/${matterId}/associate-fees`, { method: "POST", body });
}

export function updateAssociateFee(matterId: string, assocFeeId: string, body: AssociateFeeInput): Promise<AssociateFee> {
    return apiRequest(`/matters/${matterId}/associate-fees/${assocFeeId}`, { method: "PATCH", body });
}

export function deleteAssociateFee(matterId: string, assocFeeId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/associate-fees/${assocFeeId}`, { method: "DELETE" });
}

// ── Post-dated / undated cheques ────────────────────────────────────────────

export interface ChequeInput {
    cheque_no: string;
    bank_name?: string;
    account_title?: string;
    amount_pkr: number;
    cheque_date?: string;
    cheque_type: string;
    status: string;
    received_date?: string;
    presented_date?: string;
    notes?: string;
}

export function fetchCheques(matterId: string): Promise<{ cheques: MatterCheque[] }> {
    return apiRequest(`/matters/${matterId}/cheques`, { cacheKey: `matter-${matterId}-cheques` });
}

export function createCheque(matterId: string, body: ChequeInput): Promise<MatterCheque> {
    return apiRequest(`/matters/${matterId}/cheques`, { method: "POST", body });
}

export function updateCheque(matterId: string, chequeId: string, body: ChequeInput): Promise<MatterCheque> {
    return apiRequest(`/matters/${matterId}/cheques/${chequeId}`, { method: "PATCH", body });
}

export function deleteCheque(matterId: string, chequeId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/cheques/${chequeId}`, { method: "DELETE" });
}
