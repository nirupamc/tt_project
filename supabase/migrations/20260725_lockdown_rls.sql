-- Lock the database down so only the service role can access it.
--
-- Background: the app talks to Supabase exclusively through
-- createAdminClient() (service_role key, which BYPASSES RLS entirely).
-- The anon key is never used by the app, but it is a public credential —
-- and the old "service_role_all_*" policies were created with no TO
-- clause, so they applied to EVERY role including anon. That meant anyone
-- with the project URL + anon key could read/update/delete all rows
-- (users incl. password_hash, timesheets, enrollments, ...).
--
-- Fix: drop the permissive policies (service_role needs none), enable RLS
-- on the tables that never had it, and revoke direct table privileges
-- from anon/authenticated.

-- 1. Drop the misconfigured policies. service_role bypasses RLS, so no
--    replacement policy is needed.
DROP POLICY IF EXISTS "service_role_all_users" ON public.users;
DROP POLICY IF EXISTS "service_role_all_projects" ON public.projects;
DROP POLICY IF EXISTS "service_role_all_project_days" ON public.project_days;
DROP POLICY IF EXISTS "service_role_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "service_role_all_enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "service_role_all_task_completions" ON public.task_completions;
DROP POLICY IF EXISTS "service_role_all_timesheets" ON public.timesheets;

-- Anonymous read of course content isn't used by the app either.
DROP POLICY IF EXISTS "anyone_read_active_projects" ON public.projects;
DROP POLICY IF EXISTS "anyone_read_project_days" ON public.project_days;
DROP POLICY IF EXISTS "anyone_read_tasks" ON public.tasks;

-- 2. Enable RLS everywhere (idempotent for tables that already have it;
--    the tables from 003_auto_timesheet / 20260421 / 20260422 / 20260430
--    never had it enabled at all).
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.i983_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_day_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- 3. Belt and braces: no direct table access for public keys at all.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
