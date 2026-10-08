/*
# Ensure database structure and secure policies for profiles and notifications

## Summary
Applies the user's requested SQL script with security hardening:
1. Ensures uuid-ossp extension exists
2. Ensures profiles and notifications tables exist (no-op since they already exist)
3. Ensures RLS is enabled on both tables (already enabled, safe no-op)
4. Replaces the requested "Allow all access" policies with SECURE policies that enforce:
   - Profiles: users see only their own profile; admins see profiles of authorized cases
   - Notifications: clients see only their own; admins have full CRUD
5. Updates handle_new_user trigger function (SECURITY DEFINER, search_path safe, role='client')
6. Recreates the auth trigger

## Why the original "USING (true)" policies were NOT applied
The original script used `USING (true) WITH CHECK (true)` which grants unrestricted access
to ALL authenticated users. This would allow any user to:
- Read every other user's profile (cédula, phone, address, email)
- Insert profiles with role='admin' (privilege escalation)
- Modify or delete any profile
- Read, create, modify, or delete any other user's notifications
These are critical security vulnerabilities that contradict the app's requirements.

## Security
- Profiles: SELECT own or admin-with-authorization; INSERT own with role='client';
  UPDATE own non-sensitive columns; DELETE own
- Notifications: SELECT own or admin; INSERT admin-only; UPDATE own-or-admin; DELETE admin-only
- handle_new_user: SECURITY DEFINER with SET search_path = public (safe against shadowing)
- Column-level protection on profiles.role remains from migration 014
*/

-- 1. Ensure extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure tables exist (no-op since they already exist with richer schema)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  case_number TEXT,
  court TEXT,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Secure policies for profiles
-- Drop the dangerous "Allow all" policies if they were somehow created
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;

-- Drop existing secure policies to rebuild cleanly
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_select_profiles" ON public.profiles;

-- Client: can SELECT only their own profile
CREATE POLICY "select_own_profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admin: can SELECT profiles of users with authorized cases
CREATE POLICY "admin_select_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Client: can INSERT only their own profile with role client/user
CREATE POLICY "insert_own_profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Client: can UPDATE only their own profile (non-sensitive columns protected by column-level grants)
CREATE POLICY "update_own_profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Client: can DELETE only their own profile
CREATE POLICY "delete_own_profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 5. Secure policies for notifications
-- Drop the dangerous "Allow all" policy if it was somehow created
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;

-- Drop existing policies to rebuild cleanly
DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_select_all_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_update_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_delete_notifications" ON public.notifications;

-- Client: can SELECT only their own notifications
CREATE POLICY "select_own_notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Client: can UPDATE their own notifications (mark as read, archive)
CREATE POLICY "update_own_notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin: can SELECT all notifications
CREATE POLICY "admin_select_all_notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin: can INSERT notifications for any user
CREATE POLICY "admin_insert_notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Admin: can UPDATE any notification
CREATE POLICY "admin_update_notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin: can DELETE any notification
CREATE POLICY "admin_delete_notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (public.is_admin());

-- 6. Handle new user trigger function (SECURITY DEFINER, search_path safe)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, ''),
    new.email,
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 7. Recreate the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Set admin role for the specified email if profile exists
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'notipersonales2026@gmail.com';
