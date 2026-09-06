import { useState } from "react";
import { PANEL_CONTENT, MUTED, FORM_GROUP, FORM_LABEL, FORM_INPUT } from "../ownerStyles";
import { Button, Modal, EmptyState } from "../../../components/ui";
import {
    useOpposingCounsel, useJudgeNotes, useJudgeStats,
    useSaveCounsel, useSaveJudge, useDeleteCounsel, useDeleteJudge,
} from "../../../hooks/useIntelligence";
import type { Counsel, Judge } from "../../../services/intelligence";

// Firm's own track record with a judge — computed from this org's own
// hearings/bail bonds, never external/published data.
const JudgeStats = ({ judgeId }: { judgeId: string }) => {
    const { data: stats } = useJudgeStats(judgeId);

    if (!stats) return <div className={MUTED} style={{ fontSize: "0.78rem" }}>Loading track record…</div>;

    if (stats.hearings_count === 0 && stats.bail_bonds_count === 0) {
        return (
            <div className={MUTED} style={{ fontSize: "0.78rem", fontStyle: "italic" }}>
                No hearing history logged with this judge yet — this builds up automatically as you record hearing outcomes.
            </div>
        );
    }

    return (
        <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Your Firm's History With This Judge
            </div>
            <div style={{ fontSize: "0.82rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <span>{stats.hearings_count} hearing{stats.hearings_count === 1 ? "" : "s"} logged</span>
                {stats.adjournment_rate !== null && <span>{stats.adjournment_rate}% adjourned</span>}
                {stats.bail_bonds_count > 0 && <span>{stats.bail_bonds_count} bail bond{stats.bail_bonds_count === 1 ? "" : "s"}</span>}
            </div>
            {Object.keys(stats.outcome_breakdown).length > 0 && (
                <div style={{ fontSize: "0.76rem", color: "var(--text-2)", marginTop: "0.3rem" }}>
                    {Object.entries(stats.outcome_breakdown).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </div>
            )}
        </div>
    );
};

export const IntelligencePanel = () => {
    const [tab, setTab] = useState<"counsel" | "judges">("counsel");
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<Counsel | Judge | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [err, setErr] = useState("");
    const [expanded, setExpanded] = useState<string | null>(null);

    const { data: counselList = [], isLoading: counselLoading } = useOpposingCounsel();
    const { data: judgeList = [], isLoading: judgesLoading } = useJudgeNotes();
    const loading = tab === "counsel" ? counselLoading : judgesLoading;

    const saveCounselMutation = useSaveCounsel();
    const saveJudgeMutation = useSaveJudge();
    const deleteCounselMutation = useDeleteCounsel();
    const deleteJudgeMutation = useDeleteJudge();
    const saving = saveCounselMutation.isPending || saveJudgeMutation.isPending;

    const openModal = (item?: Counsel | Judge) => {
        setEditItem(item || null);
        if (tab === "counsel") {
            const c = item as Counsel | undefined;
            setForm({ name: c?.name || "", bar_no: c?.bar_no || "", firm_name: c?.firm_name || "", phone: c?.phone || "", email: c?.email || "", court_preference: c?.court_preference || "", known_tactics: c?.known_tactics || "", private_notes: c?.private_notes || "" });
        } else {
            const j = item as Judge | undefined;
            setForm({ name: j?.name || "", court_name: j?.court_name || "", designation: j?.designation || "", known_for: j?.known_for || "", private_notes: j?.private_notes || "" });
        }
        setErr(""); setShowModal(true);
    };

    const save = async () => {
        if (!form.name?.trim()) { setErr("Name is required"); return; }
        setErr("");
        const isCounsel = tab === "counsel";
        const idKey = isCounsel ? (editItem as Counsel | null)?.counsel_id : (editItem as Judge | null)?.judge_id;
        try {
            if (isCounsel) await saveCounselMutation.mutateAsync({ id: idKey, form });
            else await saveJudgeMutation.mutateAsync({ id: idKey, form });
            setShowModal(false);
        } catch (e) {
            setErr(e instanceof Error ? e.message : "Save failed");
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm("Delete this record?")) return;
        if (tab === "counsel") await deleteCounselMutation.mutateAsync(id);
        else await deleteJudgeMutation.mutateAsync(id);
    };

    return (
        <div className={PANEL_CONTENT}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
                <Button size="sm" variant={tab === "counsel" ? "primary" : "ghost"} onClick={() => setTab("counsel")}>
                    ⚖ Opposing Counsel ({counselList.length})
                </Button>
                <Button size="sm" variant={tab === "judges" ? "primary" : "ghost"} onClick={() => setTab("judges")}>
                    🏛 Judges ({judgeList.length})
                </Button>
                <Button size="sm" style={{ marginLeft: "auto" }} onClick={() => openModal()}>
                    + Add {tab === "counsel" ? "Counsel" : "Judge"}
                </Button>
            </div>
            {loading ? (
                <div className={MUTED} style={{ textAlign: "center", padding: "2rem" }}>Loading…</div>
            ) : tab === "counsel" ? (
                counselList.length === 0 ? (
                    <EmptyState message="No opposing counsel records yet. Build your private intelligence file on lawyers you frequently face — their tactics, preferred courts, and contact info." />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {counselList.map(c => (
                            <div key={c.counsel_id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <strong>{c.name}</strong>
                                        {c.bar_no && <span className={MUTED} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>Bar: {c.bar_no}</span>}
                                        {c.firm_name && <span className={MUTED} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>{c.firm_name}</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === c.counsel_id ? null : c.counsel_id)}>
                                            {expanded === c.counsel_id ? "Less" : "Notes"}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openModal(c)}>Edit</Button>
                                        <Button variant="danger" size="sm" onClick={() => deleteItem(c.counsel_id)}>Del</Button>
                                    </div>
                                </div>
                                {(c.phone || c.email || c.court_preference) && (
                                    <div className={MUTED} style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                        {c.phone && `📞 ${c.phone}`}{c.phone && c.email && " · "}{c.email && `✉ ${c.email}`}
                                        {c.court_preference && ` · Prefers: ${c.court_preference}`}
                                    </div>
                                )}
                                {expanded === c.counsel_id && (
                                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                                        {c.known_tactics && <div style={{ fontSize: "0.82rem", marginBottom: "0.25rem" }}><strong>Known Tactics:</strong> {c.known_tactics}</div>}
                                        {c.private_notes && <div style={{ fontSize: "0.82rem", color: "var(--text-2)", fontStyle: "italic" }}>{c.private_notes}</div>}
                                        {!c.known_tactics && !c.private_notes && <div className={MUTED} style={{ fontSize: "0.8rem" }}>No detailed notes yet.</div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : (
                judgeList.length === 0 ? (
                    <EmptyState message="No judge records yet. Keep private notes on judges you appear before — their known inclinations, preferences, and important observations." />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {judgeList.map(j => (
                            <div key={j.judge_id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem 1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <strong>{j.name}</strong>
                                        {j.designation && <span className={MUTED} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>{j.designation}</span>}
                                        {j.court_name && <span className={MUTED} style={{ marginLeft: "0.5rem", fontSize: "0.78rem" }}>@ {j.court_name}</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === j.judge_id ? null : j.judge_id)}>
                                            {expanded === j.judge_id ? "Less" : "Notes"}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openModal(j)}>Edit</Button>
                                        <Button variant="danger" size="sm" onClick={() => deleteItem(j.judge_id)}>Del</Button>
                                    </div>
                                </div>
                                {expanded === j.judge_id && (
                                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                                        {j.known_for && <div style={{ fontSize: "0.82rem", marginBottom: "0.25rem" }}><strong>Known For:</strong> {j.known_for}</div>}
                                        {j.private_notes && <div style={{ fontSize: "0.82rem", color: "var(--text-2)", fontStyle: "italic" }}>{j.private_notes}</div>}
                                        {!j.known_for && !j.private_notes && <div className={MUTED} style={{ fontSize: "0.8rem" }}>No detailed notes yet.</div>}
                                        <JudgeStats judgeId={j.judge_id} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={`${editItem ? "Edit" : "Add"} ${tab === "counsel" ? "Opposing Counsel" : "Judge"}`}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button onClick={save} loading={saving}>Save</Button>
                </>}
            >
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Full Name *</label>
                            <input className={FORM_INPUT} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ch. Hamid Iqbal" />
                        </div>
                        {tab === "counsel" ? (<>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Bar Registration No.</label>
                                    <input className={FORM_INPUT} value={form.bar_no || ""} onChange={e => setForm(f => ({ ...f, bar_no: e.target.value }))} />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Firm Name</label>
                                    <input className={FORM_INPUT} value={form.firm_name || ""} onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Phone</label>
                                    <input className={FORM_INPUT} value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Email</label>
                                    <input className={FORM_INPUT} value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                                </div>
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Preferred Court</label>
                                <input className={FORM_INPUT} value={form.court_preference || ""} onChange={e => setForm(f => ({ ...f, court_preference: e.target.value }))} placeholder="e.g. LHC Banking Court" />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Known Tactics / Style</label>
                                <textarea className={FORM_INPUT} rows={2} value={form.known_tactics || ""} onChange={e => setForm(f => ({ ...f, known_tactics: e.target.value }))} placeholder="e.g. Often requests adjournments, strong on procedure…" />
                            </div>
                        </>) : (<>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Court</label>
                                    <input className={FORM_INPUT} value={form.court_name || ""} onChange={e => setForm(f => ({ ...f, court_name: e.target.value }))} placeholder="e.g. LHC Civil" />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Designation</label>
                                    <input className={FORM_INPUT} value={form.designation || ""} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Senior Civil Judge" />
                                </div>
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Known For</label>
                                <textarea className={FORM_INPUT} rows={2} value={form.known_for || ""} onChange={e => setForm(f => ({ ...f, known_for: e.target.value }))} placeholder="e.g. Strict on time limits, favours written submissions…" />
                            </div>
                        </>)}
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Private Notes (not shared with client)</label>
                            <textarea className={FORM_INPUT} rows={3} value={form.private_notes || ""} onChange={e => setForm(f => ({ ...f, private_notes: e.target.value }))} placeholder="Confidential observations…" />
                        </div>
                        {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </div>
    );
};
