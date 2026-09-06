// Shared Tailwind class constants for the Owner Portal — ported 1:1 from the
// former OwnerPortal.module.css, which every screen under ./screens imported.
// Add more constants here as each screen is migrated off the CSS module.

// ── Shell (OwnerPortal.tsx only) ────────────────────────────────────────────

export const SHELL = "flex h-screen overflow-hidden bg-bg-0 font-sans text-ink-1 antialiased max-[769px]:h-auto max-[769px]:min-h-screen max-[769px]:flex-col";

export const MOBILE_TOP_BAR = "hidden max-[769px]:sticky max-[769px]:top-0 max-[769px]:z-[100] max-[769px]:flex max-[769px]:shrink-0 max-[769px]:items-center max-[769px]:gap-3 max-[769px]:border-b max-[769px]:border-border max-[769px]:bg-bg-1 max-[769px]:px-4 max-[769px]:py-[0.6rem]";
export const HAMBURGER = "flex cursor-pointer flex-col gap-[5px] border-none bg-transparent p-[6px] [&>span]:block [&>span]:h-[2px] [&>span]:w-[22px] [&>span]:rounded-[2px] [&>span]:bg-ink-1 [&>span]:transition-all [&>span]:duration-200";
export const MOBILE_LOGO_TEXT = "font-serif text-[1.1rem] font-bold text-ink-1";
export const LOGO_ACCENT = "text-ink-1";
export const NAV_OVERLAY = "hidden max-[769px]:fixed max-[769px]:inset-0 max-[769px]:z-[99] max-[769px]:block max-[769px]:bg-[rgba(0,0,0,0.45)]";

export const SIDEBAR = "flex w-[232px] shrink-0 flex-col overflow-hidden border-r border-border bg-bg-1 [@media(max-width:1024px)_and_(min-width:769px)]:w-[200px] max-[769px]:fixed max-[769px]:inset-y-0 max-[769px]:left-[-260px] max-[769px]:z-[110] max-[769px]:w-[240px] max-[769px]:overflow-y-auto max-[769px]:transition-[left] max-[769px]:duration-[250ms] max-[769px]:ease-in-out";
export const SIDEBAR_OPEN = "max-[769px]:!left-0";
export const SIDEBAR_LOGO = "border-b border-border px-6 pt-6 pb-5 font-serif text-[1.25rem] font-bold tracking-tight text-gold max-[641px]:px-0 max-[641px]:py-5 max-[641px]:text-center max-[641px]:text-[0px] max-[641px]:after:content-['PE'] max-[641px]:after:font-serif max-[641px]:after:text-[1rem] max-[641px]:after:text-gold";
export const ORG_BADGE = "border-b border-border px-6 py-[0.9rem] max-[641px]:hidden";
export const ORG_BADGE_NAME = "text-[0.85rem] font-bold text-ink-1";
export const ORG_BADGE_TYPE = "mt-[0.15rem] text-xs text-ink-3";

export const NAV = "flex flex-1 flex-col gap-[0.2rem] overflow-y-auto px-3 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[2px] [&::-webkit-scrollbar-thumb]:bg-border-md";
export const NAV_ITEM = "flex w-full cursor-pointer items-center gap-3 rounded-sm border-none bg-transparent px-[0.9rem] py-[0.65rem] text-left font-sans text-[0.875rem] font-medium text-ink-2 transition-[background,color] duration-150 hover:bg-gold-dim hover:text-ink-1";
export const NAV_ITEM_ACTIVE = "!bg-gold-dim !text-gold border-l-2 border-l-gold pl-[calc(0.9rem-2px)] font-semibold";
export const NAV_ITEM_CHAT = `${NAV_ITEM} mt-[0.25rem] !text-gold hover:!text-gold-light`;
export const NAV_DIVIDER = "mx-1 my-2 h-px bg-border";
export const NAV_ICON_BOX = "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] bg-bg-2 text-[0.65rem] font-extrabold text-ink-3";

export const SIDEBAR_FOOTER = "flex flex-col gap-[0.6rem] border-t border-border px-4 pt-4 pb-5 max-[641px]:px-2 max-[641px]:py-3";
export const SIDEBAR_USER_BOX = "leading-[1.4] max-[641px]:hidden";
export const SIDEBAR_USER_NAME = "text-sm font-semibold text-ink-1";
export const SIDEBAR_USER_ROLE = "text-xs font-medium uppercase tracking-[0.04em] text-gold";
export const SIGN_OUT_BTN = "w-full cursor-pointer rounded-[7px] border border-border-md bg-transparent px-[0.85rem] py-[0.4rem] text-left font-sans text-[0.8rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-danger hover:text-danger";

export const MAIN = "flex flex-1 flex-col overflow-hidden bg-bg-0 max-[769px]:h-auto max-[769px]:overflow-auto";
export const HEADER = "flex shrink-0 items-center justify-between border-b border-border bg-bg-1 px-8 pt-6 pb-5";
export const HEADER_TITLE = "m-0 mb-[0.15rem] font-serif text-[1.45rem] font-bold tracking-tight text-ink-1";
export const HEADER_SUB = "m-0 text-sm text-ink-3";
export const THEME_TOGGLE = "cursor-pointer whitespace-nowrap rounded-sm border border-border-md bg-bg-2 px-4 py-[0.45rem] font-sans text-[0.8rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-gold-border hover:text-gold";
export const BODY = "flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[2px] [&::-webkit-scrollbar-thumb]:bg-border-md";

// ── Panel shared (used across most/all screens) ─────────────────────────────

