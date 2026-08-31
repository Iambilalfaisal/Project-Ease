import { ReactNode } from "react";
import styles from "./Table.module.css";

interface TableProps {
    children: ReactNode;
    loading?: boolean;
    empty?: boolean;
    emptyMessage?: string;
    dense?: boolean;
}

export const Table = ({ children, loading, empty, emptyMessage = "Nothing here yet.", dense }: TableProps) => {
    if (loading) {
        return (
            <div className={styles.wrap}>
                <div className={styles.state}>
                    <span className={styles.spinner} />
                    Loading…
                </div>
            </div>
        );
    }

    if (empty) {
        return (
            <div className={styles.wrap}>
                <div className={styles.state}>{emptyMessage}</div>
            </div>
        );
    }

    return (
        <div className={styles.wrap}>
            <table className={dense ? `${styles.table} ${styles.dense}` : styles.table}>
                {children}
            </table>
        </div>
    );
};
