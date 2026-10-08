/*
# Email log table and admin CRUD RPC functions

## Purpose
1. Creates `email_log` table to track all notification emails sent to clients.
2. Adds `admin_delete_case` and `admin_delete_document` SECURITY DEFINER
   functions so admins can delete cases/documents without RLS blocking them.
3. Adds `admin_update_case` function for full case editing by admins.

## New Tables
- `email_log`
  - `id` (uuid, primary key)
  - `case_id` (uuid, nullable, FK to cases ON DELETE SET NULL)
  - `user_id` (uuid, nullable, FK to auth.users ON DELETE SET NULL)
  - `email_type` (text, not null) — e.g. 'case_filed', 'document_uploaded'
  - `recipient_email` (text, not null)
  - `subject` (text, not null)
  - `status` (text, not null, default 'sent') — 'sent' or 'failed'
  - `details` (jsonb, nullable) — summary of what was sent
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled on `email_log`.
- Admins (role='admin' in profiles) can read all rows.
- Users can read their own email logs.
- Admins can insert rows.

## New Functions
- `admin_delete_case(p_case_id uuid)` — deletes a case and its documents.
  Checks caller is admin via `is_admin()`.
- `admin_delete_document(p_document_id uuid)` — deletes a document record.
  Checks caller is admin.
- `admin_update_case(p_case_id uuid, p_updates jsonb)` — updates any
  column on cases. Checks caller is admin.

## Notes
1. All functions use SECURITY DEFINER with SET search_path = public.
2. REVOKE EXECUTE from anon on all functions.
3. No destructive operations on existing data — only new table and functions.
*/

CREATE TABLE IF NOT EXISTS email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid REFERENCES cases(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email_type      text NOT NULL,
  recipient_email text NOT NULL,
  subject         text NOT NULL,
  status          text NOT NULL DEFAULT 'sent',
  details         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_email_log_admin" ON email_log;
CREATE POLICY "select_email_log_admin"
  ON email_log FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "insert_email_log_admin" ON email_log;
CREATE POLICY "insert_email_log_admin"
  ON email_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_email_log_case_id ON email_log(case_id);
CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_delete_case(p_case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  DELETE FROM cases WHERE id = p_case_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_case FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_case TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_document(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  DELETE FROM case_documents WHERE id = p_document_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_document FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_document TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_case(p_case_id uuid, p_updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE cases SET
    title            = COALESCE(p_updates->>'title', title),
    facts            = COALESCE(NULLIF(p_updates->>'facts', ''), facts),
    case_number      = COALESCE(NULLIF(p_updates->>'case_number', ''), case_number),
    status           = COALESCE(NULLIF(p_updates->>'status', ''), status),
    authority_name   = COALESCE(NULLIF(p_updates->>'authority_name', ''), authority_name),
    legal_category   = COALESCE(NULLIF(p_updates->>'legal_category', ''), legal_category),
    legal_subcategory= COALESCE(NULLIF(p_updates->>'legal_subcategory', ''), legal_subcategory),
    department       = COALESCE(NULLIF(p_updates->>'department', ''), department),
    municipality     = COALESCE(NULLIF(p_updates->>'municipality', ''), municipality),
    entity           = COALESCE(NULLIF(p_updates->>'entity', ''), entity),
    dependency       = COALESCE(NULLIF(p_updates->>'dependency', ''), dependency),
    document_type_received = COALESCE(NULLIF(p_updates->>'document_type_received', ''), document_type_received),
    has_deadline     = COALESCE(NULLIF(p_updates->>'has_deadline', ''), has_deadline),
    term_duration    = COALESCE(NULLIF(p_updates->>'term_duration', ''), term_duration),
    term_start_date  = COALESCE(NULLIF(p_updates->>'term_start_date', '')::date, term_start_date),
    term_end_date    = COALESCE(NULLIF(p_updates->>'term_end_date', '')::date, term_end_date)
  WHERE id = p_case_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_case FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_case TO authenticated;
