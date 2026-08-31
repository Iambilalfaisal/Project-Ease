// Court orders / hearing log for a matter, plus the Urdu/English voice-note
// transcription helper used to prefill the hearing-outcome form.
import { apiRequest, authHeaders } from "./apiRequest";
import type { CourtOrder } from "../pages/owner/types";

export interface CourtOrderInput {
    hearing_date: string;
    court_name?: string;
    order_brief: string;
    next_date?: string;
    outcome: string;
    notify_client: boolean;
}

export interface VoiceLogResult {
    transcript: string;
    outcome: string | null;
    next_date: string | null;
    order_brief: string;
}

export function fetchCourtOrders(matterId: string): Promise<{ orders: CourtOrder[] }> {
    return apiRequest(`/matters/${matterId}/orders`, { cacheKey: `matter-${matterId}-orders` });
}

export function createCourtOrder(matterId: string, body: CourtOrderInput): Promise<CourtOrder> {
    return apiRequest(`/matters/${matterId}/orders`, {
        method: "POST", body, offlineQueue: { kind: "Court Order", label: matterId },
    });
}

export function updateCourtOrder(matterId: string, orderId: string, body: CourtOrderInput): Promise<CourtOrder> {
    return apiRequest(`/matters/${matterId}/orders/${orderId}`, {
        method: "PATCH", body, offlineQueue: { kind: "Court Order", label: matterId },
    });
}

export function deleteCourtOrder(matterId: string, orderId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/orders/${orderId}`, { method: "DELETE" });
}

/** Multipart upload — bypasses apiRequest's JSON body handling by design. */
export async function transcribeHearingVoiceNote(audio: Blob): Promise<VoiceLogResult> {
    const fd = new FormData();
    fd.append("audio", audio, "hearing_note.webm");
    const r = await fetch("/voice/log-outcome", { method: "POST", headers: authHeaders(), body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Could not process the recording.");
    return d;
}
