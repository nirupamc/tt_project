// Database types for Archway

export type UserRole = "admin" | "supervisor" | "employee";
export type TaskType = "reading" | "coding" | "quiz" | "video";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar_url: string | null;
  hours_per_day: number;
  hourly_rate: number;
  default_start_date: string | null;
  joining_date: string | null; // Added for tenure calculation
  opt_type?: "OPT" | "STEM OPT" | null;
  ead_number?: string | null;
  ead_start_date?: string | null;
  ead_end_date?: string | null;
  job_title?: string | null;
  hours_per_week?: number | null;
  pay_rate?: number | null;
  work_location?: string | null;
  university_name?: string | null;
  dso_name?: string | null;
  dso_email?: string | null;
  i9_completion_date?: string | null;
  everify_case_number?: string | null;
  everify_status?: "Employment Authorized" | "Pending" | "Not Started" | null;
  supervisor_id?: string | null;
  documents_uploaded_count?: number;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  skill_tag: string | null;
  client_code?: string | null;
  client_name?: string | null;
  client_location?: string | null;
  sow_reference?: string | null;
  sow_status?: "Not Started" | "Sent to Client" | "Signed" | null;
  invoice_status?:
    | "Not Issued"
    | "Issued"
    | "Partial Payment"
    | "Fully Paid"
    | null;
  total_days: number;
  start_date: string | null;
  enrollment_start_date?: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  is_active: boolean;
  weekdays_only: boolean;
  daily_reminder_emails: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectDay {
  id: string;
  project_id: string;
  day_number: number;
  title: string | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

export interface Task {
  id: string;
  project_day_id: string;
  title: string;
  task_type: TaskType;
  description: string | null;
  is_required: boolean;
  // Reading fields
  reading_content_md: string | null;
  reading_time_minutes: number | null;
  // Coding fields
  coding_starter_code: string | null;
  coding_language: string | null;
  // Quiz fields
  quiz_questions: QuizQuestion[] | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  project_id: string;
  start_date: string; // This is the assigned_date (when admin assigned it)
  enrolled_at: string;
}

// Dummy completed project (not in database)
export interface CompletedDummyProject {
  id: string;
  title: string;
  description: string;
  duration_months: number;
  status: 'completed';
  progress: number; // Always 100
  is_dummy: true;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  project_day_id: string | null;
  completed_at: string;
  submission_data: Record<string, unknown> | null;
}

export interface Timesheet {
  id: string;
  user_id: string;
  work_date: string;
  hours_logged: number;
  project_id: string | null;
  notes: string | null;
  task_category?: string | null;
  task_description?: string | null;
  i983_objective_mapped?: "objective_1" | "objective_2" | "objective_3" | null;
  training_hours?: number | null;
  billable_hours?: number | null;
  updated_at: string;
}

export interface TimesheetApproval {
  id: string;
  employee_id: string;
  week_start_date: string;
  approved_by: string;
  approved_by_name: string;
  approved_at: string;
}

export interface I983Plan {
  id: string;
  employee_id: string;
  version_date: string | null;
  dso_submission_date: string | null;
  dso_ack_uploaded: boolean;
  dso_ack_file_url: string | null;
  next_eval_due: string | null;
  objective_1_text: string | null;
  objective_1_status: "Not Started" | "In Progress" | "Completed" | null;
  objective_1_project_id: string | null;
  objective_2_text: string | null;
  objective_2_status: "Not Started" | "In Progress" | "Completed" | null;
  objective_2_project_id: string | null;
  objective_3_text: string | null;
  objective_3_status: "Not Started" | "In Progress" | "Completed" | null;
  objective_3_project_id: string | null;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type:
    | "passport_copy"
    | "current_i20"
    | "ead_card"
    | "signed_i983"
    | "dso_ack_email"
    | "signed_offer_letter"
    | "completed_i9"
    | "everify_screenshot"
    | "supervisor_ack";
  file_url: string | null;
  uploaded_at: string | null;
  expiry_date: string | null;
  version_date: string | null;
  status: "uploaded" | "missing";
}

export interface PaymentLog {
  id: string;
  project_id: string;
  payment_date: string;
  inr_amount: number;
  utr_reference: string;
  usd_equivalent: number;
  payment_method: "UPI" | "NEFT" | "Bank Transfer" | "Wire";
  notes: string | null;
  created_at: string;
}

export type NotificationType =
  | "ead_expiry"
  | "i983_due"
  | "timesheet_missing"
  | "approval_pending";

export interface NotificationItem {
  id: string;
  recipient_user_id: string;
  message: string;
  type: NotificationType;
  related_url: string | null;
  is_read: boolean;
  created_at: string;
}

// Extended types with relations
export interface ProjectWithEnrollments extends Project {
  enrollments?: Enrollment[];
  enrollment_count?: number;
}

export interface EnrollmentWithProject extends Enrollment {
  project?: Project;
}

export interface EnrollmentWithUser extends Enrollment {
  user?: User;
}

export interface ProjectDayWithTasks extends ProjectDay {
  tasks?: Task[];
}

export interface TaskWithCompletion extends Task {
  completion?: TaskCompletion | null;
}

// JSON Upload types
export interface TaskUploadData {
  title: string;
  type: TaskType;
  description?: string;
  is_required?: boolean;
  reading_content_md?: string;
  reading_time_minutes?: number;
  coding_starter_code?: string;
  coding_language?: string;
  quiz_questions?: QuizQuestion[];
}

export interface DayUploadData {
  day: number;
  title: string;
  tasks: TaskUploadData[];
}

// Day status for employee view
export type DayStatus = "locked" | "available" | "completed";

export interface ProjectDayWithStatus extends ProjectDay {
  status: DayStatus;
  tasks_count: number;
  completed_count: number;
}

// Session user type
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
}
