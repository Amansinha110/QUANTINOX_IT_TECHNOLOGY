/* Quantinox IT Technology — site behaviour (no libraries needed) */
(function () {
  "use strict";

  var config = window.QX_CONFIG || {};
  var apiBase = String(config.apiBase || "").replace(/\/+$/, "");

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
      consent: "Please accept the Terms of use and Privacy policy.",
      wrongLogin: "Incorrect email or password.",
      unverified: "Please confirm your email first. Check your inbox for our link, or send a new one.",
      linkSent: "If that email needs confirming, a new link is on its way.",
      linkInvalid: "This link has expired or was already used.",
      wait: "Please wait…",
      createAccount: "Create account", logIn: "Log in", sendLink: "Send reset link", saveNew: "Save new password", sendNew: "Send a new link"
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
      consent: "कृपया उपयोग की शर्तें और गोपनीयता नीति स्वीकार करें।",
      wrongLogin: "ईमेल या पासवर्ड गलत है।",
      unverified: "कृपया पहले अपना ईमेल कन्फ़र्म करें। हमारे लिंक के लिए अपना इनबॉक्स देखें, या नया लिंक भेजें।",
      linkSent: "अगर उस ईमेल को कन्फ़र्म करना बाकी है, तो नया लिंक भेज दिया गया है।",
      linkInvalid: "यह लिंक समाप्त हो चुका है या पहले ही इस्तेमाल हो चुका है।",
      wait: "कृपया प्रतीक्षा करें…",
      createAccount: "खाता बनाएँ", logIn: "लॉग इन", sendLink: "रीसेट लिंक भेजें", saveNew: "नया पासवर्ड सेव करें", sendNew: "नया लिंक भेजें"
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

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var panel = $("nav-panel");
  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? t("closeMenu") : t("openMenu"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) {
        panel.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", t("openMenu"));
        toggle.focus();
      }
    });
  }

  /* ---------- Tabs (module pages) ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (tb) {
        var on = tb === tab;
        tb.setAttribute("aria-selected", on ? "true" : "false");
        tb.tabIndex = on ? 0 : -1;
        var p = document.getElementById(tb.getAttribute("aria-controls"));
        if (p) { p.hidden = !on; }
      });
      if (focus) { tab.focus(); }
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") { next = tabs[(i + 1) % tabs.length]; }
        if (e.key === "ArrowLeft") { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
        if (e.key === "Home") { next = tabs[0]; }
        if (e.key === "End") { next = tabs[tabs.length - 1]; }
        if (next) { e.preventDefault(); select(next, true); }
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
    }
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
