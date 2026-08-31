import { StateCreator } from "zustand";
import { applyTheme, getTheme, Theme } from "../../theme";

export interface UiSlice {
    theme: Theme;
    lang: "en" | "ur";
    toggleTheme: () => void;
    setLang: (lang: "en" | "ur") => void;
}

function readStoredLang(): "en" | "ur" {
    return localStorage.getItem("pe_lang") === "ur" ? "ur" : "en";
}

// theme.ts's getTheme/applyTheme stay the source of truth (index.tsx calls
// applyTheme pre-paint, before React mounts, to avoid a flash) — this slice
// only mirrors that into reactive state for components.
export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => ({
    theme: getTheme(),
    lang: readStoredLang(),
    toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        applyTheme(next);
        set({ theme: next });
    },
    setLang: lang => {
        localStorage.setItem("pe_lang", lang);
        set({ lang });
    },
});
