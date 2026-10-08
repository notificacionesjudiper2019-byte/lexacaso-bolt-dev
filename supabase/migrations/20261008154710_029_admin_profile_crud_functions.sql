-- Admin function to update client profile data (name, cedula, phone, email)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_cedula text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
  updates jsonb := '{}'::jsonb;
BEGIN
  SELECT public.is_admin() INTO caller_is_admin;
  IF NOT caller_is_admin THEN
    RETURN jsonb_build_object('error', 'No autorizado');
  END IF;

  IF p_full_name IS NOT NULL THEN
    updates := updates || jsonb_build_object('full_name', p_full_name);
  END IF;
  IF p_cedula IS NOT NULL THEN
    updates := updates || jsonb_build_object('cedula', p_cedula);
  END IF;
  IF p_phone IS NOT NULL THEN
    updates := updates || jsonb_build_object('phone', p_phone);
  END IF;
  IF p_email IS NOT NULL THEN
    updates := updates || jsonb_build_object('email', p_email);
  END IF;

  IF updates = '{}'::jsonb THEN
    RETURN jsonb_build_object('error', 'No hay campos para actualizar');
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    cedula = COALESCE(p_cedula, cedula),
    phone = COALESCE(p_phone, phone),
    email = COALESCE(p_email, email)
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Usuario no encontrado');
  END IF;

  PERFORM public.record_audit_event(
    'profile_updated_by_admin',
    p_user_id,
    NULL,
    updates
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin function to delete a client user entirely (profile + auth user)
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
  user_email text;
BEGIN
  SELECT public.is_admin() INTO caller_is_admin;
  IF NOT caller_is_admin THEN
    RETURN jsonb_build_object('error', 'No autorizado');
  END IF;

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'No puedes eliminar tu propia cuenta');
  END IF;

  -- Prevent deleting other admins
  SELECT role INTO caller_is_admin FROM public.profiles WHERE id = p_user_id;
  IF caller_is_admin = 'admin' THEN
    RETURN jsonb_build_object('error', 'No puedes eliminar una cuenta de administrador');
  END IF;

  SELECT email INTO user_email FROM public.profiles WHERE id = p_user_id;

  -- Delete profile row
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete the auth user (cascades to related data via Supabase)
  DELETE FROM auth.users WHERE id = p_user_id;

  PERFORM public.record_audit_event(
    'user_deleted_by_admin',
    p_user_id,
    NULL,
    jsonb_build_object('deleted_email', user_email)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.admin_update_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;