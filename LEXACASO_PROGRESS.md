# LEXACASO — PROGRESS TRACKER

**Fecha:** 2026-10-08
**Proyecto:** casos-privados (LEXACASO)
**Entorno:** Bolt + Supabase + React + Vite

---

## BLOQUES EJECUTADOS

### BLOQUE 1 — Etapas 4b, 5, 6, 7 + Módulo de Seguimiento — COMPLETADO
### BLOQUE 2A — Seguridad y modelo administrativo — COMPLETADO
### BLOQUE 2B — Panel administrativo, visibilidad, autorizaciones, auditoría y notificaciones — COMPLETADO

---

## ARCHIVOS MODIFICADOS

| Archivo | Descripción |
|---|---|
| `src/main.jsx` | Reescrito completo: catálogo jurídico con 14 categorías + subcategorías encadenadas, sección de términos y vencimientos, vista de detalle de caso (CaseDetail) con 3 pestañas, módulo de seguimiento (FollowupTab) con timeline, botón de WhatsApp, descarga de documentos mediante URL firmada |
| `src/styles.css` | Añadidos estilos para: vista de detalle, tarjetas de información, grid de detalle, lista de documentos, timeline de seguimiento, badges de estado, botón flotante de WhatsApp con tooltip, panel administrativo, navegación de auditoría, identidad visual LEXACASO y responsive mobile |
| `supabase/functions/export-cases-excel/index.ts` | Edge Function para exportación Excel de base general de casos (admin autorizado) |
| `supabase/config.toml` | Configuración de Edge Function export-cases-excel |

---

## MIGRACIONES CREADAS

| # | Nombre | Descripción |
|---|---|---|
| 1 | `001_create_cases_table` | Tabla `cases` con RLS |
| 2 | `002_create_case_documents_table` | Tabla `case_documents` con RLS |
| 3 | `003_create_case_documents_storage_bucket` | Bucket privado `case-documents` |
| 4 | `004_fix_search_path_trigger` | Corrección de search_path en triggers |
| 5 | `005_create_profiles_table` | Tabla `profiles` con RLS |
| 6 | `006_extend_cases_table` | 16 columnas adicionales en `cases` |
| 7 | `007_add_deadline_columns_to_cases` | Añade 4 columnas: `has_deadline`, `term_duration`, `term_start_date`, `term_end_date` |
| 8 | `008_add_visible_to_client_to_documents` | Añade `visible_to_client` boolean NOT NULL DEFAULT true a `case_documents` |
| 9 | `009_create_case_actions_table` | Crea tabla `case_actions` con RLS |
| 10 | `010_create_action_documents_table` | Crea tabla `action_documents` con RLS |
| 11 | `011_privacy_roles_authorizations_audit` | Roles, `is_admin()`, `set_user_role()`, `record_audit_event()`, `list_admin_users()`, tablas `data_consents`, `audit_log`, `case_authorizations`, column-level grants, políticas admin/cliente |
| 12 | `012_admin_document_controls` | `set_case_document_visibility()`, política admin INSERT en documentos, corrección admin UPDATE en gestiones |
| 13 | `013_fix_admin_owner_profile_scope` | Corrige alcance de perfiles en panel admin |
| 14 | `014_bloque2a_security_hardening` | Revoca privilegios `anon`, revoca `TRUNCATE`, `is_admin()` a INVOKER, revoca INSERT en `visible_to_client`/`is_sensitive`, políticas admin DELETE/UPDATE en documentos, endurece storage |

---

## TABLAS EN LA BASE DE DATOS

| Tabla | RLS | Políticas | Propósito |
|---|---|---|---|
| `cases` | Habilitada | 4 (propietario + admin autorizado) | Casos del usuario |
| `case_documents` | Habilitada | 8 (propietario + admin autorizado) | Documentos de casos |
| `profiles` | Habilitada | 5 (propietario + admin autorizado) | Perfiles de usuario |
| `case_actions` | Habilitada | 5 (cliente SELECT + admin CRUD) | Gestiones/seguimiento |
| `action_documents` | Habilitada | 5 (cliente SELECT + admin CRUD) | Documentos de gestiones |
| `case_authorizations` | Habilitada | 4 (propietario gestiona) | Autorizaciones admin↔caso |
| `audit_log` | Habilitada | 4 (admin SELECT, deny INSERT/UPDATE/DELETE) | Registro inmutable de auditoría |
| `data_consents` | Habilitada | 4 (propietario INSERT/SELECT, deny UPDATE/DELETE) | Consentimiento de datos |

---

## COLUMNAS DE `cases` (28 total)

