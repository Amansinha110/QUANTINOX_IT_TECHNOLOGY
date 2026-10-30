/* Quanta AI Solution Advisor (ai-advisor.html).
 *
 * The visitor describes their business; the page shows a tailored plan: package, modules (now / next / later),
 * AI agents, a phased rollout, quick wins, risks and questions for the demo.
 *
 *  - AI plan: when the backend (config.js apiBase) has an ANTHROPIC_API_KEY, Claude writes the plan from the
 *    visitor's words and this website's own content (POST /api/ai/advisor).
 *  - Quick plan: otherwise (or if the AI is busy) a rule-based plan is built right here in the browser,
 *    so the page always works, even with no backend at all.
 *
 * "Book a demo with this plan" opens demo.html with the modules ticked and the plan summary in the message.
 * All text is inserted with textContent, never as HTML.
 */
(function () {
  "use strict";

  var form = document.getElementById("advisor-form");
  if (!form) { return; }
  var cfg = window.QX_CONFIG || {};
  var raw = String(cfg.apiBase || "").trim();
  var apiBase = raw === "/" ? window.location.origin : raw.replace(/\/+$/, "");
  var lang = (document.documentElement.lang || "en").slice(0, 2) === "hi" ? "hi" : "en";
  var out = document.getElementById("advisor-result");
  var statusEl = document.getElementById("advisor-status");
  var submitBtn = form.querySelector('[type="submit"]');
  var desc = form.querySelector('[name="description"]');

  /* ------------------------------------------------------------ text */
  var S = {
    en: {
      creating: "Creating your plan…", submit: "Create my plan", tooShort: "Please describe your business in a sentence or two (at least 15 characters).",
      aiBadge: "AI plan", quickBadge: "Quick plan", aiNote: "Written by Quanta AI from your description and our website. It can make mistakes: we will check it with you in a demo.",
      quickNote: "Built from your answers with simple rules. Connect the AI service for a fully tailored plan.", busy: "The AI is busy right now, so here is a quick plan from your answers.",
      yourPlan: "Your Quantinox plan", recommended: "Recommended package", modules: "Modules", now: "Start now", next: "Next", later: "Later",
      agents: "AI agents that fit", phases: "Rollout plan", wins: "Quick wins", risks: "Risks to plan for", questions: "Questions to discuss in your demo",
      sources: "Based on", book: "Book a demo with this plan", download: "Download plan", print: "Print", ask: "Ask Quanta AI about this plan", again: "Start over",
      seePricing: "See pricing", learnMore: "Learn more", weeks: "weeks", msgPrefix: "From the AI Solution Advisor:", askPrompt: "I used the Solution Advisor. It suggested {pkg} with {mods}. What should I prepare for the demo?",
      packages: { "finance-essentials": "Finance Essentials", "business-suite": "Business Suite", "enterprise-private": "Enterprise Private" },
      moduleNames: { finance: "Finance", "supply-chain": "Supply chain", manufacturing: "Manufacturing", procurement: "Procurement", sales: "Sales & billing", services: "Projects & services", assets: "Asset management", hr: "People & HR", ai: "Quanta AI" }
    },
    hi: {
      creating: "आपका प्लान बन रहा है…", submit: "मेरा प्लान बनाएँ", tooShort: "कृपया एक-दो वाक्यों में अपने बिज़नेस के बारे में लिखें (कम से कम 15 अक्षर)।",
      aiBadge: "AI प्लान", quickBadge: "क्विक प्लान", aiNote: "Quanta AI ने आपके विवरण और हमारी वेबसाइट से यह प्लान लिखा है। इसमें गलती हो सकती है: डेमो में हम इसे आपके साथ जाँचेंगे।",
      quickNote: "आपके जवाबों से आसान नियमों के आधार पर बनाया गया। पूरी तरह आपके लिए बने प्लान के लिए AI सर्विस जोड़ें।", busy: "AI अभी व्यस्त है, इसलिए आपके जवाबों से एक क्विक प्लान यहाँ है।",
      yourPlan: "आपका Quantinox प्लान", recommended: "सुझाया गया पैकेज", modules: "मॉड्यूल", now: "अभी शुरू करें", next: "इसके बाद", later: "बाद में",
      agents: "आपके काम के AI एजेंट", phases: "रोलआउट प्लान", wins: "जल्दी मिलने वाले फ़ायदे", risks: "इन जोखिमों की तैयारी करें", questions: "डेमो में पूछने लायक सवाल",
      sources: "इन पर आधारित", book: "इस प्लान के साथ डेमो बुक करें", download: "प्लान डाउनलोड करें", print: "प्रिंट करें", ask: "इस प्लान के बारे में Quanta AI से पूछें", again: "फिर से शुरू करें",
      seePricing: "प्राइसिंग देखें", learnMore: "और जानें", weeks: "हफ़्ते", msgPrefix: "AI सॉल्यूशन एडवाइज़र से:", askPrompt: "मैंने सॉल्यूशन एडवाइज़र इस्तेमाल किया। उसने {mods} के साथ {pkg} सुझाया। डेमो के लिए मुझे क्या तैयार करना चाहिए?",
      packages: { "finance-essentials": "Finance Essentials", "business-suite": "Business Suite", "enterprise-private": "Enterprise Private" },
      moduleNames: { finance: "फ़ाइनेंस", "supply-chain": "सप्लाई चेन", manufacturing: "मैन्युफैक्चरिंग", procurement: "प्रोक्योरमेंट", sales: "सेल्स और बिलिंग", services: "प्रोजेक्ट और सर्विसेज़", assets: "एसेट मैनेजमेंट", hr: "पीपल और HR", ai: "Quanta AI" }
    }
  };
  var T = S[lang];
  var PAGES = { finance: "finance.html", "supply-chain": "supply-chain.html", manufacturing: "manufacturing.html", procurement: "procurement.html", sales: "sales.html", services: "services.html", assets: "asset-management.html", hr: "hr.html", ai: "ai.html" };

  /* ------------------------------------------------------------ example prompts */
  document.querySelectorAll("[data-advisor-example]").forEach(function (b) {
    b.addEventListener("click", function () { desc.value = b.getAttribute("data-advisor-example"); desc.focus(); });
  });

  /* ------------------------------------------------------------ submit */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.hidden = true;
    var data = read();
    if (data.description.length < 15) { show(statusEl, T.tooShort); desc.focus(); return; }
    submitBtn.disabled = true; submitBtn.textContent = T.creating;
    form.setAttribute("aria-busy", "true");
    var done = function () { submitBtn.disabled = false; submitBtn.textContent = T.submit; form.removeAttribute("aria-busy"); };
    if (!apiBase) { done(); render(rulesPlan(data), "rules", [], null); return; }
    fetch(apiBase + "/api/ai/advisor", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ description: data.description, industry: data.industry, size: data.size, current_system: data.current, priorities: data.priorities, lang: lang, page: location.pathname.split("/").pop() })
    }).then(function (r) {
      if (r.status === 503) { return { fallback: true, quiet: true }; }
      if (!r.ok) { return { fallback: true }; }
      return r.json();
    }).then(function (res) {
      done();
      if (res.fallback || !res.plan) { render(rulesPlan(data), "rules", [], res.quiet ? null : T.busy); }
      else { render(res.plan, "ai", res.sources || [], null); }
    }).catch(function () { done(); render(rulesPlan(data), "rules", [], T.busy); });
  });

  function read() {
    var v = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? String(el.value || "").trim() : ""; };
    var pr = [];
    form.querySelectorAll('[name="priorities"]:checked').forEach(function (c) { pr.push(c.value); });
    return { description: v("description"), industry: v("industry"), size: v("size"), current: v("current_system"), priorities: pr };
  }
  function show(el, text) { el.textContent = text; el.hidden = false; }

  /* ------------------------------------------------------------ rule-based plan (no AI needed) */
  var RULES = {
    finance: /financ|account|ledger|gst|tax|invoice|close|cash|book|tally|audit|bank|फ़ाइनेंस|फाइनेंस|अकाउंट|टैक्स|जीएसटी|इनवॉइस|बही|नकद/i,
    "supply-chain": /stock|inventor|warehouse|distribut|logistic|deliver|dispatch|wholesale|order fulfil|स्टॉक|इन्वेंटरी|गोदाम|वेयरहाउस|डिलीवरी|होलसेल/i,
    manufacturing: /manufactur|factory|plant|production|shop floor|machine|batch|bom|quality|textile|pharma|फ़ैक्ट्री|फैक्ट्री|उत्पादन|मैन्युफैक्चरिंग|प्लांट|मशीन/i,
    procurement: /purchas|procure|supplier|vendor|sourcing|buy|raw material|खरीद|सप्लायर|वेंडर|कच्चा माल/i,
    sales: /sales|customer|billing|quote|order|crm|retail|dealer|subscription|बिक्री|सेल्स|ग्राहक|बिलिंग|डीलर/i,
    services: /project|consult|agency|service|billable|timesheet|client|प्रोजेक्ट|कंसल्ट|सर्विस|क्लाइंट/i,
    assets: /asset|maintenance|equipment|fleet|breakdown|field service|एसेट|मेंटेनेंस|उपकरण|मशीनरी/i,
    hr: /payroll|salary|employee|staff|hr\b|hiring|attendance|leave|people|पेरोल|वेतन|सैलरी|कर्मचारी|हाज़िरी|छुट्टी/i,
    ai: /\bai\b|automat|agent|chatbot|copilot|smart|ऑटोमेशन|एजेंट|स्मार्ट/i
  };
  var PRIORITY_MOD = { close: "finance", gst: "finance", cash: "finance", inventory: "supply-chain", production: "manufacturing", purchasing: "procurement", sales: "sales", projects: "services", maintenance: "assets", payroll: "hr", ai: "ai" };
  var INDUSTRY_MOD = { manufacturing: ["manufacturing", "supply-chain", "procurement"], retail: ["sales", "supply-chain"], wholesale: ["supply-chain", "sales", "procurement"], "life-sciences": ["manufacturing", "supply-chain"], "professional-services": ["services", "hr"] };
  var AGENT_FOR = {
    en: { finance: ["Reconciliation agent", "Matches bank lines and clears open items."], sales: ["Collections agent", "Prioritises overdue accounts and drafts reminders."], procurement: ["Invoice matching agent", "Matches invoices to orders and receipts."], "supply-chain": ["Supplier confirmation agent", "Chases late confirmations and proposes alternates."], manufacturing: ["Production re-planning agent", "Reschedules orders when materials or machines change."], assets: ["Maintenance scheduling agent", "Plans work orders around production and technicians."] },
    hi: { finance: ["Reconciliation agent", "बैंक लाइनों का मिलान करता है और ओपन आइटम क्लियर करता है।"], sales: ["Collections agent", "बकाया खातों को प्राथमिकता देता है और रिमाइंडर तैयार करता है।"], procurement: ["Invoice matching agent", "इनवॉइस का ऑर्डर और रसीद से मिलान करता है।"], "supply-chain": ["Supplier confirmation agent", "देर से आने वाले कन्फ़र्मेशन का पीछा करता है और विकल्प सुझाता है।"], manufacturing: ["Production re-planning agent", "मटीरियल या मशीन बदलने पर ऑर्डर दोबारा शेड्यूल करता है।"], assets: ["Maintenance scheduling agent", "प्रोडक्शन और टेक्नीशियन के हिसाब से वर्क ऑर्डर प्लान करता है।"] }
  };
  function rulesPlan(d) {
    var text = [d.description, d.industry, d.current].join(" ");
    var mods = ["finance"];
    var add = function (m) { if (m && mods.indexOf(m) < 0) { mods.push(m); } };
    Object.keys(RULES).forEach(function (m) { if (RULES[m].test(text)) { add(m); } });
    d.priorities.forEach(function (p) { add(PRIORITY_MOD[p]); });
    (INDUSTRY_MOD[d.industry] || []).forEach(add);
    var big = /1,000\+|251/.test(d.size), small = /1–50|1-50/.test(d.size);
    var ops = mods.filter(function (m) { return ["supply-chain", "manufacturing", "procurement", "services", "assets"].indexOf(m) > -1; }).length;
    var pkg = big && (ops >= 2 || /erp|sap|oracle|custom/i.test(d.current)) ? "enterprise-private" : (ops || mods.length > 3 || !small) && mods.length > 1 ? "business-suite" : "finance-essentials";
    if (mods.indexOf("ai") < 0) { mods.push("ai"); }
    var hi = lang === "hi";
    var core = ["finance", "sales", "procurement"];
    var modules = mods.map(function (m, i) {
      var pri = m === "ai" ? "next" : core.indexOf(m) > -1 || i < 3 ? "now" : i < 5 ? "next" : "later";
      return { id: m, priority: pri, why: hi ? "आपके विवरण और प्राथमिकताओं से मेल खाता है।" : "Matches what you described and the priorities you ticked." };
    });
    var names = function (p) { return modules.filter(function (m) { return m.priority === p; }).map(function (m) { return T.moduleNames[m.id]; }).join(", "); };
    var phases = [
      { title: hi ? "तैयारी और डेटा" : "Prepare and move data", weeks: "2–4 " + T.weeks, items: hi ? ["लक्ष्य और सफलता के पैमाने तय करें", "मास्टर डेटा (ग्राहक, सप्लायर, आइटम) साफ़ करें", d.current ? d.current + " से डेटा ले जाने की योजना बनाएँ" : "शुरुआती बैलेंस और ओपन आइटम तय करें"] : ["Agree goals and success measures", "Clean master data (customers, suppliers, items)", d.current ? "Plan the move from " + d.current : "Decide opening balances and open items"] },
      { title: hi ? "पहला चरण: " + names("now") : "Phase 1: " + names("now"), weeks: "6–10 " + T.weeks, items: hi ? ["मुख्य प्रोसेस कॉन्फ़िगर करें", "टीम को ट्रेनिंग दें", "पुराने सिस्टम के साथ थोड़े समय तक तुलना करें"] : ["Configure the core processes", "Train the team", "Run alongside the old system briefly"] }
    ];
    if (names("next")) { phases.push({ title: (hi ? "दूसरा चरण: " : "Phase 2: ") + names("next"), weeks: "4–8 " + T.weeks, items: hi ? ["AI एजेंट चालू करें", "रिपोर्ट और डैशबोर्ड सेट करें"] : ["Switch on AI agents", "Set up reports and dashboards"] }); }
    if (names("later")) { phases.push({ title: (hi ? "बाद में: " : "Later: ") + names("later"), weeks: hi ? "ज़रूरत के हिसाब से" : "When ready", items: hi ? ["पहले चरणों के नतीजों के आधार पर बढ़ाएँ"] : ["Extend based on results from the first phases"] }); }
    var agents = mods.filter(function (m) { return AGENT_FOR.en[m]; }).slice(0, 4).map(function (m) { return { name: AGENT_FOR[lang][m][0], benefit: AGENT_FOR[lang][m][1] }; });
    return {
      summary: (hi ? "आपने बताया: “" : "You said: “") + d.description.slice(0, 220) + (d.description.length > 220 ? "…" : "") + "”",
      package: pkg,
      package_reason: hi ? { "finance-essentials": "मुख्य रूप से फ़ाइनेंस की ज़रूरतों के लिए, छोटी टीमों के लिए सही शुरुआत।", "business-suite": "फ़ाइनेंस के साथ ऑपरेशन (स्टॉक, प्रोडक्शन, प्रोजेक्ट) एक ही प्लेटफ़ॉर्म पर।", "enterprise-private": "बड़े, जटिल या ज़्यादा कस्टमाइज़ेशन वाले बिज़नेस के लिए डेडिकेटेड क्लाउड।" }[pkg]
        : { "finance-essentials": "Mainly finance needs and a smaller team: a focused start you can extend later.", "business-suite": "Finance plus operations (stock, production, projects) on one platform.", "enterprise-private": "A large or complex business that needs a dedicated, highly customisable cloud." }[pkg],
      modules: modules, agents: agents, phases: phases,
      quick_wins: hi ? ["GST रिटर्न और ई-इनवॉइस एक ही जगह से", "बैंक मिलान अपने आप", "रोज़ का कैश और बकाया एक डैशबोर्ड पर"] : ["GST returns and e-invoices from one place", "Automatic bank reconciliation", "Daily cash and overdue invoices on one dashboard"],
      risks: hi ? ["डेटा की गुणवत्ता: शुरुआत में ही मास्टर डेटा साफ़ करें।", "बदलाव को अपनाना: हर टीम से एक ज़िम्मेदार व्यक्ति चुनें।"] : ["Data quality: clean master data early.", "Adoption: name an owner in every team."],
      questions: hi ? ["कितने यूज़र और किस तरह के यूज़र चाहिए?", "किन सिस्टम से जोड़ना है (बैंक, ई-कॉमर्स, GST पोर्टल)?", "गो-लाइव की आदर्श तारीख क्या है?"] : ["How many users, and of which types?", "Which systems must connect (banks, e-commerce, GST portal)?", "What is the ideal go-live date?"]
    };
  }

  /* ------------------------------------------------------------ render */
  function h(tag, cls, text) { var el = document.createElement(tag); if (cls) { el.className = cls; } if (text !== undefined && text !== null) { el.textContent = text; } return el; }
  function section(title, child) { var s = h("div", "adv-block"); s.appendChild(h("h3", "h3", title)); s.appendChild(child); return s; }
  function ul(items, cls) { var l = h("ul", cls || "adv-list"); items.forEach(function (t) { l.appendChild(h("li", null, t)); }); return l; }

  var lastPlan = null;
  function render(plan, mode, sources, note) {
    lastPlan = plan;
    out.replaceChildren();
    var head = h("div", "adv-head");
    var titleWrap = h("div");
    var badge = h("span", "pill adv-badge" + (mode === "ai" ? " is-ai" : ""), mode === "ai" ? T.aiBadge : T.quickBadge);
    titleWrap.appendChild(badge);
    titleWrap.appendChild(h("h2", "h2", T.yourPlan));
    head.appendChild(titleWrap);
    out.appendChild(head);
    if (note) { out.appendChild(h("p", "form-status is-info", note)); }
    if (plan.summary) { out.appendChild(h("p", "lead adv-summary", plan.summary)); }

    // package
    var pkgCard = h("div", "card adv-package");
    pkgCard.appendChild(h("p", "eyebrow", T.recommended));
    pkgCard.appendChild(h("p", "adv-package-name", T.packages[plan.package] || plan.package));
    if (plan.package_reason) { pkgCard.appendChild(h("p", null, plan.package_reason)); }
    var pl = h("a", "link-arrow", T.seePricing); pl.href = "pricing.html"; pkgCard.appendChild(pl);

    // modules by priority
    var modWrap = h("div", "adv-mods");
    ["now", "next", "later"].forEach(function (p) {
      var ms = plan.modules.filter(function (m) { return m.priority === p; });
      if (!ms.length) { return; }
      var col = h("div", "adv-mod-col");
      col.appendChild(h("p", "adv-mod-pri is-" + p, T[p]));
      ms.forEach(function (m) {
        var a = h("a", "adv-mod"); a.href = PAGES[m.id] || "products.html";
        a.appendChild(h("strong", null, T.moduleNames[m.id] || m.id));
        if (m.why) { a.appendChild(h("span", null, m.why)); }
        col.appendChild(a);
      });
      modWrap.appendChild(col);
    });
    var top = h("div", "adv-top"); top.appendChild(pkgCard); top.appendChild(section(T.modules, modWrap));
    out.appendChild(top);

    // phases timeline
    if (plan.phases && plan.phases.length) {
      var ol = h("ol", "adv-phases");
      plan.phases.forEach(function (ph, i) {
        var li = h("li");
        var n = h("span", "adv-step", String(i + 1)); n.setAttribute("aria-hidden", "true"); li.appendChild(n);
        var body = h("div");
        var t = h("p", "adv-phase-title", ph.title); if (ph.weeks) { t.appendChild(h("small", null, " · " + ph.weeks)); }
        body.appendChild(t);
        if (ph.items && ph.items.length) { body.appendChild(ul(ph.items)); }
        li.appendChild(body); ol.appendChild(li);
      });
      out.appendChild(section(T.phases, ol));
    }

    var grid = h("div", "grid adv-grid");
    if (plan.agents && plan.agents.length) {
      var al = h("ul", "adv-list");
      plan.agents.forEach(function (a) { var li = h("li"); li.appendChild(h("strong", null, a.name + ": ")); li.appendChild(document.createTextNode(a.benefit)); al.appendChild(li); });
      grid.appendChild(card(T.agents, al));
    }
    if (plan.quick_wins && plan.quick_wins.length) { grid.appendChild(card(T.wins, ul(plan.quick_wins))); }
    if (plan.risks && plan.risks.length) { grid.appendChild(card(T.risks, ul(plan.risks))); }
    if (plan.questions && plan.questions.length) { grid.appendChild(card(T.questions, ul(plan.questions))); }
    out.appendChild(grid);

    if (sources.length) {
      var sp = h("p", "muted adv-sources", T.sources + ": ");
      sources.forEach(function (s, i) { if (!/^[a-z0-9-]+\.html(#[a-z0-9-]+)?$/i.test(s.u)) { return; } var a = h("a", null, s.t); a.href = s.u; if (i) { sp.appendChild(document.createTextNode(" · ")); } sp.appendChild(a); });
      out.appendChild(sp);
    }
    out.appendChild(h("p", "muted small-text", mode === "ai" ? T.aiNote : T.quickNote));

    // actions
    var row = h("div", "btn-row adv-actions");
    var book = h("a", "btn btn-primary btn-lg", T.book);
    book.href = "demo.html?from=advisor&modules=" + encodeURIComponent(plan.modules.map(function (m) { return m.id; }).join(","));
    book.addEventListener("click", function () { try { sessionStorage.setItem("qx-advisor-plan", planText(plan, true)); } catch (e) { /* private mode */ } });
    row.appendChild(book);
    if (window.QuantaAI) {
      var ask = h("button", "btn btn-outline", T.ask); ask.type = "button";
      ask.addEventListener("click", function () {
        window.QuantaAI.ask(T.askPrompt.replace("{pkg}", T.packages[plan.package]).replace("{mods}", plan.modules.map(function (m) { return T.moduleNames[m.id]; }).join(", ")));
      });
      row.appendChild(ask);
    }
    var dl = h("button", "btn btn-outline", T.download); dl.type = "button"; dl.addEventListener("click", download); row.appendChild(dl);
    var pr = h("button", "btn btn-ghost", T.print); pr.type = "button"; pr.addEventListener("click", function () { window.print(); }); row.appendChild(pr);
    var again = h("button", "btn btn-ghost", T.again); again.type = "button";
    again.addEventListener("click", function () { out.hidden = true; out.replaceChildren(); form.scrollIntoView({ behavior: "smooth", block: "start" }); desc.focus(); });
    row.appendChild(again);
    out.appendChild(row);

    out.hidden = false;
    var focusEl = out.querySelector("h2"); focusEl.setAttribute("tabindex", "-1");
    out.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    focusEl.focus({ preventScroll: true });
  }
  function card(title, child) { var c = h("div", "card"); c.appendChild(h("h3", "h3", title)); c.appendChild(child); return c; }

  function planText(p, short) {
    var lines = [];
    var mods = function (pri) { return p.modules.filter(function (m) { return m.priority === pri; }).map(function (m) { return T.moduleNames[m.id] + (short || !m.why ? "" : " – " + m.why); }); };
    if (short) {
      lines.push(T.msgPrefix + " " + T.packages[p.package] + ".");
      ["now", "next", "later"].forEach(function (pri) { var m = mods(pri); if (m.length) { lines.push(T[pri] + ": " + m.join(", ")); } });
      if (p.summary) { lines.push(p.summary.slice(0, 400)); }
      return lines.join("\n").slice(0, 1500);
    }
    lines.push(T.yourPlan.toUpperCase(), new Date().toLocaleDateString(), "", p.summary, "", T.recommended + ": " + T.packages[p.package], p.package_reason, "");
    ["now", "next", "later"].forEach(function (pri) { var m = mods(pri); if (m.length) { lines.push(T[pri] + ":"); m.forEach(function (x) { lines.push("  - " + x); }); } });
    if (p.phases.length) { lines.push("", T.phases + ":"); p.phases.forEach(function (ph, i) { lines.push("  " + (i + 1) + ". " + ph.title + (ph.weeks ? " (" + ph.weeks + ")" : "")); (ph.items || []).forEach(function (it) { lines.push("     - " + it); }); }); }
    [["agents", p.agents.map(function (a) { return a.name + ": " + a.benefit; })], ["wins", p.quick_wins], ["risks", p.risks], ["questions", p.questions]].forEach(function (pair) {
      if (pair[1] && pair[1].length) { lines.push("", T[pair[0]] + ":"); pair[1].forEach(function (x) { lines.push("  - " + x); }); }
    });
    lines.push("", location.origin + location.pathname.replace(/[^/]*$/, "") + "demo.html");
    return lines.join("\n");
  }
  function download() {
    if (!lastPlan) { return; }
    var blob = new Blob([planText(lastPlan, false)], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "quantinox-plan.txt";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
})();
