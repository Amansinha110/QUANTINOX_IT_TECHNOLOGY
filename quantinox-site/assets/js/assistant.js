/* Quanta AI — website assistant for Quantinox.
 *
 * Two modes:
 *  1. Site guide (default, free): answers from this website's own pages (assets/js/assistant-kb.js),
 *     plus guided actions: book a demo, call back, package finder, savings estimate, tour, handoff.
 *  2. AI mode: switches on by itself when the Quantinox backend (config.js `apiBase`) has an
 *     ANTHROPIC_API_KEY set. Answers are then written by Claude, grounded in the same website
 *     content, and streamed live. (`assistantEndpoint` can still point to a separate AI server.)
 *
 * Nothing here needs a library. All text shown to visitors is escaped before rendering.
 */
(function () {
  "use strict";

  var cfg = window.QX_CONFIG || {};
  var pageLang = (document.documentElement.lang || "en").slice(0, 2) === "hi" ? "hi" : "en";
  var scriptEl = document.currentScript || document.querySelector('script[src*="assistant.js"]');
  var kbUrl = scriptEl ? scriptEl.src.replace(/assistant\.js(\?.*)?$/, "assistant-kb.js") : "assets/js/assistant-kb.js";
  var endpoint = String(cfg.assistantEndpoint || "").replace(/\/+$/, "");
  var aiMode = !!endpoint;
  var apiBase = String(cfg.apiBase || "").trim() === "/" ? window.location.origin : String(cfg.apiBase || "").replace(/\/+$/, "");
  // No separate AI server set: ask the backend whether AI answers are switched on there.
  if (!endpoint && apiBase) { detectBackendAi(); }
  function detectBackendAi() {
    var KEY = "qx-ai-backend", cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) { cached = null; }
    if (cached && cached.base === apiBase && Date.now() - cached.at < 10 * 60e3) { if (cached.on) { enableAi(apiBase); } return; }
    fetch(apiBase + "/api/assistant/status", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
      .then(function (d) {
        var on = !!(d && d.enabled);
        try { sessionStorage.setItem(KEY, JSON.stringify({ base: apiBase, at: Date.now(), on: on })); } catch (e) { /* private mode */ }
        if (on) { enableAi(apiBase); }
      })
      .catch(function () { /* backend offline: stay in site-guide mode */ });
  }
  function enableAi(base) {
    endpoint = base; aiMode = true;
    if (typeof root !== "undefined" && root) {
      var t = S[pageLang];
      var badge = root.querySelector(".qx-ai-mode"); if (badge) { badge.textContent = t.modeAi; }
      var note = root.querySelector(".qx-ai-note"); if (note) { note.textContent = t.disclaimerAi; }
    }
  }
  var leadEndpoint = cfg.formEndpoint || (apiBase ? apiBase + "/api/leads" : "");
  var pageFile = (location.pathname.split("/").pop() || "index.html").replace(/\?.*$/, "") || "index.html";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ text */
  var S = {
    en: {
      name: "Quanta AI", open: "Ask Quanta AI", close: "Close", expand: "Expand", collapse: "Make smaller", more: "More options",
      newChat: "New chat", download: "Download conversation", readAloud: "Read answers aloud", readOff: "Stop reading aloud",
      modeGuide: "Site guide", modeAi: "AI",
      hello: "Hi! I’m **Quanta AI**, Quantinox’s assistant. Ask me about our ERP, prices, industries or AI, or let me book a demo for you.",
      helloPage: "You are on **{page}**. I can summarise it or answer questions about it.",
      placeholder: "Ask anything about Quantinox…", send: "Send", mic: "Speak your question", micOn: "Listening… tap to stop",
      disclaimerGuide: "Answers come from this website’s pages. Please don’t share sensitive personal data.",
      disclaimerAi: "Quanta AI uses AI and can make mistakes. Check important details with our team.",
      thinking: "Thinking", copy: "Copy", copied: "Copied", good: "Helpful", bad: "Not helpful", thanks: "Thanks for the feedback!",
      sources: "Sources", found: "Here’s what I found on our website:", foundOne: "Here’s what our website says:",
      none: "I couldn’t find a clear answer to that on our website. Would you like to ask our team directly?",
      summary: "This page covers:", summaryNone: "I don’t have a summary for this page yet. Here’s what I can help with:",
      greet: "Hello! How can I help you today?",
      pricing: "Quantinox is priced **per user, per month**, and you only pay for the modules you use. There are three packages:\n- **Finance Essentials**: core finance with order to cash and procure to pay\n- **Business Suite**: finance plus supply chain, manufacturing and services\n- **Enterprise Private**: a dedicated cloud with custom pricing\nAdd-ons such as payroll, consolidation and extra AI capacity can be added any time. For an exact quote, our team can send a proposal.",
      overview: "**Quantinox Cloud ERP** runs finance, supply chain, manufacturing, procurement, sales, projects, asset management and HR on one cloud platform, with **Quanta AI** agents built in. You start with the modules you need and add more as you grow. It’s fully managed by Quantinox, with automatic updates and open APIs.\n- [All products](products.html)\n- [Industries](industries.html)\n- [Product tour](tour.html)",
      implementation: "Projects follow five steps: **discover, fit to standard, configure, go live and improve**. If you’re moving from another ERP or spreadsheets, our migration program covers a process assessment, guided data migration and a parallel run before you switch. The timeline depends on your scope, so our team can give you an estimate in a demo. See [Transform and support](transform.html).",
      security: "Quantinox is a fully managed cloud with **tenant isolation, encryption, backups and round-the-clock monitoring**. Personal data is handled in line with India’s DPDP Act. For details, see the [Trust center](about.html#trust) and the [privacy policy](privacy.html).",
      support: "Existing customers can [log in to raise a support case](support.html#get-support), search the knowledge base, read release notes and check system status on the [support page](support.html). Success plans add faster response times and a success manager.",
      aiInfo: "**Quanta AI** is built into every Quantinox module:\n- an **assistant** you can ask in plain language, in English or Hindi\n- ready-made **agents** for reconciliation, invoice matching, supplier confirmations, collections and more\n- an **agent builder** with approval limits and a full audit trail\nLearn more on the [Quanta AI page](ai.html).",
      industries: "Quantinox comes with best practices for 30 industries in six groups. Detailed pages:\n- [Industrial manufacturing](industry-manufacturing.html)\n- [Retail](industry-retail.html)\n- [Wholesale distribution](industry-wholesale.html)\n- [Life sciences](industry-life-sciences.html)\n- [Professional services](industry-professional-services.html)\nSee [all industries](industries.html).",
      demoIntro: "Happy to set that up. Leave your details and a product expert will email you within one business day to fix a time.",
      callbackIntro: "Sure, we can call you. When is a good time?",
      finderIntro: "Let’s find your starting package. Tick the areas you want to run on Quantinox:",
      calcIntro: "Here’s a quick estimate. Change the numbers to match your business:",
      tourIntro: "The product tour walks through six real screens in about two minutes.",
      trialIntro: "You can request your own trial system with sample company data. Our team sets it up and emails your login within one business day.",
      humanIntro: "Of course. Choose how you’d like to reach our team:",
      langIntro: "This website is available in English and Hindi.",
      followDemo: "Book a demo", followHuman: "Talk to a person", followFinder: "Which modules do I need?", followPricing: "How does pricing work?", followSummary: "Summarise this page", followTour: "Show me the product", followTrial: "Can I try it free?",
      aAdvisor: "Get a full AI plan", aTour: "Start the tour", aPricing: "See pricing", aTrial: "Request a trial", aCalc: "Open the full calculator", aContact: "Contact page", aWa: "Chat on WhatsApp", aCallback: "Request a call back", aSwitch: "हिन्दी में देखें",
      fName: "Name", fEmail: "Work email", fCompany: "Company", fPhone: "Phone", fPhoneOpt: "Phone (optional)", fTime: "Best time", fConsent: "I agree to be contacted about this request. See the privacy policy.",
      times: ["Morning (9–12)", "Afternoon (12–4)", "Evening (4–7)"],
      submitDemo: "Request demo", submitCall: "Call me back", sending: "Sending…", sentDemo: "Done! A product expert will email you within one business day.", sentCall: "Done! We’ll call you at the time you chose.",
      formMissing: "Please fill in the required fields and tick the consent box.", formFail: "Sorry, that didn’t go through. Please try again or use the contact page.",
      finderPlan: "Suggested start", finderEss: "Core finance with order to cash and procure to pay covers your selection.", finderSuite: "You need operations as well as finance, so start with the Business Suite.", finderAddons: "Add-ons", finderBook: "Book a demo for these",
      calcInvoices: "Supplier invoices per month", calcMinutes: "Minutes per invoice today", calcCost: "Monthly cost per person (₹)", calcResult: "≈ {hours} hours and {value} a year saved on invoices alone, assuming 30% less manual work.",
      mods: [["finance", "Finance"], ["sales", "Sales"], ["procurement", "Procurement"], ["supply-chain", "Supply chain"], ["manufacturing", "Manufacturing"], ["services", "Projects"], ["assets", "Assets"], ["hr", "HR"]],
      addonAssets: "Asset & field service", addonHr: "People & payroll",
      waText: "Hi Quantinox, I was chatting with Quanta AI about: ",
      nudge: { "pricing.html": "Questions about pricing? Ask Quanta AI.", "demo.html": "Not sure which modules to pick? Ask Quanta AI.", "_": "Have a question? Quanta AI can help." },
      aiError: "I couldn’t reach the AI service, so here is an answer from our website instead.",
      shortcut: "Ctrl + I"
    },
    hi: {
      name: "Quanta AI", open: "Quanta AI से पूछें", close: "बंद करें", expand: "बड़ा करें", collapse: "छोटा करें", more: "और विकल्प",
      newChat: "नई बातचीत", download: "बातचीत डाउनलोड करें", readAloud: "जवाब पढ़कर सुनाएँ", readOff: "पढ़कर सुनाना बंद करें",
      modeGuide: "साइट गाइड", modeAi: "AI",
      hello: "नमस्ते! मैं **Quanta AI** हूँ, Quantinox का असिस्टेंट। हमारे ERP, कीमतों, उद्योगों या AI के बारे में पूछें, या मुझसे डेमो बुक कराएँ।",
      helloPage: "आप **{page}** पेज पर हैं। मैं इसका सारांश दे सकता हूँ या इससे जुड़े सवालों के जवाब दे सकता हूँ।",
      placeholder: "Quantinox के बारे में कुछ भी पूछें…", send: "भेजें", mic: "बोलकर पूछें", micOn: "सुन रहा हूँ… रोकने के लिए दबाएँ",
      disclaimerGuide: "जवाब इस वेबसाइट के पेजों से आते हैं। कृपया संवेदनशील निजी जानकारी साझा न करें।",
      disclaimerAi: "Quanta AI, AI का इस्तेमाल करता है और गलती कर सकता है। ज़रूरी बातें हमारी टीम से जाँच लें।",
      thinking: "सोच रहा हूँ", copy: "कॉपी करें", copied: "कॉपी हो गया", good: "मददगार", bad: "मददगार नहीं", thanks: "सुझाव के लिए धन्यवाद!",
      sources: "स्रोत", found: "हमारी वेबसाइट पर यह मिला:", foundOne: "हमारी वेबसाइट के अनुसार:",
      none: "मुझे इसका साफ़ जवाब हमारी वेबसाइट पर नहीं मिला। क्या आप सीधे हमारी टीम से पूछना चाहेंगे?",
      summary: "इस पेज में यह है:", summaryNone: "इस पेज का सारांश अभी उपलब्ध नहीं है। मैं इनमें मदद कर सकता हूँ:",
      greet: "नमस्ते! आज मैं आपकी कैसे मदद करूँ?",
      pricing: "Quantinox की कीमत **प्रति यूज़र, प्रति महीना** है, और आप केवल उन्हीं मॉड्यूल का भुगतान करते हैं जिन्हें आप इस्तेमाल करते हैं। तीन पैकेज हैं:\n- **Finance Essentials**: ऑर्डर से कैश और खरीद से भुगतान वाला कोर फ़ाइनेंस\n- **Business Suite**: फ़ाइनेंस के साथ सप्लाई चेन, मैन्युफ़ैक्चरिंग और सर्विसेज़\n- **Enterprise Private**: कस्टम कीमत वाला डेडिकेटेड क्लाउड\nपेरोल, कंसॉलिडेशन और अतिरिक्त AI क्षमता जैसे ऐड-ऑन कभी भी जोड़े जा सकते हैं। सटीक कोटेशन के लिए हमारी टीम प्रस्ताव भेज सकती है।",
      overview: "**Quantinox Cloud ERP** फ़ाइनेंस, सप्लाई चेन, मैन्युफ़ैक्चरिंग, खरीद, सेल्स, प्रोजेक्ट, एसेट मैनेजमेंट और HR को एक क्लाउड प्लेटफ़ॉर्म पर चलाता है, जिसमें **Quanta AI** एजेंट शामिल हैं। ज़रूरी मॉड्यूल से शुरू करें और बढ़ने के साथ और जोड़ें। इसे पूरी तरह Quantinox संभालता है, अपने-आप अपडेट और ओपन API के साथ।\n- [सभी प्रोडक्ट](products.html)\n- [उद्योग](industries.html)\n- [प्रोडक्ट टूर](tour.html)",
      implementation: "प्रोजेक्ट पाँच चरणों में चलता है: **डिस्कवर, फ़िट-टू-स्टैंडर्ड, कॉन्फ़िगर, गो-लाइव और सुधार**। अगर आप किसी दूसरे ERP या स्प्रेडशीट से आ रहे हैं, तो माइग्रेशन प्रोग्राम में प्रक्रिया का आकलन, गाइडेड डेटा माइग्रेशन और स्विच से पहले पैरेलल रन शामिल हैं। समय आपके दायरे पर निर्भर करता है, डेमो में हमारी टीम अनुमान दे सकती है। देखें [ट्रांसफ़ॉर्म और सपोर्ट](transform.html)।",
      security: "Quantinox पूरी तरह मैनेज किया गया क्लाउड है, जिसमें **टेनेंट आइसोलेशन, एन्क्रिप्शन, बैकअप और चौबीसों घंटे निगरानी** है। निजी डेटा भारत के DPDP अधिनियम के अनुसार संभाला जाता है। ज़्यादा जानकारी के लिए [ट्रस्ट सेंटर](about.html#trust) और [गोपनीयता नीति](privacy.html) देखें।",
      support: "मौजूदा ग्राहक [लॉग इन करके सपोर्ट केस दर्ज](support.html#get-support) कर सकते हैं, और [सपोर्ट पेज](support.html) पर नॉलेज बेस, रिलीज़ नोट्स और सिस्टम स्टेटस देख सकते हैं। सक्सेस प्लान में तेज़ प्रतिक्रिया और सक्सेस मैनेजर मिलते हैं।",
      aiInfo: "**Quanta AI** हर Quantinox मॉड्यूल में शामिल है:\n- एक **असिस्टेंट** जिससे आप आसान भाषा में, अंग्रेज़ी या हिन्दी में पूछ सकते हैं\n- रिकंसीलिएशन, इनवॉइस मैचिंग, सप्लायर पुष्टि, कलेक्शन और बहुत कुछ के लिए तैयार **एजेंट**\n- अप्रूवल सीमा और पूरे ऑडिट ट्रेल के साथ **एजेंट बिल्डर**\n[Quanta AI पेज](ai.html) पर और जानें।",
      industries: "Quantinox में छह समूहों के 30 उद्योगों की बेस्ट प्रैक्टिस शामिल हैं। विस्तृत पेज:\n- [इंडस्ट्रियल मैन्युफ़ैक्चरिंग](industry-manufacturing.html)\n- [रिटेल](industry-retail.html)\n- [होलसेल डिस्ट्रीब्यूशन](industry-wholesale.html)\n- [लाइफ़ साइंसेज़](industry-life-sciences.html)\n- [प्रोफ़ेशनल सर्विसेज़](industry-professional-services.html)\n[सभी उद्योग](industries.html) देखें।",
      demoIntro: "ज़रूर। अपनी जानकारी दें, प्रोडक्ट विशेषज्ञ एक कार्यदिवस के भीतर समय तय करने के लिए ईमेल करेंगे।",
      callbackIntro: "ज़रूर, हम आपको कॉल कर सकते हैं। कौन-सा समय ठीक रहेगा?",
      finderIntro: "आइए आपका शुरुआती पैकेज खोजें। चुनें कि आप Quantinox पर क्या चलाना चाहते हैं:",
      calcIntro: "यह रहा एक त्वरित अनुमान। अपने व्यवसाय के हिसाब से आँकड़े बदलें:",
      tourIntro: "प्रोडक्ट टूर लगभग दो मिनट में छह असली स्क्रीन दिखाता है।",
      trialIntro: "आप सैंपल कंपनी डेटा के साथ अपना ट्रायल सिस्टम माँग सकते हैं। हमारी टीम इसे तैयार करके एक कार्यदिवस के भीतर लॉगिन ईमेल करती है।",
      humanIntro: "ज़रूर। हमारी टीम से संपर्क का तरीका चुनें:",
      langIntro: "यह वेबसाइट अंग्रेज़ी और हिन्दी में उपलब्ध है।",
      followDemo: "डेमो बुक करें", followHuman: "किसी व्यक्ति से बात करें", followFinder: "मुझे कौन-से मॉड्यूल चाहिए?", followPricing: "कीमतें कैसे तय होती हैं?", followSummary: "इस पेज का सारांश दें", followTour: "प्रोडक्ट दिखाएँ", followTrial: "क्या मुफ़्त में आज़मा सकते हैं?",
      aAdvisor: "पूरा AI प्लान पाएँ", aTour: "टूर शुरू करें", aPricing: "कीमतें देखें", aTrial: "ट्रायल माँगें", aCalc: "पूरा कैलकुलेटर खोलें", aContact: "संपर्क पेज", aWa: "WhatsApp पर चैट करें", aCallback: "कॉल बैक माँगें", aSwitch: "View in English",
      fName: "नाम", fEmail: "कार्य ईमेल", fCompany: "कंपनी", fPhone: "फ़ोन", fPhoneOpt: "फ़ोन (वैकल्पिक)", fTime: "सही समय", fConsent: "मैं इस अनुरोध के बारे में संपर्क किए जाने के लिए सहमत हूँ। गोपनीयता नीति देखें।",
      times: ["सुबह (9–12)", "दोपहर (12–4)", "शाम (4–7)"],
      submitDemo: "डेमो का अनुरोध करें", submitCall: "मुझे कॉल करें", sending: "भेजा जा रहा है…", sentDemo: "हो गया! प्रोडक्ट विशेषज्ञ एक कार्यदिवस के भीतर ईमेल करेंगे।", sentCall: "हो गया! हम आपके चुने समय पर कॉल करेंगे।",
      formMissing: "कृपया ज़रूरी फ़ील्ड भरें और सहमति वाला बॉक्स चुनें।", formFail: "क्षमा करें, यह नहीं भेजा जा सका। फिर से कोशिश करें या संपर्क पेज इस्तेमाल करें।",
      finderPlan: "सुझाई गई शुरुआत", finderEss: "ऑर्डर से कैश और खरीद से भुगतान वाला कोर फ़ाइनेंस आपकी ज़रूरतें पूरी करता है।", finderSuite: "आपको फ़ाइनेंस के साथ ऑपरेशंस भी चाहिए, इसलिए Business Suite से शुरू करें।", finderAddons: "ऐड-ऑन", finderBook: "इनके लिए डेमो बुक करें",
      calcInvoices: "हर महीने सप्लायर इनवॉइस", calcMinutes: "आज प्रति इनवॉइस मिनट", calcCost: "प्रति व्यक्ति मासिक लागत (₹)", calcResult: "30% कम मैनुअल काम मानकर, केवल इनवॉइस पर लगभग {hours} घंटे और सालाना {value} की बचत।",
      mods: [["finance", "फ़ाइनेंस"], ["sales", "सेल्स"], ["procurement", "प्रोक्योरमेंट"], ["supply-chain", "सप्लाई चेन"], ["manufacturing", "मैन्युफ़ैक्चरिंग"], ["services", "प्रोजेक्ट"], ["assets", "एसेट"], ["hr", "HR"]],
      addonAssets: "Asset & field service", addonHr: "People & payroll",
      waText: "नमस्ते Quantinox, मैं Quanta AI से इस बारे में बात कर रहा/रही था/थी: ",
      nudge: { "pricing.html": "कीमतों के बारे में सवाल? Quanta AI से पूछें।", "demo.html": "तय नहीं कर पा रहे कि कौन-से मॉड्यूल चुनें? Quanta AI से पूछें।", "_": "कोई सवाल है? Quanta AI मदद कर सकता है।" },
      aiError: "AI सेवा से संपर्क नहीं हो सका, इसलिए यह जवाब हमारी वेबसाइट से है।",
      shortcut: "Ctrl + I"
    }
  };

  /* ------------------------------------------------------------------ helpers */
  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function stored(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function isHindi(s) { return /[ऀ-ॿ]/.test(s); }
  function safeUrl(u) {
    u = String(u || "").trim();
    if (/^https:\/\//i.test(u)) { return u; }
    if (/^[a-z0-9-]+\.html(#[a-z0-9-]+)?$/i.test(u) || /^#[a-z0-9-]+$/i.test(u)) { return u; }
    return "";
  }
  // Minimal, safe markdown: **bold**, [label](url), "- " lists, paragraphs. Input is escaped first.
  function md(text) {
    var lines = esc(text).split(/\n/);
    var html = "", inList = false;
    var inline = function (s) {
      return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
          var u = safeUrl(url.replace(/&amp;/g, "&"));
          return u ? '<a href="' + u + '"' + (/^https:/.test(u) ? ' target="_blank" rel="noopener"' : "") + ">" + label + "</a>" : label;
        });
    };
    lines.forEach(function (ln) {
      var li = /^\s*[-•*]\s+(.*)/.exec(ln);
      if (li) { if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inline(li[1]) + "</li>"; return; }
      if (inList) { html += "</ul>"; inList = false; }
      if (ln.trim()) { html += "<p>" + inline(ln) + "</p>"; }
    });
    if (inList) { html += "</ul>"; }
    return html;
  }
  function icon(d, s) { return '<svg width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + "</svg>"; }
  var I = {
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>', expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>', collapse: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    up: '<path d="M7 10v12M15 5.9L14 10h5.8a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.4 22H7V10l4-8a3 3 0 0 1 3 3z"/>',
    down: '<path d="M17 14V2M9 18.1L10 14H4.2a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.6 2H17v12l-4 8a3 3 0 0 1-3-3z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    vol: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>', link: '<path d="M7 17L17 7M8 7h9v9"/>'
  };

  /* ------------------------------------------------------------------ knowledge + search (site guide mode) */
  var KB = null, kbLoading = null, INDEX = null;
  var STOP = ("a an and are as at be by can do does for from has have how i in is it its me my of on or our the this to we what when where which who why will with you your about tell show give need want quantinox handle handles work works offer offers provide provides available possible " +
    "का की के है हैं में से को और या क्या कैसे कौन कौन-से मुझे मेरे हम आप यह वह पर भी तो एक लिए करें करता करती होता होती बताएँ बताइए").split(" ");
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  function tokens(s) {
    var m = String(s).toLowerCase().replace(/[-–/]/g, " ").match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) || [];
    return m.filter(function (w) { return w.length > 1 && !STOPSET[w]; })
      // light stemming for English: compare the first 6 letters (invoice / invoices / invoicing all match)
      .map(function (w) { return /^[a-z0-9]+$/.test(w) && w.length > 6 ? w.slice(0, 6) : w; });
  }
  function loadKb() {
    if (KB) { return Promise.resolve(KB); }
    if (window.QX_KB) { KB = window.QX_KB; buildIndex(); return Promise.resolve(KB); }
    if (kbLoading) { return kbLoading; }
    kbLoading = new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = kbUrl; s.async = true;
      s.onload = function () { KB = window.QX_KB || { chunks: [], pages: [] }; buildIndex(); resolve(KB); };
      s.onerror = function () { KB = { chunks: [], pages: [] }; buildIndex(); resolve(KB); };
      document.head.appendChild(s);
    });
    return kbLoading;
  }
  function buildIndex() {
    var docs = KB.chunks.map(function (c) {
      var tk = tokens(c.t + " " + c.t + " " + c.pt + " " + c.x);
      var tf = {}; tk.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      return { c: c, tf: tf, len: tk.length };
    });
    var df = {}, total = 0;
    docs.forEach(function (d) { total += d.len; Object.keys(d.tf).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
    INDEX = { docs: docs, df: df, avg: total / Math.max(1, docs.length), n: docs.length };
    // Synonyms (tools/assistant-synonyms.json): "GST" also finds "tax", "वेतन" also finds "पेरोल"
    SYN = {};
    Object.keys(KB.syn || {}).forEach(function (k) {
      var key = tokens(k)[0]; if (!key || !Array.isArray(KB.syn[k])) { return; }
      var alts = SYN[key] || [];
      tokens(KB.syn[k].join(" ")).forEach(function (t) { if (t !== key && alts.indexOf(t) < 0) { alts.push(t); } });
      SYN[key] = alts;
    });
  }
  var SYN = {};
  function search(q, lang, limit) {
    if (!INDEX) { return []; }
    var qt = tokens(q);
    if (!qt.length) { return []; }
    var k1 = 1.4, b = 0.75, res = [];
    var uq = qt.filter(function (w, i) { return qt.indexOf(w) === i; });
    INDEX.docs.forEach(function (d) {
      if (d.c.l !== lang) { return; }
      var score = 0, hit = 0;
      var bm25 = function (w) {
        var f = d.tf[w]; if (!f) { return 0; }
        var idf = Math.log(1 + (INDEX.n - INDEX.df[w] + 0.5) / (INDEX.df[w] + 0.5));
        return idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / INDEX.avg));
      };
      uq.forEach(function (w) {
        // the word itself counts fully, a synonym a little less
        var own = bm25(w), best = own;
        (SYN[w] || []).forEach(function (a) { best = Math.max(best, 0.45 * bm25(a)); });
        if (best) { hit += own ? 1 : 0.5; score += best; }
      });
      if (!score) { return; }
      var cover = hit / uq.length;            // how much of the question this passage covers
      score *= 0.35 + cover;
      if (d.c.p === pageFile) { score *= 1.15; } // prefer the page the visitor is on
      res.push({ c: d.c, s: score, cover: cover });
    });
    res.sort(function (a, z) { return z.s - a.s; });
    return res.slice(0, limit || 6);
  }
  function bestSentences(text, q, max) {
    var qt = tokens(q), sents = text.match(/[^.!?।]+[.!?।]?/g) || [text];
    var scored = sents.map(function (s, i) { var t = tokens(s); var hit = t.filter(function (w) { return qt.indexOf(w) > -1; }).length; return { s: s, i: i, h: hit }; });
    scored.sort(function (a, z) { return z.h - a.h || a.i - z.i; });
    var pick = scored.slice(0, 2).sort(function (a, z) { return a.i - z.i; }).map(function (x) { return x.s.trim(); }).join(" ");
    if (pick.length > (max || 260)) { pick = pick.slice(0, (max || 260)).replace(/\s+\S*$/, "") + "…"; }
    return pick;
  }

  /* ------------------------------------------------------------------ intents (site guide mode) */
  var INTENTS = [
    ["greet", /^\s*(hi|hello|hey|hii+|good (morning|afternoon|evening)|namaste|नमस्ते|नमस्कार|हेलो|हाय)\b[\s!.?]*$/i],
    ["summary", /(summari[sz]e|summary|this page|what is on this page|सारांश|इस पेज)/i],
    ["human", /(human|real person|someone|agent|representative|talk to (sales|team|a person)|whatsapp|इंसान|व्यक्ति|किसी से बात|टीम से बात|व्हाट्सएप)/i],
    ["callback", /(call ?back|call me|phone call|कॉल बैक|कॉल करें|फ़ोन कर)/i],
    ["demo", /(\bdemo\b|demonstration|डेमो)/i],
    ["calc", /(saving|save money|roi|return on|calculat|business case|worth|बचत|कैलकुलेट|फ़ायदा कितना)/i],
    ["finder", /(which modules?|what modules?|recommend|right (package|plan|fit)|where (do|should) i start|कौन-से मॉड्यूल|कौन से मॉड्यूल|मॉड्यूल चाहिए|सुझा|कौन-सा पैकेज|सही पैकेज)/i],
    ["pricing", /(pric|cost|how much|plans?\b|package|subscription|quote|कीमत|दाम|लागत|प्लान|पैकेज|कोटेशन)/i],
    ["trial", /(trial|try it|free account|sandbox|ट्रायल|आज़मा|मुफ़्त)/i],
    ["tour", /(tour|show me (the )?(product|screens?)|screenshots?|टूर|स्क्रीन दिखा|प्रोडक्ट दिखा)/i],
    ["lang", /(hindi|english|हिन्दी|हिंदी|अंग्रेज़ी|language|भाषा)/i],
    ["overview", /(what('s| is) quantinox|about quantinox|what (can|does) quantinox|tell me about (quantinox|your (company|product|erp))|overview|quantinox क्या|क्या कर सकता|के बारे में बताएँ|के बारे में बताइए)/i],
    ["implementation", /(implement|go[ -]?live|how long|timeline|onboard|migrat|set ?up|move from|switch from|लागू|इम्प्लीमेंट|कितना समय|माइग्रेशन)/i],
    ["security", /(secur|privacy|encrypt|backup|data (safety|security|protection|residency|cent(re|er)|stored|storage)|where is (my|our) data|dpdp|सुरक्षा|गोपनीयता)/i],
    ["support", /(customer support|support (team|case|ticket|portal)|raise a (case|ticket)|help ?desk|सपोर्ट टीम|सहायता चाहिए|टिकट)/i],
    ["ai_info", /(quanta ai|ai agents?|artificial intelligence|what can (the )?ai|एजेंट|आर्टिफ़िशियल)/i],
    ["industries", /(industr|sectors?|उद्योग)/i]
  ];
  function detectIntent(q) {
    for (var i = 0; i < INTENTS.length; i++) { if (INTENTS[i][1].test(q)) { return INTENTS[i][0]; } }
    return null;
  }

  /* ------------------------------------------------------------------ state */
  var KEY = "qx-ai-chat";
  var state = { msgs: [], wide: false, speak: false };
  try { var saved = JSON.parse(stored(KEY) || "null"); if (saved && saved.msgs) { state = saved; } } catch (e) { /* ignore */ }
  function save() { state.msgs = state.msgs.slice(-40); store(KEY, JSON.stringify(state)); }
  function L(m) { return S[m && m.lang ? m.lang : replyLang] || S.en; }
  var replyLang = pageLang;
  function T(k) { return (S[replyLang] || S.en)[k]; }

  /* ------------------------------------------------------------------ UI */
  var root, log, input, sendBtn, micBtn, chipsBox, panel, menuBox, busy = false;
  function build() {
    if (root) { return; }
    var t = S[pageLang];
    root = document.createElement("div");
    root.className = "qx-ai" + (state.wide ? " is-wide" : "");
    root.innerHTML =
      '<div class="qx-ai-backdrop" data-ai-close></div>' +
      '<section class="qx-ai-panel" role="dialog" aria-modal="false" aria-labelledby="qx-ai-title">' +
        '<header class="qx-ai-head">' +
          '<span class="qx-ai-avatar">' + icon(I.spark, 20) + "</span>" +
          '<div class="qx-ai-title"><strong id="qx-ai-title">' + esc(t.name) + '</strong><span class="qx-ai-mode">' + esc(aiMode ? t.modeAi : t.modeGuide) + "</span></div>" +
          '<button class="qx-ai-icon" type="button" data-ai-new title="' + esc(t.newChat) + '" aria-label="' + esc(t.newChat) + '">' + icon(I.plus) + "</button>" +
          '<button class="qx-ai-icon qx-ai-hide-sm" type="button" data-ai-wide title="' + esc(t.expand) + '" aria-label="' + esc(t.expand) + '">' + icon(I.expand) + "</button>" +
          '<div class="qx-ai-menu-wrap"><button class="qx-ai-icon" type="button" data-ai-more aria-haspopup="true" aria-expanded="false" title="' + esc(t.more) + '" aria-label="' + esc(t.more) + '">' + icon(I.more) + "</button>" +
            '<div class="qx-ai-menu" role="menu" hidden>' +
              '<button type="button" role="menuitem" data-ai-speak>' + icon(I.vol) + "<span></span></button>" +
              '<button type="button" role="menuitem" data-ai-download>' + icon(I.dl) + "<span>" + esc(t.download) + "</span></button>" +
            "</div></div>" +
          '<button class="qx-ai-icon" type="button" data-ai-close title="' + esc(t.close) + '" aria-label="' + esc(t.close) + '">' + icon(I.close) + "</button>" +
        "</header>" +
        '<div class="qx-ai-log" role="log" aria-live="polite" aria-relevant="additions"></div>' +
        '<div class="qx-ai-chips" role="group"></div>' +
        '<form class="qx-ai-compose" novalidate>' +
          '<textarea rows="1" maxlength="1500" aria-label="' + esc(t.placeholder) + '" placeholder="' + esc(t.placeholder) + '"></textarea>' +
          '<button class="qx-ai-mic" type="button" aria-label="' + esc(t.mic) + '" title="' + esc(t.mic) + '" hidden>' + icon(I.mic) + "</button>" +
          '<button class="qx-ai-send" type="submit" aria-label="' + esc(t.send) + '" title="' + esc(t.send) + '">' + icon(I.send) + "</button>" +
        "</form>" +
        '<p class="qx-ai-note">' + esc(aiMode ? t.disclaimerAi : t.disclaimerGuide) + "</p>" +
      "</section>";
    document.body.appendChild(root);
    panel = root.querySelector(".qx-ai-panel");
    log = root.querySelector(".qx-ai-log");
    input = root.querySelector("textarea");
    sendBtn = root.querySelector(".qx-ai-send");
    micBtn = root.querySelector(".qx-ai-mic");
    chipsBox = root.querySelector(".qx-ai-chips");
    menuBox = root.querySelector(".qx-ai-menu");

    root.querySelectorAll("[data-ai-close]").forEach(function (b) { b.addEventListener("click", closePanel); });
    root.querySelector("[data-ai-new]").addEventListener("click", function () { state.msgs = []; save(); log.innerHTML = ""; greet(); input.focus(); });
    root.querySelector("[data-ai-wide]").addEventListener("click", function () {
      state.wide = !state.wide; save(); root.classList.toggle("is-wide", state.wide);
      var b = root.querySelector("[data-ai-wide]"); b.innerHTML = icon(state.wide ? I.collapse : I.expand); b.setAttribute("aria-label", state.wide ? t.collapse : t.expand); b.title = state.wide ? t.collapse : t.expand;
    });
    var moreBtn = root.querySelector("[data-ai-more]");
    moreBtn.addEventListener("click", function (e) { e.stopPropagation(); menuBox.hidden = !menuBox.hidden; moreBtn.setAttribute("aria-expanded", menuBox.hidden ? "false" : "true"); syncSpeak(); });
    document.addEventListener("click", function (e) { if (!menuBox.hidden && !menuBox.contains(e.target)) { menuBox.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); } });
    root.querySelector("[data-ai-speak]").addEventListener("click", function () { state.speak = !state.speak; save(); syncSpeak(); if (!state.speak && window.speechSynthesis) { speechSynthesis.cancel(); } menuBox.hidden = true; });
    root.querySelector("[data-ai-download]").addEventListener("click", function () { downloadTranscript(); menuBox.hidden = true; });
    if (!("speechSynthesis" in window)) { root.querySelector("[data-ai-speak]").hidden = true; }

    root.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input.value); } });
    input.addEventListener("input", function () { input.style.height = "auto"; input.style.height = Math.min(140, input.scrollHeight) + "px"; });
    root.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); closePanel(); } });
    log.addEventListener("click", onLogClick);
    setupVoice();

    if (state.msgs.length) { state.msgs.forEach(function (m) { renderMsg(m, false); }); scrollEnd(); setChips(defaultChips()); }
    else { greet(); }
  }
  function syncSpeak() { var b = root.querySelector("[data-ai-speak] span"); if (b) { b.textContent = state.speak ? T("readOff") : T("readAloud"); } }

  function greet() {
    var t = S[pageLang];
    var title = (document.querySelector("h1") || {}).textContent || document.title;
    var txt = t.hello + (pageFile !== "index.html" && title ? "\n" + t.helloPage.replace("{page}", title.trim().slice(0, 80).replace(/[.।!?]+$/, "")) : "");
    addMsg({ role: "assistant", text: txt, lang: pageLang, greet: true });
    setChips(defaultChips());
  }
  function defaultChips() {
    var t = S[replyLang];
    var c = [];
    if (pageFile !== "index.html") { c.push(t.followSummary); }
    c.push(t.followFinder, t.followPricing, t.followDemo, t.followTour, t.followHuman);
    return c.slice(0, 5);
  }
  function setChips(list) {
    chipsBox.innerHTML = "";
    (list || []).forEach(function (txt) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "qx-ai-chip"; b.textContent = txt;
      b.addEventListener("click", function () { ask(txt); });
      chipsBox.appendChild(b);
    });
    chipsBox.hidden = !chipsBox.children.length;
  }

  function addMsg(m) {
    m.id = m.id || "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.msgs.push(m); save();
    return renderMsg(m, true);
  }
  function renderMsg(m, animate) {
    var el = document.createElement("div");
    el.className = "qx-ai-msg is-" + m.role + (animate && !reduceMotion ? " is-new" : "");
    el.setAttribute("data-id", m.id);
    if (m.role === "user") {
      el.innerHTML = '<div class="qx-ai-bubble">' + esc(m.text) + "</div>";
    } else {
      el.innerHTML = '<span class="qx-ai-mini">' + icon(I.spark, 14) + '</span><div class="qx-ai-body"><div class="qx-ai-bubble"></div></div>';
      fillAssistant(el, m);
    }
    log.appendChild(el);
    if (animate) { scrollEnd(); }
    return el;
  }
  function fillAssistant(el, m) {
    var t = L(m);
    var body = el.querySelector(".qx-ai-body");
    el.querySelector(".qx-ai-bubble").innerHTML = md(m.text || "");
    body.querySelectorAll(".qx-ai-sources, .qx-ai-actions, .qx-ai-card, .qx-ai-tools").forEach(function (n) { n.remove(); });
    if (m.sources && m.sources.length) {
      var s = document.createElement("div"); s.className = "qx-ai-sources";
      s.innerHTML = "<span>" + esc(t.sources) + "</span>" + m.sources.map(function (x) { var u = safeUrl(x.u); return u ? '<a href="' + u + '">' + esc(x.t) + "</a>" : ""; }).join("");
      body.appendChild(s);
    }
    if (m.actions && m.actions.length) {
      var a = document.createElement("div"); a.className = "qx-ai-actions";
      m.actions.forEach(function (ac) {
        if (ac.card) { var b = document.createElement("button"); b.type = "button"; b.className = "qx-ai-action"; b.setAttribute("data-card", ac.card); b.textContent = ac.label; a.appendChild(b); return; }
        var u = safeUrl(ac.url); if (!u) { return; }
        var l = document.createElement("a"); l.className = "qx-ai-action"; l.href = u; l.innerHTML = esc(ac.label) + icon(I.link, 14);
        if (ac.wa) { l.setAttribute("data-wa", "1"); }
        a.appendChild(l);
      });
      body.appendChild(a);
    }
    if (m.card) { body.appendChild(renderCard(m.card, m)); }
    if (!m.greet && m.done !== false) {
      var tools = document.createElement("div"); tools.className = "qx-ai-tools";
      tools.innerHTML = '<button type="button" data-act="copy" title="' + esc(t.copy) + '" aria-label="' + esc(t.copy) + '">' + icon(I.copy, 15) + "</button>" +
        '<button type="button" data-act="good" title="' + esc(t.good) + '" aria-label="' + esc(t.good) + '" aria-pressed="' + (m.fb === "good") + '">' + icon(I.up, 15) + "</button>" +
        '<button type="button" data-act="bad" title="' + esc(t.bad) + '" aria-label="' + esc(t.bad) + '" aria-pressed="' + (m.fb === "bad") + '">' + icon(I.down, 15) + "</button>";
      body.appendChild(tools);
    }
  }
  function scrollEnd() { log.scrollTop = log.scrollHeight; }

  function onLogClick(e) {
    var btn = e.target.closest("button, a");
    if (!btn) { return; }
    var msgEl = btn.closest(".qx-ai-msg");
    var m = msgEl && state.msgs.filter(function (x) { return x.id === msgEl.getAttribute("data-id"); })[0];
    if (btn.hasAttribute("data-card")) { showCard(btn.getAttribute("data-card")); return; }
    if (btn.getAttribute("data-wa")) { btn.href = whatsappHref(); }
    var act = btn.getAttribute("data-act");
    if (!act || !m) { return; }
    if (act === "copy") {
      var done = function () { btn.title = L(m).copied; btn.classList.add("is-done"); setTimeout(function () { btn.classList.remove("is-done"); }, 1200); };
      if (navigator.clipboard) { navigator.clipboard.writeText(m.text).then(done, done); } else { done(); }
    }
    if (act === "good" || act === "bad") {
      m.fb = act; save();
      msgEl.querySelectorAll('[data-act="good"],[data-act="bad"]').forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-act") === act ? "true" : "false"); });
      if (aiMode) {
        try { fetch(endpoint + "/api/assistant/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: act, answer: m.text.slice(0, 2000), question: m.q || "", page: pageFile, lang: replyLang }) }).catch(function () {}); } catch (er) { /* ignore */ }
      }
      var note = document.createElement("span"); note.className = "qx-ai-thanks"; note.textContent = L(m).thanks; btn.parentNode.appendChild(note);
      setTimeout(function () { note.remove(); }, 2000);
    }
  }

  /* ------------------------------------------------------------------ cards */
  function showCard(card) {
    var intro = { demo: "demoIntro", callback: "callbackIntro", finder: "finderIntro", calc: "calcIntro" }[card];
    addMsg({ role: "assistant", text: T(intro), card: card, lang: replyLang });
  }
  function renderCard(card, m) {
    var t = L(m);
    var box = document.createElement("div");
    box.className = "qx-ai-card";
    if (card === "demo" || card === "callback") {
      var isDemo = card === "demo";
      box.innerHTML = '<form novalidate>' +
        '<label>' + esc(t.fName) + '<input name="first_name" required autocomplete="name"></label>' +
        '<label>' + esc(t.fEmail) + '<input name="email" type="email" required autocomplete="email"></label>' +
        (isDemo ? '<label>' + esc(t.fCompany) + '<input name="company" required autocomplete="organization"></label><label>' + esc(t.fPhoneOpt) + '<input name="phone" type="tel" autocomplete="tel"></label>'
                : '<label>' + esc(t.fPhone) + '<input name="phone" type="tel" required autocomplete="tel"></label><label>' + esc(t.fTime) + '<select name="call_time">' + t.times.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("") + "</select></label>") +
        '<label class="qx-ai-consent"><input type="checkbox" name="consent" value="yes" required><span>' + esc(t.fConsent) + "</span></label>" +
        '<input type="text" name="website" tabindex="-1" autocomplete="off" class="qx-ai-hp" aria-hidden="true">' +
        '<p class="qx-ai-err" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-primary btn-block">' + esc(isDemo ? t.submitDemo : t.submitCall) + "</button></form>";
      if (m.sent) { box.innerHTML = '<p class="qx-ai-ok">' + esc(isDemo ? t.sentDemo : t.sentCall) + "</p>"; return box; }
      var form = box.querySelector("form");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var err = form.querySelector(".qx-ai-err");
        if (form.querySelector(":invalid")) { err.textContent = t.formMissing; err.hidden = false; form.querySelector(":invalid").focus(); return; }
        if (form.website.value) { return; }
        var payload = {};
        new FormData(form).forEach(function (v, k) { if (k !== "website") { payload[k] = String(v).trim(); } });
        payload.lead_type = isDemo ? "assistant_demo" : "callback";
        payload.source = "Quanta AI";
        payload.message = "Asked Quanta AI: " + state.msgs.filter(function (x) { return x.role === "user"; }).slice(-3).map(function (x) { return x.text; }).join(" | ").slice(0, 600);
        payload.lang = replyLang; payload.page = location.pathname;
        var b = form.querySelector("button"); b.disabled = true; b.textContent = t.sending;
        var finish = function () { m.sent = true; save(); box.innerHTML = '<p class="qx-ai-ok">' + esc(isDemo ? t.sentDemo : t.sentCall) + "</p>"; scrollEnd(); };
        if (!leadEndpoint) { if (window.console) { console.info("Quanta AI: set apiBase or formEndpoint in config.js to receive requests."); } finish(); return; }
        fetch(leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { if (!r.ok) { throw new Error(r.status); } finish(); })
          .catch(function () { err.textContent = t.formFail; err.hidden = false; b.disabled = false; b.textContent = isDemo ? t.submitDemo : t.submitCall; });
      });
    } else if (card === "finder") {
      box.innerHTML = '<div class="qx-ai-mods">' + t.mods.map(function (x) { return '<label><input type="checkbox" value="' + x[0] + '"' + (x[0] === "finance" ? " checked" : "") + "><span>" + esc(x[1]) + "</span></label>"; }).join("") + "</div>" +
        '<div class="qx-ai-result"><small>' + esc(t.finderPlan) + '</small><strong></strong><p></p><a class="btn btn-primary" href="demo.html">' + esc(t.finderBook) + "</a></div>";
      var upd = function () {
        var picked = Array.prototype.map.call(box.querySelectorAll("input:checked"), function (i) { return i.value; });
        var suite = picked.some(function (v) { return ["supply-chain", "manufacturing", "services"].indexOf(v) > -1; });
        var add = [];
        if (picked.indexOf("assets") > -1) { add.push(t.addonAssets); }
        if (picked.indexOf("hr") > -1) { add.push(t.addonHr); }
        box.querySelector("strong").textContent = picked.length ? (suite ? "Business Suite" : "Finance Essentials") : "—";
        box.querySelector(".qx-ai-result p").textContent = picked.length ? (suite ? t.finderSuite : t.finderEss) + (add.length ? " " + t.finderAddons + ": " + add.join(", ") + "." : "") : "";
        box.querySelector(".qx-ai-result a").href = "demo.html" + (picked.length ? "?modules=" + encodeURIComponent(picked.join(",")) : "");
      };
      box.addEventListener("change", upd); upd();
    } else if (card === "calc") {
      box.innerHTML = '<div class="qx-ai-calc">' +
        '<label>' + esc(t.calcInvoices) + '<input type="number" min="0" value="1500" data-k="inv"></label>' +
        '<label>' + esc(t.calcMinutes) + '<input type="number" min="0" value="6" data-k="min"></label>' +
        '<label>' + esc(t.calcCost) + '<input type="number" min="0" step="1000" value="60000" data-k="cost"></label></div>' +
        '<p class="qx-ai-result-line"></p><a class="qx-ai-action" href="value-calculator.html">' + esc(t.aCalc) + icon(I.link, 14) + "</a>";
      var nf = new Intl.NumberFormat(replyLang === "hi" ? "hi-IN" : "en-IN", { maximumFractionDigits: 0 });
      var money = new Intl.NumberFormat(replyLang === "hi" ? "hi-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
      var calc = function () {
        var v = function (k) { var n = parseFloat(box.querySelector('[data-k="' + k + '"]').value); return isFinite(n) && n > 0 ? n : 0; };
        var hours = v("inv") * v("min") / 60 * 0.3;
        box.querySelector(".qx-ai-result-line").textContent = t.calcResult.replace("{hours}", nf.format(hours)).replace("{value}", money.format(hours * v("cost") / 160 * 12));
      };
      box.addEventListener("input", calc); calc();
    }
    return box;
  }

  /* ------------------------------------------------------------------ answering */
  function ask(text) {
    text = String(text || "").trim();
    if (!text || busy) { return; }
    replyLang = isHindi(text) ? "hi" : (/^[\x00-\x7F\s]+$/.test(text) && pageLang === "hi" && text.split(/\s+/).length > 2 ? "en" : pageLang);
    input.value = ""; input.style.height = "auto";
    addMsg({ role: "user", text: text });
    setChips([]);
    busy = true; sendBtn.disabled = true;
    var typing = document.createElement("div");
    typing.className = "qx-ai-msg is-assistant"; typing.innerHTML = '<span class="qx-ai-mini">' + icon(I.spark, 14) + '</span><div class="qx-ai-typing" aria-label="' + esc(T("thinking")) + '"><span></span><span></span><span></span></div>';
    log.appendChild(typing); scrollEnd();
    var finish = function () { busy = false; sendBtn.disabled = false; if (typing.parentNode) { typing.remove(); } };
    if (aiMode) {
      askAi(text, typing).then(finish, function () {
        finish();
        loadKb().then(function () { var a = localAnswer(text); a.text = T("aiError") + "\n" + a.text; deliver(a, text); });
      });
    } else {
      loadKb().then(function () { setTimeout(function () { finish(); var a = localAnswer(text); deliver(a, text); logQuestion(text, a); }, reduceMotion ? 0 : 450); });
    }
  }
  // Site-guide mode: tell the backend what was asked (anonymised there), so the team can see
  // popular questions and the ones the website cannot answer yet (admin › AI insights).
  // AI-mode questions are recorded by the backend itself.
  function logQuestion(q, a) {
    if (!apiBase || aiMode || a.intent === "greet") { return; }
    try {
      fetch(apiBase + "/api/assistant/log", {
        method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: String(q).slice(0, 1000), page: pageFile, lang: replyLang, intent: a.intent, matched: a.intent === "none" ? 0 : Math.max(1, (a.sources || []).length) })
      }).catch(function () {});
    } catch (e) { /* ignore */ }
  }
  function deliver(a, q) {
    a.role = "assistant"; a.lang = replyLang; a.q = q;
    addMsg(a);
    speak(a.text);
    setChips(a.chips || followUps(a));
  }
  function followUps(a) {
    var t = S[replyLang], c = [];
    if (a.intent !== "demo") { c.push(t.followDemo); }
    if (a.intent !== "finder") { c.push(t.followFinder); }
    if (a.intent !== "pricing") { c.push(t.followPricing); }
    if (a.intent !== "human") { c.push(t.followHuman); }
    return c.slice(0, 4);
  }
  function srcFrom(results, n) {
    var seen = {}, out = [];
    results.forEach(function (r) { if (!seen[r.c.p] && out.length < (n || 3)) { seen[r.c.p] = 1; out.push({ t: r.c.pt, u: r.c.u }); } });
    return out;
  }

  function localAnswer(q) {
    var t = S[replyLang];
    var intent = detectIntent(q);
    var page = function (p) { return KB.chunks.filter(function (c) { return c.p === p && c.l === replyLang; }); };
    switch (intent) {
      case "greet": return { intent: intent, text: t.greet, chips: defaultChips() };
      case "summary": {
        var cs = page(pageFile);
        if (!cs.length) { return { intent: intent, text: t.summaryNone, chips: defaultChips() }; }
        var seen = {}, items = [];
        cs.forEach(function (c) { if (!seen[c.t] && items.length < 6) { seen[c.t] = 1; items.push("- **" + c.t + "**: " + bestSentences(c.x, c.t, 140)); } });
        return { intent: intent, text: t.summary + "\n" + items.join("\n") };
      }
      case "demo": return { intent: intent, text: t.demoIntro, card: "demo" };
      case "callback": return { intent: intent, text: t.callbackIntro, card: "callback" };
      case "finder": return { intent: intent, text: t.finderIntro, card: "finder", actions: [{ label: t.aAdvisor, url: "ai-advisor.html" }] };
      case "calc": return { intent: intent, text: t.calcIntro, card: "calc" };
      case "pricing": return { intent: intent, text: t.pricing, sources: [{ t: replyLang === "hi" ? "कीमतें" : "Pricing", u: "pricing.html" }], actions: [{ label: t.aPricing, url: "pricing.html" }, { label: t.followDemo, card: "demo" }, { label: t.followFinder, card: "finder" }] };
      case "trial": return { intent: intent, text: t.trialIntro, actions: [{ label: t.aTrial, url: "trials.html#free-trial" }, { label: t.aTour, url: "tour.html" }] };
      case "tour": return { intent: intent, text: t.tourIntro, actions: [{ label: t.aTour, url: "tour.html" }] };
      case "human": return { intent: intent, text: t.humanIntro, actions: [{ label: t.aWa, url: "contact.html", wa: true }, { label: t.aCallback, card: "callback" }, { label: t.aContact, url: "contact.html#message" }] };
      case "overview": return { intent: intent, text: t.overview, sources: [{ t: replyLang === "hi" ? "प्रोडक्ट" : "Products", u: "products.html" }, { t: "Quanta AI", u: "ai.html" }], actions: [{ label: t.aTour, url: "tour.html" }, { label: t.followFinder, card: "finder" }] };
      case "implementation": return { intent: intent, text: t.implementation, sources: [{ t: replyLang === "hi" ? "ट्रांसफ़ॉर्म और सपोर्ट" : "Transform and support", u: "transform.html" }], actions: [{ label: t.followDemo, card: "demo" }] };
      case "security": return { intent: intent, text: t.security, sources: [{ t: replyLang === "hi" ? "ट्रस्ट सेंटर" : "Trust center", u: "about.html#trust" }, { t: replyLang === "hi" ? "गोपनीयता नीति" : "Privacy policy", u: "privacy.html" }] };
      case "support": return { intent: intent, text: t.support, sources: [{ t: replyLang === "hi" ? "ग्राहक सहायता" : "Customer support", u: "support.html" }], actions: [{ label: t.aContact, url: "contact.html#message" }] };
      case "ai_info": return { intent: intent, text: t.aiInfo, sources: [{ t: "Quanta AI", u: "ai.html" }], actions: [{ label: t.aTour, url: "tour.html" }] };
      case "industries": return { intent: intent, text: t.industries, sources: [{ t: replyLang === "hi" ? "उद्योग" : "Industries", u: "industries.html" }] };
      case "lang": return { intent: intent, text: t.langIntro, actions: [{ label: S[pageLang].aSwitch, url: "#qx-switch-lang" }] };
    }
    var res = search(q, replyLang, 8);
    if (!res.length || res[0].s < 2 || res[0].cover < (tokens(q).length > 2 ? 0.5 : 0.34)) {
      return { intent: "none", text: t.none, actions: [{ label: t.aWa, url: "contact.html", wa: true }, { label: t.aCallback, card: "callback" }, { label: t.followDemo, card: "demo" }] };
    }
    var top = [], seen2 = {};
    res.forEach(function (r) { if (top.length < 3 && !seen2[r.c.p] && r.s > res[0].s * 0.55 && r.cover >= 0.5) { seen2[r.c.p] = 1; top.push(r); } });
    var lines = top.map(function (r) { return "- **" + r.c.t + "**: " + bestSentences(r.c.x, q) + " [→](" + r.c.u + ")"; });
    return { intent: "search", text: (top.length > 1 ? t.found : t.foundOne) + "\n" + lines.join("\n"), sources: srcFrom(top) };
  }

  /* ------------------------------------------------------------------ AI mode (streams from your assistant server) */
  function askAi(text, typing) {
    var history = state.msgs.filter(function (m) { return (m.role === "user" || m.role === "assistant") && !m.greet && m.text; }).slice(-12)
      .map(function (m) { return { role: m.role, content: String(m.text).slice(0, 2000) }; });
    var h1 = (document.querySelector("h1") || {}).textContent || "";
    var msg = { role: "assistant", text: "", lang: replyLang, q: text, sources: [], actions: [], done: false };
    var el = null;
    var ensure = function () {
      if (!el) { if (typing.parentNode) { typing.remove(); } msg.id = "m" + Date.now().toString(36); state.msgs.push(msg); el = renderMsg(msg, true); }
    };
    return fetch(endpoint + "/api/assistant", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
      body: JSON.stringify({ messages: history, lang: replyLang, page: { file: pageFile, title: document.title, h1: h1.trim().slice(0, 160) } })
    }).then(function (res) {
      if (!res.ok || !res.body) { throw new Error("status " + res.status); }
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      var handle = function (ev) {
        if (ev.type === "text") { ensure(); msg.text += ev.text; el.querySelector(".qx-ai-bubble").innerHTML = md(msg.text); scrollEnd(); }
        else if (ev.type === "action" && ev.action) {
          var a = ev.action;
          if (a.card && /^(demo|callback|finder|calc)$/.test(a.card)) { msg.card = msg.card || a.card; }
          else if (a.url && safeUrl(a.url)) { msg.actions.push({ label: String(a.label || a.url).slice(0, 60), url: a.url }); }
        } else if (ev.type === "sources") { msg.sources = (ev.sources || []).slice(0, 4); }
        else if (ev.type === "error") { throw new Error(ev.message || "error"); }
      };
      var pump = function () {
        return reader.read().then(function (r) {
          if (r.done) { return; }
          buf += dec.decode(r.value, { stream: true });
          var parts = buf.split("\n\n"); buf = parts.pop();
          parts.forEach(function (p) { p.split("\n").forEach(function (line) { if (line.indexOf("data:") === 0) { var j; try { j = JSON.parse(line.slice(5)); } catch (e) { return; } handle(j); } }); });
          return pump();
        });
      };
      return pump();
    }).then(function () {
      if (!el || !msg.text.trim()) { if (el) { el.remove(); state.msgs = state.msgs.filter(function (m) { return m !== msg; }); } throw new Error("empty"); }
      msg.done = true; save();
      fillAssistant(el, msg);
      speak(msg.text);
      setChips(followUps({ intent: msg.card || "" }));
    });
  }

  /* ------------------------------------------------------------------ voice */
  var recog = null, listening = false;
  function setupVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { return; }
    micBtn.hidden = false;
    micBtn.addEventListener("click", function () {
      if (listening && recog) { recog.stop(); return; }
      recog = new SR();
      recog.lang = pageLang === "hi" ? "hi-IN" : "en-IN";
      recog.interimResults = true; recog.maxAlternatives = 1;
      recog.onresult = function (e) { var s = ""; for (var i = 0; i < e.results.length; i++) { s += e.results[i][0].transcript; } input.value = s; if (e.results[e.results.length - 1].isFinal) { ask(s); } };
      recog.onend = function () { listening = false; micBtn.classList.remove("is-on"); micBtn.setAttribute("aria-label", T("mic")); };
      recog.onerror = recog.onend;
      listening = true; micBtn.classList.add("is-on"); micBtn.setAttribute("aria-label", T("micOn"));
      try { recog.start(); } catch (e) { listening = false; }
    });
  }
  function speak(text) {
    if (!state.speak || !("speechSynthesis" in window)) { return; }
    var plain = String(text).replace(/\*\*/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/^- /gm, "");
    var u = new SpeechSynthesisUtterance(plain);
    u.lang = replyLang === "hi" ? "hi-IN" : "en-IN";
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  /* ------------------------------------------------------------------ handoff + transcript */
  function whatsappHref() {
    var qs = state.msgs.filter(function (m) { return m.role === "user"; }).slice(-3).map(function (m) { return m.text; }).join("; ");
    var text = S[replyLang].waText + qs.slice(0, 500);
    var num = String(cfg.whatsappNumber || "").replace(/\D/g, "");
    return num.length >= 10 ? "https://wa.me/" + num + "?text=" + encodeURIComponent(text) : "contact.html#message";
  }
  function downloadTranscript() {
    var lines = state.msgs.map(function (m) { return (m.role === "user" ? "You" : "Quanta AI") + ":\n" + String(m.text).replace(/\*\*/g, "") + "\n"; });
    var blob = new Blob(["Quanta AI conversation — " + new Date().toLocaleString() + "\n" + location.href + "\n\n" + lines.join("\n")], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "quanta-ai-conversation.txt";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ------------------------------------------------------------------ open / close */
  var lastFocus = null;
  function openPanel(prompt) {
    build();
    lastFocus = document.activeElement;
    root.classList.add("is-open");
    document.documentElement.classList.add("qx-ai-open");
    document.querySelectorAll("[data-ai-open]").forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
    store("qx-ai-open", "1");
    hideNudge();
    loadKb();
    if (prompt) { ask(prompt); } else { setTimeout(function () { input.focus(); }, 50); }
  }
  function closePanel() {
    if (!root) { return; }
    root.classList.remove("is-open");
    document.documentElement.classList.remove("qx-ai-open");
    document.querySelectorAll("[data-ai-open]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    store("qx-ai-open", "0");
    if (window.speechSynthesis) { speechSynthesis.cancel(); }
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  // Header button(s) and any element with data-ai-open (optionally data-ai-prompt="question")
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-ai-open]");
    if (b) { e.preventDefault(); if (root && root.classList.contains("is-open") && !b.getAttribute("data-ai-prompt")) { closePanel(); } else { openPanel(b.getAttribute("data-ai-prompt")); } }
    var sw = e.target.closest && e.target.closest('a[href="#qx-switch-lang"]');
    if (sw) { e.preventDefault(); var ls = document.querySelector(".lang-switch, .lang-switch-inline"); if (ls) { location.href = ls.getAttribute("href"); } }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "i" || e.key === "I")) { e.preventDefault(); if (root && root.classList.contains("is-open")) { closePanel(); } else { openPanel(); } }
  });

  // Floating button for small screens (the header button is hidden there)
  var fab = document.createElement("button");
  fab.type = "button"; fab.className = "qx-ai-fab"; fab.setAttribute("data-ai-open", "");
  fab.setAttribute("aria-label", S[pageLang].open); fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = icon(I.spark, 22);
  document.body.appendChild(fab);

  // Gentle, once-per-visit hint after 20 seconds (not shown if the visitor already used the assistant)
  var nudgeEl = null;
  function hideNudge() { if (nudgeEl) { nudgeEl.remove(); nudgeEl = null; } }
  if (!stored("qx-ai-nudged") && !state.msgs.length && document.querySelector(".site-header")) {
    setTimeout(function () {
      if ((root && root.classList.contains("is-open")) || stored("qx-ai-nudged")) { return; }
      store("qx-ai-nudged", "1");
      var n = S[pageLang].nudge;
      nudgeEl = document.createElement("div");
      nudgeEl.className = "qx-ai-nudge"; nudgeEl.setAttribute("role", "status");
      nudgeEl.innerHTML = '<button type="button" class="qx-ai-nudge-open"></button><button type="button" class="qx-ai-nudge-x" aria-label="' + esc(S[pageLang].close) + '">×</button>';
      nudgeEl.querySelector(".qx-ai-nudge-open").innerHTML = icon(I.spark, 16) + "<span>" + esc(n[pageFile] || n._) + "</span>";
      nudgeEl.querySelector(".qx-ai-nudge-open").addEventListener("click", function () { openPanel(); });
      nudgeEl.querySelector(".qx-ai-nudge-x").addEventListener("click", hideNudge);
      document.body.appendChild(nudgeEl);
      setTimeout(hideNudge, 12000);
    }, 20000);
  }

  // Keep the conversation open across pages if it was open
  if (stored("qx-ai-open") === "1" && state.msgs.length && window.matchMedia("(min-width: 900px)").matches) { openPanel(); }

  window.QuantaAI = { open: openPanel, close: closePanel, ask: function (q) { openPanel(q); } };
})();
