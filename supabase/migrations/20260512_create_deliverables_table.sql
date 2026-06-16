-- Migration: Create deliverables table with RLS
-- This table stores work deliverables logged by employees for their projects

CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL CHECK (date <= CURRENT_DATE),
  title TEXT NOT NULL CHECK (length(title) >= 10),
  description TEXT NOT NULL CHECK (length(description) >= 80),
  file_url TEXT,
  file_name TEXT,
  external_link TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'client_reviewed', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, date, title)
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_deliverables_user_id ON public.deliverables(user_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_user_project ON public.deliverables(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_date ON public.deliverables(date DESC);
CREATE INDEX IF NOT EXISTS idx_deliverables_created_at ON public.deliverables(created_at DESC);

-- Enable RLS
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;




-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Users can create their own deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Users can update their own deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Users can delete their own deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Supervisors can view supervised employee deliverables" ON public.deliverables;

-- RLS Policy: Users can view their own deliverables
CREATE POLICY "Users can view their own deliverables"
  ON public.deliverables
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own deliverables
CREATE POLICY "Users can create their own deliverables"
  ON public.deliverables
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own deliverables
CREATE POLICY "Users can update their own deliverables"
  ON public.deliverables
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own deliverables
CREATE POLICY "Users can delete their own deliverables"
  ON public.deliverables
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: Supervisors can view deliverables from their supervised employees
CREATE POLICY "Supervisors can view supervised employee deliverables"
  ON public.deliverables
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE supervisor_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_deliverables_updated_at_trigger ON public.deliverables;
CREATE TRIGGER update_deliverables_updated_at_trigger
BEFORE UPDATE ON public.deliverables
FOR EACH ROW
EXECUTE FUNCTION public.update_deliverables_updated_at();
