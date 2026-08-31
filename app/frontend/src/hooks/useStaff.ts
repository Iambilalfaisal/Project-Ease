import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchStaff, fetchAttendance, fetchSalary,
    saveStaff, deleteStaff, saveAttendance, saveSalaryPayment, deleteSalaryPayment,
    StaffForm, SalaryForm, AttendanceUpdate,
} from "../services/staff";
import { useToast } from "../components/ui/Toast";

const STAFF_KEY = ["staff"];
const ATTENDANCE_KEY = ["staffAttendance"];
const SALARY_KEY = ["staffSalary"];

export function useStaffList() {
    return useQuery({
        queryKey: STAFF_KEY,
        queryFn: async () => (await fetchStaff()).staff ?? [],
    });
}

export function useStaffAttendance(date: string, enabled: boolean) {
    return useQuery({
        queryKey: [...ATTENDANCE_KEY, date],
        queryFn: async () => (await fetchAttendance(date)).attendance ?? [],
        enabled,
    });
}

export function useStaffSalary(month: string, enabled: boolean) {
    return useQuery({
        queryKey: [...SALARY_KEY, month],
        queryFn: async () => (await fetchSalary(month)).payments ?? [],
        enabled,
    });
}

export function useSaveStaff() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ id, form }: { id: string | undefined; form: StaffForm }) => saveStaff(id, form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteStaff() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (id: string) => deleteStaff(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useSaveAttendance() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (update: AttendanceUpdate) => saveAttendance(update),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useSaveSalaryPayment() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: ({ staffId, form }: { staffId: string; form: SalaryForm }) => saveSalaryPayment(staffId, form),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: SALARY_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export function useDeleteSalaryPayment() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: (id: string) => deleteSalaryPayment(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: SALARY_KEY }),
        onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
    });
}

export type { StaffForm, SalaryForm, AttendanceUpdate };