export const PANEL_CONTENT = "max-w-[1100px] max-[769px]:max-w-full";
export const PANEL_TOOLBAR = "mb-5 flex items-center justify-between";
export const RESULT_COUNT = "text-sm text-ink-3";
// NOTE: the CSS module declared .sectionTitle twice — the second declaration
// (uppercase eyebrow style) fully overrides the first (serif heading style)
// for every property, so only the effective final version is ported here.
export const SECTION_TITLE = "mb-3 text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-ink-3";
export const MUTED = "text-sm !text-ink-3";
export const EMPTY_HINT = "px-4 py-10 text-center text-[0.875rem] leading-[1.6] text-ink-3";

export const DETAIL_TAB_BAR = "mt-5 flex gap-0 border-b border-border";
export const DETAIL_TAB_BTN = "-mb-px cursor-pointer border-none border-b-2 border-b-transparent bg-transparent px-4 py-[0.6rem] font-sans text-[0.83rem] font-semibold text-ink-3 transition-[color,border-color] duration-150 hover:text-ink-1";
export const DETAIL_TAB_BTN_ACTIVE = "!border-b-gold !text-gold";

export const BADGE_GREEN = "inline-block rounded-pill border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.12)] px-[0.65rem] py-[0.2rem] text-xs font-semibold text-success";
export const BADGE_AMBER = "inline-block rounded-pill border border-[rgba(251,191,36,0.25)] bg-[rgba(251,191,36,0.12)] px-[0.65rem] py-[0.2rem] text-xs font-semibold text-warning";
export const BADGE_GOLD = "inline-block rounded-pill border border-gold-border bg-gold-dim px-[0.65rem] py-[0.2rem] text-xs font-semibold text-gold";
export const BADGE_GRAY = "inline-block rounded-pill border border-border-md bg-bg-2 px-[0.65rem] py-[0.2rem] text-xs font-semibold text-ink-3";
export const BADGE_RED = "inline-block rounded-pill bg-[rgba(239,68,68,0.12)] px-[0.65rem] py-[0.2rem] text-xs font-semibold text-[#f87171]";
export const BADGE_BLUE = "inline-flex items-center whitespace-nowrap rounded-[999px] bg-[rgba(59,130,246,0.15)] px-[0.6rem] py-[0.2rem] text-xs font-semibold tracking-[0.02em] text-[#60a5fa]";
export const CAT_CHIP = "inline-block rounded-pill border border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.14)] px-[0.55rem] py-[0.15rem] text-xs font-semibold text-[#a5b4fc]";

export const BTN_PRIMARY = "cursor-pointer rounded-sm border-none bg-[linear-gradient(135deg,var(--gold)_0%,#9C7A28_100%)] px-5 py-[0.55rem] font-sans text-[0.85rem] font-bold text-[#05080F] transition-[opacity,transform] duration-150 hover:-translate-y-px hover:opacity-[0.88]";
export const BTN_GHOST = "cursor-pointer rounded-sm border border-border-md bg-transparent px-5 py-[0.55rem] font-sans text-[0.85rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-ink-2 hover:text-ink-1";
export const BTN_DANGER = "cursor-pointer rounded-sm border border-danger bg-transparent px-5 py-[0.55rem] font-sans text-[0.85rem] text-danger transition-[background] duration-150 hover:bg-[rgba(248,113,113,0.08)]";
export const ACTION_BTN = "cursor-pointer rounded-[6px] border border-border-md bg-transparent px-3 py-[0.3rem] font-sans text-[0.78rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-gold-border hover:text-gold";
export const ACTION_BTN_DANGER = "cursor-pointer rounded-[6px] border border-border-md bg-transparent px-3 py-[0.3rem] font-sans text-[0.78rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-danger hover:text-danger";

export const OVERLAY = "fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-4 backdrop-blur-[8px] max-[769px]:items-end max-[769px]:p-0";
export const MODAL = "w-full max-w-[420px] rounded-lg border border-gold-border bg-bg-1 p-8 pb-7 shadow-base max-[769px]:!max-w-full max-[769px]:w-full max-[769px]:rounded-[16px_16px_0_0] max-[769px]:max-h-[90vh] max-[769px]:overflow-y-auto";
export const MODAL_TITLE = "m-0 mb-6 font-serif text-[1.3rem] font-bold tracking-tight text-ink-1";
export const MODAL_ACTIONS = "mt-6 flex justify-end gap-3";

export const FORM_GROUP = "mb-4";
export const FORM_LABEL = "mb-[0.4rem] block text-xs font-bold uppercase tracking-[0.05em] text-ink-2";
export const FORM_INPUT = "w-full box-border rounded-[7px] border border-border-md bg-bg-2 px-[0.9rem] py-[0.65rem] font-sans text-[0.875rem] text-ink-1 outline-none transition-[border-color] duration-150 placeholder:text-ink-3 focus:border-gold-border focus:bg-gold-dim";
export const FORM_SELECT = `${FORM_INPUT} cursor-pointer appearance-none [&>option]:bg-bg-1 [&>option]:text-ink-1`;

export const LINK_BTN = "cursor-pointer border-none bg-transparent p-0 text-left font-sans text-[0.875rem] text-gold no-underline hover:underline";

