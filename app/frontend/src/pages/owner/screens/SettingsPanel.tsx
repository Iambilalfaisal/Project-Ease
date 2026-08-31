import { useEffect, useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Modal, Button } from "../../../components/ui";
import { TeamMember } from "../types";
import { toggleTheme, getTheme, Theme } from "../../../theme";
import {
    useOrgProfile, useSaveOrgProfile, useSaveOrgBasic, useChangePassword,
    useMatterTeams, useOrgMembers, useCreateMatterTeam, useDeleteMatterTeam,
    useAddTeamMember, useRemoveTeamMember,
    useBailStages, useAddBailStage, useRenameBailStage, useSetBailStageActive,
} from "../../../hooks/useOrgSettings";
import { BailStage } from "../../../services/orgSettings";

const INDUSTRIES = ["Law Practice", "CA / Accounting", "Logistics", "Financial Services", "Healthcare", "Real Estate", "Other"];

const PK_CITIES = [
    "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
    "Hyderabad", "Abbottabad", "Bahawalpur", "Sukkur", "Dera Ghazi Khan",
];

const PRACTICE_AREAS = [
    "Corporate & Commercial", "Criminal Defence", "Family & Personal Law",
    "Civil Litigation", "Property & Real Estate", "Tax & Revenue",
    "Constitutional & Public Law", "Banking & Finance", "Labour & Employment",
    "Intellectual Property",
];

const TEAM_SIZES = ["1–5", "6–15", "16–30", "31–60", "60+"];

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return <button className={styles.themeToggle} onClick={handle}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
};