**Originales (8):** id, user_id, title, facts, status, priority, created_at, updated_at
**Etapa 4 (16):** acting_as, representative_relationship, represented_person_name, represented_person_cedula, represented_person_phone, represented_person_address, legal_category, legal_subcategory, department, municipality, authority_type, authority_name, entity, dependency, case_number, document_type_received
**Etapa 5 (4):** has_deadline, term_duration, term_start_date, term_end_date

---

## COLUMNAS NUEVAS EN `case_documents`

- `visible_to_client` boolean NOT NULL DEFAULT true — diferencia documentos visibles de internos
- `is_sensitive` boolean NOT NULL DEFAULT false — marca de sensibilidad del documento

---

## COLUMNAS NUEVAS EN `profiles`

- `role` text NOT NULL DEFAULT 'user' — rol protegido (`user` o `admin`), no modificable desde el navegador

---

## RLS — SEGURIDAD VERIFICADA (BLOQUE 2A)

### cases
- SELECT: `auth.uid() = user_id` OR (`is_admin()` AND autorización activa) — propietario o admin autorizado
- INSERT: `auth.uid() = user_id AND EXISTS(consentimiento de datos)` — requiere consentimiento
- UPDATE/DELETE: `auth.uid() = user_id` — solo propietario

### case_documents
- SELECT (propietario): `visible_to_client = true AND auth.uid() = user_id AND EXISTS(cases.user_id = auth.uid())`
- SELECT (admin): `is_admin() AND EXISTS(autorización activa)`
- INSERT (propietario): `auth.uid() = user_id AND EXISTS(cases.user_id = auth.uid())`
- INSERT (admin): `is_admin() AND user_id = auth.uid() AND EXISTS(autorización activa)`
- UPDATE (propietario): `auth.uid() = user_id AND visible_to_client = true`
- UPDATE (admin): `is_admin() AND EXISTS(autorización activa)`
- DELETE (propietario): `auth.uid() = user_id AND EXISTS(cases.user_id = auth.uid())`
- DELETE (admin): `is_admin() AND EXISTS(autorización activa)`
- **Columnas protegidas:** `visible_to_client` e `is_sensitive` no son insertables por `authenticated` (solo via `set_case_document_visibility()`)

### case_actions (gestiones)
- SELECT (cliente): `visible_to_client = true AND EXISTS(cases.user_id = auth.uid())` — solo lectura de gestiones visibles
- SELECT (admin): `is_admin() AND EXISTS(autorización activa)`
- INSERT/UPDATE/DELETE: **SOLO admin** con `is_admin() AND created_by = auth.uid() AND EXISTS(autorización activa)`
- **El cliente NO puede crear, editar ni eliminar gestiones** — corregido en migración 011

### action_documents
- SELECT (cliente): `visible_to_client = true AND action.visible_to_client = true AND cases.user_id = auth.uid()` — triple verificación
- SELECT (admin): `is_admin() AND EXISTS(autorización activa)`
- INSERT/UPDATE/DELETE: **SOLO admin** con `is_admin() AND user_id = auth.uid() AND EXISTS(autorización activa)`

### case_authorizations
- SELECT: propietario del caso OR admin autorizado
- INSERT: propietario del caso AND usuario destino es admin
- UPDATE/DELETE: propietario del caso

### audit_log
- SELECT: `is_admin()` — solo administradores
- INSERT/UPDATE/DELETE: **denegado** — solo via `record_audit_event()` (SECURITY DEFINER)

### data_consents
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE/DELETE: **denegado**

### profiles
- SELECT: `auth.uid() = id` OR `is_admin()` con autorización activa
- INSERT: `auth.uid() = id AND role = 'user'`
- UPDATE: `auth.uid() = id AND role = 'user'` — solo columnas: full_name, cedula, phone, address, email
- DELETE: `auth.uid() = id AND role = 'user'`
- **Columna `role` protegida:** no insertable ni actualizable desde el navegador

### Storage (bucket `case-documents`)
- SELECT: propietario por carpeta UID, documentos visibles de casos propios, admin autorizado, action_documents visibles
- INSERT/UPDATE/DELETE: propietario por carpeta UID

---

## FUNCIONES PROTEGIDAS (SECURITY DEFINER)

| Función | Propósito | Ejecución |
|---|---|---|
| `is_admin()` | Verifica rol admin desde JWT + profiles | `authenticated` (SECURITY INVOKER) |
| `set_user_role(p_user_id, p_role)` | Asigna/revoca roles (solo admin) | `authenticated` (SECURITY DEFINER) |
| `record_audit_event(...)` | Registra eventos de auditoría | `authenticated` (SECURITY DEFINER) |
| `list_admin_users()` | Lista administradores disponibles | `authenticated` (SECURITY DEFINER) |
| `set_case_document_visibility(...)` | Cambia visibilidad/sensibilidad (solo admin) | `authenticated` (SECURITY DEFINER) |

