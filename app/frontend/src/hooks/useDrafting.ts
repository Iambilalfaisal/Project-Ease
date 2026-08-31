// TanStack Query hooks for the Document Drafting panel — template reads/writes
// and AI draft generation.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui";
import {
    createTemplate, deleteTemplate, fetchMattersForDrafting, fetchTemplates,
    generateDraft, updateTemplate,
} from "../services/drafting";
import type { TemplateInput } from "../services/drafting";
import type { Matter, Template } from "../pages/owner/types";

export const draftingKeys = {
    templates: ["templates"] as const,
    matters: ["matters", "drafting"] as const,
};

export function useTemplates() {
    return useQuery<Template[]>({ queryKey: draftingKeys.templates, queryFn: fetchTemplates });
}

export function useMattersForDrafting() {
    return useQuery<Matter[]>({ queryKey: draftingKeys.matters, queryFn: fetchMattersForDrafting });
}

export function useSaveTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ templateId, input }: { templateId?: string; input: TemplateInput }) =>
            templateId ? updateTemplate(templateId, input) : createTemplate(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: draftingKeys.templates });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (templateId: string) => deleteTemplate(templateId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: draftingKeys.templates });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useGenerateDraft() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ templateId, matterId }: { templateId: string; matterId: string | null }) =>
            generateDraft(templateId, matterId),
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}
