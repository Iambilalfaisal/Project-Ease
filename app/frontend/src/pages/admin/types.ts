// Domain types for the Platform Admin Dashboard.

export interface Org {
    org_id: string;
    name: string;
    plan: string;
    status: "active" | "suspended";
    industry: string;
    user_count: number;
    doc_count: number;
    total_bytes: number;
    max_docs: number;
    max_users: number;
    created_at: string;
}

export interface OrgUser {
    user_id: string;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

export interface OrgDoc {
    doc_id: string;
    filename: string;
    size_bytes: number;
    status: string;
    uploaded_at: string;
}

export interface OrgDetails extends Org {
    users: OrgUser[];
    documents: OrgDoc[];
}

export interface PlatformStats {
    total_orgs: number;
    active_orgs: number;
    total_users: number;
    total_docs: number;
    total_bytes: number;
    plans: Record<string, number>;
}

export interface Registration {
    org_id: string;
    name: string;
    plan: string;
    city: string | null;
    phone: string | null;
    created_at: string;
    owner_name: string | null;
    owner_email: string | null;
}

export interface EvalResult {
    id: number;
    timestamp: string;
    organization_id: string | null;
    original_query: string;
    precision_at_k: number | null;
    answer_relevance_score: number | null;
    latency_ms: number | null;
}

export interface UpgradeRequest {
    request_id: string;
    org_id: string;
    org_name: string;
    current_plan: string;
    requested_plan: string;
    status: "pending" | "approved" | "rejected";
    payment_ref: string | null;
    notes: string | null;
    created_at: string;
    resolved_at: string | null;
    resolved_by: string | null;
}

export interface OrgFlagRow {
    org_id: string;
    name: string;
    flags: Record<string, boolean>;
}

export interface CaseLawDoc {
    doc_id: string;
    publisher: string;
    title: string;
    year: number | null;
    volume: string | null;
    court: string | null;
    filename: string;
    size_bytes: number;
    status: "processing" | "ready" | "error";
    error_msg: string | null;
    indexed_by: string;
    created_at: string;
}
