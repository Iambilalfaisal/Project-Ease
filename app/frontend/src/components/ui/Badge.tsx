import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center whitespace-nowrap rounded-pill px-3 py-[0.2rem] text-xs font-weight-semibold tracking-normal leading-[1.4]",
    {
        variants: {
            tone: {
                gold: "border border-gold-border bg-gold-dim text-gold",
                gray: "border border-border-md bg-bg-2 text-ink-3",
                green: "border border-success/25 bg-success/12 text-success",
                amber: "border border-warning/25 bg-warning/12 text-warning",
                red: "border border-danger/25 bg-danger/12 text-danger",
                blue: "border border-blue-400/28 bg-blue-400/15 text-blue-400"
            }
        }
    }
);

export type BadgeTone = VariantProps<typeof badgeVariants>["tone"];

interface BadgeProps {
    tone: BadgeTone;
    children: ReactNode;
}

export const Badge = ({ tone, children }: BadgeProps) => (
    <span className={cn(badgeVariants({ tone }))}>{children}</span>
);
