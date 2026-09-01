import { useState, useEffect, useRef } from "react";
import readNDJSONStream from "ndjson-readablestream";
import { toggleTheme, getTheme, Theme } from "../../theme";
import { Table } from "../../components/ui";
import type { PermittedCategory, MyProfile, DocFile, Verification, ChatMessage, AssignedHearing } from "./types";
import { streamChatAnswer, exportAnswerToWord } from "../../services/chat";
import { useMyProfile, useMyDocuments, useChangePassword } from "../../hooks/useEmployeeProfile";
import { useMyHearings, useUpdateHearingOutcome } from "../../hooks/useAssignments";
import { useLogout } from "../../hooks/useAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

type Panel = "chat" | "documents" | "assignments" | "profile";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
    if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
    if (b >= 1024)      return `${Math.round(b / 1024)} KB`;
    return `${b} B`;
}

function fmtDate(iso: string): string {
    return iso ? iso.slice(0, 10) : "—";
}

// Detect case law citations by filename pattern (PLD, SCMR, MLD, CLC prefixes)
const CASE_LAW_RE = /^(PLD|SCMR|MLD|CLC)[-_\s]/i;
function isCaseLawCitation(citation: string): boolean {
    return CASE_LAW_RE.test(citation.trim());
}

// ── Tailwind class constants (ported 1:1 from EmployeePortal.module.css) ───────

const SHELL = "flex h-screen overflow-hidden bg-bg-0 font-sans text-ink-1 max-[769px]:h-[100dvh] max-[769px]:flex-col";
const SIDEBAR = "flex w-[230px] min-w-[230px] flex-col overflow-hidden border-r border-border bg-bg-1 max-[769px]:h-auto max-[769px]:w-full max-[769px]:min-w-0 max-[769px]:shrink-0 max-[769px]:flex-row max-[769px]:gap-[0.35rem] max-[769px]:overflow-x-auto max-[769px]:overflow-y-hidden max-[769px]:border-r-0 max-[769px]:border-b max-[769px]:border-border max-[769px]:px-3 max-[769px]:py-2 max-[769px]:[-webkit-overflow-scrolling:touch]";
const SIDEBAR_LOGO = "shrink-0 px-5 pt-[1.4rem] pb-4 font-serif text-[1.15rem] font-bold tracking-tight text-ink-1";
const LOGO_ACCENT = "text-gold";
const ORG_BADGE = "mx-3 mb-2 shrink-0 rounded-[12px] border border-border bg-bg-2 px-3 py-[0.6rem]";
const ORG_BADGE_NAME = "overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-ink-1";
const ORG_BADGE_ROLE = "mt-[0.1rem] text-xs text-ink-3";
const CAT_LIST = "shrink-0 px-3 pb-2";
const CAT_LIST_LABEL = "px-2 pt-[0.4rem] pb-[0.3rem] text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-ink-3";
const CAT_CHIP = "mt-[0.15rem] mr-[0.2rem] mb-[0.15rem] ml-0 inline-flex items-center gap-[0.3rem] whitespace-nowrap rounded-[99px] border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.12)] px-[0.55rem] py-[0.2rem] text-[0.75rem] text-gold";
const NAV_WRAP = "flex flex-1 flex-col gap-[0.15rem] overflow-y-auto p-2";
const NAV_ITEM = "flex w-full cursor-pointer items-center gap-[0.65rem] rounded-[12px] border-none bg-transparent px-3 py-[0.55rem] text-left text-[0.875rem] font-medium text-ink-2 transition-[background,color] duration-150 hover:bg-bg-2 hover:text-ink-1 max-[769px]:min-w-0 max-[769px]:shrink-0 max-[769px]:whitespace-nowrap max-[769px]:rounded-[100px] max-[769px]:px-3 max-[769px]:py-[0.4rem] max-[769px]:text-[0.8rem]";
const NAV_ITEM_ACTIVE = "!bg-[rgba(212,175,55,0.12)] !text-gold font-semibold";
const NAV_ICON_BOX = "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-bg-2 text-xs font-bold";
const NAV_DIVIDER = "my-[0.4rem] mx-2 h-px bg-border";
const SIDEBAR_FOOTER = "shrink-0 border-t border-border p-3";
const SIDEBAR_USER_NAME = "overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-ink-1";
const SIDEBAR_USER_ROLE = "mb-[0.6rem] text-xs text-ink-3";
const SIGN_OUT_BTN = "w-full cursor-pointer rounded-[12px] border border-border bg-transparent px-3 py-[0.45rem] text-left text-[0.8rem] text-ink-3 transition-[border-color,color] duration-150 hover:border-ink-3 hover:text-ink-1";
const MAIN = "flex min-w-0 flex-1 flex-col overflow-hidden";
const HEADER = "flex shrink-0 items-center justify-between border-b border-border bg-bg-0 px-7 py-[1.1rem]";
const HEADER_TITLE = "m-0 text-[1.1rem] font-bold tracking-tight text-ink-1";
const HEADER_SUB = "mt-[0.15rem] mx-0 mb-0 text-[0.8rem] text-ink-3";
const THEME_TOGGLE = "cursor-pointer rounded-[12px] border border-border bg-bg-2 px-[0.85rem] py-[0.4rem] text-[0.8rem] text-ink-2 hover:border-gold hover:text-gold";

