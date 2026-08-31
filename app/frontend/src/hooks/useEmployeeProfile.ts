import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyProfile, fetchMyDocuments, changePassword, ChangePasswordPayload } from "../services/employeeProfile";
import { useToast } from "../components/ui";

export function useMyProfile() {
    return useQuery({ queryKey: ["me"], queryFn: fetchMyProfile });
}

export function useMyDocuments() {
    return useQuery({ queryKey: ["documents"], queryFn: fetchMyDocuments, select: d => d.documents ?? [] });
}

export function useChangePassword() {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}
