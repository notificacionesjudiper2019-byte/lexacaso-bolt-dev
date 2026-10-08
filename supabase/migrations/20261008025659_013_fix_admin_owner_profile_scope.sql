/*
# Bloque 2 — corregir alcance de perfiles en panel administrativo

## Propósito
Corrige la consulta de perfiles para que un administrador autorizado pueda
consultar los datos del propietario de un caso autorizado, sin convertir la
lista de administradores en una lista de todos los usuarios.

## Seguridad
- Solo `is_admin()` puede usar esta política.
- La relación se valida por el caso autorizado y por el propietario real del caso.
- No se eliminan filas ni se modifican datos existentes.
*/

DROP POLICY IF EXISTS "admin_view_authorized_profiles" ON profiles;
CREATE POLICY "admin_view_authorized_profiles" ON profiles FOR SELECT TO authenticated USING (
  public.is_admin() AND EXISTS (
    SELECT 1
    FROM case_authorizations ca
    JOIN cases c ON c.id = ca.case_id
    WHERE c.user_id = profiles.id
      AND ca.user_id = auth.uid()
      AND ca.revoked_at IS NULL
  )
);
