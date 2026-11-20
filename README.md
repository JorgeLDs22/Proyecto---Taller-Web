# 🎓 Portal Web Institucional e Intranet — UNIP
**Universidad Nacional de Innovación Peruana**

Proyecto desarrollado para el curso de **Taller de Programación Web (Sección 34803)** de la Universidad Tecnológica del Perú (UTP). Consiste en una aplicación web moderna, responsiva y dinámica que integra un portal informativo institucional con una Intranet académica funcional conectada a una base de datos en la nube mediante **InsForge (BaaS)**.

---

## 🚀 Características Principales

* **🎨 Tema Claro / Oscuro Persistente:** Selector dinámico en la barra de navegación (`index.html` y `login.html`) implementado con variables CSS (`:root` y `[data-theme="dark"]`) y almacenamiento en `localStorage`.
* **🎠 Carrusel de Carreras y Ventanas Modales:** Exploración interactiva de la oferta académica mediante un carrete horizontal con controles de navegación y ventanas flotantes (modales) accesibles con detalles de cada programa y malla curricular.
* **📂 Acordeones y Recorrido Académico:** Secciones desplegables interactivas para visualizar las etapas formativas (*Formación general*, *Formación especializada* y *Experiencia aplicada*) y el proceso educativo institucional.
* **📝 Proceso de Admisión y Contacto Asíncrono:** Diseño en dos columnas con requisitos indispensables y formulario validado en el cliente que registra consultas en tiempo real en la base de datos sin recargar la página.
* **🔐 Intranet Dual (Alumnos y Docentes):** Módulo de autenticación segura mediante `@insforge/sdk` con verificación de roles (`profiles`) y carga paralela (`Promise.all`) de cursos, tareas y recursos académicos.
* **📱 Diseño 100% Responsivo:** Adaptabilidad completa a dispositivos móviles, tablets y escritorio mediante CSS Grid, Flexbox y Media Queries.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5 Semántico (con atributos ARIA), CSS3 Moderno (Variables globales, Grid, Flexbox) y JavaScript Modular (`ES6+`).
* **Backend-as-a-Service (BaaS):** [InsForge](https://insforge.dev/) (PostgreSQL, Autenticación JWT, Row Level Security - RLS y `@insforge/sdk`).
* **Control de Versiones:** Git y GitHub.

---

## 📁 Estructura del Proyecto

```text
UNIP/
├── assets/
│   ├── css/
│   │   ├── index_styles.css      # Estilos globales, variables de tema y diseño responsivo del portal
│   │   └── login_styles.css      # Estilos de la interfaz de inicio de sesión e Intranet
│   └── img/                      # Recursos gráficos, logotipos y fotografías institucionales
├── js/
│   ├── insforge-config.js        # Parámetros públicos de conexión al entorno InsForge
│   └── main.js                   # Manipulación del DOM, modales, acordeones, validaciones y SDK
├── migrations/
│   ├── 20261112054041_create-portal-data-model.sql   # Esquema relacional base y políticas RLS
│   └── 20261112054355_add-curriculum-courses.sql     # Esquema de asignaturas y mallas curriculares
├── .gitignore                    # Exclusión de archivos locales de entorno
├── AGENTS.md                     # Documentación técnica de integración con InsForge
├── index.html                    # Portal Web Institucional principal
├── login.html                    # Módulo de Autenticación e Intranet Académica
└── README.md                     # Documentación general del repositorio
```

## ⚙️ Instalación y Ejecución Local

1. Clonar el repositorio:
   - git clone [https://github.com/JorgeLDs22/Proyecto---Taller-Web.git](https://github.com/JorgeLDs22/Proyecto---Taller-Web.git)
cd Proyecto---Taller-Web
2. Ejecutar en un servidor local:
   - Abre la carpeta del proyecto en Visual Studio Code.
   - Inicia el entorno utilizando la extensión Live Server sobre index.html (es necesario ejecutarlo mediante HTTP/HTTPS debido al uso de módulos nativos type="module" en JavaScript).
3. Conexión al Backend (InsForge):
   - El proyecto ya cuenta con las credenciales públicas (anon key y URL del proyecto) configuradas en js/insforge-config.js para conectarse directamente a la base de datos en la nube sin requerir configuración adicional.

## 👥 Integrantes del Proyecto — Grupo 4

N°,Integrante,Código UTP,Rol Scrum
1. Felix Alexander Ayasta Ballena,U21308807,Product Owner
2. Jorge Luis Juarez Carrillo,U24258380,Scrum Master
3. Leonardo Daniel Huaman Riojas,U23205177,Developer Frontend
4. Anghelo Rainiero López Castilla,U23240905,Developer Frontend
5. Edgar Bonnet Galvez Ipanaque,U21224589,Developer UI / QA

Docente: Rodriguez Lazo, Miguel Jaeger — Lima, Perú (2026)
