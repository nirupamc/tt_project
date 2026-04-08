// Database types for Archway

export type UserRole = "admin" | "employee";
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
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  skill_tag: string | null;
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
  updated_at: string;
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
