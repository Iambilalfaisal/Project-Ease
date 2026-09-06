import { cn } from "@/lib/utils";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    label?: string;
    className?: string;
}

const SIZE_CLASS: Record<NonNullable<SpinnerProps["size"]>, string> = {
    sm: "h-3.5 w-3.5 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-[3px]"
};

export const Spinner = ({ size = "md", label, className }: SpinnerProps) => (
    <div className={cn("flex items-center gap-2 text-sm text-ink-3", className)}>
        <span
            className={cn(
                "animate-[spin_0.7s_linear_infinite] rounded-full border-gold-border border-t-gold",
                SIZE_CLASS[size]
            )}
        />
        {label && <span>{label}</span>}
    </div>
);
