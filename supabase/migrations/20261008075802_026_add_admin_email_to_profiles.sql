/*
# Add admin_email column to profiles

## Summary
Adds an `admin_email` column to the `profiles` table, defaulting to 'notipersonales2026@gmail.com'.
This links each client to the administrator who will receive notifications about their activity.

## Changes
1. New column: `profiles.admin_email` (text, default 'notipersonales2026@gmail.com')
2. Updated `handle_new_user` trigger to populate `admin_email` on new signups
3. Backfill existing rows with the default admin email
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_email text DEFAULT 'notipersonales2026@gmail.com';

UPDATE public.profiles SET admin_email = 'notipersonales2026@gmail.com' WHERE admin_email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  INSERT INTO public.profiles (id, full_name, email, role, admin_email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, ''),
    new.email,
    CASE
      WHEN LOWER(new.email) = 'notipersonales2026@gmail.com' OR user_count = 0 THEN 'admin'
      ELSE 'client'
    END,
    'notipersonales2026@gmail.com'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    admin_email = COALESCE(profiles.admin_email, EXCLUDED.admin_email);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;