### Security Advisor: 4 WARN (esperados)
Los 4 warnings restantes son para funciones SECURITY DEFINER intencionalmente ejecutables por `authenticated`:
- `set_user_role`, `record_audit_event`, `set_case_document_visibility`, `list_admin_users`
- Cada función tiene verificación interna `is_admin()` — el acceso no es irrestricto
- `is_admin()` ya no genera warning (pasó a SECURITY INVOKER)

---

## PRIVILEGIOS REVOCADOS (BLOQUE 2A)

- **`anon`**: TODOS los privilegios de tabla revocados en las 8 tablas públicas (defensa en profundidad)
- **`authenticated`**: `TRUNCATE` revocado en todas las tablas
- **`authenticated`**: INSERT sobre `visible_to_client` e `is_sensitive` revocado en `case_documents`
- **`authenticated`**: INSERT/UPDATE/DELETE revocado en `audit_log` (solo via función)
- **`authenticated`**: UPDATE/DELETE revocado en `data_consents`
- **`authenticated`**: INSERT/UPDATE revocado en `profiles` (solo columnas no sensibles)

---

## CATÁLOGO JURÍDICO IMPLEMENTADO

**14 categorías principales:**
1. Acción de tutela
2. Acción popular
3. Acción de cumplimiento
4. Proceso ordinario
5. Proceso abreviado
6. Procesos ejecutivos (14 subcategorías)
7. Cobro coactivo (6 subcategorías — categoría independiente)
8. Proceso monitorio
9. Jurisdicción voluntaria
10. Incidente
11. Medida cautelar
12. Acción de grupo
13. Otro
14. No sé / necesito orientación

**Procesos ejecutivos — 14 subcategorías:**
Ejecutivo de alimentos, Ejecutivo singular, Ejecutivo con garantía real, Ejecutivo hipotecario, Ejecutivo prendario, Ejecutivo de título valor, Ejecutivo de factura, Ejecutivo de pagaré, Ejecutivo de letra de cambio, Ejecutivo de cheque, Ejecutivo de sentencia, Ejecutivo de obligación clara expresa y exigible, Ejecutivo de mínima cuantía, Otro ejecutivo

**Cobro coactivo — 6 subcategorías:**
Entidad pública, Impuesto, Multa, Comparendo, Obligación administrativa, Otra

**Selectores encadenados:** categoría principal → subcategoría dinámica (solo aparece si la categoría tiene subcategorías)

---

## FUNCIONALIDADES TERMINADAS

### Bloque 1
1. **Catálogo jurídico completo** con 14 categorías, subcategorías encadenadas, validación
2. **Términos y vencimientos** con Sí/No/No sé, duración predefinida + custom, cálculo automático de fecha límite, validación de coherencia
3. **Vista de detalle de caso** (CaseDetail) con 3 pestañas: Información, Documentos, Seguimiento
4. **Módulo de seguimiento** (FollowupTab): timeline cronológico, badges de estado, descarga de documentos
5. **Botón flotante de WhatsApp** (+57 310 560 386) con tooltip, responsive
6. **visible_to_client** en case_documents y action_documents, enforced por RLS
7. **URLs firmadas temporales** (300 segundos) para descarga
8. **Lista de casos mejorada** con categoría, subcategoría, representación, vencimiento

### Bloque 2A — Seguridad y modelo administrativo
9. **Roles `admin` y `user`** mediante `profiles.role` + `raw_app_meta_data`
10. **`is_admin()`** function (SECURITY INVOKER, search_path seguro)
11. **`set_user_role()`** — asignación segura de roles (solo admin, audita cambio)
12. **`case_authorizations`** — tabla que restringe admin a casos expresamente autorizados
13. **Cliente no puede crear/editar/eliminar gestiones** — solo lectura de visibles, admin gestiona
14. **`case_documents` SELECT filtrado por `visible_to_client = true`** para clientes
15. **`case_documents` columnas `visible_to_client`/`is_sensitive` protegidas** — no insertables por cliente
16. **`audit_log`** — tabla inmutable de auditoría (SELECT admin, INSERT/UPDATE/DELETE denegados)
17. **`data_consents`** — evidencia de consentimiento de tratamiento de datos
18. **`record_audit_event()`** — función segura para registrar accesos, descargas, cambios
19. **Bucket storage endurecido** — documentos internos no expuestos
20. **Privilegios `anon` revocados** en todas las tablas (defensa en profundidad)
21. **`TRUNCATE` revocado** de `authenticated` en todas las tablas
22. **Edge Function `export-cases-excel`** — exportación Excel con verificación admin + auditoría

---

