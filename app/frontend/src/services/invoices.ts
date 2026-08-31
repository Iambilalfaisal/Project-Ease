// Invoices — fee-entry invoicing, WHT (§153 ITO 2001) tax invoice detail, status lifecycle.
import { apiRequest } from "./apiRequest";
import type { Invoice } from "../pages/owner/types";

export function fetchInvoices(): Promise<Invoice[]> {
    return apiRequest<Invoice[]>("/invoices");
}

export function fetchInvoice(invoiceId: string): Promise<Invoice> {
    return apiRequest<Invoice>(`/invoices/${invoiceId}`);
}

export function updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
    return apiRequest<void>(`/invoices/${invoiceId}`, {
        method: "PATCH",
        body: { status },
    });
}