const CHAT_SHELL = "flex flex-1 flex-col overflow-hidden";
const CHAT_MESSAGES = "flex flex-1 flex-col gap-5 overflow-y-auto px-8 py-6";
const EMPTY_STATE = "flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center";
const EMPTY_ICON = "text-[2.5rem] opacity-30";
const EMPTY_TITLE = "text-[1.1rem] font-semibold text-ink-1";
const EMPTY_SUB = "max-w-[360px] text-[0.875rem] leading-[1.5] text-ink-3";
const EXAMPLE_GRID = "mt-3 grid max-w-[480px] grid-cols-2 gap-[0.6rem]";
const EXAMPLE_BTN = "cursor-pointer rounded-[12px] border border-border bg-bg-1 px-[0.85rem] py-[0.6rem] text-left text-[0.78rem] leading-[1.4] text-ink-2 transition-[border-color,color] duration-150 hover:border-gold hover:text-gold";

const MSG_ROW = "flex w-full max-w-[780px] flex-col";
const MSG_ROW_USER = "items-end self-end";
const MSG_ROW_ASSISTANT = "items-start self-start";
const MSG_BUBBLE = "max-w-full rounded-[12px] px-4 py-3 text-[0.9rem] leading-[1.6] max-[769px]:max-w-[95%]";
const MSG_BUBBLE_USER = "rounded-tl-[12px] rounded-tr-[12px] rounded-br-[2px] rounded-bl-[12px] bg-gold text-black";
const MSG_BUBBLE_ASSISTANT = "whitespace-pre-wrap rounded-tl-[12px] rounded-tr-[12px] rounded-br-[12px] rounded-bl-[2px] border border-border bg-bg-1 text-ink-1";
const MSG_CITATIONS = "mt-2 flex flex-wrap gap-[0.35rem]";
const CITATION_TAG = "inline-block rounded-[99px] border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.1)] px-2 py-[0.15rem] font-mono text-[0.7rem] text-gold";
const CITATION_TAG_CASE_LAW = "inline-block rounded-[99px] border border-[rgba(59,130,246,0.30)] bg-[rgba(59,130,246,0.10)] px-[0.55rem] py-[0.15rem] font-mono text-[0.7rem] text-[#60a5fa]";
const VERIFICATION_BADGE = "mt-[0.45rem] inline-flex flex-wrap items-center gap-[0.2rem] rounded-[99px] border border-transparent px-[0.6rem] py-[0.2rem] text-[0.7rem] font-semibold";
const VERDICT_CLASSES: Record<string, string> = {
    verified:   "bg-[rgba(46,158,79,0.08)] border-[rgba(46,158,79,0.28)] text-[#2e9e4f]",
    warning:    "bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.28)] text-gold",
    unverified: "bg-[rgba(224,82,96,0.08)] border-[rgba(224,82,96,0.28)] text-[#e05260]",
};
const VERIFICATION_ISSUES = "font-normal opacity-90";
const STREAMING_DOT = "ml-[4px] inline-block h-[8px] w-[8px] rounded-full bg-gold [animation:blink_1s_ease-in-out_infinite]";
const CHAT_SCROLL_ANCHOR = "h-px";

const CHAT_INPUT_BAR = "shrink-0 border-t border-border bg-bg-0 px-8 py-4";
const CHAT_INPUT_ROW = "flex max-w-[780px] items-end gap-3";
const CHAT_INPUT = "min-h-[44px] max-h-[140px] flex-1 resize-none rounded-[12px] border border-border bg-bg-1 px-4 py-3 font-sans text-[0.9rem] leading-[1.5] text-ink-1 outline-none transition-[border-color] duration-150 placeholder:text-ink-3 focus:border-gold";
const SEND_BTN = "shrink-0 cursor-pointer whitespace-nowrap rounded-[12px] border-none bg-gold px-[1.2rem] py-[0.7rem] text-[0.875rem] font-semibold text-black transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-[0.45]";
const CHAT_HINT = "mt-[0.4rem] max-w-[780px] text-xs text-ink-3";

