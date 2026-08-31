import { useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Table, Badge, Button, BadgeTone } from "../../../components/ui";
import { useVakalatnamaRegister, useUpdateVakalatnamaStatus } from "../../../hooks/useVakalatnama";

const VAKALATNAMA_TONE: Record<string, BadgeTone> = { Filed: "green", Rejected: "red", Pending: "amber" };

export const VakalatnamaPanel = () => {
    const [filter, setFilter] = useState<"All" | "Pending" | "Filed" | "Rejected">("All");
    const [search, setSearch] = useState("");

    const { data: register = [], isLoading: loading } = useVakalatnamaRegister();
    const updateStatusMutation = useUpdateVakalatnamaStatus();

    const updateStatus = (matterId: string, newStatus: string) => {
        updateStatusMutation.mutate({ matterId, status: newStatus });
    };

    const visible = register.filter(e => {
        if (filter !== "All" && e.vakalatnama_status !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return e.title.toLowerCase().includes(q) || e.client_name.toLowerCase().includes(q) || (e.matter_no || "").toLowerCase().includes(q);
        }
        return true;
    });

    const counts = { All: register.length, Pending: 0, Filed: 0, Rejected: 0 };
    register.forEach(e => { if (e.vakalatnama_status in counts) (counts as Record<string, number>)[e.vakalatnama_status]++; });

    return (
        <div className={styles.panelContent}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
                {(["All", "Pending", "Filed", "Rejected"] as const).map(f => (
                    <Button key={f} size="sm" variant={filter === f ? "primary" : "ghost"} onClick={() => setFilter(f)}>
                        {f} ({counts[f]})
                    </Button>
                ))}
                <input className={styles.formInput} placeholder="Search matter / client…" value={search}
                    onChange={e => setSearch(e.target.value)} style={{ marginLeft: "auto", width: 220 }} />
            </div>
            <Table
                loading={loading}
                empty={!loading && visible.length === 0}
                emptyMessage="No matters match the current filter. All matters with a vakalatnama status appear here."
            >
                <thead><tr>
                    <th>Matter No.</th>
                    <th>Title</th>
                    <th>Client</th>
                    <th>Court</th>
                    <th>Matter Status</th>
                    <th>Vakalatnama</th>
                    <th style={{ width: 160 }}>Update</th>
                </tr></thead>
                <tbody>
                    {visible.map(e => (
                        <tr key={e.matter_id}>
                            <td className={styles.muted} style={{ fontSize: "0.8rem" }}>{e.matter_no || "—"}</td>
                            <td><strong style={{ fontSize: "0.88rem" }}>{e.title}</strong></td>
                            <td className={styles.muted}>{e.client_name}</td>
                            <td className={styles.muted} style={{ fontSize: "0.8rem" }}>{e.court_name || "—"}</td>
                            <td><span style={{ fontSize: "0.78rem" }}>{e.status}</span></td>
                            <td>
                                <Badge tone={VAKALATNAMA_TONE[e.vakalatnama_status] ?? "gray"}>
                                    {e.vakalatnama_status}
                                </Badge>
                            </td>
                            <td>
                                <select
                                    className={styles.formInput}
                                    style={{ fontSize: "0.78rem", padding: "2px 6px" }}
                                    value={e.vakalatnama_status}
                                    disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.matterId === e.matter_id}
                                    onChange={ev => updateStatus(e.matter_id, ev.target.value)}>
                                    <option>Pending</option>
                                    <option>Filed</option>
                                    <option>Rejected</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};
