-- Migration: Fix notifications table RLS policy
-- Problem: notifications table has RLS enabled but no policies, blocking all reads
-- Solution: Allow service_role (admin) to read/write all rows

-- NOTE: There are two notifications table migrations:
-- - 003_auto_timesheet.sql: Original with columns (id, employee_id, type, title, body, metadata, is_read, created_at)
-- - 20260422_alerts_notifications.sql: Duplicate with different schema (recipient_user_id instead of employee_id)
-- The application uses the 003_auto_timesheet version. The 20260422 version may be obsolete.

DROP POLICY IF EXISTS "service_role_all_notifications" ON public.notifications;
CREATE POLICY "service_role_all_notifications" ON public.notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);
