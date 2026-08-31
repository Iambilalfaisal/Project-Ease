import { create } from "zustand";
import { AuthSlice, createAuthSlice } from "./slices/auth.slice";
import { UiSlice, createUiSlice } from "./slices/ui.slice";

export type AppState = AuthSlice & UiSlice;

// No zustand persist() middleware here on purpose — pe_token/pe_user/pe_theme/pe_lang
// are existing storage keys with their own read/write points outside this store
// (e.g. Landing.tsx's login forms, theme.ts's pre-paint call in index.tsx); each
// slice's actions write those keys directly instead of introducing a second,
// competing persistence path.
export const useAppStore = create<AppState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createUiSlice(...a),
}));
