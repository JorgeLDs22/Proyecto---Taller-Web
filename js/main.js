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

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll("main section:not(.hero), .footer-column, .career-card, .curriculum-step, .requirements-list li")
    .forEach((element) => {
      element.classList.add("reveal-ready");
      revealObserver.observe(element);
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
    list.scrollTo({ left: list.scrollLeft + offset, behavior: "smooth" });
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
  const termsModal = document.querySelector("[data-terms-modal]");
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
  document.querySelectorAll("[data-open-terms]").forEach((button) => {
    button.addEventListener("click", () => {
      if (termsModal instanceof HTMLDialogElement) termsModal.showModal();
    });
  });

  document.querySelectorAll(".content-modal").forEach((modal) => {
    if (!(modal instanceof HTMLDialogElement)) return;
    modal.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", () => modal.close());
    });
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
    const undecidedOption = select.querySelector('option[value="undecided"]');
    select.replaceChildren();
    if (defaultOption) select.append(defaultOption);
    if (undecidedOption) select.append(undecidedOption);
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
    const values = {
      full_name: String(formData.get("full_name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      program_interest: String(formData.get("program_interest") || ""),
      message: String(formData.get("message") || "").trim(),
      consent: formData.get("consent") === "on"
    };
    const errors = {
      full_name: values.full_name.length < 2 ? "Ingresa tus nombres y apellidos (mínimo 2 caracteres)." : "",
      email: !values.email ? "Ingresa tu correo electrónico." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? "Ingresa un correo electrónico válido." : "",
      phone: !values.phone ? "Ingresa tu teléfono o celular." : !/^\+?[0-9\s()-]{7,30}$/.test(values.phone) || (values.phone.match(/\d/g) || []).length < 7 ? "Ingresa un teléfono válido (mínimo 7 dígitos)." : "",
      program_interest: !values.program_interest ? "Selecciona una carrera o marca «Aún no lo sé»." : "",
      message: !values.message ? "Escribe tu consulta antes de enviarla." : values.message.length < 2 ? "La consulta debe tener al menos 2 caracteres." : "",
      consent: values.consent ? "" : "Debes aceptar los Términos y Condiciones y la Política de Privacidad."
    };
    Object.entries(errors).forEach(([name, message]) => {
      const input = admissionForm.elements.namedItem(name);
      const errorElement = admissionForm.querySelector(`[data-field-error="${name}"]`);
      setMessage(errorElement, message, "");
      if (input instanceof HTMLElement) {
        if (message) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
      }
    });
    const firstInvalid = Object.keys(errors).find((name) => errors[name]);
    if (firstInvalid) {
      admissionForm.elements.namedItem(firstInvalid)?.focus();
      setMessage(admissionStatus, "Revisa los campos marcados antes de enviar el formulario.", "error");
      return;
    }

    submitButton.disabled = true;
    setMessage(admissionStatus, "Enviando tu consulta…", "");
    try {
      const client = await getInsforgeClient();
      const { error } = await client.database.from("admission_contacts").insert([{
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        program_interest: values.program_interest === "undecided" ? null : values.program_interest,
        message: values.message,
        consent: values.consent
      }]);
      if (error) throw error;
      const localRecord = { ...values, program_interest: values.program_interest === "undecided" ? null : values.program_interest, saved_at: new Date().toISOString() };
      let localBackupError = "";
      try {
        const history = JSON.parse(localStorage.getItem("unip-admission-history") || "[]");
        if (!Array.isArray(history)) throw new Error("El historial local de consultas no tiene un formato válido.");
        localStorage.setItem("unip-admission-history", JSON.stringify([...history, localRecord].slice(-50)));
      } catch (error) {
        localBackupError = getErrorMessage(error);
      }
      admissionForm.reset();
      admissionForm.querySelectorAll("[data-field-error]").forEach((element) => setMessage(element, "", ""));
      admissionForm.querySelectorAll("[aria-invalid]").forEach((element) => element.removeAttribute("aria-invalid"));
      setMessage(admissionStatus, localBackupError
        ? `Tu consulta quedó guardada en InsForge, pero no se pudo guardar el respaldo local: ${localBackupError}`
        : "Recibimos tu consulta y guardamos una copia local. El equipo de admisión podrá contactarte por correo.",
      localBackupError ? "error" : "success");
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
  const roleButtons = [...document.querySelectorAll("[data-role]")];
  const passwordInput = loginForm.querySelector("#password");
  const passwordToggle = document.querySelector(".password-toggle");
  let selectedRole = "alumno";
  const reason = new URLSearchParams(window.location.search).get("reason");
  if (reason === "role") {
    setMessage(status, "Tu perfil no coincide con esta vista. Inicia sesión con el rol correcto o consulta al administrador.", "error");
  } else if (reason === "auth") {
    setMessage(status, "Inicia sesión para acceder a la intranet.", "error");
  }

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
        .select("id, role, full_name, institutional_code")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (!profile || !["alumno", "docente"].includes(profile.role)) {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) console.error("No se pudo cerrar la sesión de un rol no autorizado.", signOutError);
        authenticatedUser = false;
        throw new Error("Tu cuenta todavía no tiene un perfil institucional asignado. Contacta al administrador.");
      }

      const expectedCodePrefix = profile.role === "docente" ? "DOC-" : "EST-";
      if (typeof profile.institutional_code !== "string" || !profile.institutional_code.startsWith(expectedCodePrefix)) {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) console.error("No se pudo cerrar la sesión de un perfil con código inválido.", signOutError);
        authenticatedUser = false;
        throw new Error("El código institucional de tu perfil no coincide con el rol asignado. Contacta al administrador.");
      }

      if (profile.role !== selectedRole) {
        const { error: signOutError } = await client.auth.signOut();
        if (signOutError) console.error("No se pudo cerrar la sesión de un rol no seleccionado.", signOutError);
        authenticatedUser = false;
        throw new Error(`Esta cuenta está registrada como ${profile.role}. Selecciona ese perfil e inténtalo otra vez.`);
      }

      authenticatedUser = false;
      window.location.assign(profile.role === "docente" ? "intranet-docente.html" : "intranet-alumno.html");
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

}

const resetModal = document.querySelector("[data-reset-modal]");
const resetForm = document.querySelector("[data-reset-form]");
const openResetButton = document.querySelector("[data-open-reset]");
const resetStatus = document.querySelector("[data-reset-status]");
if (resetModal instanceof HTMLDialogElement && resetForm instanceof HTMLFormElement && openResetButton instanceof HTMLButtonElement) {
  openResetButton.addEventListener("click", () => {
    setMessage(resetStatus, "", "");
    resetModal.showModal();
  });
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailInput = resetForm.elements.namedItem("email");
    const email = emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
    if (!email || !/^[^\s@]+@unip\.edu\.pe$/i.test(email)) {
      setMessage(resetStatus, "Ingresa un correo institucional válido con dominio @unip.edu.pe.", "error");
      return;
    }

    const submitButton = resetForm.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;
    try {
      const client = await getInsforgeClient();
      const { error } = await client.auth.sendResetPasswordEmail({
        email,
        redirectTo: new URL("login.html", window.location.href).href
      });
      if (error) throw error;
      setMessage(resetStatus, "Si existe una cuenta asociada, recibirás un enlace para restablecer tu contraseña.", "success");
    } catch (error) {
      setMessage(resetStatus, `No se pudo solicitar el restablecimiento: ${getErrorMessage(error)}`, "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
  resetModal.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => resetModal.close());
  });
}

const intranetPage = document.querySelector("[data-intranet-role]");
if (intranetPage instanceof HTMLElement) {
  void initializeIntranetPage(intranetPage);
}

async function initializeIntranetPage(page) {
  const expectedRole = page.dataset.intranetRole;
  const expectedPrefix = expectedRole === "docente" ? "DOC-" : "EST-";
  const main = document.querySelector("#intranet-main");
  const status = document.querySelector("[data-intranet-status]");
  const signOutButton = document.querySelector("[data-sign-out]");
  let client;
  let user;
  let profile;

  const goToLogin = (reason) => window.location.replace(`login.html${reason ? `?reason=${reason}` : ""}`);
  try {
    client = await getInsforgeClient();
    const { data: authData, error: authError } = await client.auth.getCurrentUser();
    if (authError) throw authError;
    user = authData?.user;
    if (!user?.id) {
      goToLogin("auth");
      return;
    }

    const { data, error } = await client.database.from("profiles")
      .select("id, role, full_name, institutional_code")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    profile = data;
    if (!profile || profile.role !== expectedRole
      || typeof profile.institutional_code !== "string"
      || !profile.institutional_code.startsWith(expectedPrefix)) {
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) console.error("No se pudo cerrar la sesión antes de redirigir una vista no autorizada.", signOutError);
      goToLogin("role");
      return;
    }

    const nameElement = document.querySelector("[data-user-name]");
    const codeElement = document.querySelector("[data-user-code]");
    if (nameElement) nameElement.textContent = profile.full_name;
    if (codeElement) codeElement.textContent = profile.institutional_code;
    if (main instanceof HTMLElement) main.hidden = false;
    if (signOutButton instanceof HTMLButtonElement) {
      signOutButton.addEventListener("click", async () => {
        signOutButton.disabled = true;
        try {
          const { error } = await client.auth.signOut();
          if (error) throw error;
          goToLogin("");
        } catch (error) {
          setMessage(status, `No se pudo cerrar la sesión: ${getErrorMessage(error)}`, "error");
          signOutButton.disabled = false;
        }
      });
    }
    await loadIntranetData(client, user, profile);
  } catch (error) {
    setMessage(status, `No se pudo verificar tu sesión o cargar la intranet: ${getErrorMessage(error)}`, "error");
    if (!user?.id) {
      window.setTimeout(() => goToLogin("auth"), 1200);
    }
  }
}

