// Matters list view: search/filter, limitation & today's-cause-list alert
// banners, the matters table, and the "+ New Matter" create modal. Opening a
// row hands off to MatterDetail by matter_id (no full-object threading).
import { useState } from "react";
import {
    PANEL_CONTENT, PANEL_TOOLBAR, RESULT_COUNT, FORM_SELECT, MUTED, LINK_BTN,
    LIM_ALERT_BANNER, LIM_ALERT_LIST, LIM_ALERT_ITEM, LIM_ALERT_ITEM_CRITICAL,
    LIM_BADGE_CRITICAL, LIM_BADGE_WARN, PRIORITY_BADGE, BADGE_GOLD, ACTION_BTN, ACTION_BTN_DANGER,
} from "../../ownerStyles";
import { Badge, Button, Modal, Table } from "../../../../components/ui";
import { useMatters, useCreateMatter, useDeleteMatter, useLimitationAlerts, useCauseListTodayMatches, useClientOptions } from "../../../../hooks/useMatters";
import { MATTER_STATUSES, MATTER_TYPES, MATTER_PRIORITIES, STATUS_BADGE, badgeClassToTone, limitationDaysRemaining, BLANK_MATTER } from "./matterConstants";
import { MatterForm, MatterFormState } from "./MatterForm";
import { MatterDetail } from "./MatterDetail";

