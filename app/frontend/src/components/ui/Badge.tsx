import { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "gold" | "gray" | "green" | "amber" | "red" | "blue";

interface BadgeProps {
    tone: BadgeTone;
    children: ReactNode;
}

export const Badge = ({ tone, children }: BadgeProps) => (
    <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
);
