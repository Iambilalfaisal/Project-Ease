import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchPlatformStats,
    fetchOrgs,
    fetchOrgDetails,
    createOrg,
    updateOrg,
    deleteOrg,
    checkBackendHealth,
    CreateOrgPayload,
    UpdateOrgPayload,
} from "../services/admin";
import { useToast } from "../components/ui/Toast";

const STATS_KEY = ["admin", "stats"];
const ORGS_KEY = ["admin", "orgs"];
const orgDetailsKey = (orgId: string) => ["admin", "orgs", orgId];

export function useAdminStats() {
    return useQuery({ queryKey: STATS_KEY, queryFn: fetchPlatformStats });
}

export function useAdminOrgsList() {
    return useQuery({ queryKey: ORGS_KEY, queryFn: fetchOrgs });
}

export function useOrgDetails(orgId: string) {
    return useQuery({
        queryKey: orgDetailsKey(orgId),
        queryFn: () => fetchOrgDetails(orgId),
        enabled: !!orgId,
    });
}

export function useCreateOrg() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (payload: CreateOrgPayload) => createOrg(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORGS_KEY });
            queryClient.invalidateQueries({ queryKey: STATS_KEY });
        },
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useUpdateOrg() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ orgId, payload }: { orgId: string; payload: UpdateOrgPayload }) => updateOrg(orgId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ORGS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteOrg() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (orgId: string) => deleteOrg(orgId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORGS_KEY });
            queryClient.invalidateQueries({ queryKey: STATS_KEY });
        },
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

/** Settings panel's service-status probe — no toast, mirrors its previous silent boolean check. */
export function useBackendHealth() {
    return useQuery({ queryKey: ["admin", "backendHealth"], queryFn: checkBackendHealth });
}
