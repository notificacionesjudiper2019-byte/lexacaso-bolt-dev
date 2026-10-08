/*
# Create cases table

## Purpose
Stores legal cases belonging to authenticated users. Each case is strictly
owned by the user who created it and cannot be accessed by any other user.

## New Tables
- `cases`
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, not null, defaults to auth.uid(), FK to auth.users ON DELETE CASCADE)
  - `title` (text, not null) — short case title
  - `facts` (text, nullable) — free-text description of the facts
  - `status` (text, not null, default 'received') — workflow status
  - `priority` (text, not null, default 'normal') — priority level
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- RLS enabled on `cases`.
- Four separate owner-scoped policies (SELECT / INSERT / UPDATE / DELETE),
  each checking `auth.uid() = user_id`.
- No admin or cross-user access.

## Notes
1. `user_id` has `DEFAULT auth.uid()` so that frontend inserts which omit
   `user_id` are still accepted — the database fills it from the session.
2. The UPDATE policy's WITH CHECK matches the USING clause so a user cannot
   reassign a case to another user by changing `user_id`.
3. `updated_at` is maintained by a trigger that sets it to now() on every UPDATE.
*/

CREATE TABLE IF NOT EXISTS cases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  facts       text,
  status      text NOT NULL DEFAULT 'received',
  priority    text NOT NULL DEFAULT 'normal',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can only read their own cases
DROP POLICY IF EXISTS "select_own_cases" ON cases;
CREATE POLICY "select_own_cases"
  ON cases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: a user can only create cases for themselves
DROP POLICY IF EXISTS "insert_own_cases" ON cases;
CREATE POLICY "insert_own_cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: a user can only update their own cases and cannot reassign ownership
DROP POLICY IF EXISTS "update_own_cases" ON cases;
CREATE POLICY "update_own_cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: a user can only delete their own cases
DROP POLICY IF EXISTS "delete_own_cases" ON cases;
CREATE POLICY "delete_own_cases"
  ON cases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for faster owner-scoped queries
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);

-- Trigger to keep updated_at in sync
DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
DROP FUNCTION IF EXISTS set_cases_updated_at();

CREATE OR REPLACE FUNCTION set_cases_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION set_cases_updated_at();
