import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLegalNotices, saveLegalNotice, deleteLegalNotice, LegalNoticeForm } from "../services/legalNotices";
import { useToast } from "../components/ui/Toast";

const NOTICES_KEY = ["legalNotices"];

export function useLegalNotices() {
    return useQuery({
        queryKey: NOTICES_KEY,
        queryFn: async () => (await fetchLegalNotices()).notices ?? [],
    });
}

export function useSaveLegalNotice() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ id, form }: { id: string | undefined; form: LegalNoticeForm }) => saveLegalNotice(id, form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTICES_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteLegalNotice() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (id: string) => deleteLegalNotice(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTICES_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { LegalNoticeForm };
