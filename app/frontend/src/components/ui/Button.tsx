import { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "font-sans font-weight-bold rounded-sm cursor-pointer transition-[opacity,transform,border-color,color,background] duration-150 ease-standard disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none",
    {
        variants: {
            variant: {
                primary:
                    "bg-[linear-gradient(135deg,var(--gold)_0%,#9C7A28_100%)] text-[#05080F] border-none shadow-gold hover:not-disabled:opacity-88 hover:not-disabled:-translate-y-px",
                ghost:
                    "bg-transparent border border-border-md text-ink-2 hover:not-disabled:border-gold-border hover:not-disabled:text-gold",
                danger:
                    "bg-transparent border border-danger text-danger hover:not-disabled:bg-danger/8"
            },
            size: {
                md: "px-5 py-[0.55rem] text-sm",
                sm: "px-3 py-[0.3rem] text-xs"
            }
        },
        defaultVariants: { variant: "primary", size: "md" }
    }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    loading?: boolean;
    children: ReactNode;
}

export const Button = ({ variant, size, loading, disabled, children, className, ...rest }: ButtonProps) => (
    <button
        type="button"
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...rest}
    >
        {loading ? "…" : children}
    </button>
);
