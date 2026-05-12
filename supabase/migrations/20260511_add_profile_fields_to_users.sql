-- Add profile fields to users table for STEM OPT compliance
-- This migration adds all fields needed for the My Profile page

BEGIN;

-- Personal & Employment Info
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS employee_id TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS hours_per_week INTEGER,
ADD COLUMN IF NOT EXISTS pay_rate TEXT,
ADD COLUMN IF NOT EXISTS work_location TEXT,
ADD COLUMN IF NOT EXISTS supervisor_name TEXT,
ADD COLUMN IF NOT EXISTS supervisor_email TEXT;

-- Visa & Immigration Info
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS opt_type TEXT, -- Values: 'OPT' or 'STEM OPT'
ADD COLUMN IF NOT EXISTS ead_start_date DATE,
ADD COLUMN IF NOT EXISTS ead_end_date DATE,
ADD COLUMN IF NOT EXISTS everify_status TEXT,
ADD COLUMN IF NOT EXISTS dso_name TEXT,
ADD COLUMN IF NOT EXISTS dso_email TEXT;

-- Education Info (student-editable)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS degree_field TEXT,
ADD COLUMN IF NOT EXISTS graduation_year INTEGER;

-- Contact & Links (student-editable)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS personal_email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.users.employee_id IS 'Unique employee identifier (set by admin)';
COMMENT ON COLUMN public.users.job_title IS 'Job title/role (set by admin)';
COMMENT ON COLUMN public.users.department IS 'Department or team (set by admin)';
COMMENT ON COLUMN public.users.start_date IS 'Employment start date (set by admin)';
COMMENT ON COLUMN public.users.hours_per_week IS 'Expected weekly hours (set by admin)';
COMMENT ON COLUMN public.users.pay_rate IS 'Hourly or salary rate (set by admin)';
COMMENT ON COLUMN public.users.work_location IS 'Work location/office (set by admin)';
COMMENT ON COLUMN public.users.supervisor_name IS 'Direct supervisor name (set by admin)';
COMMENT ON COLUMN public.users.supervisor_email IS 'Direct supervisor email (set by admin)';
COMMENT ON COLUMN public.users.opt_type IS 'Type of work authorization: OPT or STEM OPT (set by admin)';
COMMENT ON COLUMN public.users.ead_start_date IS 'EAD card start date (set by admin)';
COMMENT ON COLUMN public.users.ead_end_date IS 'EAD card expiration date (set by admin) - critical for compliance';
COMMENT ON COLUMN public.users.everify_status IS 'E-Verify employment authorization status (set by admin)';
COMMENT ON COLUMN public.users.dso_name IS 'Designated School Official name (set by admin)';
COMMENT ON COLUMN public.users.dso_email IS 'Designated School Official email (set by admin)';
COMMENT ON COLUMN public.users.degree_field IS 'STEM degree field per I-20 (student-editable)';
COMMENT ON COLUMN public.users.graduation_year IS 'Year of graduation (student-editable)';
COMMENT ON COLUMN public.users.personal_email IS 'Personal email address (student-editable)';
COMMENT ON COLUMN public.users.phone_number IS 'Phone number (student-editable)';
COMMENT ON COLUMN public.users.linkedin_url IS 'LinkedIn profile URL (student-editable)';
COMMENT ON COLUMN public.users.portfolio_url IS 'Portfolio or website URL (student-editable)';

COMMIT;
