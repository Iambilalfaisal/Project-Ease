import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchCauseListEntries, fetchCauseListMatters, parseCauseListFile, parseCauseListText,
    deleteCauseListEntry, linkCauseListEntry,
    CauseListEntry, CauseListMatterOption, CauseListParseResult,
} from "../services/causeList";
import { useToast } from "../components/ui/Toast";

const entriesKey = (date: string) => ["causeListEntries", date];
const MATTERS_KEY = ["causeListMatters"];

export function useCauseListEntries(date: string) {
    return useQuery({
        queryKey: entriesKey(date),
        queryFn: () => fetchCauseListEntries(date).then(d => d.entries ?? []),
    });
}

export function useCauseListMatters() {
    return useQuery({
        queryKey: MATTERS_KEY,
        queryFn: fetchCauseListMatters,
    });
}

interface ParseParams {
    file: File | null;
    text: string;
    listDate: string;
    courtName: string;
}

export function useParseCauseList() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<CauseListParseResult, Error, ParseParams>({
        mutationFn: ({ file, text, listDate, courtName }) =>
            file
                ? parseCauseListFile(file, listDate, courtName)
                : parseCauseListText({ text, list_date: listDate, court_name: courtName }),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: entriesKey(variables.listDate) });
        },
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteCauseListEntry(date: string) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (entryId: string) => deleteCauseListEntry(entryId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: entriesKey(date) }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useLinkCauseListEntry(date: string) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ entryId, matterId }: { entryId: string; matterId: string | null }) => linkCauseListEntry(entryId, matterId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: entriesKey(date) }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { CauseListEntry, CauseListMatterOption };
