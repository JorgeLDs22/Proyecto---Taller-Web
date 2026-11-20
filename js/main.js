import { insforgeConfig } from "./insforge-config.js";

let clientPromise;

async function getInsforgeClient() {
  if (!insforgeConfig.anonKey.trim()) {
    throw new Error("Falta configurar la clave pública anon de InsForge.");
  }

  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@insforge/sdk")
      .then(({ createClient }) => createClient({
        baseUrl: insforgeConfig.baseUrl,
        anonKey: insforgeConfig.anonKey
      }))
      .catch((error) => {
        clientPromise = undefined;
        throw error;
      });
  }
  return clientPromise;
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Ocurrió un error inesperado. Inténtalo nuevamente.";
}

function setMessage(element, message, state) {
  if (!(element instanceof HTMLElement)) return;
  element.textContent = message;
  if (state) element.dataset.state = state;
  else delete element.dataset.state;
}

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primary-nav");

function setTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
    const icon = button.querySelector(".theme-icon");
    const label = button.querySelector(".theme-label");
    if (icon) icon.textContent = isDark ? "☀" : "☾";
    if (label) label.textContent = isDark ? "Modo claro" : "Modo oscuro";
  });
}

let savedTheme = "light";
try {
  savedTheme = localStorage.getItem("unip-theme") === "dark" ? "dark" : "light";
} catch (error) {
  console.warn("No se pudo leer la preferencia del tema.", error);
}
setTheme(savedTheme);
document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("unip-theme", nextTheme);
    } catch (error) {
      console.warn("No se pudo guardar la preferencia del tema.", error);
    }
  });
});

if (menuToggle && primaryNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    primaryNav.classList.toggle("is-open", !isOpen);
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
      primaryNav.classList.remove("is-open");
    }
  });
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

function safeImageUrl(value) {
  if (!value) return "";
  if (/^assets\/img\/[a-z0-9._/-]+$/i.test(value)) return value;
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function createCareerCard(program, index) {
  const card = document.createElement("article");
  card.className = "career-card";
  card.dataset.programId = program.id || "";
  card.dataset.careerName = program.name || "";
  card.dataset.careerProfile = program.description || program.category || "";
  card.dataset.careerSummary = program.description || program.category || "";

  const imageUrl = safeImageUrl(program.image_url);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    card.append(image);
  }

  const trigger = document.createElement("button");
  trigger.className = "career-card-trigger";
  trigger.type = "button";
  trigger.dataset.careerDetail = "";
  trigger.setAttribute("aria-label", `Ver detalles de ${program.name}`);
  const overlay = document.createElement("span");
  overlay.className = "career-overlay";
  const number = document.createElement("span");
  number.className = "career-number";
  number.textContent = String(index + 1).padStart(2, "0");
  const title = document.createElement("strong");
  title.textContent = program.name;
  const description = document.createElement("span");
  description.className = "career-summary";
  description.textContent = program.description || program.category || "Consulta a admisión para conocer más.";
  const more = document.createElement("span");
  more.className = "career-more";
  more.textContent = "Ver detalles ↗";
  overlay.append(number, title, description, more);
  trigger.append(overlay);
  card.append(trigger);
  return card;
}

