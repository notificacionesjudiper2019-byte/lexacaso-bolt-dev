# LEXACASO — HANDOFF DOCUMENT

**Fecha:** 2026-10-08
**Bloque completado:** 2B — Interfaz administrativa, autorizaciones, auditoría y notificaciones
**Proyecto:** casos-privados (LEXACASO)
**Entorno:** Bolt + Supabase + React + Vite

---

## RESUMEN EJECUTIVO

El Bloque 2A implementa el modelo administrativo completo: roles de usuario, autorizaciones por caso, auditoría inmutable, consentimiento de datos, y endurecimiento de seguridad a nivel de base de datos y storage. Las migraciones 011-014 establecen un sistema donde:

- **Clientes** solo ven sus propios casos, documentos visibles, y gestiones visibles (solo lectura).
- **Administradores** solo acceden a casos donde el cliente los autorizó expresamente.
- **Ningún campo sensible** (rol, visibilidad, sensibilidad) es modificable desde el navegador.
- **Toda acción administrativa** se registra en `audit_log` de forma inmutable.

---

## ESTADO DE LA BASE DE DATOS

### Migraciones aplicadas (16 total)
- 001-006: Esquema base (cases, case_documents, profiles, storage, triggers)
- 007-010: Bloque 1 (términos, visible_to_client, gestiones, documentos de gestiones)
- 011: Roles, autorizaciones, auditoría, consentimiento, column-level grants, políticas admin/cliente
- 012: Controles administrativos de documentos (set_case_document_visibility)
- 013: Corrección de alcance de perfiles admin
- 014: Endurecimiento de seguridad (revocación anon, TRUNCATE, columnas protegidas, storage)
- 015: Notificaciones in-app con RLS y triggers server-side
- 016: Notificación al cliente cuando un documento se vuelve visible

### Tablas (8)
| Tabla | RLS | Propósito |
|---|---|---|
| `cases` | Habilitada | Casos jurídicos del usuario |
| `case_documents` | Habilitada | Documentos de casos |
| `profiles` | Habilitada | Perfiles con rol protegido |
| `case_actions` | Habilitada | Gestiones/seguimiento (admin CRUD, cliente SELECT) |
| `action_documents` | Habilitada | Documentos de gestiones |
| `case_authorizations` | Habilitada | Autorizaciones admin↔caso |
| `audit_log` | Habilitada | Registro inmutable de auditoría |
| `data_consents` | Habilitada | Consentimiento de tratamiento de datos |

### Funciones protegidas (5)
| Función | Tipo | Propósito |
|---|---|---|
| `is_admin()` | SECURITY INVOKER | Verifica rol admin |
| `set_user_role(uuid, text)` | SECURITY DEFINER | Asigna/revoca roles (solo admin) |
| `record_audit_event(...)` | SECURITY DEFINER | Registra eventos de auditoría |
| `list_admin_users()` | SECURITY DEFINER | Lista administradores |
| `set_case_document_visibility(uuid, bool, bool)` | SECURITY DEFINER | Cambia visibilidad/sensibilidad |

---

## MODELO DE SEGURIDAD

### Roles
- `user` (default): cliente que presenta casos
- `admin`: abogado/gestor autorizado para casos específicos
- Almacenado en `profiles.role` + `raw_app_meta_data.role` del JWT
- Solo modificable via `set_user_role()` (requiere ser admin)

### Autorizaciones
- Tabla `case_authorizations`: relaciona admin ↔ caso
- El **propietario del caso** decide qué admin puede acceder
- Autorización puede ser revocada (`revoked_at`)
- Admin sin autorización activa no puede ver el caso ni sus documentos

### Auditoría
- `audit_log`: registro inmutable (INSERT/UPDATE/DELETE denegados via RLS)
- Solo `record_audit_event()` (SECURITY DEFINER) puede insertar
- Admin puede SELECT para revisar historial
- Eventos registrados: role_changed, document_visibility_changed, cases_exported, etc.

### Consentimiento de datos
- `data_consents`: requerido para crear casos (INSERT policy verifica consentimiento versión 1.0.0)
- Inmutable una vez aceptado
- Registra versión, fecha, IP, user agent

---

## PRIVILEGIOS POR ROL

### anon
- **Sin privilegios de tabla** (revocados en migración 014)
- No puede leer ni escribir ninguna tabla

