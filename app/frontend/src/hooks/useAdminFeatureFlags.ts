import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrgFlags, updateOrgFlags } from "../services/admin";
import { useToast } from "../components/ui/Toast";

const ORG_FLAGS_KEY = ["admin", "orgFlags"];

export function useOrgFlags() {
    return useQuery({ queryKey: ORG_FLAGS_KEY, queryFn: fetchOrgFlags });
}

export function useUpdateOrgFlags() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ orgId, flags }: { orgId: string; flags: Record<string, boolean> }) => updateOrgFlags(orgId, flags),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_FLAGS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}
