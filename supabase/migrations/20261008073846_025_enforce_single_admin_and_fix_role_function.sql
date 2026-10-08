/*
# Enforce single-admin rule and fix set_user_role to accept 'client'

## Summary
1. Updates set_user_role to accept 'client' (currently only accepts 'user' and 'admin')
2. Prevents demoting the last remaining admin (always keeps at least one admin)
3. The handle_new_user trigger already enforces: first user or notipersonales2026@gmail.com = admin, all others = client

## Security
- set_user_role is SECURITY DEFINER with is_admin() check — only admins can change roles
- Prevents self-lockout: an admin cannot demote themselves if they are the only admin
- Audit log records every role change
*/

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
  is_target_admin BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_role NOT IN ('client', 'user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent demoting the last admin
  SELECT role = 'admin' INTO is_target_admin FROM public.profiles WHERE id = p_user_id;
  IF is_target_admin AND p_role <> 'admin' THEN
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'No se puede cambiar el rol: es el único administrador del sistema.';
    END IF;
  END IF;

  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;

  INSERT INTO public.audit_log(actor_user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'role_changed', p_user_id, jsonb_build_object('role', p_role));
END;
$$;
