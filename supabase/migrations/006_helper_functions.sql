-- Migration 006: Helper functions and triggers
-- Run this after 005_seed_admin_user.sql

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for timesheets table
CREATE TRIGGER update_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get employee progress on a project
CREATE OR REPLACE FUNCTION get_employee_project_progress(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  progress_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(t.id) AS total_tasks,
    COUNT(tc.id) AS completed_tasks,
    CASE 
      WHEN COUNT(t.id) = 0 THEN 0
      ELSE ROUND((COUNT(tc.id)::NUMERIC / COUNT(t.id)::NUMERIC) * 100, 2)
    END AS progress_percentage
  FROM public.tasks t
  JOIN public.project_days pd ON pd.id = t.project_day_id
  LEFT JOIN public.task_completions tc ON tc.task_id = t.id AND tc.user_id = p_user_id
  WHERE pd.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if all required tasks for a day are completed
CREATE OR REPLACE FUNCTION are_all_required_tasks_completed(
  p_user_id UUID,
  p_project_day_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  required_count INT;
  completed_count INT;
BEGIN
  -- Count required tasks for the day
  SELECT COUNT(*) INTO required_count
  FROM public.tasks
  WHERE project_day_id = p_project_day_id AND is_required = TRUE;

  -- Count completed required tasks
  SELECT COUNT(*) INTO completed_count
  FROM public.tasks t
  JOIN public.task_completions tc ON tc.task_id = t.id
  WHERE t.project_day_id = p_project_day_id 
    AND t.is_required = TRUE
    AND tc.user_id = p_user_id;

  RETURN required_count = completed_count AND required_count > 0;
END;
$$ LANGUAGE plpgsql;
