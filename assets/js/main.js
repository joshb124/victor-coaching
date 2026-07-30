/* =========================================================
   Levo — shared behaviour for all pages
   - Brand/creator injection from config.js
   - Accessible form validation (blur + submit, inline errors)
   - Supabase inserts (insert-only RLS), honest failure states
   - Locked-card reveal interaction
   ========================================================= */
(function () {
  "use strict";

  var cfg = window.LEVO_CONFIG || {};
  var sb = cfg.supabase || {};
  var tables = sb.tables || {};

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Injection ---------- */
  if (cfg.brand) $all("[data-brand]").forEach(function (el) { el.textContent = cfg.brand; });
  $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var victor = (cfg.creators || {}).victor;
  if (victor) {
    $all("[data-creator-name]").forEach(function (el) { el.textContent = victor.name; });
    $all("[data-creator-handle]").forEach(function (el) { el.textContent = victor.handle; });
  }

  var socialMeta = {
    tiktok: { label: "TikTok", short: "TT" },
    instagram: { label: "Instagram", short: "IG" },
    email: { label: "Email", short: "@" },
  };
  $all("[data-social-links]").forEach(function (container) {
    var who = container.getAttribute("data-social-links");
    var links = who === "platform"
      ? (cfg.social || {})
      : ((cfg.creators && cfg.creators[who] && cfg.creators[who].social) || {});
    Object.keys(socialMeta).forEach(function (key) {
      var val = links[key];
      if (!val) return;
      var a = document.createElement("a");
      a.href = key === "email" ? "mailto:" + val : val;
      if (key !== "email") { a.target = "_blank"; a.rel = "noopener"; }
      a.className = "social-link";
      a.textContent = socialMeta[key].label;
      container.appendChild(a);
    });
  });

  /* =========================================================
     Form validation — accessible, inline, actionable
     ========================================================= */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // A field's error element lives directly after it: <p class="field-error" id="<field-id>-error">
  function errorEl(field) {
    return document.getElementById(field.id + "-error");
  }

  function showError(field, message) {
    var err = errorEl(field);
    if (!err) return;
    err.textContent = message;
    err.hidden = false;
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", err.id);
  }

  function clearError(field) {
    var err = errorEl(field);
    if (!err) return;
    err.textContent = "";
    err.hidden = true;
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }

  // Returns an error message, or "" if the field is valid.
  function validateField(field) {
    var val = (field.value || "").trim();
    if (field.hasAttribute("data-required") && !val) {
      return field.getAttribute("data-required-msg") || "Fill in this field.";
    }
    if (field.type === "email" && val && !EMAIL_RE.test(val)) {
      return "Enter a valid email address.";
    }
    return "";
  }

  function backendReady() {
    return sb.url && sb.key && sb.url.indexOf("http") === 0;
  }

  function submitRow(table, payload) {
    var endpoint = sb.url.replace(/\/$/, "") + "/rest/v1/" + table;
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
      // 409 = unique email violation -> already signed up; treat as success
      if (res.status === 409) return { ok: true, duplicate: true };
      return res.text().then(function (t) {
        var msg = t;
        try { msg = JSON.parse(t).message || t; } catch (e) {}
        return { ok: false, status: res.status, message: msg };
      });
    });
  }

  // opts: { table, source, buildPayload(form, email), successPanel, duplicateMsgEl, duplicateMsg }
  function wireForm(form, opts) {
    if (!form) return;

    var fields = $all("input.field, select.field, textarea.field", form);

    // Validate on blur, clear on input
    fields.forEach(function (field) {
      field.addEventListener("blur", function () {
        var msg = validateField(field);
        if (msg) showError(field, msg); else clearError(field);
      });
      field.addEventListener("input", function () { clearError(field); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: bots fill it, humans never see it
      var honeypot = form.querySelector("input[name='company']");
      if (honeypot && honeypot.value) return;

      // Validate everything; focus the first failure
      var firstBad = null;
      fields.forEach(function (field) {
        var msg = validateField(field);
        if (msg) {
          showError(field, msg);
          if (!firstBad) firstBad = field;
        } else {
          clearError(field);
        }
      });
      if (firstBad) { firstBad.focus(); return; }

      var emailEl = form.querySelector("input[type='email']");
      var email = emailEl.value.trim().toLowerCase();
      var payload = opts.buildPayload(form, email);
      payload.source = opts.source || "website";
      payload.user_agent = navigator.userAgent;

      var submitBtn = form.querySelector("button[type='submit']");
      var label = submitBtn.innerHTML;
      var status = form.querySelector(".form-status");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      if (status) { status.textContent = ""; status.classList.remove("is-error"); }

      function fail(message) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = label;
        if (status) {
          status.textContent = message + " Your answers are still here — try again.";
          status.classList.add("is-error");
        }
      }

      if (!backendReady()) {
        // Demo mode: no backend wired — say so honestly instead of faking success.
        console.log("[levo demo mode] form payload:", payload);
        fail("Demo mode: no backend is connected, so this wasn't saved.");
        return;
      }

      submitRow(opts.table, payload).then(function (result) {
        if (!result.ok) {
          console.error("Form error:", result.status, result.message);
          fail("That didn't save (server said no).");
          return;
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = label;
        if (result.duplicate && opts.duplicateMsgEl) {
          var el = $(opts.duplicateMsgEl);
          if (el) el.textContent = opts.duplicateMsg;
        }
        form.hidden = true;
        var panel = $(opts.successPanel);
        if (panel) {
          panel.hidden = false;
          var h = panel.querySelector("h3");
          if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
        }
      }).catch(function (err) {
        console.error("Form network error:", err);
        fail("Network problem — check your connection.");
      });
    });
  }

  /* ---------- Coach application (/coaches) ---------- */
  wireForm($("#apply-form"), {
    table: tables.coachApplications || "coach_applications",
    source: "coach_apply",
    buildPayload: function (form, email) {
      function v(name) {
        var el = form.querySelector("[name='" + name + "']");
        var val = el ? el.value.trim() : "";
        return val || null;
      }
      var tiktok = v("tiktok_handle");
      if (tiktok && tiktok.charAt(0) !== "@") tiktok = "@" + tiktok;
      return {
        email: email,
        name: v("name"),
        tiktok_handle: tiktok,
        instagram_handle: v("instagram_handle"),
        follower_bracket: v("follower_bracket"),
        niche: v("niche"),
        pitch: v("pitch"),
      };
    },
    successPanel: "#apply-success",
    duplicateMsgEl: "#apply-success-msg",
    duplicateMsg: "You've already applied — we're on it. We review every application personally and reply either way.",
  });

  /* ---------- Fan waitlist (/train/victor) ---------- */
  wireForm($("#waitlist-form"), {
    table: tables.waitlist || "waitlist",
    source: "victor_page",
    buildPayload: function (form, email) {
      function v(name) {
        var el = form.querySelector("[name='" + name + "']");
        var val = el ? el.value.trim() : "";
        return val || null;
      }
      return { email: email, name: v("name"), goal: v("goal") };
    },
    successPanel: "#wl-success",
    duplicateMsgEl: "#wl-success-msg",
    duplicateMsg: "You're already on Victor's list. You'll get an email with early access before doors open publicly.",
  });

  /* =========================================================
     Locked content cards — respond to click and keyboard
     ========================================================= */
  $all(".locked-card").forEach(function (card) {
    function toggle() {
      var open = card.getAttribute("aria-expanded") === "true";
      card.setAttribute("aria-expanded", String(!open));
      card.classList.toggle("is-open", !open);
    }
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
})();
