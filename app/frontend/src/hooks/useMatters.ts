// Matter list/detail, supporting reference data (clients, matter teams,
// courts), limitation/cause-list alert feeds, conflict checking, LHC case
// status lookup, and matter <-> document linking.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchMatters, fetchMatterTeams, fetchClientOptions, fetchCustomCourts, addCustomCourt,
    fetchLimitationAlerts, fetchCauseListTodayMatches, fetchMatterDetail, createMatter,
    updateMatter, deleteMatter, checkConflicts, fetchLhcCaseStatus, fetchAllDocumentsForLinking,
    linkDocumentToMatter, unlinkDocumentFromMatter, ConflictResult,
} from "../services/matters";
import { useToast } from "../components/ui";

export function useMatters() {
    return useQuery({ queryKey: ["matters"], queryFn: fetchMatters, select: d => d.matters ?? [] });
}

export function useMatterTeams() {
    return useQuery({ queryKey: ["matter-teams"], queryFn: fetchMatterTeams, select: d => d.teams ?? [] });
}

export function useClientOptions() {
    return useQuery({ queryKey: ["clients"], queryFn: fetchClientOptions, select: d => d.clients ?? [] });
}

export function useCustomCourts() {
    return useQuery({ queryKey: ["courts"], queryFn: fetchCustomCourts, select: d => d.custom ?? [] });
}

export function useAddCourt() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (name: string) => addCustomCourt(name),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["courts"] }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

export function useLimitationAlerts() {
    return useQuery({ queryKey: ["matters", "limitation-alerts"], queryFn: fetchLimitationAlerts, select: d => d.alerts ?? [] });
}

export function useCauseListTodayMatches() {
    return useQuery({ queryKey: ["cause-list", "today-matches"], queryFn: fetchCauseListTodayMatches, select: d => d.matches ?? [] });
}

export function useMatterDetail(matterId: string | null) {
    return useQuery({
        queryKey: ["matters", matterId],
        queryFn: () => fetchMatterDetail(matterId as string),
        enabled: !!matterId,
    });
}

export function useCreateMatter() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (body: Record<string, unknown>) => createMatter(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters"] }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

export function useUpdateMatter(matterId: string) {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (body: Record<string, unknown>) => updateMatter(matterId, body),
        onSuccess: updated => {
            qc.invalidateQueries({ queryKey: ["matters"] });
            qc.setQueryData(["matters", matterId], updated);
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

export function useDeleteMatter() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (matterId: string) => deleteMatter(matterId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters"] }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

/** Not a query — triggered on demand from the matter form, results shown in a modal. */
export function useCheckConflicts() {
    const { toast } = useToast();
    return useMutation<ConflictResult[], Error, { new_client_name: string; opponent_name: string }>({
        mutationFn: async body => (await checkConflicts(body)).conflicts ?? [],
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

/** Not a query — triggered on demand from the "LHC Status" button. */
export function useLhcCaseStatus() {
    return useMutation({
        mutationFn: (caseNo: string) => fetchLhcCaseStatus(caseNo),
    });
}

export function useDocumentsForLinking(enabled: boolean) {
    return useQuery({ queryKey: ["documents", "for-linking"], queryFn: fetchAllDocumentsForLinking, enabled });
}

export function useLinkDocument(matterId: string) {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (docId: string) => linkDocumentToMatter(matterId, docId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["matters", matterId] });
            qc.invalidateQueries({ queryKey: ["documents", "for-linking"] });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

export function useUnlinkDocument(matterId: string) {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (docId: string) => unlinkDocumentFromMatter(matterId, docId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId] }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}
