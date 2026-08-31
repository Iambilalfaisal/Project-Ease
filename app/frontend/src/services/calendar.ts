// Court Calendar — month-view hearings/deadlines + WhatsApp reminders (bulk court-holiday notice).
import { apiRequest } from "./apiRequest";

export interface Hearing {
    hearing_id: string;
    matter_id: string | null;
    title: string;
    hearing_date: string; // YYYY-MM-DD
    hearing_time: string | null;
    court_name: string | null;
    judge_name: string | null;
    notes: string | null;
    wa_reminder: number;
    matter_title: string | null;
    case_number: string | null;
    hearing_outcome: string | null;
    adj_reason: string | null;
    next_date_fixed_by: string | null;
    assigned_to: string | null;
    assigned_to_name: string | null;
}

export interface Deadline {
    deadline_id: string;
    matter_id: string | null;
    title: string;
    due_date: string; // YYYY-MM-DD
    deadline_type: string;
    notes: string | null;
    is_completed: number;
    wa_reminder: number;
    matter_title: string | null;
    case_number: string | null;
}

export type CalEvent = ({ kind: "hearing" } & Hearing) | ({ kind: "deadline" } & Deadline);

export interface CalendarMatterOption {
    matter_id: string;
    title: string;
}

export interface CalendarTeamMember {
    user_id: string;
    name: string;
}

export interface CalendarData {
    hearings: Hearing[];
    deadlines: Deadline[];
    matters: CalendarMatterOption[];
    teamMembers: CalendarTeamMember[];
}

export async function fetchCalendarData(fromDate: string, toDate: string): Promise<CalendarData> {
    const [h, d, m, t] = await Promise.all([
        apiRequest<Hearing[]>(`/hearings?from_date=${fromDate}&to_date=${toDate}`),
        apiRequest<Deadline[]>(`/deadlines?from_date=${fromDate}&to_date=${toDate}`),
        apiRequest<{ matters?: { matter_id: string; title: string }[] }>("/matters"),
        apiRequest<{ members?: { user_id: string; name: string }[] }>("/team").catch(() => ({ members: [] as { user_id: string; name: string }[] })),
    ]);
    return {
        hearings: Array.isArray(h) ? h : [],
        deadlines: Array.isArray(d) ? d : [],
        matters: (m.matters ?? []).map(x => ({ matter_id: x.matter_id, title: x.title })),
        teamMembers: (t.members ?? []).map(x => ({ user_id: x.user_id, name: x.name })),
    };
}

export interface HearingFormBody {
    title: string;
    hearing_date: string;
    hearing_time?: string;
    court_name?: string;
    judge_name?: string;
    matter_id?: string;
    notes?: string;
    wa_reminder: boolean;
    hearing_outcome?: string;
    adj_reason?: string;
    next_date_fixed_by?: string;
    assigned_to?: string;
}

export interface DeadlineFormBody {
    title: string;
    due_date: string;
    deadline_type: string;
    matter_id?: string;
    notes?: string;
    wa_reminder: boolean;
}

export function saveHearing(id: string | undefined, body: HearingFormBody): Promise<Hearing> {
    return apiRequest<Hearing>(id ? `/hearings/${id}` : "/hearings", { method: id ? "PATCH" : "POST", body });
}

export function saveDeadline(id: string | undefined, body: DeadlineFormBody): Promise<Deadline> {
    return apiRequest<Deadline>(id ? `/deadlines/${id}` : "/deadlines", { method: id ? "PATCH" : "POST", body });
}

export function deleteHearing(id: string): Promise<void> {
    return apiRequest<void>(`/hearings/${id}`, { method: "DELETE" });
}

export function deleteDeadline(id: string): Promise<void> {
    return apiRequest<void>(`/deadlines/${id}`, { method: "DELETE" });
}

export function setDeadlineCompleted(id: string, completed: boolean): Promise<Deadline> {
    return apiRequest<Deadline>(`/deadlines/${id}`, { method: "PATCH", body: { is_completed: completed ? 1 : 0 } });
}

export interface HolidayPreviewClient {
    client_id: string;
    client_name: string;
    matter_titles: string;
}

export function fetchHolidayPreview(fromDate: string, toDate: string): Promise<{ clients: HolidayPreviewClient[] }> {
    return apiRequest<{ clients: HolidayPreviewClient[] }>(`/calendar/notify-holiday/preview?from_date=${fromDate}&to_date=${toDate}`);
}

export interface HolidayNotifyResult {
    notified: number;
    failed: number;
    skipped_no_phone: number;
}

export function sendHolidayNotify(fromDate: string, toDate: string, message?: string): Promise<HolidayNotifyResult> {
    return apiRequest<HolidayNotifyResult>("/calendar/notify-holiday", {
        method: "POST",
        body: { from_date: fromDate, to_date: toDate, message: message || undefined },
    });
}