// .limAlertBanner uses hardcoded light-alert colors in the source CSS (no CSS
// vars) — it's theme-independent by design, ported as literal hex/rgba here.
export const LIM_ALERT_BANNER = "mb-4 rounded-[var(--radius)] border border-[#e8a030] border-l-4 border-l-[#c94040] bg-[#fff8ed] px-4 py-3 text-[0.85rem]";
export const LIM_ALERT_LIST = "mt-[0.4rem] flex flex-col gap-[0.3rem]";
export const LIM_ALERT_ITEM = "flex items-center gap-[0.4rem]";
export const LIM_ALERT_ITEM_CRITICAL = "flex items-center gap-[0.4rem] font-semibold";
export const LIM_BADGE_CRITICAL = "inline-block whitespace-nowrap rounded-[4px] border border-[#f0b0b0] bg-[#fde8e8] px-[0.4rem] py-[0.1rem] text-[0.7rem] font-bold tracking-[0.04em] text-[#c94040]";
export const LIM_BADGE_WARN = "inline-block whitespace-nowrap rounded-[4px] border border-[#f0c87a] bg-[#fff3e0] px-[0.4rem] py-[0.1rem] text-[0.7rem] font-bold tracking-[0.04em] text-[#c97c2a]";

export const PRIORITY_BADGE = "inline-block rounded-[999px] bg-bg-2 px-[0.55rem] py-[0.15rem] text-[0.68rem] font-bold uppercase tracking-[0.04em] text-ink-3 data-[priority=Urgent]:bg-[#fee2e2] data-[priority=Urgent]:text-[#991b1b] data-[priority=High]:bg-[#fef3c7] data-[priority=High]:text-[#92400e] data-[priority=Low]:bg-[#f1f5f9] data-[priority=Low]:text-[#64748b]";

export const SETTINGS_CARD = "flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-bg-1 px-7 py-7";
export const SETTINGS_CARD_TITLE = "mb-1 border-b border-border pb-3 font-serif text-base font-bold text-ink-1";
export const ERROR_BANNER = "mt-2 flex items-center gap-3 rounded-[var(--radius)] border border-[rgba(220,53,69,0.35)] bg-[rgba(220,53,69,0.12)] px-4 py-[0.7rem] text-[0.85rem] text-[#e05260]";

export const ORDERS_TIMELINE = "mt-2 flex flex-col gap-0";
export const ORDER_CARD = "flex gap-0";
export const ORDER_CARD_LEFT = "flex w-[28px] shrink-0 flex-col items-center";
export const ORDER_DOT = "mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-bg-1 shadow-[0_0_0_2px_var(--border)]";
export const ORDER_LINE = "my-1 min-h-[20px] w-[2px] flex-1 bg-border";
export const ORDER_CARD_BODY = "ml-2 mb-3 flex-1 rounded-[var(--radius)] border border-border bg-bg-1 px-4 py-3";
export const ORDER_CARD_HEADER = "mb-[0.45rem] flex items-center justify-between";
export const ORDER_DATE = "text-[0.85rem] font-semibold text-ink-1";
export const ORDER_COURT = "text-[0.82rem] text-ink-3";
export const ORDER_OUTCOME_BADGE = "text-xs font-semibold uppercase tracking-[0.03em]";
export const ORDER_BRIEF = "mb-[0.4rem] text-[0.85rem] leading-[1.5] text-ink-2";
export const ORDER_NEXT_DATE = "mb-[0.4rem] text-[0.78rem] text-ink-3 [&>strong]:text-gold";

export const FILE_ICON = "flex h-[26px] w-[26px] items-center justify-center rounded-[5px] bg-gold-dim text-[0.6rem] font-extrabold text-gold";
export const QUEUE_REMOVE = "cursor-pointer rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-transparent px-[0.4rem] py-[0.15rem] font-sans text-[0.75rem] text-ink-3 transition-[color,border-color] duration-150";

export const BACK_BTN = "inline-flex cursor-pointer items-center gap-[0.35rem] border-none bg-transparent p-0 font-sans text-[0.82rem] text-gold";
export const DETAIL_TITLE = "m-0 font-serif text-[1.35rem] font-bold text-ink-1";
export const DETAIL_INFO_GRID = "mt-3 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-6 gap-y-[0.65rem] max-[769px]:grid-cols-1";
export const DETAIL_INFO_ITEM = "flex flex-col gap-[0.1rem]";
export const DETAIL_INFO_LABEL = "text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-ink-3";
export const MATTER_DETAIL_HEADER = "rounded-[var(--radius)] border border-border bg-bg-1 px-6 py-5";

export const DOC_HIERARCHY = "flex flex-col gap-2";
export const DOC_HIERARCHY_GROUP = "overflow-hidden rounded-[var(--radius)] border border-border";
export const DOC_HIERARCHY_GROUP_HEADER = "flex items-center justify-between border-b border-border bg-bg-1 px-[0.9rem] py-[0.55rem]";
export const DOC_HIERARCHY_CAT = "text-[0.8rem] font-semibold text-ink-2";
export const DOC_HIERARCHY_COUNT = "rounded-[999px] bg-bg-2 px-[0.55rem] py-[0.1rem] text-[0.72rem] text-ink-3";
export const DOC_HIERARCHY_ROW = "flex items-center gap-[0.65rem] border-b border-border bg-bg-0 px-[0.9rem] py-[0.45rem] transition-colors duration-100 last:border-b-0 hover:bg-bg-1";
export const DOC_HIERARCHY_NAME = "flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] text-ink-1";
export const DOC_HIERARCHY_SIZE = "whitespace-nowrap text-[0.72rem] text-ink-3";

// .successBanner in the source CSS only overrides background/border-color/color —
// it was never composed with .errorBanner's box properties, so used alone (as it
// is here) it renders with no padding/border/display:flex. Ported as-is.
export const SUCCESS_BANNER = "bg-[rgba(40,167,69,0.12)] border-[rgba(40,167,69,0.35)] text-[#2e9e4f]";

