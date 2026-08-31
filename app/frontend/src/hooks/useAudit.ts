import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs, AuditLogFilters } from "../services/audit";

export function useAuditLogs(filters: AuditLogFilters) {
    return useQuery({
        queryKey: ["auditLog", filters],
        queryFn: async () => {
            const d = await fetchAuditLogs(filters);
            return { logs: d.logs ?? [], total: d.total ?? 0 };
        },
    });
}
