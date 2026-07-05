document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".header");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.querySelector(".nav-links");
  const scrollBtn = document.getElementById("scrollTopBtn");

  const closeMenu = () => {
    hamburger?.classList.remove("active");
    navLinks?.classList.remove("active");
    document.body.classList.remove("nav-open");
  };

  hamburger?.addEventListener("click", () => {
    const isOpen = hamburger.classList.toggle("active");
    navLinks?.classList.toggle("active", isOpen);
    document.body.classList.toggle("nav-open", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  const handleScroll = () => {
    header?.classList.toggle("scrolled", window.scrollY > 40);
    if (scrollBtn) {
      scrollBtn.style.display = window.scrollY > 320 ? "flex" : "none";
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  scrollBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      )
    : null;

  document.querySelectorAll("section:not(.hero):not(.page-hero)").forEach((section) => {
    if (observer) {
      observer.observe(section);
    } else {
      section.classList.add("visible");
    }
  });

  setupMenuFilter();
  setupGallery();
  setupReservationForm();
});

function setupMenuFilter() {
  const tabs = document.querySelectorAll(".menu-tabs .tab-btn");
  const cards = document.querySelectorAll(".menu-card");

  if (!tabs.length || !cards.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const category = tab.dataset.category;

      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");

      cards.forEach((card) => {
        const shouldShow = category === "all" || card.dataset.category === category;
        card.classList.toggle("hidden", !shouldShow);
      });
    });
  });
}

function setupGallery() {
  const tabs = document.querySelectorAll(".gallery-tabs .tab-btn");
  const items = Array.from(document.querySelectorAll(".gallery-item"));
  const lightbox = document.getElementById("lightbox");
  const backdrop = document.getElementById("lightbox-backdrop");
  const lightboxImg = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  const closeBtn = document.getElementById("lightbox-close");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  let activeItems = items;
  let currentIndex = 0;

  if (tabs.length && items.length) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const filter = tab.dataset.filter;

        tabs.forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");

        items.forEach((item) => {
          const shouldShow = filter === "all" || item.dataset.filter === filter;
          item.classList.toggle("hidden", !shouldShow);
        });

        activeItems = items.filter((item) => !item.classList.contains("hidden"));
      });
    });
  }

  if (!lightbox || !backdrop || !lightboxImg || !caption) return;

  const showImage = (index) => {
    if (!activeItems.length) return;
    currentIndex = (index + activeItems.length) % activeItems.length;
    const item = activeItems[currentIndex];
    const img = item.querySelector("img");
    const label = item.querySelector(".gallery-overlay span")?.textContent || img?.alt || "";

    lightboxImg.src = img?.src || "";
    lightboxImg.alt = img?.alt || label;
    caption.textContent = label;
  };

  const openLightbox = (item) => {
    activeItems = items.filter((candidate) => !candidate.classList.contains("hidden"));
    currentIndex = activeItems.indexOf(item);
    showImage(currentIndex);
    lightbox.classList.add("active");
    backdrop.classList.add("active");
    document.body.classList.add("nav-open");
  };

  const closeLightbox = () => {
    lightbox.classList.remove("active");
    backdrop.classList.remove("active");
    document.body.classList.remove("nav-open");
  };

  items.forEach((item) => {
    item.addEventListener("click", () => openLightbox(item));
  });

  closeBtn?.addEventListener("click", closeLightbox);
  backdrop.addEventListener("click", closeLightbox);
  prevBtn?.addEventListener("click", () => showImage(currentIndex - 1));
  nextBtn?.addEventListener("click", () => showImage(currentIndex + 1));

  document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) return;

    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") showImage(currentIndex - 1);
    if (event.key === "ArrowRight") showImage(currentIndex + 1);
  });
}

function setupReservationForm() {
  const form = document.getElementById("reservation-form");
  const success = document.getElementById("form-success");
  const dateInput = document.getElementById("res-date");

  if (!form) return;

  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  const rules = {
    "res-fname": (value) => value.trim().length >= 2 || "Enter your first name.",
    "res-lname": (value) => value.trim().length >= 2 || "Enter your last name.",
    "res-email": (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || "Enter a valid email.",
    "res-phone": (value) => value.replace(/\D/g, "").length >= 10 || "Enter a valid phone number.",
    "res-date": (value) => Boolean(value) || "Choose a reservation date.",
    "res-time": (value) => Boolean(value) || "Choose a reservation time.",
    "res-guests": (value) => Boolean(value) || "Choose your party size."
  };

  const setError = (input, message) => {
    const group = input.closest(".form-group");
    const error = group?.querySelector(".field-error");
    group?.classList.toggle("invalid", Boolean(message));
    if (error) error.textContent = message || "";
  };

  const validateInput = (input) => {
    const validator = rules[input.id];
    if (!validator) return true;

    const result = validator(input.value);
    const message = result === true ? "" : result;
    setError(input, message);
    return result === true;
  };

  Object.keys(rules).forEach((id) => {
    const input = document.getElementById(id);
    input?.addEventListener("input", () => validateInput(input));
    input?.addEventListener("blur", () => validateInput(input));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const inputs = Object.keys(rules)
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const results = inputs.map(validateInput);
    const isValid = results.every(Boolean);

    if (!isValid) {
      inputs.find((input) => input.closest(".form-group")?.classList.contains("invalid"))?.focus();
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    const text = submitBtn?.querySelector(".btn-text");
    const loading = submitBtn?.querySelector(".btn-loading");

    submitBtn?.setAttribute("disabled", "true");
    if (text) text.style.display = "none";
    if (loading) loading.style.display = "inline";

    window.setTimeout(() => {
      form.style.display = "none";
      if (success) success.style.display = "block";
      success?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 500);
  });
}
