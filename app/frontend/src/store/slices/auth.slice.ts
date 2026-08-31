import { StateCreator } from "zustand";

export interface SessionUser {
    name: string;
    email: string;
    role: string;
    org: string;
}

export interface AuthSlice {
    token: string;
    user: SessionUser | null;
    /** Re-sync from sessionStorage — the login screens write pe_token/pe_user
     * directly and navigate without a full reload, so the store needs to catch
     * up rather than trust a value cached from before login. */
    hydrate: () => void;
    setSession: (token: string, user: SessionUser) => void;
    signOut: () => void;
}

function readStoredUser(): SessionUser | null {
    const raw = sessionStorage.getItem("pe_user");
    if (!raw) return null;
    try {
        return JSON.parse(raw) as SessionUser;
    } catch {
        return null;
    }
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = set => ({
    token: sessionStorage.getItem("pe_token") ?? "",
    user: readStoredUser(),
    hydrate: () => set({ token: sessionStorage.getItem("pe_token") ?? "", user: readStoredUser() }),
    setSession: (token, user) => {
        sessionStorage.setItem("pe_token", token);
        sessionStorage.setItem("pe_user", JSON.stringify(user));
        set({ token, user });
    },
    signOut: () => {
        const token = sessionStorage.getItem("pe_token") ?? "";
        fetch("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        sessionStorage.clear();
        set({ token: "", user: null });
        window.location.hash = "/";
    },
});
