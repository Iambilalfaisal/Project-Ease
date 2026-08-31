import { useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Table, Badge, Button, BadgeTone } from "../../../components/ui";
import { useAuditLogs } from "../../../hooks/useAudit";

const EVENT_LABELS: Record<string, string> = {
    login_success:  "Login",
    login_fail:     "Failed Login",
    logout:         "Logout",
    password_change:"Password Change",
    doc_upload:     "Document Upload",
    doc_delete:     "Document Delete",
    search:         "Search",
    member_invite:  "Member Invited",
    member_remove:  "Member Removed",
    client_create:  "Client Created",
    client_update:  "Client Updated",
    client_delete:  "Client Deleted",
    matter_create:  "Matter Created",
    matter_update:  "Matter Updated",
    matter_delete:  "Matter Deleted",
    org_update:     "Settings Updated",
    access_denied:  "Access Denied",
};

const EVENT_BADGE: Record<string, string> = {
    login_success:  "badgeGreen",
    login_fail:     "badgeRed",
    access_denied:  "badgeRed",
    logout:         "badgeGray",
    password_change:"badgeAmber",
    doc_upload:     "badgeGold",
    doc_delete:     "badgeRed",
    search:         "badgeBlue",
    member_invite:  "badgeGreen",
    member_remove:  "badgeRed",
    client_create:  "badgeGreen",
    client_update:  "badgeAmber",
    client_delete:  "badgeRed",
    matter_create:  "badgeGreen",
    matter_update:  "badgeAmber",
    matter_delete:  "badgeRed",
    org_update:     "badgeAmber",
};

const ALL_EVENT_TYPES = Object.keys(EVENT_LABELS);

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

const PAGE_SIZE = 100;

export const AuditPanel = () => {
    const [filterType, setFilterType] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(0);

    const { data, isLoading: loading } = useAuditLogs({ filterType, dateFrom, dateTo, page, pageSize: PAGE_SIZE });
    const logs = data?.logs ?? [];
    const total = data?.total ?? 0;

    const exportCsv = () => {
        const header = "Timestamp,Event,Actor,Role,Resource,IP Address,Details\n";
        const rows = logs.map(l => {
            const details = l.details ? (() => { try { return JSON.stringify(JSON.parse(l.details as string)); } catch { return l.details; } })() : "";
            return [
                l.created_at,
                EVENT_LABELS[l.event_type] ?? l.event_type,
                l.actor_name ?? "",
                l.actor_role ?? "",
                [l.resource_type, l.resource_name].filter(Boolean).join(": "),
                l.ip_address ?? "",
                details,
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
        }).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className={styles.panelContent}>
            {/* Toolbar */}
            <div className={styles.panelToolbar}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <select className={styles.formSelect} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0); }}>
                        <option value="all">All events</option>
                        {ALL_EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
                    </select>
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} title="From date" />
                    <input type="date" className={styles.formInput} style={{ width: "auto", fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} title="To date" />
                    <span className={styles.resultCount}>{total} event{total !== 1 ? "s" : ""}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
                    ↓ Export CSV
                </Button>
            </div>

            <Table
                loading={loading}
                empty={!loading && logs.length === 0}
                emptyMessage="No audit events match the selected filters."
            >
                <thead><tr>
                    <th>Timestamp</th><th>Event</th><th>Actor</th><th>Role</th><th>Resource</th><th>IP</th><th>Details</th>
                </tr></thead>
                <tbody>
                    {logs.map(l => {
                        let detailStr = "";
                        if (l.details) {
                            try {
                                const parsed = JSON.parse(l.details);
                                if (parsed.query) detailStr = `"${parsed.query}"`;
                                else if (parsed.email) detailStr = parsed.email;
                                else detailStr = Object.entries(parsed).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(", ");
                            } catch { detailStr = l.details; }
                        }
                        return (
                            <tr key={l.log_id}>
                                <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{l.created_at.slice(0, 19).replace("T", " ")}</td>
                                <td>
                                    <Badge tone={badgeClassToTone(EVENT_BADGE[l.event_type])}>
                                        {EVENT_LABELS[l.event_type] ?? l.event_type}
                                    </Badge>
                                </td>
                                <td style={{ fontSize: "0.82rem" }}>{l.actor_name ?? "—"}</td>
                                <td className={styles.muted}>{l.actor_role ?? "—"}</td>
                                <td className={styles.muted} style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {[l.resource_type, l.resource_name].filter(Boolean).join(": ") || "—"}
                                </td>
                                <td className={styles.muted} style={{ whiteSpace: "nowrap" }}>{l.ip_address ?? "—"}</td>
                                <td className={styles.muted} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={detailStr}>
                                    {detailStr || "—"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
            {!loading && logs.length > 0 && totalPages > 1 && (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem", justifyContent: "center" }}>
                    <Button variant="ghost" size="sm"
                        disabled={page === 0} onClick={() => setPage(page - 1)}>
                        ← Prev
                    </Button>
                    <span className={styles.muted} style={{ fontSize: "0.82rem" }}>
                        Page {page + 1} of {totalPages}
                    </span>
                    <Button variant="ghost" size="sm"
                        disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                        Next →
                    </Button>
                </div>
            )}
        </div>
    );
};
