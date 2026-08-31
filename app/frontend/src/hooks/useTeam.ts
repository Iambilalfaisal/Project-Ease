// TanStack Query hooks for the Team panel — member list/invite/removal plus
// the per-member permissions/WhatsApp settings used by the Permissions modal.
// Failures surface via toast; the ["team"] branch is invalidated on writes so
// any consumer using useTeam() picks up the change.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui";
import {
    listTeam,
    inviteTeamMember,
    removeTeamMember,
    listCategories,
    getTeamMemberPermissions,
    setTeamMemberPermissions,
    setTeamMemberWhatsapp,
    InviteTeamMemberInput,
} from "../services/team";

const teamKey = ["team"] as const;
const categoriesKey = ["categories"] as const;
const teamPermissionsKey = (userId: string) => [...teamKey, userId, "permissions"] as const;

function useMutationErrorToast() {
    const { toast } = useToast();
    return (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    };
}

export function useTeam() {
    return useQuery({ queryKey: teamKey, queryFn: listTeam });
}

export function useInviteTeamMember() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: (body: InviteTeamMemberInput) => inviteTeamMember(body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey }),
        onError,
    });
}

export function useRemoveTeamMember() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: (userId: string) => removeTeamMember(userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey }),
        onError,
    });
}

export function useCategories() {
    return useQuery({ queryKey: categoriesKey, queryFn: listCategories });
}

export function useTeamMemberPermissions(userId: string | null) {
    return useQuery({
        queryKey: teamPermissionsKey(userId ?? ""),
        queryFn: () => getTeamMemberPermissions(userId as string),
        enabled: !!userId,
    });
}

export function useSetTeamMemberPermissions() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: ({ userId, categoryIds }: { userId: string; categoryIds: string[] }) =>
            setTeamMemberPermissions(userId, categoryIds),
        onSuccess: (_data, variables) =>
            queryClient.invalidateQueries({ queryKey: teamPermissionsKey(variables.userId) }),
        onError,
    });
}

export function useSetTeamMemberWhatsapp() {
    const queryClient = useQueryClient();
    const onError = useMutationErrorToast();
    return useMutation({
        mutationFn: ({ userId, whatsappNumber }: { userId: string; whatsappNumber: string }) =>
            setTeamMemberWhatsapp(userId, whatsappNumber),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey }),
        onError,
    });
}
