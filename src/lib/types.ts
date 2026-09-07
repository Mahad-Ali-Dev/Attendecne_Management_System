export type Role = "EMPLOYEE" | "ADMIN";

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  cnic: string | null;
  phone: string | null;
  address: string | null;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
  shift_start: string;
  shift_end: string;
  device_user_id: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  note: string | null;
  created_at: string;
}

export interface SalarySlip {
  id: string;
  user_id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  note: string | null;
  created_at: string;
}