export const PERM_LIST = "mb-5 flex max-h-[320px] flex-col gap-[6px] overflow-y-auto";
export const PERM_ROW = "flex cursor-pointer items-center gap-[10px] rounded-[8px] border border-border bg-bg-1 px-[0.85rem] py-[0.65rem] transition-colors duration-150 hover:border-gold-border";
export const PERM_CHECK = "h-4 w-4 shrink-0 cursor-pointer accent-gold";
export const PERM_LABEL = "text-[0.88rem] font-medium text-ink-1";
export const PERM_SUMMARY = "whitespace-nowrap text-[0.78rem] text-ink-3";

export const LIMIT_BANNER = "mb-2 flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius)] border border-[rgba(224,82,82,0.3)] bg-[rgba(224,82,82,0.08)] px-4 py-3 text-[0.85rem] text-[#e05252]";
export const LIMIT_UPGRADE_BTN = "cursor-pointer whitespace-nowrap rounded-[var(--radius)] border-none bg-gold px-[0.85rem] py-[0.35rem] text-[0.8rem] font-semibold text-white transition-opacity duration-150 hover:opacity-85";

// ── Subscription panel ──────────────────────────────────────────────────────

export const TRIAL_BANNER = "mb-[1.4rem] flex items-center gap-3 rounded-[var(--radius)] border border-gold bg-[#7c5a001a] px-[1.1rem] py-3 text-[0.875rem] text-ink-1";
export const TRIAL_BANNER_URGENT = "!border-danger !bg-[#5c0a0a18]";
export const TRIAL_BANNER_ICON = "shrink-0 text-[1.15rem]";
export const TRIAL_BANNER_TEXT = "flex-1 leading-[1.45]";

export const UPGRADE_PENDING_BANNER = "mb-[1.4rem] flex items-start gap-3 rounded-[var(--radius)] border border-[#4a90d9] bg-[#0a4a7c18] px-[1.1rem] py-3 text-[0.875rem] text-ink-1";
export const PENDING_BANNER_ICON = "mt-[0.05rem] shrink-0 text-[1.15rem]";
export const PENDING_BANNER_BODY = "flex-1 leading-[1.5]";
export const PENDING_BANNER_TITLE = "mb-[0.2rem] font-semibold";
export const PENDING_BANNER_SUB = "text-[0.82rem] text-ink-2";

export const SUB_USAGE_CARD = "mb-[1.6rem] rounded-[var(--radius)] border border-border bg-bg-1 px-6 py-5";
export const SUB_USAGE_TITLE = "mb-4 text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-ink-3";
export const SUB_USAGE_GRID = "grid grid-cols-3 gap-6 max-[761px]:grid-cols-1";
// .subUsageItem was an empty rule in the source CSS — kept as a no-op for fidelity.
export const SUB_USAGE_ITEM = "";
export const SUB_USAGE_LABEL = "mb-[0.4rem] flex justify-between text-[0.82rem] text-ink-2";
export const SUB_USAGE_VALUE = "font-semibold text-ink-1";
export const SUB_UPGRADE_HINT = "mt-[0.35rem] text-[0.78rem] font-medium text-gold";

export const USAGE_BAR = "h-[6px] overflow-hidden rounded-[100px] bg-bg-2";
export const USAGE_BAR_FILL = "h-full rounded-[100px] bg-gold transition-[width] duration-[400ms] ease-in-out";
export const USAGE_BAR_WARN = "!bg-warning";

export const PLAN_TIER_GRID = "mb-[1.6rem] grid grid-cols-4 gap-4 max-[1101px]:grid-cols-2 max-[681px]:grid-cols-1";
export const PLAN_TIER_CARD = "relative flex flex-col gap-0 rounded-[var(--radius)] border border-border bg-bg-1 px-[1.15rem] pb-[1.1rem] pt-[1.2rem] transition-colors duration-150";
export const PLAN_TIER_CARD_CURRENT = "!border-gold !bg-[#7c5a000d]";
export const PLAN_TIER_CARD_POPULAR = "!border-[#4a90d9]";
export const PLAN_TIER_CURRENT_BADGE = "absolute -top-[10px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-gold px-[0.6rem] py-[0.15rem] text-[0.68rem] font-bold uppercase tracking-[0.05em] text-[#1a1200]";
export const PLAN_TIER_POPULAR_BADGE = "absolute -top-[10px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-[#4a90d9] px-[0.6rem] py-[0.15rem] text-[0.68rem] font-bold uppercase tracking-[0.05em] text-white";
export const PLAN_TIER_NAME = "mb-2 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-ink-3";
export const PLAN_TIER_PRICE = "mb-[0.15rem] text-[1.7rem] font-bold leading-none text-ink-1";
export const PLAN_TIER_PRICE_SUB = "mb-[0.9rem] text-[0.75rem] text-ink-3";
export const PLAN_TIER_DIVIDER = "my-3 h-px bg-border";
export const PLAN_TIER_LIMITS = "mb-3 text-[0.78rem] leading-[1.5] text-ink-3";
export const PLAN_TIER_FEATURE_LIST = "mb-4 flex flex-1 list-none flex-col gap-[0.4rem] p-0";
export const PLAN_TIER_FEATURE_ITEM = "flex items-start gap-[0.4rem] text-[0.8rem] leading-[1.35] text-ink-2 before:mr-0 before:shrink-0 before:text-[0.75rem] before:font-bold before:text-gold before:content-['✓']";
export const PLAN_TIER_BTN = "mt-auto w-full cursor-pointer rounded-[calc(var(--radius)-2px)] border border-gold bg-gold px-0 py-[0.55rem] text-[0.82rem] font-semibold text-[#1a1200] transition-[opacity,transform] duration-150 [&:hover:not(:disabled)]:-translate-y-px [&:hover:not(:disabled)]:opacity-[0.88] disabled:translate-y-0 disabled:cursor-default disabled:border-border disabled:bg-bg-2 disabled:text-ink-3";
export const PLAN_TIER_BTN_GHOST = "!bg-transparent !text-gold [&:hover:not(:disabled)]:!bg-[#7c5a0015]";

