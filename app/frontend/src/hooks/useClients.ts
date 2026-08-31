// TanStack Query hooks for the Clients panel. Reads use useQuery; writes use
// useMutation and invalidate the whole ["clients"] branch (list + every
// client's detail/tokens/trust-ledger) on success. Failures surface via toast.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui";
import {
    listClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    listClientTokens,
    createClientToken,
    deleteClientToken,
    getTrustLedger,
    createTrustLedgerEntry,
    deleteTrustLedgerEntry,
    ClientFormInput,
    CreateClientTokenInput,
    TrustLedgerEntryInput,
} from "../services/clients";

const clientsKey = ["clients"] as const;
const clientDetailKey = (clientId: string) => [...clientsKey, clientId] as const;
const clientTokensKey = (clientId: string) => [...clientsKey, clientId, "tokens"] as const;
const trustLedgerKey = (clientId: string) => [...clientsKey, clientId, "trust-ledger"] as const;

function useMutationErrorToast() {
    const { toast } = useToast();
    return (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    };
}

export function useClients() {
    return useQuery({ queryKey: clientsKey, queryFn: listClients });
}

export function useClientDetail(clientId: string | null) {
    return useQuery({
        queryKey: clientDetailKey(clientId ?? ""),
        queryFn: () => getClient(clientId as string),
        enabled: !!clientId,
    });
}

export function useCreateClient() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: (body: ClientFormInput) => createClient(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
        onError,
    });
}

export function useUpdateClient() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: ({ clientId, body }: { clientId: string; body: ClientFormInput }) => updateClient(clientId, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
        onError,
    });
}

export function useDeleteClient() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: (clientId: string) => deleteClient(clientId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
        onError,
    });
}

export function useClientTokens(clientId: string | null) {
    return useQuery({
        queryKey: clientTokensKey(clientId ?? ""),
        queryFn: () => listClientTokens(clientId as string),
        enabled: !!clientId,
    });
}

export function useCreateClientToken() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: (body: CreateClientTokenInput) => createClientToken(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
        onError,
    });
}

export function useDeleteClientToken() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: (tokenId: string) => deleteClientToken(tokenId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
        onError,
    });
}

export function useTrustLedger(clientId: string | null) {
    return useQuery({
        queryKey: trustLedgerKey(clientId ?? ""),
        queryFn: () => getTrustLedger(clientId as string),
        enabled: !!clientId,
    });
}

export function useCreateTrustLedgerEntry() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: ({ clientId, body }: { clientId: string; body: TrustLedgerEntryInput }) =>
            createTrustLedgerEntry(clientId, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
        onError,
    });
}

export function useDeleteTrustLedgerEntry() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: ({ clientId, ledgerId }: { clientId: string; ledgerId: string }) =>
            deleteTrustLedgerEntry(clientId, ledgerId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKey }),
        onError,
    });
}
