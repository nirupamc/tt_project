-- ============================================================
-- TanTech Upskill - Complete Database Setup
-- ============================================================
-- 
-- You can either:
-- 1. Run this single file (contains everything), OR
-- 2. Run each migration file (001-006) in order
--
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- PART 1: Enable Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PART 2: Create Tables
-- ============================================================

-- Users table (mirrors NextAuth users, extended with role)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  skill_tag TEXT,
  total_days INT NOT NULL DEFAULT 30,
  start_date DATE,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  weekdays_only BOOLEAN DEFAULT FALSE,
  daily_reminder_emails BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project days (one row per day per project, e.g. Day 1 to Day 30)
CREATE TABLE IF NOT EXISTS public.project_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  title TEXT,
  UNIQUE(project_id, day_number)
);

-- Tasks (belong to a project day)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_day_id UUID REFERENCES public.project_days(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('reading', 'coding', 'quiz', 'video')),
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  -- Reading fields
  reading_content_md TEXT,
  reading_time_minutes INT,
  -- Coding fields
  coding_starter_code TEXT,
  coding_language TEXT,
  -- Quiz fields (stored as JSONB array: [{question, options[], correct_index}])
  quiz_questions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments (which employees are assigned to which projects)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Task completions (tracks when an employee completes a task)
CREATE TABLE IF NOT EXISTS public.task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_day_id UUID REFERENCES public.project_days(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  submission_data JSONB,
  UNIQUE(user_id, task_id)
);

-- Timesheets (one row per user per day, hours auto-set to 5 on task completion)
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_logged NUMERIC(4,2) DEFAULT 0,
  project_id UUID REFERENCES public.projects(id),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date, project_id)
);

-- ============================================================
-- PART 3: Create Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_project_days_project_id ON public.project_days(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_day_id ON public.tasks(project_day_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_project_id ON public.enrollments(project_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON public.task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON public.timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_work_date ON public.timesheets(work_date);

-- ============================================================
-- PART 4: Enable Row Level Security
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: RLS Policies
-- ============================================================

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "service_role_all_users" ON public.users;
DROP POLICY IF EXISTS "anyone_read_active_projects" ON public.projects;
DROP POLICY IF EXISTS "service_role_all_projects" ON public.projects;
DROP POLICY IF EXISTS "anyone_read_project_days" ON public.project_days;
DROP POLICY IF EXISTS "service_role_all_project_days" ON public.project_days;
DROP POLICY IF EXISTS "anyone_read_tasks" ON public.tasks;
DROP POLICY IF EXISTS "service_role_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "service_role_all_enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "service_role_all_task_completions" ON public.task_completions;
DROP POLICY IF EXISTS "service_role_all_timesheets" ON public.timesheets;

-- Users: Service role can access all
CREATE POLICY "service_role_all_users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

-- Projects: Anyone can read published+active projects
CREATE POLICY "anyone_read_active_projects" ON public.projects
  FOR SELECT USING (is_published = true AND is_active = true);

-- Projects: Service role can do everything
CREATE POLICY "service_role_all_projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

-- Project Days: Anyone can read days of published+active projects
CREATE POLICY "anyone_read_project_days" ON public.project_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id 
      AND p.is_published = true 
      AND p.is_active = true
    )
  );

-- Project Days: Service role can do everything
CREATE POLICY "service_role_all_project_days" ON public.project_days
  FOR ALL USING (true) WITH CHECK (true);

-- Tasks: Anyone can read tasks of published+active projects
CREATE POLICY "anyone_read_tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_days pd
      JOIN public.projects p ON p.id = pd.project_id
      WHERE pd.id = project_day_id
      AND p.is_published = true 
      AND p.is_active = true
    )
  );

-- Tasks: Service role can do everything
CREATE POLICY "service_role_all_tasks" ON public.tasks
  FOR ALL USING (true) WITH CHECK (true);

-- Enrollments: Service role can do everything
CREATE POLICY "service_role_all_enrollments" ON public.enrollments
  FOR ALL USING (true) WITH CHECK (true);

-- Task Completions: Service role can do everything
CREATE POLICY "service_role_all_task_completions" ON public.task_completions
  FOR ALL USING (true) WITH CHECK (true);

-- Timesheets: Service role can do everything
CREATE POLICY "service_role_all_timesheets" ON public.timesheets
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- PART 6: Helper Functions and Triggers
-- ============================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects table
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for timesheets table
DROP TRIGGER IF EXISTS update_timesheets_updated_at ON public.timesheets;
CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get employee progress on a project
CREATE OR REPLACE FUNCTION get_employee_project_progress(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(t.id) AS total_tasks,
    COUNT(tc.id) AS completed_tasks,
    CASE 
      WHEN COUNT(t.id) = 0 THEN 0
      ELSE ROUND((COUNT(tc.id)::NUMERIC / COUNT(t.id)::NUMERIC) * 100, 2)
    END AS progress_percentage
  FROM public.tasks t
  JOIN public.project_days pd ON pd.id = t.project_day_id
  LEFT JOIN public.task_completions tc ON tc.task_id = t.id AND tc.user_id = p_user_id
  WHERE pd.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if all required tasks for a day are completed
CREATE OR REPLACE FUNCTION are_all_required_tasks_completed(
  p_user_id UUID,
  p_project_day_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  required_count INT;
  completed_count INT;
BEGIN
  SELECT COUNT(*) INTO required_count
  FROM public.tasks
  WHERE project_day_id = p_project_day_id AND is_required = TRUE;

  SELECT COUNT(*) INTO completed_count
  FROM public.tasks t
  JOIN public.task_completions tc ON tc.task_id = t.id
  WHERE t.project_day_id = p_project_day_id 
    AND t.is_required = TRUE
    AND tc.user_id = p_user_id;

  RETURN required_count = completed_count AND required_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 7: Seed Admin User
-- ============================================================
-- Password: admin123 (CHANGE THIS IN PRODUCTION!)
-- Generate new hash at: https://bcrypt-generator.com/

INSERT INTO public.users (name, email, password_hash, role)
VALUES (
  'Admin User',
  'admin@tantechllc.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
