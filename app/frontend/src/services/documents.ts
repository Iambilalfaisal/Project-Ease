// Typed service layer for the Documents panel — category CRUD and document
// upload/delete. No React here; see hooks/useDocuments.ts for the query layer.

import { apiRequest, authHeaders } from "./apiRequest";
import type { Category } from "../pages/owner/types";

export class UploadError extends Error {
    limitReached: boolean;
    constructor(message: string, limitReached: boolean) {
        super(message);
        this.name = "UploadError";
        this.limitReached = limitReached;
    }
}

export interface UploadResponse {
    doc: { doc_id: string };
}

export async function fetchCategories(): Promise<Category[]> {
    const data = await apiRequest<{ categories: Category[] }>("/categories");
    return data.categories ?? [];
}

export function createCategory(name: string): Promise<Category> {
    return apiRequest<Category>("/categories", { method: "POST", body: { name } });
}

/** Multipart upload — apiRequest's body handling is JSON-only, so this call
 * goes straight through fetch with a FormData body instead. */
export async function uploadDocument(file: File, categoryId: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (categoryId) formData.append("category_id", categoryId);
    const res = await fetch("/upload", { method: "POST", headers: authHeaders(), body: formData });
    const data = await res.json();
    if (!res.ok) {
        throw new UploadError(data.error ?? "Upload failed.", data.limit_reached === "docs");
    }
    return data as UploadResponse;
}

export function deleteDocument(docId: string): Promise<void> {
    return apiRequest<void>(`/documents/${docId}`, { method: "DELETE" });
}
