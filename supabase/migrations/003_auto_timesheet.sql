-- 003_auto_timesheet.sql

-- Feature 1: mark auto-generated timesheets
ALTER TABLE IF EXISTS timesheets
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Feature 2: task completion tracking
ALTER TABLE IF EXISTS tasks
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by_auto BOOLEAN NOT NULL DEFAULT FALSE;

-- Feature 2: weekly summaries
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_start           DATE NOT NULL,
  week_end             DATE NOT NULL,
  total_hours          NUMERIC(5,2) NOT NULL DEFAULT 0,
  days_worked          INT NOT NULL DEFAULT 0,
  tasks_completed      INT NOT NULL DEFAULT 0,
  tasks_total          INT NOT NULL DEFAULT 0,
  project_progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, project_id, week_start)
);

-- Feature 3: notifications
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  metadata     JSONB,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature 3: zoom meetings log
CREATE TABLE IF NOT EXISTS zoom_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zoom_meeting_id BIGINT NOT NULL,
  topic           TEXT NOT NULL,
  join_url        TEXT NOT NULL,
  passcode        TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  duration_mins   INT NOT NULL DEFAULT 60,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature 3: link zoom meetings to projects
CREATE TABLE IF NOT EXISTS project_zoom_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zoom_meeting_id UUID NOT NULL REFERENCES zoom_meetings(id) ON DELETE CASCADE,
  meeting_date    DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_employee ON weekly_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week ON weekly_summaries(week_start);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id, is_read);
CREATE INDEX IF NOT EXISTS idx_zoom_meetings_date ON project_zoom_meetings(meeting_date);
