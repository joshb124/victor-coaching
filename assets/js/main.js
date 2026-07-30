/* =========================================================
   Repwave — shared behaviour for all pages
   - Injects brand/social/creator data from config.js
   - Generic form wiring -> Supabase PostgREST (insert-only RLS)
   - Page-specific forms are wired by ID; missing forms are skipped
   ========================================================= */
(function () {
  "use strict";

  var cfg = window.RW_CONFIG || {};
  var sb = cfg.supabase || {};
  var tables = sb.tables || {};

  /* ---------- Small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Brand + tagline + year injection ---------- */
  if (cfg.brand) $all("[data-brand]").forEach(function (el) { el.textContent = cfg.brand; });
  if (cfg.tagline) $all("[data-tagline]").forEach(function (el) { el.textContent = cfg.tagline; });
  $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Social link builders ---------- */
  var socialMeta = {
    tiktok: { label: "TikTok", short: "TT" },
    instagram: { label: "Instagram", short: "IG" },
    youtube: { label: "YouTube", short: "YT" },
    email: { label: "Email", short: "@" },
  };

  function socialHref(key, val) {
    return key === "email" ? "mailto:" + val : val;
  }

  // Fill any container marked data-social-links="platform" or "victor"
  // with pill links; data-social-style="icon" renders compact badges.
  $all("[data-social-links]").forEach(function (container) {
    var who = container.getAttribute("data-social-links");
    var links = who === "platform"
      ? (cfg.social || {})
      : ((cfg.creators && cfg.creators[who] && cfg.creators[who].social) || {});
    var iconStyle = container.getAttribute("data-social-style") === "icon";

    Object.keys(socialMeta).forEach(function (key) {
      var val = links[key];
      if (!val) return;
      var a = document.createElement("a");
      a.href = socialHref(key, val);
      if (key !== "email") { a.target = "_blank"; a.rel = "noopener"; }
      if (iconStyle) {
        a.title = socialMeta[key].label;
        a.setAttribute("aria-label", socialMeta[key].label);
        a.textContent = socialMeta[key].short;
      } else {
        a.className = "social-link";
        a.innerHTML = "<span aria-hidden='true'>" + socialMeta[key].short + "</span> " + socialMeta[key].label;
      }
      container.appendChild(a);
    });
  });

  /* ---------- Creator data injection (victor page) ---------- */
  var victor = (cfg.creators || {}).victor;
  if (victor) {
    $all("[data-creator-name]").forEach(function (el) { el.textContent = victor.name; });
    $all("[data-creator-handle]").forEach(function (el) { el.textContent = victor.handle; });
    var statRow = $("[data-creator-stats]");
    if (statRow && victor.stats) {
      victor.stats.forEach(function (s) {
        var li = document.createElement("li");
        var strong = document.createElement("strong");
        strong.textContent = s.value;
        var span = document.createElement("span");
        span.textContent = s.label;
        li.appendChild(strong); li.appendChild(span);
        statRow.appendChild(li);
      });
    }
  }

  /* ---------- Form submission core ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function backendReady() {
    return sb.url && sb.key && sb.url.indexOf("http") === 0 &&
           sb.key.indexOf("YOUR_") !== 0;
  }

  // Insert one row into `table` via Supabase PostgREST. Returns a Promise.
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
      // 409 = unique violation -> this email already signed up
      if (res.status === 409) return { ok: true, duplicate: true };
      return res.text().then(function (t) {
        var msg = t;
        try { msg = JSON.parse(t).message || t; } catch (e) {}
        return { ok: false, status: res.status, message: msg };
      });
    });
  }

  // Wire up a form.
  // opts: { table, statusEl, source, buildPayload(form, email), onSuccess(data) }
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

      // Per-form required fields beyond email (marked data-required)
      var missing = null;
      $all("[data-required]", form).forEach(function (el) {
        if (!missing && !el.value.trim()) missing = el;
      });
      if (missing) {
        setStatus("Please fill in the required fields.", "error");
        missing.focus();
        return;
      }

      var payload = opts.buildPayload
        ? opts.buildPayload(form, email)
        : { email: email };
      payload.source = opts.source || "website";
      payload.user_agent = navigator.userAgent;

      var submitBtn = form.querySelector("button[type='submit']");
      var originalLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
      setStatus("", "");

      function finish() {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
      }

      if (!backendReady()) {
        // Graceful demo fallback if the backend isn't configured yet.
        window.setTimeout(function () {
          finish();
          if (opts.onSuccess) opts.onSuccess({ demo: true, email: email });
          else setStatus("Got it — you're in! 🎉", "ok");
        }, 600);
        return;
      }

      submitRow(opts.table, payload).then(function (result) {
        finish();
        if (result.ok) {
          if (opts.onSuccess) opts.onSuccess({ email: email, duplicate: result.duplicate });
          else setStatus(result.duplicate ? "You're already in! 🙌" : "Got it — you're in! 🎉", "ok");
        } else {
          console.error("Form error:", result.status, result.message);
          setStatus("Something went wrong. Please try again in a moment.", "error");
        }
      }).catch(function (err) {
        console.error("Form network error:", err);
        finish();
        setStatus("Network hiccup — please check your connection and retry.", "error");
      });
    });
  }

  // Standard success behaviour: hide the form, show its success panel.
  function successSwap(form, panel, duplicateMsgSel, duplicate) {
    if (!form || !panel) return;
    form.hidden = true;
    panel.hidden = false;
    if (duplicate && duplicateMsgSel) {
      var msg = $(duplicateMsgSel);
      if (msg) msg.textContent = msg.getAttribute("data-duplicate-msg") || msg.textContent;
    }
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* =========================================================
     Page: index.html — coach application form
     ========================================================= */
  var applyForm = $("#apply-form");
  if (applyForm) {
    wireForm(applyForm, {
      table: tables.coachApplications || "coach_applications",
      statusEl: $("#apply-status"),
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
      onSuccess: function (data) {
        var msg = $("#apply-success-msg");
        if (msg && data.duplicate) {
          msg.textContent = "You've already applied — we're on it. We review every coach personally.";
        }
        successSwap(applyForm, $("#apply-success"));
      },
    });
  }

  /* =========================================================
     Page: victor.html — fan waitlist form
     ========================================================= */
  var waitlistForm = $("#waitlist-form");
  if (waitlistForm) {
    wireForm(waitlistForm, {
      table: tables.waitlist || "waitlist",
      statusEl: $("#wl-status"),
      source: "victor_page",
      buildPayload: function (form, email) {
        var nameEl = form.querySelector("input[name='name']");
        var goalEl = form.querySelector("select[name='goal']");
        return {
          email: email,
          name: nameEl && nameEl.value.trim() ? nameEl.value.trim() : null,
          goal: goalEl && goalEl.value ? goalEl.value : null,
        };
      },
      onSuccess: function (data) {
        var msg = $("#wl-success-msg");
        if (msg && data.duplicate) {
          msg.textContent = "You're already on Victor's list — we've got you. Hang tight for early access!";
        }
        successSwap(waitlistForm, $("#wl-success"));
        buildShare($("#wl-share"));
      },
    });
  }

  /* ---------- Share buttons on success (victor page) ---------- */
  function buildShare(container) {
    if (!container || container.childElementCount) return;
    var shareUrl = window.location.origin && window.location.origin !== "null"
      ? window.location.origin + window.location.pathname : "";
    var creator = victor || {};
    var text = "I just joined " + (creator.name || "my coach") + "'s coaching waitlist on " + (cfg.brand || "Repwave") + " 💪";

    if (navigator.share) {
      var btn = document.createElement("button");
      btn.className = "btn btn--sm btn--primary";
      btn.type = "button";
      btn.textContent = "Share with a friend";
      btn.addEventListener("click", function () {
        navigator.share({ title: creator.name || cfg.brand, text: text, url: shareUrl }).catch(function () {});
      });
      container.appendChild(btn);
    }
    if (creator.social && creator.social.tiktok) {
      var a = document.createElement("a");
      a.className = "btn btn--sm btn--ghost";
      a.href = creator.social.tiktok; a.target = "_blank"; a.rel = "noopener";
      a.textContent = "Follow " + (creator.handle || "on TikTok");
      container.appendChild(a);
    }
  }
})();
