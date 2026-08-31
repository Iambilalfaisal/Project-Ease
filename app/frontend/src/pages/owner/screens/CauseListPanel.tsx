import { useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Table, Button, EmptyState } from "../../../components/ui";
import { PAKISTAN_COURTS, CauseListEntry } from "../../../services/causeList";
import {
    useCauseListEntries, useCauseListMatters, useParseCauseList,
    useDeleteCauseListEntry, useLinkCauseListEntry,
} from "../../../hooks/useCauseList";

export const CauseListPanel = () => {
    const [parseErr, setParseErr] = useState("");
    const [parseResult, setParseResult] = useState<{ total: number; matched: number } | null>(null);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [listDate, setListDate] = useState(new Date().toISOString().slice(0, 10));
    const [courtName, setCourtName] = useState("");
    const [showInput, setShowInput] = useState(false);
    const [linkingId, setLinkingId] = useState<string | null>(null);
    const [linkTarget, setLinkTarget] = useState("");

    const { data: entries = [], isLoading: loading } = useCauseListEntries(filterDate);
    const { data: matters = [] } = useCauseListMatters();
    const parseMutation = useParseCauseList();
    const deleteMutation = useDeleteCauseListEntry(filterDate);
    const linkMutation = useLinkCauseListEntry(filterDate);

    const parseCauseList = () => {
        if (!text.trim() && !file) { setParseErr("Paste the cause list text or upload a photo/PDF first."); return; }
        setParseErr(""); setParseResult(null);
        parseMutation.mutate({ file, text, listDate, courtName }, {
            onSuccess: d => {
                setParseResult({ total: d.total_count, matched: d.matched_count });
                setShowInput(false); setText(""); setFile(null);
                setFilterDate(listDate);
            },
            onError: e => setParseErr(e instanceof Error ? e.message : "Network error."),
        });
    };

    const deleteEntry = (entry: CauseListEntry) => {
        deleteMutation.mutate(entry.entry_id);
    };

    const saveLink = (entry: CauseListEntry) => {
        linkMutation.mutate({ entryId: entry.entry_id, matterId: linkTarget || null }, {
            onSuccess: () => { setLinkingId(null); setLinkTarget(""); },
        });
    };

    const matched = entries.filter(e => e.matter_id);
    const unmatched = entries.filter(e => !e.matter_id);

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.85rem" }}
                        value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                    <span className={styles.muted} style={{ fontSize: "0.82rem" }}>{entries.length} entries</span>
                    {matched.length > 0 && (
                        <span className={styles.badgeGreen} style={{ fontSize: "0.72rem" }}>{matched.length} matched</span>
                    )}
                </div>
                <Button onClick={() => { setShowInput(!showInput); setParseErr(""); setParseResult(null); }}>
                    {showInput ? "Cancel" : "+ Import Cause List"}
                </Button>
            </div>

            {/* Parse result banner */}
            {parseResult && (
                <div className={styles.limAlertBanner} style={{ background: "var(--bg-1)", borderColor: "var(--gold)", marginBottom: "0.75rem" }}>
                    Parsed {parseResult.total} entries — <strong>{parseResult.matched} matched</strong> to your matters.
                    {parseResult.matched === 0 && " Check that matter case numbers are filled in."}
                </div>
            )}

            {/* Import form */}
            {showInput && (
                <div className={styles.settingsCard} style={{ marginBottom: "1.25rem" }}>
                    <div className={styles.settingsCardTitle}>Import Cause List</div>
                    <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
                        Paste the plain text of any Pakistani court's cause list, or upload a photo/PDF and let OCR read it. Case numbers will be detected automatically and matched against your matters — matched matters get sent to you automatically as a WhatsApp digest at 8am.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Cause List Date</label>
                            <input type="date" className={styles.formInput} value={listDate} onChange={e => setListDate(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Court</label>
                            <select className={styles.formSelect} value={courtName} onChange={e => setCourtName(e.target.value)}>
                                <option value="">Select court…</option>
                                {PAKISTAN_COURTS.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Cause List Text</label>
                        <textarea className={styles.formInput} rows={10} style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.8rem" }}
                            value={text} onChange={e => { setText(e.target.value); if (e.target.value) setFile(null); }}
                            disabled={!!file}
                            placeholder={"Paste cause list text here…\n\nExample:\n1. W.P. No. 1234/2024 — Muhammad Ali v Federation of Pakistan\n2. C.S. No. 89/2023 — ABC Ltd v XYZ Ltd"} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>— or upload a photo / scanned PDF —</label>
                        <input type="file" accept="image/*,.pdf" className={styles.formInput}
                            onChange={e => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) setText(""); }} />
                        {file && (
                            <p className={styles.muted} style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
                                📎 {file.name} — will be read automatically (OCR). <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remove</Button>
                            </p>
                        )}
                    </div>
                    {parseErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{parseErr}</div>}
                    <div className={styles.modalActions}>
                        <Button variant="ghost" onClick={() => { setShowInput(false); setText(""); }}>Cancel</Button>
                        <Button onClick={parseCauseList} loading={parseMutation.isPending}>Parse & Match</Button>
                    </div>
                </div>
            )}

            {/* Entries */}
            {loading ? (
                <EmptyState message="Loading…" />
            ) : entries.length === 0 ? (
                <EmptyState message='No cause list entries for this date. Click "+ Import Cause List" to paste a court cause list.' />
            ) : (
                <>
                    {/* Matched matters */}
                    {matched.length > 0 && (
                        <>
                            <div className={styles.sectionTitle} style={{ color: "#2d8a4e", marginBottom: "0.5rem" }}>
                                Matched to Your Matters ({matched.length})
                            </div>
                            <div style={{ marginBottom: "1.5rem" }}>
                            <Table>
                                    <thead><tr>
                                        <th>Item</th><th>Case Number</th><th>Parties</th><th>Matter</th><th>Court</th><th>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {matched.map(e => (
                                            <tr key={e.entry_id} style={{ background: "rgba(45,138,78,0.06)" }}>
                                                <td className={styles.muted}>{e.item_no || "—"}</td>
                                                <td><strong style={{ fontSize: "0.82rem" }}>{e.case_number || "—"}</strong></td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem", maxWidth: 200 }}>{e.parties || "—"}</td>
                                                <td>
                                                    <span className={styles.badgeGreen} style={{ fontSize: "0.72rem" }}>{e.matter_title}</span>
                                                </td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem" }}>{e.court_name || "—"}</td>
                                                <td style={{ display: "flex", gap: "0.35rem" }}>
                                                    {linkingId === e.entry_id ? (
                                                        <>
                                                            <select className={styles.formSelect} style={{ fontSize: "0.78rem", padding: "0.2rem" }}
                                                                value={linkTarget} onChange={ev => setLinkTarget(ev.target.value)}>
                                                                <option value="">Unlink</option>
                                                                {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title}{m.case_number ? ` (${m.case_number})` : ""}</option>)}
                                                            </select>
                                                            <button className={styles.actionBtn} onClick={() => saveLink(e)}>Save</button>
                                                            <Button variant="ghost" size="sm" style={{ fontSize: "0.75rem" }} onClick={() => setLinkingId(null)}>✕</Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className={styles.actionBtn} onClick={() => { setLinkingId(e.entry_id); setLinkTarget(e.matter_id ?? ""); }}>Relink</button>
                                                            <button className={styles.actionBtnDanger} onClick={() => deleteEntry(e)}>✕</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                            </Table>
                            </div>
                        </>
                    )}

                    {/* Unmatched entries */}
                    {unmatched.length > 0 && (
                        <>
                            <div className={styles.sectionTitle} style={{ marginBottom: "0.5rem" }}>
                                Unmatched Entries ({unmatched.length})
                                <span className={styles.muted} style={{ fontSize: "0.78rem", fontWeight: 400, marginLeft: "0.5rem" }}>
                                    — link manually or ensure case numbers are set on your matters
                                </span>
                            </div>
                            <Table>
                                    <thead><tr>
                                        <th>Item</th><th>Case Number</th><th>Parties</th><th>Court</th><th>Link to Matter</th><th></th>
                                    </tr></thead>
                                    <tbody>
                                        {unmatched.map(e => (
                                            <tr key={e.entry_id}>
                                                <td className={styles.muted}>{e.item_no || "—"}</td>
                                                <td style={{ fontSize: "0.82rem" }}>{e.case_number || <span className={styles.muted}>not detected</span>}</td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem", maxWidth: 220 }}>{e.parties || "—"}</td>
                                                <td className={styles.muted} style={{ fontSize: "0.78rem" }}>{e.court_name || "—"}</td>
                                                <td>
                                                    {linkingId === e.entry_id ? (
                                                        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                                                            <select className={styles.formSelect} style={{ fontSize: "0.78rem", padding: "0.2rem" }}
                                                                value={linkTarget} onChange={ev => setLinkTarget(ev.target.value)}>
                                                                <option value="">No link</option>
                                                                {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title}{m.case_number ? ` (${m.case_number})` : ""}</option>)}
                                                            </select>
                                                            <button className={styles.actionBtn} onClick={() => saveLink(e)}>Save</button>
                                                            <Button variant="ghost" size="sm" style={{ fontSize: "0.75rem" }} onClick={() => setLinkingId(null)}>✕</Button>
                                                        </div>
                                                    ) : (
                                                        <Button variant="ghost" size="sm"
                                                            onClick={() => { setLinkingId(e.entry_id); setLinkTarget(""); }}>
                                                            Link…
                                                        </Button>
                                                    )}
                                                </td>
                                                <td>
                                                    <button className={styles.actionBtnDanger} onClick={() => deleteEntry(e)}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                            </Table>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
