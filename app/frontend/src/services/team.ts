// Typed fetch functions for the Team panel — member invite/removal and the
// per-member permissions/WhatsApp settings modal. No React here; see hooks/useTeam.ts.

import { apiRequest } from "./apiRequest";
import type { TeamMember, Category } from "../pages/owner/types";

export interface InviteTeamMemberInput {
    name: string;
    email: string;
    role: string;
}

export interface InviteTeamMemberResponse {
    user_id: string;
    name: string;
    email: string;
    role: string;
    temp_password: string;
}

export interface TeamMemberPermissions {
    category_ids: string[];
}

export function listTeam(): Promise<{ team: TeamMember[] }> {
    return apiRequest("/team");
}

export function inviteTeamMember(body: InviteTeamMemberInput): Promise<InviteTeamMemberResponse> {
    return apiRequest("/team", { method: "POST", body });
}

export function removeTeamMember(userId: string): Promise<void> {
    return apiRequest(`/team/${userId}`, { method: "DELETE" });
}

export function listCategories(): Promise<{ categories: Category[] }> {
    return apiRequest("/categories");
}

export function getTeamMemberPermissions(userId: string): Promise<TeamMemberPermissions> {
    return apiRequest(`/team/${userId}/permissions`);
}

export function setTeamMemberPermissions(userId: string, categoryIds: string[]): Promise<void> {
    return apiRequest(`/team/${userId}/permissions`, { method: "PUT", body: { category_ids: categoryIds } });
}

export function setTeamMemberWhatsapp(userId: string, whatsappNumber: string): Promise<{ whatsapp_number?: string }> {
    return apiRequest(`/team/${userId}/whatsapp`, { method: "PATCH", body: { whatsapp_number: whatsappNumber } });
}
