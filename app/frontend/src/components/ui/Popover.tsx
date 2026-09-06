import { ReactNode } from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

interface PopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trigger: ReactNode;
    children: ReactNode;
    maxWidth?: number | string;
    className?: string;
}

export const Popover = ({ open, onOpenChange, trigger, children, maxWidth = 320, className }: PopoverProps) => (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
        <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
        <RadixPopover.Portal>
            <RadixPopover.Content
                sideOffset={8}
                style={{ maxWidth }}
                className={cn(
                    "z-[250] rounded-base border border-gold-border bg-bg-1 p-5 shadow-lg animate-[riseIn_var(--transition-base)_var(--ease-standard)]",
                    className
                )}
            >
                {children}
                <RadixPopover.Arrow className="fill-bg-1" />
            </RadixPopover.Content>
        </RadixPopover.Portal>
    </RadixPopover.Root>
);
