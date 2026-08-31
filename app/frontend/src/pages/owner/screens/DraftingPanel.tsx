import { useState } from "react";
import styles from "../OwnerPortal.module.css";
import { Modal, Button } from "../../../components/ui";
import type { Template } from "../types";
import { fmtDate } from "../types";
import { useDeleteTemplate, useGenerateDraft, useMattersForDrafting, useSaveTemplate, useTemplates } from "../../../hooks/useDrafting";

const TEMPLATE_TYPES_UI = [
    { value: "vakalatnama", label: "Vakalatnama" },
    { value: "plaint",      label: "Plaint / Petition" },
    { value: "agreement",   label: "Agreement" },
    { value: "notice",      label: "Legal Notice" },
    { value: "general",     label: "General" },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
    vakalatnama: `VAKALATNAMA

I, {{client_name}}, S/O or D/O _________________________, CNIC No. {{client_cnic}}, resident of _________________________, do hereby appoint and authorise {{advocate_name}} of {{org_name}} to act and appear on my behalf in the case of:

Matter: {{matter_title}}
Case No.: {{case_number}}
Court: {{court_name}}

I hereby confer upon my said counsel full authority to do all acts, deeds, and things as may be necessary for the conduct of the said case, including filing of pleadings, appearances, and taking such steps as may be required.

Date: {{date_long}}

_______________________
Signature of Executant
{{client_name}}`,

    plaint: `IN THE COURT OF LEARNED {{court_name}}

Case No.: {{case_number}}

{{client_name}}
                                                                   …Plaintiff
versus

[Defendant Name]
                                                                   …Defendant

PLAINT

Most respectfully sheweth that:

1. The Plaintiff is {{client_name}}, CNIC No. {{client_cnic}}, resident of _________________________.

2. The brief facts of the matter are as follows:
   {{matter_description}}

3. The Plaintiff therefore prays that this Honourable Court may be pleased to:
   (a) [Relief sought]
   (b) Any other relief deemed fit and proper.

Place: _____________
Date: {{date_long}}

_______________________
Advocate for Plaintiff
{{org_name}}`,

    notice: `LEGAL NOTICE
Date: {{date_long}}

To,
[Recipient Name]
[Recipient Address]

Subject: Legal Notice regarding {{matter_title}}

Dear Sir/Madam,

Under instructions from and on behalf of my client {{client_name}}, I hereby issue this Legal Notice to you as under:

1. [Background facts]

2. {{matter_description}}

3. You are hereby called upon to [action required] within 15 (fifteen) days from the receipt of this notice, failing which my client shall be constrained to initiate legal proceedings against you before the competent court of law without further notice, at your risk, cost, and consequences.

This notice is being issued without prejudice to all other rights and remedies available to my client.

Yours faithfully,

_______________________
{{advocate_name}}
{{org_name}}`,

    agreement: `AGREEMENT

This Agreement is entered into on {{date_long}} between:

Party A: {{client_name}}, CNIC No. {{client_cnic}}
                                                ("Party A")
AND
Party B: _______________________________
                                                ("Party B")

RECITALS

1. [Background / Recital]

TERMS AND CONDITIONS

1. [Term 1]
2. [Term 2]
3. [Term 3]

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

Party A: _______________________          Party B: _______________________
{{client_name}}                           [Name]
CNIC: {{client_cnic}}                     CNIC: ___________________________
Date: {{date_long}}                       Date: ___________________________

WITNESSES:
1. _______________________
2. _______________________`,

    general: `{{org_name}}

Date: {{date_long}}
Ref: {{case_number}}

Subject: {{matter_title}}

Dear Sir/Madam,

[Body of document]

Yours faithfully,

_______________________
{{advocate_name}}
{{org_name}}`,
};

