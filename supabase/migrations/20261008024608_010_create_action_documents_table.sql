/*
# Create action_documents table — documents attached to gestiones

## Purpose
Links documents (stored in case-documents bucket) to specific case_actions (gestiones).
Supports the "Seguimiento" timeline where each gestión can have associated documents.
Documents have visible_to_client to control client access — internal documents
are never exposed to the client through RLS.

## New Table: action_documents
- id: uuid PK
- action_id: uuid FK → case_actions(id) ON DELETE CASCADE
- case_id: uuid FK → cases(id) — for direct case-level queries
- user_id: uuid — who uploaded (defaults to auth.uid())
- file_name: text
- storage_path: text — path in case-documents bucket
- content_type: text — MIME type
- visible_to_client: boolean NOT NULL DEFAULT false — internal by default for safety
- created_at: timestamptz DEFAULT now()

## Security
- RLS enabled.
- Client (authenticated) can SELECT only documents where:
  1. visible_to_client = true
  2. The parent action is visible_to_client = true
  3. The case belongs to them (cases.user_id = auth.uid())
- INSERT/UPDATE/DELETE scoped to case owner.
- Default visible_to_client = false for safety — admin must explicitly mark visible.
*/

CREATE TABLE IF NOT EXISTS action_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES case_actions(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  content_type text,
  visible_to_client boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE action_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_action_documents_action_id ON action_documents(action_id);
CREATE INDEX IF NOT EXISTS idx_action_documents_case_id ON action_documents(case_id);

-- Client: SELECT only visible documents of visible actions on own cases
DROP POLICY IF EXISTS "select_visible_own_action_docs" ON action_documents;
CREATE POLICY "select_visible_own_action_docs"
ON action_documents FOR SELECT
TO authenticated
USING (
  visible_to_client = true
  AND EXISTS (
    SELECT 1 FROM case_actions
    WHERE case_actions.id = action_documents.action_id
      AND case_actions.visible_to_client = true
      AND EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = case_actions.case_id
          AND cases.user_id = auth.uid()
      )
  )
);

-- Owner can insert documents for actions on their own cases
DROP POLICY IF EXISTS "insert_own_action_docs" ON action_documents;
CREATE POLICY "insert_own_action_docs"
ON action_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = action_documents.case_id
      AND cases.user_id = auth.uid()
  )
);

-- Owner can update documents for actions on their own cases
DROP POLICY IF EXISTS "update_own_action_docs" ON action_documents;
CREATE POLICY "update_own_action_docs"
ON action_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = action_documents.case_id
      AND cases.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = action_documents.case_id
      AND cases.user_id = auth.uid()
  )
);

-- Owner can delete documents for actions on their own cases
DROP POLICY IF EXISTS "delete_own_action_docs" ON action_documents;
CREATE POLICY "delete_own_action_docs"
ON action_documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = action_documents.case_id
      AND cases.user_id = auth.uid()
  )
);
