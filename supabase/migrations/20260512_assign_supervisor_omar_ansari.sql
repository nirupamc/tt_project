-- Migration: Assign Omar Ansari as supervisor for all employees
-- This migration:
-- 1. Creates/updates Omar Ansari as a supervisor user (if not exists)
-- 2. Assigns him as the supervisor for all employees

-- First, ensure Omar Ansari exists in the users table
INSERT INTO public.users (name, email, password_hash, role, job_title)
VALUES (
  'Omar Ansari',
  'omaransari@tantech-llc.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- bcrypt hash of "admin123"
  'supervisor',
  'Supervisor'
)
ON CONFLICT (email) DO UPDATE SET
  name = 'Omar Ansari',
  role = 'supervisor',
  job_title = 'Supervisor';

-- Get Omar Ansari's ID and assign him as supervisor for all employees
WITH omar AS (
  SELECT id FROM public.users WHERE email = 'omaransari@tantech-llc.com'
)
UPDATE public.users
SET supervisor_id = (SELECT id FROM omar)
WHERE role = 'employee' AND supervisor_id IS NULL;

-- Also update admin user's supervisor_id to point to Omar
WITH omar AS (
  SELECT id FROM public.users WHERE email = 'omaransari@tantech-llc.com'
)
UPDATE public.users
SET supervisor_id = (SELECT id FROM omar)
WHERE email = 'admin@tantechllc.com' AND supervisor_id IS NULL;
