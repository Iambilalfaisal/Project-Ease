import { useState, useEffect, KeyboardEvent, MouseEvent } from "react";

type Modal = "signin" | "signup" | "demo" | "forgot" | "reset" | null;

// ── Tailwind class constants (ported 1:1 from Landing.module.css) ─────────────

const PAGE = "min-h-screen overflow-x-hidden bg-bg-0 font-sans text-ink-1 antialiased [&_*::-webkit-scrollbar]:w-[5px] [&_*::-webkit-scrollbar-track]:bg-bg-0 [&_*::-webkit-scrollbar-thumb]:rounded-[3px] [&_*::-webkit-scrollbar-thumb]:bg-gold-border";

const NAV = "fixed inset-x-0 top-0 z-[100] flex h-[72px] items-center justify-between px-[6%] transition-[background,border-bottom] duration-[350ms] ease-in-out";
const NAV_SCROLLED = "bg-[rgba(5,8,15,0.90)] backdrop-blur-[20px] border-b border-gold-border";
const NAV_LOGO = "cursor-pointer font-serif text-[1.45rem] font-bold tracking-tight text-gold no-underline";
const NAV_LOGO_ACCENT = "text-ink-1";
const NAV_LINKS = "flex list-none gap-10 m-0 p-0 [&_a]:text-ink-2 [&_a]:no-underline [&_a]:text-[0.88rem] [&_a]:tracking-[0.025em] [&_a]:transition-colors [&_a]:duration-200 [&_a:hover]:text-ink-1 max-[901px]:hidden";
const NAV_ACTIONS = "flex items-center gap-[0.85rem] max-[641px]:gap-[0.4rem]";

const BTN_GOLD = "inline-flex items-center gap-[0.45rem] whitespace-nowrap rounded-sm border-none bg-[linear-gradient(135deg,#C9A84C_0%,#9C7A28_100%)] px-[1.45rem] py-[0.65rem] font-sans text-[0.88rem] font-bold tracking-[0.03em] text-[#05080F] no-underline cursor-pointer transition-[opacity,transform,box-shadow] duration-200 hover:-translate-y-px hover:opacity-[0.92] hover:shadow-[0_8px_24px_rgba(201,168,76,0.30)]";
const BTN_GOLD_LG = "!text-[1rem] !px-[2.2rem] !py-[0.9rem] !rounded-[10px]";
const BTN_GHOST = "inline-flex items-center gap-[0.45rem] whitespace-nowrap rounded-sm border border-[rgba(255,255,255,0.10)] bg-transparent px-5 py-[0.65rem] font-sans text-[0.88rem] tracking-[0.025em] text-ink-2 no-underline cursor-pointer transition-[color,border-color,background] duration-200 hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.04)] hover:text-ink-1";
const BTN_WA = "inline-flex items-center gap-[0.45rem] whitespace-nowrap rounded-sm border-none bg-[#25D366] px-[1.45rem] py-[0.65rem] font-sans text-[0.88rem] font-bold tracking-[0.02em] text-white no-underline cursor-pointer transition-[opacity,transform,box-shadow] duration-200 hover:-translate-y-px hover:opacity-90 hover:shadow-[0_8px_24px_rgba(37,211,102,0.30)] max-[641px]:hidden";
const BTN_WA_LG = "!text-[1rem] !px-[2.2rem] !py-[0.9rem] !rounded-[10px]";

const HERO = "relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-[72px] px-[6%] pb-16 text-center before:absolute before:inset-0 before:content-[''] before:pointer-events-none before:opacity-50 before:[background-image:radial-gradient(circle,rgba(201,168,76,0.12)_1px,transparent_1px)] before:[background-size:48px_48px] after:absolute after:left-1/2 after:top-[45%] after:h-[600px] after:w-[900px] after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] after:pointer-events-none after:[background:radial-gradient(ellipse,rgba(201,168,76,0.07)_0%,transparent_65%)]";
const HERO_INNER = "relative z-[1] max-w-[880px]";
const HERO_EYEBROW = "inline-flex items-center gap-2 mb-9 rounded-pill border border-gold-border bg-gold-dim px-[1.1rem] py-[0.42rem] text-xs font-bold uppercase tracking-eyebrow text-gold [animation:fadeInDown_0.65s_ease_both]";
const HERO_TITLE = "font-serif text-[clamp(2.6rem,6vw,5rem)] font-bold leading-[1.08] tracking-[-0.035em] text-ink-1 m-0 mb-7 [animation:fadeInUp_0.7s_0.1s_ease_both] max-[641px]:text-[clamp(1.8rem,8vw,2.6rem)] max-[641px]:leading-[1.2]";
const HERO_TITLE_GOLD = "text-gold";
const HERO_SUB = "mx-auto mb-12 max-w-[660px] text-[clamp(0.95rem,2vw,1.18rem)] leading-[1.8] text-ink-2 [animation:fadeInUp_0.7s_0.2s_ease_both] max-[641px]:text-[1rem]";
const HERO_CTAS = "flex flex-wrap items-center justify-center gap-4 [animation:fadeInUp_0.7s_0.3s_ease_both] max-[641px]:flex-col max-[641px]:items-stretch max-[641px]:gap-[0.65rem] max-[641px]:[&>*]:text-center";
const HERO_CAVEAT = "mt-5 text-[0.8rem] text-ink-3 [animation:fadeInUp_0.7s_0.4s_ease_both]";

const TRUST = "border-y border-[rgba(255,255,255,0.05)] bg-bg-1 px-[6%] py-9 text-center";
const TRUST_LABEL = "m-0 mb-5 text-xs uppercase tracking-[0.1em] text-ink-3";
const TRUST_BADGES_ROW = "flex flex-wrap items-center justify-center gap-[0.65rem] max-[641px]:gap-[0.4rem]";
const TRUST_BADGE = "rounded-pill border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.035)] px-[1.05rem] py-[0.42rem] text-[0.8rem] font-medium text-ink-2";

const SECTION = "mx-auto max-w-[1240px] px-[6%] py-28";
const SECTION_CENTER = "text-center";
const EYEBROW = "inline-block mb-4 text-xs font-bold uppercase tracking-eyebrow text-gold";
const SECTION_TITLE = "m-0 mb-4 font-serif text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.18] tracking-[-0.025em] text-ink-1 max-[641px]:text-[1.6rem]";
const SECTION_SUB = "mx-auto max-w-[560px] text-[1.02rem] leading-[1.75] text-ink-2";

const FEATURES_GRID = "mt-16 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 max-[641px]:grid-cols-1";
const FEATURE_CARD = "relative overflow-hidden rounded-lg border border-[rgba(255,255,255,0.055)] bg-bg-1 p-9 transition-[border-color,transform] duration-300 hover:-translate-y-[5px] hover:border-gold-border after:absolute after:inset-x-0 after:top-0 after:h-[2px] after:content-[''] after:opacity-0 after:transition-opacity after:duration-300 after:[background:linear-gradient(90deg,transparent,var(--gold),transparent)] hover:after:opacity-100";
const FEATURE_ICON = "mb-6 flex h-[50px] w-[50px] items-center justify-center rounded-[13px] border border-gold-border bg-gold-dim text-[1.5rem]";
const FEATURE_TITLE = "m-0 mb-3 font-serif text-[1.15rem] font-bold tracking-[-0.015em] text-ink-1";
const FEATURE_DESC = "m-0 text-[0.9rem] leading-[1.75] text-ink-2";

