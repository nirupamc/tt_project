-- filepath: d:\tantech\ttproject\supabase\migrations\20260512_create_supervisor_checkins_table.sql
-- Create supervisor_checkins table for tracking supervisor check-ins and timesheet approvals
-- This enables supervisors to log check-ins and approve timesheets

BEGIN;

CREATE TABLE IF NOT EXISTS public.supervisor_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  note TEXT,
  timesheet_approved BOOLEAN DEFAULT FALSE,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one check-in per week per supervisor-employee pair
  CONSTRAINT unique_weekly_checkin UNIQUE(employee_id, supervisor_id, week_start_date)
);

-- Add indexes for common queries
CREATE INDEX idx_supervisor_checkins_employee_id ON public.supervisor_checkins(employee_id);
CREATE INDEX idx_supervisor_checkins_supervisor_id ON public.supervisor_checkins(supervisor_id);
CREATE INDEX idx_supervisor_checkins_week_start ON public.supervisor_checkins(week_start_date);

-- Add comments for documentation
COMMENT ON TABLE public.supervisor_checkins IS 'Track supervisor check-ins and timesheet approvals with employees';
COMMENT ON COLUMN public.supervisor_checkins.id IS 'Unique check-in identifier';
COMMENT ON COLUMN public.supervisor_checkins.employee_id IS 'Employee being checked in on (set by supervisor)';
COMMENT ON COLUMN public.supervisor_checkins.supervisor_id IS 'Supervisor performing check-in (set by supervisor)';
COMMENT ON COLUMN public.supervisor_checkins.checkin_date IS 'Date of the check-in (set by supervisor)';
COMMENT ON COLUMN public.supervisor_checkins.note IS 'Check-in notes from supervisor (set by supervisor)';
COMMENT ON COLUMN public.supervisor_checkins.timesheet_approved IS 'Whether supervisor approved employee''s timesheet (set by supervisor)';
COMMENT ON COLUMN public.supervisor_checkins.week_start_date IS 'Monday of the week being checked in (set by supervisor)';
COMMENT ON COLUMN public.supervisor_checkins.created_at IS 'Timestamp when check-in was created';

-- RLS: Employees can only read their own check-ins
ALTER TABLE public.supervisor_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_read_own_checkins" ON public.supervisor_checkins
  FOR SELECT
  USING (auth.uid() = employee_id);

-- RLS: Supervisors (admin role) can insert and update
CREATE POLICY "supervisors_insert_checkins" ON public.supervisor_checkins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "supervisors_update_checkins" ON public.supervisor_checkins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMIT;