export const DraftingPanel = () => {
    const templatesQuery = useTemplates();
    const mattersQuery   = useMattersForDrafting();
    const saveTemplateMutation   = useSaveTemplate();
    const deleteTemplateMutation = useDeleteTemplate();
    const generateDraftMutation  = useGenerateDraft();

    const templates = templatesQuery.data ?? [];
    const matters   = mattersQuery.data ?? [];
    const loading   = templatesQuery.isLoading || mattersQuery.isLoading;

    const [filterType,   setFilterType]   = useState<string>("all");

    // Editor modal
    const [editorOpen,   setEditorOpen]   = useState(false);
    const [editing,      setEditing]      = useState<Template | null>(null);
    const [eTitle,       setETitle]       = useState("");
    const [eType,        setEType]        = useState("general");
    const [eContent,     setEContent]     = useState("");
    const [eDesc,        setEDesc]        = useState("");
    const [saving,       setSaving]       = useState(false);
    const [saveErr,      setSaveErr]      = useState("");

    // Draft modal
    const [draftOpen,    setDraftOpen]    = useState(false);
    const [draftTmpl,    setDraftTmpl]    = useState<Template | null>(null);
    const [draftMatter,  setDraftMatter]  = useState("");
    const [drafting,     setDrafting]     = useState(false);
    const [draftErr,     setDraftErr]     = useState("");

    const [deleteId,     setDeleteId]     = useState<string | null>(null);
    const [deleting,     setDeleting]     = useState(false);

    const openNew = () => {
        setEditing(null);
        setETitle(""); setEType("general"); setEDesc("");
        setEContent(DEFAULT_TEMPLATES["general"]);
        setSaveErr(""); setEditorOpen(true);
    };

    const openEdit = (t: Template) => {
        setEditing(t);
        setETitle(t.title); setEType(t.template_type);
        setEDesc(t.description ?? ""); setEContent(t.content);
        setSaveErr(""); setEditorOpen(true);
    };

    const handleTypeChange = (v: string) => {
        setEType(v);
        if (!editing) setEContent(DEFAULT_TEMPLATES[v] ?? "");
    };

    const handleSave = async () => {
        if (!eTitle.trim()) { setSaveErr("Title is required."); return; }
        setSaving(true); setSaveErr("");
        try {
            await saveTemplateMutation.mutateAsync({
                templateId: editing?.template_id,
                input: { title: eTitle, template_type: eType, content: eContent, description: eDesc },
            });
            setEditorOpen(false);
        } catch (err) {
            setSaveErr(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteTemplateMutation.mutateAsync(deleteId);
            setDeleteId(null);
        } finally {
            setDeleting(false);
        }
    };

    const openDraft = (t: Template) => {
        setDraftTmpl(t);
        setDraftMatter("");
        setDraftErr("");
        setDraftOpen(true);
    };

    const handleDraft = async () => {
        if (!draftTmpl) return;
        setDrafting(true); setDraftErr("");
        try {
            const blob = await generateDraftMutation.mutateAsync({
                templateId: draftTmpl.template_id,
                matterId: draftMatter || null,
            });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = `Draft_${draftTmpl.title.replace(/\s+/g, "_")}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDraftOpen(false);
        } catch (err) {
            setDraftErr(err instanceof Error ? err.message : "Draft failed");
        } finally {
            setDrafting(false);
        }
    };

    const filtered = filterType === "all"
        ? templates
        : templates.filter(t => t.template_type === filterType);

    const extractVars = (content: string) => {
        const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
        return [...new Set(matches)];
    };

    if (loading) return <div style={{ padding: "2rem", color: "var(--text-3)" }}>Loading templates…</div>;

    return (
        <div className={styles.draftingWrap}>
            {/* Header row */}
            <div className={styles.draftingHeader}>
                <div className={styles.filterChips}>
                    <button
                        className={filterType === "all" ? styles.chipActive : styles.chip}
                        onClick={() => setFilterType("all")}
                    >All</button>
                    {TEMPLATE_TYPES_UI.map(t => (
                        <button
                            key={t.value}
                            className={filterType === t.value ? styles.chipActive : styles.chip}
                            onClick={() => setFilterType(t.value)}
                        >{t.label}</button>
                    ))}
                </div>
                <Button size="sm" onClick={openNew}>+ New Template</Button>
            </div>

            {/* Template grid */}
            {filtered.length === 0 ? (
                <div className={styles.emptyHint}>
                    <p>No templates yet. Create your first template to get started.</p>
                    <Button onClick={openNew}>Create Template</Button>
                </div>
            ) : (
                <div className={styles.templateGrid}>
                    {filtered.map(t => {
                        const vars = extractVars(t.content);
                        const typeLabel = TEMPLATE_TYPES_UI.find(x => x.value === t.template_type)?.label ?? t.template_type;
                        return (
                            <div key={t.template_id} className={styles.templateCard}>
                                <div className={styles.templateCardHead}>
                                    <span className={styles.templateTypeBadge}>{typeLabel}</span>
                                    <span className={styles.templateDate}>{fmtDate(t.modified_at)}</span>
                                </div>
                                <div className={styles.templateTitle}>{t.title}</div>
                                {t.description && <div className={styles.templateDesc}>{t.description}</div>}
                                {vars.length > 0 && (
                                    <div className={styles.templateVars}>
                                        {vars.slice(0, 4).map(v => (
                                            <span key={v} className={styles.varChip}>{v}</span>
                                        ))}
                                        {vars.length > 4 && <span className={styles.varChip}>+{vars.length - 4}</span>}
                                    </div>
                                )}
                                <div className={styles.templateCardActions}>
                                    <button className={styles.draftBtn} onClick={() => openDraft(t)}>
                                        ↓ Draft Document
                                    </button>
                                    <button className={styles.editBtn} onClick={() => openEdit(t)}>Edit</button>
                                    <button className={styles.deleteBtn} onClick={() => setDeleteId(t.template_id)}>Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Editor Modal ─────────────────────────────────────────── */}
            <Modal
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                title={editing ? "Edit Template" : "New Template"}
                maxWidth={820}
                footer={<>
                    <Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : editing ? "Save Changes" : "Create Template"}
                    </Button>
                </>}
            >
                        {editorOpen && <>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Title</label>
                                    <input
                                        className={styles.formInput}
                                        value={eTitle}
                                        onChange={e => setETitle(e.target.value)}
                                        placeholder="e.g. Standard Vakalatnama"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Type</label>
                                    <select
                                        className={styles.formSelect}
                                        value={eType}
                                        onChange={e => handleTypeChange(e.target.value)}
                                    >
                                        {TEMPLATE_TYPES_UI.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description (optional)</label>
                                <input
                                    className={styles.formInput}
                                    value={eDesc}
                                    onChange={e => setEDesc(e.target.value)}
                                    placeholder="Brief description of when to use this template"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Template Content
                                    <span className={styles.varHint}>Use &#123;&#123;variable_name&#125;&#125; for auto-fill placeholders</span>
                                </label>
                                <textarea
                                    className={styles.templateTextarea}
                                    value={eContent}
                                    onChange={e => setEContent(e.target.value)}
                                    rows={20}
                                    spellCheck={false}
                                />
                            </div>

                            <div className={styles.varPreview}>
                                <span className={styles.varPreviewLabel}>Variables detected:</span>
                                {extractVars(eContent).length === 0
                                    ? <span className={styles.varChip} style={{ opacity: 0.5 }}>none</span>
                                    : extractVars(eContent).map(v => <span key={v} className={styles.varChip}>{v}</span>)
                                }
                            </div>

                            {saveErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{saveErr}</div>}
                        </>}
            </Modal>

            {/* ── Draft Modal ──────────────────────────────────────────── */}
            <Modal
                open={draftOpen && !!draftTmpl}
                onClose={() => setDraftOpen(false)}
                title={draftTmpl ? `Draft: ${draftTmpl.title}` : undefined}
                maxWidth={520}
                footer={<>
                    <Button variant="ghost" onClick={() => setDraftOpen(false)}>Cancel</Button>
                    <button className={styles.draftBtnLg} onClick={handleDraft} disabled={drafting}>
                        {drafting ? "Generating…" : "↓ Download .docx"}
                    </button>
                </>}
            >
                {draftTmpl && <>
                    <p style={{ color: "var(--text-2)", marginBottom: "1rem", fontSize: "0.875rem" }}>
                        Select a matter to auto-fill client and case details. AI will fill any remaining placeholders.
                    </p>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Link to Matter (optional)</label>
                        <select
                            className={styles.formSelect}
                            value={draftMatter}
                            onChange={e => setDraftMatter(e.target.value)}
                        >
                            <option value="">— No matter (fill manually after download) —</option>
                            {matters.filter(m => m.status !== "Closed").map(m => (
                                <option key={m.matter_id} value={m.matter_id}>
                                    {m.title} — {m.client_name} ({m.matter_type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.varPreview} style={{ marginTop: "1rem" }}>
                        <span className={styles.varPreviewLabel}>Variables in this template:</span>
                        {extractVars(draftTmpl.content).map(v => (
                            <span key={v} className={styles.varChip}>{v}</span>
                        ))}
                    </div>

                    {draftErr && <div style={{ color: "var(--danger, #c94040)", fontSize: "0.83rem" }}>{draftErr}</div>}
                </>}
            </Modal>

            {/* ── Delete Confirm ───────────────────────────────────────── */}
            <Modal
                open={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Delete Template?"
                maxWidth={420}
                footer={<>
                    <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
                    <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting…" : "Delete"}
                    </button>
                </>}
            >
                <p>Delete this template? This cannot be undone.</p>
            </Modal>
        </div>
    );
};
