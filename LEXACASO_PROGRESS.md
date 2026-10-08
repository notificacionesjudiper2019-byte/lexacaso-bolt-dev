# LEXACASO — PROGRESS TRACKER

**Fecha:** 2026-10-08
**Proyecto:** casos-privados (LEXACASO)
**Entorno:** Bolt + Supabase + React + Vite

---

## BLOQUES EJECUTADOS

### BLOQUE 1 — Etapas 4b, 5, 6, 7 + Módulo de Seguimiento — COMPLETADO

---

## ARCHIVOS MODIFICADOS

| Archivo | Descripción |
|---|---|
| `src/main.jsx` | Reescrito completo: catálogo jurídico con 14 categorías + subcategorías encadenadas, sección de términos y vencimientos, vista de detalle de caso (CaseDetail) con 3 pestañas, módulo de seguimiento (FollowupTab) con timeline, botón de WhatsApp, descarga de documentos mediante URL firmada |
| `src/styles.css` | Añadidos estilos para: vista de detalle, tarjetas de información, grid de detalle, lista de documentos, timeline de seguimiento, badges de estado, botón flotante de WhatsApp con tooltip, responsive mobile |

---

## MIGRACIONES CREADAS

| # | Nombre | Descripción |
|---|---|---|
| 7 | `007_add_deadline_columns_to_cases` | Añade 4 columnas: `has_deadline`, `term_duration`, `term_start_date`, `term_end_date` |
| 8 | `008_add_visible_to_client_to_documents` | Añade `visible_to_client` boolean NOT NULL DEFAULT true a `case_documents` |
| 9 | `009_create_case_actions_table` | Crea tabla `case_actions` con RLS (4 políticas) |
| 10 | `010_create_action_documents_table` | Crea tabla `action_documents` con RLS (4 políticas) |

---

## TABLAS EN LA BASE DE DATOS

| Tabla | RLS | Políticas | Propósito |
|---|---|---|---|
| `cases` | Habilitada | 4 (CRUD propio) | Casos del usuario |
| `case_documents` | Habilitada | 4 (CRUD propio) | Documentos de casos |
| `profiles` | Habilitada | 4 (CRUD propio) | Perfiles de usuario |
| `case_actions` | Habilitada | 4 (CRUD propio + visible_to_client en SELECT) | Gestiones/seguimiento |
| `action_documents` | Habilitada | 4 (CRUD propio + visible_to_client en SELECT) | Documentos de gestiones |

---

## COLUMNAS DE `cases` (28 total)

**Originales (8):** id, user_id, title, facts, status, priority, created_at, updated_at
**Etapa 4 (16):** acting_as, representative_relationship, represented_person_name, represented_person_cedula, represented_person_phone, represented_person_address, legal_category, legal_subcategory, department, municipality, authority_type, authority_name, entity, dependency, case_number, document_type_received
**Etapa 5 (4):** has_deadline, term_duration, term_start_date, term_end_date

---

## COLUMNAS NUEVAS EN `case_documents`

- `visible_to_client` boolean NOT NULL DEFAULT true — diferencia documentos visibles de internos

---

## RLS — SEGURIDAD VERIFICADA

### cases
- SELECT/INSERT/UPDATE/DELETE: `auth.uid() = user_id` — el usuario solo accede a sus propios casos

### case_documents
- SELECT/INSERT/UPDATE/DELETE: `auth.uid() = user_id AND EXISTS(cases.user_id = auth.uid())` — documentos solo de propios casos

### case_actions (gestiones)
- SELECT: `visible_to_client = true AND EXISTS(cases.user_id = auth.uid())` — cliente solo ve gestiones visibles de sus casos
- INSERT/UPDATE/DELETE: `EXISTS(cases.user_id = auth.uid())` — propietario del caso puede gestionar

