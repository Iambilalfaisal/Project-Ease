import { ReactNode, useEffect } from "react";
import styles from "./Modal.module.css";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    maxWidth?: number | string;
    footer?: ReactNode;
    children: ReactNode;
}

export const Modal = ({ open, onClose, title, maxWidth = 480, footer, children }: ModalProps) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal} style={{ maxWidth }}>
                {title && (
                    <div className={styles.header}>
                        <h3 className={styles.title}>{title}</h3>
                        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>✕</button>
                    </div>
                )}
                <div className={styles.body}>{children}</div>
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        </div>
    );
};