export const UPGRADE_MODAL_TITLE = "mb-1 text-[1.1rem] font-bold text-ink-1";
export const UPGRADE_MODAL_SUB = "mb-5 text-[0.83rem] leading-[1.5] text-ink-2";

export const BANK_CARD = "mb-[1.1rem] rounded-[calc(var(--radius)-2px)] border border-border bg-bg-2 px-4 py-[0.9rem] text-[0.83rem]";
export const BANK_CARD_TITLE = "mb-[0.6rem] text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-ink-3";
export const BANK_ROW = "flex items-start justify-between gap-4 py-[0.22rem]";
export const BANK_LABEL = "min-w-[80px] shrink-0 text-ink-3";
export const BANK_VALUE = "break-all text-right font-semibold text-ink-1";

export const UPGRADE_FORM_SECTION = "mb-4";
export const UPGRADE_FORM_LABEL = "mb-[0.35rem] block text-[0.8rem] font-medium text-ink-2";
export const UPGRADE_FORM_INPUT = "w-full box-border rounded-[calc(var(--radius)-2px)] border border-border bg-bg-1 px-3 py-2 font-sans text-[0.875rem] text-ink-1 outline-none transition-colors duration-150 focus:border-gold";
export const UPGRADE_FORM_TEXTAREA = "min-h-[70px] resize-y";

export const UPGRADE_SUCCESS_BANNER = "rounded-[var(--radius)] border border-[#3ab57a] bg-[#0a4a1818] px-[1.15rem] py-4 text-[0.875rem] leading-[1.55] text-ink-1";
export const UPGRADE_SUCCESS_TITLE = "mb-[0.3rem] font-bold text-[#3ab57a]";

// ── Documents panel ──────────────────────────────────────────────────────────

export const ERROR_DISMISS = "ml-auto cursor-pointer border-none bg-transparent text-[1.1rem] leading-none text-inherit opacity-70 hover:opacity-100";

export const USAGE_METER = "mb-4 rounded-[var(--radius)] border border-border bg-bg-1 px-4 py-[0.85rem]";
export const USAGE_METER_LABEL = "mb-2 flex justify-between text-[0.8rem] text-ink-2";
export const USAGE_WARN = "!font-semibold !text-warning";
export const USAGE_MUTED = "text-ink-3";
export const USAGE_WARN_TEXT = "mt-[0.4rem] text-[0.75rem] text-warning";

export const DROP_ZONE = "mb-6 cursor-pointer rounded-[var(--radius)] border-2 border-dashed border-border-md p-10 text-center transition-[border-color,background] duration-200 hover:border-gold-border hover:bg-gold-dim";
export const DROP_ZONE_ACTIVE = "!border-gold-border !bg-gold-dim";
export const DROP_ICON = "flex h-10 w-10 items-center justify-center rounded-[10px] bg-bg-2 text-[0.8rem] font-extrabold text-gold";
export const DROP_TITLE = "mb-[0.3rem] text-[0.9rem] font-semibold text-ink-1";
export const DROP_SUB = "text-[0.78rem] text-ink-3";

export const UPLOAD_QUEUE = "mb-5 overflow-hidden rounded-[var(--radius)] border border-border bg-bg-1";
export const QUEUE_HEADER = "flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3";
export const QUEUE_SUMMARY = "text-[0.82rem] font-semibold text-ink-2";
export const QUEUE_DONE = "text-success";
export const QUEUE_ERR = "text-danger";
export const QUEUE_LIMIT_WARN = "border-b border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-4 py-[0.55rem] text-[0.8rem] text-[#F87171]";
export const QUEUE_LIST = "max-h-[280px] overflow-y-auto";
export const QUEUE_ROW = "flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.04)] px-4 py-[0.55rem] last:border-b-0";
export const QUEUE_FILE_NAME = "flex min-w-0 flex-1 items-center gap-2";
export const QUEUE_NAME = "overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] text-ink-1";
export const QUEUE_SIZE = "shrink-0 text-[0.72rem] text-ink-3";
export const QUEUE_SIZE_WARN = "shrink-0 text-[0.85rem] text-warning";
export const QUEUE_ROW_RIGHT = "flex shrink-0 items-center gap-[0.4rem]";
export const QUEUE_STATUS_QUEUED = "text-[0.72rem] text-ink-3";
export const QUEUE_STATUS_UPLOADING = "animate-[pulse_1.2s_ease-in-out_infinite] text-[0.72rem] text-gold";
export const QUEUE_STATUS_DONE = "text-[0.72rem] font-semibold text-success";
export const QUEUE_STATUS_ERROR = "cursor-help text-[0.72rem] font-semibold text-danger";
export const QUEUE_RETRY = "cursor-pointer rounded-[4px] border border-gold-border bg-transparent px-2 py-[0.2rem] font-sans text-[0.7rem] text-gold transition-colors duration-150";

export const FILE_NAME_CELL = "flex items-center gap-[0.65rem]";

// ── Drafting panel ───────────────────────────────────────────────────────────