### authenticated (cliente)
- cases: CRUD sobre casos propios
- case_documents: CRUD sobre documentos propios (SELECT solo visibles)
- case_actions: **SELECT solo lectura** de gestiones visibles
- action_documents: **SELECT solo lectura** de documentos visibles
- profiles: CRUD sobre perfil propio (columnas no sensibles)
- case_authorizations: gestionar autorizaciones de sus casos
- data_consents: INSERT (aceptar) y SELECT (ver propios)
- audit_log: sin acceso

### authenticated (admin)
- cases: SELECT de casos autorizados
- case_documents: SELECT/INSERT/UPDATE/DELETE de documentos de casos autorizados
- case_actions: CRUD de gestiones en casos autorizados
- action_documents: CRUD de documentos de gestiones en casos autorizados
- profiles: SELECT de perfiles de propietarios de casos autorizados
- audit_log: SELECT
- Funciones: set_user_role, record_audit_event, set_case_document_visibility, list_admin_users

---

## EDGE FUNCTIONS

### export-cases-excel
- Ubicación: `supabase/functions/export-cases-excel/index.ts`
- Config: `supabase/config.toml` con `verify_jwt = true`
- Verifica: usuario autenticado + `is_admin()` + registra auditoría
- Filtros: categoría, departamento, estado, rango de fechas
- Output: archivo .xlsx con casos, perfiles, documentos y gestiones

---

## SECURITY ADVISOR

**Resultado:** 4 WARN (esperados, no críticos)

Los 4 warnings corresponden a funciones SECURITY DEFINER ejecutables por `authenticated`:
1. `list_admin_users()` — devuelve lista de admins (necesario para UI de autorización)
2. `record_audit_event(...)` — registra eventos (tiene guard `is_admin()` o propietario)
3. `set_case_document_visibility(...)` — cambia visibilidad (tiene guard `is_admin()`)
4. `set_user_role(...)` — asigna roles (tiene guard `is_admin()`)

Cada función tiene verificación de autorización interna. No son accesibles sin control.

`is_admin()` ya no genera warning (migrada a SECURITY INVOKER).

---

## BUILD

```
vite v6.4.4 building for production...
✓ 1619 modules transformed
dist/index.html                   0.73 kB
dist/assets/index-BPEEpqAo.css   13.59 kB
dist/assets/index-Cx1I_YLc.js   433.84 kB
✓ built in 31.43s
```

Build exitoso. Sin warnings ni errores.

---

## BLOQUE 2B COMPLETADO

La interfaz administrativa quedó integrada con el modelo de seguridad existente:

1. **Panel de casos autorizados** — búsqueda, filtros por categoría, departamento, estado y fechas, además de exportación Excel
2. **Autorizaciones** — el cliente autoriza o revoca administradores desde su caso; cada administrador consulta únicamente sus autorizaciones activas
3. **Visibilidad** — el administrador puede alternar visibilidad y sensibilidad de documentos, y visibilidad de gestiones y sus documentos
4. **Auditoría** — visor administrativo de eventos, accesos y cambios registrados
5. **Notificaciones** — centro in-app para el cliente con lectura individual o masiva y acceso directo al caso relacionado
6. **Identidad visual** — navegación, tarjetas, estados y controles alineados con azul jurídico, dorado, marfil y azul claro de LEXACASO

## LO QUE FALTA

**Único pendiente:** Asignar el primer administrador. No hay usuarios registrados todavía. Tras el primer registro, ejecutar:
`UPDATE profiles SET role = 'admin' WHERE id = '<uuid>';`

**LEXACASO está listo para publicación.** NO se ha publicado producción.

---

## NOTAS TÉCNICAS PARA CONTINUAR

- Las migraciones 007-010 se conservaron intactas; 011-014 son aditivas/restRICTivas
- `is_admin()` es SECURITY INVOKER: funciona porque RLS permite a cada usuario leer su propio perfil
- Las funciones SECURITY DEFINER tienen `SET search_path = public` (seguro contra shadowing)
- `audit_log` es inmutable: nunca dar INSERT/UPDATE/DELETE a `authenticated`
- El bucket `case-documents` es privado: usar `createSignedUrl()` con expiración de 300s
- El consentimiento de datos (versión 1.0.0) es requerido por la política INSERT de `cases`
- Para asignar el primer admin: ejecutar `UPDATE profiles SET role = 'admin' WHERE id = '<uuid>';` directamente en SQL (o via set_user_role desde una cuenta ya admin)
