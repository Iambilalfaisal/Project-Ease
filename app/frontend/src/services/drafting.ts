// Typed service layer for the Document Drafting panel — template CRUD and
// AI draft generation. No React here; see hooks/useDrafting.ts for the query layer.

import { apiRequest, authHeaders } from "./apiRequest";
import type { Matter, Template } from "../pages/owner/types";

export interface TemplateInput {
    title: string;
    template_type: string;
    content: string;
    description: string;
}

export function fetchTemplates(): Promise<Template[]> {
    return apiRequest<Template[]>("/templates");
}

export function fetchMattersForDrafting(): Promise<Matter[]> {
    return apiRequest<Matter[]>("/matters");
}

export function createTemplate(input: TemplateInput): Promise<Template> {
    return apiRequest<Template>("/templates", { method: "POST", body: input });
}

export function updateTemplate(templateId: string, input: TemplateInput): Promise<Template> {
    return apiRequest<Template>(`/templates/${templateId}`, { method: "PATCH", body: input });
}

export function deleteTemplate(templateId: string): Promise<void> {
    return apiRequest<void>(`/templates/${templateId}`, { method: "DELETE" });
}

/** Draft generation returns a .docx blob on success but a JSON error body on
 * failure — apiRequest always parses the response as JSON, so this call goes
 * straight through fetch instead. */
export async function generateDraft(templateId: string, matterId: string | null): Promise<Blob> {
    const res = await fetch("/draft", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, matter_id: matterId }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Draft failed");
    }
    return res.blob();
}
