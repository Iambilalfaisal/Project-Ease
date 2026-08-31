// Employee Portal — profile, permitted documents, password change.
import { apiRequest } from "./apiRequest";
import type { MyProfile, DocFile } from "../pages/employee/types";

export function fetchMyProfile(): Promise<MyProfile> {
    return apiRequest<MyProfile>("/me");
}

export function fetchMyDocuments(): Promise<{ documents: DocFile[] }> {
    return apiRequest<{ documents: DocFile[] }>("/documents");
}

export interface ChangePasswordPayload {
    current_password: string;
    new_password: string;
}

export function changePassword(payload: ChangePasswordPayload): Promise<unknown> {
    return apiRequest("/auth/change-password", { method: "POST", body: payload });
}
