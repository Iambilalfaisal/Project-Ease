import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchInvoices, fetchInvoice, updateInvoiceStatus } from "../services/invoices";
import { useToast } from "../components/ui";

export function useInvoicesQuery() {
    return useQuery({
        queryKey: ["invoices"],
        queryFn: fetchInvoices,
    });
}

// On-demand detail fetch (opened by clicking an invoice number). Errors are left
// to fail silently, matching the original fetch().catch(() => {}) fallback.
export function useInvoiceDetailQuery(invoiceId: string | null) {
    return useQuery({
        queryKey: ["invoices", "detail", invoiceId],
        queryFn: () => fetchInvoice(invoiceId as string),
        enabled: invoiceId !== null,
        retry: false,
    });
}

export function useUpdateInvoiceStatusMutation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ invoiceId, status }: { invoiceId: string; status: string }) => updateInvoiceStatus(invoiceId, status),
        onSuccess: () => {
            // Status changes shift which aging bucket / paid total an invoice belongs to.
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["outstandingDues"] });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}
