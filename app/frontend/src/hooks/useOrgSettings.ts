import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getOrgProfile,
    saveOrgProfile,
    saveOrgBasic,
    changePassword,
    getMatterTeams,
    getOrgTeamMembers,
    createMatterTeam,
    deleteMatterTeam,
    addTeamMember,
    removeTeamMember,
    getBailStages,
    addBailStage,
    renameBailStage,
    setBailStageActive,
    OrgProfileResponse,
    SaveOrgProfilePayload,
    SaveOrgBasicPayload,
    ChangePasswordPayload,
    OrgMemberRaw,
    BailStage,
} from "../services/orgSettings";
import { useToast } from "../components/ui/Toast";

const ORG_PROFILE_KEY = ["orgProfile"];
const MATTER_TEAMS_KEY = ["matterTeams"];
const ORG_MEMBERS_KEY = ["orgMembers"];
const BAIL_STAGES_KEY = ["bailStages"];

export function useOrgProfile() {
    return useQuery<OrgProfileResponse>({
        queryKey: ORG_PROFILE_KEY,
        queryFn: getOrgProfile,
    });
}

export function useSaveOrgProfile() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (payload: SaveOrgProfilePayload) => saveOrgProfile(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_PROFILE_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useSaveOrgBasic() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: (payload: SaveOrgBasicPayload) => saveOrgBasic(payload),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useChangePassword() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useMatterTeams() {
    return useQuery({
        queryKey: MATTER_TEAMS_KEY,
        queryFn: () => getMatterTeams().then(d => d.teams ?? []),
    });
}

export function useOrgMembers() {
    return useQuery({
        queryKey: ORG_MEMBERS_KEY,
        queryFn: () => getOrgTeamMembers().then(d => d.members ?? []),
    });
}

export function useCreateMatterTeam() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (name: string) => createMatterTeam(name),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MATTER_TEAMS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteMatterTeam() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (teamId: string) => deleteMatterTeam(teamId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MATTER_TEAMS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useAddTeamMember() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => addTeamMember(teamId, userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MATTER_TEAMS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useRemoveTeamMember() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => removeTeamMember(teamId, userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MATTER_TEAMS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useBailStages() {
    return useQuery({
        queryKey: BAIL_STAGES_KEY,
        queryFn: () => getBailStages().then(d => d.stages ?? []),
    });
}

export function useAddBailStage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (label: string) => addBailStage(label),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: BAIL_STAGES_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useRenameBailStage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ stageKey, label }: { stageKey: string; label: string }) => renameBailStage(stageKey, label),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: BAIL_STAGES_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useSetBailStageActive() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ stageKey, isActive }: { stageKey: string; isActive: 0 | 1 }) => setBailStageActive(stageKey, isActive),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: BAIL_STAGES_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { OrgProfileResponse, OrgMemberRaw, BailStage };
