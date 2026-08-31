// FIR / police station records, charge & section tracking, challan tracker,
// and bail bonds (+ per-bond process checklist) for a single matter.
import { apiRequest, authHeaders } from "./apiRequest";
import type { MatterFir, MatterCharge, MatterChallan, BailBond } from "../pages/owner/types";

// ── FIR ──────────────────────────────────────────────────────────────────────

export interface FirInput {
    fir_number: string;
    police_station: string;
    district?: string;
    io_name?: string;
    complainant?: string;
    arrest_date?: string;
    sections_at_fir?: string;
    sections_after_challan?: string;
    fir_date?: string;
    notes?: string;
}

export interface FirScanResult {
    fir_number?: string;
    police_station?: string;
    district?: string;
    io_name?: string;
    complainant?: string;
    arrest_date?: string;
    sections_at_fir?: string;
    fir_date?: string;
    accused_name?: string;
    raw_text?: string;
}

export function fetchFirRecords(matterId: string): Promise<{ fir: MatterFir[] }> {
    return apiRequest(`/matters/${matterId}/fir`, { cacheKey: `matter-${matterId}-fir` });
}

export function createFir(matterId: string, body: FirInput): Promise<MatterFir> {
    return apiRequest(`/matters/${matterId}/fir`, { method: "POST", body });
}

export function updateFir(matterId: string, firId: string, body: FirInput): Promise<MatterFir> {
    return apiRequest(`/matters/${matterId}/fir/${firId}`, { method: "PATCH", body });
}

export function deleteFir(matterId: string, firId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/fir/${firId}`, { method: "DELETE" });
}

/** Multipart upload (image/PDF scan) — bypasses apiRequest's JSON body handling by design. */
export async function scanFirDocument(file: File): Promise<FirScanResult> {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/documents/extract-fir", { method: "POST", headers: authHeaders(), body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error ?? "Could not read that document.");
    return d;
}

// ── Charges / sections ──────────────────────────────────────────────────────

export interface ChargeInput {
    section_no: string;
    description?: string;
    plea: string;
    charge_framed: number;
    charge_framed_date?: string;
    court?: string;
    notes?: string;
}

export function fetchCharges(matterId: string): Promise<{ charges: MatterCharge[] }> {
    return apiRequest(`/matters/${matterId}/charges`, { cacheKey: `matter-${matterId}-charges` });
}

export function createCharge(matterId: string, body: ChargeInput): Promise<MatterCharge> {
    return apiRequest(`/matters/${matterId}/charges`, { method: "POST", body });
}

export function updateCharge(matterId: string, chargeId: string, body: ChargeInput): Promise<MatterCharge> {
    return apiRequest(`/matters/${matterId}/charges/${chargeId}`, { method: "PATCH", body });
}

export function deleteCharge(matterId: string, chargeId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/charges/${chargeId}`, { method: "DELETE" });
}

// ── Challan / charge sheet ──────────────────────────────────────────────────

export interface ChallanInput {
    challan_date?: string;
    challan_type: string;
    submitted_in_time: number;
    witnesses_count: number;
    challan_court?: string;
    status: string;
    notes?: string;
}

export function fetchChallans(matterId: string): Promise<{ challan: MatterChallan[] }> {
    return apiRequest(`/matters/${matterId}/challan`, { cacheKey: `matter-${matterId}-challan` });
}

export function createChallan(matterId: string, body: ChallanInput): Promise<MatterChallan> {
    return apiRequest(`/matters/${matterId}/challan`, { method: "POST", body });
}

export function updateChallan(matterId: string, challanId: string, body: ChallanInput): Promise<MatterChallan> {
    return apiRequest(`/matters/${matterId}/challan/${challanId}`, { method: "PATCH", body });
}

export function deleteChallan(matterId: string, challanId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/challan/${challanId}`, { method: "DELETE" });
}

// ── Bail bonds ───────────────────────────────────────────────────────────────

export interface BailBondInput {
    accused_name: string;
    bail_type: string;
    bail_amount_pkr: number;
    surety_name?: string;
    surety_cnic?: string;
    surety_address?: string;
    surety_property?: string;
    property_value?: number;
    court?: string;
    judge?: string;
    granted_date?: string;
    expiry_date?: string;
    status: string;
    bail_order_ref?: string;
    notes?: string;
}

export function fetchBailBonds(matterId: string): Promise<{ bonds: BailBond[] }> {
    return apiRequest(`/matters/${matterId}/bail-bonds`, { cacheKey: `matter-${matterId}-bail-bonds` });
}

export function createBailBond(matterId: string, body: BailBondInput): Promise<BailBond> {
    return apiRequest(`/matters/${matterId}/bail-bonds`, { method: "POST", body });
}

export function updateBailBond(matterId: string, bondId: string, body: BailBondInput): Promise<BailBond> {
    return apiRequest(`/matters/${matterId}/bail-bonds/${bondId}`, { method: "PATCH", body });
}

export function deleteBailBond(matterId: string, bondId: string): Promise<void> {
    return apiRequest(`/matters/${matterId}/bail-bonds/${bondId}`, { method: "DELETE" });
}

// ── Bail process checklist (org-configurable stages, per bond) ─────────────

export interface BailStage {
    stage_key: string;
    label: string;
    sort_order: number;
    completed_at?: string | null;
    completed_by?: string | null;
    is_active?: number;
}

export function fetchBailStages(matterId: string, bondId: string): Promise<{ stages: BailStage[] }> {
    return apiRequest(`/matters/${matterId}/bail-bonds/${bondId}/stages`, { cacheKey: `matter-${matterId}-bail-bond-${bondId}-stages` });
}

export function toggleBailStage(matterId: string, bondId: string, stageKey: string, completed: boolean): Promise<unknown> {
    return apiRequest(`/matters/${matterId}/bail-bonds/${bondId}/stages/${stageKey}`, { method: "PATCH", body: { completed } });
}
