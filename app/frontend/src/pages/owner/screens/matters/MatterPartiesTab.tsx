// Adverse (opposing) party tracking, witness list, and bail/interim relief
// applications for a single matter.
import { useState } from "react";
import {
    MUTED, EMPTY_HINT, SETTINGS_CARD, BADGE_GRAY, BADGE_AMBER, ORDER_ACTIONS,
    ACTION_BTN, ACTION_BTN_DANGER, FORM_GROUP, FORM_LABEL, FORM_INPUT, FORM_SELECT,
} from "../../ownerStyles";
import { Button, Modal } from "../../../../components/ui";
import type { Matter, AdverseParty, Witness, MatterRelief } from "../../types";
import {
    useAdverseParties, useCreateAdverseParty, useUpdateAdverseParty, useDeleteAdverseParty,
    useWitnesses, useCreateWitness, useUpdateWitness, useDeleteWitness,
    useMatterRelief, useCreateRelief, useUpdateRelief, useDeleteRelief,
} from "../../../../hooks/useMatterParties";
import { BLANK_PARTY, WITNESS_TYPES_UI, STATEMENT_STATUSES_UI, BLANK_WITNESS, RELIEF_TYPES_UI, RELIEF_STATUSES_UI, BLANK_RELIEF } from "./matterConstants";

// ── Adverse (opposing) parties ──────────────────────────────────────────────

