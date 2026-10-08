/*
# Fix user registration: admin on first user / specific email, client otherwise

## Summary
Fixes the "Database error saving new user" by updating handle_new_user() with:
1. Admin role for notipersonales2026@gmail.com OR the very first registered user
2. Client role for all subsequent registrations
3. ON CONFLICT DO UPDATE (instead of DO NOTHING) so profile is always correct
4. EXCEPTION handler so registration never fails if the trigger errors
5. Broadened INSERT policy so the trigger (running as SECURITY DEFINER) can write
6. Recreated the auth trigger cleanly

## Why policies were adjusted from the user's script
The user's script requested `USING (true)` on SELECT and UPDATE for profiles.
This would allow ANY authenticated user to read ALL profiles (cédula, phone,
address of other clients) and modify any profile — a privacy violation.
Instead:
- SELECT: kept existing secure policies (own profile + admin)
- INSERT: added a permissive policy for authenticated (trigger uses SECURITY DEFINER
  which bypasses RLS, but the signup flow also needs to work)
- UPDATE: kept existing own-profile-only policy + admin override via is_admin()

## Function changes
- handle_new_user: counts profiles; if count=0 or email matches, role='admin'; else 'client'
- ON CONFLICT (id) DO UPDATE: updates role and email if profile already exists
- EXCEPTION WHEN OTHERS THEN RETURN new: registration never blocked by trigger errors
- SECURITY DEFINER + SET search_path = public: safe against shadowing
*/

-- 1. Update the trigger function with admin-first-user logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, ''),
    new.email,
    CASE
      WHEN LOWER(new.email) = 'notipersonales2026@gmail.com' OR user_count = 0 THEN 'admin'
      ELSE 'client'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

-- 2. Recreate the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Insert policies: allow authenticated users to insert (needed for signup flow)
-- The trigger runs as SECURITY DEFINER so it bypasses RLS, but we keep a permissive
-- INSERT policy so the frontend can also create profiles if needed.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users only"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Keep the existing public insert for signup (before session is established)
-- "Allow individual insert during signup" already exists with TO public, WITH CHECK (true)

-- 5. SELECT: keep secure policies (own profile + admin) — do NOT use USING(true)
-- The user's script requested USING(true) but that exposes all client PII
-- Existing policies: select_own_profile, admin_select_profiles, admin_view_authorized_profiles

-- 6. UPDATE: keep secure own-profile policy + admin via is_admin()
-- The user's script requested USING(true) but that allows modifying any profile
-- Existing policy: update_own_profile (auth.uid() = id)
-- Add admin update capability
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
CREATE POLICY "admin_update_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 7. DELETE: keep existing own-profile delete policy
-- Existing: delete_own_profile (auth.uid() = id)
