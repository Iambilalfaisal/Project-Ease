// Clients panel — client CRUD, client-portal link sharing, and the per-client
// trust/advance ledger. Data access goes through hooks/useClients.ts (TanStack
// Query) rather than inline fetch/useState/useEffect.

import { useState } from "react";
import {
    PANEL_CONTENT, PANEL_TOOLBAR, RESULT_COUNT, BACK_BTN, MATTER_DETAIL_HEADER, DETAIL_TITLE,
    BADGE_GOLD, BADGE_GRAY, DETAIL_INFO_GRID, DETAIL_INFO_ITEM, DETAIL_INFO_LABEL, SECTION_TITLE,
    MUTED, LINK_BTN, ACTION_BTN_PORTAL, ERROR_BANNER, FORM_GROUP, FORM_LABEL, FORM_INPUT, FORM_SELECT,
    PORTAL_FORM, PORTAL_FORM_TITLE, PORTAL_NEW_LINK, PORTAL_LINK_ROW, PORTAL_LINK_CODE, PORTAL_COPY_BTN,
    PORTAL_TOKEN_LIST, PORTAL_TOKEN_ROW, PORTAL_TOKEN_INFO, PORTAL_TOKEN_LABEL, PORTAL_TOKEN_META,
} from "../ownerStyles";
import { Table, Modal, Badge, Button, BadgeTone } from "../../../components/ui";
import type { Client, ClientToken, Matter } from "../types";
import { ApiError } from "../../../services/apiRequest";
import type { CreateClientTokenInput, ClientFormInput, TrustLedgerEntryInput } from "../../../services/clients";
import {
    useClients,
    useClientDetail,
    useCreateClient,
    useUpdateClient,
    useDeleteClient,
    useClientTokens,
    useCreateClientToken,
    useDeleteClientToken,
    useTrustLedger,
    useCreateTrustLedgerEntry,
    useDeleteTrustLedgerEntry,
} from "../../../hooks/useClients";

const STATUS_BADGE: Record<string, string> = {
    Active:    "badgeGreen",
    Pending:   "badgeAmber",
    Closed:    "badgeGray",
    Settled:   "badgeBlue",
    Withdrawn: "badgeRed",
};

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

function extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        try {
            const parsed = JSON.parse(error.message) as { error?: string };
            if (parsed && typeof parsed.error === "string") return parsed.error;
        } catch {
            // not JSON — fall through to the raw message
        }
        return error.message || fallback;
    }
    return fallback;
}

const REFERRAL_SOURCES = [
    "Walk-in", "Referral – Existing Client", "Referral – Colleague",
    "Bar Association", "Online / Website", "Social Media", "WhatsApp", "Other",
] as const;

const BLANK_CLIENT: ClientFormInput = {
    name: "", client_type: "Individual",
    email: "", phone: "", address: "", cnic_ntn: "", notes: "", referral_source: "",
};

