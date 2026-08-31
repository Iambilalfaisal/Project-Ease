import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchDiary, sendDiaryBrief, DiaryHearing, DiaryDeadline, SendBriefResult } from "../services/diary";
import { useToast } from "../components/ui/Toast";

export interface DiaryQueryData {
    hearings: DiaryHearing[];
    deadlines: DiaryDeadline[];
    fromCache: boolean;
    cachedAt?: number;
}

export function useDiary(date: string) {
    return useQuery({
        queryKey: ["diary", date],
        queryFn: async (): Promise<DiaryQueryData> => {
            const { data, fromCache, cachedAt } = await fetchDiary(date);
            return { hearings: data.hearings, deadlines: data.deadlines, fromCache, cachedAt };
        },
    });
}

export function useSendDiaryBrief() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ toNumber, date }: { toNumber: string; date: string }) => sendDiaryBrief(toNumber, date),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { DiaryHearing, DiaryDeadline, SendBriefResult };
