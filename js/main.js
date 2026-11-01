// CineBook – Stage 1: navigation and page interactions.
// The recommendation engine will be added in later stages.

(function () {
  "use strict";

  const navbar = document.getElementById("navbar");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  const toTop = document.getElementById("toTop");
  const toast = document.getElementById("toast");
  const links = navLinks.querySelectorAll("a");

  // ---- Mobile menu ----
  function setMenu(open) {
    navLinks.classList.toggle("open", open);
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  }
  navToggle.addEventListener("click", () => setMenu(!navLinks.classList.contains("open")));
  links.forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // ---- Navbar style + back-to-top button on scroll ----
  function onScroll() {
    navbar.classList.toggle("scrolled", window.scrollY > 30);
    toTop.classList.toggle("show", window.scrollY > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // ---- Highlight the active nav link for the section in view ----
  const sections = document.querySelectorAll("[data-section]");
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id)
        );
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  // ---- Reveal-on-scroll animation ----
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 3) * 90 + "ms";
    revealObserver.observe(el);
  });

  // ---- Toast message ----
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  // Other scripts (favourites) show their messages through the same toast.
  window.CineBook = window.CineBook || {};
  window.CineBook.toast = showToast;

  // Buttons for features that are still to come
  document.querySelectorAll("[data-coming-soon]").forEach((btn) => {
    btn.addEventListener("click", () =>
      showToast(btn.dataset.comingSoon + " is coming in the next stage!")
    );
  });

  // (The favourites counter in the menu is kept up to date by js/favourites.js.)

  document.getElementById("year").textContent = new Date().getFullYear();
})();