export const ClientsPanel = () => {
    const clientsQuery = useClients();
    const clients = clientsQuery.data?.clients ?? [];
    const loading = clientsQuery.isLoading;

    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const detailQuery = useClientDetail(selectedClientId);
    const detail = detailQuery.data ?? null;

    const [showModal, setShowModal] = useState(false);
    const [editMode,  setEditMode] = useState(false);
    const [form,     setForm]     = useState<ClientFormInput>({ ...BLANK_CLIENT });
    const [formErr,  setFormErr]  = useState<string | null>(null);

    const createClientMutation = useCreateClient();
    const updateClientMutation = useUpdateClient();
    const deleteClientMutation = useDeleteClient();
    const saving = editMode ? updateClientMutation.isPending : createClientMutation.isPending;

    // ─ Portal sharing state ─
    const [portalClient,  setPortalClient]  = useState<Client | null>(null);
    const [portalForm,    setPortalForm]    = useState({ matter_id: "", label: "", expires_days: "30" });
    const [newTokenUrl,   setNewTokenUrl]   = useState<string | null>(null);
    const [copied,        setCopied]        = useState(false);

    const portalTokensQuery = useClientTokens(portalClient?.client_id ?? null);
    const portalDetailQuery = useClientDetail(portalClient?.client_id ?? null);
    const portalTokens  = portalTokensQuery.data?.tokens ?? [];
    const portalMatters = portalDetailQuery.data?.matters ?? [];
    const portalLoading = portalTokensQuery.isLoading || portalDetailQuery.isLoading;

    const createClientTokenMutation = useCreateClientToken();
    const deleteClientTokenMutation = useDeleteClientToken();
    const portalCreating = createClientTokenMutation.isPending;

    const openDetail = (c: Client) => setSelectedClientId(c.client_id);

    const openAdd = () => {
        setForm({ ...BLANK_CLIENT }); setEditMode(false); setFormErr(null); setShowModal(true);
    };

    const openEdit = (c: Client) => {
        setForm({
            name: c.name, client_type: c.client_type,
            email: c.email ?? "", phone: c.phone ?? "",
            address: c.address ?? "", cnic_ntn: c.cnic_ntn ?? "", notes: c.notes ?? "",
            referral_source: c.referral_source ?? "",
        });
        setEditMode(true); setFormErr(null); setShowModal(true);
    };

    const saveClient = async () => {
        if (!form.name.trim()) { setFormErr("Client name is required."); return; }
        setFormErr(null);
        try {
            if (editMode && detail) {
                await updateClientMutation.mutateAsync({ clientId: detail.client_id, body: form });
            } else {
                await createClientMutation.mutateAsync(form);
            }
            setShowModal(false);
        } catch (err) {
            setFormErr(extractErrorMessage(err, "Failed."));
        }
    };

    const removeClient = async (c: Client) => {
        if (!confirm(`Remove client "${c.name}" and all their matters?`)) return;
        try {
            await deleteClientMutation.mutateAsync(c.client_id);
            if (selectedClientId === c.client_id) setSelectedClientId(null);
        } catch {
            // toast already shown by the mutation hook
        }
    };

    const openPortal = (c: Client) => {
        setPortalClient(c);
        setPortalForm({ matter_id: "", label: "", expires_days: "30" });
        setNewTokenUrl(null);
        setCopied(false);
    };

    const createPortalLink = async () => {
        if (!portalClient) return;
        setNewTokenUrl(null);
        try {
            const body: CreateClientTokenInput = { client_id: portalClient.client_id };
            if (portalForm.matter_id)    body.matter_id    = portalForm.matter_id;
            if (portalForm.label)        body.label        = portalForm.label;
            if (portalForm.expires_days) body.expires_days = portalForm.expires_days;
            const token = await createClientTokenMutation.mutateAsync(body);
            const url = `${window.location.origin}${window.location.pathname}#/portal?token=${token.token}`;
            setNewTokenUrl(url);
            setPortalForm({ matter_id: "", label: "", expires_days: "30" });
        } catch {
            // toast already shown by the mutation hook
        }
    };

    const revokePortalToken = async (tokenId: string) => {
        if (!confirm("Revoke this portal link? The client will no longer be able to access their portal via this link.")) return;
        try {
            await deleteClientTokenMutation.mutateAsync(tokenId);
        } catch {
            // toast already shown by the mutation hook
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    // ─ Trust Ledger — Task #154 ─
    const BLANK_TL: TrustLedgerEntryInput = { txn_type: "Credit", amount_pkr: 0, description: "", txn_date: new Date().toISOString().slice(0, 10), reference_no: "", notes: "", matter_id: "" };
    const [trustClient,   setTrustClient]   = useState<Client | null>(null);
    const [showTLModal,   setShowTLModal]   = useState(false);
    const [tlForm,        setTlForm]        = useState<TrustLedgerEntryInput>({ ...BLANK_TL });
    const [tlErr,         setTlErr]         = useState("");

    const trustLedgerQuery = useTrustLedger(trustClient?.client_id ?? null);
    const trustEntries = trustLedgerQuery.data?.entries ?? [];
    const trustBalance = trustLedgerQuery.data?.balance ?? 0;
    const trustLoading = trustLedgerQuery.isLoading;

    const createTrustLedgerEntryMutation = useCreateTrustLedgerEntry();
    const deleteTrustLedgerEntryMutation = useDeleteTrustLedgerEntry();
    const tlSaving = createTrustLedgerEntryMutation.isPending;

    const openTrustLedger = (c: Client) => { setTrustClient(c); };

    const saveTLEntry = async () => {
        if (!trustClient) return;
        if (!tlForm.description.trim()) { setTlErr("Description is required"); return; }
        if (!tlForm.txn_date) { setTlErr("Date is required"); return; }
        setTlErr("");
        try {
            await createTrustLedgerEntryMutation.mutateAsync({ clientId: trustClient.client_id, body: tlForm });
            setShowTLModal(false); setTlForm({ ...BLANK_TL });
        } catch (err) {
            setTlErr(extractErrorMessage(err, "Save failed"));
        }
    };
    const deleteTLEntry = (ledgerId: string) => {
        if (!trustClient || !confirm("Delete this ledger entry? Balance will be recomputed.")) return;
        deleteTrustLedgerEntryMutation.mutate({ clientId: trustClient.client_id, ledgerId });
    };

    const PortalModal = () => (
        <Modal
            open={!!portalClient}
            onClose={() => setPortalClient(null)}
            title={`🔗 Share Portal — ${portalClient?.name ?? ""}`}
            maxWidth={560}
            footer={<Button variant="ghost" onClick={() => setPortalClient(null)}>Close</Button>}
        >
            <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: "1rem", lineHeight: 1.5 }}>
                Generate a secure link for your client to view their documents online. Links expire automatically.
            </p>

            {/* Generate new link form */}
            <div className={PORTAL_FORM}>
                <h4 className={PORTAL_FORM_TITLE}>Generate New Link</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Matter (optional)</label>
                        <select className={FORM_SELECT} value={portalForm.matter_id} onChange={e => setPortalForm({ ...portalForm, matter_id: e.target.value })}>
                            <option value="">— All matters —</option>
                            {portalMatters.map(m => (
                                <option key={m.matter_id} value={m.matter_id}>{m.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Expires in (days)</label>
                        <select className={FORM_SELECT} value={portalForm.expires_days} onChange={e => setPortalForm({ ...portalForm, expires_days: e.target.value })}>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                            <option value="">Never expires</option>
                        </select>
                    </div>
                    <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                        <label className={FORM_LABEL}>Label (optional)</label>
                        <input className={FORM_INPUT} value={portalForm.label} onChange={e => setPortalForm({ ...portalForm, label: e.target.value })} placeholder="e.g. Court documents — July 2026" />
                    </div>
                </div>
                <Button style={{ marginTop: "0.75rem" }} onClick={createPortalLink} loading={portalCreating}>
                    Generate Link
                </Button>
            </div>

            {/* Newly created link */}
            {newTokenUrl && (
                <div className={PORTAL_NEW_LINK}>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-3)", marginBottom: "0.4rem", fontWeight: 600 }}>
                        ✅ Link generated — copy and send to your client:
                    </div>
                    <div className={PORTAL_LINK_ROW}>
                        <code className={PORTAL_LINK_CODE}>{newTokenUrl}</code>
                        <button className={PORTAL_COPY_BTN} onClick={() => copyToClipboard(newTokenUrl)}>
                            {copied ? "✓ Copied" : "Copy"}
                        </button>
                    </div>
                </div>
            )}

            {/* Existing tokens */}
            <div style={{ marginTop: "1.25rem" }}>
                <h4 className={PORTAL_FORM_TITLE}>Active Links</h4>
                {portalLoading ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>Loading…</div>
                ) : portalTokens.filter((t: ClientToken) => t.is_active).length === 0 ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>No active portal links yet.</div>
                ) : (
                    <div className={PORTAL_TOKEN_LIST}>
                        {portalTokens.filter((t: ClientToken) => t.is_active).map((t: ClientToken) => {
                            const tUrl = `${window.location.origin}${window.location.pathname}#/portal?token=${t.token}`;
                            const revoking = deleteClientTokenMutation.isPending && deleteClientTokenMutation.variables === t.token_id;
                            return (
                                <div key={t.token_id} className={PORTAL_TOKEN_ROW}>
                                    <div className={PORTAL_TOKEN_INFO}>
                                        <span className={PORTAL_TOKEN_LABEL}>{t.label || "Portal Link"}</span>
                                        <span className={PORTAL_TOKEN_META}>
                                            Created {t.created_at?.slice(0, 10)}
                                            {t.expires_at && ` · Expires ${t.expires_at.slice(0, 10)}`}
                                            {t.matter_id && " · Matter-scoped"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                                        <button className={PORTAL_COPY_BTN} onClick={() => copyToClipboard(tUrl)}>Copy</button>
                                        <Button variant="danger" size="sm" disabled={revoking} onClick={() => revokePortalToken(t.token_id)}>
                                            {revoking ? "…" : "Revoke"}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );

    const ClientModal = () => (
        <Modal
            open={showModal}
            onClose={() => setShowModal(false)}
            title={editMode ? "Edit Client" : "Add Client"}
            footer={<>
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={saveClient} loading={saving}>Save</Button>
            </>}
        >
            {formErr && <div className={ERROR_BANNER} style={{ marginBottom: "0.75rem" }}>⚠ {formErr}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Name *</label>
                    <input className={FORM_INPUT} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client or firm name" autoFocus />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Type</label>
                    <select className={FORM_SELECT} value={form.client_type} onChange={e => setForm({ ...form, client_type: e.target.value as "Individual" | "Corporate" })}>
                        <option>Individual</option>
                        <option>Corporate</option>
                    </select>
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Phone</label>
                    <input className={FORM_INPUT} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" />
                </div>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Email</label>
                    <input className={FORM_INPUT} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>CNIC / NTN</label>
                    <input className={FORM_INPUT} value={form.cnic_ntn} onChange={e => setForm({ ...form, cnic_ntn: e.target.value })} placeholder="42201-0000000-0" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Address</label>
                    <input className={FORM_INPUT} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City, Province" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Referral Source</label>
                    <select className={FORM_SELECT} value={form.referral_source} onChange={e => setForm({ ...form, referral_source: e.target.value })}>
                        <option value="">Not specified</option>
                        {REFERRAL_SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className={FORM_GROUP} style={{ gridColumn: "1/-1" }}>
                    <label className={FORM_LABEL}>Notes</label>
                    <input className={FORM_INPUT} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional internal notes" />
                </div>
            </div>
        </Modal>
    );

    // ─ Detail view ─
    if (detail) {
        return (
            <div className={PANEL_CONTENT}>
                <button className={BACK_BTN} onClick={() => setSelectedClientId(null)}>← Back to Clients</button>
                <div className={MATTER_DETAIL_HEADER} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h2 className={DETAIL_TITLE}>{detail.name}</h2>
                        <span className={detail.client_type === "Corporate" ? BADGE_GOLD : BADGE_GRAY} style={{ marginTop: "0.35rem", display: "inline-block" }}>
                            {detail.client_type}
                        </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(detail)}>Edit</Button>
                        <Button variant="danger" size="sm" onClick={() => removeClient(detail)}>Delete</Button>
                    </div>
                </div>

                <div className={DETAIL_INFO_GRID}>
                    {detail.email    && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Email</span><span>{detail.email}</span></div>}
                    {detail.phone    && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Phone</span><span>{detail.phone}</span></div>}
                    {detail.cnic_ntn        && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>CNIC / NTN</span><span>{detail.cnic_ntn}</span></div>}
                    {detail.address         && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Address</span><span>{detail.address}</span></div>}
                    {detail.referral_source && <div className={DETAIL_INFO_ITEM}><span className={DETAIL_INFO_LABEL}>Referral Source</span><span className={BADGE_GRAY} style={{ fontSize: "0.78rem" }}>{detail.referral_source}</span></div>}
                    {detail.notes           && <div className={DETAIL_INFO_ITEM} style={{ gridColumn: "1/-1" }}><span className={DETAIL_INFO_LABEL}>Notes</span><span>{detail.notes}</span></div>}
                </div>

                <div className={SECTION_TITLE} style={{ marginTop: "1.75rem" }}>
                    Matters ({detail.matters.length})
                </div>
                <Table empty={detail.matters.length === 0} emptyMessage="No matters yet for this client.">
                    <thead><tr>
                        <th>Title</th><th>Type</th><th>Status</th><th>Court</th><th>Case #</th><th>Filed</th>
                    </tr></thead>
                    <tbody>
                        {detail.matters.map((m: Matter) => (
                            <tr key={m.matter_id}>
                                <td><strong>{m.title}</strong></td>
                                <td className={MUTED}>{m.matter_type}</td>
                                <td><Badge tone={badgeClassToTone(STATUS_BADGE[m.status])}>{m.status}</Badge></td>
                                <td className={MUTED}>{m.court_name ?? "—"}</td>
                                <td className={MUTED}>{m.case_number ?? "—"}</td>
                                <td className={MUTED}>{m.filing_date ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                {showModal && <ClientModal />}
            </div>
        );
    }

    // ─ List view ─
    return (
        <div className={PANEL_CONTENT}>
            <div className={PANEL_TOOLBAR}>
                <span className={RESULT_COUNT}>{clients.length} client{clients.length !== 1 ? "s" : ""}</span>
                <Button onClick={openAdd}>+ Add Client</Button>
            </div>
            <Table
                loading={loading}
                empty={!loading && clients.length === 0}
                emptyMessage="No clients yet. Add your first client to start tracking matters."
            >
                <thead><tr>
                    <th>Name</th><th>Type</th><th>Referral Source</th><th>Email</th><th>Phone</th><th>Matters</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    {clients.map(c => {
                        const removing = deleteClientMutation.isPending && deleteClientMutation.variables === c.client_id;
                        return (
                            <tr key={c.client_id}>
                                <td>
                                    <button className={LINK_BTN} onClick={() => openDetail(c)}>{c.name}</button>
                                </td>
                                <td><Badge tone={c.client_type === "Corporate" ? "gold" : "gray"}>{c.client_type}</Badge></td>
                                <td className={MUTED} style={{ fontSize: "0.8rem" }}>{c.referral_source ?? <span style={{ color: "var(--text-3)" }}>—</span>}</td>
                                <td className={MUTED}>{c.email ?? "—"}</td>
                                <td className={MUTED}>{c.phone ?? "—"}</td>
                                <td className={MUTED}>{c.matter_count ?? 0}</td>
                                <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                    <Button variant="ghost" size="sm" onClick={() => openDetail(c)}>View</Button>
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                                    <button className={ACTION_BTN_PORTAL} onClick={() => openPortal(c)}>Share Portal</button>
                                    <Button variant="ghost" size="sm" onClick={() => openTrustLedger(c)}>Trust A/C</Button>
                                    <Button variant="danger" size="sm" disabled={removing} onClick={() => removeClient(c)}>
                                        {removing ? "…" : "Delete"}
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
            {showModal && <ClientModal />}
            {portalClient && <PortalModal />}

            {/* ── Trust Ledger Sheet — Task #154 ── */}
            <Modal
                open={!!trustClient}
                onClose={() => setTrustClient(null)}
                title={`💰 Trust / Advance Ledger — ${trustClient?.name ?? ""}`}
                maxWidth={680}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <div>
                        <span className={MUTED} style={{ fontSize: "0.82rem" }}>Running Balance: </span>
                        <strong style={{ fontSize: "1.1rem", color: trustBalance >= 0 ? "var(--success)" : "var(--danger)" }}>
                            PKR {trustBalance.toLocaleString()}
                        </strong>
                        {trustBalance < 0 && <span style={{ marginLeft: "0.5rem", fontSize: "0.78rem", color: "var(--danger)" }}>(Overdrawn)</span>}
                    </div>
                    <Button size="sm" onClick={() => { setTlForm({ ...BLANK_TL }); setTlErr(""); setShowTLModal(true); }}>+ Add Entry</Button>
                </div>
                <Table dense loading={trustLoading} empty={!trustLoading && trustEntries.length === 0}
                    emptyMessage="No entries yet. Record advance payments received from the client (Credit) or disbursements made on their behalf (Debit).">
                    <thead><tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Balance</th>
                        <th>Ref</th>
                        <th style={{ width: 50 }}></th>
                    </tr></thead>
                    <tbody>
                        {trustEntries.map(e => (
                            <tr key={e.ledger_id}>
                                <td className={MUTED}>{e.txn_date}</td>
                                <td><Badge tone={e.txn_type === "Credit" ? "green" : "red"}>{e.txn_type}</Badge></td>
                                <td>{e.description}</td>
                                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                                    <span style={{ color: e.txn_type === "Credit" ? "var(--success)" : "var(--danger)" }}>
                                        {e.txn_type === "Credit" ? "+" : "−"}PKR {e.amount_pkr.toLocaleString()}
                                    </span>
                                </td>
                                <td style={{ fontVariantNumeric: "tabular-nums", color: e.balance_pkr < 0 ? "var(--danger)" : "var(--text-1)" }}>
                                    PKR {e.balance_pkr.toLocaleString()}
                                </td>
                                <td className={MUTED} style={{ fontSize: "0.78rem" }}>{e.reference_no || "—"}</td>
                                <td>
                                    <Button variant="danger" size="sm" onClick={() => deleteTLEntry(e.ledger_id)}>Del</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                {showTLModal && (
                    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                        <h4 style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>New Entry</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Type</label>
                                <select className={FORM_INPUT} value={tlForm.txn_type} onChange={e => setTlForm(f => ({ ...f, txn_type: e.target.value }))}>
                                    <option>Credit</option>
                                    <option>Debit</option>
                                </select>
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Date *</label>
                                <input type="date" className={FORM_INPUT} value={tlForm.txn_date} onChange={e => setTlForm(f => ({ ...f, txn_date: e.target.value }))} />
                            </div>
                            <div className={FORM_GROUP} style={{ gridColumn: "1 / -1" }}>
                                <label className={FORM_LABEL}>Description *</label>
                                <input className={FORM_INPUT} value={tlForm.description} onChange={e => setTlForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Advance received for Supreme Court appeal" />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Amount (PKR) *</label>
                                <input type="number" className={FORM_INPUT} min={0} value={tlForm.amount_pkr} onChange={e => setTlForm(f => ({ ...f, amount_pkr: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className={FORM_GROUP}>
                                <label className={FORM_LABEL}>Reference No.</label>
                                <input className={FORM_INPUT} value={tlForm.reference_no} onChange={e => setTlForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Cheque / receipt no." />
                            </div>
                        </div>
                        {tlErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{tlErr}</div>}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem" }}>
                            <Button variant="ghost" onClick={() => setShowTLModal(false)}>Cancel</Button>
                            <Button onClick={saveTLEntry} loading={tlSaving}>Save Entry</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