function createIntranetItem(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function appendCourseMaterial(parent, material) {
  const item = createIntranetItem("span", "week-item", "");
  if (material.file_key) {
    const button = createIntranetItem("button", "", material.title);
    button.type = "button";
    button.dataset.downloadKey = material.file_key;
    button.dataset.fileName = material.title;
    item.append(button);
  } else {
    const link = createIntranetItem("a", "", material.title);
    try {
      const url = new URL(material.url);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocolo no válido");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.append(link);
    } catch {
      item.textContent = `${material.title} (enlace no disponible)`;
      item.dataset.invalidUrl = "true";
    }
  }
  if (material.description) item.append(createIntranetItem("small", "", material.description));
  parent.append(item);
}

function createActionButton(label, action, course) {
  const button = createIntranetItem("button", "", label);
  button.type = "button";
  button.dataset.courseAction = action;
  button.dataset.courseId = course.id;
  return button;
}

async function loadIntranetData(client, user, profile) {
  const status = document.querySelector("[data-intranet-status]");
  const courseList = document.querySelector("[data-course-list]");
  if (!(courseList instanceof HTMLElement)) return;
  let courses = [];

  if (profile.role === "docente") {
    const { data, error } = await client.database.from("courses")
      .select("id, code, title, description, term")
      .eq("teacher_id", user.id)
      .order("title", { ascending: true })
      .limit(50);
    if (error) throw error;
    courses = data || [];
  } else {
    const { data: enrollments, error } = await client.database.from("enrollments")
      .select("course_id")
      .eq("student_id", user.id)
      .limit(100);
    if (error) throw error;
    const courseIds = [...new Set((enrollments || []).map((row) => row.course_id))];
    if (courseIds.length) {
      const { data, error: coursesError } = await client.database.from("courses")
        .select("id, code, title, description, term")
        .in("id", courseIds)
        .order("title", { ascending: true })
        .limit(100);
      if (coursesError) throw coursesError;
      courses = data || [];
    }
  }

  if (!courses.length) {
    courseList.replaceChildren(createIntranetItem("p", "course-empty",
      profile.role === "docente" ? "Todavía no tienes cursos asignados." : "Aún no tienes cursos matriculados."));
    setMessage(status, "", "");
    return;
  }

  const courseIds = courses.map((course) => course.id);
  const [assignmentsResult, resourcesResult] = await Promise.all([
    client.database.from("assignments")
      .select("id, course_id, title, description, due_at, week_number")
      .in("course_id", courseIds)
      .order("due_at", { ascending: true })
      .limit(200),
    client.database.from("resources")
      .select("id, course_id, title, description, url, file_key, week_number")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false })
      .limit(200)
  ]);
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (resourcesResult.error) throw resourcesResult.error;
  const assignments = assignmentsResult.data || [];
  const resources = resourcesResult.data || [];
  const enrollmentsResult = profile.role === "docente"
    ? await client.database.from("enrollments").select("course_id, student_id").in("course_id", courseIds).limit(300)
    : { data: [], error: null };
  if (enrollmentsResult.error) throw enrollmentsResult.error;
  const enrollments = enrollmentsResult.data || [];
  const studentIds = [...new Set(enrollments.map((row) => row.student_id))];
  let students = [];
  if (studentIds.length) {
    const { data, error } = await client.database.from("profiles")
      .select("id, full_name, institutional_code")
      .in("id", studentIds)
      .limit(300);
    if (error) throw error;
    students = data || [];
  }
  const studentById = new Map(students.map((student) => [student.id, student]));
  const submissionsResult = profile.role === "alumno"
    ? await client.database.from("assignment_submissions")
      .select("id, assignment_id, grade, feedback")
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(100)
    : { data: [], error: null };
  if (submissionsResult.error) throw submissionsResult.error;
  const submissionByAssignment = new Map();
  (submissionsResult.data || []).forEach((submission) => {
    if (!submissionByAssignment.has(submission.assignment_id)) {
      submissionByAssignment.set(submission.assignment_id, submission);
    }
  });

  courseList.replaceChildren();
  courses.forEach((course) => {
    const courseAssignments = assignments.filter((item) => item.course_id === course.id);
    const courseResources = resources.filter((item) => item.course_id === course.id);
    const panel = createIntranetItem("article", "course-panel", "");
    const header = createIntranetItem("header", "course-panel-header", "");
    const summary = createIntranetItem("div", "", "");
    summary.append(
      createIntranetItem("p", "course-code", course.code || "Curso"),
      createIntranetItem("h2", "", course.title),
      createIntranetItem("p", "", [course.term, course.description].filter(Boolean).join(" · ") || "Contenido académico del curso.")
    );
    header.append(summary);

    if (profile.role === "docente") {
      const actions = createIntranetItem("div", "course-actions", "");
      actions.append(
        createActionButton("+ Subir Material", "material", course),
        createActionButton("+ Crear Encuesta/Evaluación", "assignment", course),
        createActionButton("Calificar", "grade", course)
      );
      header.append(actions);
    }
    panel.append(header);

    const maxWeek = Math.min(20, Math.max(4,
      ...courseAssignments.map((item) => Number(item.week_number) || 1),
      ...courseResources.map((item) => Number(item.week_number) || 1)));
    const weeklyContent = createIntranetItem("div", "weekly-content", "");
    for (let week = 1; week <= maxWeek; week += 1) {
      const weekCard = createIntranetItem("section", "week-card", "");
      weekCard.append(createIntranetItem("h3", "", `Semana ${week}`));
      const weekAssignments = courseAssignments.filter((item) => Number(item.week_number) === week);
      const weekResources = courseResources.filter((item) => Number(item.week_number) === week);
      if (weekResources.length) {
        weekCard.append(createIntranetItem("h4", "", "Materiales"));
        weekResources.forEach((resource) => appendCourseMaterial(weekCard, resource));
      }
      if (weekAssignments.length) {
        weekCard.append(createIntranetItem("h4", "", "Evaluaciones y tareas"));
        weekAssignments.forEach((assignment) => {
          const details = createIntranetItem("span", "week-item", assignment.title);
          if (assignment.due_at) details.append(createIntranetItem("small", "", `Vence ${new Date(assignment.due_at).toLocaleDateString("es-PE")}`));
          const submission = submissionByAssignment.get(assignment.id);
          if (submission) {
            const gradeText = submission.grade === null ? "Entrega registrada; pendiente de calificación." : `Calificación: ${submission.grade}/20`;
            details.append(createIntranetItem("small", "", submission.feedback ? `${gradeText} ${submission.feedback}` : gradeText));
          }
          weekCard.append(details);
        });
      } else if (!weekResources.length) {
        weekCard.append(createIntranetItem("p", "week-item", "Aún no hay contenido publicado."));
      }
      weeklyContent.append(weekCard);
    }
    panel.append(weeklyContent);

    if (profile.role === "docente") {
      const roster = createIntranetItem("section", "student-roster", "");
      roster.append(createIntranetItem("h3", "", "Alumnos matriculados"));
      const list = createIntranetItem("ul", "", "");
      const courseEnrollments = enrollments.filter((row) => row.course_id === course.id);
      if (!courseEnrollments.length) list.append(createIntranetItem("li", "", "Aún no hay alumnos matriculados."));
      courseEnrollments.forEach((row) => {
        const student = studentById.get(row.student_id);
        if (student) list.append(createIntranetItem("li", "", `${student.full_name} · ${student.institutional_code || ""}`));
      });
      roster.append(list);
      panel.append(roster);
    }
    courseList.append(panel);
  });

  if (profile.role === "alumno") {
    populateSubmissionAssignments(assignments);
    configureStudentSubmission(client, user, assignments);
  } else {
    configureTeacherActions(client, user, courses, assignments, students);
  }
  configurePrivateDownloads(client);
  setMessage(status, "", "");
}

