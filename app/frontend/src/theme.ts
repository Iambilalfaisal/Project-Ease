export type Theme = "dark" | "light";

export const getTheme = (): Theme => {
    const stored = localStorage.getItem("pe_theme") as Theme | null;
    if (stored === "dark" || stored === "light") return stored;
    // Default to dark (our brand)
    return "dark";
};

export const applyTheme = (theme: Theme): void => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pe_theme", theme);
};

export const toggleTheme = (): Theme => {
    const next: Theme = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    return next;
};
