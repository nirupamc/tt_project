-- 004_auto_timesheet_backfill.sql
-- Backfill approvals for all past weeks

-- Insert approvals for all past weeks that have entries but no approval
INSERT INTO timesheet_approvals (
  id,
  employee_id,
  week_start_date,
  approved_by,
  approved_by_name,
  approved_at
)
SELECT
  gen_random_uuid(),
  t.user_id AS employee_id,
  date_trunc('week', t.work_date)::date AS week_start_date,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1) AS approved_by,
  (SELECT name FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1) AS approved_by_name,
  now() AS approved_at
FROM timesheets t
WHERE
  -- Only past weeks, not the current week
  date_trunc('week', t.work_date)::date < date_trunc('week', CURRENT_DATE)::date
  -- Only where no approval already exists for this employee + week combination
  AND NOT EXISTS (
    SELECT 1
    FROM timesheet_approvals ta
    WHERE ta.employee_id = t.user_id
      AND ta.week_start_date = date_trunc('week', t.work_date)::date
  )
GROUP BY
  t.user_id,
  date_trunc('week', t.work_date)::date;
