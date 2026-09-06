// Court orders / hearing log tab: timeline view, add/edit modal, and the
// Urdu/English voice-note transcription helper that pre-fills the form.
import { useRef, useState } from "react";
import {
    LIM_BADGE_CRITICAL, BADGE_AMBER, BADGE_GRAY, EMPTY_HINT, MUTED,
    ORDERS_TIMELINE, ORDER_CARD, ORDER_CARD_LEFT, ORDER_DOT, ORDER_LINE, ORDER_CARD_BODY,
    ORDER_CARD_HEADER, ORDER_DATE, ORDER_COURT, ORDER_OUTCOME_BADGE, ORDER_BRIEF, ORDER_NEXT_DATE,
    ORDER_ACTIONS, ACTION_BTN, ACTION_BTN_DANGER, FORM_GROUP, FORM_LABEL, FORM_INPUT, FORM_SELECT,
} from "../../ownerStyles";
import { Button, Modal } from "../../../../components/ui";
import type { Matter, CourtOrder } from "../../types";
import { useCourtOrders, useCreateCourtOrder, useUpdateCourtOrder, useDeleteCourtOrder, useTranscribeHearingVoiceNote } from "../../../../hooks/useMatterHearings";
import { useCustomCourts } from "../../../../hooks/useMatters";
import { DEFAULT_COURTS } from "./matterConstants";
import type { VoiceLogResult } from "../../../../services/matterHearings";

const BLANK_ORDER_FORM = { hearing_date: "", court_name: "", order_brief: "", next_date: "", outcome: "Adjourned", notify_client: true };

