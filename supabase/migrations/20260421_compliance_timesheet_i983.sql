-- Expand user role support
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'supervisor', 'employee'));

-- Compliance fields on users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS opt_type TEXT CHECK (opt_type IN ('OPT', 'STEM OPT')),
  ADD COLUMN IF NOT EXISTS ead_number TEXT,
  ADD COLUMN IF NOT EXISTS ead_start_date DATE,
  ADD COLUMN IF NOT EXISTS ead_end_date DATE,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS hours_per_week NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pay_rate NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS work_location TEXT,
  ADD COLUMN IF NOT EXISTS university_name TEXT,
  ADD COLUMN IF NOT EXISTS dso_name TEXT,
  ADD COLUMN IF NOT EXISTS dso_email TEXT,
  ADD COLUMN IF NOT EXISTS i9_completion_date DATE,
  ADD COLUMN IF NOT EXISTS everify_case_number TEXT,
  ADD COLUMN IF NOT EXISTS everify_status TEXT CHECK (everify_status IN ('Employment Authorized', 'Pending', 'Not Started')),
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Daily activity log fields on timesheets
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS task_category TEXT,
  ADD COLUMN IF NOT EXISTS task_description TEXT,
  ADD COLUMN IF NOT EXISTS i983_objective_mapped TEXT CHECK (i983_objective_mapped IN ('objective_1', 'objective_2', 'objective_3')),
  ADD COLUMN IF NOT EXISTS training_hours NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS billable_hours NUMERIC(4,2);

-- Weekly approval table
CREATE TABLE IF NOT EXISTS public.timesheet_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  approved_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_by_name TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_timesheet_approvals_employee_week
  ON public.timesheet_approvals(employee_id, week_start_date);

-- I-983 plans table (1 row per employee)
CREATE TABLE IF NOT EXISTS public.i983_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  version_date DATE,
  dso_submission_date DATE,
  dso_ack_uploaded BOOLEAN NOT NULL DEFAULT FALSE,
  dso_ack_file_url TEXT,
  next_eval_due DATE,
  objective_1_text TEXT,
  objective_1_status TEXT CHECK (objective_1_status IN ('Not Started', 'In Progress', 'Completed')),
  objective_1_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  objective_2_text TEXT,
  objective_2_status TEXT CHECK (objective_2_status IN ('Not Started', 'In Progress', 'Completed')),
  objective_2_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  objective_3_text TEXT,
  objective_3_status TEXT CHECK (objective_3_status IN ('Not Started', 'In Progress', 'Completed')),
  objective_3_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_i983_plans_employee
  ON public.i983_plans(employee_id);