export const DRAFTING_WRAP = "flex flex-col gap-5";
export const DRAFTING_HEADER = "flex flex-wrap items-center justify-between gap-3";
export const FILTER_CHIPS = "flex flex-wrap gap-[0.4rem]";
export const CHIP = "cursor-pointer rounded-[100px] border border-border bg-transparent px-3 py-[0.28rem] text-[0.8rem] text-ink-2 transition-all duration-150 hover:border-gold-border hover:text-gold";
// .chipActive is declared twice in the source CSS (once paired with the unused
// .chipInactive, once standalone later in the file) — cascade-merged per property,
// later declaration wins on conflicts. Ported as the effective combined result.
export const CHIP_ACTIVE = "inline-block cursor-pointer rounded-[100px] border border-gold bg-[rgba(184,150,76,0.12)] px-3 py-[0.28rem] text-[0.8rem] font-semibold text-gold transition-[background,color,border-color] duration-150";

export const TEMPLATE_GRID = "grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 max-[769px]:grid-cols-1";
export const TEMPLATE_CARD = "flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-bg-1 p-[1.1rem] transition-colors duration-150 hover:border-gold";
export const TEMPLATE_CARD_HEAD = "flex items-center justify-between";
export const TEMPLATE_TYPE_BADGE = "rounded-[100px] bg-[rgba(184,150,76,0.12)] px-[0.55rem] py-[0.15rem] text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-gold";
export const TEMPLATE_DATE = "text-[0.72rem] text-ink-3";
export const TEMPLATE_TITLE = "text-base font-semibold text-ink-1";
export const TEMPLATE_DESC = "text-[0.8rem] leading-[1.4] text-ink-3";
export const TEMPLATE_VARS = "mt-[0.15rem] flex flex-wrap gap-[0.3rem]";
export const VAR_CHIP = "rounded-[4px] border border-border bg-bg-2 px-[0.4rem] py-[0.1rem] font-mono text-[0.68rem] text-ink-2";
export const TEMPLATE_CARD_ACTIONS = "mt-2 flex items-center gap-2";
export const DRAFT_BTN = "flex-1 cursor-pointer rounded-[var(--radius)] border-none bg-gold px-3 py-[0.45rem] text-[0.82rem] font-semibold text-white transition-opacity duration-150 hover:opacity-85";
export const EDIT_BTN = "cursor-pointer rounded-[var(--radius)] border border-border bg-transparent px-[0.65rem] py-[0.4rem] text-[0.78rem] text-ink-2 transition-[border-color,color] duration-150 hover:border-gold hover:text-gold";
export const DELETE_BTN = "cursor-pointer rounded-[var(--radius)] border border-transparent bg-transparent px-2 py-[0.4rem] text-[0.78rem] text-ink-3 transition-[color,background] duration-150 hover:bg-[#e0525210] hover:text-[#e05252]";

export const TEMPLATE_TEXTAREA = "w-full box-border resize-y rounded-[var(--radius)] border border-border bg-bg-0 p-3 font-mono text-[0.8rem] leading-[1.6] text-ink-1 transition-colors duration-150 focus:border-gold focus:outline-none";
export const VAR_HINT = "ml-2 text-[0.7rem] font-normal text-ink-3";
export const VAR_PREVIEW = "flex flex-wrap items-center gap-[0.35rem] py-2";
export const VAR_PREVIEW_LABEL = "mr-1 text-[0.75rem] text-ink-3";
export const DRAFT_BTN_LG = "cursor-pointer rounded-[var(--radius)] border-none bg-gold px-5 py-[0.55rem] text-[0.9rem] font-semibold text-white transition-opacity duration-150 [&:hover:not(:disabled)]:opacity-85 disabled:cursor-not-allowed disabled:opacity-50";
export const DELETE_CONFIRM_BTN = "cursor-pointer rounded-[var(--radius)] border-none bg-[#e05252] px-4 py-2 text-[0.85rem] font-semibold text-white transition-opacity duration-150 [&:hover:not(:disabled)]:opacity-85 disabled:cursor-not-allowed disabled:opacity-50";

// ── Settings panel ───────────────────────────────────────────────────────────

export const SETTINGS_GRID = "grid grid-cols-2 gap-6 max-[1025px]:grid-cols-1";

export const COMPLETION_BAR_WRAP = "my-[0.5rem] mb-[0.35rem] h-[7px] w-full overflow-hidden rounded-[100px] bg-[rgba(255,255,255,0.07)]";
export const COMPLETION_BAR_FILL = "h-full rounded-[100px] bg-[linear-gradient(90deg,var(--gold)_0%,#e6c96a_100%)] transition-[width] duration-[600ms] ease-in-out";
export const COMPLETION_LABEL = "mb-2 text-[0.75rem] text-ink-3";

export const PRACTICE_AREA_GRID = "mt-[0.4rem] flex flex-wrap gap-[0.4rem]";
export const PRACTICE_AREA_CHIP = "cursor-pointer select-none";
// .chipInactive mirrors .chipActive's shared base rule (display/padding/border-width/
// transition) then layers its own background/color/border-color; hover state ported too.
export const CHIP_INACTIVE = "inline-block rounded-[100px] border border-border bg-[rgba(255,255,255,0.04)] px-[0.65rem] py-[0.3rem] text-[0.72rem] font-medium text-ink-3 transition-[background,color,border-color] duration-150 hover:border-[rgba(201,168,76,0.4)] hover:text-ink-2";

