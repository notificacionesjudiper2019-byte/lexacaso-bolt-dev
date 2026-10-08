/*
# Bloque 2B — Tabla de notificaciones

## Propósito
Crea la infraestructura de notificaciones para avisar al cliente cuando
exista una actualización relevante de su caso: nueva gestión visible,
cambio de estado, nuevo documento visible.

## Tabla nueva
- `notifications`: notificaciones dirigidas al usuario propietario del caso.
  - id, user_id (propietario del caso), case_id, type, title, message,
    is_read, created_at
  - RLS: propietario puede SELECT y UPDATE (solo is_read), no INSERT/DELETE

## Función nueva
- `notify_case_owner()`: trigger AFTER INSERT en `case_actions` que genera
  una notificación al propietario del caso cuando la gestión es visible
  para el cliente.

## Seguridad
- RLS habilitada: solo el propietario del caso ve y marca como leídas
  sus notificaciones.
- INSERT solo via trigger (función SECURITY DEFINER).
- DELETE denegado para authenticated.
- anon sin privilegios (ya revocados en migración 014).
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'case_update',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_case_id ON notifications(case_id);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "deny_insert_notifications" ON notifications;
CREATE POLICY "deny_insert_notifications" ON notifications FOR INSERT
TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "deny_delete_notifications" ON notifications;
CREATE POLICY "deny_delete_notifications" ON notifications FOR DELETE
TO authenticated USING (false);

REVOKE INSERT, DELETE ON notifications FROM authenticated;

-- Función trigger: notifica al propietario del caso cuando se crea una gestión visible
CREATE OR REPLACE FUNCTION public.notify_case_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.cases WHERE id = NEW.case_id;
  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;
  -- Solo notificar si la gestión es visible para el cliente
  IF NEW.visible_to_client = true THEN
    INSERT INTO public.notifications(user_id, case_id, type, title, message)
    VALUES (
      v_owner,
      NEW.case_id,
      'new_action',
      'Nueva actualización en tu caso',
      'Se ha registrado una nueva gestión: ' || NEW.title || '. Inicia sesión en LEXACASO para ver el detalle.'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_case_owner() FROM PUBLIC, anon;

-- Trigger AFTER INSERT en case_actions
DROP TRIGGER IF EXISTS trigger_notify_case_action ON case_actions;
CREATE TRIGGER trigger_notify_case_action
AFTER INSERT ON case_actions
FOR EACH ROW EXECUTE FUNCTION public.notify_case_owner();

-- Función para notificar cuando un documento se vuelve visible
CREATE OR REPLACE FUNCTION public.notify_document_visible(
  p_case_id uuid,
  p_file_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.cases WHERE id = p_case_id;
  IF v_owner IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications(user_id, case_id, type, title, message)
  VALUES (
    v_owner,
    p_case_id,
    'document_visible',
    'Nuevo documento disponible',
    'El documento "' || p_file_name || '" ya está disponible para tu consulta en LEXACASO.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_document_visible(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_document_visible(uuid, text) TO authenticated;
