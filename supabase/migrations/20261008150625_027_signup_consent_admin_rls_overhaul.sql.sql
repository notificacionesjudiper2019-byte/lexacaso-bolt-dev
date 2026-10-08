/*
# Signup consent columns, handle_new_user overhaul, and admin full-access RLS

## Purpose
1. Add `data_consent` (boolean) and `consent_date` (timestamptz) columns to `public.profiles` to store Ley 1581 consent audit markers at signup time.
2. Rewrite `handle_new_user()` trigger function so that:
   - The first registered account OR the email `notipersonales2026@gmail.com` gets role `admin` automatically.
   - All subsequent accounts get role `client`.
   - `full_name`, `cedula`, `phone`, `data_consent`, and `consent_date` are populated from `raw_user_meta_data` supplied at signUp time.
3. Overhaul RLS policies on `profiles`, `cases`, `notifications`, and `case_authorizations` so that admin role has unrestricted SELECT/INSERT/UPDATE/DELETE without requiring case_authorizations.

## Changes

### profiles table
- Added column: `data_consent` boolean NOT NULL DEFAULT false
- Added column: `consent_date` timestamptz DEFAULT NULL

### handle_new_user() function (SECURITY DEFINER)
- Reads `full_name`, `cedula`, `phone`, `data_consent`, `consent_date` from `new.raw_user_meta_data`
- Assigns `admin` role to first user or `notipersonales2026@gmail.com`, else `client`
- Uses ON CONFLICT (id) DO UPDATE to be idempotent

### RLS policy changes — admin gets full unrestricted access

#### profiles
- Admin SELECT: `is_admin()` (no authorization join required)
- Admin UPDATE: `is_admin()` (can update any profile)
- Admin INSERT: `is_admin()` (can insert profiles)
- Admin DELETE: `is_admin()` (can delete profiles)
- Owner policies remain: own SELECT, own UPDATE (non-sensitive columns), own DELETE

#### cases
- Admin SELECT: `is_admin()` (no case_authorizations join)
- Admin INSERT: `is_admin()`
- Admin UPDATE: `is_admin()`
- Admin DELETE: `is_admin()`
- Owner policies remain: own SELECT/INSERT/UPDATE/DELETE

#### notifications
- Admin already has full access via `is_admin()` — no change needed

#### case_authorizations
- Admin SELECT: `is_admin()` (can see all authorizations)
- Admin INSERT: `is_admin()`
- Admin UPDATE: `is_admin()`
- Admin DELETE: `is_admin()`
- Owner policies remain: case owner can manage authorizations for their cases

## Security notes
- `data_consent` and `consent_date` are informational audit columns. They are NOT used for authorization decisions.
- The `role` column remains protected: only `set_user_role()` (SECURITY DEFINER) can change it.
- Column-level grants on `profiles` are preserved: `authenticated` can only INSERT/UPDATE non-sensitive columns (full_name, cedula, phone, address, email). The `role` column is not writable by authenticated.
- `data_consent` and `consent_date` are added to the allowed INSERT/UPDATE column set so the trigger can set them.
*/

-- ============================================================================
-- 1. Add consent columns to profiles
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'data_consent') THEN
    ALTER TABLE public.profiles ADD COLUMN data_consent boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'consent_date') THEN
    ALTER TABLE public.profiles ADD COLUMN consent_date timestamptz;
  END IF;
END $$;

