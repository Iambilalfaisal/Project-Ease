// Plan & Subscription — plan tier config, trial/upgrade status, JazzCash/Easypaisa upgrade requests.
import { apiRequest } from "./apiRequest";

export interface PlanTierConfig {
    max_docs: number;
    max_users: number;
    max_bytes: number;
    max_searches: number | null;
    trial_days?: number;
    price_monthly: number;
    price_annual: number;
    features: string[];
}

export interface PlanConfigResponse {
    plans: Record<string, PlanTierConfig>;
    current_plan: string;
    bank: {
        name: string;
        account: string;
        iban: string;
        title: string;
    };
    support_whatsapp: string;
}

export interface OrgUpgradeStatus {
    trial_ends_at?: string;
    requested_plan?: string;
    upgrade_requested_at?: string;
}

export interface UpgradeRequestPayload {
    requested_plan: string;
    payment_ref: string;
    notes?: string;
}

export function getPlanConfig(): Promise<PlanConfigResponse> {
    return apiRequest<PlanConfigResponse>("/plan-config");
}

export function getOrgUpgradeStatus(): Promise<OrgUpgradeStatus> {
    return apiRequest<OrgUpgradeStatus>("/org");
}

export function submitUpgradeRequest(payload: UpgradeRequestPayload): Promise<void> {
    return apiRequest<void>("/upgrade-request", { method: "POST", body: payload });
}
