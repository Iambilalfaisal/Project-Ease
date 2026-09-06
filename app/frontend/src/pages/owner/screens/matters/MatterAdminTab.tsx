// Matter notes/activity journal, client document requests, internal
// deadlines, correspondence log, outcome & disposal, court transfers, and
// the conflict-of-interest re-check for a single matter.
import { useState } from "react";
import {
    SETTINGS_CARD, FORM_SELECT, FORM_INPUT, EMPTY_HINT, ORDER_CARD, ORDER_CARD_BODY,
    ORDER_CARD_HEADER, ORDER_DATE, BADGE_GRAY, ACTION_BTN_DANGER, ORDER_BRIEF, MUTED,
    ORDER_ACTIONS, ACTION_BTN, FORM_GROUP, FORM_LABEL, BADGE_AMBER, BADGE_GREEN, LIM_ALERT_ITEM_CRITICAL,
} from "../../ownerStyles";
import { Badge, Button, Modal } from "../../../../components/ui";
import type { Matter, MatterDeadline, MatterCorrespondence, CourtTransfer, DocRequest } from "../../types";
import {
    useMatterNotes, useCreateMatterNote, useDeleteMatterNote,
    useDocRequests, useCreateDocRequest, useUpdateDocRequest, useDeleteDocRequest,
    useMatterDeadlines, useCreateMatterDeadline, useUpdateMatterDeadline, useDeleteMatterDeadline,
    useCorrespondence, useCreateCorrespondence, useUpdateCorrespondence, useDeleteCorrespondence,
    useMatterOutcome, useSaveMatterOutcome,
    useCourtTransfers, useCreateCourtTransfer, useUpdateCourtTransfer, useDeleteCourtTransfer,
} from "../../../../hooks/useMatterAdmin";
import { useCheckConflicts } from "../../../../hooks/useMatters";
import { NOTE_TYPES_UI, BLANK_NOTE_FORM, DOC_REQUEST_STATUSES_UI, BLANK_DOC_REQ, DEADLINE_PRIORITIES_UI, BLANK_DEADLINE, CORR_DIRECTIONS_UI, CORR_TYPES_UI, BLANK_CORR, OUTCOME_TYPES_UI, BLANK_OUTCOME, BLANK_TRANSFER } from "./matterConstants";

// ── Notes / activity journal ────────────────────────────────────────────────

export function MatterNotesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: notes = [], isLoading } = useMatterNotes(matterId);
    const createNote = useCreateMatterNote(matterId);
    const deleteNote = useDeleteMatterNote(matterId);
    const [form, setForm] = useState({ ...BLANK_NOTE_FORM });
    const [err, setErr] = useState("");

    const add = () => {
        if (!form.note_text.trim()) { setErr("Note text is required."); return; }
        setErr("");
        createNote.mutate(form, { onSuccess: () => setForm({ ...BLANK_NOTE_FORM }), onError: (e: Error) => setErr(e.message || "Save failed.") });
    };

    return (
        <>
            <div className={SETTINGS_CARD} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px auto", gap: "0.5rem", alignItems: "start" }}>
                    <select className={FORM_SELECT} value={form.note_type} onChange={e => setForm(f => ({ ...f, note_type: e.target.value }))}>{NOTE_TYPES_UI.map(t => <option key={t}>{t}</option>)}</select>
                    <input className={FORM_INPUT} placeholder="Note text…" value={form.note_text} onChange={e => setForm(f => ({ ...f, note_text: e.target.value }))} />
                    <input type="date" className={FORM_INPUT} value={form.note_date} onChange={e => setForm(f => ({ ...f, note_date: e.target.value }))} />
                    <Button size="sm" onClick={add} disabled={createNote.isPending}>{createNote.isPending ? "…" : "+ Add"}</Button>
                </div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.82rem", marginTop: "0.4rem" }}>{err}</div>}
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : notes.length === 0 ? (
                <div className={EMPTY_HINT}>No notes yet.</div>
            ) : notes.map(n => (
                <div key={n.note_id} className={ORDER_CARD} style={{ marginBottom: "0.5rem" }}>
                    <div className={ORDER_CARD_BODY}>
                        <div className={ORDER_CARD_HEADER}>
                            <div><span className={ORDER_DATE}>{n.note_date}</span> <span className={BADGE_GRAY}>{n.note_type}</span></div>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm("Delete this note?") && deleteNote.mutate(n.note_id)}>Delete</button>
                        </div>
                        <div className={ORDER_BRIEF}>{n.note_text}</div>
                        {n.author_name && <div className={MUTED} style={{ fontSize: "0.75rem" }}>— {n.author_name}</div>}
                    </div>
                </div>
            ))}
        </>
    );
}

