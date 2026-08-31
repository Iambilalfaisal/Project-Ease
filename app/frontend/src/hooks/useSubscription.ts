import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getPlanConfig,
    getOrgUpgradeStatus,
    submitUpgradeRequest,
    PlanConfigResponse,
    OrgUpgradeStatus,
    UpgradeRequestPayload,
} from "../services/subscription";
import { useToast } from "../components/ui/Toast";

const PLAN_CONFIG_KEY = ["planConfig"];
const ORG_UPGRADE_STATUS_KEY = ["orgUpgradeStatus"];

export function usePlanConfig() {
    return useQuery<PlanConfigResponse>({
        queryKey: PLAN_CONFIG_KEY,
        queryFn: getPlanConfig,
    });
}

export function useOrgUpgradeStatus() {
    return useQuery<OrgUpgradeStatus>({
        queryKey: ORG_UPGRADE_STATUS_KEY,
        queryFn: getOrgUpgradeStatus,
    });
}

export function useSubmitUpgradeRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (payload: UpgradeRequestPayload) => submitUpgradeRequest(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ORG_UPGRADE_STATUS_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { PlanConfigResponse, OrgUpgradeStatus, UpgradeRequestPayload };
