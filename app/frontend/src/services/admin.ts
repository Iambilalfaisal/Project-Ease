// Platform Admin — org management, registrations, upgrade requests, feature flags, case law library, eval quality.
import { apiRequest, authHeaders, ApiError } from "./apiRequest";
import type {
    Org,
    OrgDetails,
    PlatformStats,
    Registration,
    EvalResult,
    UpgradeRequest,
    OrgFlagRow,
    CaseLawDoc,
} from "../pages/admin/types";

// ── Orgs & stats ──────────────────────────────────────────────────────────────

export function fetchPlatformStats(): Promise<PlatformStats> {
    return apiRequest<PlatformStats>("/admin/stats");
}

export function fetchOrgs(): Promise<{ orgs: Org[] }> {
    return apiRequest<{ orgs: Org[] }>("/admin/orgs");
}

export function fetchOrgDetails(orgId: string): Promise<OrgDetails> {
    return apiRequest<OrgDetails>(`/admin/orgs/${orgId}`);
}

export interface CreateOrgPayload {
    name: string;
    industry: string;
    plan: string;
    owner_name: string;
    owner_email: string;
}

export interface CreateOrgResponse {
    org: Org;
    owner: { email: string };
    temp_password: string;
}

export function createOrg(payload: CreateOrgPayload): Promise<CreateOrgResponse> {
    return apiRequest<CreateOrgResponse>("/admin/orgs", { method: "POST", body: payload });
}

export interface UpdateOrgPayload {
    status?: "active" | "suspended";
    plan?: string;
    max_docs?: number;
    max_users?: number;
}

export function updateOrg(orgId: string, payload: UpdateOrgPayload): Promise<Org> {
    return apiRequest<Org>(`/admin/orgs/${orgId}`, { method: "PUT", body: payload });
}

export function deleteOrg(orgId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/admin/orgs/${orgId}`, { method: "DELETE" });
}

/** Settings panel's backend-reachability probe — only cares whether the call succeeds. */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        await apiRequest<unknown>("/auth/me");
        return true;
    } catch {
        return false;
    }
}

// ── Registrations ─────────────────────────────────────────────────────────────

export function fetchRegistrations(): Promise<{ registrations: Registration[] }> {
    return apiRequest<{ registrations: Registration[] }>("/admin/registrations");
}

export function approveRegistration(orgId: string): Promise<unknown> {
    return apiRequest(`/admin/orgs/${orgId}/approve`, { method: "PATCH" });
}

// ── Upgrade requests ──────────────────────────────────────────────────────────

export function fetchUpgradeRequests(status: string): Promise<{ requests: UpgradeRequest[] }> {
    const qs = status && status !== "all" ? `?status=${status}` : "";
    return apiRequest<{ requests: UpgradeRequest[] }>(`/admin/upgrade-requests${qs}`);
}

export function resolveUpgradeRequest(requestId: string, action: "approve" | "reject"): Promise<unknown> {
    return apiRequest(`/admin/upgrade-requests/${requestId}/${action}`, { method: "PATCH" });
}

// ── Feature access (org flags) ───────────────────────────────────────────────

export interface OrgFlagsResponse {
    orgs: OrgFlagRow[];
    feature_keys: string[];
    feature_labels: Record<string, string>;
}

export function fetchOrgFlags(): Promise<OrgFlagsResponse> {
    return apiRequest<OrgFlagsResponse>("/admin/org-flags");
}

export function updateOrgFlags(orgId: string, flags: Record<string, boolean>): Promise<{ flags: Record<string, boolean> }> {
    return apiRequest<{ flags: Record<string, boolean> }>(`/admin/org-flags/${orgId}`, { method: "PUT", body: { flags } });
}

// ── Case law library ──────────────────────────────────────────────────────────

export function fetchCaseLawDocs(publisher: string): Promise<{ docs: CaseLawDoc[] }> {
    const url = publisher !== "ALL" ? `/admin/case-law?publisher=${publisher}` : "/admin/case-law";
    return apiRequest<{ docs: CaseLawDoc[] }>(url);
}

export interface UploadCaseLawPayload {
    file: File;
    publisher: string;
    title: string;
    year: string;
    volume: string;
    court: string;
}

/** apiRequest JSON-encodes every body, so the multipart upload bypasses it and
 * talks to fetch directly, reusing the shared auth header. */
export async function uploadCaseLaw(payload: UploadCaseLawPayload): Promise<unknown> {
    const fd = new FormData();
    fd.append("file", payload.file);
    fd.append("publisher", payload.publisher);
    fd.append("title", payload.title);
    fd.append("year", payload.year);
    fd.append("volume", payload.volume);
    fd.append("court", payload.court);
    const res = await fetch("/admin/case-law/upload", { method: "POST", headers: authHeaders(), body: fd });
    const data = await res.json();
    if (!res.ok) throw new ApiError(res.status, data.error ?? "Upload failed.");
    return data;
}

export function deleteCaseLawDoc(docId: string): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(`/admin/case-law/${docId}`, { method: "DELETE" });
}

// ── Eval quality ──────────────────────────────────────────────────────────────

/** Gated by a separate VITE_ADMIN_EVAL_KEY bearer token, not the pe_token session —
 * bypasses apiRequest since its auth header differs from every other admin call. */
export async function fetchEvalResults(key: string): Promise<{ results: EvalResult[] }> {
    const res = await fetch("/admin/evals", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return res.json();
}
