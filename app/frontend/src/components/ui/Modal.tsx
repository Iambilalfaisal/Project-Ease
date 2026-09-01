import { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    maxWidth?: number | string;
    footer?: ReactNode;
    children: ReactNode;
}

/** Wraps Radix's Dialog primitive — Escape-to-close, click-outside-to-close,
 * focus trapping, and ARIA (role, aria-modal, title association) all come
 * from Radix instead of being hand-rolled. */
export const Modal = ({ open, onClose, title, maxWidth = 480, footer, children }: ModalProps) => (
    <Dialog.Root open={open} onOpenChange={(next: boolean) => { if (!next) onClose(); }}>
        <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[8px] animate-[fadeIn_var(--transition-base)_var(--ease-standard)]">
                <Dialog.Content
                    style={{ maxWidth }}
                    className="flex max-h-[calc(100vh-4rem)] w-full flex-col rounded-lg border border-gold-border bg-bg-1 shadow-lg animate-[riseIn_var(--transition-base)_var(--ease-standard)]"
                >
                    {title && (
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 pt-5 pb-4">
                            <Dialog.Title className="m-0 font-serif text-lg font-bold tracking-tight text-ink-1">
                                {title}
                            </Dialog.Title>
                            <Dialog.Close
                                aria-label="Close"
                                className="h-7 w-7 cursor-pointer rounded-sm border border-border-md bg-transparent leading-none text-ink-2 transition-[border-color,color] duration-150 ease-standard hover:border-danger hover:text-danger"
                            >
                                ✕
                            </Dialog.Close>
                        </div>
                    )}
                    {!title && <Dialog.Title className="sr-only">Dialog</Dialog.Title>}
                    <div className="overflow-y-auto p-6">{children}</div>
                    {footer && (
                        <div className="flex shrink-0 justify-end gap-3 border-t border-border px-6 pt-4 pb-5">
                            {footer}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Overlay>
        </Dialog.Portal>
    </Dialog.Root>
);
