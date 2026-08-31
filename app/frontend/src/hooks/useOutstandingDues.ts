import { useQuery } from "@tanstack/react-query";
import { fetchOutstandingDues } from "../services/outstandingDues";

export function useOutstandingDuesQuery() {
    return useQuery({
        queryKey: ["outstandingDues"],
        queryFn: fetchOutstandingDues,
    });
}
