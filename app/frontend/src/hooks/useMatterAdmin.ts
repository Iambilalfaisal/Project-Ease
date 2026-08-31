// Matter notes, document requests, internal deadlines, correspondence,
// outcome & disposal, and court transfers queries + mutations for a single
// matter.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchMatterNotes, createMatterNote, updateMatterNote, deleteMatterNote, MatterNoteInput,
    fetchDocRequests, createDocRequest, updateDocRequest, deleteDocRequest, DocRequestInput,
    fetchMatterDeadlines, createMatterDeadline, updateMatterDeadline, deleteMatterDeadline, DeadlineInput,
    fetchCorrespondence, createCorrespondence, updateCorrespondence, deleteCorrespondence, CorrespondenceInput,
    fetchMatterOutcome, saveMatterOutcome, OutcomeInput,
    fetchCourtTransfers, createCourtTransfer, updateCourtTransfer, deleteCourtTransfer, CourtTransferInput,
} from "../services/matterAdmin";
import { useToast } from "../components/ui";

function useErrorToast() {
    const { toast } = useToast();
    return (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" });
}

// ── Notes / activity journal ────────────────────────────────────────────────

export function useMatterNotes(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "notes"],
        queryFn: () => fetchMatterNotes(matterId),
        select: d => d.notes ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateMatterNote(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: MatterNoteInput) => createMatterNote(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "notes"] }),
        onError,
    });
}

export function useUpdateMatterNote(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ noteId, body }: { noteId: string; body: MatterNoteInput }) => updateMatterNote(matterId, noteId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "notes"] }),
        onError,
    });
}

export function useDeleteMatterNote(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (noteId: string) => deleteMatterNote(matterId, noteId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "notes"] }),
        onError,
    });
}

// ── Document requests ───────────────────────────────────────────────────────

export function useDocRequests(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "doc-requests"],
        queryFn: () => fetchDocRequests(matterId),
        select: d => d.requests ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateDocRequest(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: DocRequestInput) => createDocRequest(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "doc-requests"] }),
        onError,
    });
}

export function useUpdateDocRequest(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ requestId, body }: { requestId: string; body: Partial<DocRequestInput> }) => updateDocRequest(matterId, requestId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "doc-requests"] }),
        onError,
    });
}

export function useDeleteDocRequest(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (requestId: string) => deleteDocRequest(matterId, requestId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "doc-requests"] }),
        onError,
    });
}

// ── Internal deadlines ───────────────────────────────────────────────────────

export function useMatterDeadlines(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "deadlines"],
        queryFn: () => fetchMatterDeadlines(matterId),
        select: d => d.deadlines ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateMatterDeadline(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: DeadlineInput) => createMatterDeadline(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "deadlines"] }),
        onError,
    });
}

export function useUpdateMatterDeadline(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ deadlineId, body }: { deadlineId: string; body: DeadlineInput | { completed: number } }) => updateMatterDeadline(matterId, deadlineId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "deadlines"] }),
        onError,
    });
}

export function useDeleteMatterDeadline(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (deadlineId: string) => deleteMatterDeadline(matterId, deadlineId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "deadlines"] }),
        onError,
    });
}

// ── Correspondence log ───────────────────────────────────────────────────────

export function useCorrespondence(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "correspondence"],
        queryFn: () => fetchCorrespondence(matterId),
        select: d => d.correspondence ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateCorrespondence(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: CorrespondenceInput) => createCorrespondence(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "correspondence"] }),
        onError,
    });
}

export function useUpdateCorrespondence(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ corrId, body }: { corrId: string; body: CorrespondenceInput }) => updateCorrespondence(matterId, corrId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "correspondence"] }),
        onError,
    });
}

export function useDeleteCorrespondence(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (corrId: string) => deleteCorrespondence(matterId, corrId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "correspondence"] }),
        onError,
    });
}

// ── Matter outcome & disposal ────────────────────────────────────────────────

export function useMatterOutcome(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "outcome"],
        queryFn: () => fetchMatterOutcome(matterId),
        select: d => (d.outcome && d.outcome.outcome_id ? d.outcome : null),
        enabled: enabled && !!matterId,
    });
}

export function useSaveMatterOutcome(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: OutcomeInput) => saveMatterOutcome(matterId, body),
        onSuccess: saved => qc.setQueryData(["matters", matterId, "outcome"], { outcome: saved }),
        onError,
    });
}

// ── Court transfers ──────────────────────────────────────────────────────────

export function useCourtTransfers(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "transfers"],
        queryFn: () => fetchCourtTransfers(matterId),
        select: d => d.transfers ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateCourtTransfer(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: CourtTransferInput) => createCourtTransfer(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "transfers"] }),
        onError,
    });
}

export function useUpdateCourtTransfer(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ transferId, body }: { transferId: string; body: CourtTransferInput }) => updateCourtTransfer(matterId, transferId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "transfers"] }),
        onError,
    });
}

export function useDeleteCourtTransfer(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (transferId: string) => deleteCourtTransfer(matterId, transferId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "transfers"] }),
        onError,
    });
}
