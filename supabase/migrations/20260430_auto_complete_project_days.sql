-- Migration: Auto-Complete Project Days Feature
-- Creates per-enrollment day completion tracking to avoid shared state issues

-- Create junction table for per-enrollment project day completions
-- This allows each employee to have independent day completion status
-- even when multiple employees are enrolled in the same project
CREATE TABLE IF NOT EXISTS public.enrollment_day_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  project_day_id UUID NOT NULL REFERENCES public.project_days(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by_auto BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(enrollment_id, project_day_id)
);

-- Add completion tracking columns to enrollments
ALTER TABLE public.enrollments
ADD COLUMN IF NOT EXISTS completed_days INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_auto_completed_at TIMESTAMPTZ;

-- Add task completion status and auto-completion tracking
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by_auto BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollment_day_completions_enrollment_id 
  ON public.enrollment_day_completions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_day_completions_project_day_id 
  ON public.enrollment_day_completions(project_day_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status 
  ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_day_id 
  ON public.tasks(project_day_id);

-- Add comments for documentation
COMMENT ON TABLE public.enrollment_day_completions IS 'Tracks which project days have been auto-completed for each enrollment, independent of other enrollments';
COMMENT ON COLUMN public.enrollments.completed_days IS 'Count of project days auto-completed for this enrollment (updated by cron job)';
COMMENT ON COLUMN public.enrollments.last_auto_completed_at IS 'Timestamp of last auto-completion batch for this enrollment';
COMMENT ON COLUMN public.tasks.status IS 'Task status: pending, in_progress, or completed';
COMMENT ON COLUMN public.tasks.completed_by_auto IS 'TRUE if task was auto-completed by cron job (not manually by employee)';
