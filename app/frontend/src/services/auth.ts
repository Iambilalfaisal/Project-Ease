// Auth — session teardown shared by every authenticated shell (admin, owner, employee).
import { apiRequest } from "./apiRequest";

export function logout(): Promise<unknown> {
    return apiRequest("/auth/logout", { method: "POST" });
}
