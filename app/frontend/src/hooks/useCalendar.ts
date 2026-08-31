import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchCalendarData, saveHearing, saveDeadline, deleteHearing, deleteDeadline,
    setDeadlineCompleted, fetchHolidayPreview, sendHolidayNotify,
    CalendarData, Hearing, Deadline, HearingFormBody, DeadlineFormBody,
    HolidayPreviewClient, HolidayNotifyResult,
} from "../services/calendar";
import { useToast } from "../components/ui/Toast";

const CALENDAR_KEY = ["calendar"];

export function useCalendarData(fromDate: string, toDate: string) {
    return useQuery({
        queryKey: [...CALENDAR_KEY, fromDate, toDate],
        queryFn: () => fetchCalendarData(fromDate, toDate),
    });
}

export function useSaveHearing() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ id, body }: { id: string | undefined; body: HearingFormBody }) => saveHearing(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useSaveDeadline() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ id, body }: { id: string | undefined; body: DeadlineFormBody }) => saveDeadline(id, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteHearing() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (id: string) => deleteHearing(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteDeadline() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (id: string) => deleteDeadline(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useToggleDeadlineComplete() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ id, completed }: { id: string; completed: boolean }) => setDeadlineCompleted(id, completed),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useHolidayPreview() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ fromDate, toDate }: { fromDate: string; toDate: string }) => fetchHolidayPreview(fromDate, toDate),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useSendHolidayNotify() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ fromDate, toDate, message }: { fromDate: string; toDate: string; message?: string }) =>
            sendHolidayNotify(fromDate, toDate, message),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { CalendarData, Hearing, Deadline, HearingFormBody, DeadlineFormBody, HolidayPreviewClient, HolidayNotifyResult };