export function MatterOrdersTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: orders = [], isLoading: ordersLoading } = useCourtOrders(matterId);
    const { data: customCourts = [] } = useCustomCourts();
    const allCourts = [...DEFAULT_COURTS, ...customCourts.map(c => c.name)];

    const createOrder = useCreateCourtOrder(matterId);
    const updateOrder = useUpdateCourtOrder(matterId);
    const deleteOrder = useDeleteCourtOrder(matterId);
    const transcribe = useTranscribeHearingVoiceNote();

    const [showOrderModal, setShowOrderModal] = useState(false);
    const [editOrder, setEditOrder] = useState<CourtOrder | null>(null);
    const [orderForm, setOrderForm] = useState({ ...BLANK_ORDER_FORM });
    const [orderErr, setOrderErr] = useState("");

    const [voiceRecording, setVoiceRecording] = useState(false);
    const [voiceProcessing, setVoiceProcessing] = useState(false);
    const [voiceErr, setVoiceErr] = useState("");
    const [voiceResult, setVoiceResult] = useState<VoiceLogResult | null>(null);
    const voiceRecorderRef = useRef<MediaRecorder | null>(null);
    const voiceChunksRef = useRef<Blob[]>([]);

    const openOrderModal = (order?: CourtOrder) => {
        const today = new Date().toISOString().slice(0, 10);
        if (order) {
            setEditOrder(order);
            setOrderForm({ hearing_date: order.hearing_date, court_name: order.court_name ?? "", order_brief: order.order_brief, next_date: order.next_date ?? "", outcome: order.outcome, notify_client: true });
        } else {
            setEditOrder(null);
            setOrderForm({ hearing_date: today, court_name: matter.court_name ?? "", order_brief: "", next_date: "", outcome: "Adjourned", notify_client: true });
        }
        setOrderErr(""); setVoiceErr(""); setVoiceResult(null); setShowOrderModal(true);
    };

    const startVoiceRecording = async () => {
        setVoiceErr(""); setVoiceResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            voiceChunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
                setVoiceProcessing(true);
                transcribe.mutate(blob, {
                    onSuccess: d => setVoiceResult(d),
                    onError: (err: Error) => setVoiceErr(err.message || "Could not process the recording."),
                    onSettled: () => setVoiceProcessing(false),
                });
            };
            recorder.start();
            voiceRecorderRef.current = recorder;
            setVoiceRecording(true);
        } catch {
            setVoiceErr("Could not access the microphone — check browser permissions.");
        }
    };

    const stopVoiceRecording = () => {
        voiceRecorderRef.current?.stop();
        setVoiceRecording(false);
    };

    const applyVoiceResult = () => {
        if (!voiceResult) return;
        setOrderForm(f => ({
            ...f,
            order_brief: voiceResult.order_brief || f.order_brief,
            outcome:     voiceResult.outcome ?? f.outcome,
            next_date:   voiceResult.next_date ?? f.next_date,
        }));
        setVoiceResult(null);
    };

    const saveOrder = () => {
        if (!orderForm.hearing_date || !orderForm.order_brief.trim()) {
            setOrderErr("Hearing date and order summary are required."); return;
        }
        setOrderErr("");
        const body = {
            hearing_date: orderForm.hearing_date,
            court_name:   orderForm.court_name.trim() || undefined,
            order_brief:  orderForm.order_brief.trim(),
            next_date:    orderForm.next_date || undefined,
            outcome:      orderForm.outcome,
            notify_client: orderForm.notify_client,
        };
        const onSuccess = () => setShowOrderModal(false);
        const onError = (err: Error) => setOrderErr(err.message || "Save failed.");
        if (editOrder) updateOrder.mutate({ orderId: editOrder.order_id, input: body }, { onSuccess, onError });
        else createOrder.mutate(body, { onSuccess, onError });
    };

    const removeOrder = (order: CourtOrder) => {
        if (!confirm("Delete this court order entry?")) return;
        deleteOrder.mutate(order.order_id);
    };

    const orderSaving = createOrder.isPending || updateOrder.isPending;

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.82rem", color: "var(--text-2)" }}>
                    <span>{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
                    {(() => {
                        const adj = orders.filter(o => o.outcome === "Adjourned").length;
                        return adj > 0 ? (
                            <span className={adj >= 10 ? LIM_BADGE_CRITICAL : adj >= 5 ? BADGE_AMBER : BADGE_GRAY}
                                style={{ fontSize: "0.72rem" }}>
                                {adj} adjournment{adj !== 1 ? "s" : ""}
                            </span>
                        ) : null;
                    })()}
                </div>
                <Button size="sm" onClick={() => openOrderModal()}>+ Add Order</Button>
            </div>
            {ordersLoading ? (
                <div className={EMPTY_HINT}>Loading…</div>
            ) : orders.length === 0 ? (
                <div className={EMPTY_HINT}>No court orders recorded yet. Click "+ Add Order" after each hearing to build the case timeline.</div>
            ) : (
                <div className={ORDERS_TIMELINE}>
                    {orders.map((o, idx) => {
                        const outcomeColor: Record<string, string> = {
                            "Adjourned":       "var(--text-3)",
                            "Heard":           "var(--gold)",
                            "Decided":         "#2d8a4e",
                            "Partially Heard": "#c97c2a",
                        };
                        return (
                            <div key={o.order_id} className={ORDER_CARD}>
                                <div className={ORDER_CARD_LEFT}>
                                    <div className={ORDER_DOT} style={{ background: outcomeColor[o.outcome] ?? "var(--border)" }} />
                                    {idx < orders.length - 1 && <div className={ORDER_LINE} />}
                                </div>
                                <div className={ORDER_CARD_BODY}>
                                    <div className={ORDER_CARD_HEADER}>
                                        <div>
                                            <span className={ORDER_DATE}>{o.hearing_date}</span>
                                            {o.court_name && <span className={ORDER_COURT}> · {o.court_name}</span>}
                                        </div>
                                        <span className={ORDER_OUTCOME_BADGE} style={{ color: outcomeColor[o.outcome] }}>{o.outcome}</span>
                                    </div>
                                    <div className={ORDER_BRIEF}>{o.order_brief}</div>
                                    {o.next_date && (
                                        <div className={ORDER_NEXT_DATE}>Next date: <strong>{o.next_date}</strong></div>
                                    )}
                                    {o._offline ? (
                                        <div className={MUTED} style={{ fontSize: "0.78rem", marginTop: "0.3rem" }}>⏳ Saved offline — will sync automatically once you're back online.</div>
                                    ) : (
                                        <div className={ORDER_ACTIONS}>
                                            <button className={ACTION_BTN} onClick={() => openOrderModal(o)}>Edit</button>
                                            <button className={ACTION_BTN_DANGER} onClick={() => removeOrder(o)}>Delete</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Court Order add/edit modal ── */}
            <Modal open={showOrderModal} onClose={() => setShowOrderModal(false)} maxWidth={480}
                title={editOrder ? "Edit Court Order" : "Add Court Order"}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowOrderModal(false)} disabled={orderSaving}>Cancel</Button>
                    <Button onClick={saveOrder} disabled={orderSaving}>{orderSaving ? "Saving…" : editOrder ? "Save Changes" : "Add Order"}</Button>
                </>}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem", padding: "0.6rem", borderRadius: "var(--radius)", background: "var(--bg-1)", border: "1px solid var(--border)" }}>
                    {!voiceRecording ? (
                        <Button type="button" variant="ghost" onClick={startVoiceRecording} disabled={voiceProcessing}>
                            🎤 Record voice note
                        </Button>
                    ) : (
                        <Button type="button" onClick={stopVoiceRecording} style={{ background: "#c94040", borderColor: "#c94040" }}>
                            ⏹ Stop recording…
                        </Button>
                    )}
                    <span className={MUTED} style={{ fontSize: "0.78rem" }}>
                        {voiceProcessing ? "Transcribing…" : "Speak the outcome in Urdu or English — review before it fills the form."}
                    </span>
                </div>
                {voiceErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{voiceErr}</div>}
                {voiceResult && (
                    <div style={{ marginBottom: "0.85rem", padding: "0.65rem", borderRadius: "var(--radius)", background: "var(--bg-1)", border: "1px solid var(--gold)" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginBottom: "0.3rem" }}>Heard: "{voiceResult.transcript}"</div>
                        <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                            <strong>Suggested:</strong> {voiceResult.order_brief}
                            {voiceResult.outcome && <> · <strong>{voiceResult.outcome}</strong></>}
                            {voiceResult.next_date && <> · Next: <strong>{voiceResult.next_date}</strong></>}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Button type="button" size="sm" onClick={applyVoiceResult}>✓ Use this — fill form</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setVoiceResult(null)}>Discard</Button>
                        </div>
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Hearing Date *</label>
                        <input type="date" className={FORM_INPUT} value={orderForm.hearing_date} onChange={e => setOrderForm(f => ({ ...f, hearing_date: e.target.value }))} />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Outcome</label>
                        <select className={FORM_SELECT} value={orderForm.outcome} onChange={e => setOrderForm(f => ({ ...f, outcome: e.target.value }))}>
                            {["Adjourned", "Heard", "Partially Heard", "Decided"].map(o => <option key={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Court (optional)</label>
                    <select className={FORM_SELECT} value={orderForm.court_name} onChange={e => setOrderForm(f => ({ ...f, court_name: e.target.value }))}>
                        <option value="">Same as matter</option>
                        {allCourts.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Order Summary *</label>
                    <textarea className={FORM_INPUT} rows={4} style={{ resize: "vertical" }} value={orderForm.order_brief} onChange={e => setOrderForm(f => ({ ...f, order_brief: e.target.value }))} placeholder="e.g. Case adjourned on application of plaintiff's counsel. Next date fixed for arguments on maintainability." />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Next Date Fixed</label>
                    <input type="date" className={FORM_INPUT} value={orderForm.next_date} onChange={e => setOrderForm(f => ({ ...f, next_date: e.target.value }))} />
                </div>
                <div className={FORM_GROUP} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <input type="checkbox" id="notifyClientWa" checked={orderForm.notify_client} onChange={e => setOrderForm(f => ({ ...f, notify_client: e.target.checked }))} style={{ marginTop: "0.2rem" }} />
                    <label htmlFor="notifyClientWa" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                        📲 Notify client via WhatsApp{matter.client_phone ? ` (${matter.client_phone})` : " — no phone number on file for this client"}
                    </label>
                </div>
                {orderErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{orderErr}</div>}
            </Modal>
        </>
    );
}
