import { useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Button, Modal, Badge, EmptyState } from "../../../components/ui";
import type { BadgeTone } from "../../../components/ui";
import type { LegalNotice } from "../types";
import { useLegalNotices, useSaveLegalNotice, useDeleteLegalNotice } from "../../../hooks/useLegalNotices";
import type { LegalNoticeForm } from "../../../services/legalNotices";

const LEGAL_NOTICE_TONE: Record<string, BadgeTone> = {
    Sent: "blue", Acknowledged: "green", "No Response": "red", Replied: "gold",
};

const BLANK: LegalNoticeForm = { notice_type: "Legal Notice", sent_to: "", sent_via: "Courier", sent_date: "", status: "Sent", subject: "", content: "", tracking_no: "", notes: "", matter_id: "", client_id: "" };

export const LegalNoticesPanel = () => {
    const { data: notices = [], isLoading: loading } = useLegalNotices();
    const saveMutation = useSaveLegalNotice();
    const deleteMutation = useDeleteLegalNotice();

    const [showModal, setShowModal] = useState(false);
    const [editNotice, setEditNotice] = useState<LegalNotice | null>(null);
    const [err, setErr] = useState("");
    const [filter, setFilter] = useState("All");
    const [form, setForm] = useState<LegalNoticeForm>({ ...BLANK });

    const open = (n?: LegalNotice) => {
        setEditNotice(n || null);
        setForm(n ? { notice_type: n.notice_type, sent_to: n.sent_to, sent_via: n.sent_via, sent_date: n.sent_date || "", status: n.status, subject: n.subject || "", content: n.content || "", tracking_no: n.tracking_no || "", notes: n.notes || "", matter_id: n.matter_id || "", client_id: n.client_id || "" } : { ...BLANK });
        setErr(""); setShowModal(true);
    };
    const save = () => {
        if (!form.sent_to.trim()) { setErr("Recipient (sent to) is required"); return; }
        setErr("");
        saveMutation.mutate({ id: editNotice?.notice_id, form }, {
            onSuccess: () => setShowModal(false),
            onError: (error: Error) => setErr(error.message || "Save failed"),
        });
    };
    const del = (id: string) => {
        if (!confirm("Delete this notice record?")) return;
        deleteMutation.mutate(id);
    };

    const visible = filter === "All" ? notices : notices.filter(n => n.status === filter);
    const statuses = ["All", "Draft", "Sent", "Acknowledged", "No Response", "Replied", "Withdrawn"];
    const noticeTypes = ["Legal Notice", "Demand Notice", "Eviction Notice", "Vakalatnama", "Reply Notice", "Termination Notice", "Cease & Desist", "Other"];
    const viaOptions = ["Courier", "Registered Post", "Email", "WhatsApp", "Hand Delivery", "Process Server"];

    return (
        <div className={styles.panelContent}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>📨 Legal Notices</h2>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select className={styles.formSelect} value={filter} onChange={e => setFilter(e.target.value)} style={{ width: "auto" }}>
                        {statuses.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <Button onClick={() => open()}>+ New Notice</Button>
                </div>
            </div>
            <p className={styles.muted} style={{ margin: "0.35rem 0 1rem" }}>Track legal notices sent and received — demand notices, eviction notices, reply notices, and more.</p>

            {loading ? <EmptyState message="Loading…" /> : visible.length === 0 ? (
                <EmptyState message="No notice records found. Add your first legal notice to start tracking." />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {visible.map(n => (
                        <div key={n.notice_id} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.9rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{n.subject || n.notice_type}</span>
                                    <span style={{ marginLeft: "0.75rem" }}><Badge tone={LEGAL_NOTICE_TONE[n.status] ?? "gray"}>{n.status}</Badge></span>
                                </div>
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                    <Button variant="ghost" size="sm" onClick={() => open(n)}>Edit</Button>
                                    <Button variant="danger" size="sm" onClick={() => del(n.notice_id)}>Del</Button>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.4rem 1rem", marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--text-2)" }}>
                                <span><strong>To:</strong> {n.sent_to}</span>
                                <span><strong>Type:</strong> {n.notice_type}</span>
                                <span><strong>Via:</strong> {n.sent_via}</span>
                                {n.sent_date && <span><strong>Sent:</strong> {n.sent_date}</span>}
                                {n.response_due && <span><strong>Reply Due:</strong> {n.response_due}</span>}
                                {n.response_date && <span><strong>Replied:</strong> {n.response_date}</span>}
                                {n.tracking_no && <span><strong>Tracking:</strong> {n.tracking_no}</span>}
                            </div>
                            {n.notes && <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "var(--text-3)", fontStyle: "italic" }}>{n.notes}</div>}
                        </div>
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editNotice ? "Edit Notice" : "Add Legal Notice"}
                maxWidth={560}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button onClick={save} loading={saveMutation.isPending}>Save</Button>
                </>}
            >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Notice Type</label>
                        <select className={styles.formInput} value={form.notice_type} onChange={e => setForm(f => ({ ...f, notice_type: e.target.value }))}>
                            {noticeTypes.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Status</label>
                        <select className={styles.formInput} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                            {["Draft","Sent","Acknowledged","No Response","Replied","Withdrawn"].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Subject</label>
                    <input className={styles.formInput} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Legal Notice for Recovery of PKR 5,00,000" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Sent To (Recipient) *</label>
                    <input className={styles.formInput} value={form.sent_to} onChange={e => setForm(f => ({ ...f, sent_to: e.target.value }))} placeholder="Name and address of recipient" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Sent Via</label>
                        <select className={styles.formInput} value={form.sent_via} onChange={e => setForm(f => ({ ...f, sent_via: e.target.value }))}>
                            {viaOptions.map(v => <option key={v}>{v}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Sent Date</label>
                        <input type="date" className={styles.formInput} value={form.sent_date} onChange={e => setForm(f => ({ ...f, sent_date: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Tracking No.</label>
                        <input className={styles.formInput} value={form.tracking_no} onChange={e => setForm(f => ({ ...f, tracking_no: e.target.value }))} placeholder="Courier/postal ref" />
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Notice Content (summary)</label>
                    <textarea className={styles.formInput} rows={3} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Brief summary of notice content…" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Notes</label>
                    <textarea className={styles.formInput} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional follow-up notes…" />
                </div>
                {err && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{err}</div>}
            </Modal>
        </div>
    );
};
