// Outstanding Dues — aging report (Current / 0-30 / 31-60 / 60+ days) of unpaid invoices.
import { apiRequest } from "./apiRequest";
import type { OutstandingInvoice } from "../pages/owner/types";

interface OutstandingDuesResponse {
    invoices: OutstandingInvoice[];
}

export async function fetchOutstandingDues(): Promise<OutstandingInvoice[]> {
    const data = await apiRequest<OutstandingDuesResponse>("/outstanding-dues");
    return data.invoices ?? [];
}
