-- Add joining_date column to users table
-- This is used to calculate tenure-based completed dummy projects
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS joining_date DATE;

-- Add comment explaining the field
COMMENT ON COLUMN public.users.joining_date IS 'Date when employee joined the company (payroll start date). Used to calculate tenure and show historical completed projects.';
