import { useState } from "react";
import {
    PANEL_CONTENT, CAL_LAYOUT, CAL_MAIN, CAL_MONTH_NAV, CAL_NAV_BTN, CAL_MONTH_LABEL,
    CAL_GRID, CAL_DOW_CELL, CAL_EMPTY_CELL, CAL_DAY_CELL, CAL_SELECTED, CAL_DAY_NUM, CAL_DAY_NUM_TODAY,
    CAL_DOTS, CAL_DOT_HEARING, CAL_DOT_DEADLINE, CAL_DOT_MORE, CAL_LEGEND,
    CAL_SIDEBAR, CAL_SIDEBAR_HEADER, CAL_SIDEBAR_TITLE, CAL_EVENT_LIST, EMPTY_HINT,
    CAL_EVENT_CARD, CAL_EVENT_HEARING, CAL_EVENT_DEADLINE, CAL_EVENT_COMPLETED, CAL_EVENT_TOP,
    CAL_EVENT_TITLE, CAL_EVENT_ACTIONS, CAL_CHECK_BTN, CAL_EDIT_BTN, CAL_DEL_BTN, CAL_EVENT_META, CAL_WA_BADGE,
    FORM_GROUP, FORM_LABEL, FORM_INPUT, FORM_SELECT, MUTED, LIM_ALERT_BANNER,
} from "../ownerStyles";
import { Modal, Button } from "../../../components/ui";
import {
    useCalendarData, useSaveHearing, useSaveDeadline, useDeleteHearing, useDeleteDeadline,
    useToggleDeadlineComplete, useHolidayPreview, useSendHolidayNotify,
} from "../../../hooks/useCalendar";
import type { CalEvent, Hearing, Deadline, HearingFormBody, DeadlineFormBody } from "../../../services/calendar";

