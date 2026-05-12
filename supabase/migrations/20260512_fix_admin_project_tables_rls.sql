-- Migration: Fix admin project detail endpoint RLS policies
-- Problem: enrollments, project_days, payment_logs, and tasks tables may not have proper RLS policies
-- Solution: Ensure all tables have service_role policies to allow admin access

-- Enrollments: Service role can do everything
DROP POLICY IF EXISTS "service_role_all_enrollments" ON public.enrollments;
CREATE POLICY "service_role_all_enrollments" ON public.enrollments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Project Days: Service role can do everything
DROP POLICY IF EXISTS "service_role_all_project_days" ON public.project_days;
CREATE POLICY "service_role_all_project_days" ON public.project_days
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tasks: Service role can do everything
DROP POLICY IF EXISTS "service_role_all_tasks" ON public.tasks;
CREATE POLICY "service_role_all_tasks" ON public.tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Payment Logs: Service role can do everything (if table has RLS enabled)
DROP POLICY IF EXISTS "service_role_all_payment_logs" ON public.payment_logs;
CREATE POLICY "service_role_all_payment_logs" ON public.payment_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
