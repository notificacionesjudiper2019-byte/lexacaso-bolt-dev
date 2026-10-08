/*
# Bloque 2 — controles administrativos de documentos y gestiones

## Propósito
Completa las operaciones administrativas que requieren privilegios especiales
sin permitir que React modifique directamente campos sensibles.

## Funciones nuevas
- `set_case_document_visibility`: solo un administrador autorizado puede
  cambiar `visible_to_client` o `is_sensitive`.

## Políticas modificadas
- Un administrador autorizado puede insertar documentos de su caso autorizado.
- Las actualizaciones de gestiones conservan su autor y solo pueden continuar
  dentro de un caso autorizado.

## Seguridad
- Las funciones usan `SECURITY DEFINER`, `auth.uid()` y `search_path` fijo.
- Se revoca su ejecución a `anon` y se concede únicamente a `authenticated`.
- El cliente no recibe privilegios directos para modificar sensibilidad o
  visibilidad de documentos.
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT case_id INTO v_case_id FROM public.case_documents WHERE id = p_document_id;
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
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_case_document_visibility(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_case_document_visibility(uuid, boolean, boolean) TO authenticated;

DROP POLICY IF EXISTS "admin_insert_authorized_documents" ON case_documents;
CREATE POLICY "admin_insert_authorized_documents" ON case_documents FOR INSERT TO authenticated WITH CHECK (
  public.is_admin() AND user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM case_authorizations ca
    WHERE ca.case_id = case_documents.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "admin_update_authorized_actions" ON case_actions;
CREATE POLICY "admin_update_authorized_actions" ON case_actions FOR UPDATE TO authenticated
USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = case_actions.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
)
WITH CHECK (
  public.is_admin() AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = case_actions.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
);
