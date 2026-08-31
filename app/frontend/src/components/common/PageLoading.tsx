/** Route-level Suspense fallback — every lazy-loaded page needs one so a
 * slow chunk load shows something instead of a blank screen. */
export default function PageLoading() {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                background: "var(--bg-0)",
                color: "var(--text-2)",
                fontSize: "var(--text-sm, 0.875rem)"
            }}
        >
            Loading…
        </div>
    );
}
