import { useEffect, useState } from "react";
import { PANEL_CONTENT, SECTION_TITLE, MUTED, FORM_LABEL, FORM_INPUT, FORM_GROUP, FORM_SELECT } from "../ownerStyles";
import { Button, Modal, Badge, Table } from "../../../components/ui";
import type { StaffMember } from "../types";
import {
    useStaffList, useStaffAttendance, useStaffSalary,
    useSaveStaff, useDeleteStaff, useSaveAttendance, useSaveSalaryPayment, useDeleteSalaryPayment,
} from "../../../hooks/useStaff";
import type { StaffForm, SalaryForm } from "../../../services/staff";

export const StaffPanel = () => {
    const [tab, setTab] = useState<"staff" | "attendance" | "salary">("staff");

    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
    const [staffErr, setStaffErr] = useState("");
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [salaryTarget, setSalaryTarget] = useState<StaffMember | null>(null);
    const [salaryErr, setSalaryErr] = useState("");

    const BLANK_STAFF: StaffForm = { name: "", role: "Clerk", monthly_salary_pkr: 0, join_date: "", cnic: "", phone: "", status: "Active", notes: "" };
    const [staffForm, setStaffForm] = useState<StaffForm>({ ...BLANK_STAFF });
    const BLANK_SALARY: SalaryForm = { month: thisMonth, gross_pkr: 0, advance_deduction: 0, absence_deduction: 0, paid_date: today, payment_mode: "Cash", notes: "" };
    const [salaryForm, setSalaryForm] = useState<SalaryForm>({ ...BLANK_SALARY });

    const [attDate, setAttDate] = useState(today);
    const [attMap, setAttMap] = useState<Record<string, { status: string; time_in: string; time_out: string }>>({});

    const { data: staffList = [], isLoading: loading } = useStaffList();
    const { data: attList = [] } = useStaffAttendance(attDate, tab === "attendance");
    const { data: salaryList = [] } = useStaffSalary(thisMonth, tab === "salary");

    const saveStaffMutation = useSaveStaff();
    const deleteStaffMutation = useDeleteStaff();
    const attendanceMutation = useSaveAttendance();
    const saveSalaryMutation = useSaveSalaryPayment();
    const deleteSalaryMutation = useDeleteSalaryPayment();

    useEffect(() => {
        const map: Record<string, { status: string; time_in: string; time_out: string }> = {};
        attList.forEach(a => { map[a.staff_id] = { status: a.status, time_in: a.time_in || "", time_out: a.time_out || "" }; });
        setAttMap(map);
    }, [attList]);

    const openStaffModal = (s?: StaffMember) => {
        setEditStaff(s || null);
        setStaffForm(s ? { name: s.name, role: s.role, monthly_salary_pkr: s.monthly_salary_pkr, join_date: s.join_date || "", cnic: s.cnic || "", phone: s.phone || "", status: s.status, notes: s.notes || "" } : { ...BLANK_STAFF });
        setStaffErr(""); setShowStaffModal(true);
    };
    const saveStaff = () => {
        if (!staffForm.name.trim()) { setStaffErr("Name is required"); return; }
        setStaffErr("");
        saveStaffMutation.mutate({ id: editStaff?.staff_id, form: staffForm }, {
            onSuccess: () => setShowStaffModal(false),
            onError: (error: Error) => setStaffErr(error.message || "Save failed"),
        });
    };
    const deleteStaff = (id: string) => {
        if (!confirm("Remove this staff member?")) return;
        deleteStaffMutation.mutate(id);
    };

    const saveAttendance = (staffId: string, status: string, timeIn = "", timeOut = "") => {
        attendanceMutation.mutate({ staff_id: staffId, att_date: attDate, status, time_in: timeIn || undefined, time_out: timeOut || undefined });
        setAttMap(prev => ({ ...prev, [staffId]: { status, time_in: timeIn, time_out: timeOut } }));
    };

    const openSalaryModal = (s: StaffMember) => {
        setSalaryTarget(s);
        setSalaryForm({ ...BLANK_SALARY, gross_pkr: s.monthly_salary_pkr });
        setSalaryErr(""); setShowSalaryModal(true);
    };
    const saveSalary = () => {
        if (!salaryTarget) return;
        setSalaryErr("");
        saveSalaryMutation.mutate({ staffId: salaryTarget.staff_id, form: salaryForm }, {
            onSuccess: () => setShowSalaryModal(false),
            onError: (error: Error) => setSalaryErr(error.message || "Save failed"),
        });
    };
    const deleteSalary = (id: string) => {
        if (!confirm("Delete this salary payment record?")) return;
        deleteSalaryMutation.mutate(id);
    };

    const STAFF_ROLES = ["Senior Advocate", "Junior Advocate", "Clerk", "Para-Legal", "Receptionist", "Accountant", "Office Boy", "Driver", "Peon"];
    const ATT_STATUSES = ["Present", "Absent", "Half Day", "Leave", "Holiday"];

    const salaryMap: Record<string, number> = {};
    salaryList.forEach(p => { salaryMap[p.staff_id] = (salaryMap[p.staff_id] || 0) + p.net_paid_pkr; });

    return (
        <div className={PANEL_CONTENT}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <h2 className={SECTION_TITLE} style={{ margin: 0 }}>👥 Staff & Salary</h2>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {(["staff", "attendance", "salary"] as const).map(t => (
                        <Button key={t} variant={tab === t ? "primary" : "ghost"} style={{ fontSize: "0.8rem", textTransform: "capitalize" }} onClick={() => setTab(t)}>{t === "staff" ? "👤 Staff" : t === "attendance" ? "📋 Attendance" : "💵 Salary"}</Button>
                    ))}
                </div>
            </div>
            <p className={MUTED} style={{ margin: "0.35rem 0 1rem" }}>Manage office staff — advocates, clerks, and support — with daily attendance and monthly salary records.</p>

            {/* ── Staff tab ── */}
            {tab === "staff" && (<>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
                    <Button onClick={() => openStaffModal()}>+ Add Staff</Button>
                </div>
                <Table
                    loading={loading}
                    empty={!loading && staffList.length === 0}
                    emptyMessage="No staff records yet. Add clerks, junior advocates, and office staff to track attendance and salary."
                >
                    <thead><tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Salary (PKR/mo)</th>
                        <th>Phone</th>
                        <th>Join Date</th>
                        <th>Status</th>
                        <th style={{ width: 120 }}></th>
                    </tr></thead>
                    <tbody>
                        {staffList.map(s => (
                            <tr key={s.staff_id}>
                                <td><strong>{s.name}</strong></td>
                                <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.role}</td>
                                <td>PKR {s.monthly_salary_pkr.toLocaleString()}</td>
                                <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.phone || "—"}</td>
                                <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.join_date || "—"}</td>
                                <td><Badge tone={s.status === "Active" ? "green" : "red"}>{s.status}</Badge></td>
                                <td style={{ display: "flex", gap: 4 }}>
                                    <Button variant="ghost" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openStaffModal(s)}>Edit</Button>
                                    <Button style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openSalaryModal(s)}>💵 Pay</Button>
                                    <Button variant="danger" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteStaff(s.staff_id)}>Del</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </>)}

            {/* ── Attendance tab ── */}
            {tab === "attendance" && (<>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <label className={FORM_LABEL}>Date:</label>
                    <input type="date" className={FORM_INPUT} value={attDate} onChange={e => setAttDate(e.target.value)} style={{ width: 160 }} />
                    {attendanceMutation.isPending && <span className={MUTED} style={{ fontSize: "0.78rem" }}>Saving…</span>}
                </div>
                <Table empty={staffList.length === 0} emptyMessage="No staff found. Add staff members first.">
                    <thead><tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                    </tr></thead>
                    <tbody>
                        {staffList.filter(s => s.status === "Active").map(s => {
                            const att = attMap[s.staff_id] || { status: "Present", time_in: "", time_out: "" };
                            return (
                                <tr key={s.staff_id}>
                                    <td><strong>{s.name}</strong></td>
                                    <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.role}</td>
                                    <td>
                                        <select className={FORM_SELECT} style={{ width: "auto", fontSize: "0.82rem" }} value={att.status}
                                            onChange={e => saveAttendance(s.staff_id, e.target.value, att.time_in, att.time_out)}>
                                            {ATT_STATUSES.map(a => <option key={a}>{a}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <input type="time" className={FORM_INPUT} style={{ width: 110, fontSize: "0.82rem" }} value={att.time_in}
                                            onChange={e => saveAttendance(s.staff_id, att.status, e.target.value, att.time_out)} />
                                    </td>
                                    <td>
                                        <input type="time" className={FORM_INPUT} style={{ width: 110, fontSize: "0.82rem" }} value={att.time_out}
                                            onChange={e => saveAttendance(s.staff_id, att.status, att.time_in, e.target.value)} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </>)}

            {/* ── Salary tab ── */}
            {tab === "salary" && (<>
                <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--text-2)" }}>Showing salary payments for {thisMonth}.</div>
                <Table empty={staffList.length === 0} emptyMessage="No staff found. Add staff members first.">
                    <thead><tr>
                        <th>Staff Member</th>
                        <th>Role</th>
                        <th>Gross (PKR)</th>
                        <th>Paid This Month</th>
                        <th>Status</th>
                        <th style={{ width: 80 }}></th>
                    </tr></thead>
                    <tbody>
                        {staffList.filter(s => s.status === "Active").map(s => {
                            const paid = salaryMap[s.staff_id] || 0;
                            const isPaid = paid >= s.monthly_salary_pkr;
                            return (
                                <tr key={s.staff_id}>
                                    <td><strong>{s.name}</strong></td>
                                    <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{s.role}</td>
                                    <td>PKR {s.monthly_salary_pkr.toLocaleString()}</td>
                                    <td style={{ color: paid > 0 ? "#16a34a" : "var(--text-3)" }}>PKR {paid.toLocaleString()}</td>
                                    <td><Badge tone={isPaid ? "green" : "red"}>{isPaid ? "✓ Paid" : "Pending"}</Badge></td>
                                    <td>
                                        <Button style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => openSalaryModal(s)}>+ Pay</Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
                {salaryList.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                        <div style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>Payment History — {thisMonth}</div>
                        <Table>
                            <thead><tr>
                                <th>Staff</th>
                                <th>Month</th>
                                <th>Gross</th>
                                <th>Deductions</th>
                                <th>Net Paid</th>
                                <th>Date</th>
                                <th>Mode</th>
                                <th style={{ width: 60 }}></th>
                            </tr></thead>
                            <tbody>
                                {salaryList.map(p => {
                                    const sm = staffList.find(s => s.staff_id === p.staff_id);
                                    return (
                                        <tr key={p.payment_id}>
                                            <td>{sm?.name || "—"}</td>
                                            <td style={{ fontSize: "0.82rem" }}>{p.month}</td>
                                            <td>PKR {p.gross_pkr.toLocaleString()}</td>
                                            <td style={{ color: "#dc2626", fontSize: "0.82rem" }}>-PKR {(p.advance_deduction + p.absence_deduction).toLocaleString()}</td>
                                            <td style={{ fontWeight: 700, color: "#16a34a" }}>PKR {p.net_paid_pkr.toLocaleString()}</td>
                                            <td style={{ fontSize: "0.82rem" }}>{p.paid_date || "—"}</td>
                                            <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{p.payment_mode}</td>
                                            <td><Button variant="danger" style={{ fontSize: "0.75rem", padding: "2px 8px" }} onClick={() => deleteSalary(p.payment_id)}>Del</Button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
            </>)}

            {/* Staff add/edit modal */}
            <Modal
                open={showStaffModal}
                onClose={() => setShowStaffModal(false)}
                title={editStaff ? "Edit Staff Member" : "Add Staff Member"}
                maxWidth={480}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowStaffModal(false)}>Cancel</Button>
                    <Button onClick={saveStaff} disabled={saveStaffMutation.isPending}>{saveStaffMutation.isPending ? "Saving…" : "Save"}</Button>
                </>}
            >
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Full Name *</label>
                            <input className={FORM_INPUT} value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Role</label>
                                <select className={FORM_INPUT} value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}>
                                    {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Status</label>
                                <select className={FORM_INPUT} value={staffForm.status} onChange={e => setStaffForm(f => ({ ...f, status: e.target.value }))}>
                                    {["Active","On Leave","Resigned","Terminated"].map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Monthly Salary (PKR)</label>
                                <input type="number" min={0} className={FORM_INPUT} value={staffForm.monthly_salary_pkr} onChange={e => setStaffForm(f => ({ ...f, monthly_salary_pkr: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Join Date</label>
                                <input type="date" className={FORM_INPUT} value={staffForm.join_date} onChange={e => setStaffForm(f => ({ ...f, join_date: e.target.value }))} />
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>CNIC</label>
                                <input className={FORM_INPUT} value={staffForm.cnic} onChange={e => setStaffForm(f => ({ ...f, cnic: e.target.value }))} placeholder="xxxxx-xxxxxxx-x" />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Phone</label>
                                <input className={FORM_INPUT} value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} placeholder="03xx-xxxxxxx" />
                            </div>
                        </div>
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Notes</label>
                            <textarea className={FORM_INPUT} rows={2} value={staffForm.notes} onChange={e => setStaffForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                        </div>
                        {staffErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{staffErr}</div>}
            </Modal>

            {/* Salary payment modal */}
            <Modal
                open={showSalaryModal && !!salaryTarget}
                onClose={() => setShowSalaryModal(false)}
                title={`Pay Salary — ${salaryTarget?.name ?? ""}`}
                maxWidth={460}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowSalaryModal(false)}>Cancel</Button>
                    <Button onClick={saveSalary} disabled={saveSalaryMutation.isPending}>{saveSalaryMutation.isPending ? "Saving…" : "Record Payment"}</Button>
                </>}
            >
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Month</label>
                                <input type="month" className={FORM_INPUT} value={salaryForm.month} onChange={e => setSalaryForm(f => ({ ...f, month: e.target.value }))} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Gross (PKR)</label>
                                <input type="number" min={0} className={FORM_INPUT} value={salaryForm.gross_pkr} onChange={e => setSalaryForm(f => ({ ...f, gross_pkr: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Advance Deduction (PKR)</label>
                                <input type="number" min={0} className={FORM_INPUT} value={salaryForm.advance_deduction} onChange={e => setSalaryForm(f => ({ ...f, advance_deduction: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Absence Deduction (PKR)</label>
                                <input type="number" min={0} className={FORM_INPUT} value={salaryForm.absence_deduction} onChange={e => setSalaryForm(f => ({ ...f, absence_deduction: parseFloat(e.target.value) || 0 }))} />
                            </div>
                        </div>
                        <div style={{ background: "var(--bg-1)", border: "1px solid var(--gold)", borderRadius: "var(--radius)", padding: "0.5rem 0.75rem", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                            Net Payable: <strong>PKR {Math.max(0, salaryForm.gross_pkr - salaryForm.advance_deduction - salaryForm.absence_deduction).toLocaleString()}</strong>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Payment Date</label>
                                <input type="date" className={FORM_INPUT} value={salaryForm.paid_date} onChange={e => setSalaryForm(f => ({ ...f, paid_date: e.target.value }))} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Payment Mode</label>
                                <select className={FORM_INPUT} value={salaryForm.payment_mode} onChange={e => setSalaryForm(f => ({ ...f, payment_mode: e.target.value }))}>
                                    {["Cash","Bank Transfer","Cheque","JazzCash","Easypaisa"].map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Notes</label>
                            <textarea className={FORM_INPUT} rows={2} value={salaryForm.notes} onChange={e => setSalaryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
                        </div>
                        {salaryErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{salaryErr}</div>}
            </Modal>
        </div>
    );
};
