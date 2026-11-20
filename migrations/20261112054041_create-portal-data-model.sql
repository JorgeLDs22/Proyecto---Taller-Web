CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('alumno', 'docente')),
  full_name TEXT NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.academic_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 140),
  category TEXT,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (char_length(btrim(code)) BETWEEN 2 AND 32),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  description TEXT NOT NULL DEFAULT '',
  term TEXT,
  academic_program_id UUID REFERENCES public.academic_programs(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 180),
  description TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 180),
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL CHECK (url ~* '^https?://'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admission_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (char_length(btrim(email)) BETWEEN 3 AND 254),
  phone TEXT CHECK (phone IS NULL OR char_length(btrim(phone)) <= 30),
  program_interest UUID REFERENCES public.academic_programs(id) ON DELETE SET NULL,
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 2 AND 2000),
  consent BOOLEAN NOT NULL CHECK (consent),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX courses_teacher_id_idx ON public.courses (teacher_id);
CREATE INDEX courses_program_id_idx ON public.courses (academic_program_id);
CREATE INDEX enrollments_student_id_idx ON public.enrollments (student_id);
CREATE INDEX enrollments_course_id_idx ON public.enrollments (course_id);
CREATE INDEX assignments_course_due_idx ON public.assignments (course_id, due_at);
CREATE INDEX resources_course_id_idx ON public.resources (course_id);
CREATE INDEX admission_contacts_created_at_idx ON public.admission_contacts (created_at DESC);

CREATE FUNCTION public.is_course_teacher(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses AS c
    JOIN public.profiles AS p ON p.id = c.teacher_id
    WHERE c.id = target_course_id
      AND c.teacher_id = (SELECT auth.uid())
      AND p.role = 'docente'
  );
$$;

CREATE FUNCTION public.is_enrolled_student(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments AS e
    JOIN public.profiles AS p ON p.id = e.student_id
    WHERE e.course_id = target_course_id
      AND e.student_id = (SELECT auth.uid())
      AND p.role = 'alumno'
  );
$$;

CREATE FUNCTION public.can_enroll_in_course(target_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses AS c
    JOIN public.profiles AS p ON p.id = (SELECT auth.uid())
    WHERE c.id = target_course_id
      AND c.is_published
      AND p.role = 'alumno'
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY academic_programs_select_published ON public.academic_programs
  FOR SELECT TO anon, authenticated
  USING (is_published);

CREATE POLICY courses_select_published_or_member ON public.courses
  FOR SELECT TO authenticated
  USING (
    is_published
    OR public.is_course_teacher(id)
    OR public.is_enrolled_student(id)
  );

CREATE POLICY enrollments_select_self_or_teacher ON public.enrollments
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.is_course_teacher(course_id)
  );

CREATE POLICY enrollments_insert_self ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.can_enroll_in_course(course_id)
  );

CREATE POLICY assignments_select_course_member ON public.assignments
  FOR SELECT TO authenticated
  USING (
    public.is_course_teacher(course_id)
    OR public.is_enrolled_student(course_id)
  );

CREATE POLICY assignments_insert_course_teacher ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_course_teacher(course_id));

CREATE POLICY assignments_update_course_teacher ON public.assignments
  FOR UPDATE TO authenticated
  USING (public.is_course_teacher(course_id))
  WITH CHECK (public.is_course_teacher(course_id));

CREATE POLICY assignments_delete_course_teacher ON public.assignments
  FOR DELETE TO authenticated
  USING (public.is_course_teacher(course_id));

CREATE POLICY resources_select_course_member ON public.resources
  FOR SELECT TO authenticated
  USING (
    public.is_course_teacher(course_id)
    OR public.is_enrolled_student(course_id)
  );

CREATE POLICY resources_insert_course_teacher ON public.resources
  FOR INSERT TO authenticated
  WITH CHECK (public.is_course_teacher(course_id));

CREATE POLICY resources_update_course_teacher ON public.resources
  FOR UPDATE TO authenticated
  USING (public.is_course_teacher(course_id))
  WITH CHECK (public.is_course_teacher(course_id));

CREATE POLICY resources_delete_course_teacher ON public.resources
  FOR DELETE TO authenticated
  USING (public.is_course_teacher(course_id));

CREATE POLICY admission_contacts_insert_public ON public.admission_contacts
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(btrim(full_name)) BETWEEN 2 AND 120
    AND char_length(btrim(email)) BETWEEN 3 AND 254
    AND char_length(btrim(message)) BETWEEN 2 AND 2000
    AND consent
  );

REVOKE ALL ON public.profiles, public.academic_programs, public.courses,
  public.enrollments, public.assignments, public.resources,
  public.admission_contacts FROM anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.academic_programs TO anon, authenticated;
GRANT SELECT ON public.profiles, public.courses, public.enrollments,
  public.assignments, public.resources TO authenticated;
GRANT INSERT ON public.enrollments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.assignments, public.resources TO authenticated;
GRANT INSERT ON public.admission_contacts TO anon, authenticated;

REVOKE ALL ON FUNCTION public.is_course_teacher(UUID),
  public.is_enrolled_student(UUID),
  public.can_enroll_in_course(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_course_teacher(UUID),
  public.is_enrolled_student(UUID),
  public.can_enroll_in_course(UUID) TO authenticated;