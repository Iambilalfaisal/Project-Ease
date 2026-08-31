import styles from "./EmptyState.module.css";

interface EmptyStateProps {
    message: string;
}

export const EmptyState = ({ message }: EmptyStateProps) => (
    <div className={styles.empty}>{message}</div>
);
