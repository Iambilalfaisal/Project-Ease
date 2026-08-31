import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs, AuditLogFilters } from "../services/audit";

/** Platform admin's cross-org audit panel — distinct query key from any per-org owner audit hook. */
export function useAdminAuditLog(filters: AuditLogFilters) {
    return useQuery({
        queryKey: ["admin", "auditLogs", filters],
        queryFn: () => fetchAuditLogs(filters),
    });
}