function configureCareerCarousel() {
  const list = document.querySelector("[data-program-list]");
  const indicators = document.querySelector("[data-carousel-indicators]");
  const previous = document.querySelector("[data-carousel-prev]");
  const next = document.querySelector("[data-carousel-next]");
  if (!(list instanceof HTMLElement) || !(indicators instanceof HTMLElement)) return;

  const cards = () => [...list.querySelectorAll(".career-card")];
  const navigableCards = () => {
    const items = cards();
    if (items.length < 2) return items;
    const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth);
    const step = items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().left;
    const maxIndex = Math.min(items.length - 1, Math.floor((maxScroll + 1) / step));
    return items.slice(0, maxIndex + 1);
  };
  indicators.replaceChildren();
  const scrollToCard = (card) => {
    if (!card) return;
    const offset = card.getBoundingClientRect().left - list.getBoundingClientRect().left;
    list.scrollLeft += offset;
    updateCarousel();
  };
  navigableCards().forEach((card, index) => {
    const indicator = document.createElement("button");
    indicator.type = "button";
    indicator.className = "carousel-indicator";
    indicator.setAttribute("aria-label", `Mostrar grupo de carreras ${index + 1}`);
    indicator.addEventListener("click", () => scrollToCard(card));
    indicators.append(indicator);
  });

  function activeIndex() {
    const items = cards();
    if (!items.length) return 0;
    const position = list.getBoundingClientRect().left;
    const active = items.reduce((current, card, index) => {
      return card.getBoundingClientRect().left - position <= 2 ? index : current;
    }, 0);
    return Math.min(active, Math.max(0, navigableCards().length - 1));
  }

  function updateCarousel() {
    const active = activeIndex();
    [...indicators.children].forEach((indicator, index) => {
      indicator.classList.toggle("is-active", index === active);
      indicator.setAttribute("aria-current", index === active ? "true" : "false");
    });
  }

  if (list.dataset.carouselInitialized !== "true") {
    list.dataset.carouselInitialized = "true";
    list.addEventListener("scroll", updateCarousel, { passive: true });
    window.addEventListener("resize", configureCareerCarousel);
    if (previous instanceof HTMLButtonElement) {
      previous.addEventListener("click", () => {
        const items = navigableCards();
        const current = activeIndex();
        scrollToCard(items[Math.max(0, current - 1)]);
      });
    }
    if (next instanceof HTMLButtonElement) {
      next.addEventListener("click", () => {
        const items = navigableCards();
        const current = activeIndex();
        scrollToCard(items[Math.min(items.length - 1, current + 1)]);
      });
    }
  }
  updateCarousel();
}

function configureModals() {
  const careerModal = document.querySelector("[data-career-modal]");
  const processModal = document.querySelector("[data-process-modal]");
  const careerList = document.querySelector("[data-program-list]");
  const processButton = document.querySelector("[data-open-process]");

  if (careerModal instanceof HTMLDialogElement && careerList instanceof HTMLElement) {
    careerList.addEventListener("click", async (event) => {
      const trigger = event.target instanceof Element ? event.target.closest("[data-career-detail]") : null;
      if (!trigger) return;
      const card = trigger.closest(".career-card");
      if (!card) return;
      const title = card.dataset.careerName || card.querySelector("strong, h3")?.textContent || "Carrera profesional";
      const description = card.dataset.careerProfile || card.querySelector(".career-summary, .career-overlay p")?.textContent || "Consulta a admisión para conocer el perfil de esta carrera.";
      const titleElement = careerModal.querySelector("[data-career-title]");
      const profileElement = careerModal.querySelector("[data-career-profile]");
      const durationElement = careerModal.querySelector("[data-career-duration]");
      const curriculumElement = careerModal.querySelector("[data-career-curriculum]");
      const curriculumStatus = careerModal.querySelector("[data-career-curriculum-status]");
      if (titleElement) titleElement.textContent = title;
      if (profileElement) profileElement.textContent = description;
      if (durationElement) durationElement.textContent = "La duración oficial se confirma según el programa publicado por la universidad.";
      careerModal.showModal();
      if (!card.dataset.programId) {
        if (curriculumElement) curriculumElement.textContent = `${description} Consulta la malla oficial publicada para conocer los cursos y ciclos vigentes.`;
        setMessage(curriculumStatus, "Área referencial; la malla oficial debe confirmarse con admisión.", "");
        return;
      }

      if (curriculumElement) curriculumElement.textContent = "";
      setMessage(curriculumStatus, "Cargando resumen de la malla oficial…", "");
      try {
        const client = await getInsforgeClient();
        const { data, error } = await client.database
          .from("curriculum_courses")
          .select("name, cycle")
          .eq("academic_program_id", card.dataset.programId)
          .eq("is_published", true)
          .order("cycle", { ascending: true })
          .order("display_order", { ascending: true })
          .limit(80);
        if (error) throw error;
        if (!data?.length) {
          if (curriculumElement) curriculumElement.textContent = "La malla oficial de este programa aún no está publicada.";
          setMessage(curriculumStatus, "", "");
          return;
        }
        const cycleCount = new Set(data.map((course) => course.cycle)).size;
        const courseNames = data.slice(0, 5).map((course) => course.name).join(" · ");
        const remaining = data.length > 5 ? ` y ${data.length - 5} cursos más` : "";
        if (curriculumElement) curriculumElement.textContent = `${cycleCount} ciclos · ${courseNames}${remaining}.`;
        setMessage(curriculumStatus, "", "");
      } catch (error) {
        setMessage(curriculumStatus, `No se pudo cargar el resumen de la malla: ${getErrorMessage(error)}`, "error");
      }
    });
  }

  if (processModal instanceof HTMLDialogElement && processButton instanceof HTMLButtonElement) {
    processButton.addEventListener("click", () => processModal.showModal());
  }

  document.querySelectorAll(".content-modal").forEach((modal) => {
    if (!(modal instanceof HTMLDialogElement)) return;
    modal.querySelector("[data-modal-close]")?.addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => {
      if (event.target !== modal) return;
      const bounds = modal.getBoundingClientRect();
      const outside = event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom;
      if (outside) modal.close();
    });
    modal.querySelector("[data-modal-admission]")?.addEventListener("click", () => modal.close());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".content-modal[open]").forEach((modal) => {
      if (modal instanceof HTMLDialogElement) modal.close();
    });
  });
}

