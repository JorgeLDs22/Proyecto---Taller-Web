# AGENTS.md

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **UNIP** (API base `https://3y7dkmgq.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** the static frontend uses the public anon key from `js/insforge-config.js`; never put an admin key there. The CLI reads `.insforge/project.json`. Never commit credentials.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->

## Estructura del portal

- `index.html`: portal institucional y secciones de presentación, carreras, malla referencial y admisión.
- `login.html`: acceso visual para alumnos y docentes.
- `assets/css/`: estilos separados para el portal y la intranet.
- `assets/img/`: imágenes corporativas.
- `js/main.js`: navegación, lectura del catálogo y la malla, envío de consultas de admisión, autenticación y datos de la intranet con InsForge.
- `js/insforge-config.js`: URL del proyecto y clave pública (anon key). La clave es pública para el navegador; nunca colocar aquí una clave administrativa.
- `migrations/`: cambios versionados del esquema InsForge; aplicarlos con la CLI antes de desplegar cambios de frontend dependientes.

El modelo InsForge usa `profiles` (rol enlazado a `auth.users`), `academic_programs` y `curriculum_courses` para el portal, y `courses`, `enrollments`, `assignments` y `resources` para la intranet. `admission_contacts` acepta consultas sin exponer los datos personales para lectura pública.

La selección de alumno/docente en el formulario es solo una etiqueta de interfaz. Tras autenticar, el cliente compara el rol con el perfil propio; las políticas RLS también limitan cursos, tareas y recursos por perfil y matrícula. La creación y asignación del rol del perfil se hace por personal administrador, nunca desde el formulario público.

No publicar programas o mallas referenciales como si fueran oficiales. Ingresar datos institucionales verificados en InsForge y marcar `is_published = true` para mostrarlos. Para entornos nuevos, cargar primero la migración y luego asignar perfiles institucionales y contenidos oficiales.