const PANEL_CONTENT = "flex-1 overflow-y-auto px-8 py-6";
const DOC_NAME = "font-medium break-all text-ink-1";
const CAT_BADGE = "inline-block rounded-[99px] border border-border bg-bg-2 px-2 py-[0.15rem] text-xs text-ink-2";
const STATUS_READY = "text-[0.78rem] font-medium text-[#2e9e4f]";
const STATUS_PROC = "text-[0.78rem] text-gold";
const STATUS_ERROR = "text-[0.78rem] text-[#e05260]";
const EMPTY_DOCS = "p-12 text-center text-[0.875rem] text-ink-3";

const PROFILE_GRID = "grid max-w-[900px] grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5";
const PROFILE_CARD = "rounded-[12px] border border-border bg-bg-1 px-6 py-5";
const PROFILE_CARD_TITLE = "mb-4 text-[0.8rem] font-semibold uppercase tracking-[0.06em] text-ink-3";
const PROFILE_ROW = "mb-[0.85rem] flex flex-col gap-[0.2rem]";
const PROFILE_LABEL = "text-[0.75rem] font-medium text-ink-3";
const PROFILE_VALUE = "text-[0.9rem] font-medium text-ink-1";
const NO_CATS = "text-[0.85rem] italic text-ink-3";

const PW_INPUT = "mt-[0.3rem] w-full rounded-[12px] border border-border bg-bg-2 px-[0.7rem] py-2 font-sans text-[0.875rem] text-ink-1 outline-none transition-[border-color] duration-150 focus:border-gold";
const PW_BTN = "mt-4 cursor-pointer rounded-[12px] border-none bg-gold px-5 py-[0.55rem] text-[0.875rem] font-semibold text-black transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-[0.45]";
const PW_SUCCESS = "mb-[0.85rem] rounded-[12px] border border-[rgba(46,158,79,0.3)] bg-[rgba(46,158,79,0.1)] px-[0.85rem] py-[0.55rem] text-sm text-[#2e9e4f]";
const PW_ERROR = "mb-[0.85rem] rounded-[12px] border border-[rgba(224,82,96,0.3)] bg-[rgba(224,82,96,0.1)] px-[0.85rem] py-[0.55rem] text-sm text-[#e05260]";

const LOADING_WRAP = "flex h-full items-center justify-center text-[0.875rem] text-ink-3";

const EXPORT_BAR = "mt-[0.4rem] flex gap-[0.4rem] pl-[0.1rem]";
const EXPORT_BTN = "inline-flex cursor-pointer items-center gap-[0.25rem] rounded-[4px] border border-border bg-transparent px-[0.65rem] py-[0.25rem] font-sans text-xs font-semibold tracking-[0.04em] text-ink-2 transition-[border-color,color,background] duration-150 hover:border-gold hover:bg-[rgba(184,150,76,0.06)] hover:text-gold disabled:cursor-not-allowed disabled:opacity-[0.45]";

const LANG_TOGGLE_ROW = "flex flex-wrap items-center gap-[0.4rem] pt-[0.3rem] pb-[0.4rem]";
const LANG_TOGGLE_LABEL = "text-xs text-ink-3";
const LANG_BTN = "cursor-pointer rounded-pill border border-border bg-transparent px-[0.6rem] py-[0.18rem] text-[0.78rem] text-ink-2 transition-all duration-150 hover:border-gold hover:text-gold";
const LANG_BTN_ACTIVE = "cursor-pointer rounded-pill border border-gold bg-[rgba(184,150,76,0.12)] px-[0.6rem] py-[0.18rem] text-[0.78rem] font-semibold text-gold";
const URDU_HINT = "text-[0.7rem] text-ink-3 font-['Noto_Nastaliq_Urdu',sans-serif] [direction:rtl]";

// ── Theme Toggle ──────────────────────────────────────────────────────────────

const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(getTheme());
    const handle = () => { const next = toggleTheme(); setTheme(next); };
    return <button className={THEME_TOGGLE} onClick={handle}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</button>;
};

// ── Chat Panel ────────────────────────────────────────────────────────────────

const EXAMPLES = [
    "What are the key clauses in this contract?",
    "Summarise the main obligations",
    "Are there any penalty clauses?",
    "What is the notice period mentioned?",
];

// ── Export helpers ────────────────────────────────────────────────────────────

