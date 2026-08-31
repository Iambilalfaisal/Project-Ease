// Daily Diary — date-scoped hearings/deadlines (offline-cached for court use) + WhatsApp morning brief.
import { apiRequest, authHeaders } from "./apiRequest";
import { fetchWithCache } from "../offline/offlineQueue";

export interface DiaryHearing {
    hearing_id: string;
    title: string;
    hearing_time?: string;
    court_name?: string;
    judge_name?: string;
    matter_title?: string;
    case_number?: string;
    notes?: string;
}

export interface DiaryDeadline {
    deadline_id: string;
    title: string;
    priority?: string;
    matter_title?: string;
    case_number?: string;
    notes?: string;
}

export interface DiaryData {
    hearings: DiaryHearing[];
    deadlines: DiaryDeadline[];
}

/** Bypasses apiRequest — the diary needs the read-through cache's fromCache/cachedAt
 * metadata (for the "showing offline copy" banner), which apiRequest's cacheKey path
 * doesn't surface. fetchWithCache is the same shared offline utility apiRequest wraps. */
export function fetchDiary(date: string): Promise<{ data: DiaryData; fromCache: boolean; cachedAt?: number }> {
    return fetchWithCache<DiaryData>(`/diary/${date}`, `diary:${date}`, authHeaders());
}

export interface SendBriefResult {
    sent?: boolean;
    to?: string;
    reason?: string;
    message?: string;
    error?: string;
}

export function sendDiaryBrief(toNumber: string, date: string): Promise<SendBriefResult> {
    return apiRequest<SendBriefResult>("/diary/send-brief", { method: "POST", body: { to_number: toNumber, date } });
}