document.querySelector("[data-curriculum-fallback]")?.addEventListener("click", (event) => {
  const toggle = event.target instanceof Element ? event.target.closest(".curriculum-step-toggle") : null;
  if (!(toggle instanceof HTMLButtonElement)) return;
  const expanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!expanded));
  const detail = toggle.querySelector(".curriculum-step-detail");
  if (detail instanceof HTMLElement) detail.hidden = expanded;
  const mark = toggle.querySelector(".step-mark");
  if (mark) mark.textContent = expanded ? "+" : "×";
});

configureCareerCarousel();
configureModals();

function renderPrograms(programs) {
  const list = document.querySelector("[data-program-list]");
  const status = document.querySelector("[data-program-status]");
  const select = document.querySelector("#admission-program");
  if (!(list instanceof HTMLElement)) return;

  if (!programs.length) {
    setMessage(status, "Aún no hay programas publicados. Se muestran áreas informativas de referencia.", "");
    return;
  }

  list.replaceChildren();
  programs.forEach((program, index) => {
    list.append(createCareerCard(program, index));
  });
  configureCareerCarousel();
  setMessage(status, "", "");

  if (select instanceof HTMLSelectElement) {
    const defaultOption = select.querySelector('option[value=""]');
    select.replaceChildren();
    if (defaultOption) select.append(defaultOption);
    programs.forEach((program) => {
      const option = document.createElement("option");
      option.value = program.id;
      option.textContent = program.name;
      select.append(option);
    });
  }
  configureCurriculum(programs);
}

function configureCurriculum(programs) {
  const controls = document.querySelector("[data-curriculum-controls]");
  const select = document.querySelector("[data-curriculum-program]");
  if (!(controls instanceof HTMLElement) || !(select instanceof HTMLSelectElement) || !programs.length) return;

  select.replaceChildren();
  programs.forEach((program) => {
    const option = document.createElement("option");
    option.value = program.id;
    option.textContent = program.name;
    select.append(option);
  });
  controls.hidden = false;
  select.addEventListener("change", () => loadCurriculum(select.value));
  loadCurriculum(select.value);
}

