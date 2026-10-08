/*
# Create private storage bucket case-documents

## Purpose
Creates a private storage bucket for legal case documents and defines storage
policies that restrict every user to their own folder.

## Storage Bucket
- `case-documents` — private (not public)
- File structure: `{user_id}/{case_id}/{file_name}`

## Storage Policies (4 separate policies)
1. SELECT — a user can read files only within their own folder prefix
2. INSERT — a user can upload files only within their own folder prefix
3. UPDATE — a user can replace files only within their own folder prefix
4. DELETE — a user can delete files only within their own folder prefix

Each policy checks that the storage object path starts with the authenticated
user's ID followed by a slash. This ensures a user can never access another
user's files.

## Notes
1. The bucket is private, so anonymous access is blocked by default.
2. Storage policies check `(storage.foldername(name))[1]` to extract the
   first path segment (the user_id) and compare it to `auth.uid()::text`.
3. All four policies are scoped to `TO authenticated` only — no anon access.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', false)
ON CONFLICT (id) DO NOTHING;

-- SELECT: read only own folder
DROP POLICY IF EXISTS "read_own_case_documents" ON storage.objects;
CREATE POLICY "read_own_case_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT: upload only to own folder
DROP POLICY IF EXISTS "insert_own_case_documents" ON storage.objects;
CREATE POLICY "insert_own_case_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: replace only in own folder
DROP POLICY IF EXISTS "update_own_case_documents" ON storage.objects;
CREATE POLICY "update_own_case_documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: delete only from own folder
DROP POLICY IF EXISTS "delete_own_case_documents" ON storage.objects;
CREATE POLICY "delete_own_case_documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
