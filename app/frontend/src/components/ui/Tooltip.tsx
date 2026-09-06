import { ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => (
    <RadixTooltip.Provider delayDuration={300}>
        <RadixTooltip.Root>
            <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
            <RadixTooltip.Portal>
                <RadixTooltip.Content
                    sideOffset={6}
                    className="z-[300] rounded-sm border border-border-md bg-bg-2 px-2.5 py-1.5 text-xs font-weight-medium text-ink-1 shadow-sm animate-[fadeIn_var(--transition-fast)_var(--ease-standard)]"
                >
                    {content}
                    <RadixTooltip.Arrow className="fill-bg-2" />
                </RadixTooltip.Content>
            </RadixTooltip.Portal>
        </RadixTooltip.Root>
    </RadixTooltip.Provider>
);
