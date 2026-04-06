-- Add hours_per_day and hourly_rate to users table
ALTER TABLE public.users 
ADD COLUMN hours_per_day NUMERIC(4,2) DEFAULT 8.00,
ADD COLUMN hourly_rate NUMERIC(8,2) DEFAULT 0.00;

-- Add start_date to enrollments table
ALTER TABLE public.enrollments
ADD COLUMN start_date DATE;

-- Update existing enrollments to use project start_date if available
UPDATE public.enrollments e
SET start_date = p.start_date
FROM public.projects p
WHERE e.project_id = p.id AND p.start_date IS NOT NULL;

-- For enrollments without a start date, set to enrolled_at date
UPDATE public.enrollments
SET start_date = enrolled_at::date
WHERE start_date IS NULL;

COMMENT ON COLUMN public.users.hours_per_day IS 'Daily work hours for this employee (used for timesheet auto-logging)';
COMMENT ON COLUMN public.users.hourly_rate IS 'Hourly rate for this employee (for admin reference only)';
COMMENT ON COLUMN public.enrollments.start_date IS 'Project start date for this specific employee enrollment';
