import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchOpposingCounsel, fetchJudgeNotes, fetchJudgeStats,
    saveCounsel, saveJudge, deleteCounsel, deleteJudge,
    Counsel, Judge,
} from "../services/intelligence";
import { useToast } from "../components/ui/Toast";

const COUNSEL_KEY = ["opposingCounsel"];
const JUDGES_KEY = ["judgeNotes"];

export function useOpposingCounsel() {
    return useQuery({
        queryKey: COUNSEL_KEY,
        queryFn: async () => (await fetchOpposingCounsel()).counsel ?? [],
    });
}

export function useJudgeNotes() {
    return useQuery({
        queryKey: JUDGES_KEY,
        queryFn: async () => (await fetchJudgeNotes()).judges ?? [],
    });
}

export function useJudgeStats(judgeId: string | null) {
    return useQuery({
        queryKey: ["judgeStats", judgeId],
        queryFn: () => fetchJudgeStats(judgeId as string),
        enabled: !!judgeId,
    });
}

export function useSaveCounsel() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ id, form }: { id: string | undefined; form: Record<string, string> }) => saveCounsel(id, form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: COUNSEL_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useSaveJudge() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ id, form }: { id: string | undefined; form: Record<string, string> }) => saveJudge(id, form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: JUDGES_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteCounsel() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (id: string) => deleteCounsel(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: COUNSEL_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteJudge() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (id: string) => deleteJudge(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: JUDGES_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { Counsel, Judge };
