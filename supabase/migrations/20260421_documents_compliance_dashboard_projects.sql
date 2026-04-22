-- Employee document vault
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'passport_copy',
      'current_i20',
      'ead_card',
      'signed_i983',
      'dso_ack_email',
      'signed_offer_letter',
      'completed_i9',
      'everify_screenshot',
      'supervisor_ack'
    )
  ),
  file_url TEXT,
  uploaded_at TIMESTAMPTZ,
  expiry_date DATE,
  version_date DATE,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('uploaded', 'missing')),
  UNIQUE(employee_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id
  ON public.employee_documents(employee_id);

-- Project registry fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_code TEXT,
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_location TEXT,
  ADD COLUMN IF NOT EXISTS sow_reference TEXT,
  ADD COLUMN IF NOT EXISTS sow_status TEXT CHECK (sow_status IN ('Not Started', 'Sent to Client', 'Signed')),
  ADD COLUMN IF NOT EXISTS invoice_status TEXT CHECK (invoice_status IN ('Not Issued', 'Issued', 'Partial Payment', 'Fully Paid'));

-- Payment logs per project
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  inr_amount NUMERIC(12,2) NOT NULL,
  utr_reference TEXT NOT NULL,
  usd_equivalent NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'NEFT', 'Bank Transfer', 'Wire')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_project_id
  ON public.payment_logs(project_id);
