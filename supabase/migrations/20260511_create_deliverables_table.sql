-- filepath: d:\tantech\ttproject\supabase\migrations\20260511_create_deliverables_table.sql
-- Create deliverables table for Work Deliverables feature

BEGIN;

CREATE TABLE public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' 
    CHECK (status IN ('in_progress', 'submitted', 'client_reviewed', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_deliverables_user_id ON public.deliverables(user_id);
CREATE INDEX idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX idx_deliverables_user_project ON public.deliverables(user_id, project_id);
CREATE INDEX idx_deliverables_date ON public.deliverables(date);
CREATE INDEX idx_deliverables_created_at ON public.deliverables(created_at);

-- Enable RLS
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read and write their own deliverables
CREATE POLICY "Users can read their own deliverables"
  ON public.deliverables
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deliverables"
  ON public.deliverables
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deliverables"
  ON public.deliverables
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deliverables"
  ON public.deliverables
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.deliverables IS 'Work deliverables logged by students for STEM OPT compliance. Proves work output on projects.';
COMMENT ON COLUMN public.deliverables.id IS 'Unique identifier (uuid)';
COMMENT ON COLUMN public.deliverables.user_id IS 'Employee who created the deliverable (references users.id)';
COMMENT ON COLUMN public.deliverables.project_id IS 'Project this deliverable belongs to (references projects.id)';
COMMENT ON COLUMN public.deliverables.date IS 'Date the work was completed (cannot be future date)';
COMMENT ON COLUMN public.deliverables.title IS 'Title of the deliverable (minimum 10 characters)';
COMMENT ON COLUMN public.deliverables.description IS 'Detailed description of what was built/produced (minimum 80 characters)';
COMMENT ON COLUMN public.deliverables.file_url IS 'Supabase Storage URL of uploaded file (PNG, JPG, PDF, DOCX, XLSX, ZIP, max 10MB)';
COMMENT ON COLUMN public.deliverables.file_name IS 'Original filename for display';
COMMENT ON COLUMN public.deliverables.external_link IS 'Optional URL to external work (Google Drive, Figma, deployed URL, etc)';
COMMENT ON COLUMN public.deliverables.status IS 'Status: in_progress, submitted, client_reviewed, completed';
COMMENT ON COLUMN public.deliverables.created_at IS 'When the deliverable was created (auto-set)';
COMMENT ON COLUMN public.deliverables.updated_at IS 'When the deliverable was last updated (auto-set)';

COMMIT;