-- ============================================================================
-- 2. Rewrite handle_new_user() to include signup metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  v_role text;
  v_full_name text;
  v_cedula text;
  v_phone text;
  v_data_consent boolean;
  v_consent_date timestamptz;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  v_role := CASE
    WHEN LOWER(new.email) = 'notipersonales2026@gmail.com' OR user_count = 0 THEN 'admin'
    ELSE 'client'
  END;

  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.email, '');
  v_cedula := COALESCE(new.raw_user_meta_data->>'cedula', '');
  v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
  v_data_consent := COALESCE((new.raw_user_meta_data->>'data_consent')::boolean, false);
  v_consent_date := CASE
    WHEN v_data_consent THEN COALESCE(NULLIF(new.raw_user_meta_data->>'consent_date', '')::timestamptz, now())
    ELSE NULL
  END;

  INSERT INTO public.profiles (id, full_name, cedula, phone, email, role, admin_email, data_consent, consent_date)
  VALUES (
    new.id,
    v_full_name,
    v_cedula,
    v_phone,
    new.email,
    v_role,
    'notipersonales2026@gmail.com',
    v_data_consent,
    v_consent_date
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    cedula = COALESCE(NULLIF(EXCLUDED.cedula, ''), profiles.cedula),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    admin_email = COALESCE(profiles.admin_email, EXCLUDED.admin_email),
    data_consent = EXCLUDED.data_consent OR profiles.data_consent,
    consent_date = COALESCE(profiles.consent_date, EXCLUDED.consent_date);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- ============================================================================
-- 3. Column-level grants: allow authenticated to set data_consent and consent_date
-- ============================================================================
GRANT INSERT (data_consent, consent_date) ON public.profiles TO authenticated;
GRANT UPDATE (data_consent, consent_date) ON public.profiles TO authenticated;

-- ============================================================================
-- 4. RLS: profiles — admin full access, owner self-access
-- ============================================================================
DROP POLICY IF EXISTS "admin_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_view_authorized_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_profile_signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual insert during signup" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- Admin: full unrestricted access
CREATE POLICY "admin_select_all_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_all_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin_delete_profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (is_admin());

-- Owner: self-access (SELECT, UPDATE non-sensitive, DELETE)
CREATE POLICY "select_own_profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "delete_own_profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Allow signup insert (trigger handles the actual insert, but this covers direct client inserts)
CREATE POLICY "insert_own_profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 5. RLS: cases — admin full access without authorization requirement
-- ============================================================================
DROP POLICY IF EXISTS "select_own_cases" ON public.cases;
DROP POLICY IF EXISTS "insert_own_cases" ON public.cases;
DROP POLICY IF EXISTS "update_own_cases" ON public.cases;
DROP POLICY IF EXISTS "delete_own_cases" ON public.cases;

-- Admin: full unrestricted access
CREATE POLICY "admin_select_all_cases"
ON public.cases FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_cases"
ON public.cases FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_all_cases"
ON public.cases FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin_delete_cases"
ON public.cases FOR DELETE
TO authenticated
USING (is_admin());

-- Owner: self-access
CREATE POLICY "select_own_cases"
ON public.cases FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "insert_own_cases"
ON public.cases FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.data_consents dc WHERE dc.user_id = auth.uid() AND dc.policy_version = '1.0.0'));

CREATE POLICY "update_own_cases"
ON public.cases FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_cases"
ON public.cases FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- 6. RLS: case_authorizations — admin full access
-- ============================================================================
DROP POLICY IF EXISTS "select_case_authorizations" ON public.case_authorizations;
DROP POLICY IF EXISTS "insert_case_authorizations" ON public.case_authorizations;
DROP POLICY IF EXISTS "update_case_authorizations" ON public.case_authorizations;
DROP POLICY IF EXISTS "delete_case_authorizations" ON public.case_authorizations;

-- Admin: full access
CREATE POLICY "admin_select_authorizations"
ON public.case_authorizations FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "admin_insert_authorizations"
ON public.case_authorizations FOR INSERT
TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "admin_update_authorizations"
ON public.case_authorizations FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin_delete_authorizations"
ON public.case_authorizations FOR DELETE
TO authenticated
USING (is_admin());

-- Owner: manage authorizations for own cases
CREATE POLICY "owner_select_authorizations"
ON public.case_authorizations FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid()));

CREATE POLICY "owner_insert_authorizations"
ON public.case_authorizations FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid()));

CREATE POLICY "owner_update_authorizations"
ON public.case_authorizations FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid()));

CREATE POLICY "owner_delete_authorizations"
ON public.case_authorizations FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid()));

-- ============================================================================
-- 7. RLS: notifications — verify admin has full access (already exists, ensure DELETE+INSERT+UPDATE present)
-- ============================================================================
-- Notifications already have admin_select_all, admin_insert, admin_update, admin_delete policies.
-- No changes needed.
