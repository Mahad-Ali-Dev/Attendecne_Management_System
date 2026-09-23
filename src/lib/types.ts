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
  /** Days of the week this employee is normally off (0=Sun .. 6=Sat). */
  off_days: number[];
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

export type LeaveType = "SICK" | "CASUAL" | "ANNUAL" | "OTHER";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type NotificationType =
  | "LEAVE_REQUESTED"
  | "LEAVE_APPROVED"
  | "LEAVE_REJECTED"
  | "COMPLAINT_SUBMITTED"
  | "COMPLAINT_RESOLVED";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export type ComplaintCategory = "ATTENDANCE" | "SALARY" | "LEAVE" | "OTHER";
export type ComplaintStatus = "OPEN" | "RESOLVED";

export interface Complaint {
  id: string;
  user_id: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  related_date: string | null;
  status: ComplaintStatus;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

/**
 * Browser-activity tracker data — written by a separate tracking tool
 * (its own extension/agent), not by this app. These types just describe
 * what's read from those tables; this app only ever writes to
 * site_categories (admin categorization), never to the other two.
 */
export interface ProductivitySession {
  id: string;
  user_id: string;
  work_date: string;
  total_productive_seconds: number;
  total_unproductive_seconds: number;
  tab_switch_count: number;
  flagged_suspicious: boolean;
  flag_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type SiteCategoryValue = "PRODUCTIVE" | "NEUTRAL" | "DISTRACTING" | "UNCATEGORIZED";

export interface SiteActivity {
  id: string;
  user_id: string;
  work_date: string;
  hostname: string;
  category: SiteCategoryValue;
  productive_seconds: number;
  unproductive_seconds: number;
  created_at: string;
  updated_at: string;
}

/**
 * Desktop-agent per-application activity — the successor to SiteActivity
 * now that tracking isn't browser-extension-only. No category concept
 * (unlike SiteActivity); app_name is a raw executable basename, e.g.
 * "chrome.exe" — see formatAppName() in @/lib/productivity for display.
 */
export interface AppActivity {
  id: string;
  user_id: string;
  work_date: string;
  app_name: string;
  productive_seconds: number;
  unproductive_seconds: number;
  created_at: string;
  updated_at: string;
}

/** Admin-managed hostname → category mapping the tracker consults going forward. */
export interface SiteCategory {
  id: string;
  hostname: string;
  category: Exclude<SiteCategoryValue, "UNCATEGORIZED">;
  created_by: string | null;
  created_at: string;
}