function populateSubmissionAssignments(assignments) {
  const select = document.querySelector("#submission-assignment");
  if (!(select instanceof HTMLSelectElement)) return;
  select.replaceChildren(new Option("Selecciona una evaluación", ""));
  assignments.forEach((assignment) => {
    const option = new Option(assignment.title, assignment.id);
    option.dataset.courseId = assignment.course_id;
    select.append(option);
  });
  select.disabled = !assignments.length;
}

function configurePrivateDownloads(client) {
  document.querySelectorAll("[data-download-key]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const { data, error } = await client.storage.from("course-files").download(button.dataset.downloadKey);
        if (error) throw error;
        const objectUrl = URL.createObjectURL(data);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = button.dataset.fileName || "material-unip";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (error) {
        const status = document.querySelector("[data-intranet-status]");
        setMessage(status, `No se pudo descargar el archivo: ${getErrorMessage(error)}`, "error");
      } finally {
        button.disabled = false;
      }
    });
  });
}

function configureStudentSubmission(client, user, assignments) {
  const form = document.querySelector("[data-student-submission]");
  if (!(form instanceof HTMLFormElement)) return;
  const status = document.querySelector("[data-submission-status]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const assignmentSelect = form.elements.namedItem("assignment_id");
    const fileInput = form.elements.namedItem("file");
    const assignment = assignmentSelect instanceof HTMLSelectElement
      ? assignments.find((item) => item.id === assignmentSelect.value)
      : null;
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;
    if (!assignment || !file) {
      setMessage(status, "Selecciona una evaluación y un archivo para continuar.", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage(status, "El archivo supera el límite de 20 MB.", "error");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;
    try {
      setMessage(status, "Subiendo tu entrega...", "");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadedKey = `${assignment.course_id}/${user.id}/submissions/${assignment.id}/${Date.now()}-${safeName}`;
      const { data: upload, error: uploadError } = await client.storage.from("course-files").upload(uploadedKey, file);
      if (uploadError) throw uploadError;
      const { error } = await client.database.from("assignment_submissions").insert([{
        assignment_id: assignment.id,
        course_id: assignment.course_id,
        student_id: user.id,
        file_name: file.name,
        file_key: upload.key,
        file_url: upload.url
      }]);
      if (error) {
        const { error: cleanupError } = await client.storage.from("course-files").remove(upload.key);
        if (cleanupError) throw new Error(`${getErrorMessage(error)}. No se pudo retirar el archivo cargado: ${getErrorMessage(cleanupError)}`);
        throw error;
      }
      form.reset();
      setMessage(status, "Tu archivo se subió y quedó registrado para calificación.", "success");
    } catch (error) {
      setMessage(status, `No se pudo subir la entrega: ${getErrorMessage(error)}`, "error");
    } finally {
      if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
    }
  });
}

function configureTeacherActions(client, user, courses, assignments, students) {
  const actionModal = document.querySelector("[data-action-modal]");
  const gradeModal = document.querySelector("[data-grade-modal]");
  const form = document.querySelector("[data-action-form]");
  const title = document.querySelector("[data-action-title]");
  if (!(actionModal instanceof HTMLDialogElement) || !(gradeModal instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement)) return;

  document.querySelectorAll("[data-course-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const course = courses.find((item) => item.id === button.dataset.courseId);
      if (!course) return;
      if (button.dataset.courseAction === "grade") {
        await showCourseSubmissions(client, course, assignments, students);
        gradeModal.showModal();
        return;
      }
      const isMaterial = button.dataset.courseAction === "material";
      if (title) title.textContent = isMaterial ? `Subir material · ${course.title}` : `Crear evaluación · ${course.title}`;
      form.replaceChildren();
      form.dataset.action = isMaterial ? "material" : "assignment";
      form.dataset.courseId = course.id;
      const addField = (labelText, name, type, placeholder) => {
        const id = `action-${name}`;
        const label = createIntranetItem("label", "", labelText);
        label.htmlFor = id;
        const input = document.createElement(type === "textarea" ? "textarea" : "input");
        input.id = id;
        input.name = name;
        if (type !== "textarea") input.type = type;
        if (placeholder) input.placeholder = placeholder;
        input.required = ["title", "file", "week_number"].includes(name);
        form.append(label, input);
        return input;
      };
      addField(isMaterial ? "Nombre del material" : "Título de la evaluación", "title", "text");
      addField("Descripción e indicaciones", "description", "textarea");
      if (isMaterial) addField("Archivo de material (máximo 20 MB)", "file", "file");
      else addField("Fecha límite (opcional)", "due_at", "datetime-local");
      const weekInput = addField("Semana del curso", "week_number", "number");
      weekInput.min = "1";
      weekInput.max = "20";
      weekInput.value = "1";
      const submit = createIntranetItem("button", "button button-submit", isMaterial ? "Publicar material →" : "Crear evaluación →");
      submit.type = "submit";
      form.append(submit, createIntranetItem("p", "form-status", ""));
      actionModal.showModal();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const action = form.dataset.action;
    const courseId = form.dataset.courseId;
    const status = form.querySelector(".form-status");
    const submit = form.querySelector('button[type="submit"]');
    const titleValue = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const weekNumber = Number(formData.get("week_number"));
    if (!titleValue || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 20) {
      setMessage(status, "Completa un título y una semana entre 1 y 20.", "error");
      return;
    }
    if (submit instanceof HTMLButtonElement) submit.disabled = true;
    try {
      if (action === "material") {
        const file = formData.get("file");
        if (!(file instanceof File) || !file.size) throw new Error("Selecciona el archivo del material.");
        if (file.size > 20 * 1024 * 1024) throw new Error("El archivo supera el límite de 20 MB.");
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        uploadedKey = `${courseId}/${user.id}/materials/${Date.now()}-${safeName}`;
        const { data: upload, error: uploadError } = await client.storage.from("course-files").upload(uploadedKey, file);
        if (uploadError) throw uploadError;
        const { error } = await client.database.from("resources").insert([{
          course_id: courseId,
          title: titleValue,
          description,
          url: upload.url,
          file_key: upload.key,
          week_number: weekNumber
        }]);
        if (error) {
          const { error: cleanupError } = await client.storage.from("course-files").remove(upload.key);
          if (cleanupError) throw new Error(`${getErrorMessage(error)}. No se pudo retirar el archivo cargado: ${getErrorMessage(cleanupError)}`);
          throw error;
        }
      } else {
        const dueValue = String(formData.get("due_at") || "");
        const dueAt = dueValue ? new Date(dueValue).toISOString() : null;
        const { error } = await client.database.from("assignments").insert([{
          course_id: courseId,
          title: titleValue,
          description,
          due_at: dueAt,
          week_number: weekNumber
        }]);
        if (error) throw error;
      }
      setMessage(status, "Cambios guardados correctamente.", "success");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(status, `No se pudo guardar: ${getErrorMessage(error)}`, "error");
    } finally {
      if (submit instanceof HTMLButtonElement) submit.disabled = false;
    }
  });

}

