/*
# Create case_documents table

## Purpose
Stores metadata for files uploaded to the private `case-documents` storage
bucket. Each document is linked to a case and to the user who owns it.

## New Tables
- `case_documents`
  - `id` (uuid, primary key, auto-generated)
  - `case_id` (uuid, not null, FK to cases ON DELETE CASCADE)
  - `user_id` (uuid, not null, defaults to auth.uid(), FK to auth.users ON DELETE CASCADE)
  - `file_name` (text, not null) — original file name
  - `storage_path` (text, not null) — path within the storage bucket
  - `content_type` (text, nullable) — MIME type of the uploaded file
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on `case_documents`.
- Four separate owner-scoped policies (SELECT / INSERT / UPDATE / DELETE).
- Each policy verifies BOTH:
  a) `auth.uid() = user_id` — the document belongs to the requesting user
  b) The parent case also belongs to the requesting user (via EXISTS subquery)
- This double check prevents a user from creating a document under another
  user's case even if they somehow know the case_id.
- No admin or cross-user access.

## Notes
1. `user_id` has `DEFAULT auth.uid()` so frontend inserts that omit it are
   still accepted.
2. `case_id` FK uses `ON DELETE CASCADE` so when a case is deleted, its
   documents are removed automatically.
3. The actual file content lives in the `case-documents` storage bucket;
   this table only stores metadata.
*/

CREATE TABLE IF NOT EXISTS case_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  storage_path text NOT NULL,
  content_type text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can only read documents for their own cases
DROP POLICY IF EXISTS "select_own_documents" ON case_documents;
CREATE POLICY "select_own_documents"
  ON case_documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- INSERT: a user can only create documents for their own cases
DROP POLICY IF EXISTS "insert_own_documents" ON case_documents;
CREATE POLICY "insert_own_documents"
  ON case_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- UPDATE: a user can only update documents for their own cases
DROP POLICY IF EXISTS "update_own_documents" ON case_documents;
CREATE POLICY "update_own_documents"
  ON case_documents FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- DELETE: a user can only delete documents for their own cases
DROP POLICY IF EXISTS "delete_own_documents" ON case_documents;
CREATE POLICY "delete_own_documents"
  ON case_documents FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_documents.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_user_id ON case_documents(user_id);
