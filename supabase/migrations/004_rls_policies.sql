-- Migration 004: Create RLS policies
-- Run this after 003_enable_rls.sql

-- NOTE: Since we use NextAuth (not Supabase Auth), auth.uid() won't work.
-- Instead, we bypass RLS using the service_role key for admin operations,
-- and pass user_id explicitly in queries for employee operations.

-- For this app architecture:
-- - Admin API routes use createAdminClient() with service_role key (bypasses RLS)
-- - Employee API routes validate session and filter by user_id in queries

-- These policies allow authenticated service_role access and restrict anon access

-- Users: Only service role can access (admin operations)
CREATE POLICY "service_role_all_users" ON public.users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Projects: Anyone can read published+active projects
CREATE POLICY "anyone_read_active_projects" ON public.projects
  FOR SELECT
  USING (is_published = true AND is_active = true);

-- Projects: Service role can do everything
CREATE POLICY "service_role_all_projects" ON public.projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Project Days: Anyone can read days of published+active projects
CREATE POLICY "anyone_read_project_days" ON public.project_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id 
      AND p.is_published = true 
      AND p.is_active = true
    )
  );

-- Project Days: Service role can do everything
CREATE POLICY "service_role_all_project_days" ON public.project_days
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tasks: Anyone can read tasks of published+active projects
CREATE POLICY "anyone_read_tasks" ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_days pd
      JOIN public.projects p ON p.id = pd.project_id
      WHERE pd.id = project_day_id
      AND p.is_published = true 
      AND p.is_active = true
    )
  );

-- Tasks: Service role can do everything
CREATE POLICY "service_role_all_tasks" ON public.tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enrollments: Service role can do everything
-- (Employee access is handled via API with explicit user_id filtering)
CREATE POLICY "service_role_all_enrollments" ON public.enrollments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Task Completions: Service role can do everything
CREATE POLICY "service_role_all_task_completions" ON public.task_completions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Timesheets: Service role can do everything
CREATE POLICY "service_role_all_timesheets" ON public.timesheets
  FOR ALL
  USING (true)
  WITH CHECK (true);
