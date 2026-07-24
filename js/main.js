(function () {
  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-nav]");
  const hero = document.querySelector(".hero");
  const heroVisual = document.querySelector("[data-hero-visual]");
  const mobileBreakpoint = 1040;

  root.classList.add("js");

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  let scrollTicking = false;
  updateHeader();
  window.addEventListener(
    "scroll",
    function () {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        updateHeader();
        scrollTicking = false;
      });
    },
    { passive: true }
  );

  function setMenu(open, returnFocus) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);

    const label = menuButton.querySelector(".menu-label");
    if (label) {
      label.textContent = open ? "CLOSE" : "MENU";
    }

    if (!open && returnFocus) {
      menuButton.focus();
    }
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenu(!isOpen, false);
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenu(false, false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (menuButton.getAttribute("aria-expanded") === "true") {
        setMenu(false, true);
      }
    });

    document.addEventListener("pointerdown", function (event) {
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (header && !header.contains(event.target)) {
        setMenu(false, false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > mobileBreakpoint) {
        setMenu(false, false);
      }
    });

  }

  if (hero) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        hero.classList.add("is-ready");
      });
    });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (heroVisual && finePointer.matches && !reduceMotion.matches) {
    heroVisual.addEventListener("pointermove", function (event) {
      const bounds = heroVisual.getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;
      heroVisual.style.setProperty("--shift-x", relativeX * -10 + "px");
      heroVisual.style.setProperty("--shift-y", relativeY * -10 + "px");
    });

    heroVisual.addEventListener("pointerleave", function () {
      heroVisual.style.setProperty("--shift-x", "0px");
      heroVisual.style.setProperty("--shift-y", "0px");
    });
  }

  const revealTargets = document.querySelectorAll("[data-reveal]");

  revealTargets.forEach(function (target, index) {
    target.style.setProperty("--reveal-delay", (index % 3) * 65 + "ms");
  });

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealTargets.forEach(function (target) {
      target.classList.add("is-visible");
    });
  } else {
    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.1,
      }
    );

    revealTargets.forEach(function (target) {
      revealObserver.observe(target);
    });
  }

  if (nav && "IntersectionObserver" in window) {
    const navLinks = Array.from(nav.querySelectorAll("a[href^='#']"));
    const observedSections = navLinks
      .map(function (link) {
        return document.querySelector(link.getAttribute("href"));
      })
      .filter(Boolean);

    if (hero) {
      observedSections.unshift(hero);
    }

    function markCurrent(id) {
      navLinks.forEach(function (link) {
        const current = link.getAttribute("href") === "#" + id;
        link.classList.toggle("is-current", current);
        if (current) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    const sectionObserver = new IntersectionObserver(
      function (entries) {
        const visible = entries
          .filter(function (entry) {
            return entry.isIntersecting;
          })
          .sort(function (a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          });

        if (visible[0]) {
          markCurrent(visible[0].target.id);
        }
      },
      {
        rootMargin: "-32% 0px -52% 0px",
        threshold: [0, 0.15, 0.4],
      }
    );

    observedSections.forEach(function (section) {
      sectionObserver.observe(section);
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
      const submitLabel = submitButton ? submitButton.querySelector("span") : null;
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

      if (contactForm.dataset.contactCcUser) {
        formData.set(
          "_cc",
          [
            contactForm.dataset.contactCcUser,
            "@",
            contactForm.dataset.contactDomain,
            ".",
            contactForm.dataset.contactTld,
          ].join("")
        );
      }

      setFormStatus(contactForm, "送信中です。", "");
      if (submitButton) {
        submitButton.disabled = true;
      }
      if (submitLabel) {
        submitLabel.textContent = "送信中…";
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
          if (submitLabel) {
            submitLabel.textContent = "送信する";
          }
        });
    });
  }
})();
