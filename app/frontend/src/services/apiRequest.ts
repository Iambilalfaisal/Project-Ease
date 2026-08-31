import { fetchWithCache, queueWrite } from "../offline/offlineQueue";

/** Auth header injection — single source of the pe_token bearer header.
 * Matches the sessionStorage key every page already reads/writes. */
export function authHeaders(): Record<string, string> {
    const token = sessionStorage.getItem("pe_token") ?? "";
    return { Authorization: `Bearer ${token}` };
}

export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

interface ApiRequestOptions {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    /** GET requests: read-through IndexedDB cache, falls back to last-known-good data on failure. */
    cacheKey?: string;
    /** Mutations: on failure, queue the write for retry once connectivity returns (court-use offline support). */
    offlineQueue?: { kind: string; label: string };
}

/** The one fetch wrapper every services/*.ts function should call — auth headers,
 * JSON encode/decode, error unwrapping into ApiError, and optional offline
 * read-cache / write-queue integration (see offline/offlineQueue.ts). */
export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = "GET", body, cacheKey, offlineQueue } = options;
    const headers: Record<string, string> = { ...authHeaders() };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    if (method === "GET" && cacheKey) {
        const { data } = await fetchWithCache<T>(url, cacheKey, headers);
        return data;
    }

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new ApiError(res.status, text || `HTTP ${res.status}`);
        }
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
    } catch (err) {
        if (offlineQueue && method !== "GET" && !navigator.onLine) {
            await queueWrite(url, method as "POST" | "PATCH" | "DELETE", body, offlineQueue.kind, offlineQueue.label);
        }
        throw err;
    }
}
