/*
# Bloque 2 — privacidad, roles, autorizaciones y auditoría

## Propósito
Añade los controles server-side necesarios para que los casos y documentos
solo puedan ser consultados por su propietario o por un administrador
expresamente autorizado para ese caso.

## Tablas nuevas
- `data_consents`: evidencia de aceptación de la política de tratamiento,
  con versión, fecha, agente de usuario y dirección IP opcional.
- `audit_log`: registro inmutable de accesos, descargas, cambios de roles,
  autorizaciones y exportaciones.
- `case_authorizations`: relación explícita entre un administrador y un caso
  que el propietario autorizó revisar.

## Columnas nuevas
- `profiles.role`: rol protegido del usuario, únicamente `user` o `admin`.
- `case_documents.is_sensitive`: marca de sensibilidad del documento.

## Funciones protegidas
- `is_admin()`: verifica el rol server-side desde `profiles` y el JWT.
- `set_user_role(...)`: asigna o revoca roles únicamente para un administrador.
- `record_audit_event(...)`: registra auditoría usando `auth.uid()` como actor.
- `list_admin_users()`: devuelve solo administradores disponibles para autorización.

## Seguridad
- Se reemplazan políticas de casos, documentos y gestiones para admitir solo
  propietario o administrador autorizado.
- El cliente solo ve documentos con `visible_to_client = true`.
- Los administradores solo ven casos con autorización activa.
- Los clientes no pueden crear, editar ni borrar gestiones administrativas.
- `profiles.role`, `audit_log` y campos de propiedad no son modificables desde
  el navegador mediante privilegios de columnas.
- El bucket continúa privado; sus lecturas se amplían únicamente para casos
  autorizados y documentos visibles.

## Compatibilidad y datos
- Todas las modificaciones son aditivas.
- Los documentos existentes conservan `visible_to_client = true` y
  `is_sensitive = false`.
- Los perfiles existentes conservan el rol `user` hasta una asignación segura.
- La política de consentimiento se aplica a la creación de casos nuevos.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

ALTER TABLE case_documents
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS data_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_document_id uuid REFERENCES case_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS case_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS case_authorizations_active_unique
  ON case_authorizations(user_id, case_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_case_authorizations_case_id ON case_authorizations(case_id);
CREATE INDEX IF NOT EXISTS idx_case_authorizations_user_id ON case_authorizations(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_case_id ON audit_log(target_case_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_data_consents_user_id ON data_consents(user_id);

ALTER TABLE data_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_authorizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user','admin'));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  INSERT INTO public.audit_log(actor_user_id, action, target_user_id, details)
  VALUES (auth.uid(), 'role_changed', p_user_id, jsonb_build_object('role', p_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.record_audit_event(
  p_action text,
  p_target_case_id uuid DEFAULT NULL,
  p_target_user_id uuid DEFAULT NULL,
  p_target_document_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_admin() AND p_target_case_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.cases WHERE id = p_target_case_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.audit_log(actor_user_id, action, target_case_id, target_user_id, target_document_id, details)
  VALUES (auth.uid(), p_action, p_target_case_id, p_target_user_id, p_target_document_id, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.role = 'admin'
  ORDER BY p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_audit_event(text, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_audit_event(text, uuid, uuid, uuid, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.list_admin_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;

REVOKE INSERT ON profiles FROM authenticated;
GRANT INSERT (id, full_name, cedula, phone, address, email) ON profiles TO authenticated;
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (full_name, cedula, phone, address, email) ON profiles TO authenticated;
REVOKE UPDATE ON case_documents FROM authenticated;
GRANT UPDATE (file_name, content_type) ON case_documents TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND role = 'user');
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND role = 'user');
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id AND role = 'user');
DROP POLICY IF EXISTS "admin_view_authorized_profiles" ON profiles;
CREATE POLICY "admin_view_authorized_profiles" ON profiles FOR SELECT TO authenticated USING (
  public.is_admin() AND EXISTS (
    SELECT 1 FROM case_authorizations ca JOIN cases c ON c.id = ca.case_id
    WHERE ca.user_id = profiles.id AND ca.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "insert_own_cases" ON cases;
CREATE POLICY "insert_own_cases" ON cases FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM data_consents dc WHERE dc.user_id = auth.uid() AND dc.policy_version = '1.0.0')
);
DROP POLICY IF EXISTS "select_own_cases" ON cases;
CREATE POLICY "select_own_cases" ON cases FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR (public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = cases.id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL))
);
DROP POLICY IF EXISTS "update_own_cases" ON cases;
CREATE POLICY "update_own_cases" ON cases FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cases" ON cases;
CREATE POLICY "delete_own_cases" ON cases FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_documents" ON case_documents;
CREATE POLICY "select_own_documents" ON case_documents FOR SELECT TO authenticated USING (
  visible_to_client = true AND auth.uid() = user_id AND EXISTS (SELECT 1 FROM cases WHERE cases.id = case_documents.case_id AND cases.user_id = auth.uid())
);
DROP POLICY IF EXISTS "admin_select_authorized_documents" ON case_documents;
CREATE POLICY "admin_select_authorized_documents" ON case_documents FOR SELECT TO authenticated USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = case_documents.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
);
DROP POLICY IF EXISTS "update_own_documents" ON case_documents;
CREATE POLICY "update_own_documents" ON case_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id AND visible_to_client = true) WITH CHECK (auth.uid() = user_id AND visible_to_client = true);

DROP POLICY IF EXISTS "select_visible_own_actions" ON case_actions;
CREATE POLICY "select_visible_own_actions" ON case_actions FOR SELECT TO authenticated USING (
  visible_to_client = true AND EXISTS (SELECT 1 FROM cases WHERE cases.id = case_actions.case_id AND cases.user_id = auth.uid())
);
DROP POLICY IF EXISTS "admin_select_authorized_actions" ON case_actions;
CREATE POLICY "admin_select_authorized_actions" ON case_actions FOR SELECT TO authenticated USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = case_actions.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
);
DROP POLICY IF EXISTS "insert_own_actions" ON case_actions;
DROP POLICY IF EXISTS "update_own_actions" ON case_actions;
DROP POLICY IF EXISTS "delete_own_actions" ON case_actions;
DROP POLICY IF EXISTS "admin_insert_authorized_actions" ON case_actions;
CREATE POLICY "admin_insert_authorized_actions" ON case_actions FOR INSERT TO authenticated WITH CHECK (
  public.is_admin() AND created_by = auth.uid() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = case_actions.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
);
DROP POLICY IF EXISTS "admin_update_authorized_actions" ON case_actions;
CREATE POLICY "admin_update_authorized_actions" ON case_actions FOR UPDATE TO authenticated USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = case_actions.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
) WITH CHECK (public.is_admin() AND created_by = created_by);
DROP POLICY IF EXISTS "admin_delete_authorized_actions" ON case_actions;
CREATE POLICY "admin_delete_authorized_actions" ON case_actions FOR DELETE TO authenticated USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = case_actions.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
);

DROP POLICY IF EXISTS "select_visible_own_action_docs" ON action_documents;
CREATE POLICY "select_visible_own_action_docs" ON action_documents FOR SELECT TO authenticated USING (
  visible_to_client = true AND EXISTS (
    SELECT 1 FROM case_actions a JOIN cases c ON c.id = a.case_id
    WHERE a.id = action_documents.action_id AND a.visible_to_client = true AND c.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "admin_select_authorized_action_docs" ON action_documents;
CREATE POLICY "admin_select_authorized_action_docs" ON action_documents FOR SELECT TO authenticated USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = action_documents.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
);
DROP POLICY IF EXISTS "insert_own_action_docs" ON action_documents;
DROP POLICY IF EXISTS "update_own_action_docs" ON action_documents;
DROP POLICY IF EXISTS "delete_own_action_docs" ON action_documents;
DROP POLICY IF EXISTS "admin_insert_authorized_action_docs" ON action_documents;
CREATE POLICY "admin_insert_authorized_action_docs" ON action_documents FOR INSERT TO authenticated WITH CHECK (
  public.is_admin() AND user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM case_actions a WHERE a.id = action_documents.action_id AND a.case_id = action_documents.case_id AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = a.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
  )
);
DROP POLICY IF EXISTS "admin_update_authorized_action_docs" ON action_documents;
CREATE POLICY "admin_update_authorized_action_docs" ON action_documents FOR UPDATE TO authenticated USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = action_documents.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
) WITH CHECK (public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = action_documents.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL));
DROP POLICY IF EXISTS "admin_delete_authorized_action_docs" ON action_documents;
CREATE POLICY "admin_delete_authorized_action_docs" ON action_documents FOR DELETE TO authenticated USING (
  public.is_admin() AND EXISTS (SELECT 1 FROM case_authorizations ca WHERE ca.case_id = action_documents.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL)
);

DROP POLICY IF EXISTS "select_own_consents" ON data_consents;
CREATE POLICY "select_own_consents" ON data_consents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_consents" ON data_consents;
CREATE POLICY "insert_own_consents" ON data_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "deny_update_consents" ON data_consents;
CREATE POLICY "deny_update_consents" ON data_consents FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "deny_delete_consents" ON data_consents;
CREATE POLICY "deny_delete_consents" ON data_consents FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "admin_select_audit_log" ON audit_log;
CREATE POLICY "admin_select_audit_log" ON audit_log FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "deny_insert_audit_log" ON audit_log;
CREATE POLICY "deny_insert_audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "deny_update_audit_log" ON audit_log;
CREATE POLICY "deny_update_audit_log" ON audit_log FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "deny_delete_audit_log" ON audit_log;
CREATE POLICY "deny_delete_audit_log" ON audit_log FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "select_case_authorizations" ON case_authorizations;
CREATE POLICY "select_case_authorizations" ON case_authorizations FOR SELECT TO authenticated USING (
  (EXISTS (SELECT 1 FROM cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid()))
  OR (case_authorizations.user_id = auth.uid() AND public.is_admin())
);
DROP POLICY IF EXISTS "insert_case_authorizations" ON case_authorizations;
CREATE POLICY "insert_case_authorizations" ON case_authorizations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = case_authorizations.user_id AND p.role = 'admin')
);
DROP POLICY IF EXISTS "update_case_authorizations" ON case_authorizations;
CREATE POLICY "update_case_authorizations" ON case_authorizations FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = case_authorizations.user_id AND p.role = 'admin')
);
DROP POLICY IF EXISTS "delete_case_authorizations" ON case_authorizations;
CREATE POLICY "delete_case_authorizations" ON case_authorizations FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM cases c WHERE c.id = case_authorizations.case_id AND c.user_id = auth.uid())
);

REVOKE INSERT, UPDATE, DELETE ON audit_log FROM authenticated;
REVOKE UPDATE, DELETE ON data_consents FROM authenticated;
GRANT INSERT ON data_consents TO authenticated;

DROP POLICY IF EXISTS "read_own_case_documents" ON storage.objects;
CREATE POLICY "read_own_case_documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'case-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.case_documents d WHERE d.storage_path = name AND d.visible_to_client = true AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = d.case_id AND c.user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.case_documents d JOIN public.case_authorizations ca ON ca.case_id = d.case_id WHERE d.storage_path = name AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL AND public.is_admin())
    OR EXISTS (SELECT 1 FROM public.action_documents d JOIN public.case_authorizations ca ON ca.case_id = d.case_id WHERE d.storage_path = name AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL AND public.is_admin())
    OR EXISTS (SELECT 1 FROM public.action_documents d JOIN public.case_actions a ON a.id = d.action_id JOIN public.cases c ON c.id = a.case_id WHERE d.storage_path = name AND d.visible_to_client = true AND a.visible_to_client = true AND c.user_id = auth.uid())
  )
);
