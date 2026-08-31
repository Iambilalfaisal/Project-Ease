// Fees & invoicing, time tracking, expenses, court fees, associate fees, and
// cheque tracking tabs for a matter's detail view.
import { useEffect, useState } from "react";
import styles from "../../OwnerPortal.module.css";
import { Button, Modal, Table } from "../../../../components/ui";
import type { Matter, Fee, TimeEntry, MatterExpense, CourtFeePayment, AssociateFee, MatterCheque } from "../../types";
import {
    useMatterFees, useCreateFee, useUpdateFee, useDeleteFee, useGenerateInvoiceFromFees,
    useTimeEntries, useCreateTimeEntry, useUpdateTimeEntry, useDeleteTimeEntry, useBillTimeEntries,
    useMatterExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense,
    useCourtFees, useCalculateCourtFee, useCreateCourtFee, useUpdateCourtFee, useDeleteCourtFee,
    useAssociateFees, useCreateAssociateFee, useUpdateAssociateFee, useDeleteAssociateFee,
    useCheques, useCreateCheque, useUpdateCheque, useDeleteCheque,
} from "../../../../hooks/useMatterFinancials";
import { FEE_TYPES, BLANK_TIME_FORM, BLANK_EXPENSE, EXPENSE_CATEGORIES_UI, COURT_FEE_TYPES_UI, BLANK_CF, BLANK_AF, BLANK_CHQ } from "./matterConstants";

const BLANK_FEE_FORM = { description: "", fee_type: "Consultation", amount: "", fee_date: "", notes: "" };

// ── Fees & Invoices ──────────────────────────────────────────────────────────

