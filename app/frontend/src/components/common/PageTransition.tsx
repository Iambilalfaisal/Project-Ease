import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface PageTransitionProps {
    children: ReactNode;
}

/** Groundwork per the architecture guide's §10 — not wired into any route
 * yet. A page opts in later by wrapping its returned JSX in this. Reuses the
 * existing --animation-smooth token so it matches the rest of the app's easing,
 * and disables itself under prefers-reduced-motion. */
export default function PageTransition({ children }: PageTransitionProps) {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return <>{children}</>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
            {children}
        </motion.div>
    );
}
