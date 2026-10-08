/*
# Make handle_new_user trigger fault-tolerant

1. Purpose
   - Wrap the profile INSERT in an EXCEPTION block so that any failure in creating
     the profile row does NOT block user creation in auth.users.
   - Improve full_name fallback: use email as name if full_name metadata is absent.

2. Changes
   - `public.handle_new_user()`: added EXCEPTION WHEN OTHERS THEN RETURN new;
   - `public.profiles`: re-ensure INSERT policy "Allow individual insert during signup".

3. Security
   - All new users still get role = 'client'. No auto-admin escalation.
   - SECURITY DEFINER with search_path = 'public' preserved.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP POLICY IF EXISTS "Allow individual insert during signup" ON public.profiles;
CREATE POLICY "Allow individual insert during signup"
  ON public.profiles FOR INSERT
  WITH CHECK (true);