## ESTADOS DE GESTIÓN

| Valor | Etiqueta |
|---|---|
| pending | Pendiente |
| in_progress | En trámite |
| completed | Realizada |
| received | Recibida |
| replied | Respondida |
| expired | Vencida |
| finalized | Finalizada |
| cancelled | Cancelada |

---

## COMPATIBILIDAD

- Los casos existentes siguen funcionando sin cambios
- Los documentos existentes tienen `visible_to_client = true` por defecto (comportamiento preservado)
- Las categorías anteriores están contenidas en el nuevo catálogo
- El flujo de guardado de la Etapa 2 se mantiene: errores no borran ni cierran el formulario
- Los perfiles existentes conservan el rol `user` hasta asignación segura
- Las migraciones 007-010 se conservan sin sobrescribir

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

Build exitoso, sin warnings ni errores.

---

## ERRORES ENCONTRADOS Y RESUELTOS

| Error | Solución |
|---|---|
| `Gantt` no exportado por lucide-react | Reemplazado por `Clock` en el import |
| `anon` con privilegios de tabla en todas las tablas | Revocados en migración 014 |
| `TRUNCATE` concedido a `authenticated` | Revocado en migración 014 |
| `visible_to_client`/`is_sensitive` insertables por cliente | Revocado INSERT en migración 014 |
| `case_documents` sin políticas admin DELETE/UPDATE | Añadidas en migración 014 |
| `is_admin()` SECURITY DEFINER generaba warning del advisor | Cambiado a SECURITY INVOKER en migración 014 |

---

## DECISIONES ARQUITECTÓNICAS

1. **Catálogo en código frontend** (no en tabla de BD) — más simple, fácil de mantener
2. **visible_to_client DEFAULT true en case_documents** — preserva comportamiento existente
3. **visible_to_client DEFAULT false en action_documents** — documentos de gestión internos por defecto
4. **URL firmadas de 300 segundos** — balance entre usabilidad y seguridad
5. **case_actions: cliente solo SELECT, admin CRUD** — el cliente no puede crear/editar/eliminar gestiones administrativas
6. **RLS triple verificación en action_documents** — documento visible + gestión visible + caso propio
7. **`is_admin()` como SECURITY INVOKER** — lee solo el perfil del llamador (RLS lo permite), no necesita bypass
8. **Funciones SECURITY DEFINER con guard `is_admin()` interno** — patrón recomendado para mutations privilegiadas
9. **`audit_log` inmutable** — INSERT/UPDATE/DELETE denegados, solo `record_audit_event()` puede escribir
10. **`case_authorizations` gestionada por propietario** — el cliente decide qué admin puede ver su caso

---

## FUNCIONALIDADES PENDIENTES

### BLOQUE 2B — COMPLETADO
- Etapa 9: Panel administrativo con casos autorizados, filtros, clientes visibles y navegación interna
- Etapa 10: Exportación Excel desde el panel administrativo
- Etapa 13: Centro de notificaciones in-app y avisos server-side
- Gestión de autorizaciones visible para clientes y consulta de autorizaciones activas para administradores
- Controles administrativos de visibilidad y sensibilidad de documentos
- Controles administrativos de visibilidad de gestiones y sus documentos
- Visor detallado de auditoría restringido por el rol administrativo

### BLOQUE FINAL — COMPLETADO
- Análisis jurídico automatizado de 13 elementos con lenguaje preliminar
- Segunda revisión independiente (solo admin autorizado, no sobrescribe análisis)
- Informe integrado combinando todos los datos del caso
- Exportación Word (.doc con identidad LEXACASO y todas las secciones)
- Exportación PDF (jsPDF dinámico, portada navy/dorado, secciones profesionales)
- Pestaña "Análisis" en CaseDetail con 3 sub-pestañas
- Análisis respeta visible_to_client — solo usa documentos y gestiones visibles
- RLS: case_analyses (propietario + admin autorizado), case_analysis_reviews (SOLO admin)
- jsPDF importado dinámicamente (code-splitting, 0 vulnerabilidades)
- Limpieza de políticas duplicadas (migración 018)

### ADMINISTRADOR
- No hay usuarios registrados todavía
- FALTA UUID DEL PRIMER ADMINISTRADOR — asignar tras registro con: UPDATE profiles SET role='admin' WHERE id='<uuid>'

---

## PRÓXIMO BLOQUE RECOMENDADO

**NINGUNO** — LEXACASO está listo para publicación. Pendiente: asignar primer admin.

---

## CONFIRMACIÓN

**BLOQUE 1 COMPLETADO. BLOQUE 2A COMPLETADO. BLOQUE 2B COMPLETADO. BLOQUE FINAL COMPLETADO.**
