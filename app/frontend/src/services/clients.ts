// Typed fetch functions for the Clients panel — clients, portal-sharing tokens,
// and per-client trust/advance ledger. No React here; see hooks/useClients.ts.

import { apiRequest } from "./apiRequest";
import type { Client, ClientToken, Matter } from "../pages/owner/types";

export interface ClientDetail extends Client {
    matters: Matter[];
}

export interface ClientFormInput {
    name: string;
    client_type: "Individual" | "Corporate";
    email: string;
    phone: string;
    address: string;
    cnic_ntn: string;
    notes: string;
    referral_source: string;
}

export interface CreateClientTokenInput {
    client_id: string;
    matter_id?: string;
    label?: string;
    expires_days?: string;
}

export interface TrustLedgerEntry {
    ledger_id: string;
    txn_type: string;
    amount_pkr: number;
    balance_pkr: number;
    description: string;
    txn_date: string;
    reference_no: string | null;
    notes: string | null;
    matter_id: string | null;
    created_at: string;
}

export interface TrustLedgerResponse {
    entries: TrustLedgerEntry[];
    balance: number;
}

export interface TrustLedgerEntryInput {
    txn_type: string;
    amount_pkr: number;
    description: string;
    txn_date: string;
    reference_no: string;
    notes: string;
    matter_id: string;
}

export function listClients(): Promise<{ clients: Client[] }> {
    return apiRequest("/clients");
}

export function getClient(clientId: string): Promise<ClientDetail> {
    return apiRequest(`/clients/${clientId}`);
}

export function createClient(body: ClientFormInput): Promise<Client> {
    return apiRequest("/clients", { method: "POST", body });
}

export function updateClient(clientId: string, body: ClientFormInput): Promise<Client> {
    return apiRequest(`/clients/${clientId}`, { method: "PATCH", body });
}

export function deleteClient(clientId: string): Promise<void> {
    return apiRequest(`/clients/${clientId}`, { method: "DELETE" });
}

export function listClientTokens(clientId: string): Promise<{ tokens: ClientToken[] }> {
    return apiRequest(`/client-tokens?client_id=${clientId}`);
}

export function createClientToken(body: CreateClientTokenInput): Promise<ClientToken> {
    return apiRequest("/client-tokens", { method: "POST", body });
}

export function deleteClientToken(tokenId: string): Promise<void> {
    return apiRequest(`/client-tokens/${tokenId}`, { method: "DELETE" });
}

export function getTrustLedger(clientId: string): Promise<TrustLedgerResponse> {
    return apiRequest(`/clients/${clientId}/trust-ledger`);
}

export function createTrustLedgerEntry(clientId: string, body: TrustLedgerEntryInput): Promise<TrustLedgerEntry> {
    return apiRequest(`/clients/${clientId}/trust-ledger`, { method: "POST", body });
}

export function deleteTrustLedgerEntry(clientId: string, ledgerId: string): Promise<void> {
    return apiRequest(`/clients/${clientId}/trust-ledger/${ledgerId}`, { method: "DELETE" });
}
