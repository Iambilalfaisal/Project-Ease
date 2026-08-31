import { useState } from "react";
import styles from "../OwnerPortal.module.css";
import type { Invoice } from "../types";
import { Table, Modal, Badge, Button, type BadgeTone } from "../../../components/ui";
import { useInvoicesQuery, useInvoiceDetailQuery, useUpdateInvoiceStatusMutation } from "../../../hooks/useInvoices";

const INVOICE_STATUS_BADGE: Record<string, string> = {
    draft:     "badgeGray",
    sent:      "badgeBlue",
    paid:      "badgeGreen",
    cancelled: "badgeAmber",
};

// Adapter for the shared <Badge> component — converts the legacy CSS-module-class-name
// map above into a typed tone without changing that map's shared string type.
function badgeClassToTone(cls: string | undefined): BadgeTone {
    switch (cls) {
        case "badgeGreen": return "green";
        case "badgeAmber": return "amber";
        case "badgeGold":  return "gold";
        case "badgeRed":   return "red";
        case "badgeBlue":  return "blue";
        default:           return "gray";
    }
}

export const InvoicesPanel = () => {
    const { data: invoices = [], isLoading: loading } = useInvoicesQuery();
    const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
    const { data: viewInvoice } = useInvoiceDetailQuery(viewInvoiceId);
    const [statusFilter, setStatusFilter] = useState("all");
    const updateStatusMutation = useUpdateInvoiceStatusMutation();

    const openInvoice = (inv: Invoice) => setViewInvoiceId(inv.invoice_id);

    const updateStatus = (inv: Invoice, status: string) => {
        updateStatusMutation.mutate({ invoiceId: inv.invoice_id, status });
    };

    const isUpdating = (invoiceId: string) =>
        updateStatusMutation.isPending && updateStatusMutation.variables?.invoiceId === invoiceId;

    const printInvoice = (inv: Invoice) => {
        const fees = inv.fees ?? [];
        const total = fees.reduce((s, f) => s + f.amount, 0);
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #b8972e; padding-bottom: 20px; margin-bottom: 24px; }
  .brand { font-size: 1.4rem; font-weight: 700; color: #b8972e; }
  .invoice-meta { text-align: right; }
  .invoice-num { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; }
  .badge { display: inline-block; background: #b8972e22; color: #b8972e; border: 1px solid #b8972e55; border-radius: 100px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #888; font-weight: 600; margin-bottom: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f8f4e8; text-align: left; padding: 8px 10px; font-size: 0.78rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 0.875rem; }
  .amount { text-align: right; font-weight: 600; }
  .total-row td { font-weight: 700; font-size: 1rem; background: #f8f4e8; border-top: 2px solid #b8972e; }
  .footer { margin-top: 40px; font-size: 0.78rem; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 0; } button { display: none; } }
</style></head><body>
<div class="header">
  <div><div class="brand">Project Ease</div><div style="font-size:0.8rem;color:#888;margin-top:4px;">Legal Document Intelligence</div></div>
  <div class="invoice-meta">
    <div class="invoice-num">${inv.invoice_number}</div>
    <div style="margin:4px 0"><span class="badge">${inv.status}</span></div>
    <div style="font-size:0.8rem;color:#888;">Issued: ${inv.issued_date}</div>
    ${inv.due_date ? `<div style="font-size:0.8rem;color:#888;">Due: ${inv.due_date}</div>` : ""}
  </div>
</div>
<div class="grid2">
  <div class="section">
    <div class="section-title">Bill To</div>
    <div style="font-weight:600">${inv.client_name ?? "—"}</div>
    ${inv.client_email ? `<div style="font-size:0.83rem;color:#666">${inv.client_email}</div>` : ""}
    ${inv.client_phone ? `<div style="font-size:0.83rem;color:#666">${inv.client_phone}</div>` : ""}
  </div>
  <div class="section">
    <div class="section-title">Matter</div>
    <div style="font-weight:600">${inv.matter_title ?? "—"}</div>
    ${inv.case_number ? `<div style="font-size:0.83rem;color:#666">Case #${inv.case_number}</div>` : ""}
  </div>
</div>
<div class="section">
  <div class="section-title">Invoice Title</div>
  <div style="font-weight:600">${inv.title}</div>
</div>
<table>
  <thead><tr><th>Description</th><th>Type</th><th>Date</th><th class="amount">Amount (PKR)</th></tr></thead>
  <tbody>
    ${fees.map(f => `<tr><td>${f.description}</td><td>${f.fee_type}</td><td>${f.fee_date}</td><td class="amount">${f.amount.toLocaleString("en-PK")}</td></tr>`).join("")}
  </tbody>
  <tfoot>
    <tr class="total-row"><td colspan="3" style="text-align:right">Total</td><td class="amount">PKR ${total.toLocaleString("en-PK")}</td></tr>
  </tfoot>
</table>
${inv.notes ? `<div class="section" style="margin-top:20px"><div class="section-title">Notes</div><div>${inv.notes}</div></div>` : ""}
<div class="footer">Generated by Project Ease &nbsp;·&nbsp; projectease.ai</div>
</body></html>`;
        const w = window.open("", "_blank");
        if (!w) { alert("Please allow pop-ups to print invoices."); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    // ── Task #168: Cash Receipt (Raseed) print ───────────────────────────────
    const printReceipt = (inv: Invoice) => {
        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
  .page { max-width: 420px; margin: 32px auto; border: 2px solid #b8972e; border-radius: 8px; padding: 32px; }
  .title { text-align: center; font-size: 1.4rem; font-weight: 800; color: #b8972e; letter-spacing: 0.05em; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 0.8rem; color: #888; margin-bottom: 24px; }
  .receipt-no { text-align: center; font-size: 0.9rem; font-weight: 600; color: #444; margin-bottom: 24px; }
  .row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ddd; padding: 8px 0; font-size: 0.9rem; }
  .label { color: #888; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .value { font-weight: 600; }
  .amount-box { text-align: center; background: #fdf8ec; border: 2px solid #b8972e; border-radius: 6px; padding: 16px; margin: 20px 0; }
  .amount-label { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.08em; }
  .amount-value { font-size: 1.8rem; font-weight: 800; color: #b8972e; }
  .sig { display: flex; justify-content: space-between; margin-top: 40px; font-size: 0.8rem; color: #888; }
  .sig-line { border-top: 1px solid #888; padding-top: 4px; min-width: 140px; text-align: center; }
  .footer { text-align: center; font-size: 0.72rem; color: #ccc; margin-top: 24px; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="page">
  <div class="title">رسید / CASH RECEIPT</div>
  <div class="subtitle">Project Ease — Legal Practice Management</div>
  <div class="receipt-no">Receipt against Invoice: ${inv.invoice_number}</div>
  <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</span></div>
  <div class="row"><span class="label">Received From</span><span class="value">${inv.client_name ?? "—"}</span></div>
  <div class="row"><span class="label">Matter / Case</span><span class="value">${inv.matter_title ?? "—"}${inv.case_number ? ` (${inv.case_number})` : ""}</span></div>
  <div class="row"><span class="label">In Payment Of</span><span class="value">${inv.title}</span></div>
  <div class="amount-box">
    <div class="amount-label">Amount Received (PKR)</div>
    <div class="amount-value">PKR ${inv.total_amount.toLocaleString("en-PK")}</div>
  </div>
  <div class="sig">
    <div class="sig-line">Received By / دستخط</div>
    <div class="sig-line">Date / تاریخ</div>
  </div>
  <div class="footer">This is a computer-generated receipt. For queries call the issuing office.</div>
</div>
</body></html>`;
        const w = window.open("", "_blank");
        if (!w) { alert("Please allow pop-ups to print receipts."); return; }
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 300);
    };

    const filtered = statusFilter === "all" ? invoices : invoices.filter(i => i.status === statusFilter);

    return (
        <div className={styles.panelContent}>
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {(["all","draft","sent","paid","cancelled"] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            style={{
                                padding: "0.28rem 0.75rem", borderRadius: 100, fontSize: "0.78rem", fontWeight: 600,
                                cursor: "pointer", textTransform: "capitalize",
                                border: statusFilter === s ? "1px solid var(--gold)" : "1px solid var(--border)",
                                background: statusFilter === s ? "var(--gold)" : "transparent",
                                color: statusFilter === s ? "#1a1200" : "var(--text-2)",
                            }}>{s}</button>
                    ))}
                    <span className={styles.muted} style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
                </div>
            </div>

            <Table
                loading={loading}
                empty={!loading && filtered.length === 0}
                emptyMessage='No invoices yet. Open a matter, add fees, then click "Generate Invoice".'
            >
                <thead><tr>
                    <th>Invoice #</th><th>Title</th><th>Matter</th><th>Client</th>
                    <th style={{ textAlign: "right" }}>Amount (PKR)</th>
                    <th>Issued</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    {filtered.map(inv => (
                        <tr key={inv.invoice_id}>
                            <td><button className={styles.linkBtn} onClick={() => openInvoice(inv)}>{inv.invoice_number}</button></td>
                            <td>{inv.title}</td>
                            <td className={styles.muted}>{inv.matter_title ?? "—"}</td>
                            <td className={styles.muted}>{inv.client_name ?? "—"}</td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{inv.total_amount.toLocaleString("en-PK")}</td>
                            <td className={styles.muted}>{inv.issued_date}</td>
                            <td><Badge tone={badgeClassToTone(INVOICE_STATUS_BADGE[inv.status])}>{inv.status}</Badge></td>
                            <td style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                <button className={styles.actionBtn} onClick={() => openInvoice(inv)}>View</button>
                                <button className={styles.actionBtn} onClick={() => printInvoice(inv)}>Print</button>
                                {inv.status === "paid" && <button className={styles.actionBtn} onClick={() => printReceipt(inv)} title="Print cash receipt / raseed">🧾 Raseed</button>}
                                {inv.status === "draft" && (
                                    <button className={styles.actionBtn} disabled={isUpdating(inv.invoice_id)}
                                        onClick={() => updateStatus(inv, "sent")}>Mark Sent</button>
                                )}
                                {inv.status === "sent" && (
                                    <button className={styles.actionBtn} disabled={isUpdating(inv.invoice_id)}
                                        onClick={() => updateStatus(inv, "paid")}>Mark Paid</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Invoice detail modal */}
            <Modal
                open={!!viewInvoiceId}
                onClose={() => setViewInvoiceId(null)}
                title={viewInvoice?.invoice_number}
                maxWidth={640}
                footer={viewInvoice && <>
                    <Button variant="ghost" onClick={() => printInvoice(viewInvoice)}>🖨 Print</Button>
                    {viewInvoice.status === "draft" && <Button variant="ghost" onClick={() => updateStatus(viewInvoice, "sent")}>Mark Sent</Button>}
                    {viewInvoice.status === "sent"  && <Button onClick={() => updateStatus(viewInvoice, "paid")}>Mark Paid</Button>}
                </>}
            >
                {viewInvoice && <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <div className={styles.muted} style={{ fontSize: "0.82rem" }}>{viewInvoice.title}</div>
                        <Badge tone={badgeClassToTone(INVOICE_STATUS_BADGE[viewInvoice.status])}>{viewInvoice.status}</Badge>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", fontSize: "0.83rem" }}>
                        <div><span className={styles.muted}>Client: </span>{viewInvoice.client_name ?? "—"}</div>
                        <div><span className={styles.muted}>Matter: </span>{viewInvoice.matter_title ?? "—"}</div>
                        <div><span className={styles.muted}>Issued: </span>{viewInvoice.issued_date}</div>
                        {viewInvoice.due_date && <div><span className={styles.muted}>Due: </span>{viewInvoice.due_date}</div>}
                    </div>

                    <Table>
                        <thead><tr><th>Description</th><th>Type</th><th>Date</th><th style={{ textAlign: "right" }}>PKR</th></tr></thead>
                        <tbody>
                            {(viewInvoice.fees ?? []).map(f => (
                                <tr key={f.fee_id}>
                                    <td>{f.description}</td>
                                    <td className={styles.muted}>{f.fee_type}</td>
                                    <td className={styles.muted}>{f.fee_date}</td>
                                    <td style={{ textAlign: "right", fontWeight: 600 }}>{f.amount.toLocaleString("en-PK")}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Gross Amount</td>
                                <td style={{ textAlign: "right", fontWeight: 700 }}>
                                    PKR {viewInvoice.total_amount.toLocaleString("en-PK")}
                                </td>
                            </tr>
                            {(viewInvoice.wht_rate ?? 0) > 0 && (<>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "right", color: "#dc2626", fontSize: "0.85rem" }}>
                                        WHT @ {((viewInvoice.wht_rate ?? 0) * 100).toFixed(0)}% (§153 ITO 2001 — Corporate deduction)
                                    </td>
                                    <td style={{ textAlign: "right", color: "#dc2626", fontSize: "0.85rem" }}>
                                        − PKR {(viewInvoice.wht_amount ?? 0).toLocaleString("en-PK")}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Net Payable</td>
                                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--gold)" }}>
                                        PKR {(viewInvoice.net_payable ?? viewInvoice.total_amount).toLocaleString("en-PK")}
                                    </td>
                                </tr>
                            </>)}
                            {!(viewInvoice.wht_rate ?? 0) && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "right", fontWeight: 700 }}>Net Payable</td>
                                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--gold)" }}>
                                        PKR {viewInvoice.total_amount.toLocaleString("en-PK")}
                                    </td>
                                </tr>
                            )}
                            {(viewInvoice.client_ntn || viewInvoice.org_ntn) && (
                                <tr>
                                    <td colSpan={4} style={{ fontSize: "0.78rem", color: "var(--text-3)", paddingTop: "0.4rem" }}>
                                        {viewInvoice.org_ntn && `Firm NTN/Bar: ${viewInvoice.org_ntn}`}
                                        {viewInvoice.org_ntn && viewInvoice.client_ntn && " · "}
                                        {viewInvoice.client_ntn && `Client NTN/CNIC: ${viewInvoice.client_ntn}`}
                                    </td>
                                </tr>
                            )}
                        </tfoot>
                    </Table>
                </>}
            </Modal>
        </div>
    );
};
