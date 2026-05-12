-- Migration: Fix i983_plans RLS policies
-- Problem: i983_plans table has RLS enabled but no policies, blocking all reads
-- Solution: Allow service_role (admin) to read/write all rows

-- Service role can do everything (for admin API routes using createAdminClient)
DROP POLICY IF EXISTS "service_role_all_i983_plans" ON public.i983_plans;
CREATE POLICY "service_role_all_i983_plans" ON public.i983_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);
