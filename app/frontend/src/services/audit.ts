// Audit Log — filtered, paginated event history.
import { apiRequest } from "./apiRequest";
import type { AuditLog } from "../pages/owner/types";

export interface AuditLogFilters {
    filterType: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    pageSize: number;
    /** Platform admin's cross-org audit panel filters by org; owner's per-org panel omits it. */
    orgId?: string;
}

export interface AuditLogPage {
    logs: AuditLog[];
    total: number;
}

export function fetchAuditLogs({ filterType, dateFrom, dateTo, page, pageSize, orgId }: AuditLogFilters): Promise<AuditLogPage> {
    const params = new URLSearchParams();
    if (filterType !== "all") params.set("event_type", filterType);
    if (orgId && orgId !== "all") params.set("org_id", orgId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
    return apiRequest<AuditLogPage>(`/audit-logs?${params}`);
}