async function showCourseSubmissions(client, course, assignments, students) {
  const list = document.querySelector("[data-submission-list]");
  const status = document.querySelector("[data-grade-status]");
  if (!(list instanceof HTMLElement)) return;
  list.replaceChildren();
  setMessage(status, "Cargando entregas...", "");
  try {
    const { data, error } = await client.database.from("assignment_submissions")
      .select("id, assignment_id, student_id, file_name, file_key, grade, feedback, submitted_at")
      .eq("course_id", course.id)
      .order("submitted_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const studentById = new Map(students.map((student) => [student.id, student]));
    const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
    if (!data?.length) {
      list.append(createIntranetItem("p", "course-empty", "Aún no se han enviado entregas para este curso."));
      setMessage(status, "", "");
      return;
    }
    data.forEach((submission) => {
      const review = createIntranetItem("article", "submission-review", "");
      const student = studentById.get(submission.student_id);
      const assignment = assignmentById.get(submission.assignment_id);
      review.append(
        createIntranetItem("strong", "", student?.full_name || "Alumno"),
        createIntranetItem("p", "", `${assignment?.title || "Evaluación"} · ${submission.file_name}`)
      );
      const fileButton = createIntranetItem("button", "", "Descargar entrega");
      fileButton.type = "button";
      fileButton.dataset.downloadKey = submission.file_key;
      fileButton.dataset.fileName = submission.file_name;
      review.append(fileButton);
      const gradeInput = document.createElement("input");
      gradeInput.type = "number";
      gradeInput.min = "0";
      gradeInput.max = "20";
      gradeInput.step = "0.5";
      gradeInput.value = submission.grade === null ? "" : String(submission.grade);
      gradeInput.setAttribute("aria-label", `Nota de ${student?.full_name || "alumno"} sobre 20`);
      const feedbackInput = document.createElement("input");
      feedbackInput.type = "text";
      feedbackInput.maxLength = 500;
      feedbackInput.value = submission.feedback || "";
      feedbackInput.placeholder = "Comentario opcional";
      feedbackInput.setAttribute("aria-label", "Comentario de retroalimentación");
      const saveButton = createIntranetItem("button", "", "Guardar nota");
      saveButton.type = "button";
      saveButton.addEventListener("click", async () => {
        const grade = Number(gradeInput.value);
        if (!gradeInput.value || grade < 0 || grade > 20) {
          setMessage(status, "Ingresa una calificación entre 0 y 20.", "error");
          return;
        }
        saveButton.disabled = true;
        try {
          const { error: updateError } = await client.database.from("assignment_submissions")
            .update({ grade, feedback: feedbackInput.value.trim() })
            .eq("id", submission.id);
          if (updateError) throw updateError;
          setMessage(status, "Calificación guardada.", "success");
        } catch (error) {
          setMessage(status, `No se pudo guardar la calificación: ${getErrorMessage(error)}`, "error");
        } finally {
          saveButton.disabled = false;
        }
      });
      review.append(gradeInput, feedbackInput, saveButton);
      list.append(review);
    });
    configurePrivateDownloads(client);
    setMessage(status, "", "");
  } catch (error) {
    setMessage(status, `No se pudieron cargar las entregas: ${getErrorMessage(error)}`, "error");
  }
}
