ALTER TABLE public.profiles
  ADD COLUMN institutional_code TEXT;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_institutional_code_unique UNIQUE (institutional_code),
  ADD CONSTRAINT profiles_institutional_code_role_check CHECK (
    (role = 'docente' AND institutional_code ~ '^DOC-[A-Z0-9-]+$')
    OR (role = 'alumno' AND institutional_code ~ '^EST-[A-Z0-9-]+$')
  );

ALTER TABLE public.profiles
  ALTER COLUMN institutional_code SET NOT NULL;

ALTER TABLE public.assignments
  ADD COLUMN week_number SMALLINT NOT NULL DEFAULT 1 CHECK (week_number BETWEEN 1 AND 20);

ALTER TABLE public.resources
  ADD COLUMN week_number SMALLINT NOT NULL DEFAULT 1 CHECK (week_number BETWEEN 1 AND 20),
  ADD COLUMN file_key TEXT;

CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (char_length(btrim(file_name)) BETWEEN 1 AND 255),
  file_key TEXT NOT NULL,
  file_url TEXT NOT NULL CHECK (file_url ~* '^https?://'),
  grade NUMERIC(4, 1) CHECK (grade IS NULL OR grade BETWEEN 0 AND 20),
  feedback TEXT NOT NULL DEFAULT '' CHECK (char_length(feedback) <= 500),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assignment_submissions_course_submitted_idx
  ON public.assignment_submissions (course_id, submitted_at DESC);
CREATE INDEX assignment_submissions_student_idx
  ON public.assignment_submissions (student_id, submitted_at DESC);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_course_students ON public.profiles
  FOR SELECT TO authenticated
  USING (
    role = 'alumno'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments AS e
      WHERE e.student_id = profiles.id
        AND public.is_course_teacher(e.course_id)
    )
  );

CREATE POLICY assignment_submissions_select_student_or_teacher ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    OR public.is_course_teacher(course_id)
  );

CREATE POLICY assignment_submissions_insert_enrolled_student ON public.assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.is_enrolled_student(course_id)
    AND EXISTS (
      SELECT 1
      FROM public.assignments AS a
      WHERE a.id = assignment_id
        AND a.course_id = assignment_submissions.course_id
    )
  );

CREATE POLICY assignment_submissions_update_course_teacher ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (public.is_course_teacher(course_id))
  WITH CHECK (public.is_course_teacher(course_id));

REVOKE ALL ON public.assignment_submissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.assignment_submissions TO authenticated;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

CREATE POLICY storage_objects_unip_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    (
      bucket <> 'course-files'
      AND (
        uploaded_by = (SELECT auth.jwt() ->> 'sub')
        OR (SELECT storage.public_buckets()) @> ARRAY[bucket]
      )
    )
    OR (
      bucket = 'course-files'
      AND CASE
        WHEN (storage.foldername(key))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (
            CASE
              WHEN (storage.foldername(key))[3] = 'materials'
                THEN public.is_course_teacher(((storage.foldername(key))[1])::uuid)
                  OR public.is_enrolled_student(((storage.foldername(key))[1])::uuid)
              WHEN (storage.foldername(key))[3] = 'submissions'
                THEN public.is_course_teacher(((storage.foldername(key))[1])::uuid)
                  OR (
                    (storage.foldername(key))[2] = (SELECT auth.uid())::text
                    AND public.is_enrolled_student(((storage.foldername(key))[1])::uuid)
                  )
              ELSE false
            END
          )
        ELSE false
      END
    )
  );

CREATE POLICY storage_objects_unip_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.jwt() ->> 'sub')
    AND (
      (
        bucket <> 'course-files'
      )
      OR (
        bucket = 'course-files'
        AND CASE
          WHEN (storage.foldername(key))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN (
              CASE
                WHEN (storage.foldername(key))[3] = 'materials'
                  THEN public.is_course_teacher(((storage.foldername(key))[1])::uuid)
                    AND (storage.foldername(key))[2] = (SELECT auth.uid())::text
                WHEN (storage.foldername(key))[3] = 'submissions'
                  THEN (storage.foldername(key))[2] = (SELECT auth.uid())::text
                    AND public.is_enrolled_student(((storage.foldername(key))[1])::uuid)
                ELSE false
              END
            )
          ELSE false
        END
      )
    )
  );

CREATE POLICY storage_objects_unip_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket <> 'course-files'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    bucket <> 'course-files'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY storage_objects_unip_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket <> 'course-files'
    AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
  );

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;