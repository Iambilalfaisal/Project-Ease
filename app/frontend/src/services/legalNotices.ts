// Legal Notices — draft, dispatch, and track 30-day legal notice responses.
import { apiRequest } from "./apiRequest";
import type { LegalNotice } from "../pages/owner/types";

export interface LegalNoticeForm {
    notice_type: string;
    sent_to: string;
    sent_via: string;
    sent_date: string;
    status: string;
    subject: string;
    content: string;
    tracking_no: string;
    notes: string;
    matter_id: string;
    client_id: string;
}

export function fetchLegalNotices(): Promise<{ notices: LegalNotice[] }> {
    return apiRequest<{ notices: LegalNotice[] }>("/legal-notices");
}

export function saveLegalNotice(id: string | undefined, form: LegalNoticeForm): Promise<LegalNotice> {
    const url = id ? `/legal-notices/${id}` : "/legal-notices";
    return apiRequest<LegalNotice>(url, { method: id ? "PATCH" : "POST", body: form });
}

export function deleteLegalNotice(id: string): Promise<void> {
    return apiRequest<void>(`/legal-notices/${id}`, { method: "DELETE" });
}
