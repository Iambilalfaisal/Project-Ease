import { useAppStore } from "../useAppStore";

export const useTheme = () => useAppStore(s => s.theme);
export const useToggleTheme = () => useAppStore(s => s.toggleTheme);
export const useLang = () => useAppStore(s => s.lang);
export const useSetLang = () => useAppStore(s => s.setLang);
