import { useRef, useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Table, Modal, Button } from "../../../components/ui";
import type { DocFile, Usage } from "../types";
import { useCategories, useCreateCategory, useDeleteDocument, useUploadDocument } from "../../../hooks/useDocuments";
import { UploadError } from "../../../services/documents";

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.png,.jpg,.jpeg,.tiff,.bmp";

const PLAN_LIMITS: Record<string, { docs: number; users: number }> = {
    free:       { docs: 20,        users: 5         },
    pro:        { docs: 500,       users: 25        },
    enterprise: { docs: 9_999_999, users: 9_999_999 },
};

type QueueStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
    id:      string;
    file:    File;
    status:  QueueStatus;
    error?:  string;
}

const MAX_FILE_MB = 50;

export const DocumentsPanel = ({ docs, setDocs, usage, plan, onUpgrade }: {
    docs: DocFile[];
    setDocs: React.Dispatch<React.SetStateAction<DocFile[]>>;
    usage: Usage;
    plan: string;
    onUpgrade: () => void;
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging,         setDragging]         = useState(false);
    const [uploadError,      setUploadError]      = useState<string | null>(null);
    const [docLimitReached,  setDocLimitReached]  = useState(false);
    const [filterCat,        setFilterCat]        = useState<string>("all");
    const [confirmDelete,    setConfirmDelete]    = useState<DocFile | null>(null);
    const [deleting,         setDeleting]         = useState<string | null>(null);

    // Category modal state
    const [showCatModal, setShowCatModal] = useState(false);
    const [newCatName,   setNewCatName]   = useState("");
    const [catError,     setCatError]     = useState<string | null>(null);

    // Upload queue state
    const [queue,       setQueue]       = useState<QueueItem[]>([]);
    const [queueCatId,  setQueueCatId]  = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);

    const { data: categories = [] } = useCategories();
    const createCategoryMutation = useCreateCategory();
    const uploadDocumentMutation = useUploadDocument();
    const deleteDocumentMutation = useDeleteDocument();

    const limit    = (PLAN_LIMITS[plan] ?? PLAN_LIMITS.free).docs;
    const usagePct = limit >= 9_999_999 ? 0 : Math.min(100, Math.round((usage.total_docs / limit) * 100));

    const queuedCount  = queue.filter(q => q.status === "queued").length;
    const doneCount    = queue.filter(q => q.status === "done").length;
    const errorCount   = queue.filter(q => q.status === "error").length;
    const remainingSlots = limit >= 9_999_999 ? Infinity : Math.max(0, limit - usage.total_docs);
    const batchWillExceed = queuedCount > remainingSlots;

    const addToQueue = (files: File[]) => {
        if (!files.length) return;
        const items: QueueItem[] = files.map(f => ({
            id:     `q-${Date.now()}-${Math.random()}`,
            file:   f,
            status: "queued",
        }));
        setQueue(prev => [...prev, ...items]);
    };

    const removeFromQueue = (id: string) => {
        if (isUploading) return;
        setQueue(prev => prev.filter(q => q.id !== id));
    };

    const clearQueue = () => {
        if (isUploading) return;
        setQueue([]);
    };

    const uploadOne = async (item: QueueItem, catId: string) => {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "uploading" } : q));
        const kb   = item.file.size / 1024;
        const size = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
        const tmpId = `tmp-${item.id}`;
        const placeholder: DocFile = {
            doc_id: tmpId, name: item.file.name, size,
            size_bytes: item.file.size,
            uploaded:   new Date().toISOString().slice(0, 10),
            status:     "processing",
            category_id:   catId || null,
            category_name: categories.find(c => c.category_id === catId)?.name ?? null,
        };
        setDocs(prev => [placeholder, ...prev]);

        try {
            const data = await uploadDocumentMutation.mutateAsync({ file: item.file, categoryId: catId });
            setDocs(prev => prev.map(d =>
                d.doc_id === tmpId ? { ...d, doc_id: data.doc.doc_id, status: "ready" } : d
            ));
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "done" } : q));
        } catch (err) {
            setDocs(prev => prev.filter(d => d.doc_id !== tmpId));
            if (err instanceof UploadError && err.limitReached) {
                setDocLimitReached(true);
                setQueue(prev => prev.map(q => q.id === item.id
                    ? { ...q, status: "error", error: "Document limit reached — upgrade your plan." }
                    : q
                ));
            } else if (err instanceof UploadError) {
                setQueue(prev => prev.map(q => q.id === item.id
                    ? { ...q, status: "error", error: err.message ?? "Upload failed." }
                    : q
                ));
            } else {
                setQueue(prev => prev.map(q => q.id === item.id
                    ? { ...q, status: "error", error: "Network error — could not reach the server." }
                    : q
                ));
            }
        }
    };

    const startUpload = async () => {
        const toUpload = queue.filter(q => q.status === "queued");
        if (!toUpload.length || isUploading) return;
        setIsUploading(true);
        setUploadError(null);
        for (const item of toUpload) {
            await uploadOne(item, queueCatId);
        }
        setIsUploading(false);
    };

    const retryFile = async (item: QueueItem) => {
        if (isUploading) return;
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "queued", error: undefined } : q));
        setIsUploading(true);
        await uploadOne({ ...item, status: "queued" }, queueCatId);
        setIsUploading(false);
    };

    const handleDelete = async (doc: DocFile) => {
        setDeleting(doc.doc_id);
        setConfirmDelete(null);
        try {
            await deleteDocumentMutation.mutateAsync(doc.doc_id);
            setDocs(prev => prev.filter(d => d.doc_id !== doc.doc_id));
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Delete failed.");
        }
        setDeleting(null);
    };

    const addCategory = async () => {
        const name = newCatName.trim();
        if (!name) return;
        try {
            await createCategoryMutation.mutateAsync(name);
            setNewCatName("");
            setCatError(null);
            setShowCatModal(false);
        } catch (err) {
            setCatError(err instanceof Error ? err.message : "Failed");
        }
    };

    const visibleDocs = filterCat === "all"
        ? docs
        : docs.filter(d => d.category_id === filterCat);

    return (
        <div className={styles.panelContent}>
            {/* Doc limit upgrade banner */}
            {docLimitReached && (
                <div className={styles.limitBanner}>
                    <span>
                        🔒 Document limit reached ({usage.total_docs} / {limit} docs on your current plan).
                    </span>
                    <button className={styles.limitUpgradeBtn} onClick={onUpgrade}>Upgrade Plan →</button>
                </div>
            )}

            {/* Toolbar */}
            <div className={styles.panelToolbar}>
                <span className={styles.resultCount}>{docs.length} document{docs.length !== 1 ? "s" : ""}</span>
                <select
                    className={styles.formSelect}
                    style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                    value={filterCat}
                    onChange={e => setFilterCat(e.target.value)}
                >
                    <option value="all">All categories</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </select>
                <Button variant="ghost" style={{ fontSize: "0.8rem" }} onClick={() => setShowCatModal(true)}>
                    + Category
                </Button>
                <Button onClick={() => fileRef.current?.click()}>
                    + Upload Files
                </Button>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    style={{ display: "none" }}
                    onChange={e => { addToQueue(Array.from(e.target.files ?? [])); e.target.value = ""; }}
                />
            </div>

            {/* Usage meter */}
            {limit !== Infinity && (
                <div className={styles.usageMeter}>
                    <div className={styles.usageMeterLabel}>
                        <span>{usage.total_docs} / {limit} documents used</span>
                        <span className={usagePct >= 80 ? styles.usageWarn : styles.usageMuted}>{usagePct}%</span>
                    </div>
                    <div className={styles.usageBar}>
                        <div
                            className={`${styles.usageBarFill} ${usagePct >= 80 ? styles.usageBarWarn : ""}`}
                            style={{ width: `${usagePct}%` }}
                        />
                    </div>
                    {usagePct >= 80 && (
                        <div className={styles.usageWarnText}>
                            ⚠ Approaching your plan limit.{" "}
                            <button
                                style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", padding: 0, fontSize: "inherit", fontWeight: 600 }}
                                onClick={onUpgrade}
                            >Upgrade plan →</button>
                        </div>
                    )}
                </div>
            )}

            {/* Drop zone */}
            <div
                className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); addToQueue(Array.from(e.dataTransfer.files)); }}
                onClick={() => fileRef.current?.click()}
            >
                <div className={styles.dropIcon}>↑</div>
                <div className={styles.dropTitle}>Drag & drop files here, or click to browse</div>
                <div className={styles.dropSub}>PDF · Word · PowerPoint · Excel · Images · TXT &nbsp;·&nbsp; Up to {MAX_FILE_MB} MB per file</div>
            </div>

            {/* Upload Queue */}
            {queue.length > 0 && (
                <div className={styles.uploadQueue}>
                    {/* Queue header */}
                    <div className={styles.queueHeader}>
                        <div className={styles.queueSummary}>
                            <span>{queue.length} file{queue.length !== 1 ? "s" : ""} selected</span>
                            {doneCount  > 0 && <span className={styles.queueDone}> · {doneCount} done</span>}
                            {errorCount > 0 && <span className={styles.queueErr}> · {errorCount} failed</span>}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <select
                                className={styles.formSelect}
                                style={{ width: "auto", fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
                                value={queueCatId}
                                onChange={e => setQueueCatId(e.target.value)}
                                disabled={isUploading}
                            >
                                <option value="">No category</option>
                                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                            </select>
                            {!isUploading && (
                                <Button variant="ghost" style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem" }} onClick={clearQueue}>
                                    Clear
                                </Button>
                            )}
                            {queuedCount > 0 && (
                                <Button
                                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.9rem" }}
                                    onClick={startUpload}
                                    disabled={isUploading || batchWillExceed}
                                >
                                    {isUploading ? "Uploading…" : `Upload ${queuedCount} file${queuedCount !== 1 ? "s" : ""}`}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Limit warning */}
                    {batchWillExceed && (
                        <div className={styles.queueLimitWarn}>
                            ⚠ Only {remainingSlots} slot{remainingSlots !== 1 ? "s" : ""} remaining on your plan.
                            Remove {queuedCount - remainingSlots} file{queuedCount - remainingSlots !== 1 ? "s" : ""} or upgrade your plan.
                        </div>
                    )}

                    {/* Per-file rows */}
                    <div className={styles.queueList}>
                        {queue.map(item => {
                            const mb   = item.file.size / (1024 * 1024);
                            const size = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(item.file.size / 1024)} KB`;
                            const oversize = mb > MAX_FILE_MB;
                            return (
                                <div key={item.id} className={styles.queueRow}>
                                    <div className={styles.queueFileName}>
                                        {oversize && <span className={styles.queueSizeWarn} title={`File exceeds ${MAX_FILE_MB} MB`}>⚠</span>}
                                        <span className={styles.queueName}>{item.file.name}</span>
                                        <span className={styles.queueSize}>{size}</span>
                                    </div>
                                    <div className={styles.queueRowRight}>
                                        {item.status === "queued"    && <span className={styles.queueStatusQueued}>Queued</span>}
                                        {item.status === "uploading" && <span className={styles.queueStatusUploading}>Uploading…</span>}
                                        {item.status === "done"      && <span className={styles.queueStatusDone}>✓ Done</span>}
                                        {item.status === "error"     && (
                                            <span className={styles.queueStatusError} title={item.error}>✗ Failed</span>
                                        )}
                                        {item.status === "error" && !isUploading && (
                                            <button className={styles.queueRetry} onClick={() => retryFile(item)}>Retry</button>
                                        )}
                                        {(item.status === "queued" || item.status === "error") && !isUploading && (
                                            <button className={styles.queueRemove} onClick={() => removeFromQueue(item.id)}>✕</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error banner */}
            {uploadError && (
                <div className={styles.errorBanner}>
                    ⚠ {uploadError}
                    <button className={styles.errorDismiss} onClick={() => setUploadError(null)}>×</button>
                </div>
            )}

            {/* Documents table */}
            <Table empty={visibleDocs.length === 0} emptyMessage="No documents yet. Upload your first file to get started.">
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Category</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {visibleDocs.map(doc => (
                        <tr key={doc.doc_id}>
                            <td>
                                <div className={styles.fileName}>
                                    <span className={styles.fileIcon}>F</span>
                                    {doc.name}
                                </div>
                            </td>
                            <td className={styles.muted}>
                                {doc.category_name
                                    ? <span className={styles.catChip}>{doc.category_name}</span>
                                    : <span className={styles.muted}>—</span>
                                }
                            </td>
                            <td className={styles.muted}>{doc.size}</td>
                            <td className={styles.muted}>{doc.uploaded}</td>
                            <td>
                                {doc.status === "ready"
                                    ? <span className={styles.badgeGreen}>Ready</span>
                                    : doc.status === "error"
                                    ? <span className={styles.badgeRed}>Error</span>
                                    : <span className={styles.badgeAmber}>Processing…</span>
                                }
                            </td>
                            <td>
                                <button
                                    className={styles.actionBtnDanger}
                                    disabled={deleting === doc.doc_id}
                                    onClick={() => setConfirmDelete(doc)}
                                >
                                    {deleting === doc.doc_id ? "…" : "Remove"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Delete confirm modal */}
            <Modal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title="Remove Document"
                footer={<>
                    <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button>
                </>}
            >
                <p className={styles.muted} style={{ fontSize: "0.85rem" }}>
                    This will permanently delete <strong style={{ color: "var(--text-1)" }}>{confirmDelete?.name}</strong> from the index and storage. This cannot be undone.
                </p>
            </Modal>

            {/* New category modal */}
            <Modal
                open={showCatModal}
                onClose={() => { setShowCatModal(false); setCatError(null); }}
                title="New Category"
                footer={<>
                    <Button variant="ghost" onClick={() => { setShowCatModal(false); setCatError(null); }}>Cancel</Button>
                    <Button onClick={addCategory}>Create</Button>
                </>}
            >
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Category Name</label>
                    <input
                        className={styles.formInput}
                        placeholder="e.g. Contracts, HR, Finance…"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addCategory()}
                        autoFocus
                    />
                </div>
                {catError && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {catError}</div>}
            </Modal>
        </div>
    );
};
