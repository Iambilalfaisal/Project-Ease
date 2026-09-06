// Matter detail header (info grid, inline edit, delete, LHC case-status
// lookup, quick vakalatnama/priority change) and the "Documents" tab
// (linked-document list + link-from-library modal).
import { useState } from "react";
import {
    BACK_BTN, ACTION_BTN_DANGER, MUTED, SETTINGS_CARD, SETTINGS_CARD_TITLE,
    MATTER_DETAIL_HEADER, DETAIL_TITLE, BADGE_GRAY, BADGE_GOLD, DETAIL_INFO_GRID,
    DETAIL_INFO_ITEM, DETAIL_INFO_LABEL, BADGE_AMBER, BADGE_GREEN, PRIORITY_BADGE,
    LIM_BADGE_CRITICAL, LIM_BADGE_WARN, EMPTY_HINT, DOC_HIERARCHY, DOC_HIERARCHY_GROUP,
    DOC_HIERARCHY_GROUP_HEADER, DOC_HIERARCHY_CAT, DOC_HIERARCHY_COUNT, DOC_HIERARCHY_ROW,
    FILE_ICON, DOC_HIERARCHY_NAME, DOC_HIERARCHY_SIZE, QUEUE_REMOVE,
} from "../../ownerStyles";
import { Badge, Button, Modal } from "../../../../components/ui";
import type { Matter } from "../../types";
import { fmtBytes } from "../../types";
import {
    useUpdateMatter, useDeleteMatter, useLhcCaseStatus,
    useDocumentsForLinking, useLinkDocument, useUnlinkDocument,
} from "../../../../hooks/useMatters";
import { MatterForm, MatterFormState } from "./MatterForm";
import { VAKALATNAMA_STATUSES, MATTER_PRIORITIES, limitationDaysRemaining, groupDocsByCategory } from "./matterConstants";

function toFormState(m: Matter): MatterFormState {
    return {
        client_id: m.client_id, title: m.title,
        matter_type: m.matter_type, status: m.status,
        court_name: m.court_name ?? "", case_number: m.case_number ?? "",
        filing_date: m.filing_date ?? "", opposing_party: m.opposing_party ?? "",
        team_id: m.team_id ?? "", notes: m.notes ?? "",
        limitation_type: m.limitation_type ?? "",
        cause_of_action_date: m.cause_of_action_date ?? "",
        limitation_date: m.limitation_date ?? "",
        vakalatnama_status: m.vakalatnama_status ?? "Pending",
        priority: m.priority ?? "Normal",
        physical_file_ref: m.physical_file_ref ?? "",
        rack_no: m.rack_no ?? "",
        bundle_no: m.bundle_no ?? "",
        parent_matter_id: m.parent_matter_id ?? "",
        matter_stage: m.matter_stage ?? "",
    };
}

