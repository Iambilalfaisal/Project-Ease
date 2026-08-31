// Domain types for the Employee Portal.

export interface PermittedCategory {
    category_id: string;
    name: string;
}

export interface MyProfile {
    user_id: string;
    name: string;
    email: string;
    role: string;
    org_name: string;
    permitted_categories: PermittedCategory[];
}

export interface DocFile {
    doc_id: string;
    filename: string;
    category_id: string | null;
    category_name: string | null;
    size_bytes: number;
    uploaded_at: string;
    status: "ready" | "processing" | "error";
}

export interface Verification {
    verdict: "verified" | "warning" | "unverified";
    issues: string[];
}

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    citations?: string[];
    verification?: Verification;
}

export interface AssignedHearing {
    hearing_id: string;
    title: string;
    hearing_date: string;
    hearing_time: string | null;
    court_name: string | null;
    judge_name: string | null;
    matter_id: string | null;
    matter_title: string | null;
    hearing_outcome: string | null;
    adj_reason: string | null;
    next_date_fixed_by: string | null;
    assigned_to?: string;
}
