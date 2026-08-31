// Fees/invoicing, time tracking, expenses, court fees, associate fees, and
// cheque tracking queries + mutations for a single matter.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchMatterFees, createFee, updateFee, deleteFee, generateInvoiceFromFees, FeeInput,
    fetchTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry, billTimeEntries, TimeEntryInput,
    fetchMatterExpenses, createExpense, updateExpense, deleteExpense, ExpenseInput,
    fetchCourtFees, calculateCourtFee, createCourtFee, updateCourtFee, deleteCourtFee, CourtFeeInput,
    fetchAssociateFees, createAssociateFee, updateAssociateFee, deleteAssociateFee, AssociateFeeInput,
    fetchCheques, createCheque, updateCheque, deleteCheque, ChequeInput,
} from "../services/matterFinancials";
import { useToast } from "../components/ui";

function useErrorToast() {
    const { toast } = useToast();
    return (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" });
}

// ── Fees ─────────────────────────────────────────────────────────────────────

export function useMatterFees(matterId: string, enabled = true) {
    return useQuery({ queryKey: ["matters", matterId, "fees"], queryFn: () => fetchMatterFees(matterId), enabled: enabled && !!matterId });
}

export function useCreateFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: FeeInput) => createFee(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "fees"] }),
        onError,
    });
}

export function useUpdateFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ feeId, body }: { feeId: string; body: Partial<FeeInput> | { is_paid: number } }) => updateFee(feeId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "fees"] }),
        onError,
    });
}

export function useDeleteFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (feeId: string) => deleteFee(feeId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "fees"] }),
        onError,
    });
}

export function useGenerateInvoiceFromFees(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: { matter_id: string; title: string; issued_date: string; client_id: string }) => generateInvoiceFromFees(body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "fees"] }),
        onError,
    });
}

// ── Time tracking ────────────────────────────────────────────────────────────

export function useTimeEntries(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "time-entries"],
        queryFn: () => fetchTimeEntries(matterId),
        select: d => d.entries ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateTimeEntry(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: TimeEntryInput) => createTimeEntry(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "time-entries"] }),
        onError,
    });
}

export function useUpdateTimeEntry(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ entryId, body }: { entryId: string; body: TimeEntryInput }) => updateTimeEntry(matterId, entryId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "time-entries"] }),
        onError,
    });
}

export function useDeleteTimeEntry(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (entryId: string) => deleteTimeEntry(matterId, entryId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "time-entries"] }),
        onError,
    });
}

export function useBillTimeEntries(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ entryIds, description }: { entryIds: string[]; description: string }) => billTimeEntries(matterId, entryIds, description),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "time-entries"] }),
        onError,
    });
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export function useMatterExpenses(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "expenses"],
        queryFn: () => fetchMatterExpenses(matterId),
        select: d => d.expenses ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateExpense(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: ExpenseInput) => createExpense(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "expenses"] }),
        onError,
    });
}

export function useUpdateExpense(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ expenseId, body }: { expenseId: string; body: ExpenseInput }) => updateExpense(matterId, expenseId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "expenses"] }),
        onError,
    });
}

export function useDeleteExpense(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (expenseId: string) => deleteExpense(matterId, expenseId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "expenses"] }),
        onError,
    });
}

// ── Court fees ───────────────────────────────────────────────────────────────

export function useCourtFees(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "court-fees"],
        queryFn: () => fetchCourtFees(matterId),
        select: d => d.payments ?? [],
        enabled: enabled && !!matterId,
    });
}

/** Not cached — a live calculator preview as the claim amount / fee type change. */
export function useCalculateCourtFee() {
    return useMutation({
        mutationFn: ({ claimAmountPkr, feeType }: { claimAmountPkr: number; feeType: string }) => calculateCourtFee(claimAmountPkr, feeType),
    });
}

export function useCreateCourtFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: CourtFeeInput) => createCourtFee(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "court-fees"] }),
        onError,
    });
}

export function useUpdateCourtFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ feePaymentId, body }: { feePaymentId: string; body: CourtFeeInput }) => updateCourtFee(matterId, feePaymentId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "court-fees"] }),
        onError,
    });
}

export function useDeleteCourtFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (feePaymentId: string) => deleteCourtFee(matterId, feePaymentId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "court-fees"] }),
        onError,
    });
}

// ── Associate / wakeel fees ──────────────────────────────────────────────────

export function useAssociateFees(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "associate-fees"],
        queryFn: () => fetchAssociateFees(matterId),
        select: d => d.fees ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateAssociateFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: AssociateFeeInput) => createAssociateFee(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "associate-fees"] }),
        onError,
    });
}

export function useUpdateAssociateFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ assocFeeId, body }: { assocFeeId: string; body: AssociateFeeInput }) => updateAssociateFee(matterId, assocFeeId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "associate-fees"] }),
        onError,
    });
}

export function useDeleteAssociateFee(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (assocFeeId: string) => deleteAssociateFee(matterId, assocFeeId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "associate-fees"] }),
        onError,
    });
}

// ── Cheques ──────────────────────────────────────────────────────────────────

export function useCheques(matterId: string, enabled = true) {
    return useQuery({
        queryKey: ["matters", matterId, "cheques"],
        queryFn: () => fetchCheques(matterId),
        select: d => d.cheques ?? [],
        enabled: enabled && !!matterId,
    });
}

export function useCreateCheque(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (body: ChequeInput) => createCheque(matterId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "cheques"] }),
        onError,
    });
}

export function useUpdateCheque(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: ({ chequeId, body }: { chequeId: string; body: ChequeInput }) => updateCheque(matterId, chequeId, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "cheques"] }),
        onError,
    });
}

export function useDeleteCheque(matterId: string) {
    const qc = useQueryClient();
    const onError = useErrorToast();
    return useMutation({
        mutationFn: (chequeId: string) => deleteCheque(matterId, chequeId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["matters", matterId, "cheques"] }),
        onError,
    });
}