const STEPS_WRAP = "border-t border-[rgba(255,255,255,0.04)] bg-bg-0";
const STEPS_GRID = "mt-16 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6";
const STEP = "rounded-lg border border-[rgba(255,255,255,0.055)] bg-bg-1 px-8 py-9 text-center transition-colors duration-300 hover:border-gold-border";
const STEP_NUMBER = "mx-auto mb-6 flex h-[58px] w-[58px] items-center justify-center rounded-full border border-gold-border bg-gold-dim font-serif text-[1.25rem] font-bold text-gold";
const STEP_TITLE = "m-0 mb-3 font-serif text-[1.1rem] font-bold tracking-[-0.01em] text-ink-1";
const STEP_DESC = "m-0 text-[0.88rem] leading-[1.75] text-ink-2";

const SECURITY_WRAP = "border-y border-gold-border bg-bg-1";
const SECURITY_INNER = "mx-auto grid max-w-[1240px] grid-cols-2 items-center gap-20 px-[6%] py-28 max-[901px]:grid-cols-1 max-[901px]:gap-12 max-[901px]:py-20";
const SECURITY_TITLE = "m-0 mb-5 font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.2] tracking-[-0.025em] text-ink-1";
const SECURITY_DESC = "m-0 mb-8 text-[0.98rem] leading-[1.8] text-ink-2";
const SECURITY_POINTS_LIST = "m-0 flex list-none flex-col gap-[0.9rem] p-0";
const SECURITY_POINT = "flex items-start gap-[0.8rem] text-[0.9rem] leading-[1.65] text-ink-2";
const CHECK_ICON = "mt-[0.1rem] shrink-0 font-bold not-italic text-gold";
const SECURITY_VISUAL = "overflow-hidden rounded-lg border border-gold-border bg-bg-2 py-2";
const SECURITY_VISUAL_HEADER = "border-b border-[rgba(255,255,255,0.06)] px-7 pt-4 pb-3 text-xs font-bold uppercase tracking-[0.1em] text-ink-3";
const SECURITY_ROW = "flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] px-7 py-[0.9rem] transition-colors duration-200 last:border-b-0 hover:bg-[rgba(255,255,255,0.02)]";
const SECURITY_ROW_LABEL = "text-[0.83rem] text-ink-3";
const SECURITY_ROW_VALUE = "text-[0.83rem] font-semibold text-gold";

const INDUSTRIES_GRID = "mt-16 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5";
const INDUSTRY_CARD = "rounded-lg border border-[rgba(255,255,255,0.055)] bg-bg-1 p-10 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-gold-border";
const INDUSTRY_ICON = "mb-5 block text-[2.25rem]";
const INDUSTRY_TITLE = "m-0 mb-3 font-serif text-[1.2rem] font-bold tracking-[-0.015em] text-ink-1";
const INDUSTRY_DESC = "m-0 mb-6 text-[0.88rem] leading-[1.75] text-ink-2";
const INDUSTRY_TAGS = "flex flex-wrap gap-[0.45rem]";
const INDUSTRY_TAG = "rounded-pill border border-gold-border bg-gold-dim px-[0.8rem] py-[0.28rem] text-xs font-semibold tracking-[0.02em] text-gold";

const FOOTER = "flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.06)] bg-bg-1 px-[6%] py-10 max-[641px]:flex-col max-[641px]:items-center max-[641px]:text-center";
const FOOTER_LOGO = "font-serif text-[1.1rem] font-bold tracking-[-0.01em] text-gold";
const FOOTER_COPY = "text-[0.8rem] text-ink-3";
const FOOTER_RIGHT = "flex items-center";
const FOOTER_CONTACT = "text-[0.8rem] text-ink-3 no-underline transition-colors duration-200 hover:text-gold";

const OVERLAY = "fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.80)] p-4 backdrop-blur-[10px] [animation:fadeIn_0.2s_ease_both] max-[641px]:items-end max-[641px]:p-0";
const MODAL = "relative w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[22px] border border-gold-border bg-bg-2 p-11 [animation:scaleIn_0.25s_ease_both] max-[641px]:!max-w-full max-[641px]:w-full max-[641px]:rounded-[22px_22px_0_0] max-[641px]:max-h-[92dvh] max-[641px]:pt-7 max-[641px]:px-5 max-[641px]:pb-8";
const MODAL_CLOSE = "absolute right-5 top-5 flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] font-sans text-[0.95rem] text-ink-2 transition-colors duration-200 hover:bg-[rgba(255,255,255,0.1)] hover:text-ink-1";
const MODAL_TITLE = "m-0 mb-[0.4rem] font-serif text-[1.7rem] font-bold tracking-[-0.025em] text-ink-1";
const MODAL_SUB = "m-0 mb-8 text-[0.88rem] leading-[1.6] text-ink-2";

const FORM_ROW = "grid grid-cols-2 gap-4 max-[641px]:grid-cols-1";
const FORM_GROUP = "mb-[1.1rem]";
const FORM_LABEL = "mb-2 block text-[0.78rem] font-semibold uppercase tracking-[0.03em] text-ink-2";
const FORM_INPUT = "box-border w-full rounded-sm border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] px-4 py-[0.78rem] font-sans text-[0.92rem] text-ink-1 outline-none transition-[border-color,background] duration-200 placeholder:text-ink-3 focus:border-gold-border focus:bg-[rgba(201,168,76,0.04)]";
const FORM_SELECT = `${FORM_INPUT} cursor-pointer appearance-none bg-no-repeat pr-10 [&>option]:bg-[#101828] [&>option]:text-ink-1`;
const FORM_SELECT_CHEVRON_STYLE = {
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
    backgroundPosition: "right 1rem center",
};
const FORM_TEXTAREA = "box-border w-full resize-y rounded-sm border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] px-4 py-[0.78rem] font-sans text-[0.92rem] leading-[1.65] text-ink-1 outline-none transition-[border-color,background] duration-200 placeholder:text-ink-3 focus:border-gold-border focus:bg-[rgba(201,168,76,0.04)]";
const FORM_SUBMIT = "mt-2 w-full cursor-pointer rounded-[9px] border-none bg-[linear-gradient(135deg,#C9A84C_0%,#9C7A28_100%)] p-[0.88rem] font-sans text-[0.95rem] font-bold tracking-[0.03em] text-[#05080F] transition-[opacity,transform,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-[0.55] enabled:hover:-translate-y-px enabled:hover:opacity-[0.92] enabled:hover:shadow-[0_8px_24px_rgba(201,168,76,0.28)]";
const FORM_ERROR = "mb-[1.1rem] rounded-[7px] border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] px-[0.9rem] py-[0.65rem] text-[0.83rem] leading-[1.5] text-[#F87171]";
const FORM_SWITCH = "mt-5 text-center text-[0.83rem] text-ink-3";
const FORM_SWITCH_BTN = "cursor-pointer border-none bg-transparent p-0 font-sans text-inherit text-gold underline underline-offset-2";

const DEMO_WRAP = "border-y border-[rgba(255,255,255,0.04)] bg-bg-1";
const DEMO_INNER = "mx-auto grid max-w-[1240px] grid-cols-2 items-start gap-20 px-[6%] py-28 max-[901px]:grid-cols-1 max-[901px]:gap-12 max-[901px]:py-20";
const DEMO_LEFT = "sticky top-[100px] max-[901px]:static";
const DEMO_POINTS = "mt-8 flex flex-col gap-[0.9rem]";
const DEMO_POINT = "flex items-start gap-[0.8rem] text-[0.9rem] leading-[1.6] text-ink-2";
const DEMO_FORM_CARD = "rounded-lg border border-gold-border bg-bg-2 p-10";
const DEMO_FORM_TITLE = "m-0 mb-[0.4rem] font-serif text-[1.5rem] font-bold tracking-tight text-ink-1";
const DEMO_FORM_SUB = "m-0 mb-7 text-[0.85rem] text-ink-2";

