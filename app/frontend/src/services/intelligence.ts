// Counsel & Judge Intelligence — private notes on opposing counsel and judges.
import { apiRequest } from "./apiRequest";

export interface Counsel {
    counsel_id: string;
    name: string;
    bar_no: string | null;
    firm_name: string | null;
    phone: string | null;
    email: string | null;
    court_preference: string | null;
    known_tactics: string | null;
    private_notes: string | null;
}

export interface Judge {
    judge_id: string;
    name: string;
    court_name: string | null;
    designation: string | null;
    known_for: string | null;
    private_notes: string | null;
}

export interface JudgeStats {
    hearings_count: number;
    outcome_breakdown: Record<string, number>;
    adjournment_rate: number | null;
    bail_bonds_count: number;
}

export function fetchOpposingCounsel(): Promise<{ counsel: Counsel[] }> {
    return apiRequest<{ counsel: Counsel[] }>("/opposing-counsel");
}

export function fetchJudgeNotes(): Promise<{ judges: Judge[] }> {
    return apiRequest<{ judges: Judge[] }>("/judge-notes");
}

export function fetchJudgeStats(judgeId: string): Promise<JudgeStats> {
    return apiRequest<JudgeStats>(`/judge-notes/${judgeId}/stats`);
}

export function saveCounsel(id: string | undefined, form: Record<string, string>): Promise<Counsel> {
    const url = id ? `/opposing-counsel/${id}` : "/opposing-counsel";
    return apiRequest<Counsel>(url, { method: id ? "PATCH" : "POST", body: form });
}

export function saveJudge(id: string | undefined, form: Record<string, string>): Promise<Judge> {
    const url = id ? `/judge-notes/${id}` : "/judge-notes";
    return apiRequest<Judge>(url, { method: id ? "PATCH" : "POST", body: form });
}

export function deleteCounsel(id: string): Promise<void> {
    return apiRequest<void>(`/opposing-counsel/${id}`, { method: "DELETE" });
}

export function deleteJudge(id: string): Promise<void> {
    return apiRequest<void>(`/judge-notes/${id}`, { method: "DELETE" });
}
