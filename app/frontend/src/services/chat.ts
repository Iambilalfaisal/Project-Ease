// Employee AI chat — streaming Q&A over the org's documents, plus answer export.
import { authHeaders, ApiError } from "./apiRequest";

export interface ChatStreamOverrides {
    retrieval_mode: string;
    semantic_ranker: boolean;
    top: number;
    suggest_followup_questions: boolean;
    prompt_template?: string;
}

export interface ChatStreamRequest {
    messages: { role: string; content: string }[];
    context: { overrides: ChatStreamOverrides };
    session_state: null;
}

/** NDJSON streaming endpoint — apiRequest always awaits res.json(), so this bypasses
 * it and hands the raw Response back for the caller to read incrementally. */
export async function streamChatAnswer(body: ChatStreamRequest, signal: AbortSignal): Promise<Response> {
    const res = await fetch("/chat/stream", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
    });
    if (!res.ok || !res.body) throw new ApiError(res.status, `Request failed (${res.status})`);
    return res;
}

export interface ExportAnswerPayload {
    question: string;
    answer: string;
    citations: string[];
    org_name: string;
}

export interface ExportAnswerResult {
    blob: Blob;
    filename: string;
}

/** Binary .docx response — apiRequest only decodes JSON, so this stays a raw fetch. */
export async function exportAnswerToWord(payload: ExportAnswerPayload): Promise<ExportAnswerResult> {
    const res = await fetch("/export/answer", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(res.status, err.error ?? "Export failed. Please try again.");
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const fnMatch = cd.match(/filename="([^"]+)"/);
    const filename = fnMatch ? fnMatch[1] : "ProjectEase_Export.docx";
    return { blob, filename };
}
