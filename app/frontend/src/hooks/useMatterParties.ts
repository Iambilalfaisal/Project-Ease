// Adverse (opposing) parties, witnesses, and bail/interim relief queries +
// mutations for a single matter.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchAdverseParties, createAdverseParty, updateAdverseParty, deleteAdverseParty, AdversePartyInput,
    fetchWitnesses, createWitness, updateWitness, deleteWitness, WitnessInput,
    fetchRelief, createRelief, updateRelief, deleteRelief, ReliefInput,
} from "../services/matterParties";
import { useToast } from "../components/ui";

function useErrorToast() {
    const { toast } = useToast();
    return (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" });
}

// ── Adverse (opposing) parties ──────────────────────────────────────────────

export function useAdverseParties(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "adverse-parties"],
        queryFn: () => fetchAdverseParties(matterId),
        select: d => d.parties ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateAdverseParty(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: AdversePartyInput) => createAdverseParty(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "adverse-parties"] }),
        onError,
    });
}

export function useUpdateAdverseParty(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ partyId, body }: { partyId: string; body: AdversePartyInput }) => updateAdverseParty(matterId, partyId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "adverse-parties"] }),
        onError,
    });
}

export function useDeleteAdverseParty(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (partyId: string) => deleteAdverseParty(matterId, partyId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "adverse-parties"] }),
        onError,
    });
}

// ── Witnesses ────────────────────────────────────────────────────────────────

export function useWitnesses(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "witnesses"],
        queryFn: () => fetchWitnesses(matterId),
        select: d => d.witnesses ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateWitness(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: WitnessInput) => createWitness(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "witnesses"] }),
        onError,
    });
}

export function useUpdateWitness(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ witnessId, body }: { witnessId: string; body: WitnessInput }) => updateWitness(matterId, witnessId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "witnesses"] }),
        onError,
    });
}

export function useDeleteWitness(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (witnessId: string) => deleteWitness(matterId, witnessId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "witnesses"] }),
        onError,
    });
}

// ── Bail & interim relief ───────────────────────────────────────────────────

export function useMatterRelief(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "relief"],
        queryFn: () => fetchRelief(matterId),
        select: d => d.relief ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateRelief(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: ReliefInput) => createRelief(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "relief"] }),
        onError,
    });
}

export function useUpdateRelief(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ reliefId, body }: { reliefId: string; body: ReliefInput }) => updateRelief(matterId, reliefId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "relief"] }),
        onError,
    });
}

export function useDeleteRelief(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (reliefId: string) => deleteRelief(matterId, reliefId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "relief"] }),
        onError,
    });
}
