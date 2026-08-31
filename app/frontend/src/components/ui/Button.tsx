import { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "ghost" | "danger";
    size?: "sm" | "md";
    loading?: boolean;
    children: ReactNode;
}

export const Button = ({ variant = "primary", size = "md", loading, disabled, children, className, ...rest }: ButtonProps) => (
    <button
        type="button"
        className={[styles.btn, styles[variant], styles[size], className].filter(Boolean).join(" ")}
        disabled={disabled || loading}
        {...rest}
    >
        {loading ? "…" : children}
    </button>
);