async function loadCurriculum(programId) {
  const status = document.querySelector("[data-curriculum-status]");
  const list = document.querySelector("[data-curriculum-list]");
  const fallback = document.querySelector("[data-curriculum-fallback]");
  if (!(list instanceof HTMLElement)) return;
  setMessage(status, "Cargando malla curricular…", "");

  try {
    const client = await getInsforgeClient();
    const { data, error } = await client.database
      .from("curriculum_courses")
      .select("id, course_code, name, cycle, credits, display_order")
      .eq("academic_program_id", programId)
      .eq("is_published", true)
      .order("cycle", { ascending: true })
      .order("display_order", { ascending: true })
      .limit(80);
    if (error) throw error;

    if (!data?.length) {
      list.replaceChildren();
      if (fallback instanceof HTMLElement) fallback.hidden = false;
      setMessage(status, "La malla oficial de este programa aún no está publicada; se muestra un esquema referencial.", "");
      return;
    }

    list.replaceChildren();
    data.forEach((course) => {
      const step = document.createElement("article");
      step.className = "curriculum-step";
      const cycle = document.createElement("span");
      cycle.className = "step-number";
      cycle.textContent = `Ciclo ${course.cycle}`;
      const details = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = course.name;
      const description = document.createElement("p");
      description.textContent = `${course.course_code}${course.credits ? ` · ${course.credits} créditos` : ""}`;
      details.append(name, description);
      step.append(cycle, details);
      list.append(step);
    });
    if (fallback instanceof HTMLElement) fallback.hidden = false;
    setMessage(status, "", "");
  } catch (error) {
    if (fallback instanceof HTMLElement) fallback.hidden = false;
    setMessage(status, `No se pudo cargar la malla curricular: ${getErrorMessage(error)}`, "error");
  }
}

const admissionForm = document.querySelector("#admission-form");
if (admissionForm instanceof HTMLFormElement) {
  const admissionStatus = document.querySelector("[data-admission-status]");
  const submitButton = admissionForm.querySelector('button[type="submit"]');

  getInsforgeClient()
    .then((client) => client.database
      .from("academic_programs")
      .select("id, name, category, description, image_url, display_order")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .limit(12))
    .then(({ data, error }) => {
      if (error) throw error;
      renderPrograms(data || []);
    })
    .catch((error) => {
      setMessage(document.querySelector("[data-program-status]"), `No se pudieron cargar los programas: ${getErrorMessage(error)}`, "error");
    });

  admissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(submitButton instanceof HTMLButtonElement)) return;

    const formData = new FormData(admissionForm);
    submitButton.disabled = true;
    setMessage(admissionStatus, "Enviando tu consulta…", "");
    try {
      const client = await getInsforgeClient();
      const { error } = await client.database.from("admission_contacts").insert([{
        full_name: String(formData.get("full_name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim() || null,
        program_interest: String(formData.get("program_interest") || "") || null,
        message: String(formData.get("message") || "").trim(),
        consent: formData.get("consent") === "on"
      }]);
      if (error) throw error;
      admissionForm.reset();
      setMessage(admissionStatus, "Recibimos tu consulta. El equipo de admisión podrá contactarte por correo.", "success");
    } catch (error) {
      setMessage(admissionStatus, `No se pudo enviar la consulta: ${getErrorMessage(error)}`, "error");
    } finally {
      submitButton.disabled = false;
    }
  });
}

