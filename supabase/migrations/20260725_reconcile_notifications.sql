-- Reconcile the two conflicting `notifications` schemas.
--
-- 003_auto_timesheet.sql created notifications(employee_id, title, body,
-- metadata) first, so 20260422_alerts_notifications.sql's CREATE TABLE IF
-- NOT EXISTS (recipient_user_id, message, type, related_url) silently
-- no-oped. Every live writer (lib/alerts.ts, admin notification routes)
-- uses the newer shape, so their inserts/selects have been failing with
-- "column does not exist" while the employee routes read the old shape.
--
-- Converge on the newer shape. Defensive: handles either starting state.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications'
      AND column_name = 'employee_id'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN employee_id TO recipient_user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications'
      AND column_name = 'message'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN message TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications'
      AND column_name = 'related_url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN related_url TEXT;
  END IF;

  -- Backfill message from the old title/body columns if they exist.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications'
      AND column_name = 'title'
  ) THEN
    UPDATE public.notifications
    SET message = NULLIF(concat_ws(': ', title, body), '')
    WHERE message IS NULL;
    -- title/body/metadata are left in place so no data is lost; safe to
    -- drop once everything is confirmed working on the new shape.
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications(recipient_user_id, is_read);
