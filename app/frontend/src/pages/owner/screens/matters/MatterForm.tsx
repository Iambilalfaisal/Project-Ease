// Create/edit form for a Matter — shared by MattersPanel's "+ New Matter"
// modal and MatterOverviewTab's inline "Edit" mode. Self-contained: pulls its
// own reference data (clients, matter teams, courts, sibling matters for the
// appeal-hierarchy dropdown) and owns the conflict-check flow.
import { useState } from "react";
import { ERROR_BANNER, FORM_GROUP, FORM_LABEL, FORM_INPUT, FORM_SELECT, MUTED, MODAL_ACTIONS } from "../../ownerStyles";
import { Button, Modal } from "../../../../components/ui";
import { useClientOptions, useMatterTeams, useCustomCourts, useAddCourt, useCheckConflicts, useMatters } from "../../../../hooks/useMatters";
import {
    MATTER_TYPES, MATTER_STATUSES, DEFAULT_COURTS, VAKALATNAMA_STATUSES, MATTER_PRIORITIES,
    LIMITATION_TYPES, MATTER_STAGES, computeLimitationDate, limitationDaysRemaining,
} from "./matterConstants";

export interface MatterFormState {
    client_id: string; title: string; matter_type: string; status: string;
    court_name: string; case_number: string; filing_date: string; opposing_party: string;
    team_id: string; notes: string;
    limitation_type: string; cause_of_action_date: string; limitation_date: string;
    vakalatnama_status: string; priority: string;
    physical_file_ref: string; rack_no: string; bundle_no: string;
    parent_matter_id: string; matter_stage: string;
}