export const SettingsPanel = ({
    orgName,
    orgIndustry,
    onOrgUpdate,
}: {
    orgName:     string;
    orgIndustry: string;
    onOrgUpdate: (name: string, industry: string) => void;
}) => {
    const raw  = sessionStorage.getItem("pe_user");
    const user = raw ? JSON.parse(raw) as { name: string; email: string } : { name: "", email: "" };

    // Org profile state
    const [name,      setName]      = useState(orgName);
    const [industry,  setIndustry]  = useState(orgIndustry);
    const [orgMsg,    setOrgMsg]    = useState<{ ok: boolean; text: string } | null>(null);
    const saveOrgBasicMutation = useSaveOrgBasic();

    // Optional profile fields (completion section)
    const [phone,        setPhone]        = useState("");
    const [city,         setCity]         = useState("");
    const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
    const [barCouncilNo, setBarCouncilNo] = useState("");
    const [website,      setWebsite]      = useState("");
    const [teamSize,     setTeamSize]     = useState("");
    const [profMsg,      setProfMsg]      = useState<{ ok: boolean; text: string } | null>(null);
    const profileQuery = useOrgProfile();
    const saveOrgProfileMutation = useSaveOrgProfile();

    // Load existing optional profile once fetched
    useEffect(() => {
        const d = profileQuery.data;
        if (!d) return;
        if (d.phone)          setPhone(d.phone);
        if (d.city)           setCity(d.city);
        if (d.bar_council_no) setBarCouncilNo(d.bar_council_no);
        if (d.website)        setWebsite(d.website);
        if (d.team_size)      setTeamSize(d.team_size);
        if (d.practice_areas) setPracticeAreas(d.practice_areas.split(",").map((s: string) => s.trim()).filter(Boolean));
    }, [profileQuery.data]);

    const togglePracticeArea = (area: string) => {
        setPracticeAreas(prev =>
            prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
        );
    };

    // Password state
    const [currentPw, setCurrentPw] = useState("");
    const [newPw,     setNewPw]     = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwMsg,     setPwMsg]     = useState<{ ok: boolean; text: string } | null>(null);
    const changePasswordMutation = useChangePassword();

    // Delete org modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Practice Teams state
    const teamsQuery   = useMatterTeams();
    const membersQuery = useOrgMembers();
    const matterTeams  = teamsQuery.data ?? [];
    const orgMembers: TeamMember[] = (membersQuery.data ?? []).map(m => ({
        user_id: m.user_id, name: m.name, email: m.email,
        role: m.role, joined: m.created_at ?? "",
    }));
    const createTeamMutation = useCreateMatterTeam();
    const deleteTeamMutation = useDeleteMatterTeam();
    const addMemberMutation = useAddTeamMember();
    const removeMemberMutation = useRemoveTeamMember();

    const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [newTeamName,   setNewTeamName]   = useState("");
    const [teamErr,       setTeamErr]       = useState<string | null>(null);
    const [addMemberSelects, setAddMemberSelects] = useState<Record<string, string>>({});

    // Bail checklist stages (configurable, default = 6-stage flow)
    const bailStagesQuery = useBailStages();
    const bailStages = bailStagesQuery.data ?? [];
    const [newStageLabel, setNewStageLabel] = useState("");
    const addBailStageMutation = useAddBailStage();
    const renameBailStageMutation = useRenameBailStage();
    const setBailStageActiveMutation = useSetBailStageActive();

    const addBailStage = () => {
        if (!newStageLabel.trim()) return;
        addBailStageMutation.mutate(newStageLabel.trim(), {
            onSuccess: () => setNewStageLabel(""),
        });
    };

    const renameBailStage = (stageKey: string, label: string) => {
        renameBailStageMutation.mutate({ stageKey, label });
    };

    const toggleBailStageActive = (stage: BailStage) => {
        setBailStageActiveMutation.mutate({ stageKey: stage.stage_key, isActive: stage.is_active ? 0 : 1 });
    };

    const toggleExpand = (id: string) =>
        setExpandedTeams(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

    const createTeam = () => {
        if (!newTeamName.trim()) { setTeamErr("Team name is required."); return; }
        setTeamErr(null);
        createTeamMutation.mutate(newTeamName.trim(), {
            onSuccess: () => { setNewTeamName(""); setShowTeamModal(false); },
            onError: (error: Error) => setTeamErr(error.message || "Failed."),
        });
    };

    const deleteTeam = (teamId: string) => {
        if (!confirm("Delete this team? It will be unassigned from all matters.")) return;
        deleteTeamMutation.mutate(teamId);
    };

    const addMember = (teamId: string) => {
        const userId = addMemberSelects[teamId];
        if (!userId) return;
        addMemberMutation.mutate({ teamId, userId }, {
            onSuccess: () => setAddMemberSelects(prev => ({ ...prev, [teamId]: "" })),
        });
    };

    const removeMember = (teamId: string, userId: string) => {
        removeMemberMutation.mutate({ teamId, userId });
    };

    const saveOrg = () => {
        if (!name.trim()) { setOrgMsg({ ok: false, text: "Firm name cannot be empty." }); return; }
        setOrgMsg(null);
        saveOrgBasicMutation.mutate(
            { name: name.trim(), industry },
            {
                onSuccess: () => {
                    onOrgUpdate(name.trim(), industry);
                    setOrgMsg({ ok: true, text: "Organization profile saved." });
                    setTimeout(() => setOrgMsg(null), 3500);
                },
                onError: (error: Error) => {
                    setOrgMsg({ ok: false, text: error.message || "Failed to save." });
                    setTimeout(() => setOrgMsg(null), 3500);
                },
            }
        );
    };

    const saveProfile = () => {
        setProfMsg(null);
        saveOrgProfileMutation.mutate(
            {
                phone,
                city,
                practice_areas: practiceAreas.join(","),
                bar_council_no: barCouncilNo,
                website,
                team_size:      teamSize,
            },
            {
                onSuccess: () => {
                    setProfMsg({ ok: true, text: "Firm profile saved." });
                    setTimeout(() => setProfMsg(null), 3500);
                },
                onError: (error: Error) => {
                    setProfMsg({ ok: false, text: error.message || "Failed to save." });
                    setTimeout(() => setProfMsg(null), 3500);
                },
            }
        );
    };

    // Profile completion % (4 required at signup = 40%, 6 optional = 10% each)
    const optionalFilled = [phone, city, practiceAreas.length > 0, barCouncilNo, website, teamSize].filter(Boolean).length;
    const completionPct  = Math.round(40 + optionalFilled * 10);

    const changePassword = () => {
        if (!currentPw || !newPw) { setPwMsg({ ok: false, text: "Fill in all password fields." }); return; }
        if (newPw !== confirmPw)  { setPwMsg({ ok: false, text: "Passwords do not match." }); return; }
        if (newPw.length < 8)    { setPwMsg({ ok: false, text: "New password must be at least 8 characters." }); return; }
        setPwMsg(null);
        changePasswordMutation.mutate(
            { current_password: currentPw, new_password: newPw },
            {
                onSuccess: () => {
                    setPwMsg({ ok: true, text: "Password changed successfully." });
                    setCurrentPw(""); setNewPw(""); setConfirmPw("");
                    setTimeout(() => setPwMsg(null), 4000);
                },
                onError: (error: Error) => {
                    setPwMsg({ ok: false, text: error.message || "Failed to change password." });
                    setTimeout(() => setPwMsg(null), 4000);
                },
            }
        );
    };

    return (
        <div className={styles.panelContent}>
            <div className={styles.settingsGrid}>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Organization Profile</div>
                    {orgMsg && (
                        <div className={`${styles.errorBanner}${orgMsg.ok ? " " + styles.successBanner : ""}`}>
                            {orgMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setOrgMsg(null)}>✕</button>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Firm Name</label>
                        <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Industry</label>
                        <select className={styles.formSelect} value={industry} onChange={e => setIndustry(e.target.value)}>
                            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                        </select>
                    </div>
                    <Button onClick={saveOrg} disabled={saveOrgBasicMutation.isPending}>
                        {saveOrgBasicMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                </div>

                {/* ── Profile Completion ── */}
                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Firm Profile Completion</div>
                    <div className={styles.completionBarWrap}>
                        <div className={styles.completionBarFill} style={{ width: `${completionPct}%` }} />
                    </div>
                    <div className={styles.completionLabel}>
                        {completionPct}% complete — {optionalFilled}/6 optional fields filled
                    </div>

                    {profMsg && (
                        <div className={`${styles.errorBanner}${profMsg.ok ? " " + styles.successBanner : ""}`}>
                            {profMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setProfMsg(null)}>✕</button>
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Phone</label>
                            <input className={styles.formInput} type="tel" placeholder="+92 300 0000000"
                                value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>City</label>
                            <select className={styles.formSelect} value={city} onChange={e => setCity(e.target.value)}>
                                <option value="">Select city</option>
                                {PK_CITIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Bar Council No.</label>
                            <input className={styles.formInput} type="text" placeholder="e.g. LHC-2019-1234"
                                value={barCouncilNo} onChange={e => setBarCouncilNo(e.target.value)} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Team Size</label>
                            <select className={styles.formSelect} value={teamSize} onChange={e => setTeamSize(e.target.value)}>
                                <option value="">Select size</option>
                                {TEAM_SIZES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Website (optional)</label>
                        <input className={styles.formInput} type="url" placeholder="https://yourfirm.com"
                            value={website} onChange={e => setWebsite(e.target.value)} />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Practice Areas</label>
                        <div className={styles.practiceAreaGrid}>
                            {PRACTICE_AREAS.map(area => (
                                <label key={area} className={styles.practiceAreaChip}>
                                    <input
                                        type="checkbox"
                                        checked={practiceAreas.includes(area)}
                                        onChange={() => togglePracticeArea(area)}
                                        style={{ display: "none" }}
                                    />
                                    <span className={practiceAreas.includes(area) ? styles.chipActive : styles.chipInactive}>
                                        {area}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Button onClick={saveProfile} disabled={saveOrgProfileMutation.isPending}>
                        {saveOrgProfileMutation.isPending ? "Saving…" : "Save Firm Profile"}
                    </Button>
                </div>

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Your Account</div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Full Name</label>
                        <input className={styles.formInput} defaultValue={user.name} readOnly />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email</label>
                        <input className={styles.formInput} defaultValue={user.email} readOnly />
                    </div>
                    {pwMsg && (
                        <div className={`${styles.errorBanner}${pwMsg.ok ? " " + styles.successBanner : ""}`}>
                            {pwMsg.text}
                            <button className={styles.errorDismiss} onClick={() => setPwMsg(null)}>✕</button>
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Current Password</label>
                        <input className={styles.formInput} type="password" value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>New Password</label>
                        <input className={styles.formInput} type="password" value={newPw}
                            onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Confirm New Password</label>
                        <input className={styles.formInput} type="password" value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
                    </div>
                    <Button variant="ghost" onClick={changePassword} disabled={changePasswordMutation.isPending}>
                        {changePasswordMutation.isPending ? "Changing…" : "Change Password"}
                    </Button>
                </div>

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Preferences</div>
                    <div className={styles.prefRow}>
                        <div>
                            <div className={styles.prefLabel}>Theme</div>
                            <div className={styles.prefSub}>Switch between dark and light mode</div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>

                {/* ── Practice Teams ── */}
                <div className={styles.settingsCard} style={{ gridColumn: "1 / -1" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <div className={styles.settingsCardTitle} style={{ marginBottom: 0 }}>Practice Teams</div>
                        <Button style={{ fontSize: "0.8rem" }} onClick={() => { setNewTeamName(""); setTeamErr(null); setShowTeamModal(true); }}>
                            + Create Team
                        </Button>
                    </div>

                    {matterTeams.length === 0 ? (
                        <div className={styles.emptyHint}>No practice teams yet. Create teams to assign staff groups to matters.</div>
                    ) : (
                        <div className={styles.teamsList}>
                            {matterTeams.map(team => {
                                const isOpen = expandedTeams.has(team.team_id);
                                const nonMembers = orgMembers.filter(m => !team.members.some(tm => tm.user_id === m.user_id));
                                return (
                                    <div key={team.team_id} className={styles.teamsItem}>
                                        <div className={styles.teamsItemHeader}>
                                            <button className={styles.teamsExpandBtn} onClick={() => toggleExpand(team.team_id)}>
                                                <span className={styles.teamsExpandArrow}>{isOpen ? "▾" : "▸"}</span>
                                                <span className={styles.teamsItemName}>{team.name}</span>
                                                <span className={styles.muted} style={{ fontSize: "0.78rem" }}>
                                                    {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                                                </span>
                                            </button>
                                            <button className={styles.actionBtnDanger} style={{ fontSize: "0.75rem" }} onClick={() => deleteTeam(team.team_id)}>
                                                Delete
                                            </button>
                                        </div>
                                        {isOpen && (
                                            <div className={styles.teamsMemberList}>
                                                {team.members.length === 0 ? (
                                                    <div className={styles.muted} style={{ fontSize: "0.8rem", padding: "0.4rem 0" }}>No members yet.</div>
                                                ) : (
                                                    team.members.map(m => (
                                                        <div key={m.user_id} className={styles.teamsMemberRow}>
                                                            <span className={styles.teamsMemberName}>{m.name}</span>
                                                            <button className={styles.queueRemove} title="Remove from team" onClick={() => removeMember(team.team_id, m.user_id)}>✕</button>
                                                        </div>
                                                    ))
                                                )}
                                                {nonMembers.length > 0 && (
                                                    <div className={styles.teamsAddMemberRow}>
                                                        <select
                                                            className={styles.formSelect}
                                                            style={{ flex: 1, fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                                                            value={addMemberSelects[team.team_id] ?? ""}
                                                            onChange={e => setAddMemberSelects(prev => ({ ...prev, [team.team_id]: e.target.value }))}
                                                        >
                                                            <option value="">Add member…</option>
                                                            {nonMembers.map(m => <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>)}
                                                        </select>
                                                        <Button variant="ghost" style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
                                                            disabled={!addMemberSelects[team.team_id]}
                                                            onClick={() => addMember(team.team_id)}>
                                                            Add
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Bail Checklist Stages ── */}
                <div className={styles.settingsCard} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.settingsCardTitle}>Bail Checklist Stages</div>
                    <p className={styles.muted} style={{ fontSize: "0.82rem", marginBottom: "0.85rem" }}>
                        The step-by-step tracker shown on every bail bond. Defaults to Surety Identification → CNIC Verification → Property Valuation → Surety Appearance → Court Filing → Result — rename or add stages to match how your firm actually works; existing bonds keep their progress.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.85rem" }}>
                        {bailStages.map(s => (
                            <div key={s.stage_key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ color: "var(--text-3)", fontSize: "0.78rem", width: 20 }}>{s.sort_order + 1}.</span>
                                <input className={styles.formInput} style={{ flex: 1, fontSize: "0.85rem", padding: "0.3rem 0.6rem", opacity: s.is_active ? 1 : 0.5 }}
                                    defaultValue={s.label}
                                    onBlur={e => { if (e.target.value.trim() && e.target.value !== s.label) renameBailStage(s.stage_key, e.target.value.trim()); }} />
                                <Button variant="ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }} onClick={() => toggleBailStageActive(s)}>
                                    {s.is_active ? "Deactivate" : "Reactivate"}
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input className={styles.formInput} style={{ flex: 1 }} value={newStageLabel} onChange={e => setNewStageLabel(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addBailStage()} placeholder="Add a custom stage…" />
                        <Button style={{ fontSize: "0.8rem" }} disabled={addBailStageMutation.isPending || !newStageLabel.trim()} onClick={addBailStage}>
                            + Add
                        </Button>
                    </div>
                </div>

                <div className={styles.settingsCard}>
                    <div className={styles.settingsCardTitle}>Danger Zone</div>
                    <p className={styles.dangerText}>
                        Deleting your organization will permanently remove all documents and team access. This cannot be undone.
                    </p>
                    <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                        Delete Organization
                    </Button>
                </div>
            </div>

            {/* Create team modal */}
            <Modal
                open={showTeamModal}
                onClose={() => setShowTeamModal(false)}
                title="Create Practice Team"
                maxWidth={400}
                footer={<>
                    <Button variant="ghost" onClick={() => setShowTeamModal(false)}>Cancel</Button>
                    <Button onClick={createTeam} disabled={createTeamMutation.isPending}>
                        {createTeamMutation.isPending ? "Creating…" : "Create Team"}
                    </Button>
                </>}
            >
                {teamErr && <div className={styles.errorBanner} style={{ marginBottom: "0.75rem" }}>⚠ {teamErr}</div>}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Team Name</label>
                    <input className={styles.formInput} value={newTeamName} autoFocus
                        onChange={e => setNewTeamName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && createTeam()}
                        placeholder="e.g. Litigation Team, Corporate Group" />
                </div>
            </Modal>

            {/* Delete org info modal */}
            <Modal
                open={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Organization Deletion"
                footer={<>
                    <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Close</Button>
                    <a
                        href="mailto:support@projectease.ai?subject=Delete%20Organization%20Request"
                        className={styles.btnDanger}
                        style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                    >
                        Email Support
                    </a>
                </>}
            >
                <p className={styles.muted} style={{ marginBottom: "1rem", fontSize: "0.875rem", lineHeight: 1.6 }}>
                    For security and compliance, organization deletion must be requested through our support team. We'll verify your identity and ensure all data is properly handled before removing your account.
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>
                    Contact us at{" "}
                    <a
                        href="mailto:support@projectease.ai"
                        style={{ color: "var(--gold)", textDecoration: "none" }}
                    >
                        support@projectease.ai
                    </a>{" "}
                    with the subject line <strong style={{ color: "var(--text-1)" }}>Delete Organization Request</strong> from your registered email address.
                </p>
            </Modal>
        </div>
    );
};