export const MattersPanel = () => {
    const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
    const [filterStatus,   setFilterStatus]   = useState("all");
    const [filterType,     setFilterType]     = useState("all");
    const [filterPriority, setFilterPriority] = useState("all");
    const [showModal, setShowModal] = useState(false);
    const [form,      setForm]      = useState<MatterFormState>({ ...BLANK_MATTER });
    const [formErr,   setFormErr]   = useState<string | null>(null);
    const [removing,  setRemoving]  = useState<string | null>(null);

    const { data: matters = [], isLoading } = useMatters();
    const { data: clients = [] } = useClientOptions();
    const { data: limAlerts = [] } = useLimitationAlerts();
    const { data: causeListAlerts = [] } = useCauseListTodayMatches();
    const createMatter = useCreateMatter();
    const deleteMatter = useDeleteMatter();

    if (selectedMatterId) {
        return <MatterDetail matterId={selectedMatterId} onBack={() => setSelectedMatterId(null)} />;
    }

    const filtered = matters.filter(m =>
        (filterStatus   === "all" || m.status        === filterStatus)   &&
        (filterType     === "all" || m.matter_type   === filterType)     &&
        (filterPriority === "all" || (m.priority ?? "Normal") === filterPriority)
    );

    const saveMatter = () => {
        if (!form.client_id || !form.title.trim() || !form.matter_type) {
            setFormErr("Client, title, and matter type are required."); return;
        }
        setFormErr(null);
        const body: any = { ...form };
        if (!body.team_id) body.team_id = null;
        createMatter.mutate(body, {
            onSuccess: () => setShowModal(false),
            onError: (err: Error) => setFormErr(err.message || "Failed."),
        });
    };

    const removeMatter = (m: { matter_id: string; title: string }) => {
        if (!confirm(`Delete matter "${m.title}"?`)) return;
        setRemoving(m.matter_id);
        deleteMatter.mutate(m.matter_id, { onSettled: () => setRemoving(null) });
    };

    return (
        <div className={PANEL_CONTENT}>
            <div className={PANEL_TOOLBAR}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={RESULT_COUNT}>{filtered.length} matter{filtered.length !== 1 ? "s" : ""}</span>
                    <select className={FORM_SELECT} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All statuses</option>
                        {MATTER_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className={FORM_SELECT} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All types</option>
                        {MATTER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select className={FORM_SELECT} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="all">All priorities</option>
                        {MATTER_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
                {clients.length === 0 ? (
                    <span className={MUTED} style={{ fontSize: "0.8rem" }}>Add a client first</span>
                ) : (
                    <Button onClick={() => { setForm({ ...BLANK_MATTER }); setFormErr(null); setShowModal(true); }}>
                        + New Matter
                    </Button>
                )}
            </div>

            {/* Today's cause list alert banner */}
            {causeListAlerts.length > 0 && (
                <div className={LIM_ALERT_BANNER} style={{ borderColor: "var(--gold)", background: "rgba(200,160,40,0.06)" }}>
                    <strong>📋 Today's Cause List — {causeListAlerts.length} matter{causeListAlerts.length !== 1 ? "s" : ""} listed in court</strong>
                    <div className={LIM_ALERT_LIST}>
                        {causeListAlerts.map(a => (
                            <div key={a.matter_id} className={LIM_ALERT_ITEM}>
                                <button className={LINK_BTN} onClick={() => setSelectedMatterId(a.matter_id)}>
                                    {a.matter_title}
                                </button>
                                {a.case_number && <span className={MUTED}> · {a.case_number}</span>}
                                {a.item_no     && <span className={BADGE_GOLD} style={{ fontSize: "0.68rem" }}>Item {a.item_no}</span>}
                                {a.court_name  && <span className={MUTED} style={{ fontSize: "0.78rem" }}> · {a.court_name}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Limitation alerts banner */}
            {limAlerts.length > 0 && (
                <div className={LIM_ALERT_BANNER}>
                    <strong>⚠ Limitation Approaching</strong>
                    <div className={LIM_ALERT_LIST}>
                        {limAlerts.map(a => {
                            const critical = a.days_remaining <= 30;
                            return (
                                <div key={a.matter_id} className={critical ? LIM_ALERT_ITEM_CRITICAL : LIM_ALERT_ITEM}>
                                    <button className={LINK_BTN} onClick={() => setSelectedMatterId(a.matter_id)}>
                                        {a.title}
                                    </button>
                                    <span className={MUTED}> · {a.client_name}</span>
                                    <span className={critical ? LIM_BADGE_CRITICAL : LIM_BADGE_WARN}>
                                        {a.days_remaining < 0 ? `EXPIRED ${Math.abs(a.days_remaining)}d ago` : a.days_remaining === 0 ? "EXPIRES TODAY" : `${a.days_remaining}d left`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <Table loading={isLoading} empty={filtered.length === 0}
                emptyMessage={matters.length === 0 ? "No matters yet. Create a client first, then open a matter." : "No matters match the selected filters."}>
                <thead><tr>
                    <th>Title</th><th>Client</th><th>Type</th><th>Status</th><th>Priority</th><th>Vakalatnama</th><th>Adj.</th><th>Court</th><th>Case #</th><th>Team</th><th>Docs</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    {filtered.map(m => {
                        const limDays = m.limitation_date ? limitationDaysRemaining(m.limitation_date) : null;
                        return (
                        <tr key={m.matter_id}>
                            <td>
                                <button className={LINK_BTN} onClick={() => setSelectedMatterId(m.matter_id)}>{m.title}</button>
                                {limDays !== null && limDays <= 60 && (
                                    <span className={limDays <= 30 ? LIM_BADGE_CRITICAL : LIM_BADGE_WARN} style={{ marginLeft: "0.4rem" }}>
                                        {limDays < 0 ? "LIM EXPIRED" : limDays === 0 ? "LIM TODAY" : `LIM ${limDays}d`}
                                    </span>
                                )}
                            </td>
                            <td className={MUTED}>{m.client_name}</td>
                            <td className={MUTED}>{m.matter_type}</td>
                            <td><Badge tone={badgeClassToTone(STATUS_BADGE[m.status])}>{m.status}</Badge></td>
                            <td>
                                <span className={PRIORITY_BADGE} data-priority={m.priority ?? "Normal"}>
                                    {m.priority ?? "Normal"}
                                </span>
                            </td>
                            <td>
                                <Badge tone={m.vakalatnama_status === "Filed" ? "green" : m.vakalatnama_status === "Not Required" ? "gray" : "amber"}>
                                    {m.vakalatnama_status ?? "Pending"}
                                </Badge>
                            </td>
                            <td>
                                {(m.adjournment_count ?? 0) > 0 ? (
                                    <Badge tone={(m.adjournment_count ?? 0) >= 10 ? "red" : (m.adjournment_count ?? 0) >= 5 ? "amber" : "gray"}>
                                        {m.adjournment_count}
                                    </Badge>
                                ) : <span className={MUTED}>0</span>}
                            </td>
                            <td className={MUTED}>{m.court_name ?? "—"}</td>
                            <td className={MUTED}>{m.case_number ?? "—"}</td>
                            <td className={MUTED}>{m.team_name ?? "—"}</td>
                            <td className={MUTED}>{m.doc_count ?? 0}</td>
                            <td style={{ display: "flex", gap: "0.4rem" }}>
                                <button className={ACTION_BTN} onClick={() => setSelectedMatterId(m.matter_id)}>View</button>
                                <button className={ACTION_BTN_DANGER} disabled={removing === m.matter_id} onClick={() => removeMatter(m)}>
                                    {removing === m.matter_id ? "…" : "Delete"}
                                </button>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </Table>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="New Matter" maxWidth={560}>
                <MatterForm form={form} setForm={setForm} onSave={saveMatter} onCancel={() => setShowModal(false)} saving={createMatter.isPending} formErr={formErr} />
            </Modal>
        </div>
    );
};