### action_documents
- SELECT: `visible_to_client = true AND EXISTS(case_actions.visible_to_client = true AND cases.user_id = auth.uid())` — triple verificación: documento visible + gestión visible + caso propio
- INSERT/UPDATE/DELETE: `EXISTS(cases.user_id = auth.uid())` — propietario del caso

### Security Advisor: 0 findings

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

1. **Catálogo jurídico completo** con 14 categorías, subcategorías encadenadas, validación
2. **Términos y vencimientos** con Sí/No/No sé, duración predefinida + custom, cálculo automático de fecha límite, validación de coherencia
3. **Vista de detalle de caso** (CaseDetail) con 3 pestañas:
   - **Información**: todos los datos del caso en tarjetas (solicitante, categoría, ubicación, proceso, términos, hechos)
   - **Documentos**: listar, descargar (URL firmada temporal 300s), subir, eliminar con confirmación
   - **Seguimiento**: timeline cronológico de gestiones con fecha, tipo, descripción, estado, documentos asociados
4. **Módulo de seguimiento** (FollowupTab):
   - Crear gestión: tipo, título, descripción, fecha, estado, documento adjunto
   - Timeline cronológico con badges de estado
   - Descarga de documentos de gestión mediante URL firmada
   - RLS filtra gestiones y documentos no visibles
5. **Botón flotante de WhatsApp** (+57 310 560 386) con tooltip, visible en todas las pantallas, responsive
6. **visible_to_client** en case_documents y action_documents, enforced por RLS
7. **URLs firmadas temporales** (300 segundos) para descarga — nunca URLs públicas permanentes
8. **Lista de casos mejorada** con categoría, subcategoría, representación, vencimiento, clickable

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

---

## BUILD

```
vite v6.4.4 building for production...
✓ 1619 modules transformados
dist/index.html                   0.73 kB
dist/assets/index-BCPa2FcQ.css   10.79 kB
dist/assets/index-11oLVKZF.js   421.98 kB
✓ built in 26.18s
```

Build exitoso, sin warnings ni errores.

---

## ERRORES ENCONTRADOS Y RESUELTOS

| Error | Solución |
|---|---|
| `Gantt` no exportado por lucide-react | Reemplazado por `Clock` en el import |

---

## DECISIONES ARQUITECTÓNICAS

1. **Catálogo en código frontend** (no en tabla de BD) — más simple, sin migraciones adicionales, fácil de mantener
2. **visible_to_client DEFAULT true en case_documents** — preserva comportamiento existente donde el dueño ve todos sus documentos
3. **visible_to_client DEFAULT false en action_documents** — por seguridad: documentos de gestión son internos por defecto, admin debe explícitamente marcar visibles
4. **URL firmadas de 300 segundos** — balance entre usabilidad y seguridad
5. **case_actions permite INSERT del propietario** — mientras se construye el panel admin, el dueño del caso puede registrar gestiones. El panel admin (Bloque 2) añadirá gestión admin con roles
6. **RLS triple verificación en action_documents** — documento visible + gestión visible + caso propio

---

## FUNCIONALIDADES PENDIENTES (BLOQUES 2 Y 3)

### BLOQUE 2 (NO EJECUTADO)
- Etapa 8: Consentimiento de datos + auditoría base
- Etapa 9: Roles de administrador + panel de gestión admin + auditoría de accesos
- Etapa 10: Exportación Excel de base general de casos
- Etapa 13: Notificaciones in-app + correo al cliente

### BLOQUE 3 (NO EJECUTADO)
- Etapa 11: Análisis jurídico (resumen, cronología, problemas, fuentes, estrategias, segunda revisión)
- Etapa 12: Exportación Word/PDF
- Etapa 14: Identidad visual LEXACASO + pulido final

---

## PRÓXIMO BLOQUE RECOMENDADO

**BLOQUE 2** — Roles de administrador, panel de gestión, consentimiento, auditoría, notificaciones y correo.

---

## CONFIRMACIÓN

**BLOQUE 1 COMPLETADO. BLOQUE 2 NO EJECUTADO.**