// ── Document requests ───────────────────────────────────────────────────────

export function MatterDocRequestsTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: requests = [], isLoading } = useDocRequests(matterId);
    const createReq = useCreateDocRequest(matterId);
    const updateReq = useUpdateDocRequest(matterId);
    const deleteReq = useDeleteDocRequest(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<DocRequest | null>(null);
    const [form, setForm] = useState({ ...BLANK_DOC_REQ });
    const [err, setErr] = useState("");

    const openModal = (r?: DocRequest) => {
        if (r) setForm({ doc_name: r.doc_name, requested_date: r.requested_date, due_date: r.due_date ?? "", notes: r.notes ?? "", status: r.status, received_date: r.received_date ?? "" });
        else setForm({ ...BLANK_DOC_REQ });
        setEditing(r ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.doc_name.trim()) { setErr("Document name is required."); return; }
        setErr("");
        const body = { ...form, due_date: form.due_date || null, notes: form.notes || null, received_date: form.received_date || null };
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateReq.mutate({ requestId: editing.request_id, body }, { onSuccess, onError });
        else createReq.mutate(body, { onSuccess, onError });
    };

    const saving = createReq.isPending || updateReq.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{requests.length} request{requests.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Request Document</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : requests.length === 0 ? (
                <div className={EMPTY_HINT}>No document requests yet.</div>
            ) : requests.map(r => (
                <div key={r.request_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><strong>{r.doc_name}</strong> <Badge tone={r.status === "Received" ? "green" : r.status === "Overdue" ? "red" : r.status === "Waived" ? "gray" : "amber"}>{r.status}</Badge></div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(r)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm(`Delete request for "${r.doc_name}"?`) && deleteReq.mutate(r.request_id)}>Delete</button>
                        </div>
                    </div>
                    <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>Requested {r.requested_date}{r.due_date && ` · Due ${r.due_date}`}</div>
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Request" : "Request Document"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Document Name *</label><input className={FORM_INPUT} value={form.doc_name} onChange={e => setForm(f => ({ ...f, doc_name: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Requested Date</label><input type="date" className={FORM_INPUT} value={form.requested_date} onChange={e => setForm(f => ({ ...f, requested_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Due Date</label><input type="date" className={FORM_INPUT} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Status</label><select className={FORM_SELECT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{DOC_REQUEST_STATUSES_UI.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Received Date</label><input type="date" className={FORM_INPUT} value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Internal deadlines ───────────────────────────────────────────────────────

export function MatterDeadlinesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: deadlines = [], isLoading } = useMatterDeadlines(matterId);
    const createDeadline = useCreateMatterDeadline(matterId);
    const updateDeadline = useUpdateMatterDeadline(matterId);
    const deleteDeadline = useDeleteMatterDeadline(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MatterDeadline | null>(null);
    const [form, setForm] = useState({ ...BLANK_DEADLINE });
    const [err, setErr] = useState("");

    const openModal = (d?: MatterDeadline) => {
        if (d) setForm({ title: d.title, due_date: d.due_date, priority: d.priority, notes: d.notes ?? "" });
        else setForm({ ...BLANK_DEADLINE });
        setEditing(d ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.title.trim()) { setErr("Title is required."); return; }
        setErr("");
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateDeadline.mutate({ deadlineId: editing.deadline_id, body: form }, { onSuccess, onError });
        else createDeadline.mutate(form, { onSuccess, onError });
    };

    const toggleDone = (d: MatterDeadline) => updateDeadline.mutate({ deadlineId: d.deadline_id, body: { completed: d.completed ? 0 : 1 } });

    const saving = createDeadline.isPending || updateDeadline.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{deadlines.length} internal deadline{deadlines.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Deadline</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : deadlines.length === 0 ? (
                <div className={EMPTY_HINT}>No internal deadlines set.</div>
            ) : deadlines.map(d => (
                <div key={d.deadline_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem", opacity: d.completed ? 0.6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input type="checkbox" checked={!!d.completed} onChange={() => toggleDone(d)} />
                            <strong style={{ textDecoration: d.completed ? "line-through" : "none" }}>{d.title}</strong>
                            <Badge tone={d.priority === "High" ? "red" : d.priority === "Medium" ? "amber" : "gray"}>{d.priority}</Badge>
                        </div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(d)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm(`Delete "${d.title}"?`) && deleteDeadline.mutate(d.deadline_id)}>Delete</button>
                        </div>
                    </div>
                    <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>Due {d.due_date}</div>
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Deadline" : "Add Deadline"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Title *</label><input className={FORM_INPUT} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Due Date</label><input type="date" className={FORM_INPUT} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Priority</label><select className={FORM_SELECT} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>{DEADLINE_PRIORITIES_UI.map(p => <option key={p}>{p}</option>)}</select></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Correspondence log ───────────────────────────────────────────────────────

export function MatterCorrespondenceTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: corr = [], isLoading } = useCorrespondence(matterId);
    const createCorr = useCreateCorrespondence(matterId);
    const updateCorr = useUpdateCorrespondence(matterId);
    const deleteCorr = useDeleteCorrespondence(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MatterCorrespondence | null>(null);
    const [form, setForm] = useState({ ...BLANK_CORR });
    const [err, setErr] = useState("");

    const openModal = (c?: MatterCorrespondence) => {
        if (c) setForm({ subject: c.subject, corr_date: c.corr_date, direction: c.direction, corr_type: c.corr_type, party: c.party ?? "", reference_no: c.reference_no ?? "", notes: c.notes ?? "" });
        else setForm({ ...BLANK_CORR });
        setEditing(c ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.subject.trim()) { setErr("Subject is required."); return; }
        setErr("");
        const body = { ...form, party: form.party || null, reference_no: form.reference_no || null, notes: form.notes || null };
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateCorr.mutate({ corrId: editing.corr_id, body }, { onSuccess, onError });
        else createCorr.mutate(body, { onSuccess, onError });
    };

    const saving = createCorr.isPending || updateCorr.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{corr.length} entr{corr.length !== 1 ? "ies" : "y"}</span>
                <Button size="sm" onClick={() => openModal()}>+ Log Correspondence</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : corr.length === 0 ? (
                <div className={EMPTY_HINT}>No correspondence logged yet.</div>
            ) : corr.map(c => (
                <div key={c.corr_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><strong>{c.subject}</strong> <span className={BADGE_GRAY}>{c.direction}</span> <span className={MUTED}>· {c.corr_type} · {c.corr_date}</span></div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(c)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm(`Delete "${c.subject}"?`) && deleteCorr.mutate(c.corr_id)}>Delete</button>
                        </div>
                    </div>
                    {c.party && <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>{c.direction === "Sent" ? "To" : "From"}: {c.party}</div>}
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Entry" : "Log Correspondence"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Subject *</label><input className={FORM_INPUT} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Date</label><input type="date" className={FORM_INPUT} value={form.corr_date} onChange={e => setForm(f => ({ ...f, corr_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Direction</label><select className={FORM_SELECT} value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>{CORR_DIRECTIONS_UI.map(d => <option key={d}>{d}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Type</label><select className={FORM_SELECT} value={form.corr_type} onChange={e => setForm(f => ({ ...f, corr_type: e.target.value }))}>{CORR_TYPES_UI.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Party</label><input className={FORM_INPUT} value={form.party} onChange={e => setForm(f => ({ ...f, party: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Reference No.</label><input className={FORM_INPUT} value={form.reference_no} onChange={e => setForm(f => ({ ...f, reference_no: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Matter outcome & disposal ────────────────────────────────────────────────

export function MatterOutcomeTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: outcome, isLoading } = useMatterOutcome(matterId);
    const saveOutcome = useSaveMatterOutcome(matterId);
    const [form, setForm] = useState({ ...BLANK_OUTCOME });
    const [editing, setEditing] = useState(false);
    const [err, setErr] = useState("");

    const startEdit = () => {
        if (outcome) setForm({ outcome_type: outcome.outcome_type, disposal_date: outcome.disposal_date ?? "", court: outcome.court ?? "", judge: outcome.judge ?? "", decree_amount_pkr: outcome.decree_amount_pkr == null ? "" : String(outcome.decree_amount_pkr), appeal_filed: !!outcome.appeal_filed, appeal_deadline: outcome.appeal_deadline ?? "", notes: outcome.notes ?? "" });
        else setForm({ ...BLANK_OUTCOME });
        setEditing(true); setErr("");
    };

    const save = () => {
        setErr("");
        const body = { ...form, decree_amount_pkr: form.decree_amount_pkr === "" ? null : Number(form.decree_amount_pkr), appeal_filed: form.appeal_filed ? 1 : 0 };
        saveOutcome.mutate(body, { onSuccess: () => setEditing(false), onError: (e: Error) => setErr(e.message || "Save failed.") });
    };

    if (isLoading) return <div className={EMPTY_HINT}>Loading…</div>;

    if (!editing) {
        return (
            <div className={SETTINGS_CARD}>
                {outcome ? (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div><Badge tone="blue">{outcome.outcome_type}</Badge> <span className={MUTED}>{outcome.disposal_date}</span></div>
                            <Button variant="ghost" size="sm" onClick={startEdit}>Edit</Button>
                        </div>
                        {outcome.court && <div className={MUTED} style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>{outcome.court}{outcome.judge && ` · ${outcome.judge}`}</div>}
                        {outcome.decree_amount_pkr != null && <div style={{ marginTop: "0.3rem" }}>Decree amount: PKR {outcome.decree_amount_pkr.toLocaleString("en-PK")}</div>}
                        {!!outcome.appeal_filed && <div className={BADGE_AMBER} style={{ marginTop: "0.3rem", display: "inline-block" }}>Appeal filed{outcome.appeal_deadline && ` — deadline ${outcome.appeal_deadline}`}</div>}
                        {outcome.notes && <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>{outcome.notes}</div>}
                    </>
                ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className={EMPTY_HINT} style={{ margin: 0 }}>No outcome recorded — this matter is still pending disposal.</span>
                        <Button size="sm" onClick={startEdit}>Record Outcome</Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={SETTINGS_CARD}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Outcome Type</label><select className={FORM_SELECT} value={form.outcome_type} onChange={e => setForm(f => ({ ...f, outcome_type: e.target.value }))}>{OUTCOME_TYPES_UI.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Disposal Date</label><input type="date" className={FORM_INPUT} value={form.disposal_date} onChange={e => setForm(f => ({ ...f, disposal_date: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Court</label><input className={FORM_INPUT} value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Judge</label><input className={FORM_INPUT} value={form.judge} onChange={e => setForm(f => ({ ...f, judge: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Decree Amount (PKR)</label><input type="number" className={FORM_INPUT} value={form.decree_amount_pkr} onChange={e => setForm(f => ({ ...f, decree_amount_pkr: e.target.value }))} /></div>
                <div className={FORM_GROUP} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" id="appealFiled" checked={form.appeal_filed} onChange={e => setForm(f => ({ ...f, appeal_filed: e.target.checked }))} />
                    <label htmlFor="appealFiled">Appeal filed</label>
                    {form.appeal_filed && <input type="date" className={FORM_INPUT} style={{ width: "auto" }} value={form.appeal_deadline} onChange={e => setForm(f => ({ ...f, appeal_deadline: e.target.value }))} />}
                </div>
            </div>
            <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <Button onClick={save} disabled={saveOutcome.isPending}>{saveOutcome.isPending ? "Saving…" : "Save Outcome"}</Button>
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={saveOutcome.isPending}>Cancel</Button>
            </div>
        </div>
    );
}

// ── Court transfers ──────────────────────────────────────────────────────────

export function MatterTransfersTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: transfers = [], isLoading } = useCourtTransfers(matterId);
    const createTransfer = useCreateCourtTransfer(matterId);
    const updateTransfer = useUpdateCourtTransfer(matterId);
    const deleteTransfer = useDeleteCourtTransfer(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<CourtTransfer | null>(null);
    const [form, setForm] = useState({ ...BLANK_TRANSFER });
    const [err, setErr] = useState("");

    const openModal = (t?: CourtTransfer) => {
        if (t) setForm({ transfer_date: t.transfer_date ?? "", from_court: t.from_court, to_court: t.to_court, from_judge: t.from_judge ?? "", to_judge: t.to_judge ?? "", reason: t.reason ?? "", order_ref: t.order_ref ?? "", notes: t.notes ?? "" });
        else setForm({ ...BLANK_TRANSFER });
        setEditing(t ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.from_court.trim() || !form.to_court.trim()) { setErr("From and To court are required."); return; }
        setErr("");
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateTransfer.mutate({ transferId: editing.transfer_id, body: form }, { onSuccess, onError });
        else createTransfer.mutate(form, { onSuccess, onError });
    };

    const saving = createTransfer.isPending || updateTransfer.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{transfers.length} transfer{transfers.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Transfer</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : transfers.length === 0 ? (
                <div className={EMPTY_HINT}>No court transfers recorded.</div>
            ) : transfers.map(t => (
                <div key={t.transfer_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><strong>{t.from_court}</strong> → <strong>{t.to_court}</strong>{t.transfer_date && <span className={MUTED}> · {t.transfer_date}</span>}</div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(t)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm("Delete this transfer entry?") && deleteTransfer.mutate(t.transfer_id)}>Delete</button>
                        </div>
                    </div>
                    {t.reason && <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>{t.reason}</div>}
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Transfer" : "Add Court Transfer"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>From Court *</label><input className={FORM_INPUT} value={form.from_court} onChange={e => setForm(f => ({ ...f, from_court: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>To Court *</label><input className={FORM_INPUT} value={form.to_court} onChange={e => setForm(f => ({ ...f, to_court: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>From Judge</label><input className={FORM_INPUT} value={form.from_judge} onChange={e => setForm(f => ({ ...f, from_judge: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>To Judge</label><input className={FORM_INPUT} value={form.to_judge} onChange={e => setForm(f => ({ ...f, to_judge: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Transfer Date</label><input type="date" className={FORM_INPUT} value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Order Reference</label><input className={FORM_INPUT} value={form.order_ref} onChange={e => setForm(f => ({ ...f, order_ref: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Reason</label><textarea className={FORM_INPUT} rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Conflict-of-interest re-check ───────────────────────────────────────────

export function MatterConflictTab({ matter }: { matter: Matter }) {
    const checkConflicts = useCheckConflicts();

    const runCheck = () => {
        checkConflicts.mutate({ new_client_name: matter.client_name, opponent_name: matter.opposing_party ?? "" });
    };

    return (
        <div className={SETTINGS_CARD}>
            <p className={MUTED} style={{ fontSize: "0.85rem" }}>
                Re-run a conflict-of-interest check against this matter's client ("{matter.client_name}") and opposing party ("{matter.opposing_party || "—"}") across every other matter and client in the firm.
            </p>
            <Button onClick={runCheck} disabled={checkConflicts.isPending}>{checkConflicts.isPending ? "Checking…" : "Run Conflict Check"}</Button>
            {checkConflicts.data && (
                checkConflicts.data.length === 0 ? (
                    <div className={BADGE_GREEN} style={{ marginTop: "0.75rem", display: "inline-block" }}>No conflicts found</div>
                ) : (
                    <div style={{ marginTop: "0.75rem" }}>
                        {checkConflicts.data.map((c, i) => (
                            <div key={i} className={LIM_ALERT_ITEM_CRITICAL} style={{ marginBottom: "0.4rem" }}>{JSON.stringify(c)}</div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