export const TEAMS_LIST = "flex flex-col gap-2";
export const TEAMS_ITEM = "overflow-hidden rounded-[var(--radius)] border border-border";
export const TEAMS_ITEM_HEADER = "flex items-center justify-between bg-bg-1 px-[0.9rem] py-[0.6rem]";
export const TEAMS_EXPAND_BTN = "flex flex-1 cursor-pointer items-center gap-[0.6rem] border-none bg-transparent text-left font-sans text-ink-1";
export const TEAMS_EXPAND_ARROW = "inline-block w-3 text-[0.75rem] text-ink-3";
export const TEAMS_ITEM_NAME = "text-[0.875rem] font-semibold text-ink-1";
export const TEAMS_MEMBER_LIST = "flex flex-col gap-[0.3rem] border-t border-border bg-bg-0 px-[0.9rem] pb-3 pt-2";
export const TEAMS_MEMBER_ROW = "flex items-center justify-between py-[0.3rem]";
export const TEAMS_MEMBER_NAME = "text-[0.83rem] text-ink-2";
export const TEAMS_ADD_MEMBER_ROW = "mt-2 flex items-center gap-2";

export const PREF_ROW = "flex items-center justify-between gap-4";
export const PREF_LABEL = "text-[0.875rem] font-semibold text-ink-1";
export const PREF_SUB = "mt-[0.15rem] text-[0.78rem] text-ink-3";

export const DANGER_TEXT = "mb-2 mt-0 text-[0.82rem] leading-[1.6] text-ink-3";

// ── Clients panel ────────────────────────────────────────────────────────────

export const ACTION_BTN_PORTAL = "cursor-pointer whitespace-nowrap rounded-[var(--radius)] border border-[rgba(184,150,76,0.3)] bg-[rgba(184,150,76,0.12)] px-[0.65rem] py-[0.25rem] text-[0.78rem] font-semibold text-gold transition-[background,border-color] duration-150 hover:border-gold hover:bg-[rgba(184,150,76,0.22)]";

export const PORTAL_FORM = "mb-3 rounded-[var(--radius)] border border-border bg-bg-2 px-[1.1rem] py-4";
export const PORTAL_FORM_TITLE = "m-0 mb-3 text-[0.8rem] font-bold uppercase tracking-[0.06em] text-ink-2";
export const PORTAL_NEW_LINK = "mb-1 rounded-[var(--radius)] border border-[rgba(59,190,133,0.25)] bg-[rgba(59,190,133,0.08)] px-4 py-[0.85rem]";
export const PORTAL_LINK_ROW = "flex items-center gap-[0.6rem]";
export const PORTAL_LINK_CODE = "flex-1 break-all rounded-[4px] border border-border bg-bg-0 px-[0.65rem] py-[0.4rem] font-mono text-[0.75rem] text-ink-1";
export const PORTAL_COPY_BTN = "shrink-0 cursor-pointer whitespace-nowrap rounded-[var(--radius)] border-none bg-gold px-3 py-[0.35rem] text-[0.78rem] font-semibold text-white transition-opacity duration-150 hover:opacity-85";
export const PORTAL_TOKEN_LIST = "flex max-h-[220px] flex-col gap-2 overflow-y-auto";
export const PORTAL_TOKEN_ROW = "flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-bg-2 px-[0.85rem] py-[0.6rem] max-[769px]:flex-col max-[769px]:items-start max-[769px]:gap-2";
export const PORTAL_TOKEN_INFO = "flex min-w-0 flex-col gap-[0.15rem]";
export const PORTAL_TOKEN_LABEL = "text-[0.83rem] font-semibold text-ink-1";
export const PORTAL_TOKEN_META = "text-[0.72rem] text-ink-3";

// ── Calendar panel ───────────────────────────────────────────────────────────

