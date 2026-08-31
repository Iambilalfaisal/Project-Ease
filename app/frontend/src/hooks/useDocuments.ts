// TanStack Query hooks for the Documents panel — category reads/writes and
// document upload/delete. Document list itself (`docs`) stays owned by the
// OwnerPortal shell and is passed into the screen as a prop, so there's no
// query/cache for it here — only categories are cached.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui";
import { createCategory, deleteDocument, fetchCategories, uploadDocument } from "../services/documents";
import type { Category } from "../pages/owner/types";

export const documentsKeys = {
    categories: ["categories"] as const,
};

export function useCategories() {
    return useQuery<Category[]>({
        queryKey: documentsKeys.categories,
        queryFn: fetchCategories,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (name: string) => createCategory(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentsKeys.categories });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useUploadDocument() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ file, categoryId }: { file: File; categoryId: string }) => uploadDocument(file, categoryId),
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useDeleteDocument() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: (docId: string) => deleteDocument(docId),
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}