const SUCCESS_MSG = "py-8 text-center [animation:fadeInUp_0.5s_ease_both]";
const SUCCESS_ICON = "mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-gold bg-gold-dim text-[1.5rem] text-gold";
const SUCCESS_TITLE = "m-0 mb-[0.6rem] font-serif text-[1.4rem] font-bold text-ink-1";
const SUCCESS_SUB = "m-0 text-[0.9rem] leading-[1.7] text-ink-2";

const CONTACT_WRAP = "bg-bg-0";
const CONTACT_CARDS = "mt-14 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5";
const CONTACT_CARD = "flex flex-col items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.055)] bg-bg-1 px-8 py-9 text-center no-underline transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-gold-border";
const CONTACT_ICON = "mb-2 text-[1.75rem]";
const CONTACT_CARD_LABEL = "text-xs font-bold uppercase tracking-[0.1em] text-ink-3";
const CONTACT_CARD_VALUE = "break-all text-[0.9rem] text-ink-2";
const CONTACT_CARD_WA = "!border-[rgba(37,211,102,0.25)] hover:!border-[rgba(37,211,102,0.55)]";

const REQUIRED = "ml-[2px] text-gold";
const PLAN_CARDS = "mt-2 grid grid-cols-3 gap-[0.6rem]";
const PLAN_CARD = "cursor-pointer rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] px-[0.65rem] py-[0.85rem] text-center transition-[border-color,background] duration-200 hover:border-[rgba(201,168,76,0.4)] hover:bg-[rgba(201,168,76,0.04)]";
const PLAN_CARD_ACTIVE = "!border-gold !bg-[rgba(201,168,76,0.08)]";
const PLAN_CARD_NAME = "mb-[0.3rem] text-[0.78rem] font-bold text-ink-1";
const PLAN_CARD_PRICE = "mb-[0.2rem] text-[0.7rem] font-semibold text-gold";
const PLAN_CARD_USERS = "text-[0.65rem] text-ink-3";
const PLAN_NOTE = "mt-2 mx-0 mb-4 rounded-[6px] border-l-2 border-l-gold-border bg-[rgba(255,255,255,0.025)] px-3 py-[0.6rem] text-[0.75rem] leading-[1.6] text-ink-3";

const PLD_WRAP = "border-y border-[rgba(255,255,255,0.04)] bg-bg-1";
const PLD_INNER = "mx-auto grid max-w-[1240px] grid-cols-2 items-center gap-20 px-[6%] py-28 max-[901px]:grid-cols-1 max-[901px]:gap-12 max-[901px]:py-20";
const PLD_TEXT = "";
const PLD_BADGES = "mt-7 flex flex-wrap gap-2";
const PLD_BADGE = "rounded-pill border border-gold-border bg-gold-dim px-[0.9rem] py-[0.3rem] text-xs font-semibold tracking-[0.03em] text-gold";
const PLD_VISUAL = "flex items-center justify-center";
const PLD_CARD = "w-full max-w-[480px] rounded-[16px] border border-gold-border bg-bg-2 p-8";
const PLD_CARD_Q = "mb-5 text-[0.95rem] italic leading-[1.7] text-ink-1 before:content-['\"'] after:content-['\"']";
const PLD_CARD_DIVIDER = "mb-5 h-px bg-gold-border";
const PLD_CARD_A_LABEL = "mb-2 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gold";
const PLD_CARD_A = "mb-5 text-[0.875rem] leading-[1.75] text-ink-2";
const PLD_CARD_CITATIONS = "flex flex-wrap gap-[0.4rem]";
const PLD_CIT = "rounded-[4px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] px-[0.55rem] py-[0.2rem] font-mono text-[0.7rem] text-ink-3";

const PRICING_GRID = "mt-16 grid grid-cols-4 items-start gap-5 max-[1101px]:grid-cols-2 max-[641px]:grid-cols-1 max-[641px]:gap-4";
const PRICING_CARD = "relative flex flex-col gap-0 rounded-lg border border-[rgba(255,255,255,0.055)] bg-bg-1 px-7 py-8 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-gold-border";
const PRICING_CARD_POPULAR = "!border-gold-border !bg-[rgba(201,168,76,0.04)] !-translate-y-[6px] hover:!-translate-y-[10px] max-[1101px]:!translate-y-0";
const PRICING_POPULAR_BADGE = "absolute left-1/2 top-[-14px] -translate-x-1/2 whitespace-nowrap rounded-pill bg-[linear-gradient(135deg,#C9A84C_0%,#9C7A28_100%)] px-[0.9rem] py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[#05080F]";
const PRICING_PLAN_NAME = "mb-3 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink-3";
const PRICING_PRICE = "mb-[0.3rem] font-serif text-[1.65rem] font-bold leading-none tracking-[-0.025em] text-ink-1";
const PRICING_PERIOD = "ml-[0.2rem] font-sans text-[0.8rem] font-normal text-ink-3";
const PRICING_META = "mb-5 text-[0.78rem] text-gold";
const PRICING_DIVIDER = "mb-5 h-px bg-[rgba(255,255,255,0.06)]";
const PRICING_FEATURE_LIST = "m-0 mb-7 flex flex-1 flex-col list-none gap-[0.55rem] p-0";
const PRICING_FEATURE_ITEM = "flex items-start gap-2 text-[0.82rem] leading-[1.5] text-ink-2";
const PRICING_CHECK = "mt-[0.05em] shrink-0 font-bold text-gold";
const PRICING_NOTE = "mt-10 text-center text-[0.78rem] leading-[1.6] text-ink-3";

const PK_CITIES = [
    "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
    "Hyderabad", "Abbottabad", "Bahawalpur", "Sukkur", "Dera Ghazi Khan",
];

const PRACTICE_AREAS = [
    "Corporate & Commercial",
    "Criminal Defence",
    "Family & Personal Law",
    "Civil Litigation",
    "Property & Real Estate",
    "Tax & Revenue",
    "Constitutional & Public Law",
    "Banking & Finance",
    "Labour & Employment",
    "Intellectual Property",
];

const SIGNUP_PLANS = [
    { id: "starter",    label: "Starter",      price: "PKR 5,999 / month",  users: "Up to 5 users"  },
    { id: "pro",        label: "Pro",          price: "PKR 14,999 / month", users: "Up to 20 users" },
    { id: "enterprise", label: "Enterprise",   price: "PKR 34,999 / month", users: "Unlimited users" },
];

