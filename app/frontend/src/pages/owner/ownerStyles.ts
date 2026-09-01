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

export const SIDEBAR = "flex w-[232px] shrink-0 flex-col overflow-hidden border-r border-border bg-bg-1 [@media(max-width:1024px)and(min-width:769px)]:w-[200px] max-[769px]:fixed max-[769px]:inset-y-0 max-[769px]:left-[-260px] max-[769px]:z-[110] max-[769px]:w-[240px] max-[769px]:overflow-y-auto max-[769px]:transition-[left] max-[769px]:duration-[250ms] max-[769px]:ease-in-out";
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
