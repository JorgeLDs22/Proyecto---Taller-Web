CREATE TABLE public.curriculum_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_program_id UUID NOT NULL REFERENCES public.academic_programs(id) ON DELETE CASCADE,
  course_code TEXT NOT NULL CHECK (char_length(btrim(course_code)) BETWEEN 2 AND 32),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  cycle SMALLINT NOT NULL CHECK (cycle BETWEEN 1 AND 20),
  credits NUMERIC(4, 1) CHECK (credits IS NULL OR credits > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_program_id, course_code)
);

CREATE INDEX curriculum_courses_program_cycle_idx
  ON public.curriculum_courses (academic_program_id, cycle, display_order);

ALTER TABLE public.curriculum_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY curriculum_courses_select_published_program ON public.curriculum_courses
  FOR SELECT TO anon, authenticated
  USING (
    is_published
    AND EXISTS (
      SELECT 1
      FROM public.academic_programs AS programs
      WHERE programs.id = academic_program_id
        AND programs.is_published
    )
  );

REVOKE ALL ON public.curriculum_courses FROM anon, authenticated;
GRANT SELECT ON public.curriculum_courses TO anon, authenticated;