export function MatterOverviewHeader({
    matter, onBack, onDeleted, editDetail, setEditDetail, allMatters,
}: {
    matter: Matter;
    onBack: () => void;
    onDeleted: () => void;
    editDetail: boolean;
    setEditDetail: (v: boolean) => void;
    allMatters: Matter[];
}) {
    const [form, setForm] = useState<MatterFormState>(() => toFormState(matter));
    const [formErr, setFormErr] = useState<string | null>(null);
    const updateMatter = useUpdateMatter(matter.matter_id);
    const deleteMatter = useDeleteMatter();
    const lhcStatus = useLhcCaseStatus();

    const openEdit = () => { setForm(toFormState(matter)); setFormErr(null); setEditDetail(true); };

    const saveDetailEdit = () => {
        setFormErr(null);
        const body: any = { ...form };
        if (!body.team_id) body.team_id = null;
        updateMatter.mutate(body, {
            onSuccess: () => setEditDetail(false),
            onError: (err: Error) => setFormErr(err.message || "Failed."),
        });
    };

    const removeMatter = () => {
        if (!confirm(`Delete matter "${matter.title}"?`)) return;
        deleteMatter.mutate(matter.matter_id, { onSuccess: onDeleted });
    };

    const quickPatch = (body: Record<string, unknown>) => updateMatter.mutate(body);

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                <button className={BACK_BTN} onClick={onBack}>← Back to Matters</button>
                {!editDetail && (
                    <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                        <Button variant="ghost" size="sm" onClick={openEdit}>Edit</Button>
                        <button className={ACTION_BTN_DANGER} style={{ fontSize: "0.8rem" }} onClick={removeMatter}>Delete</button>
                        {matter.case_number && (
                            <Button variant="ghost" size="sm" onClick={() => lhcStatus.mutate(matter.case_number as string)} disabled={lhcStatus.isPending}>
                                {lhcStatus.isPending ? "Checking…" : "🏛 LHC Status"}
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {lhcStatus.data && (
                <div style={{ margin: "0.5rem 0", padding: "0.75rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: lhcStatus.data.status === "ok" ? "var(--bg-1)" : "rgba(220,38,38,0.06)", fontSize: "0.82rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{lhcStatus.data.status === "ok" ? "🏛 LHC Result" : lhcStatus.data.status === "unavailable" ? "⚠ LHC lookup not yet configured" : "✗ LHC lookup error"}</strong>
                        <Button variant="ghost" size="sm" style={{ fontSize: "0.72rem", padding: "1px 6px" }} onClick={() => lhcStatus.reset()}>✕</Button>
                    </div>
                    {lhcStatus.data.message && <div className={MUTED} style={{ marginTop: "0.25rem" }}>{lhcStatus.data.message}</div>}
                    {lhcStatus.data.raw_text && <pre style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap", fontSize: "0.78rem", maxHeight: 200, overflow: "auto" }}>{lhcStatus.data.raw_text}</pre>}
                </div>
            )}

            {editDetail ? (
                <div className={SETTINGS_CARD} style={{ marginBottom: "1.5rem" }}>
                    <div className={SETTINGS_CARD_TITLE}>Edit Matter</div>
                    <MatterForm form={form} setForm={setForm} onSave={saveDetailEdit} onCancel={() => setEditDetail(false)} saving={updateMatter.isPending} formErr={formErr} excludeMatterId={matter.matter_id} />
                </div>
            ) : (
                <div className={MATTER_DETAIL_HEADER}>
                    <div>
                        <h2 className={DETAIL_TITLE}>{matter.title}</h2>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                            <Badge tone={matter.status === "Active" ? "green" : matter.status === "Pending" ? "amber" : matter.status === "Settled" ? "blue" : matter.status === "Withdrawn" ? "red" : "gray"}>{matter.status}</Badge>
                            <span className={BADGE_GRAY}>{matter.matter_type}</span>
                            {matter.team_name && <span className={BADGE_GOLD}>👥 {matter.team_name}</span>}
                        </div>
                    </div>
                    <div className={DETAIL_INFO_GRID} style={{ marginTop: "1rem" }}>
                        <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Client</span><span>{matter.client_name}</span></div>
                        {matter.court_name    && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Court</span><span>{matter.court_name}</span></div>}
                        {matter.case_number   && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Case #</span><span>{matter.case_number}</span></div>}
                        {matter.filing_date   && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Filed</span><span>{matter.filing_date}</span></div>}
                        {matter.opposing_party && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Opposing Party</span><span>{matter.opposing_party}</span></div>}
                        {matter.notes         && <div className={DETAIL_INFO_ITEM} style={{ gridColumn: "1/-1" }}><span className={DETAIL_INFO_LABEL}>Notes</span><span>{matter.notes}</span></div>}
                        {(matter.physical_file_ref || matter.rack_no || matter.bundle_no) && (
                            <div className={DETAIL_INFO_ITEM} style={{ gridColumn: "1/-1" }}>
                                <span className={DETAIL_INFO_LABEL}>📁 Physical File</span>
                                <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                                    {[matter.physical_file_ref && `Ref: ${matter.physical_file_ref}`, matter.rack_no && `Rack: ${matter.rack_no}`, matter.bundle_no && `Bundle: ${matter.bundle_no}`].filter(Boolean).join(" · ")}
                                </span>
                            </div>
                        )}
                        {matter.matter_stage && (
                            <div className={DETAIL_INFO_ITEM}>
                                <span className={DETAIL_INFO_LABEL}>⚖ Stage</span>
                                <span className={BADGE_AMBER} style={{ fontSize: "0.75rem" }}>{matter.matter_stage}</span>
                            </div>
                        )}
                        {matter.parent_matter_id && (
                            <div className={DETAIL_INFO_ITEM}>
                                <span className={DETAIL_INFO_LABEL}>🔗 Appeal Of</span>
                                <span style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
                                    {allMatters.find(m => m.matter_id === matter.parent_matter_id)?.title ?? matter.parent_matter_id}
                                </span>
                            </div>
                        )}
                        <div className={DETAIL_INFO_ITEM}>
                            <span className={DETAIL_INFO_LABEL}>Vakalatnama</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span className={
                                    matter.vakalatnama_status === "Filed"        ? BADGE_GREEN :
                                    matter.vakalatnama_status === "Not Required" ? BADGE_GRAY  : BADGE_AMBER
                                } style={{ fontSize: "0.72rem" }}>
                                    {matter.vakalatnama_status ?? "Pending"}
                                </span>
                                {VAKALATNAMA_STATUSES.filter(s => s !== (matter.vakalatnama_status ?? "Pending")).map(s => (
                                    <Button key={s} variant="ghost" size="sm" onClick={() => quickPatch({ vakalatnama_status: s })}>
                                        → {s}
                                    </Button>
                                ))}
                            </span>
                        </div>
                        <div className={DETAIL_INFO_ITEM}>
                            <span className={DETAIL_INFO_LABEL}>Adjournments</span>
                            <span>
                                <span className={
                                    (matter.adjournment_count ?? 0) >= 10 ? LIM_BADGE_CRITICAL :
                                    (matter.adjournment_count ?? 0) >= 5  ? BADGE_AMBER : BADGE_GRAY
                                } style={{ fontSize: "0.78rem" }}>
                                    {matter.adjournment_count ?? 0} adjournment{(matter.adjournment_count ?? 0) !== 1 ? "s" : ""}
                                </span>
                                <span className={MUTED} style={{ fontSize: "0.75rem", marginLeft: "0.4rem" }}>(from Court Orders log)</span>
                            </span>
                        </div>
                        <div className={DETAIL_INFO_ITEM}>
                            <span className={DETAIL_INFO_LABEL}>Priority</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span className={PRIORITY_BADGE} data-priority={matter.priority ?? "Normal"}>
                                    {matter.priority ?? "Normal"}
                                </span>
                                {MATTER_PRIORITIES.filter(p => p !== (matter.priority ?? "Normal")).map(p => (
                                    <Button key={p} variant="ghost" size="sm" onClick={() => quickPatch({ priority: p })}>
                                        → {p}
                                    </Button>
                                ))}
                            </span>
                        </div>
                        {matter.limitation_date && (() => {
                            const d = limitationDaysRemaining(matter.limitation_date!);
                            return (
                                <div className={DETAIL_INFO_ITEM} style={{ gridColumn: "1/-1" }}>
                                    <span className={DETAIL_INFO_LABEL}>Limitation Deadline</span>
                                    <span>
                                        {matter.limitation_date}
                                        {matter.limitation_type && <span className={MUTED}> ({matter.limitation_type})</span>}
                                        <span className={d < 0 ? LIM_BADGE_CRITICAL : d <= 30 ? LIM_BADGE_CRITICAL : d <= 60 ? LIM_BADGE_WARN : BADGE_GREEN} style={{ marginLeft: "0.5rem", fontSize: "0.72rem" }}>
                                            {d < 0 ? `EXPIRED ${Math.abs(d)}d ago` : d === 0 ? "EXPIRES TODAY" : `${d} days left`}
                                        </span>
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </>
    );
}

export function MatterDocumentsTab({ matter }: { matter: Matter }) {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const { data: allDocs = [] } = useDocumentsForLinking(showLinkModal);
    const linkDoc = useLinkDocument(matter.matter_id);
    const unlinkDoc = useUnlinkDocument(matter.matter_id);
    const [linkingDoc, setLinkingDoc] = useState<string | null>(null);

    const grouped = groupDocsByCategory(matter.documents ?? []);
    // Only show docs not linked to another matter.
    const linkable = allDocs.filter((d: any) => !d.matter_id || d.matter_id === matter.matter_id);

    const handleLink = (docId: string) => {
        setLinkingDoc(docId);
        linkDoc.mutate(docId, { onSettled: () => setLinkingDoc(null) });
    };

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{(matter.documents ?? []).length} document{(matter.documents ?? []).length !== 1 ? "s" : ""} linked</span>
                <Button variant="ghost" size="sm" onClick={() => setShowLinkModal(true)}>
                    + Link Documents
                </Button>
            </div>
            {grouped.length === 0 ? (
                <div className={EMPTY_HINT}>No documents linked yet. Click "Link Documents" to attach files from your library.</div>
            ) : (
                <div className={DOC_HIERARCHY}>
                    {grouped.map(([catName, docs]) => (
                        <div key={catName} className={DOC_HIERARCHY_GROUP}>
                            <div className={DOC_HIERARCHY_GROUP_HEADER}>
                                <span className={DOC_HIERARCHY_CAT}>📁 {catName}</span>
                                <span className={DOC_HIERARCHY_COUNT}>{docs.length}</span>
                            </div>
                            {docs.map(doc => (
                                <div key={doc.doc_id} className={DOC_HIERARCHY_ROW}>
                                    <span className={FILE_ICON} style={{ fontSize: "0.55rem" }}>F</span>
                                    <span className={DOC_HIERARCHY_NAME}>{doc.filename}</span>
                                    <span className={DOC_HIERARCHY_SIZE}>{fmtBytes(doc.size_bytes)}</span>
                                    <span className={doc.status === "ready" ? BADGE_GREEN : BADGE_AMBER} style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem" }}>
                                        {doc.status === "ready" ? "Ready" : "Processing"}
                                    </span>
                                    <button className={QUEUE_REMOVE} title="Unlink from matter" onClick={() => unlinkDoc.mutate(doc.doc_id)}>✕</button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Link document modal */}
            <Modal open={showLinkModal} onClose={() => setShowLinkModal(false)} maxWidth={520} title="Link Documents"
                footer={<Button variant="ghost" onClick={() => setShowLinkModal(false)}>Close</Button>}>
                <p className={MUTED} style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                    Select documents from your library to link to this matter.
                </p>
                {linkable.length === 0 ? (
                    <div className={EMPTY_HINT}>All available documents are already linked to matters, or your library is empty.</div>
                ) : (
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                        {linkable.map(doc => (
                            <div key={doc.doc_id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
                                <span className={FILE_ICON} style={{ fontSize: "0.55rem", flexShrink: 0 }}>F</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.85rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{doc.category_name ?? "No category"} · {doc.size}</div>
                                </div>
                                <Button size="sm" style={{ fontSize: "0.75rem", padding: "0.3rem 0.8rem" }}
                                    disabled={linkingDoc === doc.doc_id}
                                    onClick={() => handleLink(doc.doc_id)}>
                                    {linkingDoc === doc.doc_id ? "…" : "Link"}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </>
    );
}
