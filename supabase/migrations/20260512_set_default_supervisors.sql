-- Migration: Set default supervisor for all employees
-- Purpose: Assign Omar Ansari as default supervisor for all employees without a supervisor assigned

UPDATE public.users
SET 
  supervisor_name = 'Omar Ansari',
  supervisor_email = 'omaransari@tantech-llc.com'
WHERE 
  role = 'employee' 
  AND (supervisor_name IS NULL OR supervisor_name = '');
