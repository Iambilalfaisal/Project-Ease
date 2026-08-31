// FIR, charges/sections, challan, and bail bonds (+ per-bond checklist)
// queries + mutations for a single matter.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchFirRecords, createFir, updateFir, deleteFir, scanFirDocument, FirInput,
    fetchCharges, createCharge, updateCharge, deleteCharge, ChargeInput,
    fetchChallans, createChallan, updateChallan, deleteChallan, ChallanInput,
    fetchBailBonds, createBailBond, updateBailBond, deleteBailBond, BailBondInput,
    fetchBailStages, toggleBailStage,
} from "../services/matterCriminal";
import { useToast } from "../components/ui";

function useErrorToast() {
    const { toast } = useToast();
    return (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" });
}

// ── FIR ──────────────────────────────────────────────────────────────────────

export function useFirRecords(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "fir"],
        queryFn: () => fetchFirRecords(matterId),
        select: d => d.fir ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateFir(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: FirInput) => createFir(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "fir"] }),
        onError,
    });
}

export function useUpdateFir(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ firId, body }: { firId: string; body: FirInput }) => updateFir(matterId, firId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "fir"] }),
        onError,
    });
}

export function useDeleteFir(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (firId: string) => deleteFir(matterId, firId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "fir"] }),
        onError,
    });
}

export function useScanFirDocument() {
    const onError = useErrorToast();
    return useMutation({ mutationFn: (file: File) => scanFirDocument(file), onError });
}

// ── Charges / sections ──────────────────────────────────────────────────────

export function useCharges(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "charges"],
        queryFn: () => fetchCharges(matterId),
        select: d => d.charges ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateCharge(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: ChargeInput) => createCharge(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "charges"] }),
        onError,
    });
}

export function useUpdateCharge(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ chargeId, body }: { chargeId: string; body: ChargeInput }) => updateCharge(matterId, chargeId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "charges"] }),
        onError,
    });
}

export function useDeleteCharge(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (chargeId: string) => deleteCharge(matterId, chargeId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "charges"] }),
        onError,
    });
}

// ── Challan ──────────────────────────────────────────────────────────────────

export function useChallans(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "challan"],
        queryFn: () => fetchChallans(matterId),
        select: d => d.challan ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateChallan(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: ChallanInput) => createChallan(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "challan"] }),
        onError,
    });
}

export function useUpdateChallan(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ challanId, body }: { challanId: string; body: ChallanInput }) => updateChallan(matterId, challanId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "challan"] }),
        onError,
    });
}

export function useDeleteChallan(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (challanId: string) => deleteChallan(matterId, challanId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "challan"] }),
        onError,
    });
}

// ── Bail bonds ───────────────────────────────────────────────────────────────

export function useBailBonds(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "bail-bonds"],
        queryFn: () => fetchBailBonds(matterId),
        select: d => d.bonds ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateBailBond(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: BailBondInput) => createBailBond(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "bail-bonds"] }),
        onError,
    });
}

export function useUpdateBailBond(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ bondId, body }: { bondId: string; body: BailBondInput }) => updateBailBond(matterId, bondId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "bail-bonds"] }),
        onError,
    });
}

export function useDeleteBailBond(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (bondId: string) => deleteBailBond(matterId, bondId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "bail-bonds"] }),
        onError,
    });
}

// ── Bail process checklist ──────────────────────────────────────────────────

export function useBailStages(matterId: string, bondId: string) {
    return useQuery({
        queryKey: ["matters", matterId, "bail-bonds", bondId, "stages"],
        queryFn: () => fetchBailStages(matterId, bondId),
        select: d => d.stages ?? [],
        enabled: !!matterId && !!bondId,
    });
}

export function useToggleBailStage(matterId: string, bondId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ stageKey, completed }: { stageKey: string; completed: boolean }) => toggleBailStage(matterId, bondId, stageKey, completed),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "bail-bonds", bondId, "stages"] }),
        onError,
    });
}