export function MatterAdversaryTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: parties = [], isLoading } = useAdverseParties(matterId);
    const createParty = useCreateAdverseParty(matterId);
    const updateParty = useUpdateAdverseParty(matterId);
    const deleteParty = useDeleteAdverseParty(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<AdverseParty | null>(null);
    const [form, setForm] = useState({ ...BLANK_PARTY });
    const [err, setErr] = useState("");

    const openModal = (p?: AdverseParty) => {
        if (p) setForm({ party_name: p.party_name, party_type: p.party_type, counsel_name: p.counsel_name ?? "", counsel_phone: p.counsel_phone ?? "", counsel_firm: p.counsel_firm ?? "", notes: p.notes ?? "" });
        else setForm({ ...BLANK_PARTY });
        setEditing(p ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.party_name.trim()) { setErr("Party name is required."); return; }
        setErr("");
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateParty.mutate({ partyId: editing.party_id, body: form }, { onSuccess, onError });
        else createParty.mutate(form, { onSuccess, onError });
    };

    const saving = createParty.isPending || updateParty.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{parties.length} adverse part{parties.length !== 1 ? "ies" : "y"}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Party</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : parties.length === 0 ? (
                <div className={EMPTY_HINT}>No adverse parties recorded yet.</div>
            ) : parties.map(p => (
                <div key={p.party_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><strong>{p.party_name}</strong> <span className={BADGE_GRAY}>{p.party_type}</span></div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(p)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm(`Delete "${p.party_name}"?`) && deleteParty.mutate(p.party_id)}>Delete</button>
                        </div>
                    </div>
                    {p.counsel_name && <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>Counsel: {p.counsel_name}{p.counsel_firm && ` (${p.counsel_firm})`}{p.counsel_phone && ` · ${p.counsel_phone}`}</div>}
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Party" : "Add Adverse Party"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Party Name *</label><input className={FORM_INPUT} value={form.party_name} onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Party Type</label><select className={FORM_SELECT} value={form.party_type} onChange={e => setForm(f => ({ ...f, party_type: e.target.value }))}>{["Individual", "Corporate", "Government"].map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Counsel Name</label><input className={FORM_INPUT} value={form.counsel_name} onChange={e => setForm(f => ({ ...f, counsel_name: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Counsel Firm</label><input className={FORM_INPUT} value={form.counsel_firm} onChange={e => setForm(f => ({ ...f, counsel_firm: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Counsel Phone</label><input className={FORM_INPUT} value={form.counsel_phone} onChange={e => setForm(f => ({ ...f, counsel_phone: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Witnesses ────────────────────────────────────────────────────────────────

export function MatterWitnessesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: witnesses = [], isLoading } = useWitnesses(matterId);
    const createWitness = useCreateWitness(matterId);
    const updateWitness = useUpdateWitness(matterId);
    const deleteWitness = useDeleteWitness(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Witness | null>(null);
    const [form, setForm] = useState({ ...BLANK_WITNESS });
    const [err, setErr] = useState("");

    const openModal = (w?: Witness) => {
        if (w) setForm({ witness_name: w.witness_name, witness_type: w.witness_type, contact_number: w.contact_number ?? "", address: w.address ?? "", statement_status: w.statement_status, notes: w.notes ?? "" });
        else setForm({ ...BLANK_WITNESS });
        setEditing(w ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.witness_name.trim()) { setErr("Witness name is required."); return; }
        setErr("");
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateWitness.mutate({ witnessId: editing.witness_id, body: form }, { onSuccess, onError });
        else createWitness.mutate(form, { onSuccess, onError });
    };

    const saving = createWitness.isPending || updateWitness.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{witnesses.length} witness{witnesses.length !== 1 ? "es" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Witness</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : witnesses.length === 0 ? (
                <div className={EMPTY_HINT}>No witnesses recorded yet.</div>
            ) : witnesses.map(w => (
                <div key={w.witness_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><strong>{w.witness_name}</strong> <span className={BADGE_GRAY}>{w.witness_type}</span> <span className={BADGE_AMBER}>{w.statement_status}</span></div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(w)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm(`Delete "${w.witness_name}"?`) && deleteWitness.mutate(w.witness_id)}>Delete</button>
                        </div>
                    </div>
                    {w.contact_number && <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>{w.contact_number}</div>}
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Witness" : "Add Witness"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Witness Name *</label><input className={FORM_INPUT} value={form.witness_name} onChange={e => setForm(f => ({ ...f, witness_name: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Type</label><select className={FORM_SELECT} value={form.witness_type} onChange={e => setForm(f => ({ ...f, witness_type: e.target.value }))}>{WITNESS_TYPES_UI.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Contact Number</label><input className={FORM_INPUT} value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Statement Status</label><select className={FORM_SELECT} value={form.statement_status} onChange={e => setForm(f => ({ ...f, statement_status: e.target.value }))}>{STATEMENT_STATUSES_UI.map(s => <option key={s}>{s}</option>)}</select></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Address</label><textarea className={FORM_INPUT} rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Bail & interim relief ───────────────────────────────────────────────────

export function MatterReliefTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: relief = [], isLoading } = useMatterRelief(matterId);
    const createRelief = useCreateRelief(matterId);
    const updateRelief = useUpdateRelief(matterId);
    const deleteRelief = useDeleteRelief(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MatterRelief | null>(null);
    const [form, setForm] = useState({ ...BLANK_RELIEF });
    const [err, setErr] = useState("");

    const openModal = (r?: MatterRelief) => {
        if (r) setForm({ application_date: r.application_date, relief_type: r.relief_type, court: r.court ?? "", judge: r.judge ?? "", status: r.status, conditions: r.conditions ?? "", surety_amount_pkr: r.surety_amount_pkr == null ? "" : String(r.surety_amount_pkr), surety_name: r.surety_name ?? "", notes: r.notes ?? "" });
        else setForm({ ...BLANK_RELIEF });
        setEditing(r ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        setErr("");
        const body = { ...form, surety_amount_pkr: form.surety_amount_pkr === "" ? null : Number(form.surety_amount_pkr) };
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateRelief.mutate({ reliefId: editing.relief_id, body }, { onSuccess, onError });
        else createRelief.mutate(body, { onSuccess, onError });
    };

    const saving = createRelief.isPending || updateRelief.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{relief.length} application{relief.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Application</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : relief.length === 0 ? (
                <div className={EMPTY_HINT}>No bail/interim relief applications recorded yet.</div>
            ) : relief.map(r => (
                <div key={r.relief_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><strong>{r.relief_type}</strong> <span className={BADGE_AMBER}>{r.status}</span> <span className={MUTED}>· {r.application_date}</span></div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(r)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm("Delete this application?") && deleteRelief.mutate(r.relief_id)}>Delete</button>
                        </div>
                    </div>
                    {r.conditions && <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>{r.conditions}</div>}
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Application" : "Add Bail/Relief Application"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Application Date</label><input type="date" className={FORM_INPUT} value={form.application_date} onChange={e => setForm(f => ({ ...f, application_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Relief Type</label><select className={FORM_SELECT} value={form.relief_type} onChange={e => setForm(f => ({ ...f, relief_type: e.target.value }))}>{RELIEF_TYPES_UI.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Status</label><select className={FORM_SELECT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{RELIEF_STATUSES_UI.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Court</label><input className={FORM_INPUT} value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Judge</label><input className={FORM_INPUT} value={form.judge} onChange={e => setForm(f => ({ ...f, judge: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Surety Amount (PKR)</label><input type="number" className={FORM_INPUT} value={form.surety_amount_pkr} onChange={e => setForm(f => ({ ...f, surety_amount_pkr: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Surety Name</label><input className={FORM_INPUT} value={form.surety_name} onChange={e => setForm(f => ({ ...f, surety_name: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Conditions</label><textarea className={FORM_INPUT} rows={2} value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}
