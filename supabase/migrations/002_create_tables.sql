-- Migration 002: Create all tables
-- Run this after 001_enable_extensions.sql

-- Users table (mirrors NextAuth users, extended with role)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
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
CREATE TABLE public.project_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  title TEXT,
  UNIQUE(project_id, day_number)
);

-- Tasks (belong to a project day)
CREATE TABLE public.tasks (
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
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Task completions (tracks when an employee completes a task)
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_day_id UUID REFERENCES public.project_days(id),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  submission_data JSONB, -- stores quiz answers, code submission, etc.
  UNIQUE(user_id, task_id)
);

-- Timesheets (one row per user per day, hours auto-set to 5 on task completion)
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_logged NUMERIC(4,2) DEFAULT 0,
  project_id UUID REFERENCES public.projects(id),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date, project_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_project_days_project_id ON public.project_days(project_id);
CREATE INDEX idx_tasks_project_day_id ON public.tasks(project_day_id);
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_project_id ON public.enrollments(project_id);
CREATE INDEX idx_task_completions_user_id ON public.task_completions(user_id);
CREATE INDEX idx_task_completions_task_id ON public.task_completions(task_id);
CREATE INDEX idx_timesheets_user_id ON public.timesheets(user_id);
CREATE INDEX idx_timesheets_work_date ON public.timesheets(work_date);
