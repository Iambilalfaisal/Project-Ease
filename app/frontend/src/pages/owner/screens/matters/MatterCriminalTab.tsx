// Criminal-matter tabs: FIR / police station record, charge & section
// tracking, challan (charge sheet) tracker, and bail bonds.
import { useState } from "react";
import {
    MUTED, EMPTY_HINT, SETTINGS_CARD, ORDER_ACTIONS, ACTION_BTN, ACTION_BTN_DANGER,
    FORM_GROUP, FORM_LABEL, FORM_INPUT, FORM_SELECT, BADGE_GRAY, BADGE_GOLD,
} from "../../ownerStyles";
import { Badge, Button, Modal } from "../../../../components/ui";
import type { Matter, MatterFir, MatterCharge, MatterChallan, BailBond } from "../../types";
import {
    useFirRecords, useCreateFir, useUpdateFir, useDeleteFir,
    useCharges, useCreateCharge, useUpdateCharge, useDeleteCharge,
    useChallans, useCreateChallan, useUpdateChallan, useDeleteChallan,
    useBailBonds, useCreateBailBond, useUpdateBailBond, useDeleteBailBond,
} from "../../../../hooks/useMatterCriminal";
import { BLANK_FIR_FN, PLEA_OPTIONS_UI, BLANK_CHARGE, CHALLAN_TYPES_UI, CHALLAN_STATUSES_UI, BLANK_CHALLAN, BLANK_BOND } from "./matterConstants";

// ── FIR ──────────────────────────────────────────────────────────────────────

