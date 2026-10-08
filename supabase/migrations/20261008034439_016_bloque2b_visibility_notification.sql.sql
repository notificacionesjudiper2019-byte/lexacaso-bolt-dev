/*
# Bloque 2B — Notificación al hacer documento visible

## Propósito
Modifica `set_case_document_visibility()` para que, cuando un documento
pase de interno a visible (visible_to_client = true), se genere una
notificación al propietario del caso.

## Cambios
- Se añade llamada a `notify_document_visible()` dentro de
  `set_case_document_visibility()` cuando p_visible_to_client = true
  y el valor anterior era false.

## Seguridad
- No cambia los permisos de la función.
- La notificación se genera server-side, no desde el cliente.
*/

CREATE OR REPLACE FUNCTION public.set_case_document_visibility(
  p_document_id uuid,
  p_visible_to_client boolean,
  p_is_sensitive boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_file_name text;
  v_was_visible boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT case_id, file_name, visible_to_client INTO v_case_id, v_file_name, v_was_visible
  FROM public.case_documents WHERE id = p_document_id;
  IF v_case_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.case_authorizations
    WHERE case_id = v_case_id AND user_id = auth.uid() AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.case_documents
  SET visible_to_client = p_visible_to_client,
      is_sensitive = p_is_sensitive
  WHERE id = p_document_id;
  INSERT INTO public.audit_log(actor_user_id, action, target_case_id, target_document_id, details)
  VALUES (auth.uid(), 'document_visibility_changed', v_case_id, p_document_id,
    jsonb_build_object('visible_to_client', p_visible_to_client, 'is_sensitive', p_is_sensitive));
  -- Notificar al cliente si el documento acaba de volverse visible
  IF p_visible_to_client = true AND v_was_visible = false THEN
    PERFORM public.notify_document_visible(v_case_id, v_file_name);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_case_document_visibility(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_case_document_visibility(uuid, boolean, boolean) TO authenticated;
