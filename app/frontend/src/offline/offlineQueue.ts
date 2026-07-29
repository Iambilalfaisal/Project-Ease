import { openDB, IDBPDatabase } from "idb";

/**
 * Offline support for court use (LHC/district courts have unreliable wifi).
 *
 * Scope is deliberately narrow: queue writes made while offline (currently
 * Court Order / hearing-outcome saves) and let the lawyer re-open the app
 * later to sync — not full app offline, not background sync while the app
 * is closed (iOS Safari doesn't support the Background Sync API, and this
 * user base is mobile/WhatsApp-heavy, so an active in-page flush on
 * load/focus/online is the reliable approach here).
 */

const DB_NAME = "project-ease-offline";
const DB_VERSION = 1;
const WRITES_STORE = "pending_writes";
const CACHE_STORE = "read_cache";

export interface PendingWrite {
    id: string;
    url: string;
    method: "POST" | "PATCH" | "DELETE";
    body: unknown;
    kind: string;      // human label, e.g. "Court Order"
    label: string;      // human summary, e.g. matter title
    createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(WRITES_STORE)) {
                    db.createObjectStore(WRITES_STORE, { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains(CACHE_STORE)) {
                    db.createObjectStore(CACHE_STORE, { keyPath: "key" });
                }
            },
        });
    }
    return dbPromise;
}

function genId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Queue a write that failed (or was never attempted) due to no connectivity. */
export async function queueWrite(
    url: string, method: PendingWrite["method"], body: unknown, kind: string, label: string
): Promise<PendingWrite> {
    const entry: PendingWrite = { id: genId(), url, method, body, kind, label, createdAt: Date.now() };
    const db = await getDb();
    await db.put(WRITES_STORE, entry);
    window.dispatchEvent(new CustomEvent("pe-offline-queued"));
    return entry;
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
    const db = await getDb();
    return db.getAll(WRITES_STORE);
}

export async function getPendingCount(): Promise<number> {
    const db = await getDb();
    return db.count(WRITES_STORE);
}

/** Attempt to send every queued write. Successful ones are removed;
 * failures stay queued for the next flush. */
export async function flushQueue(
    authHeaders: () => Record<string, string>
): Promise<{ flushed: number; failed: number }> {
    if (!navigator.onLine) return { flushed: 0, failed: 0 };
    const db = await getDb();
    const pending = await db.getAll(WRITES_STORE);
    let flushed = 0, failed = 0;
    for (const w of pending) {
        try {
            const r = await fetch(w.url, {
                method: w.method,
                headers: { ...authHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(w.body),
            });
            if (r.ok) {
                await db.delete(WRITES_STORE, w.id);
                flushed++;
            } else {
                failed++;
            }
        } catch {
            failed++;   // still offline or a transient error — keep queued
        }
    }
    return { flushed, failed };
}

/** Register auto-flush on reconnect / app focus / load. Returns a cleanup fn. */
export function initOfflineSync(
    authHeaders: () => Record<string, string>,
    onFlushed?: (result: { flushed: number; failed: number }) => void
): () => void {
    const run = () => { flushQueue(authHeaders).then(res => { if (res.flushed > 0 && onFlushed) onFlushed(res); }); };
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    run();
    return () => {
        window.removeEventListener("online", run);
        window.removeEventListener("focus", run);
    };
}

// ── Read-through cache (last-known-good data, shown when a GET fails) ──────

export async function cachePut(key: string, data: unknown): Promise<void> {
    const db = await getDb();
    await db.put(CACHE_STORE, { key, data, cachedAt: Date.now() });
}

export async function cacheGet(key: string): Promise<{ data: unknown; cachedAt: number } | null> {
    const db = await getDb();
    const row = await db.get(CACHE_STORE, key);
    return row ? { data: row.data, cachedAt: row.cachedAt } : null;
}

/** fetch() a JSON GET endpoint; on success, cache the result; on failure,
 * fall back to the last cached value for that key if one exists. */
export async function fetchWithCache<T>(
    url: string, cacheKey: string, headers: Record<string, string>
): Promise<{ data: T; fromCache: boolean; cachedAt?: number }> {
    try {
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as T;
        await cachePut(cacheKey, data);
        return { data, fromCache: false };
    } catch (err) {
        const cached = await cacheGet(cacheKey);
        if (cached) return { data: cached.data as T, fromCache: true, cachedAt: cached.cachedAt };
        throw err;
    }
}
