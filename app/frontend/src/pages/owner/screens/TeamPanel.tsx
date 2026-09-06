// Team panel — member invite/removal, plus the per-member permissions &
// WhatsApp settings modal (PermissionsModal, kept private to this file since
// it's only ever opened from here). `team`/`setTeam` stay props: the
// OwnerPortal shell owns that list (it's shared with the seat counter
// elsewhere), so mutations here update it via the callback in addition to
// invalidating the ["team"] query for any other consumer.

import { useState } from "react";
import {
    MUTED, SETTINGS_CARD_TITLE, PERM_LIST, PERM_ROW, PERM_CHECK, PERM_LABEL, PERM_SUMMARY,
    BADGE_GREEN, BADGE_GRAY, BADGE_GOLD, SUCCESS_BANNER, ERROR_BANNER, FORM_INPUT,
    PANEL_CONTENT, LIMIT_BANNER, LIMIT_UPGRADE_BTN, PANEL_TOOLBAR, RESULT_COUNT,
    ACTION_BTN, ACTION_BTN_DANGER, FORM_GROUP, FORM_LABEL, FORM_SELECT,
} from "../ownerStyles";
import { Table, Modal, Button } from "../../../components/ui";
import type { TeamMember } from "../types";
import { fmtDate } from "../types";
import { ApiError } from "../../../services/apiRequest";
import {
    useCategories,
    useTeamMemberPermissions,
    useSetTeamMemberPermissions,
    useSetTeamMemberWhatsapp,
    useInviteTeamMember,
    useRemoveTeamMember,
} from "../../../hooks/useTeam";

const ROLE_LABELS: Record<string, string> = {
    org_owner: "Firm Owner",
    employee:  "Employee",
};