const loginForm = document.querySelector("#login-form");
if (loginForm instanceof HTMLFormElement) {
  const status = document.querySelector("#login-status");
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const submitLabel = loginForm.querySelector("[data-submit-label]");
  const roleSwitch = document.querySelector(".role-switch");
  const loginIntro = document.querySelector(".login-intro");
  const roleButtons = [...document.querySelectorAll("[data-role]")];
  const passwordInput = loginForm.querySelector("#password");
  const passwordToggle = document.querySelector(".password-toggle");
  const dashboard = document.querySelector("[data-intranet]");
  const dashboardStatus = document.querySelector("[data-dashboard-status]");
  let selectedRole = "alumno";

  roleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedRole = button.dataset.role === "docente" ? "docente" : "alumno";
      roleButtons.forEach((option) => {
        const selected = option === button;
        option.classList.toggle("is-selected", selected);
        option.setAttribute("aria-pressed", String(selected));
      });
      if (submitLabel) submitLabel.textContent = `Ingresar como ${selectedRole}`;
      setMessage(status, "", "");
    });
  });

  if (passwordInput instanceof HTMLInputElement && passwordToggle instanceof HTMLButtonElement) {
    passwordToggle.addEventListener("click", () => {
      const showPassword = passwordInput.type === "password";
      passwordInput.type = showPassword ? "text" : "password";
      passwordToggle.textContent = showPassword ? "Ocultar" : "Mostrar";
      passwordToggle.setAttribute("aria-label", showPassword ? "Ocultar contraseña" : "Mostrar contraseña");
      passwordToggle.setAttribute("aria-pressed", String(showPassword));
    });
  }

  function renderDashboardList(selector, rows, emptyMessage, renderItem) {
    const list = document.querySelector(selector);
    if (!(list instanceof HTMLElement)) return;
    list.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "dashboard-empty";
      empty.textContent = emptyMessage;
      list.append(empty);
      return;
    }
    rows.forEach((row) => list.append(renderItem(row)));
  }

  function makeDashboardItem(titleText, descriptionText) {
    const item = document.createElement("article");
    item.className = "dashboard-item";
    const title = document.createElement("strong");
    title.textContent = titleText;
    item.append(title);
    if (descriptionText) {
      const description = document.createElement("p");
      description.textContent = descriptionText;
      item.append(description);
    }
    return item;
  }

  async function loadDashboard(client, user, profile) {
    setMessage(dashboardStatus, "", "");

    let courseIds = [];
    let courses = [];
    if (profile.role === "alumno") {
      const { data: enrollments, error } = await client.database
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)
        .limit(50);
      if (error) throw error;
      courseIds = [...new Set((enrollments || []).map((row) => row.course_id))];
    }

    if (profile.role === "docente") {
      const { data, error } = await client.database
        .from("courses")
        .select("id, code, title, description, term")
        .eq("teacher_id", user.id)
        .order("title", { ascending: true })
        .limit(50);
      if (error) throw error;
      courses = data || [];
      courseIds = courses.map((course) => course.id);
    } else if (courseIds.length) {
      const { data, error } = await client.database
        .from("courses")
        .select("id, code, title, description, term")
        .in("id", courseIds)
        .order("title", { ascending: true })
        .limit(50);
      if (error) throw error;
      courses = data || [];
    }

    const courseNames = new Map(courses.map((course) => [course.id, course.code ? `${course.code} · ${course.title}` : course.title]));
    renderDashboardList("[data-course-list]", courses, "Todavía no tienes cursos asignados.", (course) => {
      const description = [course.term, course.description].filter(Boolean).join(" · ");
      return makeDashboardItem(courseNames.get(course.id), description);
    });

    if (!courseIds.length) {
      renderDashboardList("[data-assignment-list]", [], "No hay tareas disponibles.", () => document.createElement("div"));
      renderDashboardList("[data-resource-list]", [], "No hay recursos disponibles.", () => document.createElement("div"));
      return;
    }

    const [assignmentsResult, resourcesResult] = await Promise.all([
      client.database.from("assignments")
        .select("id, course_id, title, description, due_at")
        .in("course_id", courseIds)
        .order("due_at", { ascending: true })
        .limit(30),
      client.database.from("resources")
        .select("id, course_id, title, description, url")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    if (assignmentsResult.error) {
      setMessage(dashboardStatus, `No se pudieron cargar las tareas: ${getErrorMessage(assignmentsResult.error)}`, "error");
    }
    renderDashboardList("[data-assignment-list]", assignmentsResult.data || [], "No hay tareas disponibles.", (assignment) => {
      const dueDate = assignment.due_at ? new Date(assignment.due_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }) : "";
      const detail = [courseNames.get(assignment.course_id), dueDate, assignment.description].filter(Boolean).join(" · ");
      return makeDashboardItem(assignment.title, detail);
    });

    if (resourcesResult.error) {
      setMessage(dashboardStatus, `No se pudieron cargar los recursos: ${getErrorMessage(resourcesResult.error)}`, "error");
    }
    renderDashboardList("[data-resource-list]", resourcesResult.data || [], "No hay recursos disponibles.", (resource) => {
      const item = makeDashboardItem(resource.title, [courseNames.get(resource.course_id), resource.description].filter(Boolean).join(" · "));
      try {
        const url = new URL(resource.url);
        if (url.protocol === "https:" || url.protocol === "http:") {
          const link = document.createElement("a");
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Abrir recurso ↗";
          item.append(link);
        }
      } catch {
        setMessage(dashboardStatus, "Se omitió un recurso con una dirección inválida.", "error");
      }
      return item;
    });
  }

  function showLogin() {
    if (dashboard instanceof HTMLElement) dashboard.hidden = true;
    loginForm.hidden = false;
    if (roleSwitch instanceof HTMLElement) roleSwitch.hidden = false;
    if (loginIntro instanceof HTMLElement) loginIntro.hidden = false;
    setMessage(status, "", "");
    setMessage(dashboardStatus, "", "");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(status instanceof HTMLElement) || !(submitButton instanceof HTMLButtonElement)) return;

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    let activeClient;
    let authenticatedUser = false;
    submitButton.disabled = true;
    setMessage(status, "Conectando con el servicio de autenticación…", "");

    try {
      const client = await getInsforgeClient();
      activeClient = client;
      const { data: authData, error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!authData?.user?.id) throw new Error("La autenticación no devolvió un usuario válido.");
      authenticatedUser = true;

      const { data: profile, error: profileError } = await client.database
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (!profile || !["alumno", "docente"].includes(profile.role)) {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) throw signOutError;
        authenticatedUser = false;
        throw new Error("Tu cuenta todavía no tiene un perfil institucional asignado. Contacta al administrador.");
      }

      if (profile.role !== selectedRole) {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) throw signOutError;
        authenticatedUser = false;
        throw new Error(`Esta cuenta está registrada como ${profile.role}. Selecciona ese perfil e inténtalo otra vez.`);
      }

      const nameElement = document.querySelector("[data-user-name]");
      const roleElement = document.querySelector("[data-user-role]");
      if (nameElement) nameElement.textContent = profile.full_name || authData.user.email;
      if (roleElement) roleElement.textContent = `Perfil verificado: ${profile.role}`;
      loginForm.hidden = true;
      if (roleSwitch instanceof HTMLElement) roleSwitch.hidden = true;
      if (loginIntro instanceof HTMLElement) loginIntro.hidden = true;
      if (dashboard instanceof HTMLElement) dashboard.hidden = false;
      loginForm.reset();
      try {
        await loadDashboard(client, authData.user, profile);
      } catch (error) {
        setMessage(dashboardStatus, `No se pudieron cargar los datos de la intranet: ${getErrorMessage(error)}`, "error");
      }
      authenticatedUser = false;
    } catch (error) {
      let message = getErrorMessage(error);
      if (authenticatedUser && activeClient) {
        const { error: signOutError } = await activeClient.auth.signOut();
        if (signOutError) message += ` No se pudo cerrar la sesión: ${getErrorMessage(signOutError)}`;
      }
      setMessage(status, message, "error");
    } finally {
      submitButton.disabled = false;
    }
  });

  const signOutButton = document.querySelector("[data-sign-out]");
  if (signOutButton instanceof HTMLButtonElement) {
    signOutButton.addEventListener("click", async () => {
      signOutButton.disabled = true;
      try {
        const client = await getInsforgeClient();
        const { error } = await client.auth.signOut();
        if (error) throw error;
        showLogin();
      } catch (error) {
        setMessage(dashboardStatus, `No se pudo cerrar la sesión: ${getErrorMessage(error)}`, "error");
      } finally {
        signOutButton.disabled = false;
      }
    });
  }
}
