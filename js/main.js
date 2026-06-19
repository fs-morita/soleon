(function () {
  document.documentElement.classList.add("js");

  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-nav]");
  const revealTargets = document.querySelectorAll(
    ".intro-section .section-inner, .service-hero .section-inner, .service-card, .concept-section .eyebrow, .concept-section h2, .concept-list div, .company-section .section-inner, .contact-section .section-inner"
  );

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  function closeMenu() {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      nav.classList.toggle("is-open", !isOpen);
    });

    nav.addEventListener("click", function (event) {
      if (event.target instanceof HTMLAnchorElement) {
        closeMenu();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) {
        closeMenu();
      }
    });
  }

  if (revealTargets.length) {
    revealTargets.forEach(function (target, index) {
      target.classList.add("reveal");
      target.style.setProperty("--reveal-delay", (index % 4) * 70 + "ms");
    });

    if (!("IntersectionObserver" in window)) {
      revealTargets.forEach(function (target) {
        target.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
      }
    );

    revealTargets.forEach(function (target) {
      observer.observe(target);
    });
  }

  const contactForm = document.querySelector("[data-contact-form]");

  function setFormStatus(form, message, type) {
    const status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message;
    status.classList.remove("is-success", "is-error");
    if (type) {
      status.classList.add(type);
    }
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!contactForm.reportValidity()) {
        return;
      }

      const submitButton = contactForm.querySelector("button[type='submit']");
      const formData = new FormData(contactForm);
      const email = formData.get("email");
      const endpoint = [
        "https://formsubmit.co/ajax/",
        contactForm.dataset.contactUser,
        "@",
        contactForm.dataset.contactDomain,
        ".",
        contactForm.dataset.contactTld,
      ].join("");

      if (typeof email === "string") {
        formData.set("_replyto", email);
      }

      setFormStatus(contactForm, "送信中です。", "");
      if (submitButton) {
        submitButton.disabled = true;
      }

      fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Form submission failed");
          }
          return response.json();
        })
        .then(function () {
          contactForm.reset();
          setFormStatus(contactForm, "送信しました。内容を確認のうえご連絡します。", "is-success");
        })
        .catch(function () {
          setFormStatus(contactForm, "送信できませんでした。時間をおいて再度お試しください。", "is-error");
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
          }
        });
    });
  }
})();
