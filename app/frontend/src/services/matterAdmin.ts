// Matter notes/activity journal, client document requests, internal
// deadlines, correspondence log, matter outcome & disposal, and court
// transfers for a single matter.
import { apiRequest } from "./apiRequest";
import type { DocRequest, MatterDeadline, MatterCorrespondence, MatterOutcome, CourtTransfer } from "../pages/owner/types";

// ── Notes / activity journal ────────────────────────────────────────────────

export interface MatterNote {
    note_id: string;
    note_type: string;
    note_text: string;
    note_date: string;
    author_name?: string;
    created_at: string;
}

export interface MatterNoteInput {
    note_type: string;
    note_text: string;
    note_date: string;
}

export function fetchMatterNotes(matterId: string): Promise<{ notes: MatterNote[] }> {
    return apiRequest(`/matters/${matterId}/notes`, { cacheKey: `matter-${matterId}-notes` });
}

export function createMatterNote(matterId: string, body: MatterNoteInput): Promise<MatterNote> {
    return apiRequest(`/matters/${matterId}/notes`, { method: "POST", body });
}

export function updateMatterNote(matterId: string, noteId: string, body: MatterNoteInput): Promise<MatterNote> {
    return apiRequest(`/matters/${matterId}/notes/${noteId}`, { method: "PATCH", body });
}

export function deleteMatterNote(matterId: string, noteId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/notes/${noteId}`, { method: "DELETE" });
}

// ── Document requests ───────────────────────────────────────────────────────

export interface DocRequestInput {
    doc_name: string;
    requested_date: string;
    due_date: string | null;
    notes: string | null;
    status: string;
    received_date: string | null;
}

export function fetchDocRequests(matterId: string): Promise<{ requests: DocRequest[] }> {
    return apiRequest(`/matters/${matterId}/doc-requests`, { cacheKey: `matter-${matterId}-doc-requests` });
}

export function createDocRequest(matterId: string, body: DocRequestInput): Promise<DocRequest> {
    return apiRequest(`/matters/${matterId}/doc-requests`, { method: "POST", body });
}

export function updateDocRequest(matterId: string, requestId: string, body: Partial<DocRequestInput>): Promise<DocRequest> {
    return apiRequest(`/matters/${matterId}/doc-requests/${requestId}`, { method: "PATCH", body });
}

export function deleteDocRequest(matterId: string, requestId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/doc-requests/${requestId}`, { method: "DELETE" });
}

// ── Internal deadlines ───────────────────────────────────────────────────────

export interface DeadlineInput {
    title: string;
    due_date: string;
    priority: string;
    notes?: string;
}

export function fetchMatterDeadlines(matterId: string): Promise<{ deadlines: MatterDeadline[] }> {
    return apiRequest(`/matters/${matterId}/deadlines`, { cacheKey: `matter-${matterId}-deadlines` });
}

export function createMatterDeadline(matterId: string, body: DeadlineInput): Promise<MatterDeadline> {
    return apiRequest(`/matters/${matterId}/deadlines`, { method: "POST", body });
}

export function updateMatterDeadline(matterId: string, deadlineId: string, body: DeadlineInput | { completed: number }): Promise<MatterDeadline> {
    return apiRequest(`/matters/${matterId}/deadlines/${deadlineId}`, { method: "PATCH", body });
}

export function deleteMatterDeadline(matterId: string, deadlineId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/deadlines/${deadlineId}`, { method: "DELETE" });
}

// ── Correspondence log ───────────────────────────────────────────────────────

export interface CorrespondenceInput {
    subject: string;
    corr_date: string;
    direction: string;
    corr_type: string;
    party: string | null;
    reference_no: string | null;
    notes: string | null;
}

export function fetchCorrespondence(matterId: string): Promise<{ correspondence: MatterCorrespondence[] }> {
    return apiRequest(`/matters/${matterId}/correspondence`, { cacheKey: `matter-${matterId}-correspondence` });
}

export function createCorrespondence(matterId: string, body: CorrespondenceInput): Promise<MatterCorrespondence> {
    return apiRequest(`/matters/${matterId}/correspondence`, { method: "POST", body });
}

export function updateCorrespondence(matterId: string, corrId: string, body: CorrespondenceInput): Promise<MatterCorrespondence> {
    return apiRequest(`/matters/${matterId}/correspondence/${corrId}`, { method: "PATCH", body });
}

export function deleteCorrespondence(matterId: string, corrId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/correspondence/${corrId}`, { method: "DELETE" });
}

// ── Matter outcome & disposal ────────────────────────────────────────────────

export interface OutcomeInput {
    outcome_type: string;
    disposal_date: string;
    court: string;
    judge: string;
    decree_amount_pkr: number | null;
    appeal_filed: number;
    appeal_deadline: string;
    notes: string;
}

export function fetchMatterOutcome(matterId: string): Promise<{ outcome: MatterOutcome | null }> {
    return apiRequest(`/matters/${matterId}/outcome`, { cacheKey: `matter-${matterId}-outcome` });
}

export function saveMatterOutcome(matterId: string, body: OutcomeInput): Promise<MatterOutcome> {
    return apiRequest(`/matters/${matterId}/outcome`, { method: "PUT", body });
}

// ── Court transfers ──────────────────────────────────────────────────────────

export interface CourtTransferInput {
    transfer_date?: string;
    from_court: string;
    to_court: string;
    from_judge?: string;
    to_judge?: string;
    reason?: string;
    order_ref?: string;
    notes?: string;
}

export function fetchCourtTransfers(matterId: string): Promise<{ transfers: CourtTransfer[] }> {
    return apiRequest(`/matters/${matterId}/transfers`, { cacheKey: `matter-${matterId}-transfers` });
}

export function createCourtTransfer(matterId: string, body: CourtTransferInput): Promise<CourtTransfer> {
    return apiRequest(`/matters/${matterId}/transfers`, { method: "POST", body });
}

export function updateCourtTransfer(matterId: string, transferId: string, body: CourtTransferInput): Promise<CourtTransfer> {
    return apiRequest(`/matters/${matterId}/transfers/${transferId}`, { method: "PATCH", body });
}

export function deleteCourtTransfer(matterId: string, transferId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/transfers/${transferId}`, { method: "DELETE" });
}
