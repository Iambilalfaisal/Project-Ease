// Shared Tailwind constants for AnalysisPanel.tsx, ThoughtProcess.tsx, AgentPlan.tsx
// and TokenUsageGraph.tsx — all four rendered from the former AnalysisPanel.module.css.

export const T_LIST = "block w-full overflow-hidden bg-bg-2 px-5 pt-5 [overflow-wrap:anywhere] box-border";
export const T_LIST_ITEM = "relative ml-5 min-h-12 list-none border-l border-l-[#123bb6] py-0 pl-[1.875em] pb-[1.875em] last:border-l-0";
export const T_STEP = "relative mb-2 text-sm text-[#123bb6]";
export const T_PROP_ROW = "flex max-w-full flex-wrap gap-[5px]";
export const T_PROP = "mb-1 inline-block break-words rounded-[0.625em] bg-[#d7d7d7] px-2.5 py-[0.1875em] text-[0.95em]";
export const T_CODE_BLOCK = "box-border max-h-[18.75em] w-full overflow-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]";
export const SECTION_HEADER = "relative mb-2 text-sm font-semibold text-[#123bb6]";

export const TOKEN_USAGE_GRAPH = "box-border w-full px-1.5";
export const TOKEN_BAR =
    "box-border flex min-h-7 flex-wrap items-center overflow-hidden whitespace-normal break-words [overflow-wrap:anywhere] bg-[#d7d7d7] px-3 py-1.5";
export const TOKEN_LABEL = "flex-1 break-words pr-1 text-sm [overflow-wrap:anywhere]";
export const PRIMARY_BAR_CONTAINER = "flex w-full flex-nowrap gap-2 py-1";
export const PROMPT_BAR = "bg-[#a82424] text-white";
export const REASONING_BAR = "bg-[#265e29] text-white";
export const OUTPUT_BAR = "min-w-[120px] bg-[#12579b] text-white";
export const TOTAL_BAR = "bg-[#424242] text-white";
export const SECONDARY_TOTAL_BAR = "bg-[#6d6d6d] text-white";
export const SEGMENT_WRAPPER = "mt-4 pt-1";
export const SEGMENT_WRAPPER_FIRST = "mt-0";
export const STANDALONE_TOTAL_BAR = "mt-2.5";
export const GROUPED_TOTAL_BAR = "mt-0.5";

export const ITERATION_SECTION = "mt-6 first-of-type:mt-0";
export const SUBQUERIES_TABLE = "w-full [&_td]:bg-bg-1 [&_th]:bg-bg-1 [&_tr]:bg-bg-1";
export const STEP_HEADER_CELL = "flex flex-col items-start gap-1";
export const STEP_NUMBER_TEXT = "font-semibold text-[#123bb6]";
export const STEP_LABEL = "font-semibold";
export const STEP_RESULTS = "mt-2 mb-2 flex flex-col gap-1";
export const NO_RESULTS = "mt-2 text-[0.85em] italic text-ink-3";
export const STEP_RESULT =
    "inline-block break-words text-[0.85em] [overflow-wrap:anywhere] [&_a]:inline-block [&_a]:cursor-pointer [&_a]:rounded [&_a]:bg-[#d1dbfa] [&_a]:px-2 [&_a]:py-0 [&_a]:font-medium [&_a]:leading-[1.5em] [&_a]:text-[#123bb6] [&_a]:no-underline hover:[&_a]:underline";
