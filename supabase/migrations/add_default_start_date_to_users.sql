-- Add default_start_date to users table
ALTER TABLE public.users 
ADD COLUMN default_start_date DATE;

COMMENT ON COLUMN public.users.default_start_date IS 'Default project start date for this employee (used when assigning to projects)';
