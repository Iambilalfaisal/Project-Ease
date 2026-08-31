// Employee's dispatched court hearings — "My Court Assignments" panel.
import { apiRequest } from "./apiRequest";
import type { AssignedHearing } from "../pages/employee/types";

export async function fetchMyHearings(fromDate: string, userId: string): Promise<AssignedHearing[]> {
    const d = await apiRequest<AssignedHearing[] | unknown>(`/hearings?from_date=${fromDate}`);
    return Array.isArray(d) ? d.filter((h: AssignedHearing) => h.assigned_to === userId) : [];
}

export interface UpdateHearingOutcomePayload {
    hearing_outcome: string;
    adj_reason?: string;
}

export function updateHearingOutcome(hearingId: string, payload: UpdateHearingOutcomePayload): Promise<unknown> {
    return apiRequest(`/hearings/${hearingId}`, { method: "PATCH", body: payload });
}
