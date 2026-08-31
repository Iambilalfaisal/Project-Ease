import { useMutation } from "@tanstack/react-query";
import { logout } from "../services/auth";
import { useToast } from "../components/ui/Toast";

/** Fire-and-forget session teardown shared by every authenticated shell. */
export function useLogout() {
    const { toast } = useToast();
    return useMutation({
        mutationFn: logout,
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}
