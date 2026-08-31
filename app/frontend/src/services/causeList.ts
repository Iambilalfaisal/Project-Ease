// Daily LHC cause list — scrape/parse import + matter matching.
import { apiRequest, authHeaders, ApiError } from "./apiRequest";

export interface CauseListEntry {
    entry_id: string;
    list_date: string;
    court_name: string | null;
    item_no: string | null;
    case_number: string | null;
    parties: string | null;
    matter_id: string | null;
    matter_title: string | null;
    matter_status: string | null;
}

export interface CauseListMatterOption {
    matter_id: string;
    title: string;
    case_number: string | null;
}

export interface CauseListParseResult {
    total_count: number;
    matched_count: number;
}

export const PAKISTAN_COURTS = [
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

export function fetchCauseListEntries(date: string): Promise<{ entries: CauseListEntry[] }> {
    return apiRequest<{ entries: CauseListEntry[] }>(`/cause-list?date=${date}`);
}

export async function fetchCauseListMatters(): Promise<CauseListMatterOption[]> {
    const d = await apiRequest<{ matters?: { matter_id: string; title: string; case_number: string | null }[] }>("/matters");
    return (d.matters ?? []).map(m => ({ matter_id: m.matter_id, title: m.title, case_number: m.case_number }));
}

interface ParseTextParams {
    text: string;
    list_date: string;
    court_name: string;
}

/** apiRequest JSON-encodes every body, so the multipart file-upload variant
 * bypasses it and talks to fetch directly, reusing the shared auth header. */
export async function parseCauseListFile(file: File, list_date: string, court_name: string): Promise<CauseListParseResult> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("list_date", list_date);
    fd.append("court_name", court_name);
    const res = await fetch("/cause-list/parse", { method: "POST", headers: authHeaders(), body: fd });
    const d = await res.json();
    if (!res.ok) throw new ApiError(res.status, d.error ?? "Parse failed.");
    return d;
}

export function parseCauseListText(params: ParseTextParams): Promise<CauseListParseResult> {
    return apiRequest<CauseListParseResult>("/cause-list/parse", { method: "POST", body: params });
}

export function deleteCauseListEntry(entryId: string): Promise<void> {
    return apiRequest<void>(`/cause-list/${entryId}`, { method: "DELETE" });
}

export function linkCauseListEntry(entryId: string, matterId: string | null): Promise<void> {
    return apiRequest<void>(`/cause-list/${entryId}`, { method: "PATCH", body: { matter_id: matterId || null } });
}
