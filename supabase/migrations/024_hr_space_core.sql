-- ============================================================
-- HR Space — tenant-scoped employees, hiring, qualifications,
-- goals, reviews, documents, training, workforce, onboarding, attendance
-- Mirrors frontend hrSpaceStore; app sync layer can be added later.
-- ============================================================

-- Per-company monotonic employee number sequence (EMP-00001 …)
CREATE TABLE IF NOT EXISTS public.hr_company_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  next_employee_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.hr_company_settings IS
  'HR counters per tenant; next_employee_seq incremented when issuing employee_number.';

DROP TRIGGER IF EXISTS update_hr_company_settings_updated_at ON public.hr_company_settings;
CREATE TRIGGER update_hr_company_settings_updated_at
  BEFORE UPDATE ON public.hr_company_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Open roles (hiring)
CREATE TABLE IF NOT EXISTS public.hr_open_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
  filled_by_employee_id UUID,
  filled_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_positions_company ON public.hr_open_positions (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_status ON public.hr_open_positions (company_id, status);

DROP TRIGGER IF EXISTS update_hr_open_positions_updated_at ON public.hr_open_positions;
CREATE TRIGGER update_hr_open_positions_updated_at
  BEFORE UPDATE ON public.hr_open_positions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Candidates / CV pipeline (file lives in storage; store path in metadata)
CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.hr_open_positions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  cv_file_name TEXT NOT NULL DEFAULT '',
  cv_summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'screening', 'offer', 'hired', 'rejected')),
  linked_employee_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_candidates_company ON public.hr_candidates (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_position ON public.hr_candidates (position_id);

DROP TRIGGER IF EXISTS update_hr_candidates_updated_at ON public.hr_candidates;
CREATE TRIGGER update_hr_candidates_updated_at
  BEFORE UPDATE ON public.hr_candidates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Employees (authoritative record for EMP-* numbers)
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,
  legacy_client_key TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  role_title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  hire_date DATE,
  hired_from_candidate_id UUID REFERENCES public.hr_candidates(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, employee_number),
  UNIQUE (company_id, legacy_client_key)
);

CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON public.hr_employees (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_dept ON public.hr_employees (company_id, department);

ALTER TABLE public.hr_candidates
  DROP CONSTRAINT IF EXISTS hr_candidates_linked_employee_id_fkey;
ALTER TABLE public.hr_candidates
  ADD CONSTRAINT hr_candidates_linked_employee_id_fkey
  FOREIGN KEY (linked_employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;

ALTER TABLE public.hr_open_positions
  DROP CONSTRAINT IF EXISTS hr_open_positions_filled_by_fkey;
ALTER TABLE public.hr_open_positions
  ADD CONSTRAINT hr_open_positions_filled_by_fkey
  FOREIGN KEY (filled_by_employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS update_hr_employees_updated_at ON public.hr_employees;
CREATE TRIGGER update_hr_employees_updated_at
  BEFORE UPDATE ON public.hr_employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Qualification catalog + star ratings
CREATE TABLE IF NOT EXISTS public.hr_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_hr_qualifications_company ON public.hr_qualifications (company_id, sort_order);

CREATE TABLE IF NOT EXISTS public.hr_employee_qualification_ratings (
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  qualification_id UUID NOT NULL REFERENCES public.hr_qualifications(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, qualification_id)
);

-- Denormalized department labels (optional list for filters)
CREATE TABLE IF NOT EXISTS public.hr_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_hr_departments_company ON public.hr_departments (company_id);

CREATE TABLE IF NOT EXISTS public.hr_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  target_date DATE,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'Not Started',
  priority TEXT NOT NULL DEFAULT 'Medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_goals_company ON public.hr_goals (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_goals_employee ON public.hr_goals (employee_id);

DROP TRIGGER IF EXISTS update_hr_goals_updated_at ON public.hr_goals;
CREATE TRIGGER update_hr_goals_updated_at
  BEFORE UPDATE ON public.hr_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Performance reviews / dialogue (full structured payload)
CREATE TABLE IF NOT EXISTS public.hr_performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  reviewer TEXT NOT NULL DEFAULT '',
  review_type TEXT NOT NULL DEFAULT 'Annual',
  status TEXT NOT NULL DEFAULT 'Scheduled',
  record JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_reviews_company ON public.hr_performance_reviews (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_reviews_employee ON public.hr_performance_reviews (employee_id);

DROP TRIGGER IF EXISTS update_hr_performance_reviews_updated_at ON public.hr_performance_reviews;
CREATE TRIGGER update_hr_performance_reviews_updated_at
  BEFORE UPDATE ON public.hr_performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  date_created DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  expiry_date DATE,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  storage_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_documents_company ON public.hr_documents (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_documents_employee ON public.hr_documents (employee_id);

DROP TRIGGER IF EXISTS update_hr_documents_updated_at ON public.hr_documents;
CREATE TRIGGER update_hr_documents_updated_at
  BEFORE UPDATE ON public.hr_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  completed_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'Planned',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_training_company ON public.hr_training_records (company_id);

DROP TRIGGER IF EXISTS update_hr_training_records_updated_at ON public.hr_training_records;
CREATE TRIGGER update_hr_training_records_updated_at
  BEFORE UPDATE ON public.hr_training_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_workforce_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  target_headcount INTEGER NOT NULL DEFAULT 0,
  current_assigned INTEGER NOT NULL DEFAULT 0,
  shift_model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_workforce_company ON public.hr_workforce_plans (company_id);

DROP TRIGGER IF EXISTS update_hr_workforce_plans_updated_at ON public.hr_workforce_plans;
CREATE TRIGGER update_hr_workforce_plans_updated_at
  BEFORE UPDATE ON public.hr_workforce_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_onboarding_company ON public.hr_onboarding_tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_employee ON public.hr_onboarding_tasks (employee_id);

DROP TRIGGER IF EXISTS update_hr_onboarding_tasks_updated_at ON public.hr_onboarding_tasks;
CREATE TRIGGER update_hr_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.hr_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.hr_attendance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'present'
    CHECK (entry_type IN ('present', 'absent', 'leave', 'overtime')),
  hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_attendance_company ON public.hr_attendance_entries (company_id);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee_date ON public.hr_attendance_entries (employee_id, entry_date);

DROP TRIGGER IF EXISTS update_hr_attendance_entries_updated_at ON public.hr_attendance_entries;
CREATE TRIGGER update_hr_attendance_entries_updated_at
  BEFORE UPDATE ON public.hr_attendance_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS (tenant isolation; writes restricted to manager+ / admin rules) ──

ALTER TABLE public.hr_company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_open_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employee_qualification_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_workforce_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance_entries ENABLE ROW LEVEL SECURITY;

-- HR write roles: superadmin, admin, manager (align with Premium HR Space in app)
CREATE OR REPLACE FUNCTION public.hr_can_write()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('superadmin', 'admin', 'manager')
$$;

CREATE OR REPLACE FUNCTION public.hr_can_delete()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('superadmin', 'admin', 'manager')
$$;

-- hr_company_settings
DROP POLICY IF EXISTS "hr_settings_select" ON public.hr_company_settings;
DROP POLICY IF EXISTS "hr_settings_write" ON public.hr_company_settings;
CREATE POLICY "hr_settings_select" ON public.hr_company_settings FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'));
CREATE POLICY "hr_settings_write" ON public.hr_company_settings FOR ALL
  USING (company_id = public.get_my_company_id() AND public.hr_can_write())
  WITH CHECK (company_id = public.get_my_company_id() AND public.hr_can_write());

-- Generic policies per table (pattern)
DO $pol$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'hr_open_positions',
    'hr_candidates',
    'hr_employees',
    'hr_qualifications',
    'hr_departments',
    'hr_goals',
    'hr_performance_reviews',
    'hr_documents',
    'hr_training_records',
    'hr_workforce_plans',
    'hr_onboarding_tasks',
    'hr_attendance_entries'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "hr_sel_%s" ON public.%I', replace(t, 'hr_', ''), t);
    EXECUTE format('DROP POLICY IF EXISTS "hr_ins_%s" ON public.%I', replace(t, 'hr_', ''), t);
    EXECUTE format('DROP POLICY IF EXISTS "hr_upd_%s" ON public.%I', replace(t, 'hr_', ''), t);
    EXECUTE format('DROP POLICY IF EXISTS "hr_del_%s" ON public.%I', replace(t, 'hr_', ''), t);

    EXECUTE format($f$
      CREATE POLICY "hr_sel_%1$s" ON public.%2$I FOR SELECT
      USING (company_id = public.get_my_company_id() OR public.get_my_role() IN (''superadmin'', ''auditor_external''))
    $f$, replace(t, 'hr_', ''), t);

    EXECUTE format($f$
      CREATE POLICY "hr_ins_%1$s" ON public.%2$I FOR INSERT
      WITH CHECK (company_id = public.get_my_company_id() AND public.hr_can_write())
    $f$, replace(t, 'hr_', ''), t);

    EXECUTE format($f$
      CREATE POLICY "hr_upd_%1$s" ON public.%2$I FOR UPDATE
      USING (company_id = public.get_my_company_id() AND public.hr_can_write())
      WITH CHECK (company_id = public.get_my_company_id() AND public.hr_can_write())
    $f$, replace(t, 'hr_', ''), t);

    EXECUTE format($f$
      CREATE POLICY "hr_del_%1$s" ON public.%2$I FOR DELETE
      USING (company_id = public.get_my_company_id() AND public.hr_can_delete())
    $f$, replace(t, 'hr_', ''), t);
  END LOOP;
END
$pol$;

-- Ratings: no company_id column — policy via employee join
DROP POLICY IF EXISTS "hr_ratings_select" ON public.hr_employee_qualification_ratings;
DROP POLICY IF EXISTS "hr_ratings_ins" ON public.hr_employee_qualification_ratings;
DROP POLICY IF EXISTS "hr_ratings_upd" ON public.hr_employee_qualification_ratings;
DROP POLICY IF EXISTS "hr_ratings_del" ON public.hr_employee_qualification_ratings;

CREATE POLICY "hr_ratings_select" ON public.hr_employee_qualification_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hr_employees e
      WHERE e.id = employee_id
        AND (e.company_id = public.get_my_company_id() OR public.get_my_role() IN ('superadmin', 'auditor_external'))
    )
  );

CREATE POLICY "hr_ratings_ins" ON public.hr_employee_qualification_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hr_employees e
      WHERE e.id = employee_id AND e.company_id = public.get_my_company_id() AND public.hr_can_write()
    )
  );

CREATE POLICY "hr_ratings_upd" ON public.hr_employee_qualification_ratings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.hr_employees e
      WHERE e.id = employee_id AND e.company_id = public.get_my_company_id() AND public.hr_can_write()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hr_employees e
      WHERE e.id = employee_id AND e.company_id = public.get_my_company_id() AND public.hr_can_write()
    )
  );

CREATE POLICY "hr_ratings_del" ON public.hr_employee_qualification_ratings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.hr_employees e
      WHERE e.id = employee_id AND e.company_id = public.get_my_company_id() AND public.hr_can_delete()
    )
  );

COMMENT ON TABLE public.hr_employees IS 'HR directory; employee_number unique per company (EMP-#####).';
COMMENT ON TABLE public.hr_candidates IS 'Applicants; link to hr_open_positions; linked_employee_id after hire.';
COMMENT ON TABLE public.hr_performance_reviews IS 'Stores flexible review payload in record JSONB (dialogue UI).';

NOTIFY pgrst, 'reload schema';
