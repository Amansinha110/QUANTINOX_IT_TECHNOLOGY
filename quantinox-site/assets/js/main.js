/* Quantinox IT Technology — site behaviour (no libraries needed) */
(function () {
  "use strict";

  var config = window.QX_CONFIG || {};
  // "/" means the backend serves this website itself (single-server mode, SERVE_SITE_DIR)
  var apiBase = String(config.apiBase || "").trim() === "/" ? window.location.origin : String(config.apiBase || "").replace(/\/+$/, "");

  /* ---------- Text used by scripts, in each language ---------- */
  var lang = (document.documentElement.lang || "en").slice(0, 2);
  var STRINGS = {
    en: {
      openMenu: "Open menu", closeMenu: "Close menu",
      show: "Show", hide: "Hide", showPw: "Show password", hidePw: "Hide password",
      sending: "Sending…", submit: "Request demo",
      formError: "Sorry, we could not send your request. Please try again, or email us at [YOUR EMAIL].",
      formInvalid: "Please check your details and try again.",
      tooMany: "Too many attempts from this device. Please wait 15 minutes and try again.",
      notConnected: "Accounts are not switched on yet. Please book a demo and our team will set you up.",
      network: "We could not reach the server. Check your internet connection and try again.",
      required: "Please fill in all required fields.",
      emailInvalid: "Please enter a valid work email.",
      pwShort: "Your password must be at least 10 characters.",
      pwBreached: "This password has appeared in a known data breach. Please choose a different one.",
      exportBusy: "Preparing your file…",
      exportDone: "Your data has been downloaded.",
      deleteWrong: "That password is not correct.",
      deleteDone: "Your account has been deleted. Taking you to the home page…",
      consent: "Please accept the Terms of use and Privacy policy.",
      wrongLogin: "Incorrect email or password.",
      unverified: "Please confirm your email first. Check your inbox for our link, or send a new one.",
      linkSent: "If that email needs confirming, a new link is on its way.",
      linkInvalid: "This link has expired or was already used.",
      wait: "Please wait…",
      createAccount: "Create account", logIn: "Log in", sendLink: "Send reset link", saveNew: "Save new password", sendNew: "Send a new link",
      finderNone: "Select at least one area to see a suggestion.",
      finderEss: "Core finance with order to cash and procure to pay covers what you selected.",
      finderSuite: "You need operations as well as finance, so start with finance, supply chain, manufacturing and services on one platform.",
      finderBig: "Running many entities, or need a dedicated cloud? Ask us about Enterprise Private.",
      addonAssets: "+ Asset & field service add-on", addonHr: "+ People & payroll add-on",
      searchLabel: "Search the site", searchPlaceholder: "Search products, industries, support…",
      searchClose: "Esc", searchNone: "No matches. Try another word, or contact sales.",
      cookieText: "We use analytics cookies to understand how people use this site. You can accept or decline them.", cookieAccept: "Accept", cookieDecline: "Decline",
      tourNext: "Next", tourRestart: "Start again"
    },
    hi: {
      openMenu: "मेन्यू खोलें", closeMenu: "मेन्यू बंद करें",
      show: "दिखाएँ", hide: "छिपाएँ", showPw: "पासवर्ड दिखाएँ", hidePw: "पासवर्ड छिपाएँ",
      sending: "भेजा जा रहा है…", submit: "डेमो का अनुरोध करें",
      formError: "क्षमा करें, आपका अनुरोध नहीं भेजा जा सका। कृपया फिर से कोशिश करें, या हमें [YOUR EMAIL] पर ईमेल करें।",
      formInvalid: "कृपया अपना विवरण जाँचें और फिर से कोशिश करें।",
      tooMany: "इस डिवाइस से बहुत अधिक कोशिशें हुई हैं। कृपया 15 मिनट बाद फिर से कोशिश करें।",
      notConnected: "खाते अभी चालू नहीं हुए हैं। कृपया डेमो बुक करें, हमारी टीम आपका खाता तैयार करेगी।",
      network: "सर्वर से संपर्क नहीं हो सका। अपना इंटरनेट कनेक्शन जाँचें और फिर से कोशिश करें।",
      required: "कृपया सभी ज़रूरी फ़ील्ड भरें।",
      emailInvalid: "कृपया सही कार्य ईमेल दर्ज करें।",
      pwShort: "आपका पासवर्ड कम से कम 10 अक्षरों का होना चाहिए।",
      pwBreached: "यह पासवर्ड किसी ज्ञात डेटा लीक में सामने आ चुका है। कृपया कोई दूसरा पासवर्ड चुनें।",
      exportBusy: "आपकी फ़ाइल तैयार की जा रही है…",
      exportDone: "आपका डेटा डाउनलोड हो गया है।",
      deleteWrong: "यह पासवर्ड सही नहीं है।",
      deleteDone: "आपका खाता हटा दिया गया है। आपको होम पेज पर ले जाया जा रहा है…",
      consent: "कृपया उपयोग की शर्तें और गोपनीयता नीति स्वीकार करें।",
      wrongLogin: "ईमेल या पासवर्ड गलत है।",
      unverified: "कृपया पहले अपना ईमेल कन्फ़र्म करें। हमारे लिंक के लिए अपना इनबॉक्स देखें, या नया लिंक भेजें।",
      linkSent: "अगर उस ईमेल को कन्फ़र्म करना बाकी है, तो नया लिंक भेज दिया गया है।",
      linkInvalid: "यह लिंक समाप्त हो चुका है या पहले ही इस्तेमाल हो चुका है।",
      wait: "कृपया प्रतीक्षा करें…",
      createAccount: "खाता बनाएँ", logIn: "लॉग इन", sendLink: "रीसेट लिंक भेजें", saveNew: "नया पासवर्ड सेव करें", sendNew: "नया लिंक भेजें",
      finderNone: "सुझाव देखने के लिए कम से कम एक क्षेत्र चुनें।",
      finderEss: "ऑर्डर से कैश और खरीद से भुगतान वाला कोर फ़ाइनेंस आपकी चुनी हुई ज़रूरतें पूरी करता है।",
      finderSuite: "आपको फ़ाइनेंस के साथ ऑपरेशंस भी चाहिए, इसलिए फ़ाइनेंस, सप्लाई चेन, मैन्युफ़ैक्चरिंग और सर्विसेज़ एक ही प्लेटफ़ॉर्म पर लेकर शुरू करें।",
      finderBig: "कई एंटिटी चलाते हैं या डेडिकेटेड क्लाउड चाहिए? Enterprise Private के बारे में पूछें।",
      addonAssets: "+ Asset & field service ऐड-ऑन", addonHr: "+ People & payroll ऐड-ऑन",
      searchLabel: "साइट पर खोजें", searchPlaceholder: "प्रोडक्ट, उद्योग, सहायता खोजें…",
      searchClose: "Esc", searchNone: "कुछ नहीं मिला। कोई दूसरा शब्द आज़माएँ, या सेल्स टीम से बात करें।",
      cookieText: "हम यह समझने के लिए एनालिटिक्स कुकी इस्तेमाल करते हैं कि लोग इस साइट का उपयोग कैसे करते हैं। आप इन्हें स्वीकार या अस्वीकार कर सकते हैं।", cookieAccept: "स्वीकार करें", cookieDecline: "अस्वीकार करें",
      tourNext: "आगे", tourRestart: "फिर से शुरू करें"
    }
  };
  function t(key) { return (STRINGS[lang] || STRINGS.en)[key] || STRINGS.en[key]; }

  /* ---------- Helpers ---------- */
  function $(id) { return document.getElementById(id); }

  function showStatus(el, text, kind) {
    if (!el) { return; }
    el.className = "form-status " + (kind || "is-error");
    el.textContent = text;
    el.hidden = false;
  }

  function busy(btn, on, label) {
    if (!btn) { return; }
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = t("wait"); }
    else { btn.textContent = label || btn.dataset.label || btn.textContent; }
    btn.disabled = on;
  }

  function formData(form) {
    var fd = new FormData(form);
    var data = {};
    fd.forEach(function (value, key) {
      if (key === "modules") { return; }
      data[key] = typeof value === "string" ? value.trim() : value;
    });
    if (form.querySelector('[name="modules"]')) { data.modules = fd.getAll("modules"); }
    return data;
  }

  function focusHeading(container) {
    var h = container && container.querySelector("h1, h2");
    if (h) { h.focus(); }
  }

  // Calls the Quantinox backend. Resolves to { status, data }; network failures reject.
  function api(path, body) {
    return fetch(apiBase + path, {
      method: body ? "POST" : "GET",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json", "Accept": "application/json" } : { "Accept": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data || {} };
      });
    });
  }

  function messageFor(result) {
    if (result.status === 429) { return t("tooMany"); }
    if (result.data && result.data.code === "invalid_link") { return t("linkInvalid"); }
    var fields = (result.data && result.data.fields) || [];
    if (fields.some(function (f) { return f.field === "password" && f.code === "breached"; })) { return t("pwBreached"); }
    if (fields.some(function (f) { return f.field === "password"; })) { return t("pwShort"); }
    if (fields.some(function (f) { return f.field === "email"; })) { return t("emailInvalid"); }
    if (fields.some(function (f) { return f.field === "consent"; })) { return t("consent"); }
    if (result.status === 400) { return t("formInvalid"); }
    return t("formError");
  }

  // Checks fields in the browser before sending, with a clear message.
  function checkForm(form, statusEl) {
    var invalid = form.querySelector(":invalid");
    if (!invalid) { return true; }
    var msg = t("required");
    if (invalid.type === "email" && invalid.value) { msg = t("emailInvalid"); }
    else if (invalid.type === "password" && invalid.value) { msg = t("pwShort"); }
    else if (invalid.type === "checkbox" && invalid.name === "consent") { msg = t("consent"); }
    showStatus(statusEl, msg);
    invalid.focus();
    return false;
  }

  function query(name) {
    var m = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }

  /* ---------- WhatsApp chat links ---------- */
  var waNumber = String(config.whatsappNumber || "").replace(/\D/g, "");
  if (waNumber.length >= 10) {
    document.querySelectorAll("[data-wa-text]").forEach(function (link) {
      link.href = "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(link.getAttribute("data-wa-text"));
      link.target = "_blank";
      link.rel = "noopener";
    });
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Light / dark theme ----------
     The <head> script already applied the saved or system theme before paint. */
  var root = document.documentElement;
  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* private mode */ } }
  function stored(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function syncThemeButtons() {
    var dark = root.getAttribute("data-theme") === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) { b.setAttribute("aria-pressed", dark ? "true" : "false"); });
  }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("qx-theme", next);
      syncThemeButtons();
    });
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onSystem = function (e) {
      var s = stored("qx-theme");
      if (s !== "light" && s !== "dark") { root.setAttribute("data-theme", e.matches ? "dark" : "light"); syncThemeButtons(); }
    };
    if (mq.addEventListener) { mq.addEventListener("change", onSystem); } else if (mq.addListener) { mq.addListener(onSystem); }
  }
  syncThemeButtons();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var panel = $("nav-panel");
  function closePanel(returnFocus) {
    if (!panel || !panel.classList.contains("is-open")) { return; }
    panel.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", t("openMenu"));
    if (returnFocus) { toggle.focus(); }
  }
  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? t("closeMenu") : t("openMenu"));
    });
    // Close after following an in-page link (e.g. "Quanta AI" on the home page)
    panel.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a[href*='#']")) { closePanel(false); }
    });
  }

  /* ---------- Mega menus (Products, Industries, …) ----------
     Desktop: open on hover or click, one at a time. Phones/tablets: tap to expand. */
  var desktopNav = window.matchMedia ? window.matchMedia("(min-width: 1261px)") : { matches: true };
  var canHover = window.matchMedia ? window.matchMedia("(hover: hover)") : { matches: false };
  var menuItems = Array.prototype.slice.call(document.querySelectorAll(".has-menu"));
  menuItems.forEach(function (item) {
    var trigger = item.querySelector(".menu-trigger");
    var closeTimer = null;
    var hoverOpened = false;
    function setOpen(open) {
      if (open && desktopNav.matches) {
        menuItems.forEach(function (other) {
          if (other !== item && other.classList.contains("is-open")) {
            other.classList.remove("is-open");
            other.querySelector(".menu-trigger").setAttribute("aria-expanded", "false");
          }
        });
      }
      item.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      // keep small dropdowns on screen near the right edge
      var panelEl = item.querySelector(".mega");
      if (open && panelEl && item.classList.contains("is-narrow")) {
        panelEl.classList.remove("is-right");
        if (desktopNav.matches && panelEl.getBoundingClientRect().right > window.innerWidth - 16) { panelEl.classList.add("is-right"); }
      }
    }
    trigger.addEventListener("click", function () {
      if (hoverOpened) { hoverOpened = false; setOpen(true); return; } // hover already opened it; a click should not close it
      setOpen(!item.classList.contains("is-open"));
    });
    item.addEventListener("mouseenter", function () {
      if (!desktopNav.matches || !canHover.matches) { return; }
      clearTimeout(closeTimer);
      if (!item.classList.contains("is-open")) { hoverOpened = true; setTimeout(function () { hoverOpened = false; }, 600); }
      setOpen(true);
    });
    item.addEventListener("mouseleave", function () {
      if (!desktopNav.matches || !canHover.matches) { return; }
      closeTimer = setTimeout(function () { setOpen(false); }, 160);
    });
    item.addEventListener("focusout", function (e) {
      if (desktopNav.matches && e.relatedTarget && !item.contains(e.relatedTarget)) { setOpen(false); }
    });
    document.addEventListener("click", function (e) {
      if (item.classList.contains("is-open") && !item.contains(e.target) && desktopNav.matches) { setOpen(false); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && item.classList.contains("is-open")) { setOpen(false); trigger.focus(); e.stopImmediatePropagation(); }
    });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closePanel(true); } });

  /* ---------- Site search ----------
     Searches every link in the menus and footer, so new pages are found automatically. */
  var searchBtns = document.querySelectorAll("[data-search-open]");
  if (searchBtns.length) {
    var index = [];
    var seen = {};
    document.querySelectorAll(".main-nav .mega a, .site-footer .footer-col a").forEach(function (a) {
      var href = a.getAttribute("href");
      var label = a.textContent.replace(/\s+/g, " ").replace("→", "").trim();
      if (!href || seen[href + label]) { return; }
      seen[href + label] = true;
      var col = a.closest(".mega-col, .footer-col");
      var menu = a.closest(".has-menu");
      var ctx = [];
      if (menu) { ctx.push(menu.querySelector(".menu-trigger").textContent.trim()); }
      var head = col && col.querySelector(".mega-head, h2");
      if (head && head !== a && head.textContent.trim() !== label) { ctx.push(head.textContent.trim()); }
      index.push({ href: href, label: label, ctx: ctx.join(" › "), hay: (label + " " + ctx.join(" ")).toLowerCase() });
    });
    var overlay = document.createElement("div");
    overlay.className = "search-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", t("searchLabel"));
    overlay.innerHTML = '<div class="search-box"><div class="search-field"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input type="search" autocomplete="off" spellcheck="false"><button type="button" data-search-close></button></div><ul class="search-results" role="list"></ul></div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector("input");
    var results = overlay.querySelector(".search-results");
    input.setAttribute("placeholder", t("searchPlaceholder"));
    input.setAttribute("aria-label", t("searchLabel"));
    overlay.querySelector("[data-search-close]").textContent = t("searchClose");
    var lastFocus = null;
    var render = function () {
      var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      results.innerHTML = "";
      var hits = words.length ? index.filter(function (r) { return words.every(function (w) { return r.hay.indexOf(w) > -1; }); }) : index.slice(0, 0);
      if (words.length && !hits.length) {
        var li = document.createElement("li"); li.className = "search-empty"; li.textContent = t("searchNone"); results.appendChild(li); return;
      }
      hits.slice(0, 12).forEach(function (r, i) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = r.href;
        if (i === 0) { a.className = "is-active"; }
        var strong = document.createElement("strong"); strong.textContent = r.label; a.appendChild(strong);
        if (r.ctx) { var small = document.createElement("small"); small.textContent = r.ctx; a.appendChild(small); }
        li.appendChild(a); results.appendChild(li);
      });
    };
    var openSearch = function () {
      lastFocus = document.activeElement;
      closePanel(false);
      overlay.hidden = false;
      input.value = "";
      render();
      input.focus();
    };
    var closeSearch = function () {
      overlay.hidden = true;
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    };
    searchBtns.forEach(function (b) { b.addEventListener("click", openSearch); });
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { var first = results.querySelector("a"); if (first) { e.preventDefault(); window.location.href = first.getAttribute("href"); } }
      if (e.key === "ArrowDown") { var f = results.querySelector("a"); if (f) { e.preventDefault(); f.focus(); } }
    });
    results.addEventListener("keydown", function (e) {
      var links = Array.prototype.slice.call(results.querySelectorAll("a"));
      var i = links.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); if (i > 0) { links[i - 1].focus(); } else { input.focus(); } }
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.closest("[data-search-close]")) { closeSearch(); }
      else if (e.target.closest("a")) { overlay.hidden = true; } // same-page anchors: close so the target is visible
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) { e.stopImmediatePropagation(); closeSearch(); return; }
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (e.key === "/" && overlay.hidden && !/INPUT|TEXTAREA|SELECT/.test(tag)) { e.preventDefault(); openSearch(); }
    }, true);
  }

  /* ---------- Header shadow once the page scrolls ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Reveal sections as they scroll into view ---------- */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealSel = ".section .card, .section .card-soft, .section .tile, .section .plan, .section .story, .section .resource, " +
      ".section .stat, .journey li, .flow, .section-head, .center-block, .finder-card, .migrate, .cta-band, .tabpanel";
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.querySelectorAll(revealSel).forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) { return; } // already on screen: no animation
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty("--d", Math.min(siblings, 5) * 0.06 + "s");
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* ---------- Tabs (module pages) ----------
     Each tab can be linked to directly, e.g. finance.html#finance-tab-2 */
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    function select(tab, focus, updateHash) {
      tabs.forEach(function (tb) {
        var on = tb === tab;
        tb.setAttribute("aria-selected", on ? "true" : "false");
        tb.tabIndex = on ? 0 : -1;
        var p = document.getElementById(tb.getAttribute("aria-controls"));
        if (p) { p.hidden = !on; }
      });
      if (focus) { tab.focus(); }
      if (updateHash && window.history && history.replaceState) { history.replaceState(null, "", "#" + tab.id); }
    }
    function openFromHash() {
      var h = window.location.hash.slice(1);
      tabs.forEach(function (tb) {
        if (h && (tb.id === h || tb.getAttribute("aria-controls") === h)) {
          select(tb, false, false);
          setTimeout(function () { group.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }, 50);
        }
      });
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false, true); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") { next = tabs[(i + 1) % tabs.length]; }
        if (e.key === "ArrowLeft") { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
        if (e.key === "Home") { next = tabs[0]; }
        if (e.key === "End") { next = tabs[tabs.length - 1]; }
        if (next) { e.preventDefault(); select(next, true, true); }
      });
    });
  });

  /* ---------- Pricing: monthly / annual toggle ---------- */
  var billingButtons = document.querySelectorAll("[data-billing]");
  if (billingButtons.length) {
    billingButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-billing");
        billingButtons.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        document.querySelectorAll("[data-annual]").forEach(function (el) {
          el.textContent = el.getAttribute(mode === "annual" ? "data-annual" : "data-monthly");
        });
      });
    });
  }

  /* ---------- Quanta AI interactive demo (home page) ----------
     Answers are scripted examples stored in <template data-answer> on the page. */
  document.querySelectorAll("[data-ai-demo]").forEach(function (demo) {
    var log = demo.querySelector(".chat-log");
    var chips = Array.prototype.slice.call(demo.querySelectorAll("[data-prompt]"));
    var timer = null;
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var tpl = demo.querySelector('template[data-answer="' + chip.getAttribute("data-prompt") + '"]');
        if (!tpl) { return; }
        chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
        clearTimeout(timer);
        var frag = tpl.content.cloneNode(true);
        var user = frag.querySelector(".bubble-user");
        var ai = frag.querySelector(".bubble-ai");
        log.innerHTML = "";
        log.appendChild(user);
        if (reduceMotion) { log.appendChild(ai); return; }
        var typing = document.createElement("div");
        typing.className = "typing";
        typing.setAttribute("aria-hidden", "true");
        typing.innerHTML = "<span></span><span></span><span></span>";
        log.appendChild(typing);
        timer = setTimeout(function () { log.removeChild(typing); log.appendChild(ai); }, 900);
      });
    });
  });

  /* ---------- Suite finder (home page) ---------- */
  var finder = document.querySelector("[data-finder]");
  if (finder) {
    var OPS = ["supply-chain", "manufacturing", "services"];
    var updateFinder = function () {
      var picked = Array.prototype.map.call(finder.querySelectorAll('input[name="finder"]:checked'), function (i) { return i.value; });
      var planEl = finder.querySelector("[data-finder-plan]");
      var noteEl = finder.querySelector("[data-finder-note]");
      var addEl = finder.querySelector("[data-finder-addons]");
      var link = finder.querySelector("[data-finder-link]");
      if (!picked.length) {
        planEl.textContent = "—";
        noteEl.textContent = t("finderNone");
        addEl.hidden = true;
        link.setAttribute("href", "demo.html");
        return;
      }
      var suite = picked.some(function (v) { return OPS.indexOf(v) > -1; });
      planEl.textContent = suite ? "Business Suite" : "Finance Essentials";
      noteEl.textContent = (suite ? t("finderSuite") : t("finderEss")) + (picked.length >= 6 ? " " + t("finderBig") : "");
      var addons = [];
      if (picked.indexOf("assets") > -1) { addons.push(t("addonAssets")); }
      if (picked.indexOf("hr") > -1) { addons.push(t("addonHr")); }
      addEl.innerHTML = "";
      addons.forEach(function (a) { var s = document.createElement("span"); s.textContent = a; addEl.appendChild(s); });
      addEl.hidden = !addons.length;
      link.setAttribute("href", "demo.html?modules=" + encodeURIComponent(picked.join(",")));
    };
    finder.addEventListener("change", updateFinder);
    updateFinder();
  }

  /* ---------- Show / hide password ---------- */
  document.querySelectorAll("[data-pw-toggle]").forEach(function (btn) {
    var input = $(btn.getAttribute("data-pw-toggle"));
    if (!input) { return; }
    btn.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? t("hide") : t("show");
      btn.setAttribute("aria-label", show ? t("hidePw") : t("showPw"));
    });
  });

  /* ---------- Book a demo form ---------- */
  var demoForm = $("demo-form");
  if (demoForm) {
    var demoEndpoint = config.formEndpoint || (apiBase ? apiBase + "/api/leads" : "");
    var demoSuccess = $("demo-success");
    var demoStatus = $("demo-status");
    var demoBtn = demoForm.querySelector('[type="submit"]');
    // Pre-tick modules chosen in the home page suite finder (demo.html?modules=finance,hr)
    query("modules").split(",").forEach(function (v) {
      var box = v && demoForm.querySelector('input[name="modules"][value="' + v.replace(/[^a-z-]/g, "") + '"]');
      if (box) { box.checked = true; }
    });
    // Coming from the AI Solution Advisor: put the plan summary in the message box
    var fromAdvisor = query("from") === "advisor";
    if (fromAdvisor) {
      var planNote = ""; try { planNote = sessionStorage.getItem("qx-advisor-plan") || ""; } catch (e) { /* private mode */ }
      var msgBox = demoForm.querySelector('[name="message"]');
      if (planNote && msgBox && !msgBox.value) { msgBox.value = planNote; }
    }
    var showDemoSuccess = function () {
      demoForm.hidden = true;
      demoSuccess.hidden = false;
      focusHeading(demoSuccess);
    };
    demoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      demoStatus.hidden = true;
      if (!checkForm(demoForm, demoStatus)) { return; }
      if (!demoEndpoint) {
        if (window.console) { console.info("Quantinox: set apiBase in assets/js/config.js to receive demo requests."); }
        showDemoSuccess();
        return;
      }
      var payload = formData(demoForm);
      payload.lang = lang;
      if (fromAdvisor) { payload.source = "ai-advisor"; }
      payload.page = window.location.pathname;
      demoBtn.disabled = true;
      demoBtn.textContent = t("sending");
      fetch(demoEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) { var err = new Error("Request failed"); err.status = res.status; throw err; }
        showDemoSuccess();
      }).catch(function (err) {
        showStatus(demoStatus, err && err.status === 400 ? t("formInvalid") : err && err.status === 429 ? t("tooMany") : t("formError"));
      }).then(function () {
        demoBtn.disabled = false;
        demoBtn.textContent = t("submit");
      });
    });
    var again = $("demo-again");
    if (again) {
      again.addEventListener("click", function () {
        demoForm.reset();
        demoSuccess.hidden = true;
        demoForm.hidden = false;
        demoForm.querySelector("input").focus();
      });
    }
  }

  /* ---------- Sign up ---------- */
  var signupForm = $("signup-form");
  if (signupForm) {
    var signupStatus = $("signup-status");
    var signupBtn = signupForm.querySelector('[type="submit"]');
    var signupEmail = "";
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      signupStatus.hidden = true;
      if (!checkForm(signupForm, signupStatus)) { return; }
      if (!apiBase) { showStatus(signupStatus, t("notConnected"), "is-info"); return; }
      var data = formData(signupForm);
      data.lang = lang;
      signupEmail = data.email;
      busy(signupBtn, true);
      api("/api/account/signup", data).then(function (r) {
        if (r.status === 201) {
          $("signup-email").textContent = signupEmail;
          signupForm.hidden = true;
          $("signup-success").hidden = false;
          focusHeading($("signup-success"));
        } else {
          showStatus(signupStatus, messageFor(r));
        }
      }).catch(function () { showStatus(signupStatus, t("network")); })
        .then(function () { busy(signupBtn, false, t("createAccount")); });
    });
    var signupResend = $("signup-resend");
    if (signupResend) {
      signupResend.addEventListener("click", function () {
        busy(signupResend, true);
        api("/api/account/resend-verification", { email: signupEmail, lang: lang }).then(function (r) {
          showStatus($("resend-status"), r.status === 429 ? t("tooMany") : t("linkSent"), r.status === 429 ? "is-error" : "is-info");
        }).catch(function () { showStatus($("resend-status"), t("network")); })
          .then(function () { busy(signupResend, false, t("sendNew")); });
      });
    }
  }

  /* ---------- Log in ---------- */
  var loginForm = $("login-form");
  if (loginForm) {
    var loginStatus = $("login-status");
    var loginBtn = loginForm.querySelector('[type="submit"]');
    var loginResend = $("login-resend");
    // Already logged in? Go straight to the account page.
    if (apiBase) {
      api("/api/account/me").then(function (r) { if (r.status === 200) { window.location.href = "account.html"; } }).catch(function () {});
    }
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      loginStatus.hidden = true;
      loginResend.hidden = true;
      if (!checkForm(loginForm, loginStatus)) { return; }
      if (!apiBase) { showStatus(loginStatus, t("notConnected"), "is-info"); return; }
      busy(loginBtn, true);
      var data = formData(loginForm);
      api("/api/account/login", { email: data.email, password: data.password }).then(function (r) {
        if (r.status === 200) { window.location.href = "account.html"; return; }
        if (r.status === 403 && r.data.code === "unverified") {
          showStatus(loginStatus, t("unverified"), "is-info");
          loginResend.hidden = false;
        } else if (r.status === 401) {
          showStatus(loginStatus, t("wrongLogin"));
        } else {
          showStatus(loginStatus, messageFor(r));
        }
        busy(loginBtn, false, t("logIn"));
      }).catch(function () {
        showStatus(loginStatus, t("network"));
        busy(loginBtn, false, t("logIn"));
      });
    });
    loginResend.addEventListener("click", function () {
      var email = loginForm.querySelector('[name="email"]').value.trim();
      busy(loginResend, true);
      api("/api/account/resend-verification", { email: email, lang: lang }).then(function () {
        showStatus(loginStatus, t("linkSent"), "is-info");
      }).catch(function () { showStatus(loginStatus, t("network")); })
        .then(function () { busy(loginResend, false); loginResend.hidden = true; });
    });
  }

  /* ---------- Confirm email (link from the signup email) ---------- */
  if ($("verify-page")) {
    var showVerify = function (id) {
      ["verify-loading", "verify-ok", "verify-fail"].forEach(function (x) { $(x).hidden = x !== id; });
      focusHeading($(id));
    };
    var token = query("token");
    if (!apiBase || !/^[a-f0-9]{64}$/.test(token)) {
      showVerify("verify-fail");
    } else {
      api("/api/account/verify", { token: token })
        .then(function (r) { showVerify(r.status === 200 ? "verify-ok" : "verify-fail"); })
        .catch(function () { showVerify("verify-fail"); });
    }
    var resendForm = $("resend-form");
    resendForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("resend-form-status");
      if (!checkForm(resendForm, st)) { return; }
      if (!apiBase) { showStatus(st, t("notConnected"), "is-info"); return; }
      var btn = resendForm.querySelector('[type="submit"]');
      busy(btn, true);
      api("/api/account/resend-verification", { email: formData(resendForm).email, lang: lang }).then(function (r) {
        showStatus(st, r.status === 429 ? t("tooMany") : t("linkSent"), r.status === 429 ? "is-error" : "is-info");
      }).catch(function () { showStatus(st, t("network")); })
        .then(function () { busy(btn, false, t("sendNew")); });
    });
  }

  /* ---------- Forgot password ---------- */
  var forgotForm = $("forgot-form");
  if (forgotForm) {
    forgotForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("forgot-status");
      st.hidden = true;
      if (!checkForm(forgotForm, st)) { return; }
      if (!apiBase) { showStatus(st, t("notConnected"), "is-info"); return; }
      var btn = forgotForm.querySelector('[type="submit"]');
      busy(btn, true);
      api("/api/account/forgot-password", { email: formData(forgotForm).email, lang: lang }).then(function (r) {
        if (r.status === 200) {
          forgotForm.hidden = true;
          $("forgot-success").hidden = false;
          focusHeading($("forgot-success"));
        } else {
          showStatus(st, messageFor(r));
        }
      }).catch(function () { showStatus(st, t("network")); })
        .then(function () { busy(btn, false, t("sendLink")); });
    });
  }

  /* ---------- Choose a new password ---------- */
  var resetForm = $("reset-form");
  if (resetForm) {
    resetForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("reset-status");
      st.hidden = true;
      if (!checkForm(resetForm, st)) { return; }
      if (!apiBase) { showStatus(st, t("notConnected"), "is-info"); return; }
      var btn = resetForm.querySelector('[type="submit"]');
      busy(btn, true);
      api("/api/account/reset-password", { token: query("token"), password: formData(resetForm).password }).then(function (r) {
        if (r.status === 200) { window.location.href = "account.html"; return; }
        showStatus(st, messageFor(r));
        busy(btn, false, t("saveNew"));
      }).catch(function () {
        showStatus(st, t("network"));
        busy(btn, false, t("saveNew"));
      });
    });
  }

  /* ---------- My account ---------- */
  if ($("account")) {
    if (!apiBase) {
      $("account-loading").textContent = t("notConnected");
    } else {
      api("/api/account/me").then(function (r) {
        if (r.status !== 200) { window.location.href = "login.html"; return; }
        var c = r.data.customer;
        var dateFmt = new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });
        // Country and company size are stored in English; show them in Hindi on Hindi pages.
        var HI_VALUES = {
          "India": "भारत", "United Arab Emirates": "संयुक्त अरब अमीरात", "United Kingdom": "यूनाइटेड किंगडम",
          "United States": "संयुक्त राज्य अमेरिका", "Other": "अन्य",
          "1–50 employees": "1–50 कर्मचारी", "51–250 employees": "51–250 कर्मचारी",
          "251–1,000 employees": "251–1,000 कर्मचारी", "1,000+ employees": "1,000+ कर्मचारी"
        };
        var local = function (v) { return lang === "hi" && HI_VALUES[v] ? HI_VALUES[v] : v; };
        var values = {
          firstName: c.firstName, fullName: c.fullName, email: c.email, company: c.company,
          phone: c.phone || "—", country: local(c.country) || "—", companySize: local(c.companySize) || "—",
          createdAt: dateFmt.format(new Date(c.createdAt))
        };
        document.querySelectorAll("[data-field]").forEach(function (el) {
          var v = values[el.getAttribute("data-field")];
          if (v !== undefined) { el.textContent = v; }
        });
        $("account-loading").hidden = true;
        $("account").hidden = false;
      }).catch(function () { $("account-loading").textContent = t("network"); });

      $("logout-btn").addEventListener("click", function () {
        api("/api/account/logout", {}).catch(function () {}).then(function () { window.location.href = "login.html"; });
      });

      // Your data: download a copy (JSON) or delete the account
      var dataStatus = $("data-status");
      if ($("export-btn")) {
        $("export-btn").addEventListener("click", function () {
          var btn = this;
          btn.disabled = true;
          showStatus(dataStatus, t("exportBusy"), "is-info");
          fetch(apiBase + "/api/account/export", { credentials: "include", headers: { "Accept": "application/json" } }).then(function (res) {
            if (res.status === 401) { window.location.href = "login.html"; return null; }
            if (!res.ok) { throw new Error("HTTP " + res.status); }
            return res.blob();
          }).then(function (blob) {
            if (!blob) { return; }
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url; a.download = "quantinox-my-data.json";
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
            showStatus(dataStatus, t("exportDone"), "is-info");
          }).catch(function () { showStatus(dataStatus, t("network")); })
            .then(function () { btn.disabled = false; });
        });
      }
      var delForm = $("delete-form");
      if (delForm) {
        var delOpen = $("delete-open");
        var delStatus = delForm.querySelector(".form-status");
        var toggleDelete = function (open) {
          delForm.hidden = !open;
          delOpen.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) { delForm.querySelector("input").focus(); } else { delOpen.focus(); }
        };
        delOpen.addEventListener("click", function () { toggleDelete(delForm.hidden); });
        $("delete-cancel").addEventListener("click", function () { delForm.reset(); delStatus.hidden = true; toggleDelete(false); });
        delForm.addEventListener("submit", function (e) {
          e.preventDefault();
          if (!checkForm(delForm, delStatus)) { return; }
          var btn = delForm.querySelector("button[type=submit]");
          btn.disabled = true;
          api("/api/account/delete", { password: delForm.password.value }).then(function (r) {
            if (r.status === 200) {
              showStatus(delStatus, t("deleteDone"), "is-info");
              setTimeout(function () { window.location.href = "index.html"; }, 1800);
              return;
            }
            btn.disabled = false;
            if (r.status === 401 && r.data && r.data.error === "invalid_credentials") { showStatus(delStatus, t("deleteWrong")); }
            else if (r.status === 401) { window.location.href = "login.html"; }
            else { showStatus(delStatus, messageFor(r)); }
          }).catch(function () { btn.disabled = false; showStatus(delStatus, t("network")); });
        });
      }
    }
  }

  /* ==========================================================================
     v4 features
     ========================================================================== */

  /* ---------- Lead forms: call back, contact, event, trial, download, newsletter ----------
     All post JSON to formEndpoint (if set) or apiBase + /api/leads, with lead_type set. */
  var leadEndpoint = config.formEndpoint || (apiBase ? apiBase + "/api/leads" : "");
  document.querySelectorAll("form[data-lead]").forEach(function (form) {
    var wrap = form.closest(".lead-wrap") || form.parentElement;
    var success = wrap.querySelector("[data-lead-success]");
    var status = form.querySelector(".form-status");
    var btn = form.querySelector('[type="submit"]');
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (status) { status.hidden = true; }
      if (!checkForm(form, status)) { return; }
      var done = function () {
        form.hidden = true;
        if (success) { success.hidden = false; var h = success.querySelector("h2, h3, [tabindex]"); if (h) { h.focus(); } }
      };
      if (!leadEndpoint) {
        if (window.console) { console.info("Quantinox: set apiBase or formEndpoint in assets/js/config.js to receive " + form.getAttribute("data-lead") + " requests."); }
        done(); return;
      }
      var payload = formData(form);
      payload.lead_type = form.getAttribute("data-lead");
      payload.lang = lang;
      payload.page = window.location.pathname;
      btn.disabled = true; btn.textContent = t("sending");
      fetch(leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
        .then(function (res) { if (!res.ok) { var er = new Error("failed"); er.status = res.status; throw er; } done(); })
        .catch(function (er) { showStatus(status, er && er.status === 400 ? t("formInvalid") : er && er.status === 429 ? t("tooMany") : t("formError")); })
        .then(function () { btn.disabled = false; btn.textContent = btn.getAttribute("data-label") || btn.textContent; });
    });
  });

  /* ---------- Contact panel (bottom right) ---------- */
  document.querySelectorAll("[data-contact]").forEach(function (box) {
    var launch = box.querySelector(".contact-launch");
    var panelEl = box.querySelector(".contact-panel");
    var back = box.querySelector("[data-cp-back]");
    var show = function (view) {
      box.querySelectorAll("[data-cp-view]").forEach(function (v) { v.hidden = v.getAttribute("data-cp-view") !== view; });
      back.hidden = view === "menu";
      var first = box.querySelector('[data-cp-view="' + view + '"] input, [data-cp-view="' + view + '"] .cp-option');
      if (first) { first.focus(); }
    };
    var setOpen = function (open) {
      panelEl.hidden = !open;
      launch.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { show("menu"); } else { launch.focus(); }
    };
    launch.addEventListener("click", function () { setOpen(panelEl.hidden); });
    box.querySelector("[data-cp-close]").addEventListener("click", function () { setOpen(false); });
    back.addEventListener("click", function () { show("menu"); });
    box.querySelectorAll("[data-cp-go]").forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-cp-go")); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panelEl.hidden) { setOpen(false); } });
    document.addEventListener("click", function (e) { if (!panelEl.hidden && !box.contains(e.target)) { panelEl.hidden = true; launch.setAttribute("aria-expanded", "false"); } });
  });

  /* ---------- Product tour ---------- */
  document.querySelectorAll("[data-tour]").forEach(function (tour) {
    var tabs = Array.prototype.slice.call(tour.querySelectorAll('[role="tab"]'));
    var bar = tour.querySelector(".tour-progress span");
    var prev = tour.querySelector("[data-tour-prev]");
    var next = tour.querySelector("[data-tour-next]");
    var current = 0;
    var go = function (i, focus) {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach(function (tb, j) {
        var on = j === current;
        tb.setAttribute("aria-selected", on ? "true" : "false");
        tb.tabIndex = on ? 0 : -1;
        document.getElementById(tb.getAttribute("aria-controls")).hidden = !on;
      });
      bar.style.width = ((current + 1) / tabs.length * 100) + "%";
      prev.disabled = current === 0;
      next.textContent = current === tabs.length - 1 ? next.getAttribute("data-restart") : next.getAttribute("data-next");
      if (focus) { tabs[current].focus(); }
      tabs[current].scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    tabs.forEach(function (tb, i) {
      tb.addEventListener("click", function () { go(i, false); });
      tb.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1, true); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1, true); }
      });
    });
    prev.addEventListener("click", function () { go(current - 1, false); });
    next.addEventListener("click", function () { go(current === tabs.length - 1 ? 0 : current + 1, false); });
    // tap a hotspot to show its tip on touch screens
    tour.querySelectorAll(".hotspot").forEach(function (h) {
      h.addEventListener("click", function () { h.classList.toggle("is-open"); });
    });
    go(0, false);
  });

  /* ---------- Filterable lists (customer stories, resources) ---------- */
  document.querySelectorAll("[data-filter-scope]").forEach(function (scope) {
    var items = Array.prototype.slice.call(scope.querySelectorAll("[data-item]"));
    var selects = Array.prototype.slice.call(scope.querySelectorAll("[data-filter]"));
    var search = scope.querySelector("[data-filter-search]");
    var count = scope.querySelector("[data-filter-count]");
    var empty = scope.querySelector("[data-filter-empty]");
    var apply = function () {
      var q = search ? search.value.toLowerCase().trim() : "";
      var shown = 0;
      items.forEach(function (it) {
        var ok = selects.every(function (sel) {
          return !sel.value || (it.getAttribute("data-" + sel.getAttribute("data-filter")) || "").split(" ").indexOf(sel.value) > -1;
        }) && (!q || it.textContent.toLowerCase().indexOf(q) > -1);
        it.hidden = !ok;
        if (ok) { shown += 1; }
      });
      if (count) { count.textContent = count.getAttribute("data-template").replace("{n}", shown).replace("{total}", items.length); }
      if (empty) { empty.hidden = shown > 0; }
    };
    selects.forEach(function (s) { s.addEventListener("change", apply); });
    if (search) { search.addEventListener("input", apply); }
    // allow links like customers.html?industry=retail
    selects.forEach(function (s) { var v = query(s.getAttribute("data-filter")); if (v) { s.value = v; } });
    apply();
  });

  /* ---------- Events: "Register" picks the event in the form ---------- */
  var eventSelect = document.querySelector('form[data-lead="event"] select[name="event"]');
  if (eventSelect) {
    document.querySelectorAll("[data-event-pick]").forEach(function (a) {
      a.addEventListener("click", function () { eventSelect.value = a.getAttribute("data-event-pick"); });
    });
    if (query("event")) { eventSelect.value = query("event"); }
  }

  /* ---------- Business value calculator ---------- */
  var calc = document.querySelector("[data-calc-root]");
  if (calc) {
    var num = function (k) { var el = calc.querySelector('[data-calc="' + k + '"]'); var v = parseFloat(el && el.value); return isFinite(v) && v > 0 ? v : 0; };
    var out = function (k, v) { var el = calc.querySelector('[data-calc-out="' + k + '"]'); if (el) { el.textContent = v; } };
    var locale = lang === "hi" ? "hi-IN" : "en-IN";
    var nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    var nf1 = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    var money = new Intl.NumberFormat(locale, { style: "currency", currency: "INR", maximumFractionDigits: 0 });
    var run = function () {
      var r = num("reduction") / 100;
      var manual = num("invoices") * num("minutes") / 60 + num("team") * num("close_days") * 8;
      var saved = manual * r;
      var hourly = num("cost") / 160;
      out("reduction", Math.round(r * 100) + "%");
      out("hours", nf.format(saved));
      out("fte", nf1.format(saved / 160));
      out("value", money.format(saved * hourly * 12));
      out("close", nf1.format(Math.max(1, num("close_days") * (1 - r))));
    };
    calc.addEventListener("input", run);
    run();
  }

  /* ---------- Suggest the Hindi page to Hindi-language browsers ---------- */
  var langLink = document.querySelector('.lang-switch[hreflang="hi"]');
  if (lang === "en" && langLink && stored("qx-lang-hint") !== "no") {
    var prefersHi = (navigator.languages || [navigator.language || ""]).some(function (l) { return /^hi\b/i.test(l); });
    if (prefersHi) {
      var hint = document.createElement("div");
      hint.className = "qx-banner";
      hint.setAttribute("role", "region");
      hint.setAttribute("aria-label", "भाषा");
      hint.setAttribute("lang", "hi");
      hint.innerHTML = '<p>यह पेज हिन्दी में भी उपलब्ध है।</p><div class="btn-row"><a class="btn btn-primary"></a><button class="btn btn-outline" type="button">नहीं, धन्यवाद</button></div>';
      var go2 = hint.querySelector("a"); go2.href = langLink.getAttribute("href"); go2.textContent = "हिन्दी में देखें";
      hint.querySelector("button").addEventListener("click", function () { store("qx-lang-hint", "no"); hint.remove(); });
      go2.addEventListener("click", function () { store("qx-lang-hint", "no"); });
      document.body.appendChild(hint);
    }
  }

  /* ---------- Optional analytics with cookie consent ----------
     Nothing loads unless config.ga4Id is set AND the visitor accepts. */
  var ga4 = String(config.ga4Id || "").trim();
  if (/^G-[A-Z0-9]+$/i.test(ga4)) {
    document.querySelectorAll("[data-cookie-link]").forEach(function (li) { li.hidden = false; });
    var loadGa = function () {
      if (window.__qxGa) { return; }
      window.__qxGa = true;
      var sc = document.createElement("script");
      sc.async = true; sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4);
      document.head.appendChild(sc);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date()); window.gtag("config", ga4, { anonymize_ip: true });
    };
    var askConsent = function () {
      if (document.querySelector(".qx-cookie")) { return; }
      var bn = document.createElement("div");
      bn.className = "qx-banner qx-cookie";
      bn.setAttribute("role", "region");
      bn.setAttribute("aria-label", "Cookies");
      bn.innerHTML = '<p></p><div class="btn-row"><button class="btn btn-primary" type="button" data-c="yes"></button><button class="btn btn-outline" type="button" data-c="no"></button></div>';
      bn.querySelector("p").textContent = t("cookieText");
      bn.querySelector('[data-c="yes"]').textContent = t("cookieAccept");
      bn.querySelector('[data-c="no"]').textContent = t("cookieDecline");
      bn.addEventListener("click", function (e) {
        var c = e.target.getAttribute && e.target.getAttribute("data-c");
        if (!c) { return; }
        store("qx-consent", c);
        if (c === "yes") { loadGa(); }
        bn.remove();
      });
      document.body.appendChild(bn);
    };
    var consentVal = stored("qx-consent");
    if (consentVal === "yes") { loadGa(); } else if (consentVal !== "no") { askConsent(); }
    document.querySelectorAll("[data-cookie-settings]").forEach(function (b) { b.addEventListener("click", askConsent); });
  }

  /* ---------- Social links in the footer (set them in config.js) ---------- */
  var social = config.social || {};
  var SOCIAL_ICONS = {
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    youtube: '<path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 2c1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6z"/><path d="M9.8 15.5l5.7-3.5-5.7-3.5z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'
  };
  document.querySelectorAll("[data-social]").forEach(function (box) {
    Object.keys(SOCIAL_ICONS).forEach(function (k) {
      var url = String(social[k] || "");
      if (!/^https:\/\//.test(url)) { return; }
      var a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", k.charAt(0).toUpperCase() + k.slice(1));
      a.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SOCIAL_ICONS[k] + "</svg>";
      box.appendChild(a);
    });
    box.hidden = !box.children.length;
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
