-- Notifications for in-app alert center
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('ead_expiry', 'i983_due', 'timesheet_missing', 'approval_pending')
  ),
  related_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications(recipient_user_id, is_read);

-- Sent-alert log for deduplication
CREATE TABLE IF NOT EXISTS public.sent_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (
    alert_type IN ('ead_expiry', 'i983_due', 'timesheet_missing', 'approval_pending')
  ),
  sent_date DATE NOT NULL,
  week_start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sent_alerts_employee_type_date
  ON public.sent_alerts(employee_id, alert_type, sent_date);

CREATE INDEX IF NOT EXISTS idx_sent_alerts_employee_type_week
  ON public.sent_alerts(employee_id, alert_type, week_start_date);
