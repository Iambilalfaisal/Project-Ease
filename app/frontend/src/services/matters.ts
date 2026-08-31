// Matter list/detail CRUD, courts, matter-teams, client options for the matter
// form, limitation/cause-list alert feeds, conflict checking, LHC case status
// lookup, and matter <-> document linking. Mirrors OwnerPortal.tsx's former
// MattersPanel top-level fetch calls (list view + shared detail-header actions).
import { apiRequest } from "./apiRequest";
import type { Matter, MatterTeam, Client, DocFile } from "../pages/owner/types";
import { fmtBytes, fmtDate } from "../pages/owner/types";

export interface CustomCourt {
    court_id: string;
    name: string;
}

export interface LimitationAlert {
    matter_id: string;
    title: string;
    limitation_date: string;
    limitation_type: string;
    days_remaining: number;
    client_name: string;
}

export interface CauseListMatch {
    matter_id: string;
    matter_title: string;
    case_number: string | null;
    item_no: string | null;
    court_name: string | null;
}

export interface ConflictResult {
    matter_id: string;
    matter_title: string;
    client_name: string;
    opposing_party: string | null;
    status: string;
    reasons: string[];
}

export interface LhcResult {
    status: string;
    message?: string;
    raw_text?: string;
}

export function fetchMatters(): Promise<{ matters: Matter[] }> {
    return apiRequest("/matters", { cacheKey: "matters" });
}

export function fetchMatterTeams(): Promise<{ teams: MatterTeam[] }> {
    return apiRequest("/matter-teams", { cacheKey: "matter-teams" });
}

export function fetchClientOptions(): Promise<{ clients: Client[] }> {
    return apiRequest("/clients", { cacheKey: "clients" });
}

export function fetchCustomCourts(): Promise<{ custom: CustomCourt[] }> {
    return apiRequest("/courts", { cacheKey: "courts" });
}

export function addCustomCourt(name: string): Promise<CustomCourt> {
    return apiRequest("/courts", { method: "POST", body: { name } });
}

export function fetchLimitationAlerts(): Promise<{ alerts: LimitationAlert[] }> {
    return apiRequest("/matters/limitation-alerts", { cacheKey: "matters-limitation-alerts" });
}

export function fetchCauseListTodayMatches(): Promise<{ matches: CauseListMatch[] }> {
    return apiRequest("/cause-list/today-matches", { cacheKey: "cause-list-today-matches" });
}

export function fetchMatterDetail(matterId: string): Promise<Matter> {
    return apiRequest(`/matters/${matterId}`, { cacheKey: `matter-${matterId}` });
}

export function createMatter(body: Record<string, unknown>): Promise<Matter> {
    return apiRequest("/matters", { method: "POST", body });
}

export function updateMatter(matterId: string, body: Record<string, unknown>): Promise<Matter> {
    return apiRequest(`/matters/${matterId}`, { method: "PATCH", body });
}

export function deleteMatter(matterId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}`, { method: "DELETE" });
}

export function checkConflicts(body: { new_client_name: string; opponent_name: string }): Promise<{ conflicts: ConflictResult[] }> {
    return apiRequest("/conflicts/check", { method: "POST", body });
}

export function fetchLhcCaseStatus(caseNo: string): Promise<LhcResult> {
    return apiRequest(`/lhc/case-status?case_no=${encodeURIComponent(caseNo)}`);
}

export async function fetchAllDocumentsForLinking(): Promise<DocFile[]> {
    const d = await apiRequest<{ documents: any[] }>("/documents");
    return (d.documents ?? []).map((doc: any) => ({
        doc_id: doc.doc_id,
        name: doc.filename,
        size: fmtBytes(doc.size_bytes ?? 0),
        size_bytes: doc.size_bytes ?? 0,
        uploaded: fmtDate(doc.uploaded_at ?? ""),
        status: doc.status,
        category_id: doc.category_id ?? null,
        category_name: doc.category_name ?? null,
        matter_id: doc.matter_id ?? null,
    })) as (DocFile & { matter_id: string | null })[];
}

export function linkDocumentToMatter(matterId: string, docId: string): Promise<unknown> {
    return apiRequest(`/matters/${matterId}/documents/${docId}`, { method: "POST" });
}

export function unlinkDocumentFromMatter(matterId: string, docId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/documents/${docId}`, { method: "DELETE" });
}
