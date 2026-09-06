// Shared Tailwind constants for Answer.tsx, AnswerError.tsx and AnswerLoading.tsx —
// all three rendered from the same former Answer.module.css.
export const ANSWER_CONTAINER =
    "rounded-lg border border-border bg-bg-2 p-5 shadow-sm outline outline-transparent";
export const ANSWER_CONTAINER_SELECTED = "outline-2 outline-gold";
export const ANSWER_TEXT =
    "py-4 text-base font-normal leading-[1.375em] text-ink-1 [&_table]:border-collapse [&_td]:border [&_td]:border-current [&_td]:p-[0.3125em] [&_th]:border [&_th]:border-current [&_th]:p-[0.3125em]";
export const CITATION_LEARN_MORE = "mr-[0.3125em] font-semibold leading-[1.5em]";
export const CITATION =
    "cursor-pointer rounded-[0.25em] bg-[#d1dbfa] px-2 py-0 font-medium leading-[1.5em] text-[#123bb6] no-underline hover:underline";
export const CITATION_ENTRY = "inline-flex items-center gap-1.5";
export const FOLLOWUP_QUESTIONS_LIST = "mt-2.5";
export const FOLLOWUP_QUESTION_LEARN_MORE = "mr-[0.3125em] font-semibold leading-[1.5em]";
export const FOLLOWUP_QUESTION =
    "cursor-pointer rounded-[0.25em] bg-[#e8ebfa] px-2 py-0 font-semibold italic leading-[1.5em] text-black no-underline";
export const LOADING_DOTS = "after:animate-[loadingDots_1s_infinite] after:content-['']";