export function MatterForm({
    form, setForm, onSave, onCancel, saving, formErr, excludeMatterId,
}: {
    form: MatterFormState;
    setForm: (f: MatterFormState) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
    formErr: string | null;
    /** When editing, exclude the matter itself from the "parent matter" dropdown. */
    excludeMatterId?: string;
}) {
    const { data: clients = [] } = useClientOptions();
    const { data: matterTeams = [] } = useMatterTeams();
    const { data: customCourts = [] } = useCustomCourts();
    const { data: allMatters = [] } = useMatters();
    const addCourt = useAddCourt();
    const checkConflicts = useCheckConflicts();

    const [newCourtName, setNewCourtName] = useState("");
    const [showConflictModal, setShowConflictModal] = useState(false);

    const allCourts = [...DEFAULT_COURTS, ...customCourts.map(c => c.name)];

    const handleAddCourt = () => {
        const name = newCourtName.trim();
        if (!name) return;
        addCourt.mutate(name, { onSuccess: () => setNewCourtName("") });
    };

    const handleCheckConflicts = () => {
        const clientName = clients.find(c => c.client_id === form.client_id)?.name || "";
        const opponent = form.opposing_party || "";
        if (!clientName && !opponent) { alert("Enter a client and/or opposing party first."); return; }
        checkConflicts.mutate(
            { new_client_name: clientName, opponent_name: opponent },
            { onSuccess: () => setShowConflictModal(true) }
        );
    };

    return (
        <>
            {formErr && <div className={ERROR_BANNER} style={{ marginBottom: "0.75rem" }}>⚠ {formErr}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Title *</label>
                    <input className={FORM_INPUT} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Khan vs State — Criminal Appeal 2024" autoFocus />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Client *</label>
                    <select className={FORM_SELECT} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                        <option value="">Select client…</option>
                        {clients.map(c => <option key={c.client_id} value={c.client_id}>{c.name}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Matter Type *</label>
                    <select className={FORM_SELECT} value={form.matter_type} onChange={e => setForm({ ...form, matter_type: e.target.value })}>
                        {MATTER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Status</label>
                    <select className={FORM_SELECT} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        {MATTER_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Assigned Team</label>
                    <select className={FORM_SELECT} value={form.team_id} onChange={e => setForm({ ...form, team_id: e.target.value })}>
                        <option value="">No team</option>
                        {matterTeams.map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Court</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <select className={FORM_SELECT} value={form.court_name} onChange={e => setForm({ ...form, court_name: e.target.value })}>
                            <option value="">Select court…</option>
                            {allCourts.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                        <input className={FORM_INPUT} placeholder="Add custom court…" value={newCourtName}
                            onChange={e => setNewCourtName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAddCourt()}
                            style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }} />
                        <Button variant="ghost" onClick={handleAddCourt} disabled={addCourt.isPending || !newCourtName.trim()}>
                            {addCourt.isPending ? "…" : "+ Add"}
                        </Button>
                    </div>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Case Number</label>
                    <input className={FORM_INPUT} value={form.case_number} onChange={e => setForm({ ...form, case_number: e.target.value })} placeholder="e.g. 2024/LHC/4512" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Filing Date</label>
                    <input className={FORM_INPUT} type="date" value={form.filing_date} onChange={e => setForm({ ...form, filing_date: e.target.value })} />
                </div>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Opposing Party</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input className={FORM_INPUT} value={form.opposing_party} onChange={e => setForm({ ...form, opposing_party: e.target.value })} placeholder="Name of opposing counsel or party" style={{ flex: 1 }} />
                        <Button type="button" variant="ghost" style={{ borderColor: "#dc2626", color: "#dc2626" }}
                            onClick={handleCheckConflicts} disabled={checkConflicts.isPending}>
                            {checkConflicts.isPending ? "Checking…" : "⚖ Check Conflicts"}
                        </Button>
                    </div>
                </div>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Notes</label>
                    <input className={FORM_INPUT} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes…" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Vakalatnama Status</label>
                    <select className={FORM_SELECT} value={form.vakalatnama_status} onChange={e => setForm({ ...form, vakalatnama_status: e.target.value })}>
                        {VAKALATNAMA_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Priority</label>
                    <select className={FORM_SELECT} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                        {MATTER_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
                {/* Physical File */}
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <label className={FORM_LABEL} style={{ fontWeight: 700 }}>📁 Physical File Location</label>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>File Ref No.</label>
                    <input className={FORM_INPUT} value={form.physical_file_ref} onChange={e => setForm({ ...form, physical_file_ref: e.target.value })} placeholder="e.g. PF-2024-042" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Rack No.</label>
                    <input className={FORM_INPUT} value={form.rack_no} onChange={e => setForm({ ...form, rack_no: e.target.value })} placeholder="e.g. R3" />
                </div>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Bundle / Folder No.</label>
                    <input className={FORM_INPUT} value={form.bundle_no} onChange={e => setForm({ ...form, bundle_no: e.target.value })} placeholder="e.g. B12" />
                </div>
                {/* Appeal Hierarchy */}
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <label className={FORM_LABEL} style={{ fontWeight: 700 }}>⚖ Appeal Hierarchy</label>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Matter Stage</label>
                    <select className={FORM_SELECT} value={form.matter_stage} onChange={e => setForm({ ...form, matter_stage: e.target.value })}>
                        <option value="">— Not set —</option>
                        {MATTER_STAGES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Parent Matter (linked appeal from)</label>
                    <select className={FORM_SELECT} value={form.parent_matter_id} onChange={e => setForm({ ...form, parent_matter_id: e.target.value })}>
                        <option value="">— None / Original matter —</option>
                        {allMatters.filter(m => m.matter_id !== excludeMatterId).map(m => <option key={m.matter_id} value={m.matter_id}>{m.title} [{m.matter_type}]</option>)}
                    </select>
                </div>

                {/* Limitation fields */}
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <label className={FORM_LABEL} style={{ color: "var(--gold)", fontWeight: 700 }}>⚠ Limitation (Limitation Act 1908)</label>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Suit / Appeal Type</label>
                    <select className={FORM_SELECT} value={form.limitation_type} onChange={e => {
                        const lt = e.target.value;
                        const newLimDate = lt && form.cause_of_action_date ? computeLimitationDate(lt, form.cause_of_action_date) : "";
                        setForm({ ...form, limitation_type: lt, limitation_date: newLimDate });
                    }}>
                        <option value="">Not set</option>
                        {LIMITATION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Cause of Action Date</label>
                    <input type="date" className={FORM_INPUT} value={form.cause_of_action_date} onChange={e => {
                        const coa = e.target.value;
                        const newLimDate = form.limitation_type && coa ? computeLimitationDate(form.limitation_type, coa) : form.limitation_date;
                        setForm({ ...form, cause_of_action_date: coa, limitation_date: newLimDate });
                    }} />
                </div>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Limitation Deadline <span className={MUTED} style={{ fontWeight: 400 }}>(auto-computed or override)</span></label>
                    <input type="date" className={FORM_INPUT} value={form.limitation_date} onChange={e => setForm({ ...form, limitation_date: e.target.value })}
                        style={form.limitation_date && limitationDaysRemaining(form.limitation_date) <= 30 ? { borderColor: "#c94040" } : {}} />
                    {form.limitation_date && (() => {
                        const d = limitationDaysRemaining(form.limitation_date);
                        return <div style={{ fontSize: "0.78rem", marginTop: "0.3rem", color: d < 0 ? "#c94040" : d <= 30 ? "#c97c2a" : "var(--text-3)" }}>
                            {d < 0 ? `⚠ Limitation expired ${Math.abs(d)} days ago` : d === 0 ? "⚠ Limitation expires TODAY" : `${d} days remaining`}
                        </div>;
                    })()}
                </div>
            </div>
            <div className={MODAL_ACTIONS}>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save Matter"}</Button>
            </div>

            {/* ── Conflict of Interest Results Modal ── */}
            <Modal open={showConflictModal} onClose={() => setShowConflictModal(false)} maxWidth={540}
                title={(checkConflicts.data?.length ?? 0) > 0 ? `⚠ ${checkConflicts.data!.length} Potential Conflict${checkConflicts.data!.length > 1 ? "s" : ""} Found` : "✓ No Conflicts Found"}
                footer={<Button onClick={() => setShowConflictModal(false)}>Close</Button>}>
                {(checkConflicts.data?.length ?? 0) === 0 ? (
                    <p style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>No existing matters involve this client or opposing party. You may proceed.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: 360, overflowY: "auto" }}>
                        {checkConflicts.data!.map((c, i) => (
                            <div key={i} style={{ background: "var(--bg-1)", border: "1px solid #dc2626", borderRadius: "var(--radius)", padding: "0.75rem" }}>
                                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.matter_title}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: "0.2rem" }}>
                                    Client: {c.client_name} · Opponent: {c.opposing_party || "—"} · Status: {c.status}
                                </div>
                                <ul style={{ margin: "0.4rem 0 0 1rem", padding: 0, fontSize: "0.8rem", color: "#dc2626" }}>
                                    {c.reasons.map((r, j) => <li key={j}>{r}</li>)}
                                </ul>
                            </div>
                        ))}
                        <p style={{ fontSize: "0.82rem", color: "var(--text-3)", margin: 0 }}>Review these conflicts carefully before proceeding. You may still create the matter if you determine there is no actual conflict.</p>
                    </div>
                )}
            </Modal>
        </>
    );
}