const PLANS = [
    {
        id:       "trial",
        label:    "14-Day Trial",
        price:    "Free",
        period:   "",
        docs:     "10 documents",
        users:    "2 users",
        features: ["Full AI search", "Document upload", "English & Urdu queries", "Email support"],
        popular:  false,
        cta:      "Start Free Trial",
    },
    {
        id:       "starter",
        label:    "Starter",
        price:    "PKR 5,999",
        period:   "/ month",
        docs:     "75 documents",
        users:    "5 users",
        features: ["Everything in Trial", "Court calendar", "Fee tracking", "Invoice generation"],
        popular:  false,
        cta:      "Get Started",
    },
    {
        id:       "pro",
        label:    "Pro",
        price:    "PKR 14,999",
        period:   "/ month",
        docs:     "500 documents",
        users:    "20 users",
        features: ["Everything in Starter", "Priority support", "Audit log export", "WhatsApp reminders"],
        popular:  true,
        cta:      "Get Started",
    },
    {
        id:       "enterprise",
        label:    "Enterprise",
        price:    "PKR 34,999",
        period:   "/ month",
        docs:     "Unlimited",
        users:    "Unlimited users",
        features: ["Everything in Pro", "Dedicated onboarding", "Custom integrations", "SLA guarantee"],
        popular:  false,
        cta:      "Contact Us",
    },
];

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: "⚖️",
        title: "Built for Pakistani Courts",
        desc: "Search across PLD, SCMR, and MLD volumes alongside your firm's own case files. Ask 'What did the Lahore High Court hold on adverse possession?' and get a cited answer instantly.",
    },
    {
        icon: "⚡",
        title: "Find Any Answer in Seconds",
        desc: "Ask any question about your documents in plain English or Urdu — just like asking a colleague. The system searches your entire library and returns a precise, sourced answer instantly.",
    },
    {
        icon: "✅",
        title: "Answers You Can Actually Trust",
        desc: "Every response is automatically verified for accuracy before it reaches your team. You always see which document the answer came from — cite it, rely on it, act on it.",
    },
    {
        icon: "🌐",
        title: "English, Roman Urdu, or Urdu Script",
        desc: "Type your question however your team thinks. The system understands all three naturally. No language settings to configure. Your advocates and clerks work in the language they prefer.",
    },
    {
        icon: "📁",
        title: "Any Document, Any Format",
        desc: "Upload vakalatnamas, plaints, FIR copies, property deeds, tax returns, scanned court orders — any format. Everything is read, organized, and made instantly searchable without manual tagging.",
    },
    {
        icon: "🗓️",
        title: "Court Calendar & WhatsApp Reminders",
        desc: "Track hearing dates, filing deadlines, and adjournments in one calendar. Receive WhatsApp reminders the day before so no court date is ever missed.",
    },
];

const STEPS = [
    {
        n: "01",
        title: "Upload Your Documents",
        desc: "Upload contracts, case files, tax returns, audit reports — any format. Everything is read and organized automatically. No technical setup, no manual tagging."
    },
    {
        n: "02",
        title: "Ask in Plain Language",
        desc: "Type any question in English or Urdu, just like asking a colleague. The system searches across all your documents and finds exactly what you need — in seconds."
    },
    {
        n: "03",
        title: "Get a Clear, Sourced Answer",
        desc: "Receive a concise answer with the exact document and page it came from. Your team can verify the source instantly and act with complete confidence."
    }
];

const SECURITY_ROWS = [
    ["Your Firm's Files",         "Completely Isolated — Private to Your Team"],
    ["Sign-In Security",          "Verified Identity · Sessions Auto-Expire"],
    ["Inactivity Timeout",        "15 Minutes — Automatic Sign-Out"],
    ["Passwords",                 "Encrypted Beyond Recovery"],
    ["Files During Upload",       "Encrypted End-to-End"],
    ["Files in Storage",          "Bank-Grade Encryption at Rest"],
    ["Login Sessions",            "Expire Automatically for Safety"],
    ["Admin Access",              "Restricted to Authorised Personnel Only"],
];

const SECURITY_POINTS = [
    "All documents are encrypted — both while stored and while travelling to your screen",
    "Each firm's files are completely separated — your documents never touch another firm's",
    "Sessions automatically sign out after inactivity to prevent unauthorised access",
    "Each team member sees only what they are permitted to see — nothing more",
    "Passwords are encrypted in a way that even we cannot read them",
    "Multiple failed login attempts are automatically blocked to prevent break-ins",
    "Your firm's identity is verified at the server — not based on what a user types in",
];

const INDUSTRIES = [
    {
        icon: "⚖️",
        title: "Litigation & Advocacy",
        desc: "Search your case files, court orders, and PLD judgments in one query. Draft arguments citing real precedents. Track hearings at the Lahore, Sindh, and Islamabad High Courts with WhatsApp reminders the day before.",
        tags: ["PLD / SCMR Search", "Precedent Research", "Hearing Tracker", "Court Order Analysis"],
    },
    {
        icon: "🏢",
        title: "Corporate & Commercial Law",
        desc: "Analyse contracts, shareholder agreements, SECP filings, and M&A documents at speed. Ask 'What are the termination clauses in this agreement?' and get an exact answer with the clause number.",
        tags: ["Contract Review", "Due Diligence", "SECP Compliance", "M&A Documents"],
    },
    {
        icon: "📋",
        title: "CA & Tax Practices",
        desc: "Navigate the Income Tax Ordinance, Sales Tax Act, and FBR circulars alongside your client files. Surface the exact provision or ruling your team needs in seconds — cited to the source.",
        tags: ["FBR Circulars", "Tax Ordinance Search", "Audit Documentation", "Regulatory Filings"],
    },
];

const TRUST_BADGES = [
    "⚖️  High Court Advocates",
    "🏛️  Supreme Court Practices",
    "📋  District Court Firms",
    "🏢  Corporate Legal Teams",
    "📑  CA & Accounting Firms",
    "🏗️  Commercial Law Chambers",
];

// ─── Component ───────────────────────────────────────────────────────────────

