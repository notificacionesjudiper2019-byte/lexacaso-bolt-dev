/*
# Caso: análisis jurídico, segunda revisión e informe integrado

1. Nuevas tablas
- `case_analyses`: guarda el análisis inicial y el informe integrado asociados a un caso.
  `case_id` identifica el caso, `user_id` identifica a su propietario, `initial_analysis`
  contiene únicamente información derivada de los datos permitidos del caso y
  `integrated_report` contiene una versión segura para revisión humana.
- `case_analysis_reviews`: guarda la segunda revisión independiente en una tabla
  separada para que las observaciones administrativas no queden expuestas al cliente.

2. Seguridad
- Ambas tablas tienen RLS habilitado.
- El propietario del caso puede consultar el análisis y el informe integrado propios.
- Un administrador solo puede consultar o modificar información de casos con
  autorización activa en `case_authorizations`.
- La segunda revisión solo está disponible para administradores autorizados.
- No se conceden accesos a `anon`; todas las políticas requieren autenticación.

3. Integridad
- Cada caso puede tener un único análisis y una única segunda revisión mediante
  índices únicos.
- Las relaciones usan claves foráneas hacia `cases` y `auth.users`.
- Los valores JSON se guardan como evidencia estructurada, sin inventar hechos,
  documentos, normas o fechas.
*/

CREATE TABLE IF NOT EXISTS public.case_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrated_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.case_analysis_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  second_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_analysis_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_case_analyses_user_id ON public.case_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_case_analysis_reviews_user_id ON public.case_analysis_reviews(user_id);

DROP POLICY IF EXISTS "select_own_or_authorized_case_analyses" ON public.case_analyses;
CREATE POLICY "select_own_or_authorized_case_analyses" ON public.case_analyses FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_analyses.case_id AND c.user_id = auth.uid())
  OR (public.is_admin() AND EXISTS (
    SELECT 1 FROM public.case_authorizations ca
    WHERE ca.case_id = case_analyses.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
  ))
);

DROP POLICY IF EXISTS "insert_own_or_authorized_case_analyses" ON public.case_analyses;
CREATE POLICY "insert_own_or_authorized_case_analyses" ON public.case_analyses FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_analyses.case_id AND c.user_id = case_analyses.user_id)
  AND (
    auth.uid() = case_analyses.user_id
    OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.case_authorizations ca
      WHERE ca.case_id = case_analyses.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
    ))
  )
);

DROP POLICY IF EXISTS "update_own_or_authorized_case_analyses" ON public.case_analyses;
CREATE POLICY "update_own_or_authorized_case_analyses" ON public.case_analyses FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_analyses.case_id AND c.user_id = case_analyses.user_id)
  AND (
    auth.uid() = case_analyses.user_id
    OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.case_authorizations ca
      WHERE ca.case_id = case_analyses.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
    ))
  )
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_analyses.case_id AND c.user_id = case_analyses.user_id)
  AND (
    auth.uid() = case_analyses.user_id
    OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.case_authorizations ca
      WHERE ca.case_id = case_analyses.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
    ))
  )
);

DROP POLICY IF EXISTS "delete_own_or_authorized_case_analyses" ON public.case_analyses;
CREATE POLICY "delete_own_or_authorized_case_analyses" ON public.case_analyses FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_analyses.case_id AND c.user_id = case_analyses.user_id)
  AND (
    auth.uid() = case_analyses.user_id
    OR (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.case_authorizations ca
      WHERE ca.case_id = case_analyses.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
    ))
  )
);

DROP POLICY IF EXISTS "select_authorized_case_analysis_reviews" ON public.case_analysis_reviews;
CREATE POLICY "select_authorized_case_analysis_reviews" ON public.case_analysis_reviews FOR SELECT
TO authenticated USING (
  public.is_admin() AND EXISTS (
    SELECT 1 FROM public.case_authorizations ca
    WHERE ca.case_id = case_analysis_reviews.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "insert_authorized_case_analysis_reviews" ON public.case_analysis_reviews;
CREATE POLICY "insert_authorized_case_analysis_reviews" ON public.case_analysis_reviews FOR INSERT
TO authenticated WITH CHECK (
  public.is_admin()
  AND EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_analysis_reviews.case_id AND c.user_id = case_analysis_reviews.user_id)
  AND EXISTS (
    SELECT 1 FROM public.case_authorizations ca
    WHERE ca.case_id = case_analysis_reviews.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
  )
  AND reviewed_by = auth.uid()
);

DROP POLICY IF EXISTS "update_authorized_case_analysis_reviews" ON public.case_analysis_reviews;
CREATE POLICY "update_authorized_case_analysis_reviews" ON public.case_analysis_reviews FOR UPDATE
TO authenticated USING (
  public.is_admin() AND EXISTS (
    SELECT 1 FROM public.case_authorizations ca
    WHERE ca.case_id = case_analysis_reviews.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
  )
) WITH CHECK (
  public.is_admin() AND reviewed_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.case_authorizations ca
    WHERE ca.case_id = case_analysis_reviews.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "delete_authorized_case_analysis_reviews" ON public.case_analysis_reviews;
CREATE POLICY "delete_authorized_case_analysis_reviews" ON public.case_analysis_reviews FOR DELETE
TO authenticated USING (
  public.is_admin() AND EXISTS (
    SELECT 1 FROM public.case_authorizations ca
    WHERE ca.case_id = case_analysis_reviews.case_id AND ca.user_id = auth.uid() AND ca.revoked_at IS NULL
  )
);