export const CAL_LAYOUT = "grid h-[calc(100vh-140px)] grid-cols-[1fr_300px] items-start gap-5 overflow-hidden max-[901px]:grid-cols-1 max-[901px]:h-auto max-[901px]:overflow-visible";
export const CAL_MAIN = "overflow-hidden rounded-[var(--radius)] border border-border bg-bg-1 px-5 pb-4 pt-[1.1rem]";
export const CAL_MONTH_NAV = "mb-[0.85rem] flex items-center gap-3";
export const CAL_NAV_BTN = "cursor-pointer rounded-[calc(var(--radius)-2px)] border border-border bg-transparent px-[0.55rem] py-[0.15rem] text-[1.1rem] leading-none text-ink-2 transition-colors duration-150";
export const CAL_MONTH_LABEL = "text-base font-bold text-ink-1";
export const CAL_GRID = "grid grid-cols-7 gap-[2px]";
export const CAL_DOW_CELL = "px-0 py-[0.3rem] text-center text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-ink-3";
export const CAL_EMPTY_CELL = "min-h-[64px] bg-transparent";
export const CAL_DAY_CELL = "relative min-h-[64px] cursor-pointer rounded-[calc(var(--radius)-2px)] border border-transparent bg-bg-0 px-[0.4rem] pb-[0.3rem] pt-[0.35rem] transition-colors duration-100 hover:border-border hover:bg-bg-2";
export const CAL_SELECTED = "!border-gold !bg-[#7c5a0012]";
// .calToday's only effect in the source CSS is on its .calDayNum descendant
// (a gold circle around the number) — applied here directly to that span via a
// ternary in JSX rather than via a parent class + descendant selector.
export const CAL_DAY_NUM = "mb-[0.2rem] inline-flex h-[1.55rem] w-[1.55rem] items-center justify-center text-[0.8rem] font-medium text-ink-2";
export const CAL_DAY_NUM_TODAY = "rounded-full bg-gold font-bold text-[#1a1200]";
export const CAL_DOTS = "flex flex-wrap gap-[3px]";
export const CAL_DOT_HEARING = "inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-gold";
export const CAL_DOT_DEADLINE = "inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[#e05252]";
export const CAL_DOT_MORE = "text-[0.6rem] leading-[7px] text-ink-3";
export const CAL_LEGEND = "mt-3 flex items-center gap-[0.4rem] text-[0.78rem] text-ink-3";
export const CAL_SIDEBAR = "flex max-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-1";
export const CAL_SIDEBAR_HEADER = "shrink-0 border-b border-border px-4 pb-3 pt-4";
export const CAL_SIDEBAR_TITLE = "text-[0.82rem] font-bold text-ink-1";
export const CAL_EVENT_LIST = "flex flex-1 flex-col gap-[0.55rem] overflow-y-auto px-[0.85rem] py-3";
export const CAL_EVENT_CARD = "rounded-[calc(var(--radius)-2px)] border-l-[3px] border-l-transparent bg-bg-0 px-3 py-[0.6rem] text-[0.82rem]";
export const CAL_EVENT_HEARING = "!border-l-gold";
export const CAL_EVENT_DEADLINE = "!border-l-[#e05252]";
export const CAL_EVENT_COMPLETED = "opacity-[0.55]";
export const CAL_EVENT_TOP = "mb-[0.25rem] flex items-start justify-between gap-[0.4rem]";
export const CAL_EVENT_TITLE = "flex-1 break-words font-semibold leading-[1.35] text-ink-1";
export const CAL_EVENT_ACTIONS = "flex shrink-0 gap-[0.2rem]";
export const CAL_CHECK_BTN = "cursor-pointer rounded-[4px] border-none bg-transparent px-[0.3rem] py-[0.1rem] text-[0.8rem] text-ink-3 transition-colors duration-100 hover:bg-[#3ab57a18] hover:text-[#3ab57a]";
export const CAL_EDIT_BTN = "cursor-pointer rounded-[4px] border-none bg-transparent px-[0.3rem] py-[0.1rem] text-[0.8rem] text-ink-3 transition-colors duration-100 hover:bg-[#7c5a0015] hover:text-gold";
export const CAL_DEL_BTN = "cursor-pointer rounded-[4px] border-none bg-transparent px-[0.3rem] py-[0.1rem] text-[0.8rem] text-ink-3 transition-colors duration-100 hover:bg-[#e0525218] hover:text-[#e05252]";
export const CAL_EVENT_META = "flex flex-wrap gap-[0.35rem] text-[0.73rem] text-ink-3";
export const CAL_WA_BADGE = "rounded-[100px] bg-[#25d36618] px-[0.4rem] py-[0.05rem] text-[0.68rem] font-semibold text-[#25d366]";

// ── Matter financials tab (time tracking timer) ─────────────────────────────

export const TIMER_WIDGET = "my-3 flex items-center gap-5 rounded-[var(--radius)] border border-border bg-bg-1 px-[1.1rem] py-[0.9rem]";
export const TIMER_DISPLAY = "min-w-[7rem] text-[1.85rem] font-bold tracking-[0.06em] text-ink-1 [font-variant-numeric:tabular-nums]";
export const TIMER_CONTROLS = "flex flex-wrap items-center gap-2";
export const BTN_GOLD = "cursor-pointer rounded-[var(--radius)] border-none bg-gold px-[0.9rem] py-[0.45rem] text-[0.85rem] font-semibold text-[#1a1400] transition-opacity duration-150 hover:opacity-85";
export const TIME_SUMMARY_ROW = "flex flex-wrap items-center gap-6 px-0 pb-3 pt-[0.4rem] text-[0.83rem] text-ink-2 [&>strong]:text-ink-1";
export const ORDER_ACTIONS = "mt-2 flex gap-[0.35rem]";

// ── Overview panel ───────────────────────────────────────────────────────────

export const WELCOME_BANNER = "mb-8 rounded-lg border border-gold-border bg-[linear-gradient(135deg,var(--gold-dim)_0%,var(--bg-1)_100%)] px-9 py-8";
export const WELCOME_TITLE = "mb-2 font-serif text-[1.5rem] font-bold tracking-tight text-gold";
export const WELCOME_SUB = "max-w-[560px] text-[0.9rem] leading-[1.65] text-ink-2";
export const STATS_GRID = "mb-10 grid grid-cols-4 gap-4 max-[1025px]:grid-cols-2 max-[769px]:gap-3";
export const STAT_CARD = "rounded-[12px] border border-border bg-bg-1 px-5 py-6 transition-colors duration-200 hover:border-gold-border";
export const STAT_BADGE = "mb-[0.85rem] flex h-[32px] w-[32px] items-center justify-center rounded-sm bg-gold-dim text-[0.7rem] font-extrabold text-gold";
export const STAT_VALUE = "mb-[0.3rem] font-serif text-2xl font-bold leading-none text-gold";
export const STAT_LABEL = "mb-[0.2rem] text-[0.85rem] font-semibold text-ink-1";
export const STAT_SUB = "text-xs text-ink-3";
// .quickActions was an empty base rule; its mobile flex-direction/gap overrides
// never had effect since no display:flex was ever set — functionally a no-op.
export const QUICK_ACTIONS = "";
export const ACTION_CARDS = "grid grid-cols-3 gap-4 max-[1025px]:grid-cols-1";
export const ACTION_CARD = "flex cursor-pointer items-start gap-4 rounded-[12px] border border-border bg-bg-1 p-5 transition-colors duration-200 hover:border-gold-border";
export const ACTION_CARD_ICON = "flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-sm bg-gold-dim text-[0.7rem] font-extrabold text-gold";
export const ACTION_CARD_TITLE = "mb-[0.3rem] text-[0.875rem] font-semibold text-ink-1";
export const ACTION_CARD_SUB = "text-[0.78rem] leading-[1.45] text-ink-3";
