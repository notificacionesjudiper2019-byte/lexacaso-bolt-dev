/*
# Create profiles table

## Purpose
Stores personal data for each authenticated user. A profile row is created
automatically when a user registers, seeded with the full_name from signup.

## New Tables
- `profiles`
  - `id` (uuid, primary key, FK to auth.users.id ON DELETE CASCADE)
  - `full_name` (text, not null) — user's full name
  - `cedula` (text, not null) — Colombian national ID
  - `phone` (text, not null) — Colombian mobile number
  - `address` (text, not null) — physical address
  - `email` (text, not null) — derived from auth.users.email at creation
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now(), auto-updated by trigger)

## Security
- RLS enabled on `profiles`.
- Four separate owner-scoped policies (SELECT / INSERT / UPDATE / DELETE),
  each checking `auth.uid() = id`.
- No cross-user or admin access.

## Automation
- Trigger `on_auth_user_created` fires after a new row is inserted into
  `auth.users`. It creates a matching `profiles` row with:
    - `full_name` from `raw_user_meta_data->>'full_name'`
    - `email` from `NEW.email`
    - `cedula`, `phone`, `address` left empty (user fills them later)
  - `cedula`, `phone`, `address` are NOT NULL but the trigger inserts
    placeholder empty strings so the row exists. The user completes them
    via the profile form. A CHECK constraint is NOT added yet to avoid
    blocking signup; validation happens in the frontend for now.

## Notes
1. The trigger function uses `SET search_path = public` per Supabase linter.
2. `email` is copied from `auth.users.email` at creation time. If the user
   changes their email in auth, the profile email will need a separate sync
   mechanism (future stage).
3. `updated_at` is maintained by a trigger.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  cedula      text NOT NULL DEFAULT '',
  phone       text NOT NULL DEFAULT '',
  address     text NOT NULL DEFAULT '',
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can only read their own profile
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- INSERT: a user can only insert their own profile (for trigger or manual)
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: a user can only update their own profile
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: a user can only delete their own profile
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- Index for faster owner-scoped queries
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
