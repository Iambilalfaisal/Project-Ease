import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchVakalatnamaRegister, updateVakalatnamaStatus, VakalatnamaEntry } from "../services/vakalatnama";
import { useToast } from "../components/ui/Toast";

const REGISTER_KEY = ["vakalatnamaRegister"];

export function useVakalatnamaRegister() {
    return useQuery({
        queryKey: REGISTER_KEY,
        queryFn: async () => (await fetchVakalatnamaRegister()).register ?? [],
    });
}

export function useUpdateVakalatnamaStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ matterId, status }: { matterId: string; status: string }) => updateVakalatnamaStatus(matterId, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: REGISTER_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { VakalatnamaEntry };
