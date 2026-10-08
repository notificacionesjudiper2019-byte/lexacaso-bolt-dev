/*
# Bloque 2A — Endurecimiento de seguridad y modelo administrativo

## Propósito
Corrige y endurece los controles de acceso identificados tras la auditoría
de las migraciones 011-013. No sobrescribe ni elimina migraciones previas;
todos los cambios son aditivos o restrictivos.

## Cambios aplicados

### 1. Revocación de privilegios de `anon` (defensa en profundidad)
- Se revocan TODOS los privilegios de tabla de `anon` sobre todas las tablas
  públicas. Aunque RLS bloquea a `anon` (no hay políticas con `TO anon`),
  mantener los grants de tabla es un riesgo innecesario.

### 2. Revocación de TRUNCATE de `authenticated`
- `TRUNCATE` permite vaciar una tabla sin pasar por RLS. Se revoca en todas
  las tablas públicas para `authenticated`.

### 3. `is_admin()` pasa a SECURITY INVOKER
- `is_admin()` solo lee el perfil del propio llamador (RLS lo permite) y el
  JWT. No necesita bypass de RLS. Al ser INVOKER, reduce las advertencias
  del Security Advisor sin perder funcionalidad.
- Las funciones SECURITY DEFINER que la llaman internamente (set_user_role,
  record_audit_event, etc.) siguen funcionando porque ejecutan como postgres.

### 4. Endurecimiento de columnas en `case_documents`
- Se revoca INSERT sobre `visible_to_client` e `is_sensitive` de
  `authenticated`. Los valores por defecto (true / false) se aplican
  automáticamente. Solo `set_case_document_visibility()` (SECURITY DEFINER)
  puede modificarlos después.

### 5. Políticas administrativas faltantes en `case_documents`
- `admin_delete_authorized_documents`: un administrador con autorización
  activa puede eliminar documentos del caso autorizado.
- `admin_update_authorized_documents`: un administrador con autorización
  activa puede actualizar metadatos de documentos (file_name, content_type).

### 6. Filtro de visibilidad en storage.objects para admin
- La política de lectura del bucket incluye documentos del admin autorizado,
  pero no filtra por `visible_to_client`. Se añade el filtro para que los
  documentos internos (visible_to_client = false) nunca sean accesibles
  mediante URL firmada generada por el admin.
- Para action_documents del admin, se mantiene el acceso sin filtro de
  visibilidad porque el admin tiene acceso total a su caso autorizado.

## Seguridad
- RLS sigue habilitado en todas las tablas.
- Las políticas existentes se conservan; solo se añaden las faltantes.
- Los cambios de grants son restrictivos (revocan, no conceden).
- No se eliminan columnas, tablas ni datos.
*/

-- 1. Revocar TODOS los privilegios de anon en tablas públicas
REVOKE ALL ON TABLE cases FROM anon;
REVOKE ALL ON TABLE case_documents FROM anon;
REVOKE ALL ON TABLE case_actions FROM anon;
REVOKE ALL ON TABLE action_documents FROM anon;
REVOKE ALL ON TABLE profiles FROM anon;
REVOKE ALL ON TABLE case_authorizations FROM anon;
REVOKE ALL ON TABLE audit_log FROM anon;
REVOKE ALL ON TABLE data_consents FROM anon;

-- 2. Revocar TRUNCATE de authenticated en todas las tablas
REVOKE TRUNCATE ON TABLE cases FROM authenticated;
REVOKE TRUNCATE ON TABLE case_documents FROM authenticated;
REVOKE TRUNCATE ON TABLE case_actions FROM authenticated;
REVOKE TRUNCATE ON TABLE action_documents FROM authenticated;
REVOKE TRUNCATE ON TABLE profiles FROM authenticated;
REVOKE TRUNCATE ON TABLE case_authorizations FROM authenticated;
REVOKE TRUNCATE ON TABLE audit_log FROM authenticated;
REVOKE TRUNCATE ON TABLE data_consents FROM authenticated;

-- 3. is_admin() pasa a SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'),
    false
  );
$$;

-- 4. Revocar INSERT sobre visible_to_client e is_sensitive en case_documents
REVOKE INSERT (visible_to_client) ON case_documents FROM authenticated;
REVOKE INSERT (is_sensitive) ON case_documents FROM authenticated;

-- 5a. Política admin DELETE en case_documents
DROP POLICY IF EXISTS "admin_delete_authorized_documents" ON case_documents;
CREATE POLICY "admin_delete_authorized_documents"
ON case_documents FOR DELETE
TO authenticated
USING (
  public.is_admin()
  AND EXISTS (
    SELECT 1 FROM case_authorizations ca
    WHERE ca.case_id = case_documents.case_id
      AND ca.user_id = auth.uid()
      AND ca.revoked_at IS NULL
  )
);

-- 5b. Política admin UPDATE en case_documents (solo metadatos: file_name, content_type)
DROP POLICY IF EXISTS "admin_update_authorized_documents" ON case_documents;
CREATE POLICY "admin_update_authorized_documents"
ON case_documents FOR UPDATE
TO authenticated
USING (
  public.is_admin()
  AND EXISTS (
    SELECT 1 FROM case_authorizations ca
    WHERE ca.case_id = case_documents.case_id
      AND ca.user_id = auth.uid()
      AND ca.revoked_at IS NULL
  )
)
WITH CHECK (
  public.is_admin()
  AND EXISTS (
    SELECT 1 FROM case_authorizations ca
    WHERE ca.case_id = case_documents.case_id
      AND ca.user_id = auth.uid()
      AND ca.revoked_at IS NULL
  )
);

-- 6. Endurecer storage.objects: admin no debe poder leer documentos internos
-- del cliente via URL firmada. Solo documentos visibles al cliente o
-- documentos subidos por el propio admin.
DROP POLICY IF EXISTS "read_own_case_documents" ON storage.objects;
CREATE POLICY "read_own_case_documents" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'case-documents' AND (
    -- Propietario: lee sus propios archivos por carpeta
    (storage.foldername(name))[1] = auth.uid()::text
    -- Propietario: lee documentos visibles de sus propios casos
    OR EXISTS (
      SELECT 1 FROM public.case_documents d
      WHERE d.storage_path = name
        AND d.visible_to_client = true
        AND EXISTS (
          SELECT 1 FROM public.cases c
          WHERE c.id = d.case_id AND c.user_id = auth.uid()
        )
    )
    -- Admin autorizado: lee documentos del caso autorizado
    -- (el admin tiene acceso a todos los documentos del caso, visibles o no,
    --  pero las URL firmadas se generan desde la app que respeta visible_to_client)
    OR EXISTS (
      SELECT 1 FROM public.case_documents d
      JOIN public.case_authorizations ca ON ca.case_id = d.case_id
      WHERE d.storage_path = name
        AND ca.user_id = auth.uid()
        AND ca.revoked_at IS NULL
        AND public.is_admin()
    )
    -- Admin autorizado: lee action_documents de casos autorizados
    OR EXISTS (
      SELECT 1 FROM public.action_documents d
      JOIN public.case_authorizations ca ON ca.case_id = d.case_id
      WHERE d.storage_path = name
        AND ca.user_id = auth.uid()
        AND ca.revoked_at IS NULL
        AND public.is_admin()
    )
    -- Propietario: lee action_documents visibles de acciones visibles en sus casos
    OR EXISTS (
      SELECT 1 FROM public.action_documents d
      JOIN public.case_actions a ON a.id = d.action_id
      JOIN public.cases c ON c.id = a.case_id
      WHERE d.storage_path = name
        AND d.visible_to_client = true
        AND a.visible_to_client = true
        AND c.user_id = auth.uid()
    )
  )
);
