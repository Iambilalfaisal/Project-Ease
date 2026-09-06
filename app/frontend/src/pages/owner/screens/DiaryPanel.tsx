import { useState } from "react";
import { PANEL_CONTENT, SECTION_TITLE, FORM_INPUT, LIM_ALERT_BANNER, EMPTY_HINT, FORM_GROUP, FORM_LABEL } from "../ownerStyles";
import { Modal, Button } from "../../../components/ui";
import { useDiary, useSendDiaryBrief } from "../../../hooks/useDiary";
import type { DiaryHearing, DiaryDeadline } from "../../../services/diary";

export const DiaryPanel = () => {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState<string>(today);

    const { data: diary, isLoading: loading, error } = useDiary(date);
    const hearings: DiaryHearing[]   = diary?.hearings ?? [];
    const deadlines: DiaryDeadline[] = diary?.deadlines ?? [];
    const err = error ? (error.message || "Failed to load diary — no offline copy available for this date yet.") : null;
    const showingCached = diary?.fromCache && diary.cachedAt ? new Date(diary.cachedAt).toLocaleString() : null;

    // ── Print / WhatsApp share ─────────────────────────────────────────────
    const buildShareText = () => {
        const fmt = new Date(date + "T00:00:00").toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        let txt = `📅 *Daily Diary — ${fmt}*\n\n`;
        if (hearings.length) {
            txt += `⚖️ *Court Hearings (${hearings.length})*\n`;
            hearings.forEach(h => {
                txt += `• ${h.hearing_time ? h.hearing_time + " — " : ""}${h.title}`;
                if (h.matter_title) txt += ` [${h.matter_title}]`;
                if (h.court_name)   txt += ` @ ${h.court_name}`;
                txt += "\n";
            });
            txt += "\n";
        }
        if (deadlines.length) {
            txt += `⏰ *Deadlines (${deadlines.length})*\n`;
            deadlines.forEach(d => {
                txt += `• ${d.title}`;
                if (d.matter_title) txt += ` [${d.matter_title}]`;
                txt += "\n";
            });
        }
        if (!hearings.length && !deadlines.length) txt += "No hearings or deadlines today.";
        return txt;
    };

    const handlePrint = () => window.print();
    const handleWhatsApp = () => {
        const encoded = encodeURIComponent(buildShareText());
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
    };

    const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const priorityBadge = (p?: string) => {
        const c = p === "High" ? "#e53e3e" : p === "Medium" ? "#d97706" : "#4a90d9";
        return p ? <span style={{ background: c, color: "#fff", borderRadius: 4, padding: "1px 7px", fontSize: 11, marginLeft: 6 }}>{p}</span> : null;
    };

    const prev = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)); };
    const next = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().slice(0, 10)); };

    const total = hearings.length + deadlines.length;

    // ── Task #172: WhatsApp Morning Brief ─────────────────────────────────────
    const [showBriefModal, setShowBriefModal] = useState(false);
    const [briefNumber, setBriefNumber]       = useState("");
    const [briefStatus, setBriefStatus]       = useState<{ ok: boolean; msg: string } | null>(null);

    const sendBriefMutation = useSendDiaryBrief();
    const briefSending = sendBriefMutation.isPending;

    const sendBrief = () => {
        if (!briefNumber.trim()) { setBriefStatus({ ok: false, msg: "Please enter a WhatsApp number." }); return; }
        setBriefStatus(null);
        sendBriefMutation.mutate({ toNumber: briefNumber.trim(), date }, {
            onSuccess: (data) => {
                if (data.sent) {
                    setBriefStatus({ ok: true, msg: `✅ Brief sent to ${data.to}` });
                } else if (data.reason === "whatsapp_not_configured") {
                    // Fallback: open WhatsApp share link with formatted text
                    const encoded = encodeURIComponent(data.message || buildShareText());
                    const num = briefNumber.replace(/\D/g, "");
                    window.open(`https://wa.me/${num}?text=${encoded}`, "_blank");
                    setBriefStatus({ ok: true, msg: "WhatsApp opened — Twilio credentials not yet configured, used share link instead." });
                } else {
                    setBriefStatus({ ok: false, msg: data.error || "Failed to send." });
                }
            },
            onError: (error: Error) => setBriefStatus({ ok: false, msg: error.message || "Network error" }),
        });
    };

    return (
        <div className={PANEL_CONTENT} id="diary-print-area">
            {/* Header row */}
            <div id="diary-header-row" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h2 className={SECTION_TITLE} style={{ margin: 0 }}>📅 Daily Diary</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <Button variant="ghost" onClick={prev}>◀</Button>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={FORM_INPUT}
                        style={{ width: 160 }}
                    />
                    <Button variant="ghost" onClick={next}>▶</Button>
                    <Button variant="ghost" onClick={() => setDate(today)}>Today</Button>
                    <Button variant="ghost" onClick={handlePrint} title="Print diary">🖨 Print</Button>
                    <Button variant="ghost" onClick={handleWhatsApp} title="Share via WhatsApp" style={{ background: "#25d366", color: "#fff", borderColor: "#25d366" }}>📲 WhatsApp</Button>
                    <Button variant="ghost" onClick={() => { setBriefStatus(null); setShowBriefModal(true); }} title="Send WhatsApp morning brief" style={{ background: "#075e54", color: "#fff", borderColor: "#075e54" }}>📨 Send Brief</Button>
                </div>
            </div>

            {/* Date display */}
            <div style={{ padding: "6px 0 16px", color: "var(--text-2)", fontSize: 14 }}>
                {fmtDate(date)}
                {!loading && <span style={{ marginLeft: 10, color: total === 0 ? "var(--text-3)" : "var(--gold)", fontWeight: 600 }}>
                    {total === 0 ? "— Clear day" : `${total} item${total !== 1 ? "s" : ""}`}
                </span>}
            </div>
            {showingCached && (
                <div className={LIM_ALERT_BANNER} style={{ background: "var(--bg-1)", borderColor: "#c97c2a", marginBottom: "0.75rem", fontSize: "0.82rem" }}>
                    📴 Showing offline copy from {showingCached} — reconnect to refresh.
                </div>
            )}
            {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{err}</div>}

            {loading && <p className={EMPTY_HINT}>Loading…</p>}
            {err    && <p style={{ color: "#e53e3e", padding: 12 }}>{err}</p>}

            {!loading && !err && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                    {/* ── Hearings column ─────────────────────────────────── */}
                    <div>
                        <h3 style={{ color: "var(--gold)", marginBottom: 10, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
                            ⚖️ Court Hearings ({hearings.length})
                        </h3>
                        {hearings.length === 0 && (
                            <div className={EMPTY_HINT} style={{ fontSize: 13, padding: "20px 0" }}>No hearings scheduled</div>
                        )}
                        {hearings.map(h => (
                            <div key={h.hearing_id} style={{
                                background: "var(--bg-1)", border: "1px solid var(--border)",
                                borderRadius: 8, padding: "12px 14px", marginBottom: 10,
                                borderLeft: "3px solid var(--gold)"
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                                    {h.hearing_time && (
                                        <span style={{ background: "var(--gold)", color: "#0f1117", borderRadius: 4, padding: "1px 8px", fontSize: 12, fontWeight: 700 }}>
                                            {h.hearing_time}
                                        </span>
                                    )}
                                    {h.title}
                                </div>
                                {h.matter_title && (
                                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
                                        Matter: <strong>{h.matter_title}</strong>
                                        {h.case_number && <span style={{ marginLeft: 6, color: "var(--text-3)" }}>({h.case_number})</span>}
                                    </div>
                                )}
                                {h.court_name  && <div style={{ fontSize: 12, color: "var(--text-2)" }}>🏛 {h.court_name}</div>}
                                {h.judge_name  && <div style={{ fontSize: 12, color: "var(--text-2)" }}>👨‍⚖️ {h.judge_name}</div>}
                                {h.notes       && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>{h.notes}</div>}
                            </div>
                        ))}
                    </div>

                    {/* ── Deadlines column ────────────────────────────────── */}
                    <div>
                        <h3 style={{ color: "#e53e3e", marginBottom: 10, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>
                            ⏰ Deadlines ({deadlines.length})
                        </h3>
                        {deadlines.length === 0 && (
                            <div className={EMPTY_HINT} style={{ fontSize: 13, padding: "20px 0" }}>No deadlines due</div>
                        )}
                        {deadlines.map(d => (
                            <div key={d.deadline_id} style={{
                                background: "var(--bg-1)", border: "1px solid var(--border)",
                                borderRadius: 8, padding: "12px 14px", marginBottom: 10,
                                borderLeft: "3px solid #e53e3e"
                            }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                    {d.title}
                                    {priorityBadge(d.priority)}
                                </div>
                                {d.matter_title && (
                                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
                                        Matter: <strong>{d.matter_title}</strong>
                                        {d.case_number && <span style={{ marginLeft: 6, color: "var(--text-3)" }}>({d.case_number})</span>}
                                    </div>
                                )}
                                {d.notes && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontStyle: "italic" }}>{d.notes}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Task #172: Morning Brief Modal */}
            <Modal
                open={showBriefModal}
                onClose={() => setShowBriefModal(false)}
                title="📨 WhatsApp Morning Brief"
                maxWidth={420}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowBriefModal(false)}>Cancel</Button>
                    <Button onClick={sendBrief} disabled={briefSending}>
                        {briefSending ? "Sending…" : "📨 Send via WhatsApp"}
                    </Button>
                </>}
            >
                <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: "1rem" }}>
                    Send today's diary ({fmtDate(date)}) as a WhatsApp message to a number.
                </p>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>WhatsApp Number *</label>
                    <input
                        className={FORM_INPUT}
                        value={briefNumber}
                        onChange={e => setBriefNumber(e.target.value)}
                        placeholder="+923001234567"
                        type="tel"
                    />
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Include country code, e.g. +92 for Pakistan</div>
                </div>
                <div className={FORM_GROUP} style={{ marginTop: "0.75rem" }}>
                    <label className={FORM_LABEL}>Date</label>
                    <input
                        className={FORM_INPUT}
                        type="date"
                        value={date}
                        disabled
                        style={{ opacity: 0.7 }}
                    />
                </div>
                <div style={{ background: "var(--bg-1)", borderRadius: 6, padding: "0.6rem 0.8rem", marginTop: "0.75rem", fontSize: 12, color: "var(--text-2)", borderLeft: "3px solid #25d366" }}>
                    📋 Brief includes {hearings.length} hearing{hearings.length !== 1 ? "s" : ""} and {deadlines.length} deadline{deadlines.length !== 1 ? "s" : ""}.
                </div>
                {briefStatus && (
                    <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.8rem", borderRadius: 6, fontSize: 13,
                        background: briefStatus.ok ? "rgba(37,211,102,0.1)" : "rgba(229,62,62,0.08)",
                        color: briefStatus.ok ? "#1a9c3e" : "#e53e3e",
                        border: `1px solid ${briefStatus.ok ? "#25d366" : "#e53e3e"}` }}>
                        {briefStatus.msg}
                    </div>
                )}
            </Modal>

            {/* Print-only styles */}
            <style>{`
                @media print {
                    body > *:not(#diary-print-area) { display: none !important; }
                    #diary-print-area { display: block !important; color: #000 !important; background: #fff !important; }
                    #diary-header-row button { display: none !important; }
                }
            `}</style>
        </div>
    );
};
