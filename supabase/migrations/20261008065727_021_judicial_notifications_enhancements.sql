/*
# Judicial Notifications Enhancements

## Summary
Extends the existing `notifications` table to support judicial notification management:
- Adds columns for case number, court, filing date, attachment URL, and archive status
- Adds admin-only RLS policies for creating, editing, and deleting notifications
- Updates the client SELECT policy to filter by user_id (already enforced)
- Sets the admin role for notipersonales2026@gmail.com

## New Columns on `notifications`
1. `case_number` (text, nullable) — número de expediente judicial
2. `court` (text, nullable) — juzgado o despacho
3. `filing_date` (date, nullable) — fecha de radicación
4. `attachment_url` (text, nullable) — enlace de consulta o archivo adjunto
5. `archived` (boolean, NOT NULL, default false) — estado de archivado

## Security Changes
- Adds admin INSERT/UPDATE/DELETE policies on `notifications` (using is_admin())
- Client can already SELECT/UPDATE their own rows (is_read column)
- Client can now also UPDATE the `archived` column on their own rows

## Admin Role Assignment
- Sets role='admin' for notipersonales2026@gmail.com if a profile exists
*/

-- Add judicial notification columns
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS case_number text,
  ADD COLUMN IF NOT EXISTS court text,
  ADD COLUMN IF NOT EXISTS filing_date date,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Drop existing policies on notifications to rebuild cleanly
DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "insert_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_select_all_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_update_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_delete_notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;

-- Client: can SELECT their own notifications
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

-- Set admin role for the specified email if profile exists
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'notipersonales2026@gmail.com';
