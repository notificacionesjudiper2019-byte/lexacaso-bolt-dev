ALTER TABLE public.case_documents
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.case_documents
  DROP CONSTRAINT IF EXISTS valid_review_status;

ALTER TABLE public.case_documents
  ADD CONSTRAINT valid_review_status
  CHECK (review_status IN ('pending', 'in_review', 'reviewed'));

CREATE INDEX IF NOT EXISTS idx_case_documents_case_review
  ON public.case_documents (case_id, review_status);