const Landing = () => {
    const [scrolled, setScrolled]       = useState(false);
    const [modal, setModal]             = useState<Modal>(null);
    const [demoSent, setDemoSent]       = useState(false);
    const [contactSent, setContactSent] = useState(false);
    const [resetToken, setResetToken]   = useState<string | null>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Detect password reset token in URL hash: /#/?reset_token=xxx
    useEffect(() => {
        const hash   = window.location.hash;          // "#/?reset_token=xxx"
        const search = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
        const tok    = new URLSearchParams(search).get("reset_token");
        if (tok) { setResetToken(tok); setModal("reset"); }
    }, []);

    const open  = (m: Modal) => { setModal(m); setDemoSent(false); };
    const close = ()          => setModal(null);

    // Plain href="#id" anchors don't work here — this app uses createHashRouter,
    // so the hash IS the router's path and "#features" gets matched as a route
    // (there is none), landing on the router's default 404 instead of scrolling.
    // Scroll manually and never touch location.hash.
    const scrollToSection = (id: string) => (e: MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className={PAGE}>

            {/* ══════════════ NAVBAR ══════════════ */}
            <nav className={`${NAV} ${scrolled ? NAV_SCROLLED : ""}`}>
                <span className={NAV_LOGO}>
                    Project<span className={NAV_LOGO_ACCENT}> Ease</span>
                </span>

                <ul className={NAV_LINKS}>
                    <li><a href="#features" onClick={scrollToSection("features")}>Features</a></li>
                    <li><a href="#pld" onClick={scrollToSection("pld")}>PLD / SCMR</a></li>
                    <li><a href="#pricing" onClick={scrollToSection("pricing")}>Pricing</a></li>
                    <li><a href="#security" onClick={scrollToSection("security")}>Security</a></li>
                    <li><a href="#contact" onClick={scrollToSection("contact")}>Contact</a></li>
                </ul>

                <div className={NAV_ACTIONS}>
                    <a
                        href="https://wa.me/923224255722?text=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20Project%20Ease"
                        className={BTN_WA}
                        target="_blank"
                        rel="noreferrer"
                    >
                        💬 WhatsApp
                    </a>
                    <button className={BTN_GHOST} onClick={() => open("signin")}>
                        Sign In
                    </button>
                    <button className={BTN_GOLD} onClick={() => open("signup")}>
                        Free Trial
                    </button>
                </div>
            </nav>

            {/* ══════════════ HERO ══════════════ */}
            <section className={HERO}>
                <div className={HERO_INNER}>
                    <div className={HERO_EYEBROW}>
                        ✦ &nbsp;AI Document Intelligence for Pakistan's Legal Profession
                    </div>

                    <h1 className={HERO_TITLE}>
                        Your Entire Case Library —<br />
                        <span className={HERO_TITLE_GOLD}>Answered in Seconds</span>
                    </h1>

                    <p className={HERO_SUB}>
                        Search PLD judgments, SCMR precedents, contracts, and your own case
                        files in one query. Ask in English or Urdu. Get a cited, verified
                        answer your team can act on — instantly.
                    </p>

                    <div className={HERO_CTAS}>
                        <button
                            className={`${BTN_GOLD} ${BTN_GOLD_LG}`}
                            onClick={() => open("signup")}
                        >
                            Start 14-Day Free Trial &nbsp;→
                        </button>
                        <a
                            href="https://wa.me/923224255722?text=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20Project%20Ease"
                            className={`${BTN_WA} ${BTN_WA_LG}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            💬 &nbsp;Chat on WhatsApp
                        </a>
                    </div>

                    <p className={HERO_CAVEAT}>
                        Free for 14 days · No credit card · Setup in under 10 minutes
                    </p>
                </div>
            </section>

            {/* ══════════════ TRUST BAR ══════════════ */}
            <div className={TRUST}>
                <p className={TRUST_LABEL}>
                    Trusted by legal professionals across Pakistan
                </p>
                <div className={TRUST_BADGES_ROW}>
                    {TRUST_BADGES.map(b => (
                        <span key={b} className={TRUST_BADGE}>{b}</span>
                    ))}
                </div>
            </div>

            {/* ══════════════ FEATURES ══════════════ */}
            <div id="features">
                <div className={`${SECTION} ${SECTION_CENTER}`}>
                    <span className={EYEBROW}>Core Capabilities</span>
                    <h2 className={SECTION_TITLE}>
                        Built for Pakistan's Legal Professionals
                    </h2>
                    <p className={SECTION_SUB}>
                        Everything your firm needs to research faster, never miss a court date,
                        and bill more accurately — without any technical knowledge.
                    </p>
                    <div className={FEATURES_GRID}>
                        {FEATURES.map(f => (
                            <div key={f.title} className={FEATURE_CARD}>
                                <div className={FEATURE_ICON}>{f.icon}</div>
                                <h3 className={FEATURE_TITLE}>{f.title}</h3>
                                <p className={FEATURE_DESC}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ HOW IT WORKS ══════════════ */}
            <div id="how-it-works" className={STEPS_WRAP}>
                <div className={`${SECTION} ${SECTION_CENTER}`}>
                    <span className={EYEBROW}>How It Works</span>
                    <h2 className={SECTION_TITLE}>
                        From Upload to Answer in Three Steps
                    </h2>
                    <p className={SECTION_SUB}>
                        No training courses. No IT department required. Your team is up and running the same day.
                    </p>
                    <div className={STEPS_GRID}>
                        {STEPS.map(s => (
                            <div key={s.n} className={STEP}>
                                <div className={STEP_NUMBER}>{s.n}</div>
                                <h3 className={STEP_TITLE}>{s.title}</h3>
                                <p className={STEP_DESC}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ SECURITY ══════════════ */}
            <div id="security" className={SECURITY_WRAP}>
                <div className={SECURITY_INNER}>
                    <div>
                        <span className={EYEBROW}>Enterprise Security</span>
                        <h2 className={SECURITY_TITLE}>
                            Security Designed for Client Confidentiality
                        </h2>
                        <p className={SECURITY_DESC}>
                            Law firms and CA practices handle some of the most sensitive data
                            in existence. Project Ease was built with that responsibility at
                            the core — not as an afterthought.
                        </p>
                        <ul className={SECURITY_POINTS_LIST}>
                            {SECURITY_POINTS.map(p => (
                                <li key={p} className={SECURITY_POINT}>
                                    <i className={CHECK_ICON}>✓</i>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={SECURITY_VISUAL}>
                        <div className={SECURITY_VISUAL_HEADER}>
                            How We Keep You Safe
                        </div>
                        {SECURITY_ROWS.map(([label, value]) => (
                            <div key={label} className={SECURITY_ROW}>
                                <span className={SECURITY_ROW_LABEL}>{label}</span>
                                <span className={SECURITY_ROW_VALUE}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ INDUSTRIES ══════════════ */}
            <div id="industries">
                <div className={`${SECTION} ${SECTION_CENTER}`}>
                    <span className={EYEBROW}>Who It's For</span>
                    <h2 className={SECTION_TITLE}>
                        Designed for Every Practice Area
                    </h2>
                    <p className={SECTION_SUB}>
                        Whether you practise at the Supreme Court, a district court, or a
                        corporate chamber — Project Ease speaks your language and knows your documents.
                    </p>
                    <div className={INDUSTRIES_GRID}>
                        {INDUSTRIES.map(ind => (
                            <div key={ind.title} className={INDUSTRY_CARD}>
                                <span className={INDUSTRY_ICON}>{ind.icon}</span>
                                <h3 className={INDUSTRY_TITLE}>{ind.title}</h3>
                                <p className={INDUSTRY_DESC}>{ind.desc}</p>
                                <div className={INDUSTRY_TAGS}>
                                    {ind.tags.map(t => (
                                        <span key={t} className={INDUSTRY_TAG}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ══════════════ PLD / SCMR CALLOUT ══════════════ */}
            <div id="pld" className={PLD_WRAP}>
                <div className={PLD_INNER}>
                    <div className={PLD_TEXT}>
                        <span className={EYEBROW}>Pakistani Case Law</span>
                        <h2 className={SECTION_TITLE}>
                            PLD & SCMR — At Your<br />Fingertips
                        </h2>
                        <p className={SECURITY_DESC}>
                            Pakistan Law Digest (PLD) and Supreme Court Monthly Review (SCMR)
                            contain decades of binding precedent. Finding the right judgment
                            used to take hours of manual searching.
                        </p>
                        <p className={SECURITY_DESC} style={{ marginTop: "0.75rem" }}>
                            With Project Ease, you upload your PLD volumes and SCMR reports
                            alongside your own case files. Then ask a single question — and the
                            system searches all of them at once, returning a cited answer with
                            the exact volume, year, and page.
                        </p>
                        <div className={PLD_BADGES}>
                            <span className={PLD_BADGE}>PLD volumes</span>
                            <span className={PLD_BADGE}>SCMR reports</span>
                            <span className={PLD_BADGE}>MLD judgments</span>
                            <span className={PLD_BADGE}>CLC decisions</span>
                            <span className={PLD_BADGE}>Your own case files</span>
                        </div>
                    </div>
                    <div className={PLD_VISUAL}>
                        <div className={PLD_CARD}>
                            <div className={PLD_CARD_Q}>
                                "What did the Supreme Court hold on adverse possession in agricultural land disputes?"
                            </div>
                            <div className={PLD_CARD_DIVIDER} />
                            <div className={PLD_CARD_A}>
                                <div className={PLD_CARD_A_LABEL}>Answer</div>
                                The Supreme Court held that adverse possession requires uninterrupted, hostile, and open possession for the statutory period under Section 28, Limitation Act. The burden of proof lies on the claimant to show animus possidendi throughout.
                            </div>
                            <div className={PLD_CARD_CITATIONS}>
                                <span className={PLD_CIT}>PLD 2019 SC 412</span>
                                <span className={PLD_CIT}>SCMR 2021 1048</span>
                                <span className={PLD_CIT}>Your Matter — Khan v. Ahmad</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════ PRICING ══════════════ */}
            <div id="pricing">
                <div className={`${SECTION} ${SECTION_CENTER}`}>
                    <span className={EYEBROW}>Transparent Pricing</span>
                    <h2 className={SECTION_TITLE}>
                        Simple PKR Pricing — No Hidden Fees
                    </h2>
                    <p className={SECTION_SUB}>
                        Start free for 14 days. No credit card required.
                        Upgrade only when you're ready.
                    </p>
                    <div className={PRICING_GRID}>
                        {PLANS.map(plan => (
                            <div
                                key={plan.id}
                                className={`${PRICING_CARD} ${plan.popular ? PRICING_CARD_POPULAR : ""}`}
                            >
                                {plan.popular && (
                                    <div className={PRICING_POPULAR_BADGE}>Most Popular</div>
                                )}
                                <div className={PRICING_PLAN_NAME}>{plan.label}</div>
                                <div className={PRICING_PRICE}>
                                    {plan.price}
                                    {plan.period && <span className={PRICING_PERIOD}>{plan.period}</span>}
                                </div>
                                <div className={PRICING_META}>
                                    {plan.docs} &nbsp;·&nbsp; {plan.users}
                                </div>
                                <div className={PRICING_DIVIDER} />
                                <ul className={PRICING_FEATURE_LIST}>
                                    {plan.features.map(f => (
                                        <li key={f} className={PRICING_FEATURE_ITEM}>
                                            <span className={PRICING_CHECK}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    className={plan.popular ? BTN_GOLD : BTN_GHOST}
                                    style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}
                                    onClick={() => plan.id === "enterprise" ? open("demo") : open("signup")}
                                >
                                    {plan.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className={PRICING_NOTE}>
                        All plans paid via bank transfer to our HBL account. Account activates within 24 hours of payment confirmation.
                    </p>
                </div>
            </div>

            {/* ══════════════ REQUEST A DEMO ══════════════ */}
            <div id="demo" className={DEMO_WRAP}>
                <div className={DEMO_INNER}>
                    <div className={DEMO_LEFT}>
                        <span className={EYEBROW}>Free Demo</span>
                        <h2 className={SECTION_TITLE}>
                            See It Work With<br />Your Own Documents
                        </h2>
                        <p className={SECURITY_DESC}>
                            We'll set up a live demo using your actual documents so you can
                            see exactly how Project Ease performs for your firm — before any
                            commitment or payment.
                        </p>
                        <div className={DEMO_POINTS}>
                            {[
                                "Live session using your real documents",
                                "No credit card or commitment required",
                                "We come to you — in person or over a call",
                                "Full Q&A with the team after the demo",
                            ].map(p => (
                                <div key={p} className={DEMO_POINT}>
                                    <i className={CHECK_ICON}>✓</i>
                                    <span>{p}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={DEMO_FORM_CARD}>
                        {contactSent ? (
                            <div className={SUCCESS_MSG}>
                                <div className={SUCCESS_ICON}>✓</div>
                                <h3 className={SUCCESS_TITLE}>Request Received</h3>
                                <p className={SUCCESS_SUB}>
                                    Thank you. We'll reach out within 24 hours to schedule your demo.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 className={DEMO_FORM_TITLE}>Request Your Demo</h3>
                                <p className={DEMO_FORM_SUB}>Fill in your details and we'll be in touch.</p>

                                <div className={FORM_ROW}>
                                    <div className={FORM_GROUP}>
                                        <label className={FORM_LABEL}>First Name</label>
                                        <input className={FORM_INPUT} type="text" placeholder="Ali" />
                                    </div>
                                    <div className={FORM_GROUP}>
                                        <label className={FORM_LABEL}>Last Name</label>
                                        <input className={FORM_INPUT} type="text" placeholder="Raza" />
                                    </div>
                                </div>

                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Firm / Company Name</label>
                                    <input className={FORM_INPUT} type="text" placeholder="Raza & Co" />
                                </div>

                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Industry</label>
                                    <select className={FORM_SELECT} style={FORM_SELECT_CHEVRON_STYLE} defaultValue="">
                                        <option value="" disabled>Select your industry</option>
                                        <option value="law">Law Practice</option>
                                        <option value="ca">CA / Accounting Firm</option>
                                        <option value="logistics">Logistics & Supply Chain</option>
                                        <option value="finance">Financial Services</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Work Email</label>
                                    <input className={FORM_INPUT} type="email" placeholder="partner@lawfirm.com" />
                                </div>

                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>Phone (optional)</label>
                                    <input className={FORM_INPUT} type="tel" placeholder="+92 300 0000000" />
                                </div>

                                <div className={FORM_GROUP}>
                                    <label className={FORM_LABEL}>What are you looking to solve?</label>
                                    <textarea
                                        className={FORM_TEXTAREA}
                                        rows={3}
                                        placeholder="e.g. We want to search across 5 years of case files instantly..."
                                    />
                                </div>

                                {/* TODO: wire to POST /demo/request */}
                                <button
                                    className={FORM_SUBMIT}
                                    onClick={() => setContactSent(true)}
                                >
                                    Request Demo &nbsp;→
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ══════════════ CONTACT ══════════════ */}
            <div id="contact" className={CONTACT_WRAP}>
                <div className={`${SECTION} ${SECTION_CENTER}`}>
                    <span className={EYEBROW}>Get in Touch</span>
                    <h2 className={SECTION_TITLE}>Have Questions? Let's Talk.</h2>
                    <p className={SECTION_SUB}>
                        Whether you want a demo, have a technical question, or want to discuss
                        pricing — we're here.
                    </p>
                    <div className={CONTACT_CARDS}>
                        <a
                            href="https://wa.me/923224255722?text=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20Project%20Ease"
                            className={`${CONTACT_CARD} ${CONTACT_CARD_WA}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <span className={CONTACT_ICON}>💬</span>
                            <span className={CONTACT_CARD_LABEL}>WhatsApp Us</span>
                            <span className={CONTACT_CARD_VALUE}>Fastest response · Usually within 1 hour</span>
                        </a>
                        <a href="mailto:Bilalfaisal100@gmail.com" className={CONTACT_CARD}>
                            <span className={CONTACT_ICON}>✉</span>
                            <span className={CONTACT_CARD_LABEL}>Email Us</span>
                            <span className={CONTACT_CARD_VALUE}>Bilalfaisal100@gmail.com</span>
                        </a>
                        <div className={CONTACT_CARD} onClick={() => open("demo")} style={{ cursor: "pointer" }}>
                            <span className={CONTACT_ICON}>📅</span>
                            <span className={CONTACT_CARD_LABEL}>Book a Live Demo</span>
                            <span className={CONTACT_CARD_VALUE}>Free session using your own documents</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════ FOOTER ══════════════ */}
            <footer className={FOOTER}>
                <span className={FOOTER_LOGO}>Project Ease</span>
                <span className={FOOTER_COPY}>© 2026 Project Ease. All rights reserved.</span>
                <div className={FOOTER_RIGHT}>
                    <a href="/#/compliance" className={FOOTER_CONTACT} style={{ marginRight: "1.25rem" }}>
                        Compliance & Security
                    </a>
                    <a href="mailto:Bilalfaisal100@gmail.com" className={FOOTER_CONTACT}>
                        Bilalfaisal100@gmail.com
                    </a>
                </div>
            </footer>

            {/* ══════════════ MODALS ══════════════ */}
            {modal && (
                <div
                    className={OVERLAY}
                    onClick={e => { if (e.target === e.currentTarget) close(); }}
                >
                    <div className={MODAL}>
                        <button className={MODAL_CLOSE} onClick={close}>✕</button>

                        {modal === "signin"  ? <SignInForm onSignUp={() => open("signup")} onForgot={() => open("forgot")} /> :
                         modal === "signup"  ? <SignUpForm onSignIn={() => open("signin")} /> :
                         modal === "forgot"  ? <ForgotPasswordForm onBack={() => open("signin")} /> :
                         modal === "reset"   ? <ResetPasswordForm token={resetToken ?? ""} onDone={() => open("signin")} /> :
                         <DemoModal sent={demoSent} onSend={() => setDemoSent(true)} onSwitch={() => open("signin")} />
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Sign In Modal ────────────────────────────────────────────────────────────

const SignInForm = ({ onSignUp, onForgot }: { onSignUp?: () => void; onForgot?: () => void }) => {
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");
    const [loading, setLoading]   = useState(false);

    // Force-change-password state
    const [forceChange, setForceChange] = useState(false);
    const [tempToken,   setTempToken]   = useState("");
    const [tempPw,      setTempPw]      = useState(""); // the password they just logged in with
    const [pendingRole, setPendingRole] = useState("");
    const [newPw,       setNewPw]       = useState("");
    const [confirmPw,   setConfirmPw]   = useState("");

    const submit = async () => {
        setError("");
        if (!email || !password) { setError("Please enter your email and password."); return; }
        setLoading(true);
        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Invalid email or password."); return; }

            if (data.user?.must_change_password) {
                // Store token and temp password; show force-change screen
                sessionStorage.setItem("pe_token", data.token);
                sessionStorage.setItem("pe_user", JSON.stringify(data.user));
                setTempToken(data.token);
                setTempPw(password);
                setPendingRole(data.user?.role ?? "");
                setForceChange(true);
                return;
            }

            sessionStorage.setItem("pe_token", data.token);
            sessionStorage.setItem("pe_user", JSON.stringify(data.user));
            const role: string = data.user?.role ?? "";
            window.location.hash = role === "platform_admin" ? "/admin"
                                 : role === "org_owner"      ? "/owner"
                                 : "/employee";
        } catch {
            setError("Could not reach the server. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    const submitNewPassword = async () => {
        setError("");
        if (!newPw) { setError("Please enter a new password."); return; }
        if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
        setLoading(true);
        try {
            const res = await fetch("/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tempToken}`,
                },
                body: JSON.stringify({ current_password: tempPw, new_password: newPw }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Could not change password."); return; }
            window.location.hash = pendingRole === "platform_admin" ? "/admin"
                                 : pendingRole === "org_owner"      ? "/owner"
                                 : "/employee";
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const onKey    = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") submit(); };
    const onKeyNew = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") submitNewPassword(); };

    if (forceChange) {
        return (
            <>
                <h2 className={MODAL_TITLE}>Set Your Password</h2>
                <p className={MODAL_SUB}>
                    Your account was set up with a temporary password. Please choose a new password before continuing.
                </p>

                {error && <p className={FORM_ERROR}>{error}</p>}

                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>New Password</label>
                    <input
                        className={FORM_INPUT}
                        type="password"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        onKeyDown={onKeyNew}
                    />
                </div>

                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Confirm New Password</label>
                    <input
                        className={FORM_INPUT}
                        type="password"
                        placeholder="Repeat your new password"
                        autoComplete="new-password"
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        onKeyDown={onKeyNew}
                    />
                </div>

                <button className={FORM_SUBMIT} onClick={submitNewPassword} disabled={loading}>
                    {loading ? "Saving…" : "Set Password & Continue"}
                </button>
            </>
        );
    }

    return (
        <>
            <h2 className={MODAL_TITLE}>Welcome back</h2>
            <p className={MODAL_SUB}>Sign in to your organization's workspace.</p>

            {error && <p className={FORM_ERROR}>{error}</p>}

            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>Email</label>
                <input
                    className={FORM_INPUT}
                    type="email"
                    placeholder="admin@gmail.com"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={onKey}
                />
            </div>

            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>Password</label>
                <input
                    className={FORM_INPUT}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={onKey}
                />
            </div>

            <button className={FORM_SUBMIT} onClick={submit} disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
            </button>

            <p className={FORM_SWITCH} style={{ marginTop: "0.5rem" }}>
                <button className={FORM_SWITCH_BTN} onClick={onForgot}>
                    Forgot password?
                </button>
            </p>

            {onSignUp && (
                <p className={FORM_SWITCH}>
                    New firm?&nbsp;
                    <button className={FORM_SWITCH_BTN} onClick={onSignUp}>
                        Register your firm
                    </button>
                </p>
            )}
        </>
    );
};

// ─── Forgot Password Form ─────────────────────────────────────────────────────

const ForgotPasswordForm = ({ onBack }: { onBack: () => void }) => {
    const [email,   setEmail]   = useState("");
    const [sent,    setSent]    = useState(false);
    const [error,   setError]   = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!email) { setError("Please enter your email address."); return; }
        setError(""); setLoading(true);
        try {
            await fetch("/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    base_url: `${window.location.origin}${window.location.pathname}`,
                }),
            });
            setSent(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <>
                <h2 className={MODAL_TITLE}>Check your email</h2>
                <p className={MODAL_SUB}>
                    If an account with <strong>{email}</strong> exists, we've sent a password reset link.
                    It expires in 1 hour.
                </p>
                <p className={FORM_SWITCH} style={{ marginTop: "1rem" }}>
                    <button className={FORM_SWITCH_BTN} onClick={onBack}>Back to Sign In</button>
                </p>
            </>
        );
    }

    return (
        <>
            <h2 className={MODAL_TITLE}>Forgot Password</h2>
            <p className={MODAL_SUB}>Enter your email and we'll send you a reset link.</p>
            {error && <p className={FORM_ERROR}>{error}</p>}
            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>Email</label>
                <input
                    className={FORM_INPUT}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submit(); }}
                    autoFocus
                />
            </div>
            <button className={FORM_SUBMIT} onClick={submit} disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <p className={FORM_SWITCH} style={{ marginTop: "0.5rem" }}>
                <button className={FORM_SWITCH_BTN} onClick={onBack}>Back to Sign In</button>
            </p>
        </>
    );
};

// ─── Reset Password Form (token from URL hash) ────────────────────────────────

const ResetPasswordForm = ({ token, onDone }: { token: string; onDone: () => void }) => {
    const [newPw,     setNewPw]     = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [error,     setError]     = useState("");
    const [loading,   setLoading]   = useState(false);
    const [done,      setDone]      = useState(false);

    const submit = async () => {
        if (!newPw) { setError("Please enter a new password."); return; }
        if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
        setError(""); setLoading(true);
        try {
            const res = await fetch("/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: newPw }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Could not reset password."); return; }
            // Clear the token from the URL so it can't be reused
            window.history.replaceState(null, "", window.location.pathname + "#/");
            setDone(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <>
                <h2 className={MODAL_TITLE}>Password Reset</h2>
                <p className={MODAL_SUB}>
                    Your password has been updated. You can now sign in with your new password.
                </p>
                <button className={FORM_SUBMIT} onClick={onDone}>Sign In</button>
            </>
        );
    }

    return (
        <>
            <h2 className={MODAL_TITLE}>Set New Password</h2>
            <p className={MODAL_SUB}>Choose a new password for your account.</p>
            {error && <p className={FORM_ERROR}>{error}</p>}
            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>New Password</label>
                <input
                    className={FORM_INPUT}
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoFocus
                />
            </div>
            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>Confirm Password</label>
                <input
                    className={FORM_INPUT}
                    type="password"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submit(); }}
                />
            </div>
            <button className={FORM_SUBMIT} onClick={submit} disabled={loading}>
                {loading ? "Saving…" : "Reset Password"}
            </button>
        </>
    );
};

// ─── Sign Up Form ─────────────────────────────────────────────────────────────

const SignUpForm = ({ onSignIn }: { onSignIn: () => void }) => {
    const [step, setStep]           = useState<1 | 2>(1);
    const [firmName, setFirmName]   = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [email, setEmail]         = useState("");
    const [password, setPassword]   = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [city, setCity]           = useState("");
    const [phone, setPhone]         = useState("");
    const [plan, setPlan]           = useState("pro");
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState("");
    const [done, setDone]           = useState(false);

    const nextStep = () => {
        setError("");
        if (!firmName.trim())  { setError("Please enter your firm name."); return; }
        if (!ownerName.trim()) { setError("Please enter your name."); return; }
        if (!email.trim())     { setError("Please enter your email."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (password !== confirmPw) { setError("Passwords do not match."); return; }
        setStep(2);
    };

    const submit = async () => {
        setError(""); setLoading(true);
        try {
            const res = await fetch("/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firm_name:   firmName.trim(),
                    owner_name:  ownerName.trim(),
                    owner_email: email.trim().toLowerCase(),
                    password,
                    city,
                    phone,
                    plan,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Registration failed. Please try again."); return; }
            setDone(true);
        } catch {
            setError("Could not reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className={SUCCESS_MSG}>
                <div className={SUCCESS_ICON}>✓</div>
                <h3 className={SUCCESS_TITLE}>Registration Submitted</h3>
                <p className={SUCCESS_SUB}>
                    Thank you! We've received your registration for <strong>{firmName}</strong>.
                    Our team will verify your payment and activate your account within 24 hours.
                    Check your email for a confirmation.
                </p>
                <button className={FORM_SUBMIT} onClick={onSignIn} style={{ marginTop: "1rem" }}>
                    Back to Sign In
                </button>
            </div>
        );
    }

    return (
        <>
            <h2 className={MODAL_TITLE}>Register Your Firm</h2>
            <p className={MODAL_SUB}>
                {step === 1 ? "Step 1 of 2 — Your account details" : "Step 2 of 2 — Firm details & plan"}
            </p>

            {error && <p className={FORM_ERROR}>{error}</p>}

            {step === 1 ? (
                <>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Firm Name <span className={REQUIRED}>*</span></label>
                        <input className={FORM_INPUT} type="text" placeholder="Khan & Associates"
                            value={firmName} onChange={e => setFirmName(e.target.value)} />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Your Full Name <span className={REQUIRED}>*</span></label>
                        <input className={FORM_INPUT} type="text" placeholder="Ali Raza"
                            value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Work Email <span className={REQUIRED}>*</span></label>
                        <input className={FORM_INPUT} type="email" placeholder="partner@lawfirm.com"
                            value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Password <span className={REQUIRED}>*</span></label>
                        <input className={FORM_INPUT} type="password" placeholder="At least 8 characters"
                            autoComplete="new-password"
                            value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Confirm Password <span className={REQUIRED}>*</span></label>
                        <input className={FORM_INPUT} type="password" placeholder="Repeat your password"
                            autoComplete="new-password"
                            value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
                    </div>
                    <button className={FORM_SUBMIT} onClick={nextStep}>
                        Next &nbsp;→
                    </button>
                </>
            ) : (
                <>
                    <div className={FORM_ROW}>
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>City</label>
                            <select className={FORM_SELECT} style={FORM_SELECT_CHEVRON_STYLE} value={city} onChange={e => setCity(e.target.value)}>
                                <option value="">Select city</option>
                                {PK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={FORM_GROUP}>
                            <label className={FORM_LABEL}>Phone (optional)</label>
                            <input className={FORM_INPUT} type="tel" placeholder="+92 300 0000000"
                                value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                    </div>

                    <div className={FORM_GROUP}>
                        <label className={FORM_LABEL}>Select Plan</label>
                        <div className={PLAN_CARDS}>
                            {SIGNUP_PLANS.map(p => (
                                <div
                                    key={p.id}
                                    className={`${PLAN_CARD} ${plan === p.id ? PLAN_CARD_ACTIVE : ""}`}
                                    onClick={() => setPlan(p.id)}
                                >
                                    <div className={PLAN_CARD_NAME}>{p.label}</div>
                                    <div className={PLAN_CARD_PRICE}>{p.price}</div>
                                    <div className={PLAN_CARD_USERS}>{p.users}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className={PLAN_NOTE}>
                        You will receive payment instructions by email after registration.
                        Your account activates once payment is verified.
                    </p>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button className={BTN_GHOST} onClick={() => setStep(1)} style={{ flex: "0 0 auto", padding: "0.75rem 1.25rem" }}>
                            ← Back
                        </button>
                        <button className={FORM_SUBMIT} onClick={submit} disabled={loading} style={{ flex: 1 }}>
                            {loading ? "Submitting…" : "Submit Registration"}
                        </button>
                    </div>
                </>
            )}

            <p className={FORM_SWITCH}>
                Already have an account?&nbsp;
                <button className={FORM_SWITCH_BTN} onClick={onSignIn}>Sign in</button>
            </p>
        </>
    );
};

// ─── Demo Request Modal ───────────────────────────────────────────────────────

const DemoModal = ({
    sent,
    onSend,
    onSwitch,
}: {
    sent: boolean;
    onSend: () => void;
    onSwitch: () => void;
}) => {
    if (sent) {
        return (
            <div className={SUCCESS_MSG}>
                <div className={SUCCESS_ICON}>&#10003;</div>
                <h3 className={SUCCESS_TITLE}>Request Received</h3>
                <p className={SUCCESS_SUB}>
                    Thank you. We will reach out within 24 hours to schedule your demo.
                </p>
            </div>
        );
    }

    return (
        <>
            <h2 className={MODAL_TITLE}>Request a Demo</h2>
            <p className={MODAL_SUB}>
                We will set up a live session using your own documents. Free, no commitment.
            </p>

            <div className={FORM_ROW}>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>First Name</label>
                    <input className={FORM_INPUT} type="text" placeholder="Ali" />
                </div>
                <div className={FORM_GROUP}>
                    <label className={FORM_LABEL}>Last Name</label>
                    <input className={FORM_INPUT} type="text" placeholder="Raza" />
                </div>
            </div>

            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>Firm Name</label>
                <input className={FORM_INPUT} type="text" placeholder="Raza & Co" />
            </div>

            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>Work Email</label>
                <input className={FORM_INPUT} type="email" placeholder="partner@lawfirm.com" />
            </div>

            <div className={FORM_GROUP}>
                <label className={FORM_LABEL}>Industry</label>
                <select className={FORM_SELECT} style={FORM_SELECT_CHEVRON_STYLE} defaultValue="">
                    <option value="" disabled>Select industry</option>
                    <option value="law">Law Practice</option>
                    <option value="ca">CA / Accounting Firm</option>
                    <option value="logistics">Logistics & Supply Chain</option>
                    <option value="finance">Financial Services</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {/* TODO: wire to POST /demo/request + send email notification */}
            <button className={FORM_SUBMIT} onClick={onSend}>
                Request Demo &nbsp;&rarr;
            </button>

            <p className={FORM_SWITCH}>
                Already a client?&nbsp;
                <button className={FORM_SWITCH_BTN} onClick={onSwitch}>Sign in</button>
            </p>
        </>
    );
};

export default Landing;
