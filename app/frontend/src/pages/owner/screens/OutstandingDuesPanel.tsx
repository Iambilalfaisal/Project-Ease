import { useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Table } from "../../../components/ui";
import { useOutstandingDuesQuery } from "../../../hooks/useOutstandingDues";

export const OutstandingDuesPanel = () => {
    const { data: invoices = [], isLoading: loading } = useOutstandingDuesQuery();
    const [bucket, setBucket] = useState("All");

    const buckets = ["All", "Current", "0-30 days", "31-60 days", "60+ days"];
    const visible = bucket === "All" ? invoices : invoices.filter(i => i.aging_bucket === bucket);

    const totalBalance = visible.reduce((s, i) => s + i.balance, 0);

    const bucketColour = (b: string) => b === "Current" ? "#16a34a" : b === "0-30 days" ? "#f59e0b" : b === "31-60 days" ? "#f97316" : b === "60+ days" ? "#dc2626" : "var(--text-2)";

    return (
        <div className={styles.panelContent}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>💰 Outstanding Dues</h2>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <select className={styles.formSelect} value={bucket} onChange={e => setBucket(e.target.value)} style={{ width: "auto" }}>
                        {buckets.map(b => <option key={b}>{b}</option>)}
                    </select>
                </div>
            </div>
            <p className={styles.muted} style={{ margin: "0.35rem 0 1rem" }}>Aging report of all unpaid invoices across matters. Filter by overdue bucket.</p>

            {!loading && (
                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    {["Current", "0-30 days", "31-60 days", "60+ days"].map(b => {
                        const cnt = invoices.filter(i => i.aging_bucket === b).length;
                        const tot = invoices.filter(i => i.aging_bucket === b).reduce((s, i) => s + i.balance, 0);
                        return (
                            <div key={b} onClick={() => setBucket(b === bucket ? "All" : b)} style={{ cursor: "pointer", flex: "1 1 140px", background: "var(--bg-1)", border: `2px solid ${bucket === b ? bucketColour(b) : "var(--border)"}`, borderRadius: "var(--radius)", padding: "0.75rem", textAlign: "center" }}>
                                <div style={{ fontSize: "0.75rem", color: bucketColour(b), fontWeight: 700, textTransform: "uppercase" }}>{b}</div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 4 }}>PKR {tot.toLocaleString()}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>{cnt} invoice{cnt !== 1 ? "s" : ""}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && visible.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-2)" }}>{visible.length} invoice{visible.length !== 1 ? "s" : ""}</span>
                    <strong style={{ color: "#dc2626" }}>Total Outstanding: PKR {totalBalance.toLocaleString()}</strong>
                </div>
            )}
            <Table
                loading={loading}
                empty={!loading && visible.length === 0}
                emptyMessage={`No outstanding invoices${bucket !== "All" ? ` in bucket: ${bucket}` : ""}. All dues are clear!`}
                dense
            >
                <thead><tr>
                    <th>Matter</th>
                    <th>Client</th>
                    <th>Invoice Date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Aging</th>
                    <th>Status</th>
                </tr></thead>
                <tbody>
                    {visible.map(inv => (
                        <tr key={inv.invoice_id}>
                            <td style={{ fontSize: "0.82rem" }}>{inv.matter_title}</td>
                            <td style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>{inv.client_name}</td>
                            <td style={{ fontSize: "0.82rem" }}>{inv.invoice_date}</td>
                            <td style={{ fontSize: "0.82rem" }}>PKR {inv.total_pkr.toLocaleString()}</td>
                            <td style={{ fontSize: "0.82rem", color: "#16a34a" }}>PKR {inv.paid_pkr.toLocaleString()}</td>
                            <td style={{ fontSize: "0.85rem", fontWeight: 700, color: "#dc2626" }}>PKR {inv.balance.toLocaleString()}</td>
                            <td><span style={{ fontSize: "0.72rem", fontWeight: 700, color: bucketColour(inv.aging_bucket) }}>{inv.aging_bucket}</span></td>
                            <td><span style={{ fontSize: "0.72rem", fontWeight: 700 }}>{inv.status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
