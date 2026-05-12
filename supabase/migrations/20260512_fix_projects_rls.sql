-- Migration: Fix projects RLS policies
-- Problem: projects table RLS policy may not be properly allowing service_role access
-- Solution: Ensure service_role_all_projects policy exists and is correctly configured

-- Drop and recreate to ensure it's correct
DROP POLICY IF EXISTS "service_role_all_projects" ON public.projects;
CREATE POLICY "service_role_all_projects" ON public.projects
  FOR ALL
  USING (true)
  WITH CHECK (true);
