import { useAppStore } from "../useAppStore";

export const useCurrentUser = () => useAppStore(s => s.user);
export const useAuthToken = () => useAppStore(s => s.token);
export const useIsRole = (role: string) => useAppStore(s => s.user?.role === role);
export const useHydrateAuth = () => useAppStore(s => s.hydrate);
export const useSetSession = () => useAppStore(s => s.setSession);
export const useSignOut = () => useAppStore(s => s.signOut);
