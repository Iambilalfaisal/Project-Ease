import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCaseLawDocs, uploadCaseLaw, deleteCaseLawDoc, UploadCaseLawPayload } from "../services/admin";
import { useToast } from "../components/ui/Toast";

const caseLawKey = (publisher: string) => ["admin", "caseLaw", publisher];

export function useCaseLawDocs(publisher: string) {
    return useQuery({ queryKey: caseLawKey(publisher), queryFn: () => fetchCaseLawDocs(publisher) });
}

export function useUploadCaseLaw() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (payload: UploadCaseLawPayload) => uploadCaseLaw(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "caseLaw"] }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteCaseLawDoc() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (docId: string) => deleteCaseLawDoc(docId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "caseLaw"] }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}
