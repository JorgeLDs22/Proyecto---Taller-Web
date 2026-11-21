INSERT INTO public.profiles (id, role, full_name, institutional_code)
SELECT users.id, demo.role, demo.full_name, demo.institutional_code
FROM auth.users AS users
JOIN (VALUES
  ('demo.docente01@unip.edu.pe', 'docente', 'Docente Demo 01', 'DOC-202601'),
  ('demo.docente02@unip.edu.pe', 'docente', 'Docente Demo 02', 'DOC-202602'),
  ('demo.docente03@unip.edu.pe', 'docente', 'Docente Demo 03', 'DOC-202603'),
  ('demo.alumno01@unip.edu.pe', 'alumno', 'Alumno Demo 01', 'EST-202601'),
  ('demo.alumno02@unip.edu.pe', 'alumno', 'Alumno Demo 02', 'EST-202602'),
  ('demo.alumno03@unip.edu.pe', 'alumno', 'Alumno Demo 03', 'EST-202603'),
  ('demo.alumno04@unip.edu.pe', 'alumno', 'Alumno Demo 04', 'EST-202604'),
  ('demo.alumno05@unip.edu.pe', 'alumno', 'Alumno Demo 05', 'EST-202605'),
  ('demo.alumno06@unip.edu.pe', 'alumno', 'Alumno Demo 06', 'EST-202606'),
  ('demo.alumno07@unip.edu.pe', 'alumno', 'Alumno Demo 07', 'EST-202607'),
  ('demo.alumno08@unip.edu.pe', 'alumno', 'Alumno Demo 08', 'EST-202608'),
  ('demo.alumno09@unip.edu.pe', 'alumno', 'Alumno Demo 09', 'EST-202609'),
  ('demo.alumno10@unip.edu.pe', 'alumno', 'Alumno Demo 10', 'EST-202610')
) AS demo(email, role, full_name, institutional_code)
  ON lower(users.email) = demo.email
WHERE (
  SELECT count(*)
  FROM auth.users
  WHERE lower(email) IN (
    'demo.docente01@unip.edu.pe', 'demo.docente02@unip.edu.pe', 'demo.docente03@unip.edu.pe',
    'demo.alumno01@unip.edu.pe', 'demo.alumno02@unip.edu.pe', 'demo.alumno03@unip.edu.pe',
    'demo.alumno04@unip.edu.pe', 'demo.alumno05@unip.edu.pe', 'demo.alumno06@unip.edu.pe',
    'demo.alumno07@unip.edu.pe', 'demo.alumno08@unip.edu.pe', 'demo.alumno09@unip.edu.pe',
    'demo.alumno10@unip.edu.pe'
  )
) = 13
RETURNING institutional_code;
