// Opposing (adverse) parties, witnesses, and bail/interim relief applications
// for a single matter.
import { apiRequest } from "./apiRequest";
import type { AdverseParty, Witness, MatterRelief } from "../pages/owner/types";

// ── Adverse (opposing) parties ──────────────────────────────────────────────

export interface AdversePartyInput {
    party_name: string;
    party_type: string;
    counsel_name?: string;
    counsel_phone?: string;
    counsel_firm?: string;
    notes?: string;
}

export function fetchAdverseParties(matterId: string): Promise<{ parties: AdverseParty[] }> {
    return apiRequest(`/matters/${matterId}/adverse-parties`, { cacheKey: `matter-${matterId}-adverse-parties` });
}

export function createAdverseParty(matterId: string, body: AdversePartyInput): Promise<AdverseParty> {
    return apiRequest(`/matters/${matterId}/adverse-parties`, { method: "POST", body });
}

export function updateAdverseParty(matterId: string, partyId: string, body: AdversePartyInput): Promise<AdverseParty> {
    return apiRequest(`/matters/${matterId}/adverse-parties/${partyId}`, { method: "PATCH", body });
}

export function deleteAdverseParty(matterId: string, partyId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/adverse-parties/${partyId}`, { method: "DELETE" });
}

// ── Witnesses ────────────────────────────────────────────────────────────────

export interface WitnessInput {
    witness_name: string;
    witness_type: string;
    contact_number?: string | null;
    address?: string | null;
    statement_status: string;
    notes?: string | null;
}

export function fetchWitnesses(matterId: string): Promise<{ witnesses: Witness[] }> {
    return apiRequest(`/matters/${matterId}/witnesses`, { cacheKey: `matter-${matterId}-witnesses` });
}

export function createWitness(matterId: string, body: WitnessInput): Promise<Witness> {
    return apiRequest(`/matters/${matterId}/witnesses`, { method: "POST", body });
}

export function updateWitness(matterId: string, witnessId: string, body: WitnessInput): Promise<Witness> {
    return apiRequest(`/matters/${matterId}/witnesses/${witnessId}`, { method: "PATCH", body });
}

export function deleteWitness(matterId: string, witnessId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/witnesses/${witnessId}`, { method: "DELETE" });
}

// ── Bail & interim relief ───────────────────────────────────────────────────

export interface ReliefInput {
    application_date: string;
    relief_type: string;
    court?: string | null;
    judge?: string | null;
    status: string;
    conditions?: string | null;
    surety_amount_pkr?: number | null;
    surety_name?: string | null;
    notes?: string | null;
}

export function fetchRelief(matterId: string): Promise<{ relief: MatterRelief[] }> {
    return apiRequest(`/matters/${matterId}/relief`, { cacheKey: `matter-${matterId}-relief` });
}

export function createRelief(matterId: string, body: ReliefInput): Promise<MatterRelief> {
    return apiRequest(`/matters/${matterId}/relief`, { method: "POST", body });
}

export function updateRelief(matterId: string, reliefId: string, body: ReliefInput): Promise<MatterRelief> {
    return apiRequest(`/matters/${matterId}/relief/${reliefId}`, { method: "PATCH", body });
}

export function deleteRelief(matterId: string, reliefId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/relief/${reliefId}`, { method: "DELETE" });
}
