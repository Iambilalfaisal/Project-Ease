import { useQuery } from "@tanstack/react-query";
import { fetchEvalResults } from "../services/admin";

/** Gated behind a build-time key (VITE_ADMIN_EVAL_KEY); query stays disabled until one is configured. */
export function useEvalResults(key: string) {
    return useQuery({
        queryKey: ["admin", "evals", key],
        queryFn: () => fetchEvalResults(key),
        enabled: !!key,
        retry: false,
    });
}
