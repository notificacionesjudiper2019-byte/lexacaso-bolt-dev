/*
# Fix search_path on set_cases_updated_at function

## Purpose
Resolves the Supabase database linter warning about mutable search_path
on the `set_cases_updated_at()` trigger function.

## Changes
- Drops the trigger first (it depends on the function).
- Recreates `set_cases_updated_at()` with an explicit `search_path = public`.
- Re-creates the trigger.
*/

DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
DROP FUNCTION IF EXISTS public.set_cases_updated_at();

CREATE OR REPLACE FUNCTION public.set_cases_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cases_updated_at();
