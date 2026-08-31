import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import styles from "./Toast.module.css";

interface ToastOptions {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
}

interface ToastEntry extends ToastOptions {
    id: number;
}

interface ToastContextValue {
    toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Mount once near the app root. Every mutation hook's onError should call
 * toast() from here instead of leaving failures console-only. */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const nextId = useRef(0);

    const toast = useCallback((options: ToastOptions) => {
        const id = nextId.current++;
        setToasts(prev => [...prev, { id, ...options }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className={styles.stack} role="status" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className={`${styles.toast} ${t.variant === "destructive" ? styles.destructive : ""}`}>
                        <div className={styles.title}>{t.title}</div>
                        {t.description && <div className={styles.description}>{t.description}</div>}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx;
}