export function MatterFirTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: records = [], isLoading } = useFirRecords(matterId);
    const createFir = useCreateFir(matterId);
    const updateFir = useUpdateFir(matterId);
    const deleteFir = useDeleteFir(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MatterFir | null>(null);
    const [form, setForm] = useState({ ...BLANK_FIR_FN });
    const [err, setErr] = useState("");

    const openModal = (r?: MatterFir) => {
        if (r) { setEditing(r); setForm({ fir_number: r.fir_number, police_station: r.police_station, district: r.district ?? "", io_name: r.io_name ?? "", complainant: r.complainant ?? "", arrest_date: r.arrest_date ?? "", sections_at_fir: r.sections_at_fir ?? "", sections_after_challan: r.sections_after_challan ?? "", fir_date: r.fir_date ?? "", notes: r.notes ?? "" }); }
        else { setEditing(null); setForm({ ...BLANK_FIR_FN }); }
        setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.fir_number.trim() || !form.police_station.trim()) { setErr("FIR number and police station are required."); return; }
        setErr("");
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateFir.mutate({ firId: editing.fir_id, body: form }, { onSuccess, onError });
        else createFir.mutate(form, { onSuccess, onError });
    };

    const saving = createFir.isPending || updateFir.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{records.length} FIR record{records.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add FIR</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : records.length === 0 ? (
                <div className={EMPTY_HINT}>No FIR recorded yet.</div>
            ) : records.map(r => (
                <div key={r.fir_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                            <strong>{r.fir_number}</strong> <span className={MUTED}>· {r.police_station}</span>
                            {r.district && <span className={MUTED}> · {r.district}</span>}
                        </div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(r)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm("Delete this FIR record?") && deleteFir.mutate(r.fir_id)}>Delete</button>
                        </div>
                    </div>
                    {r.sections_at_fir && <div className={MUTED} style={{ marginTop: "0.3rem", fontSize: "0.82rem" }}>Sections: {r.sections_at_fir}{r.sections_after_challan && ` → ${r.sections_after_challan}`}</div>}
                    {r.io_name && <div className={MUTED} style={{ fontSize: "0.82rem" }}>IO: {r.io_name}</div>}
                    {r.notes && <div style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>{r.notes}</div>}
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={520} title={editing ? "Edit FIR" : "Add FIR"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>FIR Number *</label><input className={FORM_INPUT} value={form.fir_number} onChange={e => setForm(f => ({ ...f, fir_number: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Police Station *</label><input className={FORM_INPUT} value={form.police_station} onChange={e => setForm(f => ({ ...f, police_station: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>District</label><input className={FORM_INPUT} value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>FIR Date</label><input type="date" className={FORM_INPUT} value={form.fir_date} onChange={e => setForm(f => ({ ...f, fir_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Investigating Officer</label><input className={FORM_INPUT} value={form.io_name} onChange={e => setForm(f => ({ ...f, io_name: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Arrest Date</label><input type="date" className={FORM_INPUT} value={form.arrest_date} onChange={e => setForm(f => ({ ...f, arrest_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Complainant</label><input className={FORM_INPUT} value={form.complainant} onChange={e => setForm(f => ({ ...f, complainant: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Sections at FIR</label><input className={FORM_INPUT} value={form.sections_at_fir} onChange={e => setForm(f => ({ ...f, sections_at_fir: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Sections after Challan</label><input className={FORM_INPUT} value={form.sections_after_challan} onChange={e => setForm(f => ({ ...f, sections_after_challan: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Charges / sections ──────────────────────────────────────────────────────

export function MatterChargesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: charges = [], isLoading } = useCharges(matterId);
    const createCharge = useCreateCharge(matterId);
    const updateCharge = useUpdateCharge(matterId);
    const deleteCharge = useDeleteCharge(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MatterCharge | null>(null);
    const [form, setForm] = useState({ ...BLANK_CHARGE });
    const [err, setErr] = useState("");

    const openModal = (c?: MatterCharge) => {
        if (c) setForm({ section_no: c.section_no, description: c.description ?? "", plea: c.plea, charge_framed: !!c.charge_framed, charge_framed_date: c.charge_framed_date ?? "", court: c.court ?? "", notes: c.notes ?? "" });
        else setForm({ ...BLANK_CHARGE });
        setEditing(c ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.section_no.trim()) { setErr("Section number is required."); return; }
        setErr("");
        const body = { ...form, charge_framed: form.charge_framed ? 1 : 0 };
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateCharge.mutate({ chargeId: editing.charge_id, body }, { onSuccess, onError });
        else createCharge.mutate(body, { onSuccess, onError });
    };

    const saving = createCharge.isPending || updateCharge.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{charges.length} charge{charges.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Charge</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : charges.length === 0 ? (
                <div className={EMPTY_HINT}>No charges/sections recorded yet.</div>
            ) : charges.map(c => (
                <div key={c.charge_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                            <strong>{c.section_no}</strong>
                            <Badge tone={c.charge_framed ? "green" : "amber"}>{c.charge_framed ? "Framed" : "Not Framed"}</Badge>
                            <span className={MUTED}> · {c.plea}</span>
                        </div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(c)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm("Delete this charge?") && deleteCharge.mutate(c.charge_id)}>Delete</button>
                        </div>
                    </div>
                    {c.description && <div style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>{c.description}</div>}
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Charge" : "Add Charge"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Section No. *</label><input className={FORM_INPUT} value={form.section_no} onChange={e => setForm(f => ({ ...f, section_no: e.target.value }))} placeholder="e.g. 302 PPC" /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Description</label><textarea className={FORM_INPUT} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Plea</label><select className={FORM_SELECT} value={form.plea} onChange={e => setForm(f => ({ ...f, plea: e.target.value }))}>{PLEA_OPTIONS_UI.map(p => <option key={p}>{p}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Court</label><input className={FORM_INPUT} value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" id="chargeFramed" checked={form.charge_framed} onChange={e => setForm(f => ({ ...f, charge_framed: e.target.checked }))} />
                    <label htmlFor="chargeFramed">Charge framed</label>
                    {form.charge_framed && <input type="date" className={FORM_INPUT} style={{ width: "auto" }} value={form.charge_framed_date} onChange={e => setForm(f => ({ ...f, charge_framed_date: e.target.value }))} />}
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Challan / charge sheet ──────────────────────────────────────────────────

export function MatterChallanTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: challans = [], isLoading } = useChallans(matterId);
    const createChallan = useCreateChallan(matterId);
    const updateChallan = useUpdateChallan(matterId);
    const deleteChallan = useDeleteChallan(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MatterChallan | null>(null);
    const [form, setForm] = useState({ ...BLANK_CHALLAN });
    const [err, setErr] = useState("");

    const openModal = (c?: MatterChallan) => {
        if (c) setForm({ challan_date: c.challan_date ?? "", challan_type: c.challan_type, submitted_in_time: !!c.submitted_in_time, witnesses_count: c.witnesses_count, challan_court: c.challan_court ?? "", status: c.status, notes: c.notes ?? "" });
        else setForm({ ...BLANK_CHALLAN });
        setEditing(c ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        setErr("");
        const body = { ...form, submitted_in_time: form.submitted_in_time ? 1 : 0 };
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateChallan.mutate({ challanId: editing.challan_id, body }, { onSuccess, onError });
        else createChallan.mutate(body, { onSuccess, onError });
    };

    const saving = createChallan.isPending || updateChallan.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{challans.length} challan{challans.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Challan</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : challans.length === 0 ? (
                <div className={EMPTY_HINT}>No challan recorded yet.</div>
            ) : challans.map(c => (
                <div key={c.challan_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                            <strong>{c.challan_type}</strong> <span className={BADGE_GRAY}>{c.status}</span>
                            {c.challan_date && <span className={MUTED}> · {c.challan_date}</span>}
                        </div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(c)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm("Delete this challan?") && deleteChallan.mutate(c.challan_id)}>Delete</button>
                        </div>
                    </div>
                    <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>
                        {c.submitted_in_time ? "Submitted in time" : "Late submission"} · {c.witnesses_count} witness{c.witnesses_count !== 1 ? "es" : ""}{c.challan_court && ` · ${c.challan_court}`}
                    </div>
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={480} title={editing ? "Edit Challan" : "Add Challan"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Type</label><select className={FORM_SELECT} value={form.challan_type} onChange={e => setForm(f => ({ ...f, challan_type: e.target.value }))}>{CHALLAN_TYPES_UI.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Status</label><select className={FORM_SELECT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{CHALLAN_STATUSES_UI.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Challan Date</label><input type="date" className={FORM_INPUT} value={form.challan_date} onChange={e => setForm(f => ({ ...f, challan_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Witnesses Count</label><input type="number" min={0} className={FORM_INPUT} value={form.witnesses_count} onChange={e => setForm(f => ({ ...f, witnesses_count: Number(e.target.value) }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Court</label><input className={FORM_INPUT} value={form.challan_court} onChange={e => setForm(f => ({ ...f, challan_court: e.target.value }))} /></div>
                <div className={FORM_GROUP} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" id="submittedInTime" checked={form.submitted_in_time} onChange={e => setForm(f => ({ ...f, submitted_in_time: e.target.checked }))} />
                    <label htmlFor="submittedInTime">Submitted within statutory time</label>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}

// ── Bail bonds ───────────────────────────────────────────────────────────────

export function MatterBailBondsTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: bonds = [], isLoading } = useBailBonds(matterId);
    const createBond = useCreateBailBond(matterId);
    const updateBond = useUpdateBailBond(matterId);
    const deleteBond = useDeleteBailBond(matterId);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<BailBond | null>(null);
    const [form, setForm] = useState({ ...BLANK_BOND });
    const [err, setErr] = useState("");

    const openModal = (b?: BailBond) => {
        if (b) setForm({ accused_name: b.accused_name, bail_type: b.bail_type, bail_amount_pkr: b.bail_amount_pkr, surety_name: b.surety_name ?? "", surety_cnic: b.surety_cnic ?? "", surety_address: b.surety_address ?? "", surety_property: b.surety_property ?? "", property_value: b.property_value ?? 0, court: b.court ?? "", judge: b.judge ?? "", granted_date: b.granted_date ?? "", expiry_date: b.expiry_date ?? "", status: b.status, bail_order_ref: b.bail_order_ref ?? "", notes: b.notes ?? "" });
        else setForm({ ...BLANK_BOND });
        setEditing(b ?? null); setErr(""); setShowModal(true);
    };

    const save = () => {
        if (!form.accused_name.trim()) { setErr("Accused name is required."); return; }
        setErr("");
        const onSuccess = () => setShowModal(false);
        const onError = (e: Error) => setErr(e.message || "Save failed.");
        if (editing) updateBond.mutate({ bondId: editing.bond_id, body: form }, { onSuccess, onError });
        else createBond.mutate(form, { onSuccess, onError });
    };

    const saving = createBond.isPending || updateBond.isPending;

    return (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={MUTED} style={{ fontSize: "0.82rem" }}>{bonds.length} bail bond{bonds.length !== 1 ? "s" : ""}</span>
                <Button size="sm" onClick={() => openModal()}>+ Add Bail Bond</Button>
            </div>
            {isLoading ? <div className={EMPTY_HINT}>Loading…</div> : bonds.length === 0 ? (
                <div className={EMPTY_HINT}>No bail bonds recorded yet.</div>
            ) : bonds.map(b => (
                <div key={b.bond_id} className={SETTINGS_CARD} style={{ marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                            <strong>{b.accused_name}</strong> <span className={BADGE_GOLD}>{b.bail_type}</span>
                            <span className={MUTED}> · PKR {b.bail_amount_pkr.toLocaleString("en-PK")}</span>
                        </div>
                        <div className={ORDER_ACTIONS}>
                            <button className={ACTION_BTN} onClick={() => openModal(b)}>Edit</button>
                            <button className={ACTION_BTN_DANGER} onClick={() => confirm("Delete this bail bond?") && deleteBond.mutate(b.bond_id)}>Delete</button>
                        </div>
                    </div>
                    <div className={MUTED} style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>
                        {b.status}{b.surety_name && ` · Surety: ${b.surety_name}`}{b.court && ` · ${b.court}`}
                    </div>
                </div>
            ))}

            <Modal open={showModal} onClose={() => setShowModal(false)} maxWidth={560} title={editing ? "Edit Bail Bond" : "Add Bail Bond"}
                footer={<><Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Accused Name *</label><input className={FORM_INPUT} value={form.accused_name} onChange={e => setForm(f => ({ ...f, accused_name: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Bail Type</label>
                        <select className={FORM_SELECT} value={form.bail_type} onChange={e => setForm(f => ({ ...f, bail_type: e.target.value }))}>
                            {["Pre-Arrest", "Post-Arrest", "Anticipatory", "Interim", "Regular", "Transit"].map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Bail Amount (PKR)</label><input type="number" className={FORM_INPUT} value={form.bail_amount_pkr} onChange={e => setForm(f => ({ ...f, bail_amount_pkr: Number(e.target.value) }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Status</label>
                        <select className={FORM_SELECT} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                            {["Active", "Cancelled", "Forfeited", "Expired"].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Court</label><input className={FORM_INPUT} value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Judge</label><input className={FORM_INPUT} value={form.judge} onChange={e => setForm(f => ({ ...f, judge: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Granted Date</label><input type="date" className={FORM_INPUT} value={form.granted_date} onChange={e => setForm(f => ({ ...f, granted_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Expiry Date</label><input type="date" className={FORM_INPUT} value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Surety Name</label><input className={FORM_INPUT} value={form.surety_name} onChange={e => setForm(f => ({ ...f, surety_name: e.target.value }))} /></div>
                    <div className={FORM_GROUP}><label className={FORM_LABEL}>Surety CNIC</label><input className={FORM_INPUT} value={form.surety_cnic} onChange={e => setForm(f => ({ ...f, surety_cnic: e.target.value }))} /></div>
                </div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Surety Address</label><textarea className={FORM_INPUT} rows={2} value={form.surety_address} onChange={e => setForm(f => ({ ...f, surety_address: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Order Reference</label><input className={FORM_INPUT} value={form.bail_order_ref} onChange={e => setForm(f => ({ ...f, bail_order_ref: e.target.value }))} /></div>
                <div className={FORM_GROUP}><label className={FORM_LABEL}>Notes</label><textarea className={FORM_INPUT} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </>
    );
}
