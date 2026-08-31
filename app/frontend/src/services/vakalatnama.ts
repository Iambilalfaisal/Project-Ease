// Vakalatnama Register — cross-matter vakalatnama filing status.
import { apiRequest } from "./apiRequest";

export interface VakalatnamaEntry {
    matter_id: string;
    title: string;
    matter_no: string | null;
    client_name: string;
    court_name: string | null;
    vakalatnama_status: string;
    status: string;
    created_at: string;
}

export function fetchVakalatnamaRegister(): Promise<{ register: VakalatnamaEntry[] }> {
    return apiRequest<{ register: VakalatnamaEntry[] }>("/vakalatnama-register");
}

export function updateVakalatnamaStatus(matterId: string, vakalatnama_status: string): Promise<unknown> {
    return apiRequest(`/matters/${matterId}/vakalatnama`, {
        method: "PATCH",
        body: { vakalatnama_status },
    });
}
