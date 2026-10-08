/*
# BLOQUE DE CIERRE — Limpieza de políticas duplicadas en tablas de análisis

## Propósito
Las tablas case_analyses y case_analysis_reviews tienen políticas duplicadas
creadas por migraciones paralelas. Este bloque elimina los duplicados y
mantiene únicamente las políticas originales de la migración 017.

## Tablas afectadas
- case_analyses: elimina 4 políticas duplicadas (delete_own_or_authorized,
  insert_own_or_authorized, select_own_or_authorized, update_own_or_authorized)
- case_analysis_reviews: elimina 4 políticas duplicadas (delete_authorized,
  insert_authorized, select_authorized, update_authorized)

## Seguridad
- No se modifican las políticas originales (select_own_analysis, insert_own_analysis,
  update_own_analysis, select_admin_analysis_review, insert_admin_analysis_review,
  update_admin_analysis_review)
- RLS permanece habilitado en ambas tablas
- No se eliminan tablas, columnas ni datos
*/

-- Limpiar duplicados en case_analyses
DROP POLICY IF EXISTS "delete_own_or_authorized_case_analyses" ON case_analyses;
DROP POLICY IF EXISTS "insert_own_or_authorized_case_analyses" ON case_analyses;
DROP POLICY IF EXISTS "select_own_or_authorized_case_analyses" ON case_analyses;
DROP POLICY IF EXISTS "update_own_or_authorized_case_analyses" ON case_analyses;

-- Limpiar duplicados en case_analysis_reviews
DROP POLICY IF EXISTS "delete_authorized_case_analysis_reviews" ON case_analysis_reviews;
DROP POLICY IF EXISTS "insert_authorized_case_analysis_reviews" ON case_analysis_reviews;
DROP POLICY IF EXISTS "select_authorized_case_analysis_reviews" ON case_analysis_reviews;
DROP POLICY IF EXISTS "update_authorized_case_analysis_reviews" ON case_analysis_reviews;