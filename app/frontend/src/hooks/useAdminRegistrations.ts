import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRegistrations, approveRegistration } from "../services/admin";
import { useToast } from "../components/ui/Toast";

const REGISTRATIONS_KEY = ["admin", "registrations"];

export function useRegistrations() {
    return useQuery({ queryKey: REGISTRATIONS_KEY, queryFn: fetchRegistrations });
}

export function useApproveRegistration() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (orgId: string) => approveRegistration(orgId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: REGISTRATIONS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}