const DEADLINE_TYPES = ["Filing", "Response", "Appeal", "Service", "Payment", "Other"] as const;

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DOW    = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function isoDate(y: number, m: number, d: number): string {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function daysInMonth(y: number, m: number): number {
    return new Date(y, m + 1, 0).getDate();
}

function firstDow(y: number, m: number): number {
    return new Date(y, m, 1).getDay();
}

export const CalendarPanel = () => {
    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selected,  setSelected]  = useState<string | null>(null);  // YYYY-MM-DD

    // Modal state — shared for add/edit
    type ModalMode = "add-hearing" | "add-deadline" | "edit-hearing" | "edit-deadline" | null;
    const [modal,     setModal]     = useState<ModalMode>(null);
    const [editTarget, setEditTarget] = useState<Hearing | Deadline | null>(null);

    // Form fields
    const [fTitle,     setFTitle]     = useState("");
    const [fDate,      setFDate]      = useState("");
    const [fTime,      setFTime]      = useState("");
    const [fCourt,     setFCourt]     = useState("");
    const [fJudge,     setFJudge]     = useState("");
    const [fDLType,    setFDLType]    = useState<string>("Filing");
    const [fMatter,    setFMatter]    = useState("");
    const [fNotes,     setFNotes]     = useState("");
    const [fWA,        setFWA]        = useState(false);
    const [fOutcome,   setFOutcome]   = useState("");          // Task #163
    const [fAdjReason, setFAdjReason] = useState("");          // Task #163
    const [fNextBy,    setFNextBy]    = useState("");          // Task #164
    const [fAssignedTo, setFAssignedTo] = useState("");        // Associate dispatch
    const [fErr,       setFErr]       = useState("");

    // Bulk WhatsApp — court holiday notice
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [holidayFrom, setHolidayFrom] = useState("");
    const [holidayTo,   setHolidayTo]   = useState("");
    const [holidayMsg,  setHolidayMsg]  = useState("");
    const [holidayErr,  setHolidayErr]  = useState("");

    const fromDate = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-01`;
    const toDate   = isoDate(viewYear, viewMonth, daysInMonth(viewYear, viewMonth));

    const { data: calendarData, isLoading: loading } = useCalendarData(fromDate, toDate);
    const hearings     = calendarData?.hearings ?? [];
    const deadlines    = calendarData?.deadlines ?? [];
    const matters      = calendarData?.matters ?? [];
    const teamMembers  = calendarData?.teamMembers ?? [];

    const saveHearingMutation  = useSaveHearing();
    const saveDeadlineMutation = useSaveDeadline();
    const deleteHearingMutation  = useDeleteHearing();
    const deleteDeadlineMutation = useDeleteDeadline();
    const toggleCompleteMutation = useToggleDeadlineComplete();
    const holidayPreviewMutation = useHolidayPreview();
    const sendHolidayMutation    = useSendHolidayNotify();

    const fSaving = saveHearingMutation.isPending || saveDeadlineMutation.isPending;
    const holidayLoading = holidayPreviewMutation.isPending;
    const holidaySending = sendHolidayMutation.isPending;
    const holidayPreview = holidayPreviewMutation.data?.clients ?? null;
    const holidayResult  = sendHolidayMutation.data ?? null;

    // Map date → events
    const eventsByDate: Record<string, CalEvent[]> = {};
    hearings.forEach(h => {
        const k = h.hearing_date;
        eventsByDate[k] = [...(eventsByDate[k] ?? []), { kind: "hearing", ...h }];
    });
    deadlines.forEach(d => {
        const k = d.due_date;
        eventsByDate[k] = [...(eventsByDate[k] ?? []), { kind: "deadline", ...d }];
    });

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
        setSelected(null);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
        setSelected(null);
    };

    const openAdd = (kind: "hearing" | "deadline", date?: string) => {
        setFTitle(""); setFDate(date ?? ""); setFTime(""); setFCourt(""); setFJudge("");
        setFDLType("Filing"); setFMatter(""); setFNotes(""); setFWA(false);
        setFOutcome(""); setFAdjReason(""); setFNextBy(""); setFAssignedTo("");
        setFErr(""); setEditTarget(null);
        setModal(kind === "hearing" ? "add-hearing" : "add-deadline");
    };

    const openEdit = (ev: CalEvent) => {
        setEditTarget(ev);
        setFErr("");
        if (ev.kind === "hearing") {
            setFTitle(ev.title); setFDate(ev.hearing_date); setFTime(ev.hearing_time ?? "");
            setFCourt(ev.court_name ?? ""); setFJudge(ev.judge_name ?? "");
            setFMatter(ev.matter_id ?? ""); setFNotes(ev.notes ?? "");
            setFWA(!!ev.wa_reminder);
            setFOutcome(ev.hearing_outcome ?? ""); setFAdjReason(ev.adj_reason ?? ""); setFNextBy(ev.next_date_fixed_by ?? "");
            setFAssignedTo(ev.assigned_to ?? "");
            setModal("edit-hearing");
        } else {
            setFTitle(ev.title); setFDate(ev.due_date); setFDLType(ev.deadline_type);
            setFMatter(ev.matter_id ?? ""); setFNotes(ev.notes ?? "");
            setFWA(!!ev.wa_reminder); setModal("edit-deadline");
        }
    };

    const closeModal = () => { setModal(null); setEditTarget(null); };

    const openHolidayModal = () => {
        setHolidayFrom(todayStr); setHolidayTo(todayStr); setHolidayMsg("");
        holidayPreviewMutation.reset(); sendHolidayMutation.reset(); setHolidayErr("");
        setShowHolidayModal(true);
    };

    const loadHolidayPreview = () => {
        if (!holidayFrom) return;
        setHolidayErr(""); sendHolidayMutation.reset();
        holidayPreviewMutation.mutate({ fromDate: holidayFrom, toDate: holidayTo || holidayFrom }, {
            onError: (error: Error) => setHolidayErr(error.message || "Could not load preview."),
        });
    };

    const sendHolidayNotify = () => {
        setHolidayErr("");
        sendHolidayMutation.mutate({ fromDate: holidayFrom, toDate: holidayTo || holidayFrom, message: holidayMsg || undefined }, {
            onError: (error: Error) => setHolidayErr(error.message || "Send failed."),
        });
    };

    const saveHearing = () => {
        if (!fTitle.trim() || !fDate) { setFErr("Title and date are required."); return; }
        setFErr("");
        const body: HearingFormBody = {
            title: fTitle.trim(), hearing_date: fDate,
            hearing_time: fTime || undefined, court_name: fCourt || undefined,
            judge_name: fJudge || undefined, matter_id: fMatter || undefined,
            notes: fNotes || undefined, wa_reminder: fWA,
            hearing_outcome: fOutcome || undefined,
            adj_reason: fAdjReason || undefined,
            next_date_fixed_by: fNextBy || undefined,
            assigned_to: fAssignedTo || undefined,
        };
        const id = modal === "edit-hearing" && editTarget ? (editTarget as Hearing).hearing_id : undefined;
        saveHearingMutation.mutate({ id, body }, {
            onSuccess: () => closeModal(),
            onError: (error: Error) => setFErr(error.message || "Save failed."),
        });
    };

    const saveDeadline = () => {
        if (!fTitle.trim() || !fDate) { setFErr("Title and date are required."); return; }
        setFErr("");
        const body: DeadlineFormBody = {
            title: fTitle.trim(), due_date: fDate, deadline_type: fDLType,
            matter_id: fMatter || undefined, notes: fNotes || undefined, wa_reminder: fWA,
        };
        const id = modal === "edit-deadline" && editTarget ? (editTarget as Deadline).deadline_id : undefined;
        saveDeadlineMutation.mutate({ id, body }, {
            onSuccess: () => closeModal(),
            onError: (error: Error) => setFErr(error.message || "Save failed."),
        });
    };

    const toggleComplete = (dl: Deadline) => {
        toggleCompleteMutation.mutate({ id: dl.deadline_id, completed: !dl.is_completed });
    };

    const deleteEvent = (ev: CalEvent) => {
        if (!confirm(`Delete "${ev.title}"?`)) return;
        if (ev.kind === "hearing") deleteHearingMutation.mutate(ev.hearing_id);
        else deleteDeadlineMutation.mutate(ev.deadline_id);
    };

    // Upcoming events across the whole loaded month, sorted by date
    const allEvents: CalEvent[] = [
        ...hearings.map(h => ({ kind: "hearing" as const, ...h })),
        ...deadlines.map(d => ({ kind: "deadline" as const, ...d })),
    ].sort((a, b) => {
        const da = a.kind === "hearing" ? a.hearing_date : a.due_date;
        const db = b.kind === "hearing" ? b.hearing_date : b.due_date;
        return da.localeCompare(db);
    });

    const selectedEvents = selected ? (eventsByDate[selected] ?? []) : [];
    const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

    // Calendar grid
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDow  = firstDow(viewYear, viewMonth);
    const cells: (number | null)[] = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const isHearing = (ev: CalEvent): ev is { kind: "hearing" } & Hearing => ev.kind === "hearing";

    return (
        <div className={PANEL_CONTENT}>
            <div className={CAL_LAYOUT}>

                {/* ── Left: Month grid ── */}
                <div className={CAL_MAIN}>
                    {/* Month nav */}
                    <div className={CAL_MONTH_NAV}>
                        <button className={CAL_NAV_BTN} onClick={prevMonth}>‹</button>
                        <span className={CAL_MONTH_LABEL}>{MONTHS[viewMonth]} {viewYear}</span>
                        <button className={CAL_NAV_BTN} onClick={nextMonth}>›</button>
                        <Button variant="ghost" style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelected(todayStr); }}>
                            Today
                        </Button>
                        <Button style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", background: "#25d366", color: "#fff", borderColor: "#25d366" }}
                            onClick={openHolidayModal} title="Notify all clients with hearings/deadlines in a date range that court is closed">
                            📢 Notify Clients — Court Holiday
                        </Button>
                    </div>

                    {/* Day-of-week header */}
                    <div className={CAL_GRID}>
                        {DOW.map(d => (
                            <div key={d} className={CAL_DOW_CELL}>{d}</div>
                        ))}

                        {loading ? (
                            <div style={{ gridColumn: "1/-1", padding: "2rem", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                        ) : cells.map((day, idx) => {
                            if (day === null) return <div key={`e${idx}`} className={CAL_EMPTY_CELL} />;
                            const dateStr = isoDate(viewYear, viewMonth, day);
                            const evs     = eventsByDate[dateStr] ?? [];
                            const isToday = dateStr === todayStr;
                            const isSel   = dateStr === selected;
                            return (
                                <div
                                    key={dateStr}
                                    className={`${CAL_DAY_CELL}${isSel ? ` ${CAL_SELECTED}` : ""}`}
                                    onClick={() => setSelected(isSel ? null : dateStr)}
                                >
                                    <span className={`${CAL_DAY_NUM}${isToday ? ` ${CAL_DAY_NUM_TODAY}` : ""}`}>{day}</span>
                                    {evs.length > 0 && (
                                        <div className={CAL_DOTS}>
                                            {evs.slice(0, 3).map((ev, i) => (
                                                <span
                                                    key={i}
                                                    className={isHearing(ev) ? CAL_DOT_HEARING : CAL_DOT_DEADLINE}
                                                    style={isHearing(ev) ? {} : { opacity: ev.is_completed ? 0.35 : 1 }}
                                                />
                                            ))}
                                            {evs.length > 3 && <span className={CAL_DOT_MORE}>+{evs.length-3}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className={CAL_LEGEND}>
                        <span className={CAL_DOT_HEARING} /> Hearing
                        <span className={CAL_DOT_DEADLINE} style={{ marginLeft: "0.75rem" }} /> Deadline
                    </div>
                </div>

                {/* ── Right: Sidebar ── */}
                <div className={CAL_SIDEBAR}>
                    <div className={CAL_SIDEBAR_HEADER}>
                        <span className={CAL_SIDEBAR_TITLE}>
                            {selected
                                ? new Date(selected + "T00:00:00").toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" })
                                : "Upcoming This Month"}
                        </span>
                        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                            <Button style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                                onClick={() => openAdd("hearing", selected ?? undefined)}>
                                + Hearing
                            </Button>
                            <Button variant="ghost" style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                                onClick={() => openAdd("deadline", selected ?? undefined)}>
                                + Deadline
                            </Button>
                        </div>
                    </div>

                    <div className={CAL_EVENT_LIST}>
                        {(selected ? selectedEvents : allEvents).length === 0 ? (
                            <div className={EMPTY_HINT}>
                                {selected ? "No events on this day." : "No events this month."}
                            </div>
                        ) : (
                            (selected ? selectedEvents : allEvents).map((ev, i) => {
                                const dateLabel = isHearing(ev) ? ev.hearing_date : ev.due_date;
                                const timeLabel = isHearing(ev) && ev.hearing_time ? ` · ${ev.hearing_time}` : "";
                                const subLabel  = isHearing(ev)
                                    ? ev.court_name ?? ev.matter_title ?? ""
                                    : `${ev.deadline_type}${ev.matter_title ? " · " + ev.matter_title : ""}`;
                                return (
                                    <div key={i} className={[
                                        CAL_EVENT_CARD,
                                        isHearing(ev) ? CAL_EVENT_HEARING : CAL_EVENT_DEADLINE,
                                        !isHearing(ev) && ev.is_completed ? CAL_EVENT_COMPLETED : "",
                                    ].filter(Boolean).join(" ")}>
                                        <div className={CAL_EVENT_TOP}>
                                            <div className={CAL_EVENT_TITLE}>
                                                {!isHearing(ev) && ev.is_completed && <span style={{ textDecoration: "line-through", opacity: 0.5 }}>{ev.title}</span>}
                                                {(isHearing(ev) || !ev.is_completed) && ev.title}
                                            </div>
                                            <div className={CAL_EVENT_ACTIONS}>
                                                {!isHearing(ev) && (
                                                    <button className={CAL_CHECK_BTN}
                                                        title={ev.is_completed ? "Mark incomplete" : "Mark complete"}
                                                        onClick={() => toggleComplete(ev as Deadline)}>
                                                        {ev.is_completed ? "↩" : "✓"}
                                                    </button>
                                                )}
                                                <button className={CAL_EDIT_BTN} onClick={() => openEdit(ev)}>✎</button>
                                                <button className={CAL_DEL_BTN} onClick={() => deleteEvent(ev)}>✕</button>
                                            </div>
                                        </div>
                                        <div className={CAL_EVENT_META}>
                                            {!selected && <span>{dateLabel}{timeLabel}</span>}
                                            {selected && isHearing(ev) && ev.hearing_time && <span>{ev.hearing_time}</span>}
                                            {subLabel && <span>{subLabel}</span>}
                                            {ev.wa_reminder === 1 && <span className={CAL_WA_BADGE}>📲 WA</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Add/Edit Modal ── */}
            <Modal
                open={!!modal}
                onClose={closeModal}
                title={
                    modal === "add-hearing"   ? "Add Hearing" :
                    modal === "edit-hearing"  ? "Edit Hearing" :
                    modal === "add-deadline"  ? "Add Deadline" :
                    "Edit Deadline"
                }
                footer={<>
                    <Button variant="ghost" onClick={closeModal} disabled={fSaving}>Cancel</Button>
                    <Button disabled={fSaving} onClick={modal?.includes("hearing") ? saveHearing : saveDeadline}>
                        {fSaving ? "Saving…" : (modal?.startsWith("edit") ? "Save Changes" : "Add")}
                    </Button>
                </>}
            >
                        {/* Title */}
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Title *</label>
                            <input className={FORM_INPUT} value={fTitle} onChange={e => setFTitle(e.target.value)}
                                placeholder={modal?.includes("hearing") ? "e.g. First Hearing — ABC v XYZ" : "e.g. File written statement"} />
                        </div>

                        {/* Date + Time / Deadline type */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>{modal?.includes("hearing") ? "Hearing Date *" : "Due Date *"}</label>
                                <input type="date" className={FORM_INPUT} value={fDate} onChange={e => setFDate(e.target.value)} />
                            </div>
                            {modal?.includes("hearing") ? (
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Time</label>
                                    <input type="time" className={FORM_INPUT} value={fTime} onChange={e => setFTime(e.target.value)} />
                                </div>
                            ) : (
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Type</label>
                                    <select className={FORM_SELECT} value={fDLType} onChange={e => setFDLType(e.target.value)}>
                                        {DEADLINE_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Court + Judge (hearing only) */}
                        {modal?.includes("hearing") && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Court</label>
                                    <input className={FORM_INPUT} value={fCourt} onChange={e => setFCourt(e.target.value)} placeholder="e.g. Lahore High Court" />
                                </div>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Judge</label>
                                    <input className={FORM_INPUT} value={fJudge} onChange={e => setFJudge(e.target.value)} placeholder="Justice Name" />
                                </div>
                            </div>
                        )}

                        {/* Outcome fields — Task #163/#164 (hearing only) */}
                        {modal?.includes("hearing") && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Hearing Outcome</label>
                                    <select className={FORM_SELECT} value={fOutcome} onChange={e => setFOutcome(e.target.value)}>
                                        <option value="">— Not yet held —</option>
                                        {["Heard", "Adjourned", "Partially Heard", "Reserved for Judgment", "Dismissed", "Withdrawn", "ex-parte"].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Next Date Fixed By</label>
                                    <select className={FORM_SELECT} value={fNextBy} onChange={e => setFNextBy(e.target.value)}>
                                        <option value="">— N/A —</option>
                                        {["Court (suo motu)", "Mutual Consent", "Plaintiff Application", "Defendant Application", "ex-parte Order"].map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        {modal?.includes("hearing") && fOutcome === "Adjourned" && (
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Adjournment Reason</label>
                                <input className={FORM_INPUT} value={fAdjReason} onChange={e => setFAdjReason(e.target.value)} placeholder="e.g. Counsel not available, court summoned, on application of plaintiff…" />
                            </div>
                        )}
                        {modal?.includes("hearing") && (
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Assign to (associate dispatch)</label>
                                <select className={FORM_SELECT} value={fAssignedTo} onChange={e => setFAssignedTo(e.target.value)}>
                                    <option value="">— Not assigned —</option>
                                    {teamMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                                </select>
                                <p className={MUTED} style={{ fontSize: "0.76rem", marginTop: "0.25rem" }}>
                                    The assigned team member will see this in "My Court Assignments" and can mark the outcome from their portal — you'll get a WhatsApp when they do.
                                </p>
                            </div>
                        )}

                        {/* Linked matter */}
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Linked Matter</label>
                            <select className={FORM_SELECT} value={fMatter} onChange={e => setFMatter(e.target.value)}>
                                <option value="">— None —</option>
                                {matters.map(m => <option key={m.matter_id} value={m.matter_id}>{m.title}</option>)}
                            </select>
                        </div>

                        {/* Notes */}
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Notes</label>
                            <textarea className={FORM_INPUT} value={fNotes} onChange={e => setFNotes(e.target.value)}
                                placeholder="Optional notes for this event" rows={2} />
                        </div>

                        {/* WhatsApp reminder */}
                        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-2)", marginBottom: "1rem", cursor: "pointer" }}>
                            <input type="checkbox" checked={fWA} onChange={e => setFWA(e.target.checked)} />
                            Send WhatsApp reminder 24 hours before
                        </label>

                        {fErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{fErr}</div>}
            </Modal>

            {/* ── Bulk WhatsApp: Court Holiday notice ── */}
            <Modal
                open={showHolidayModal}
                onClose={() => setShowHolidayModal(false)}
                title="📢 Notify Clients — Court Holiday"
                maxWidth={520}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowHolidayModal(false)}>{holidayResult ? "Close" : "Cancel"}</Button>
                    {holidayPreview !== null && holidayPreview.length > 0 && !holidayResult && (
                        <Button disabled={holidaySending} onClick={sendHolidayNotify}>
                            {holidaySending ? "Sending…" : `Send to ${holidayPreview.length} client${holidayPreview.length === 1 ? "" : "s"}`}
                        </Button>
                    )}
                </>}
            >
                        <p className={MUTED} style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>
                            Every client with a hearing or deadline in this date range gets a WhatsApp notice that court is closed — one click instead of messaging each client by hand.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>From</label>
                                <input type="date" className={FORM_INPUT} value={holidayFrom} onChange={e => { setHolidayFrom(e.target.value); holidayPreviewMutation.reset(); }} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>To</label>
                                <input type="date" className={FORM_INPUT} value={holidayTo} onChange={e => { setHolidayTo(e.target.value); holidayPreviewMutation.reset(); }} />
                            </div>
                        </div>
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Message (optional — default holiday notice used if blank)</label>
                            <textarea className={FORM_INPUT} rows={3} style={{ resize: "vertical" }} value={holidayMsg} onChange={e => setHolidayMsg(e.target.value)}
                                placeholder="e.g. Court will remain closed on 14 August (Independence Day). Hearings will be rescheduled." />
                        </div>

                        {holidayPreview === null ? (
                            <Button variant="ghost" onClick={loadHolidayPreview} disabled={holidayLoading || !holidayFrom}>
                                {holidayLoading ? "Loading…" : "Preview affected clients"}
                            </Button>
                        ) : holidayResult ? (
                            <div className={LIM_ALERT_BANNER} style={{ background: "var(--bg-1)", borderColor: "#2d8a4e" }}>
                                ✅ Sent to {holidayResult.notified} client{holidayResult.notified === 1 ? "" : "s"}.
                                {holidayResult.failed > 0 && ` ${holidayResult.failed} failed.`}
                                {holidayResult.skipped_no_phone > 0 && ` ${holidayResult.skipped_no_phone} had no phone on file.`}
                            </div>
                        ) : (
                            <div style={{ marginBottom: "0.75rem" }}>
                                {holidayPreview.length === 0 ? (
                                    <div className={EMPTY_HINT}>No clients have a hearing or deadline in this range — nothing to send.</div>
                                ) : (
                                    <>
                                        <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                                            {holidayPreview.length} client{holidayPreview.length === 1 ? "" : "s"} will be notified:
                                        </div>
                                        <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                            {holidayPreview.map(c => (
                                                <div key={c.client_id} style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
                                                    • {c.client_name} <span className={MUTED}>({c.matter_titles})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {holidayErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginBottom: "0.6rem" }}>{holidayErr}</div>}
            </Modal>
        </div>
    );
};
