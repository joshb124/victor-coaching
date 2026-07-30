/* =========================================================
   Vice Wave Coaching — behaviour
   - Injects brand/social from config.js
   - Handles waitlist signups -> Supabase (insert-only via RLS)
   ========================================================= */
(function () {
  "use strict";

  var cfg = window.VW_CONFIG || {};
  var sb = cfg.supabase || {};

  /* ---------- Small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Fill brand + tagline + year ---------- */
  if (cfg.brand) $all("[data-brand]").forEach(function (el) { el.textContent = cfg.brand; });
  if (cfg.tagline) $all("[data-tagline]").forEach(function (el) { el.textContent = cfg.tagline; });
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Social links ---------- */
  var social = cfg.social || {};
  var socialMeta = {
    tiktok: { label: "TikTok", short: "TT" },
    instagram: { label: "Instagram", short: "IG" },
    youtube: { label: "YouTube", short: "YT" },
    email: { label: "Email", short: "@" },
  };

  function socialHref(key, val) {
    return key === "email" ? "mailto:" + val : val;
  }

  // Coach section: text links
  var coachSocial = $("#coach-social");
  if (coachSocial) {
    Object.keys(socialMeta).forEach(function (key) {
      var val = social[key];
      if (!val) return;
      var a = document.createElement("a");
      a.className = "social-link";
      a.href = socialHref(key, val);
      if (key !== "email") { a.target = "_blank"; a.rel = "noopener"; }
      a.innerHTML = "<span aria-hidden='true'>" + socialMeta[key].short + "</span> " + socialMeta[key].label;
      coachSocial.appendChild(a);
    });
  }

  // Footer: icon badges
  var footerSocial = $("#footer-social");
  if (footerSocial) {
    Object.keys(socialMeta).forEach(function (key) {
      var val = social[key];
      if (!val) return;
      var a = document.createElement("a");
      a.href = socialHref(key, val);
      a.title = socialMeta[key].label;
      a.setAttribute("aria-label", socialMeta[key].label);
      if (key !== "email") { a.target = "_blank"; a.rel = "noopener"; }
      a.textContent = socialMeta[key].short;
      footerSocial.appendChild(a);
    });
  }

  /* ---------- Waitlist submission ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function backendReady() {
    return sb.url && sb.key && sb.url.indexOf("http") === 0 &&
           sb.key.indexOf("YOUR_") !== 0;
  }

  // Insert one signup via Supabase PostgREST. Returns a Promise.
  function submitSignup(payload) {
    var endpoint = sb.url.replace(/\/$/, "") + "/rest/v1/" + (sb.table || "waitlist");
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": sb.key,
        "Authorization": "Bearer " + sb.key,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (res.ok) return { ok: true };
      // 409 = unique violation -> already on the list
      if (res.status === 409) return { ok: true, duplicate: true };
      return res.text().then(function (t) {
        var msg = t;
        try { msg = JSON.parse(t).message || t; } catch (e) {}
        return { ok: false, status: res.status, message: msg };
      });
    });
  }

  // Wire up a form. `opts.onSuccess` runs after a successful insert.
  function wireForm(form, opts) {
    if (!form) return;
    opts = opts || {};

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var honeypot = form.querySelector("input[name='company']");
      if (honeypot && honeypot.value) return; // bot caught silently

      var emailEl = form.querySelector("input[name='email']");
      var email = (emailEl ? emailEl.value : "").trim().toLowerCase();
      var statusEl = opts.statusEl;

      function setStatus(msg, kind) {
        if (!statusEl) return;
        statusEl.textContent = msg || "";
        statusEl.className = "form-status" + (kind ? " is-" + kind : "");
      }

      if (!EMAIL_RE.test(email)) {
        setStatus("Please enter a valid email address.", "error");
        if (emailEl) emailEl.focus();
        return;
      }

      var nameEl = form.querySelector("input[name='name']");
      var goalEl = form.querySelector("select[name='goal']");
      var payload = {
        email: email,
        name: nameEl && nameEl.value.trim() ? nameEl.value.trim() : null,
        goal: goalEl && goalEl.value ? goalEl.value : null,
        source: opts.source || "website",
        user_agent: navigator.userAgent,
      };

      var submitBtn = form.querySelector("button[type='submit']");
      var originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Joining…"; }
      setStatus("", "");

      if (!backendReady()) {
        // Graceful demo fallback if the backend isn't configured yet.
        window.setTimeout(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
          opts.onSuccess ? opts.onSuccess({ demo: true, email: email }) :
            setStatus("Thanks! You're on the list. 🎉", "ok");
        }, 600);
        return;
      }

      submitSignup(payload).then(function (result) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
        if (result.ok) {
          if (opts.onSuccess) opts.onSuccess({ email: email, duplicate: result.duplicate });
          else setStatus(result.duplicate ? "You're already on the list! 🙌" : "You're on the list! 🎉", "ok");
        } else {
          console.error("Waitlist error:", result.status, result.message);
          setStatus("Something went wrong. Please try again in a moment.", "error");
        }
      }).catch(function (err) {
        console.error("Waitlist network error:", err);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
        setStatus("Network hiccup — please check your connection and retry.", "error");
      });
    });
  }

  /* ---------- Main waitlist form (with success panel) ---------- */
  var mainForm = $("#waitlist-form");
  var successPanel = $("#waitlist-success");
  wireForm(mainForm, {
    statusEl: $("#wl-status"),
    source: "waitlist_section",
    onSuccess: function (data) {
      if (successPanel && mainForm) {
        mainForm.hidden = true;
        successPanel.hidden = false;
        var msg = $("#success-msg");
        if (msg && data.duplicate) msg.textContent = "Looks like you're already on the list — we've got you. Hang tight for early access!";
        buildShare($("#success-share"));
        successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
  });

  /* ---------- Hero inline form ---------- */
  wireForm($("#hero-form"), {
    source: "hero",
    onSuccess: function () {
      // Prefill + reveal the main form's success state, then jump there.
      var heroEmail = $("#hero-email");
      var wlEmail = $("#wl-email");
      if (heroEmail && wlEmail) wlEmail.value = heroEmail.value;
      if (successPanel && mainForm) {
        mainForm.hidden = true;
        successPanel.hidden = false;
        buildShare($("#success-share"));
      }
      var target = document.getElementById("waitlist");
      if (target) target.scrollIntoView({ behavior: "smooth" });
    },
  });

  /* ---------- Share buttons on success ---------- */
  function buildShare(container) {
    if (!container || container.childElementCount) return;
    var shareUrl = window.location.origin && window.location.origin !== "null"
      ? window.location.origin + window.location.pathname : "";
    var text = "I just joined the " + (cfg.brand || "Vice Wave") + " coaching waitlist 💪";

    if (navigator.share) {
      var btn = document.createElement("button");
      btn.className = "btn btn--sm btn--primary";
      btn.type = "button";
      btn.textContent = "Share with a friend";
      btn.addEventListener("click", function () {
        navigator.share({ title: cfg.brand || "Vice Wave", text: text, url: shareUrl }).catch(function () {});
      });
      container.appendChild(btn);
    }
    if (cfg.social && cfg.social.tiktok) {
      var a = document.createElement("a");
      a.className = "btn btn--sm btn--light";
      a.href = cfg.social.tiktok; a.target = "_blank"; a.rel = "noopener";
      a.textContent = "Follow on TikTok";
      container.appendChild(a);
    }
  }
})();
