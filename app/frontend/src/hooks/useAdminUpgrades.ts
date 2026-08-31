import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUpgradeRequests, resolveUpgradeRequest } from "../services/admin";
import { useToast } from "../components/ui/Toast";

const upgradeRequestsKey = (status: string) => ["admin", "upgradeRequests", status];

export function useUpgradeRequests(status: string) {
    return useQuery({ queryKey: upgradeRequestsKey(status), queryFn: () => fetchUpgradeRequests(status) });
}

export function useResolveUpgradeRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ requestId, action }: { requestId: string; action: "approve" | "reject" }) =>
            resolveUpgradeRequest(requestId, action),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "upgradeRequests"] }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}