export function MatterFeesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: fees = [], isLoading: feesLoading } = useMatterFees(matterId);
    const createFee = useCreateFee(matterId);
    const updateFee = useUpdateFee(matterId);
    const deleteFee = useDeleteFee(matterId);
    const genInvoice = useGenerateInvoiceFromFees(matterId);

    const [showFeeModal, setShowFeeModal] = useState(false);
    const [editFee, setEditFee] = useState<Fee | null>(null);
    const [feeForm, setFeeForm] = useState({ ...BLANK_FEE_FORM });
    const [feeErr, setFeeErr] = useState("");

    const openFeeModal = (fee?: Fee) => {
        if (fee) {
            setEditFee(fee);
            setFeeForm({ description: fee.description, fee_type: fee.fee_type, amount: String(fee.amount), fee_date: fee.fee_date, notes: fee.notes ?? "" });
        } else {
            setEditFee(null);
            setFeeForm({ ...BLANK_FEE_FORM, fee_date: new Date().toISOString().slice(0, 10) });
        }
        setFeeErr(""); setShowFeeModal(true);
    };

    const saveFee = () => {
        if (!feeForm.description.trim() || !feeForm.fee_date || !feeForm.amount) {
            setFeeErr("Description, date, and amount are required."); return;
        }
        const amount = parseInt(feeForm.amount);
        if (isNaN(amount) || amount < 0) { setFeeErr("Amount must be a positive number."); return; }
        setFeeErr("");
        const body = { description: feeForm.description.trim(), fee_type: feeForm.fee_type, amount, fee_date: feeForm.fee_date, notes: feeForm.notes || undefined, matter_id: matterId };
        const onSuccess = () => setShowFeeModal(false);
        const onError = (err: Error) => setFeeErr(err.message || "Save failed.");
        if (editFee) updateFee.mutate({ feeId: editFee.fee_id, body }, { onSuccess, onError });
        else createFee.mutate(body, { onSuccess, onError });
    };

    const removeFee = (fee: Fee) => {
        if (!confirm(`Delete fee "${fee.description}"?`)) return;
        deleteFee.mutate(fee.fee_id);
    };

    const toggleFeePaid = (fee: Fee) => updateFee.mutate({ feeId: fee.fee_id, body: { is_paid: fee.is_paid ? 0 : 1 } });

    const generateInvoice = () => {
        const unbilled = fees.filter(f => !f.invoice_id && !f.is_paid);
        if (unbilled.length === 0) { alert("No unbilled fees to invoice."); return; }
        const today = new Date().toISOString().slice(0, 10);
        genInvoice.mutate(
            { matter_id: matterId, title: `Invoice — ${matter.title}`, issued_date: today, client_id: matter.client_id },
            { onSuccess: () => alert("Invoice created! View it in the Invoices panel."), onError: (err: Error) => alert(err.message ?? "Failed to create invoice.") }
        );
    };

    const unbilled = fees.filter(f => !f.invoice_id);
    const totalUnbilled = unbilled.reduce((s, f) => s + f.amount, 0);
    const totalAll = fees.reduce((s, f) => s + f.amount, 0);
    const feeSaving = createFee.isPending || updateFee.isPending;

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "var(--text-2)" }}>
                    <span>Total: <strong style={{ color: "var(--text-1)" }}>PKR {totalAll.toLocaleString("en-PK")}</strong></span>
                    <span>Unbilled: <strong style={{ color: "var(--gold)" }}>PKR {totalUnbilled.toLocaleString("en-PK")}</strong></span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {unbilled.length > 0 && (
                        <Button variant="ghost" size="sm" disabled={genInvoice.isPending} onClick={generateInvoice}>
                            {genInvoice.isPending ? "Creating…" : "Generate Invoice"}
                        </Button>
                    )}
                    <Button size="sm" onClick={() => openFeeModal()}>+ Add Fee</Button>
                </div>
            </div>

            <Table loading={feesLoading} empty={fees.length === 0}
                emptyMessage='No fees recorded yet. Click "+ Add Fee" to start tracking.'>
                <thead><tr>
                    <th>Description</th><th>Type</th><th>Date</th>
                    <th style={{ textAlign: "right" }}>Amount (PKR)</th>
                    <th>Paid</th><th>Invoice</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    {fees.map(fee => (
                        <tr key={fee.fee_id} style={{ opacity: fee.is_paid ? 0.6 : 1 }}>
                            <td>{fee.description}{fee.notes && <span className={styles.muted}> · {fee.notes}</span>}</td>
                            <td className={styles.muted}>{fee.fee_type}</td>
                            <td className={styles.muted}>{fee.fee_date}</td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{fee.amount.toLocaleString("en-PK")}</td>
                            <td>
                                <button
                                    className={fee.is_paid ? styles.badgeGreen : styles.badgeGray}
                                    style={{ border: "none", cursor: "pointer", fontSize: "0.72rem" }}
                                    onClick={() => toggleFeePaid(fee)}>
                                    {fee.is_paid ? "Paid" : "Unpaid"}
                                </button>
                            </td>
                            <td className={styles.muted}>{fee.invoice_id ? <span className={styles.badgeBlue} style={{ fontSize: "0.68rem" }}>Billed</span> : "—"}</td>
                            <td style={{ display: "flex", gap: "0.35rem" }}>
                                <button className={styles.actionBtn} onClick={() => openFeeModal(fee)}>Edit</button>
                                <button className={styles.actionBtnDanger} onClick={() => removeFee(fee)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                {fees.length > 0 && (
                    <tfoot>
                        <tr>
                            <td colSpan={3} style={{ textAlign: "right", fontWeight: 600, color: "var(--text-2)", fontSize: "0.82rem" }}>Total</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>{totalAll.toLocaleString("en-PK")}</td>
                            <td colSpan={3} />
                        </tr>
                    </tfoot>
                )}
            </Table>

            {/* ── Fee add/edit modal ── */}
            <Modal open={showFeeModal} onClose={() => setShowFeeModal(false)} maxWidth={440}
                title={editFee ? "Edit Fee" : "Add Fee"}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowFeeModal(false)} disabled={feeSaving}>Cancel</Button>
                    <Button onClick={saveFee} disabled={feeSaving}>{feeSaving ? "Saving…" : editFee ? "Save Changes" : "Add Fee"}</Button>
                </>}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description *</label>
                    <input className={styles.formInput} value={feeForm.description} onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Court appearance — Session 1" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Type</label>
                        <select className={styles.formSelect} value={feeForm.fee_type} onChange={e => setFeeForm(f => ({ ...f, fee_type: e.target.value }))}>
                            {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Amount (PKR) *</label>
                        <input type="number" min="0" className={styles.formInput} value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 25000" />
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Date *</label>
                    <input type="date" className={styles.formInput} value={feeForm.fee_date} onChange={e => setFeeForm(f => ({ ...f, fee_date: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Notes</label>
                    <input className={styles.formInput} value={feeForm.notes} onChange={e => setFeeForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                </div>
                {feeErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{feeErr}</div>}
            </Modal>
        </>
    );
}

// ── Time tracking ─────────────────────────────────────────────────────────────

function fmtElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function MatterTimeTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: timeEntries = [], isLoading: timeLoading } = useTimeEntries(matterId);
    const createEntry = useCreateTimeEntry(matterId);
    const updateEntry = useUpdateTimeEntry(matterId);
    const deleteEntry = useDeleteTimeEntry(matterId);
    const billEntries = useBillTimeEntries(matterId);

    const [showTimeModal, setShowTimeModal] = useState(false);
    const [editTimeEntry, setEditTimeEntry] = useState<TimeEntry | null>(null);
    const [timeForm, setTimeForm] = useState({ ...BLANK_TIME_FORM });
    const [timeErr, setTimeErr] = useState("");
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerStart, setTimerStart] = useState<number | null>(null);
    const [timerElapsed, setTimerElapsed] = useState(0);
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [billDesc, setBillDesc] = useState("");
    const [showBillModal, setShowBillModal] = useState(false);

    useEffect(() => {
        if (!timerRunning || timerStart === null) return;
        const id = setInterval(() => setTimerElapsed(Math.floor((Date.now() - timerStart) / 1000)), 1000);
        return () => clearInterval(id);
    }, [timerRunning, timerStart]);

    const startTimer = () => { setTimerStart(Date.now() - timerElapsed * 1000); setTimerRunning(true); };
    const resetTimer = () => { setTimerRunning(false); setTimerElapsed(0); setTimerStart(null); };

    const stopTimer = () => {
        setTimerRunning(false);
        const mins = Math.max(1, Math.round(timerElapsed / 60));
        const hh = Math.floor(mins / 60);
        const mm = mins % 60;
        setTimeForm({ ...BLANK_TIME_FORM, hours: String(hh), minutes: String(mm), entry_date: new Date().toISOString().slice(0, 10) });
        setEditTimeEntry(null); setTimeErr(""); setShowTimeModal(true);
    };

    const openTimeModal = (entry?: TimeEntry) => {
        if (entry) {
            setEditTimeEntry(entry);
            setTimeForm({
                description: entry.description ?? "",
                entry_date: entry.entry_date,
                hours: String(Math.floor(entry.duration_minutes / 60)),
                minutes: String(entry.duration_minutes % 60),
                hourly_rate: String(entry.hourly_rate),
                billable: entry.billable === 1,
            });
        } else {
            setEditTimeEntry(null);
            setTimeForm({ ...BLANK_TIME_FORM, entry_date: new Date().toISOString().slice(0, 10) });
        }
        setTimeErr(""); setShowTimeModal(true);
    };

    const saveTimeEntry = () => {
        const hrs = parseInt(timeForm.hours || "0");
        const mins = parseInt(timeForm.minutes || "0");
        const totalMins = hrs * 60 + mins;
        if (totalMins <= 0) { setTimeErr("Duration must be greater than 0."); return; }
        if (!timeForm.entry_date) { setTimeErr("Date is required."); return; }
        setTimeErr("");
        const body = {
            duration_minutes: totalMins,
            entry_date: timeForm.entry_date,
            description: timeForm.description.trim() || undefined,
            hourly_rate: parseInt(timeForm.hourly_rate || "0"),
            billable: timeForm.billable ? 1 : 0,
        };
        const onSuccess = () => { setShowTimeModal(false); setTimerElapsed(0); };
        const onError = (err: Error) => setTimeErr(err.message || "Save failed.");
        if (editTimeEntry) updateEntry.mutate({ entryId: editTimeEntry.entry_id, body }, { onSuccess, onError });
        else createEntry.mutate(body, { onSuccess, onError });
    };

    const removeTimeEntry = (entry: TimeEntry) => {
        if (!confirm("Delete this time entry?")) return;
        deleteEntry.mutate(entry.entry_id);
    };

    const billSelected = () => {
        if (selectedEntries.size === 0) return;
        billEntries.mutate(
            { entryIds: [...selectedEntries], description: billDesc || "Time charges" },
            {
                onSuccess: () => { setShowBillModal(false); setSelectedEntries(new Set()); setBillDesc(""); alert("Fee created! View it in the Fees & Invoices tab."); },
                onError: (err: Error) => alert(err.message ?? "Failed to create fee."),
            }
        );
    };

    const billable = timeEntries.filter(e => e.billable === 1 && !e.fee_id);
    const totalMins = timeEntries.reduce((s, e) => s + e.duration_minutes, 0);
    const billMins = billable.reduce((s, e) => s + e.duration_minutes, 0);
    const totalValue = billable.reduce((s, e) => s + Math.round(e.duration_minutes / 60 * e.hourly_rate), 0);
    const timeSaving = createEntry.isPending || updateEntry.isPending;

    return (
        <>
            <div className={styles.timerWidget}>
                <div className={styles.timerDisplay}>{fmtElapsed(timerElapsed)}</div>
                <div className={styles.timerControls}>
                    {!timerRunning ? (
                        <Button size="sm" onClick={startTimer}>▶ Start Timer</Button>
                    ) : (
                        <button className={styles.btnGold} style={{ fontSize: "0.82rem" }} onClick={stopTimer}>⏹ Stop &amp; Log</button>
                    )}
                    {timerElapsed > 0 && !timerRunning && (
                        <Button variant="ghost" size="sm" onClick={resetTimer}>Reset</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openTimeModal()}>+ Manual Entry</Button>
                </div>
            </div>

            <div className={styles.timeSummaryRow}>
                <span>Total: <strong>{fmtDuration(totalMins)}</strong></span>
                <span>Unbilled billable: <strong style={{ color: "var(--gold)" }}>{fmtDuration(billMins)}</strong></span>
                <span>Value: <strong>{totalValue.toLocaleString("en-PK")} PKR</strong></span>
                {selectedEntries.size > 0 && (
                    <Button size="sm" style={{ marginLeft: "auto" }} onClick={() => setShowBillModal(true)}>
                        Convert {selectedEntries.size} to Fee
                    </Button>
                )}
            </div>

            <Table loading={timeLoading} empty={timeEntries.length === 0}
                emptyMessage="No time logged yet. Start the timer or add a manual entry.">
                <thead><tr>
                    <th style={{ width: 32 }}></th>
                    <th>Date</th><th>Description</th><th>Duration</th>
                    <th>Rate (PKR/hr)</th><th>Value</th><th>Billable</th><th>Billed</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    {timeEntries.map(e => {
                        const val = Math.round(e.duration_minutes / 60 * e.hourly_rate);
                        const canSelect = e.billable === 1 && !e.fee_id;
                        const checked = selectedEntries.has(e.entry_id);
                        return (
                            <tr key={e.entry_id} style={{ opacity: e.fee_id ? 0.55 : 1 }}>
                                <td>
                                    {canSelect && (
                                        <input type="checkbox" checked={checked}
                                            onChange={() => {
                                                setSelectedEntries(prev => {
                                                    const n = new Set(prev);
                                                    checked ? n.delete(e.entry_id) : n.add(e.entry_id);
                                                    return n;
                                                });
                                            }} />
                                    )}
                                </td>
                                <td className={styles.muted}>{e.entry_date}</td>
                                <td>{e.description || <span className={styles.muted}>—</span>}</td>
                                <td><strong>{fmtDuration(e.duration_minutes)}</strong></td>
                                <td className={styles.muted}>{e.hourly_rate > 0 ? e.hourly_rate.toLocaleString("en-PK") : "—"}</td>
                                <td>{val > 0 ? val.toLocaleString("en-PK") : "—"}</td>
                                <td>{e.billable === 1 ? <span className={styles.badgeGreen} style={{ fontSize: "0.68rem" }}>Yes</span> : <span className={styles.badgeGray} style={{ fontSize: "0.68rem" }}>No</span>}</td>
                                <td>{e.fee_id ? <span className={styles.badgeBlue} style={{ fontSize: "0.68rem" }}>Billed</span> : "—"}</td>
                                <td style={{ display: "flex", gap: "0.35rem" }}>
                                    <button className={styles.actionBtn} onClick={() => openTimeModal(e)} disabled={!!e.fee_id}>Edit</button>
                                    <button className={styles.actionBtnDanger} onClick={() => removeTimeEntry(e)} disabled={!!e.fee_id}>Delete</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>

            <Modal open={showBillModal} onClose={() => setShowBillModal(false)} maxWidth={420} title="Convert Time to Fee"
                footer={<>
                    <Button variant="ghost" onClick={() => setShowBillModal(false)} disabled={billEntries.isPending}>Cancel</Button>
                    <Button onClick={billSelected} disabled={billEntries.isPending}>{billEntries.isPending ? "Creating…" : "Create Fee"}</Button>
                </>}>
                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", marginBottom: "1rem" }}>
                    This will create a single fee entry from {selectedEntries.size} selected time entries and mark them as billed.
                </p>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Fee Description</label>
                    <input className={styles.formInput} value={billDesc}
                        onChange={e => setBillDesc(e.target.value)}
                        placeholder="e.g. Legal services — July 2025" />
                </div>
            </Modal>

            <Modal open={showTimeModal} onClose={() => setShowTimeModal(false)} maxWidth={440}
                title={editTimeEntry ? "Edit Time Entry" : "Log Time"}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowTimeModal(false)} disabled={timeSaving}>Cancel</Button>
                    <Button onClick={saveTimeEntry} disabled={timeSaving}>{timeSaving ? "Saving…" : editTimeEntry ? "Save Changes" : "Log Time"}</Button>
                </>}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description</label>
                    <input className={styles.formInput} value={timeForm.description}
                        onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="e.g. Court appearance, research, drafting" autoFocus />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Hours</label>
                        <input type="number" min="0" className={styles.formInput} value={timeForm.hours}
                            onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))} placeholder="0" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Minutes</label>
                        <input type="number" min="0" max="59" className={styles.formInput} value={timeForm.minutes}
                            onChange={e => setTimeForm(f => ({ ...f, minutes: e.target.value }))} placeholder="30" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Date</label>
                        <input type="date" className={styles.formInput} value={timeForm.entry_date}
                            onChange={e => setTimeForm(f => ({ ...f, entry_date: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Hourly Rate (PKR)</label>
                        <input type="number" min="0" className={styles.formInput} value={timeForm.hourly_rate}
                            onChange={e => setTimeForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="e.g. 5000" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Billable?</label>
                        <select className={styles.formSelect} value={timeForm.billable ? "yes" : "no"}
                            onChange={e => setTimeForm(f => ({ ...f, billable: e.target.value === "yes" }))}>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                </div>
                {timeErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem", marginTop: "0.6rem" }}>{timeErr}</div>}
            </Modal>
        </>
    );
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export function MatterExpensesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: matterExpenses = [], isLoading: expensesLoading } = useMatterExpenses(matterId);
    const createExpense = useCreateExpense(matterId);
    const updateExpense = useUpdateExpense(matterId);
    const deleteExpense = useDeleteExpense(matterId);

    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editExpense, setEditExpense] = useState<MatterExpense | null>(null);
    const [expenseForm, setExpenseForm] = useState<{ description: string; amount_pkr: string; expense_date: string; category: string; billable: boolean; receipt_ref: string }>({ ...BLANK_EXPENSE });
    const [expenseErr, setExpenseErr] = useState("");

    const openExpenseModal = (exp?: MatterExpense) => {
        if (exp) {
            setEditExpense(exp);
            setExpenseForm({
                description: exp.description, amount_pkr: String(exp.amount_pkr), expense_date: exp.expense_date,
                category: exp.category, billable: exp.billable === 1, receipt_ref: exp.receipt_ref ?? "",
            });
        } else {
            setEditExpense(null);
            setExpenseForm({ ...BLANK_EXPENSE });
        }
        setExpenseErr(""); setShowExpenseModal(true);
    };

    const saveExpense = () => {
        if (!expenseForm.description.trim()) { setExpenseErr("Description is required."); return; }
        const amt = parseFloat(expenseForm.amount_pkr);
        if (isNaN(amt) || amt < 0) { setExpenseErr("Enter a valid amount."); return; }
        if (!expenseForm.expense_date) { setExpenseErr("Date is required."); return; }
        setExpenseErr("");
        const body = { ...expenseForm, amount_pkr: amt, billable: expenseForm.billable ? 1 : 0 };
        const onSuccess = () => setShowExpenseModal(false);
        const onError = (err: Error) => setExpenseErr(err.message || "Save failed.");
        if (editExpense) updateExpense.mutate({ expenseId: editExpense.expense_id, body }, { onSuccess, onError });
        else createExpense.mutate(body, { onSuccess, onError });
    };

    const removeExpense = (expenseId: string) => {
        if (!confirm("Delete this expense?")) return;
        deleteExpense.mutate(expenseId);
    };

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                    {matterExpenses.length} expense{matterExpenses.length !== 1 ? "s" : ""} · Total: PKR {matterExpenses.reduce((s, e) => s + e.amount_pkr, 0).toLocaleString()}
                    {matterExpenses.some(e => e.billable) && (
                        <> · Billable: PKR {matterExpenses.filter(e => e.billable).reduce((s, e) => s + e.amount_pkr, 0).toLocaleString()}</>
                    )}
                </span>
                <Button size="sm" onClick={() => openExpenseModal()}>+ Add Expense</Button>
            </div>
            <Table loading={expensesLoading} empty={matterExpenses.length === 0}
                emptyMessage="No expenses recorded yet. Track disbursements like court fees, filing charges, and travel costs here.">
                <thead><tr>
                    <th>Date</th><th>Description</th><th>Category</th>
                    <th style={{ textAlign: "right" }}>Amount (PKR)</th><th>Billable</th><th>Receipt</th><th style={{ width: 80 }}></th>
                </tr></thead>
                <tbody>
                    {matterExpenses.map(exp => (
                        <tr key={exp.expense_id}>
                            <td style={{ whiteSpace: "nowrap" }}>{exp.expense_date}</td>
                            <td>{exp.description}</td>
                            <td><span style={{ fontSize: "0.75rem", background: "var(--bg-2)", padding: "2px 6px", borderRadius: "var(--radius)" }}>{exp.category}</span></td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{exp.amount_pkr.toLocaleString()}</td>
                            <td style={{ textAlign: "center" }}>{exp.billable ? "✓" : "—"}</td>
                            <td style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{exp.receipt_ref || "—"}</td>
                            <td style={{ display: "flex", gap: 4 }}>
                                <Button variant="ghost" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openExpenseModal(exp)}>Edit</Button>
                                <Button variant="danger" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => removeExpense(exp.expense_id)}>Del</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
                {matterExpenses.length > 0 && (
                    <tfoot>
                        <tr>
                            <td colSpan={3} style={{ fontWeight: 600, fontSize: "0.85rem" }}>Total</td>
                            <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                                {matterExpenses.reduce((s, e) => s + e.amount_pkr, 0).toLocaleString()}
                            </td>
                            <td colSpan={3}></td>
                        </tr>
                    </tfoot>
                )}
            </Table>

            <Modal open={showExpenseModal} onClose={() => setShowExpenseModal(false)} maxWidth={480}
                title={editExpense ? "Edit Expense" : "Add Expense"}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
                    <Button onClick={saveExpense} disabled={createExpense.isPending || updateExpense.isPending}>{(createExpense.isPending || updateExpense.isPending) ? "Saving…" : "Save"}</Button>
                </>}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Description *</label>
                    <input className={styles.formInput} value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. High Court filing fee" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Amount (PKR) *</label>
                        <input type="number" min="0" className={styles.formInput} value={expenseForm.amount_pkr} onChange={e => setExpenseForm(f => ({ ...f, amount_pkr: e.target.value }))} placeholder="0" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Date *</label>
                        <input type="date" className={styles.formInput} value={expenseForm.expense_date} onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Category</label>
                        <select className={styles.formInput} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                            {EXPENSE_CATEGORIES_UI.map(c => <option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Receipt Ref</label>
                        <input className={styles.formInput} value={expenseForm.receipt_ref} onChange={e => setExpenseForm(f => ({ ...f, receipt_ref: e.target.value }))} placeholder="Optional" />
                    </div>
                </div>
                <div className={styles.formGroup} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" id="exp-billable" checked={expenseForm.billable} onChange={e => setExpenseForm(f => ({ ...f, billable: e.target.checked }))} />
                    <label htmlFor="exp-billable" style={{ fontSize: "0.85rem" }}>Billable to client</label>
                </div>
                {expenseErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{expenseErr}</div>}
            </Modal>
        </>
    );
}

// ── Court Fees ───────────────────────────────────────────────────────────────

export function MatterCourtFeesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: courtFeeList = [], isLoading: courtFeeLoading } = useCourtFees(matterId);
    const createCourtFee = useCreateCourtFee(matterId);
    const updateCourtFee = useUpdateCourtFee(matterId);
    const deleteCourtFee = useDeleteCourtFee(matterId);
    const calcPreview = useCalculateCourtFee();

    const [showCFModal, setShowCFModal] = useState(false);
    const [editCF, setEditCF] = useState<CourtFeePayment | null>(null);
    const [cfForm, setCfForm] = useState<typeof BLANK_CF>({ ...BLANK_CF });
    const [cfErr, setCfErr] = useState("");

    const previewCourtFee = (claim: number, ftype: string) => {
        if (claim <= 0) { calcPreview.reset(); return; }
        calcPreview.mutate({ claimAmountPkr: claim, feeType: ftype }, {
            onSuccess: d => setCfForm(f => ({ ...f, calculated_fee: d.calculated_fee ?? f.calculated_fee })),
        });
    };

    const openCFModal = (cf?: CourtFeePayment) => {
        setEditCF(cf || null); setCfErr(""); calcPreview.reset();
        setCfForm(cf ? { claim_amount_pkr: cf.claim_amount_pkr, fee_type: cf.fee_type, calculated_fee: cf.calculated_fee, actual_paid: cf.actual_paid, payment_date: cf.payment_date || "", challan_no: cf.challan_no || "", court: cf.court || "", notes: cf.notes || "" } : { ...BLANK_CF });
        setShowCFModal(true);
    };

    const saveCF = () => {
        setCfErr("");
        const onSuccess = () => setShowCFModal(false);
        const onError = (err: Error) => setCfErr(err.message || "Save failed.");
        if (editCF) updateCourtFee.mutate({ feePaymentId: editCF.fee_payment_id, body: cfForm }, { onSuccess, onError });
        else createCourtFee.mutate(cfForm, { onSuccess, onError });
    };

    const removeCF = (fpId: string) => {
        if (!confirm("Delete this court fee record?")) return;
        deleteCourtFee.mutate(fpId);
    };

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <div>
                    <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                        Total paid: <strong>PKR {courtFeeList.reduce((s, r) => s + r.actual_paid, 0).toLocaleString()}</strong>
                        {" · "}Calculated: <strong>PKR {courtFeeList.reduce((s, r) => s + r.calculated_fee, 0).toLocaleString()}</strong>
                    </span>
                </div>
                <Button size="sm" onClick={() => openCFModal()}>+ Add Payment</Button>
            </div>
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.6rem 0.9rem", marginBottom: "0.75rem", fontSize: "0.78rem", color: "var(--text-2)" }}>
                ℹ Punjab Court Fees Act slab calculator (ad valorem). Rates are approximate — verify current gazette for exact amounts.
            </div>
            <Table loading={courtFeeLoading} empty={courtFeeList.length === 0}
                emptyMessage="No court fee records yet. Use this tab to track court fee calculations, challan numbers, and payments for this matter.">
                <thead><tr>
                    <th>Date</th><th>Claim (PKR)</th><th>Type</th><th>Calculated</th><th>Paid</th><th>Challan No.</th><th style={{ width: 80 }}></th>
                </tr></thead>
                <tbody>
                    {courtFeeList.map(r => (
                        <tr key={r.fee_payment_id}>
                            <td style={{ fontSize: "0.82rem" }}>{r.payment_date || "—"}</td>
                            <td style={{ fontSize: "0.82rem" }}>PKR {r.claim_amount_pkr.toLocaleString()}</td>
                            <td style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>{r.fee_type}</td>
                            <td style={{ fontSize: "0.82rem", fontWeight: 600 }}>PKR {r.calculated_fee.toLocaleString()}</td>
                            <td style={{ fontSize: "0.82rem", color: r.actual_paid >= r.calculated_fee ? "#16a34a" : "#dc2626", fontWeight: 600 }}>PKR {r.actual_paid.toLocaleString()}</td>
                            <td style={{ fontSize: "0.78rem", fontFamily: "monospace" }}>{r.challan_no || "—"}</td>
                            <td style={{ display: "flex", gap: 4 }}>
                                <Button variant="ghost" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openCFModal(r)}>Edit</Button>
                                <Button variant="danger" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => removeCF(r.fee_payment_id)}>Del</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal open={showCFModal} onClose={() => setShowCFModal(false)} maxWidth={480}
                title={editCF ? "Edit Court Fee" : "Add Court Fee Payment"}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowCFModal(false)}>Cancel</Button>
                    <Button onClick={saveCF} disabled={createCourtFee.isPending || updateCourtFee.isPending}>{(createCourtFee.isPending || updateCourtFee.isPending) ? "Saving…" : "Save"}</Button>
                </>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Claim Amount (PKR)</label>
                        <input type="number" className={styles.formInput} min={0} value={cfForm.claim_amount_pkr}
                            onChange={e => { const v = parseFloat(e.target.value) || 0; setCfForm(f => ({ ...f, claim_amount_pkr: v })); previewCourtFee(v, cfForm.fee_type); }} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Fee Type</label>
                        <select className={styles.formInput} value={cfForm.fee_type} onChange={e => { setCfForm(f => ({ ...f, fee_type: e.target.value })); previewCourtFee(cfForm.claim_amount_pkr, e.target.value); }}>
                            {COURT_FEE_TYPES_UI.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                {calcPreview.data?.calculated_fee != null && (
                    <div style={{ background: "var(--bg-1)", border: "1px solid var(--gold)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                        📐 Calculated court fee: <strong>PKR {calcPreview.data.calculated_fee.toLocaleString()}</strong>
                    </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Calculated Fee (PKR)</label>
                        <input type="number" className={styles.formInput} min={0} value={cfForm.calculated_fee} onChange={e => setCfForm(f => ({ ...f, calculated_fee: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Actual Paid (PKR)</label>
                        <input type="number" className={styles.formInput} min={0} value={cfForm.actual_paid} onChange={e => setCfForm(f => ({ ...f, actual_paid: parseFloat(e.target.value) || 0 }))} />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Payment Date</label>
                        <input type="date" className={styles.formInput} value={cfForm.payment_date} onChange={e => setCfForm(f => ({ ...f, payment_date: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Challan No.</label>
                        <input className={styles.formInput} value={cfForm.challan_no} onChange={e => setCfForm(f => ({ ...f, challan_no: e.target.value }))} placeholder="Treasury challan number" />
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Court</label>
                    <input className={styles.formInput} value={cfForm.court} onChange={e => setCfForm(f => ({ ...f, court: e.target.value }))} placeholder="Optional" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Notes</label>
                    <textarea className={styles.formInput} rows={2} value={cfForm.notes} onChange={e => setCfForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                </div>
                {cfErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{cfErr}</div>}
            </Modal>
        </>
    );
}

// ── Associate / wakeel fees ──────────────────────────────────────────────────

export function MatterAssocFeesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: assocFeeList = [], isLoading: assocFeeLoading } = useAssociateFees(matterId);
    const createAF = useCreateAssociateFee(matterId);
    const updateAF = useUpdateAssociateFee(matterId);
    const deleteAF = useDeleteAssociateFee(matterId);

    const [showAFModal, setShowAFModal] = useState(false);
    const [editAF, setEditAF] = useState<AssociateFee | null>(null);
    const [afForm, setAfForm] = useState<typeof BLANK_AF>({ ...BLANK_AF });
    const [afErr, setAfErr] = useState("");

    const openAFModal = (af?: AssociateFee) => {
        setEditAF(af || null);
        setAfForm(af ? { advocate_name: af.advocate_name, bar_no: af.bar_no || "", appearance_date: af.appearance_date || "", amount_pkr: af.amount_pkr, paid: af.paid, payment_date: af.payment_date || "", notes: af.notes || "" } : { ...BLANK_AF });
        setAfErr(""); setShowAFModal(true);
    };

    const saveAF = () => {
        if (!afForm.advocate_name.trim()) { setAfErr("Advocate name is required"); return; }
        setAfErr("");
        const onSuccess = () => setShowAFModal(false);
        const onError = (err: Error) => setAfErr(err.message || "Save failed.");
        if (editAF) updateAF.mutate({ assocFeeId: editAF.assoc_fee_id, body: afForm }, { onSuccess, onError });
        else createAF.mutate(afForm, { onSuccess, onError });
    };

    const removeAF = (afId: string) => {
        if (!confirm("Delete this associate fee record?")) return;
        deleteAF.mutate(afId);
    };

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <div>
                    <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Associate / Wakeel appearance fees for this matter</span>
                    {assocFeeList.length > 0 && (
                        <span style={{ marginLeft: "0.75rem", fontSize: "0.82rem" }}>
                            Total: <strong>PKR {assocFeeList.reduce((s, r) => s + r.amount_pkr, 0).toLocaleString()}</strong>
                            {" · "}Paid: <strong style={{ color: "#16a34a" }}>PKR {assocFeeList.filter(r => r.paid).reduce((s, r) => s + r.amount_pkr, 0).toLocaleString()}</strong>
                            {" · "}Unpaid: <strong style={{ color: "#dc2626" }}>PKR {assocFeeList.filter(r => !r.paid).reduce((s, r) => s + r.amount_pkr, 0).toLocaleString()}</strong>
                        </span>
                    )}
                </div>
                <Button size="sm" onClick={() => openAFModal()}>+ Add Fee</Button>
            </div>
            <Table loading={assocFeeLoading} empty={assocFeeList.length === 0}
                emptyMessage="No associate fee records yet. Track fees paid to junior advocates, wakeels, or associates who appeared on behalf of the firm.">
                <thead><tr>
                    <th>Advocate</th><th>Bar No.</th><th>Appearance Date</th><th>Amount (PKR)</th><th>Status</th><th>Payment Date</th><th style={{ width: 90 }}></th>
                </tr></thead>
                <tbody>
                    {assocFeeList.map(r => (
                        <tr key={r.assoc_fee_id} style={{ background: r.paid ? "transparent" : "rgba(220,38,38,0.04)" }}>
                            <td><strong>{r.advocate_name}</strong></td>
                            <td className={styles.muted}>{r.bar_no || "—"}</td>
                            <td>{r.appearance_date || "—"}</td>
                            <td>PKR {r.amount_pkr.toLocaleString()}</td>
                            <td>
                                <span style={{ padding: "2px 8px", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, background: r.paid ? "#dcfce7" : "#fee2e2", color: r.paid ? "#16a34a" : "#dc2626" }}>
                                    {r.paid ? "Paid" : "Unpaid"}
                                </span>
                            </td>
                            <td className={styles.muted}>{r.payment_date || "—"}</td>
                            <td style={{ display: "flex", gap: "0.25rem" }}>
                                <Button variant="ghost" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openAFModal(r)}>Edit</Button>
                                <Button variant="danger" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => removeAF(r.assoc_fee_id)}>Del</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal open={showAFModal} onClose={() => setShowAFModal(false)} maxWidth={480}
                title={editAF ? "Edit Associate Fee" : "Add Associate Fee"}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowAFModal(false)}>Cancel</Button>
                    <Button onClick={saveAF} disabled={createAF.isPending || updateAF.isPending}>{(createAF.isPending || updateAF.isPending) ? "Saving…" : "Save"}</Button>
                </>}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Advocate Name *</label>
                    <input className={styles.formInput} value={afForm.advocate_name} onChange={e => setAfForm(f => ({ ...f, advocate_name: e.target.value }))} placeholder="Full name" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Bar Registration No.</label>
                    <input className={styles.formInput} value={afForm.bar_no} onChange={e => setAfForm(f => ({ ...f, bar_no: e.target.value }))} placeholder="Optional" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Appearance Date</label>
                    <input type="date" className={styles.formInput} value={afForm.appearance_date} onChange={e => setAfForm(f => ({ ...f, appearance_date: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount (PKR) *</label>
                    <input type="number" className={styles.formInput} min={0} value={afForm.amount_pkr} onChange={e => setAfForm(f => ({ ...f, amount_pkr: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={!!afForm.paid} onChange={e => setAfForm(f => ({ ...f, paid: e.target.checked ? 1 : 0 }))} />
                        Mark as Paid
                    </label>
                </div>
                {afForm.paid ? (
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Payment Date</label>
                        <input type="date" className={styles.formInput} value={afForm.payment_date} onChange={e => setAfForm(f => ({ ...f, payment_date: e.target.value }))} />
                    </div>
                ) : null}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Notes</label>
                    <textarea className={styles.formInput} rows={2} value={afForm.notes} onChange={e => setAfForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                </div>
                {afErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{afErr}</div>}
            </Modal>
        </>
    );
}

// ── Cheques ──────────────────────────────────────────────────────────────────

export function MatterChequesTab({ matter }: { matter: Matter }) {
    const matterId = matter.matter_id;
    const { data: chequeList = [], isLoading: chequeLoading } = useCheques(matterId);
    const createCheque = useCreateCheque(matterId);
    const updateCheque = useUpdateCheque(matterId);
    const deleteCheque = useDeleteCheque(matterId);

    const [showCHQModal, setShowCHQModal] = useState(false);
    const [editCHQ, setEditCHQ] = useState<MatterCheque | null>(null);
    const [chqForm, setChqForm] = useState<typeof BLANK_CHQ>({ ...BLANK_CHQ });
    const [chqErr, setChqErr] = useState("");

    const openCHQModal = (c?: MatterCheque) => {
        setEditCHQ(c || null);
        setChqForm(c ? { cheque_no: c.cheque_no, bank_name: c.bank_name || "", account_title: c.account_title || "", amount_pkr: c.amount_pkr, cheque_date: c.cheque_date || "", cheque_type: c.cheque_type, status: c.status, received_date: c.received_date || "", presented_date: c.presented_date || "", notes: c.notes || "" } : { ...BLANK_CHQ });
        setChqErr(""); setShowCHQModal(true);
    };

    const saveCHQ = () => {
        if (!chqForm.cheque_no.trim()) { setChqErr("Cheque number is required"); return; }
        setChqErr("");
        const onSuccess = () => setShowCHQModal(false);
        const onError = (err: Error) => setChqErr(err.message || "Save failed.");
        if (editCHQ) updateCheque.mutate({ chequeId: editCHQ.cheque_id, body: chqForm }, { onSuccess, onError });
        else createCheque.mutate(chqForm, { onSuccess, onError });
    };

    const removeCHQ = (chequeId: string) => {
        if (!confirm("Delete this cheque record?")) return;
        deleteCheque.mutate(chequeId);
    };

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.75rem 0" }}>
                <div>
                    <span className={styles.muted} style={{ fontSize: "0.82rem" }}>Post-dated & undated cheques held or presented for this matter</span>
                    {chequeList.length > 0 && (
                        <span style={{ marginLeft: "0.75rem", fontSize: "0.82rem" }}>
                            Total: <strong>PKR {chequeList.reduce((s, c) => s + c.amount_pkr, 0).toLocaleString()}</strong>
                        </span>
                    )}
                </div>
                <Button size="sm" onClick={() => openCHQModal()}>+ Add Cheque</Button>
            </div>
            <Table loading={chequeLoading} empty={chequeList.length === 0}
                emptyMessage="No cheque records yet. Track post-dated, undated, or bearer cheques received from clients as security or payment.">
                <thead><tr>
                    <th>Cheque No.</th><th>Bank</th><th>Amount</th><th>Date</th><th>Type</th><th>Status</th><th style={{ width: 90 }}></th>
                </tr></thead>
                <tbody>
                    {chequeList.map(c => {
                        const statusColor = c.status === "Cleared" ? "#16a34a" : c.status === "Bounced" ? "#dc2626" : c.status === "Presented" ? "#2563eb" : c.status === "Returned" || c.status === "Cancelled" ? "#9ca3af" : "var(--text-2)";
                        return (
                            <tr key={c.cheque_id}>
                                <td><strong>{c.cheque_no}</strong></td>
                                <td className={styles.muted}>{c.bank_name || "—"}{c.account_title ? ` / ${c.account_title}` : ""}</td>
                                <td>PKR {c.amount_pkr.toLocaleString()}</td>
                                <td className={styles.muted}>{c.cheque_date || "Undated"}</td>
                                <td><span style={{ fontSize: "0.78rem" }}>{c.cheque_type}</span></td>
                                <td><span style={{ fontWeight: 600, fontSize: "0.8rem", color: statusColor }}>{c.status}</span></td>
                                <td style={{ display: "flex", gap: "0.25rem" }}>
                                    <Button variant="ghost" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openCHQModal(c)}>Edit</Button>
                                    <Button variant="danger" size="sm" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => removeCHQ(c.cheque_id)}>Del</Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>

            <Modal open={showCHQModal} onClose={() => setShowCHQModal(false)} maxWidth={500}
                title={editCHQ ? "Edit Cheque" : "Add Cheque"}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowCHQModal(false)}>Cancel</Button>
                    <Button onClick={saveCHQ} disabled={createCheque.isPending || updateCheque.isPending}>{(createCheque.isPending || updateCheque.isPending) ? "Saving…" : "Save"}</Button>
                </>}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Cheque No. *</label>
                        <input className={styles.formInput} value={chqForm.cheque_no} onChange={e => setChqForm(f => ({ ...f, cheque_no: e.target.value }))} placeholder="e.g. 000123" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Amount (PKR)</label>
                        <input type="number" className={styles.formInput} min={0} value={chqForm.amount_pkr} onChange={e => setChqForm(f => ({ ...f, amount_pkr: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Bank Name</label>
                        <input className={styles.formInput} value={chqForm.bank_name} onChange={e => setChqForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="e.g. HBL" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Account Title</label>
                        <input className={styles.formInput} value={chqForm.account_title} onChange={e => setChqForm(f => ({ ...f, account_title: e.target.value }))} placeholder="Optional" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Cheque Date</label>
                        <input type="date" className={styles.formInput} value={chqForm.cheque_date} onChange={e => setChqForm(f => ({ ...f, cheque_date: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Type</label>
                        <select className={styles.formInput} value={chqForm.cheque_type} onChange={e => setChqForm(f => ({ ...f, cheque_type: e.target.value }))}>
                            {["Post-Dated", "Undated", "Bearer", "Crossed"].map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Status</label>
                        <select className={styles.formInput} value={chqForm.status} onChange={e => setChqForm(f => ({ ...f, status: e.target.value }))}>
                            {["Held", "Presented", "Cleared", "Bounced", "Returned", "Cancelled"].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Received Date</label>
                        <input type="date" className={styles.formInput} value={chqForm.received_date} onChange={e => setChqForm(f => ({ ...f, received_date: e.target.value }))} />
                    </div>
                    <div className={styles.formGroup} style={{ gridColumn: "1 / -1" }}>
                        <label className={styles.formLabel}>Notes</label>
                        <textarea className={styles.formInput} rows={2} value={chqForm.notes} onChange={e => setChqForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                    </div>
                </div>
                {chqErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{chqErr}</div>}
            </Modal>
        </>
    );
}