function exportToPDF(question: string, answer: string, citations: string[], orgName: string): void {
    const citHtml = citations.length > 0
        ? `<div class="section-label">Sources</div>
           <ol class="citations">${citations.map(c => `<li>${c}</li>`).join("")}</ol>`
        : "";
    const questionHtml = question
        ? `<div class="section-label">Question</div>
           <p class="question-text">${question.replace(/</g, "&lt;")}</p>`
        : "";
    const answerHtml = answer
        .split("\n")
        .filter(l => l.trim())
        .map(l => `<p>${l.replace(/</g, "&lt;")}</p>`)
        .join("");
    const now = new Date().toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Project Ease Export</title>
<style>
  body { font-family: Georgia, serif; max-width: 740px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
  .brand { text-align: center; margin-bottom: 1.5rem; border-bottom: 2px solid #b8964c; padding-bottom: 1rem; }
  .brand h1 { color: #b8964c; font-size: 1.5rem; margin: 0 0 0.25rem; }
  .brand p { color: #888; font-size: 0.8rem; margin: 0; }
  .section-label { font-size: 0.75rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #b8964c; margin: 1.5rem 0 0.4rem; }
  .question-text { font-style: italic; background: #f8f6f0; border-left: 3px solid #b8964c; padding: 0.6rem 1rem; margin: 0; }
  p { line-height: 1.7; margin: 0.5rem 0; }
  .citations { color: #444; font-size: 0.9rem; padding-left: 1.2rem; }
  .citations li { margin-bottom: 0.25rem; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; text-align: center; font-size: 0.75rem; color: #aaa; font-style: italic; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<div class="brand">
  <h1>${orgName}</h1>
  <p>AI Research Export — Project Ease &nbsp;·&nbsp; ${now}</p>
</div>
${questionHtml}
<div class="section-label">Answer</div>
${answerHtml}
${citHtml}
<div class="footer">Generated by Project Ease · AI answers should be verified by a qualified lawyer.</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
}

async function exportToWord(
    question: string,
    answer: string,
    citations: string[],
    orgName: string,
    setExporting: (v: boolean) => void
): Promise<void> {
    setExporting(true);
    try {
        const { blob, filename } = await exportAnswerToWord({ question, answer, citations, org_name: orgName });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        alert(e instanceof Error ? e.message : "Network error. Please try again.");
    } finally {
        setExporting(false);
    }
}

// ── Urdu / RTL helpers ────────────────────────────────────────────────────────

/** True when the string contains at least one Urdu/Arabic script character. */
function containsUrdu(text: string): boolean {
    return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(text);
}

/** System-prompt injection for Urdu mode (uses >>> prefix for injected_prompt). */
const URDU_PROMPT_OVERRIDE =
    ">>>اردو میں جواب دیں۔ پاکستانی عدالتوں اور قانونی ضروریات کے لیے رسمی اردو زبان استعمال کریں۔ " +
    "جوابات نستعلیق رسم الخط میں لکھیں۔";

// ─────────────────────────────────────────────────────────────────────────────

const ChatPanel = ({ orgName, categories }: { orgName: string; categories: PermittedCategory[] }) => {
    const [messages,      setMessages]      = useState<ChatMessage[]>([]);
    const [streamText,    setStreamText]    = useState("");
    const [input,         setInput]         = useState("");
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState<string | null>(null);
    const [exportingIdx,  setExportingIdx]  = useState<number | null>(null);
    const [lang,          setLang]          = useState<"en" | "ur">("en");
    const abortRef  = useRef<AbortController | null>(null);
    const anchorRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        anchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamText]);

    const send = async (question: string) => {
        const q = question.trim();
        if (!q || loading) return;
        setInput("");
        setError(null);

        const userMsg: ChatMessage = { role: "user", content: q };
        const history = [...messages, userMsg];
        setMessages(history);
        setLoading(true);
        setStreamText("");

        const ctrl = new AbortController();
        abortRef.current = ctrl;

        try {
            const res = await streamChatAnswer({
                messages: history.map(m => ({ role: m.role, content: m.content })),
                context: {
                    overrides: {
                        retrieval_mode:   "hybrid",
                        semantic_ranker:  true,
                        top:              5,
                        suggest_followup_questions: false,
                        ...(lang === "ur" ? { prompt_template: URDU_PROMPT_OVERRIDE } : {}),
                    }
                },
                session_state: null,
            }, ctrl.signal);

            let fullText     = "";
            let citations: string[] = [];
            let verification: Verification | undefined;

            for await (const event of readNDJSONStream(res.body!)) {
                if (ctrl.signal.aborted) break;
                if (event.type === "response.context" && event.context?.data_points) {
                    citations = event.context.data_points.citations ?? [];
                } else if (event.type === "response.output_text.delta" && event.delta !== undefined) {
                    setLoading(false);
                    fullText += event.delta;
                    setStreamText(fullText);
                } else if (event.type === "response.verification" && event.verification) {
                    verification = event.verification as Verification;
                } else if (event.error) {
                    throw new Error(event.error);
                }
            }

            const assistantMsg: ChatMessage = { role: "assistant", content: fullText, citations, verification };
            setMessages([...history, assistantMsg]);
            setStreamText("");
        } catch (e: any) {
            if (e?.name !== "AbortError") {
                setError(e?.message ?? "Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
            setStreamText("");
            abortRef.current = null;
        }
    };

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
    };

    const stop = () => { abortRef.current?.abort(); };

    const clear = () => {
        abortRef.current?.abort();
        setMessages([]);
        setStreamText("");
        setError(null);
        setInput("");
    };

    const isEmpty = messages.length === 0 && !loading;

    return (
        <div className={CHAT_SHELL}>
            <div className={CHAT_MESSAGES}>
                {isEmpty ? (
                    <div className={EMPTY_STATE}>
                        <div className={EMPTY_ICON}>💬</div>
                        <div className={EMPTY_TITLE}>Ask anything about your documents</div>
                        <div className={EMPTY_SUB}>
                            {categories.length > 0
                                ? `You have access to: ${categories.map(c => c.name).join(", ")}.`
                                : "Your manager hasn't granted access to any document categories yet."}
                        </div>
                        {categories.length > 0 && (
                            <div className={EXAMPLE_GRID}>
                                {EXAMPLES.map(ex => (
                                    <button key={ex} className={EXAMPLE_BTN} onClick={() => send(ex)}>
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => {
                            // Find the preceding user question for this assistant answer
                            const prevUserMsg = msg.role === "assistant" && i > 0 && messages[i - 1].role === "user"
                                ? messages[i - 1].content
                                : "";
                            const isUrduMsg = containsUrdu(msg.content);
                            return (
                                <div key={i} className={`${MSG_ROW} ${msg.role === "user" ? MSG_ROW_USER : MSG_ROW_ASSISTANT}`}>
                                    <div className={`${MSG_BUBBLE} ${msg.role === "user" ? MSG_BUBBLE_USER : MSG_BUBBLE_ASSISTANT}${isUrduMsg ? " urduText" : ""}`}
                                         dir={isUrduMsg ? "rtl" : undefined}>
                                        {msg.content}
                                    </div>
                                    {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                                        <div className={MSG_CITATIONS}>
                                            {msg.citations.map(c => (
                                                isCaseLawCitation(c) ? (
                                                    <span key={c} className={CITATION_TAG_CASE_LAW} title="Case Law — PLD / SCMR / MLD / CLC">
                                                        📖 {c}
                                                    </span>
                                                ) : (
                                                    <span key={c} className={CITATION_TAG}>📁 {c}</span>
                                                )
                                            ))}
                                        </div>
                                    )}
                                    {msg.role === "assistant" && msg.verification && (
                                        <div className={`${VERIFICATION_BADGE} ${VERDICT_CLASSES[msg.verification.verdict]}`}>
                                            {msg.verification.verdict === "verified"   && "✓ Verified against sources"}
                                            {msg.verification.verdict === "warning"    && "⚠ Partially verified"}
                                            {msg.verification.verdict === "unverified" && "✗ Could not verify"}
                                            {msg.verification.issues.length > 0 && (
                                                <span className={VERIFICATION_ISSUES}>
                                                    {" — "}{msg.verification.issues[0]}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {msg.role === "assistant" && msg.content && (
                                        <div className={EXPORT_BAR}>
                                            <button
                                                className={EXPORT_BTN}
                                                title="Export as PDF"
                                                onClick={() => exportToPDF(prevUserMsg, msg.content, msg.citations ?? [], orgName)}
                                            >
                                                ↓ PDF
                                            </button>
                                            <button
                                                className={EXPORT_BTN}
                                                title="Export as Word document"
                                                disabled={exportingIdx === i}
                                                onClick={() => {
                                                    setExportingIdx(i);
                                                    exportToWord(
                                                        prevUserMsg,
                                                        msg.content,
                                                        msg.citations ?? [],
                                                        orgName,
                                                        (v) => { if (!v) setExportingIdx(null); }
                                                    );
                                                }}
                                            >
                                                {exportingIdx === i ? "…" : "↓ Word"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Streaming in-progress */}
                        {(loading || streamText) && (
                            <div className={`${MSG_ROW} ${MSG_ROW_ASSISTANT}`}>
                                <div className={`${MSG_BUBBLE} ${MSG_BUBBLE_ASSISTANT}`}>
                                    {streamText || <span style={{ color: "var(--text-3)" }}>Searching your documents…</span>}
                                    {(loading || streamText) && <span className={STREAMING_DOT} />}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div style={{ color: "#e05260", fontSize: "0.85rem", padding: "0.5rem" }}>
                                ⚠ {error}
                            </div>
                        )}
                    </>
                )}
                <div ref={anchorRef} className={CHAT_SCROLL_ANCHOR} />
            </div>

            <div className={CHAT_INPUT_BAR}>
                {/* Language toggle */}
                <div className={LANG_TOGGLE_ROW}>
                    <span className={LANG_TOGGLE_LABEL}>Language:</span>
                    <button
                        className={lang === "en" ? LANG_BTN_ACTIVE : LANG_BTN}
                        onClick={() => setLang("en")}
                    >EN</button>
                    <button
                        className={lang === "ur" ? LANG_BTN_ACTIVE : LANG_BTN}
                        onClick={() => setLang("ur")}
                        title="اردو میں جواب حاصل کریں"
                    >اردو</button>
                    {lang === "ur" && (
                        <span className={URDU_HINT}>AI اردو میں جواب دے گا</span>
                    )}
                </div>

                <div className={CHAT_INPUT_ROW}>
                    <textarea
                        className={`${CHAT_INPUT}${lang === "ur" ? " urduInput" : ""}`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={onKey}
                        placeholder={lang === "ur" ? "اپنا سوال لکھیں…" : "Ask a question about your documents…"}
                        dir={lang === "ur" ? "rtl" : undefined}
                        rows={1}
                        disabled={loading && !streamText}
                    />
                    {loading || streamText ? (
                        <button className={SEND_BTN} onClick={stop}>Stop</button>
                    ) : (
                        <button className={SEND_BTN} onClick={() => send(input)} disabled={!input.trim()}>
                            {lang === "ur" ? "پوچھیں" : "Ask"}
                        </button>
                    )}
                </div>
                {messages.length > 0 && (
                    <div className={CHAT_HINT}>
                        Press Enter to send · Shift+Enter for new line ·{" "}
                        <button
                            onClick={clear}
                            style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: "inherit", padding: 0 }}
                        >
                            Clear chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Documents Panel ───────────────────────────────────────────────────────────

const DocumentsPanel = ({ docs }: { docs: DocFile[] }) => (
    <div className={PANEL_CONTENT}>
        <Table empty={docs.length === 0}
            emptyMessage="No documents are accessible to you yet. Ask your manager to assign category permissions.">
            <thead>
                <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {docs.map(doc => (
                    <tr key={doc.doc_id}>
                        <td><span className={DOC_NAME}>{doc.filename}</span></td>
                        <td>
                            {doc.category_name
                                ? <span className={CAT_BADGE}>{doc.category_name}</span>
                                : <span style={{ color: "var(--text-3)" }}>—</span>}
                        </td>
                        <td style={{ color: "var(--text-3)" }}>{fmtBytes(doc.size_bytes ?? 0)}</td>
                        <td style={{ color: "var(--text-3)" }}>{fmtDate(doc.uploaded_at ?? "")}</td>
                        <td>
                            {doc.status === "ready"      && <span className={STATUS_READY}>Ready</span>}
                            {doc.status === "processing" && <span className={STATUS_PROC}>Processing…</span>}
                            {doc.status === "error"      && <span className={STATUS_ERROR}>Error</span>}
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </div>
);

// ── Profile Panel ─────────────────────────────────────────────────────────────

const ProfilePanel = ({ profile }: { profile: MyProfile }) => {
    const [currentPw,  setCurrentPw]  = useState("");
    const [newPw,      setNewPw]      = useState("");
    const [confirmPw,  setConfirmPw]  = useState("");
    const [pwError,    setPwError]    = useState<string | null>(null);
    const [pwSuccess,  setPwSuccess]  = useState(false);
    const changePw = useChangePassword();

    const changePassword = () => {
        setPwError(null);
        setPwSuccess(false);
        if (!currentPw || !newPw || !confirmPw) { setPwError("Please fill in all fields."); return; }
        if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
        if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }
        changePw.mutate({ current_password: currentPw, new_password: newPw }, {
            onSuccess: () => {
                setPwSuccess(true);
                setCurrentPw(""); setNewPw(""); setConfirmPw("");
            },
            onError: (e: Error) => setPwError(e.message || "Could not change password."),
        });
    };

    return (
        <div className={PANEL_CONTENT}>
            <div className={PROFILE_GRID}>
                <div className={PROFILE_CARD}>
                    <div className={PROFILE_CARD_TITLE}>Your Account</div>
                    <div className={PROFILE_ROW}>
                        <span className={PROFILE_LABEL}>Full Name</span>
                        <span className={PROFILE_VALUE}>{profile.name}</span>
                    </div>
                    <div className={PROFILE_ROW}>
                        <span className={PROFILE_LABEL}>Email</span>
                        <span className={PROFILE_VALUE}>{profile.email}</span>
                    </div>
                    <div className={PROFILE_ROW}>
                        <span className={PROFILE_LABEL}>Role</span>
                        <span className={PROFILE_VALUE}>Employee</span>
                    </div>
                    <div className={PROFILE_ROW}>
                        <span className={PROFILE_LABEL}>Organization</span>
                        <span className={PROFILE_VALUE}>{profile.org_name}</span>
                    </div>
                </div>

                <div className={PROFILE_CARD}>
                    <div className={PROFILE_CARD_TITLE}>Document Access</div>
                    {profile.permitted_categories.length === 0 ? (
                        <p className={NO_CATS}>
                            No categories assigned yet. Contact your manager to get access.
                        </p>
                    ) : (
                        <>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-3)", marginBottom: "0.85rem" }}>
                                You can search documents in these categories:
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                {profile.permitted_categories.map(c => (
                                    <span key={c.category_id} className={CAT_CHIP}>{c.name}</span>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className={PROFILE_CARD}>
                    <div className={PROFILE_CARD_TITLE}>Change Password</div>

                    {pwSuccess && (
                        <div className={PW_SUCCESS}>Password updated successfully.</div>
                    )}
                    {pwError && (
                        <div className={PW_ERROR}>{pwError}</div>
                    )}

                    <div className={PROFILE_ROW}>
                        <span className={PROFILE_LABEL}>Current Password</span>
                        <input
                            className={PW_INPUT}
                            type="password"
                            placeholder="••••••••"
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>
                    <div className={PROFILE_ROW}>
                        <span className={PROFILE_LABEL}>New Password</span>
                        <input
                            className={PW_INPUT}
                            type="password"
                            placeholder="At least 8 characters"
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                    <div className={PROFILE_ROW}>
                        <span className={PROFILE_LABEL}>Confirm New Password</span>
                        <input
                            className={PW_INPUT}
                            type="password"
                            placeholder="Repeat new password"
                            value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                    <button
                        className={PW_BTN}
                        onClick={changePassword}
                        disabled={changePw.isPending}
                    >
                        {changePw.isPending ? "Saving…" : "Update Password"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── My Court Assignments — associate dispatch ───────────────────────────────

const HEARING_OUTCOMES = ["Heard", "Adjourned", "Partially Heard", "Reserved for Judgment", "Dismissed", "Withdrawn", "ex-parte"];

const AssignmentsPanel = ({ userId }: { userId: string }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: hearings = [], isLoading } = useMyHearings(userId, today);
    const updateOutcome = useUpdateHearingOutcome(userId, today);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [outcome,   setOutcome]   = useState("");
    const [adjReason, setAdjReason] = useState("");
    const [saveErr,   setSaveErr]   = useState("");

    const startMarking = (h: AssignedHearing) => {
        setEditingId(h.hearing_id);
        setOutcome(h.hearing_outcome ?? "");
        setAdjReason(h.adj_reason ?? "");
        setSaveErr("");
    };

    const saveOutcome = (hearingId: string) => {
        if (!outcome) { setSaveErr("Select an outcome first."); return; }
        setSaveErr("");
        updateOutcome.mutate({ hearingId, payload: { hearing_outcome: outcome, adj_reason: adjReason || undefined } }, {
            onSuccess: () => setEditingId(null),
            onError: (e: Error) => setSaveErr(e.message || "Could not save."),
        });
    };

    if (isLoading) return <div className={PANEL_CONTENT}><div className={LOADING_WRAP}>Loading…</div></div>;

    if (hearings.length === 0) {
        return (
            <div className={PANEL_CONTENT}>
                <div className={EMPTY_DOCS}>
                    No court hearings assigned to you right now. When your firm owner dispatches you to a hearing, it'll show up here.
                </div>
            </div>
        );
    }

    return (
        <div className={PANEL_CONTENT}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {hearings.map(h => (
                    <div key={h.hearing_id} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{h.title}</div>
                                {h.matter_title && <div style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>{h.matter_title}</div>}
                                <div style={{ color: "var(--text-3)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
                                    {h.hearing_date}{h.hearing_time ? ` · ${h.hearing_time}` : ""}
                                    {h.court_name ? ` · ${h.court_name}` : ""}
                                    {h.judge_name ? ` · ${h.judge_name}` : ""}
                                </div>
                            </div>
                            {h.hearing_outcome ? (
                                <span className={STATUS_READY}>{h.hearing_outcome}</span>
                            ) : editingId !== h.hearing_id ? (
                                <button className={SEND_BTN} style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }} onClick={() => startMarking(h)}>Mark Outcome</button>
                            ) : null}
                        </div>

                        {editingId === h.hearing_id && (
                            <div style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)" }}>
                                <select className={PW_INPUT} style={{ width: "100%", marginBottom: "0.6rem" }} value={outcome} onChange={e => setOutcome(e.target.value)}>
                                    <option value="">— Select outcome —</option>
                                    {HEARING_OUTCOMES.map(o => <option key={o}>{o}</option>)}
                                </select>
                                {outcome === "Adjourned" && (
                                    <input className={PW_INPUT} style={{ width: "100%", marginBottom: "0.6rem" }}
                                        placeholder="Adjournment reason (optional)" value={adjReason} onChange={e => setAdjReason(e.target.value)} />
                                )}
                                {saveErr && <div className={PW_ERROR} style={{ marginBottom: "0.5rem" }}>{saveErr}</div>}
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button className={SEND_BTN} disabled={updateOutcome.isPending} onClick={() => saveOutcome(h.hearing_id)}>
                                        {updateOutcome.isPending ? "Saving…" : "✓ Save — notifies owner & client"}
                                    </button>
                                    <button className={PW_BTN} style={{ background: "transparent" }} onClick={() => setEditingId(null)} disabled={updateOutcome.isPending}>Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Shell ─────────────────────────────────────────────────────────────────────

const NAV: { id: Panel; icon: string; label: string }[] = [
    { id: "chat",        icon: "Q", label: "Ask a Question"       },
    { id: "documents",   icon: "D", label: "My Documents"         },
    { id: "assignments", icon: "⚖", label: "My Court Assignments" },
    { id: "profile",     icon: "P", label: "Profile"              },
];

const PANEL_TITLES: Record<Panel, string> = {
    chat:        "Ask a Question",
    documents:   "My Documents",
    assignments: "My Court Assignments",
    profile:     "My Profile",
};

const PANEL_SUBS: Record<Panel, string> = {
    chat:        "Search and query your firm's documents using AI",
    documents:   "Documents you have access to",
    assignments: "Hearings your firm has dispatched you to attend",
    profile:     "Your account and access permissions",
};

const EmployeePortal = () => {
    const [panel, setPanel] = useState<Panel>("chat");
    const { data: profile, isLoading: profileLoading } = useMyProfile();
    const { data: docs = [], isLoading: docsLoading } = useMyDocuments();
    const logoutMut = useLogout();

    const signOut = () => {
        logoutMut.mutate();
        sessionStorage.clear();
        window.location.hash = "/";
    };

    if (profileLoading || docsLoading) {
        return <div className={LOADING_WRAP}>Loading…</div>;
    }

    const orgName    = profile?.org_name ?? "Your Organization";
    const userName   = profile?.name ?? "Employee";
    const categories = profile?.permitted_categories ?? [];

    return (
        <div className={SHELL}>
            {/* Sidebar */}
            <aside className={SIDEBAR}>
                <div className={SIDEBAR_LOGO}>
                    Project<span className={LOGO_ACCENT}> Ease</span>
                </div>

                <div className={ORG_BADGE}>
                    <div className={ORG_BADGE_NAME}>{orgName}</div>
                    <div className={ORG_BADGE_ROLE}>Employee</div>
                </div>

                {categories.length > 0 && (
                    <div className={CAT_LIST}>
                        <div className={CAT_LIST_LABEL}>My Access</div>
                        {categories.map(c => (
                            <span key={c.category_id} className={CAT_CHIP}>{c.name}</span>
                        ))}
                    </div>
                )}

                <nav className={NAV_WRAP}>
                    <div className={NAV_DIVIDER} />
                    {NAV.map(({ id, icon, label }) => (
                        <button
                            key={id}
                            className={`${NAV_ITEM} ${panel === id ? NAV_ITEM_ACTIVE : ""}`}
                            onClick={() => setPanel(id)}
                        >
                            <span className={NAV_ICON_BOX}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </nav>

                <div className={SIDEBAR_FOOTER}>
                    <div className={SIDEBAR_USER_NAME}>{userName}</div>
                    <div className={SIDEBAR_USER_ROLE}>Employee</div>
                    <button className={SIGN_OUT_BTN} onClick={signOut}>Sign Out</button>
                </div>
            </aside>

            {/* Main */}
            <div className={MAIN}>
                <header className={HEADER}>
                    <div>
                        <h1 className={HEADER_TITLE}>{PANEL_TITLES[panel]}</h1>
                        <p className={HEADER_SUB}>{PANEL_SUBS[panel]}</p>
                    </div>
                    <ThemeToggle />
                </header>

                {panel === "chat"        && <ChatPanel orgName={orgName} categories={categories} />}
                {panel === "documents"   && <DocumentsPanel docs={docs} />}
                {panel === "assignments" && profile && <AssignmentsPanel userId={profile.user_id} />}
                {panel === "profile"     && profile && <ProfilePanel profile={profile} />}
            </div>
        </div>
    );
};

export default EmployeePortal;
