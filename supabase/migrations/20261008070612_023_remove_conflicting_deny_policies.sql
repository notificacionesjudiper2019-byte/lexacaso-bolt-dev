/*
# Remove conflicting deny policies on notifications

## Summary
Removes legacy deny policies from earlier migrations that conflict with the new
admin INSERT/DELETE policies added in migration 022. These deny policies used
`WITH CHECK (false)` / `USING (false)` which blocks all inserts/deletes even
when another policy allows them (policies are OR'd, but deny policies with
false effectively create confusion and serve no purpose now that proper
admin-scoped policies exist).

## Security
No security reduction — the admin INSERT/DELETE policies already enforce
`is_admin()` checks. The deny policies are redundant and conflicting.
*/

DROP POLICY IF EXISTS "deny_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "deny_delete_notifications" ON public.notifications;
