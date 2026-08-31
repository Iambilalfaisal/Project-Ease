import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMyHearings, updateHearingOutcome, UpdateHearingOutcomePayload } from "../services/assignments";
import { useToast } from "../components/ui";

export function useMyHearings(userId: string, fromDate: string) {
    return useQuery({
        queryKey: ["hearings", "mine", userId, fromDate],
        queryFn: () => fetchMyHearings(fromDate, userId),
        enabled: !!userId,
    });
}

export function useUpdateHearingOutcome(userId: string, fromDate: string) {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ hearingId, payload }: { hearingId: string; payload: UpdateHearingOutcomePayload }) =>
            updateHearingOutcome(hearingId, payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["hearings", "mine", userId, fromDate] }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}
