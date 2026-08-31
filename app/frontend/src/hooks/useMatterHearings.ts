// Court orders / hearing log queries + mutations for a single matter.
// Preserves the original offline-queue UX for court order saves: apiRequest's
// offlineQueue option (wired in services/matterHearings.ts) queues the write
// when offline; here we turn that "network attempt failed while offline" case
// into a soft success — an optimistic `_offline` order card, no error toast —
// exactly like the pre-migration MattersPanel did.
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchCourtOrders, createCourtOrder, updateCourtOrder, deleteCourtOrder,
    transcribeHearingVoiceNote, CourtOrderInput,
} from "../services/matterHearings";
import type { CourtOrder } from "../pages/owner/types";
import { useToast } from "../components/ui";

const ordersKey = (matterId: string) => ["matters", matterId, "orders"] as const;

export function useCourtOrders(matterId: string, enabled = true) {
    const qc = useQueryClient();

    // Once a previously-queued offline write syncs (dispatched by the shell's
    // initOfflineSync -> "pe-offline-flushed"), re-pull so optimistic cards
    // get replaced by the real server records.
    useEffect(() => {
        const onFlushed = () => qc.invalidateQueries({ queryKey: ordersKey(matterId) });
        window.addEventListener("pe-offline-flushed", onFlushed);
        return () => window.removeEventListener("pe-offline-flushed", onFlushed);
    }, [matterId, qc]);

    return useQuery({
        queryKey: ordersKey(matterId),
        queryFn: () => fetchCourtOrders(matterId),
        select: d => d.orders ?? [],
        enabled: enabled && !!matterId,
    });
}

function offlineFallbackOrder(matterId: string, input: CourtOrderInput): CourtOrder {
    return {
        order_id: `offline-${Date.now()}`,
        matter_id: matterId,
        hearing_date: input.hearing_date,
        court_name: input.court_name ?? null,
        order_brief: input.order_brief,
        next_date: input.next_date ?? null,
        outcome: input.outcome as CourtOrder["outcome"],
        created_at: new Date().toISOString(),
        _offline: true,
    };
}

export function useCreateCourtOrder(matterId: string) {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (input: CourtOrderInput) => {
            try {
                return await createCourtOrder(matterId, input);
            } catch (err) {
                if (!navigator.onLine) return offlineFallbackOrder(matterId, input);
                throw err;
            }
        },
        onSuccess: order => {
            if (order._offline) {
                qc.setQueryData<{ orders: CourtOrder[] }>(ordersKey(matterId), old =>
                    old ? { orders: [order, ...old.orders] } : { orders: [order] });
            } else {
                qc.invalidateQueries({ queryKey: ordersKey(matterId) });
            }
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

export function useUpdateCourtOrder(matterId: string) {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ orderId, input }: { orderId: string; input: CourtOrderInput }) => {
            try {
                return await updateCourtOrder(matterId, orderId, input);
            } catch (err) {
                if (!navigator.onLine) return offlineFallbackOrder(matterId, input);
                throw err;
            }
        },
        onSuccess: order => {
            if (order._offline) {
                qc.setQueryData<{ orders: CourtOrder[] }>(ordersKey(matterId), old =>
                    old ? { orders: [order, ...old.orders] } : { orders: [order] });
            } else {
                qc.invalidateQueries({ queryKey: ordersKey(matterId) });
            }
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

export function useDeleteCourtOrder(matterId: string) {
    const qc = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (orderId: string) => deleteCourtOrder(matterId, orderId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ordersKey(matterId) }),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}

export function useTranscribeHearingVoiceNote() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: (audio: Blob) => transcribeHearingVoiceNote(audio),
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
}
