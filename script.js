/* History, Family, and Me — light interactivity */
(function () {
  "use strict";

  /* Current year in footer */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Mobile navigation toggle */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    /* Close the menu after choosing a link (mobile) */
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Reveal-on-scroll using IntersectionObserver (graceful fallback) */
  var revealEls = document.querySelectorAll(".reveal");
  function revealAll() {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
    // Failsafe: never let content stay stuck invisible if the observer misses it.
    window.addEventListener("load", function () {
      setTimeout(revealAll, 2000);
    });
  } else {
    revealAll();
  }

  /* Email list signup — stores subscribers in the central database (Railway API) */
  var HFM_API = "https://api-production-89e0.up.railway.app";

  var joinForm = document.getElementById("joinForm");
  if (joinForm) {
    var joinMsg = document.getElementById("joinMsg");
    var joinBtn = joinForm.querySelector(".join-btn");

    joinForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("joinName").value.trim();
      var email = document.getElementById("joinEmail").value.trim();
      var honey = joinForm.querySelector('input[name="_honey"]').value;

      if (honey) return; // bot caught by honeypot

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) {
        joinMsg.textContent = "Please enter a valid email address.";
        joinMsg.className = "join-msg is-error";
        return;
      }

      joinBtn.disabled = true;
      joinBtn.textContent = "Joining\u2026";
      joinMsg.textContent = "";
      joinMsg.className = "join-msg";

      fetch(HFM_API + "/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, source: "website" })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.success) {
            joinMsg.textContent = data.duplicate
              ? "You're already on the list — you're all set!"
              : "Welcome to the family! You're on the list. \uD83C\uDF89";
            joinMsg.className = "join-msg is-success";
            joinForm.reset();
          } else {
            throw new Error((data && data.error) || "signup failed");
          }
        })
        .catch(function () {
          joinMsg.innerHTML =
            'Hmm, that didn\u2019t go through. Please try again, or email us at ' +
            '<a href="mailto:historyfamilyandme@outlook.com">historyfamilyandme@outlook.com</a>.';
          joinMsg.className = "join-msg is-error";
        })
        .finally(function () {
          joinBtn.disabled = false;
          joinBtn.textContent = "Join the List";
        });
    });
  }
})();
