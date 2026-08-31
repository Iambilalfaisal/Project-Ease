// Staff & Salary — staff CRUD, daily attendance, and monthly salary payments.
import { apiRequest } from "./apiRequest";
import type { StaffMember, StaffAttendance, SalaryPayment } from "../pages/owner/types";

export interface StaffForm {
    name: string;
    role: string;
    monthly_salary_pkr: number;
    join_date: string;
    cnic: string;
    phone: string;
    status: string;
    notes: string;
}

export interface SalaryForm {
    month: string;
    gross_pkr: number;
    advance_deduction: number;
    absence_deduction: number;
    paid_date: string;
    payment_mode: string;
    notes: string;
}

export interface AttendanceUpdate {
    staff_id: string;
    att_date: string;
    status: string;
    time_in?: string;
    time_out?: string;
}

export function fetchStaff(): Promise<{ staff: StaffMember[] }> {
    return apiRequest<{ staff: StaffMember[] }>("/staff");
}

export function fetchAttendance(date: string): Promise<{ attendance: StaffAttendance[] }> {
    return apiRequest<{ attendance: StaffAttendance[] }>(`/staff/attendance?date=${date}`);
}

export function fetchSalary(month: string): Promise<{ payments: SalaryPayment[] }> {
    return apiRequest<{ payments: SalaryPayment[] }>(`/staff/salary?month=${month}`);
}

export function saveStaff(id: string | undefined, form: StaffForm): Promise<StaffMember> {
    const url = id ? `/staff/${id}` : "/staff";
    return apiRequest<StaffMember>(url, { method: id ? "PATCH" : "POST", body: form });
}

export function deleteStaff(id: string): Promise<void> {
    return apiRequest<void>(`/staff/${id}`, { method: "DELETE" });
}

export function saveAttendance(update: AttendanceUpdate): Promise<void> {
    return apiRequest<void>("/staff/attendance", { method: "POST", body: update });
}

export function saveSalaryPayment(staffId: string, form: SalaryForm): Promise<SalaryPayment> {
    return apiRequest<SalaryPayment>("/staff/salary", { method: "POST", body: { staff_id: staffId, ...form } });
}

export function deleteSalaryPayment(id: string): Promise<void> {
    return apiRequest<void>(`/staff/salary/${id}`, { method: "DELETE" });
}
