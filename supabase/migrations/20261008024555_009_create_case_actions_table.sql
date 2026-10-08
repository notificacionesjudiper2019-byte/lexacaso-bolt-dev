/*
# Create case_actions table — followup/gestión tracking

## Purpose
Records each gestión (action/followup) performed on a case, with type,
date, description, status, and visibility control. This is the backbone
of the "Seguimiento de mi caso" module.

## New Table: case_actions
- id: uuid PK
- case_id: uuid FK → cases(id) ON DELETE CASCADE
- created_by: uuid — who performed the action (admin user id)
- action_type: text — e.g. "Demanda presentada", "Audiencia", "Notificación", etc.
- title: text — short title of the action
- description: text — detailed description
- action_date: date — when the action occurred
- status: text — 'pending'|'in_progress'|'completed'|'received'|'replied'|'expired'|'finalized'|'cancelled'
- visible_to_client: boolean DEFAULT true — whether the client can see this acción
- created_at: timestamptz DEFAULT now()
- updated_at: timestamptz DEFAULT now()

## Security
- RLS enabled.
- Client (authenticated) can SELECT only actions where:
  1. visible_to_client = true
  2. The case belongs to them (cases.user_id = auth.uid())
- Client cannot INSERT/UPDATE/DELETE — admin only (future admin role).
- For now, INSERT/UPDATE/DELETE scoped to case owner (auth.uid() = cases.user_id)
  so the owner can add their own followups until admin panel is built.
*/

CREATE TABLE IF NOT EXISTS case_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  action_type text NOT NULL,
  title text NOT NULL,
  description text,
  action_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  visible_to_client boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE case_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_case_actions_case_id ON case_actions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_actions_action_date ON case_actions(action_date);

-- Client: SELECT only visible actions on own cases
DROP POLICY IF EXISTS "select_visible_own_actions" ON case_actions;
CREATE POLICY "select_visible_own_actions"
ON case_actions FOR SELECT
TO authenticated
USING (
  visible_to_client = true
  AND EXISTS (SELECT 1 FROM cases WHERE cases.id = case_actions.case_id AND cases.user_id = auth.uid())
);

-- Owner can insert actions on their own cases
DROP POLICY IF EXISTS "insert_own_actions" ON case_actions;
CREATE POLICY "insert_own_actions"
ON case_actions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_actions.case_id AND cases.user_id = auth.uid())
);

-- Owner can update actions on their own cases
DROP POLICY IF EXISTS "update_own_actions" ON case_actions;
CREATE POLICY "update_own_actions"
ON case_actions FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_actions.case_id AND cases.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_actions.case_id AND cases.user_id = auth.uid())
);

-- Owner can delete actions on their own cases
DROP POLICY IF EXISTS "delete_own_actions" ON case_actions;
CREATE POLICY "delete_own_actions"
ON case_actions FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM cases WHERE cases.id = case_actions.case_id AND cases.user_id = auth.uid())
);