function extractLimitReached(error: unknown): boolean {
    if (error instanceof ApiError) {
        try {
            const parsed = JSON.parse(error.message) as { limit_reached?: string };
            return parsed?.limit_reached === "users";
        } catch {
            return false;
        }
    }
    return false;
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

const PermissionsModal = ({ member, onClose }: { member: TeamMember; onClose: () => void }) => {
    const categoriesQuery = useCategories();
    const permissionsQuery = useTeamMemberPermissions(member.user_id);
    const categories = categoriesQuery.data?.categories ?? [];
    const loading = categoriesQuery.isLoading || permissionsQuery.isLoading;

    const [granted, setGranted] = useState<Set<string> | null>(null);
    const [saved,   setSaved]   = useState(false);
    const grantedIds = granted ?? new Set(permissionsQuery.data?.category_ids ?? []);

    // WhatsApp number state
    const [waNumber, setWaNumber] = useState(member.whatsapp_number ?? "");
    const [waMsg,    setWaMsg]    = useState<{ ok: boolean; text: string } | null>(null);

    const setPermissionsMutation = useSetTeamMemberPermissions();
    const setWhatsappMutation    = useSetTeamMemberWhatsapp();

    const toggle = (catId: string) => {
        const next = new Set(grantedIds);
        next.has(catId) ? next.delete(catId) : next.add(catId);
        setGranted(next);
        setSaved(false);
    };

    const save = async () => {
        try {
            await setPermissionsMutation.mutateAsync({ userId: member.user_id, categoryIds: Array.from(grantedIds) });
            setSaved(true);
        } catch {
            // toast already shown by the mutation hook
        }
    };

    const saveWhatsApp = async () => {
        setWaMsg(null);
        try {
            await setWhatsappMutation.mutateAsync({ userId: member.user_id, whatsappNumber: waNumber.trim() });
            setWaMsg({ ok: true, text: "WhatsApp number saved." });
        } catch (err) {
            setWaMsg({ ok: false, text: extractErrorMessage(err, "Failed to save.") });
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Settings — ${member.name}`}
            footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
        >
                <p className={MUTED} style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                    Manage document access and WhatsApp configuration for this team member.
                </p>

                {/* Document Category Permissions */}
                <div style={{ marginBottom: "1.25rem" }}>
                    <div className={SETTINGS_CARD_TITLE} style={{ marginBottom: "0.6rem" }}>
                        Document Access
                    </div>
                    {loading ? (
                        <div style={{ padding: "1rem 0", textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
                    ) : categories.length === 0 ? (
                        <div style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>
                            No categories yet. Create categories in the Documents tab first.
                        </div>
                    ) : (
                        <div className={PERM_LIST}>
                            {categories.map(cat => (
                                <label key={cat.category_id} className={PERM_ROW}>
                                    <input
                                        type="checkbox"
                                        className={PERM_CHECK}
                                        checked={grantedIds.has(cat.category_id)}
                                        onChange={() => toggle(cat.category_id)}
                                    />
                                    <span className={PERM_LABEL}>{cat.name}</span>
                                    {grantedIds.has(cat.category_id)
                                        ? <span className={BADGE_GREEN} style={{ marginLeft: "auto" }}>Access granted</span>
                                        : <span className={BADGE_GRAY}  style={{ marginLeft: "auto" }}>No access</span>
                                    }
                                </label>
                            ))}
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
                        <span className={PERM_SUMMARY}>{grantedIds.size} of {categories.length} categories accessible</span>
                        <Button size="sm" onClick={save} disabled={setPermissionsMutation.isPending || categories.length === 0}>
                            {setPermissionsMutation.isPending ? "Saving…" : saved ? "Saved ✓" : "Save Access"}
                        </Button>
                    </div>
                </div>

                {/* WhatsApp Number */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.1rem" }}>
                    <div className={SETTINGS_CARD_TITLE} style={{ marginBottom: "0.5rem" }}>
                        WhatsApp Number
                    </div>
                    <p className={MUTED} style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                        When set, this employee can query their documents directly from WhatsApp. Use E.164 format (e.g. +923001234567).
                    </p>
                    {waMsg && (
                        <div className={waMsg.ok ? SUCCESS_BANNER : ERROR_BANNER} style={{ marginBottom: "0.6rem", fontSize: "0.8rem" }}>
                            {waMsg.text}
                        </div>
                    )}
                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                        <input
                            className={FORM_INPUT}
                            type="tel"
                            placeholder="+923001234567"
                            value={waNumber}
                            onChange={e => { setWaNumber(e.target.value); setWaMsg(null); }}
                            style={{ flex: 1 }}
                        />
                        <Button size="sm" onClick={saveWhatsApp} loading={setWhatsappMutation.isPending} style={{ whiteSpace: "nowrap" }}>
                            Save
                        </Button>
                        {waNumber && (
                            <Button variant="ghost" size="sm" onClick={() => { setWaNumber(""); setWaMsg(null); }}>
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
        </Modal>
    );
};

export const TeamPanel = ({ team, setTeam, maxUsers, onUpgrade }: {
    team: TeamMember[];
    setTeam: React.Dispatch<React.SetStateAction<TeamMember[]>>;
    maxUsers: number;
    onUpgrade: () => void;
}) => {
    const [showModal,    setShowModal]    = useState(false);
    const [form,         setForm]         = useState({ name: "", email: "", role: "employee" });
    const [inviteError,  setInviteError]  = useState<string | null>(null);
    const [limitReached, setLimitReached] = useState(false);
    const [tempCreds,    setTempCreds]    = useState<{ email: string; password: string } | null>(null);
    const [permMember,   setPermMember]   = useState<TeamMember | null>(null);

    const inviteMutation = useInviteTeamMember();
    const removeMutation = useRemoveTeamMember();

    const atLimit = maxUsers > 0 && team.length >= maxUsers;

    const invite = async () => {
        if (!form.name.trim() || !form.email.trim()) { setInviteError("Name and email are required."); return; }
        try {
            const data = await inviteMutation.mutateAsync(form);
            setTeam(prev => [...prev, {
                user_id: data.user_id,
                name: data.name,
                email: data.email,
                role: data.role,
                joined: new Date().toISOString().slice(0, 10),
            }]);
            setTempCreds({ email: data.email, password: data.temp_password });
            setShowModal(false);
            setForm({ name: "", email: "", role: "employee" });
            setInviteError(null);
        } catch (err) {
            if (extractLimitReached(err)) { setLimitReached(true); setShowModal(false); return; }
            setInviteError(extractErrorMessage(err, "Failed to invite."));
        }
    };

    const removeMember = async (member: TeamMember) => {
        try {
            await removeMutation.mutateAsync(member.user_id);
            setTeam(prev => prev.filter(m => m.user_id !== member.user_id));
        } catch {
            // toast already shown by the mutation hook
        }
    };

    return (
        <div className={PANEL_CONTENT}>
            {/* Seat limit upgrade banner */}
            {(limitReached || atLimit) && (
                <div className={LIMIT_BANNER}>
                    <span>
                        🔒 You've reached your seat limit ({team.length} / {maxUsers} users on your current plan).
                    </span>
                    <button className={LIMIT_UPGRADE_BTN} onClick={onUpgrade}>Upgrade Plan →</button>
                </div>
            )}

            <div className={PANEL_TOOLBAR}>
                <span className={RESULT_COUNT}>
                    {team.length} / {maxUsers > 0 ? maxUsers : "∞"} seats used
                </span>
                <Button
                    onClick={() => { if (atLimit) { setLimitReached(true); return; } setShowModal(true); setInviteError(null); }}
                    title={atLimit ? "Seat limit reached — upgrade to add more members" : undefined}
                >
                    + Invite Member
                </Button>
            </div>

            <Table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team.map(m => {
                            const removing = removeMutation.isPending && removeMutation.variables === m.user_id;
                            return (
                                <tr key={m.user_id}>
                                    <td><strong>{m.name}</strong></td>
                                    <td className={MUTED}>{m.email}</td>
                                    <td>
                                        <span className={m.role === "org_owner" ? BADGE_GOLD : BADGE_GRAY}>
                                            {ROLE_LABELS[m.role] ?? m.role}
                                        </span>
                                    </td>
                                    <td className={MUTED}>{fmtDate(m.joined)}</td>
                                    <td style={{ display: "flex", gap: "0.5rem" }}>
                                        {m.role !== "org_owner" && (
                                            <>
                                                <button
                                                    className={ACTION_BTN}
                                                    onClick={() => setPermMember(m)}
                                                >
                                                    Permissions
                                                </button>
                                                <button
                                                    className={ACTION_BTN_DANGER}
                                                    disabled={removing}
                                                    onClick={() => removeMember(m)}
                                                >
                                                    {removing ? "…" : "Remove"}
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
            </Table>

            {/* Invite modal */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title="Invite Team Member"
                footer={<>
                    <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button onClick={invite}>Send Invite</Button>
                </>}
            >
                {inviteError && (
                    <div className={ERROR_BANNER} style={{ marginBottom: "0.75rem" }}>⚠ {inviteError}</div>
                )}
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Full Name</label>
                    <input className={FORM_INPUT} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ali Raza" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Email Address</label>
                    <input className={FORM_INPUT} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="staff@yourfirm.com" type="email" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Role</label>
                    <select className={FORM_SELECT} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option value="employee">Employee</option>
                        <option value="org_owner">Firm Owner</option>
                    </select>
                </div>
            </Modal>

            {/* Permissions modal */}
            {permMember && (
                <PermissionsModal member={permMember} onClose={() => setPermMember(null)} />
            )}

            {/* Temp credentials modal */}
            <Modal
                open={!!tempCreds}
                onClose={() => setTempCreds(null)}
                title="Member Invited ✓"
                footer={<Button onClick={() => setTempCreds(null)}>Done</Button>}
            >
                <p className={MUTED} style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
                    Share these temporary credentials with the new member. They will be prompted to set a new password on first login.
                </p>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Email</label>
                    <input className={FORM_INPUT} readOnly value={tempCreds?.email ?? ""} />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Temporary Password</label>
                    <input className={FORM_INPUT} readOnly value={tempCreds?.password ?? ""} />
                </div>
            </Modal>
        </div>
    );
};
