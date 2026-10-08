/*
# Fix handle_new_user trigger and signup insert policy

1. Purpose
   - Update the `handle_new_user()` trigger function to explicitly set `role = 'client'` for every new user.
   - The previous version of the function did not set `role`, relying on the column default ('user').
   - The new version explicitly inserts 'client' and uses ON CONFLICT DO NOTHING for idempotency.
   - Ensure an INSERT policy exists on `profiles` so the trigger can insert rows during signup.

2. Changes
   - `public.handle_new_user()`: rewritten to include `role` column with value 'client'.
   - `public.profiles`: INSERT policy "Allow individual insert during signup" added (WITH CHECK true).

3. Security
   - No user is auto-promoted to admin. All new users get role 'client'.
   - The INSERT policy is required for the SECURITY DEFINER trigger to work during signup.
   - Admin promotion must be done manually per-account after registration.

4. Admin promotion (no-op if account does not exist yet)
   - Attempts to set role = 'admin' for notipersonales2026@gmail.com.
   - If the account is not yet registered, this UPDATE affects 0 rows (safe no-op).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP POLICY IF EXISTS "Allow individual insert during signup" ON public.profiles;
CREATE POLICY "Allow individual insert during signup"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'notipersonales2026@gmail.com';
