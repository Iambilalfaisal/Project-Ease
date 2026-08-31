// Organization Settings — org profile, account password, practice teams, bail checklist stages.
import { apiRequest } from "./apiRequest";
import { MatterTeam } from "../pages/owner/types";

export interface OrgProfileResponse {
    phone?: string;
    city?: string;
    bar_council_no?: string;
    website?: string;
    team_size?: string;
    practice_areas?: string;
}

export function getOrgProfile(): Promise<OrgProfileResponse> {
    return apiRequest<OrgProfileResponse>("/org");
}

export interface SaveOrgProfilePayload {
    phone: string;
    city: string;
    practice_areas: string;
    bar_council_no: string;
    website: string;
    team_size: string;
}

export function saveOrgProfile(payload: SaveOrgProfilePayload): Promise<void> {
    return apiRequest<void>("/org/profile", { method: "PUT", body: payload });
}

export interface SaveOrgBasicPayload {
    name: string;
    industry: string;
}

export function saveOrgBasic(payload: SaveOrgBasicPayload): Promise<void> {
    return apiRequest<void>("/org", { method: "PUT", body: payload });
}

export interface ChangePasswordPayload {
    current_password: string;
    new_password: string;
}

export function changePassword(payload: ChangePasswordPayload): Promise<void> {
    return apiRequest<void>("/auth/change-password", { method: "POST", body: payload });
}

export interface OrgMemberRaw {
    user_id: string;
    name: string;
    email: string;
    role: string;
    created_at?: string;
}

export function getMatterTeams(): Promise<{ teams: MatterTeam[] }> {
    return apiRequest<{ teams: MatterTeam[] }>("/matter-teams");
}

export function getOrgTeamMembers(): Promise<{ members: OrgMemberRaw[] }> {
    return apiRequest<{ members: OrgMemberRaw[] }>("/team");
}

export function createMatterTeam(name: string): Promise<MatterTeam> {
    return apiRequest<MatterTeam>("/matter-teams", { method: "POST", body: { name } });
}

export function deleteMatterTeam(teamId: string): Promise<void> {
    return apiRequest<void>(`/matter-teams/${teamId}`, { method: "DELETE" });
}

export function addTeamMember(teamId: string, userId: string): Promise<void> {
    return apiRequest<void>(`/matter-teams/${teamId}/members/${userId}`, { method: "POST" });
}

export function removeTeamMember(teamId: string, userId: string): Promise<void> {
    return apiRequest<void>(`/matter-teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

export interface BailStage {
    stage_key: string;
    label: string;
    sort_order: number;
    completed_at?: string | null;
    completed_by?: string | null;
    is_active?: number;
}

export function getBailStages(): Promise<{ stages: BailStage[] }> {
    return apiRequest<{ stages: BailStage[] }>("/bail-stages?all=1");
}

export function addBailStage(label: string): Promise<void> {
    return apiRequest<void>("/bail-stages", { method: "POST", body: { label } });
}

export function renameBailStage(stageKey: string, label: string): Promise<void> {
    return apiRequest<void>(`/bail-stages/${stageKey}`, { method: "PATCH", body: { label } });
}

export function setBailStageActive(stageKey: string, isActive: 0 | 1): Promise<void> {
    return apiRequest<void>(`/bail-stages/${stageKey}`, { method: "PATCH", body: { is_active: isActive } });
}
