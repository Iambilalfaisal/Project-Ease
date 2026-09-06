import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    side: "start" | "end";
    width?: number | string;
    title?: ReactNode;
    headerAction?: ReactNode;
    children: ReactNode;
    className?: string;
}

/** Hand-rolled rather than wrapping Radix Dialog: this models Fluent's
 * `OverlayDrawer modalType="non-modal"` — a side panel with no backdrop that
 * never blocks interaction with the rest of the page, unlike Modal's dialogs. */
export const Drawer = ({ open, onClose, side, width = 320, title, headerAction, children, className }: DrawerProps) => (
    <div
        role="complementary"
        aria-hidden={!open}
        style={{ width, [side === "start" ? "left" : "right"]: 0 }}
        className={cn(
            "fixed top-0 bottom-0 z-[150] flex flex-col border-border bg-bg-1 shadow-lg transition-transform duration-300 ease-standard",
            side === "start" ? "left-0 border-r" : "right-0 border-l",
            open ? "translate-x-0" : side === "start" ? "-translate-x-full" : "translate-x-full",
            !open && "pointer-events-none",
            className
        )}
    >
        {title && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="font-serif text-base font-bold text-ink-1">{title}</div>
                {headerAction ?? (
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="h-7 w-7 cursor-pointer rounded-sm border border-border-md bg-transparent leading-none text-ink-2 transition-[border-color,color] duration-150 ease-standard hover:border-danger hover:text-danger"
                    >
                        ✕
                    </button>
                )}
            </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
);
