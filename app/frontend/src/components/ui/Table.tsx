import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableProps {
    children: ReactNode;
    loading?: boolean;
    empty?: boolean;
    emptyMessage?: string;
    dense?: boolean;
}

const wrapClass = "overflow-hidden rounded-base border border-border bg-bg-1 shadow-sm max-md:overflow-x-auto max-md:[-webkit-overflow-scrolling:touch]";
const stateClass = "flex items-center justify-center gap-2 px-4 py-8 text-center text-sm text-ink-3";

export const Table = ({ children, loading, empty, emptyMessage = "Nothing here yet.", dense }: TableProps) => {
    if (loading) {
        return (
            <div className={wrapClass}>
                <div className={stateClass}>
                    <span className="h-3.5 w-3.5 animate-[spin_0.7s_linear_infinite] rounded-full border-2 border-gold-border border-t-gold" />
                    Loading…
                </div>
            </div>
        );
    }

    if (empty) {
        return (
            <div className={wrapClass}>
                <div className={stateClass}>{emptyMessage}</div>
            </div>
        );
    }

    return (
        <div className={wrapClass}>
            <table
                className={cn(
                    "w-full border-collapse text-sm",
                    "[&_thead_tr]:border-b [&_thead_tr]:border-border [&_thead_tr]:bg-bg-2",
                    "[&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-weight-bold [&_th]:uppercase [&_th]:tracking-eyebrow [&_th]:text-ink-3",
                    "[&_td]:border-b [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:text-ink-1 [&_td]:transition-colors [&_td]:duration-150 [&_td]:ease-standard",
                    "[&_tbody_tr:last-child_td]:border-none [&_tbody_tr:hover_td]:bg-gold-dim",
                    dense && "[&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs"
                )}
            >
                {children}
            </table>
        </div>
    );
};
