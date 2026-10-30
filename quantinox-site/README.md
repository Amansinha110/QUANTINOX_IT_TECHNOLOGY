# Quantinox IT Technology — website

A ready-to-host marketing website for Quantinox Cloud ERP. Plain HTML, CSS and JavaScript: no build step, no framework, works on any web host.

## What's new in v7: advanced AI features

**For visitors**
- **AI Solution Advisor** (`ai-advisor.html`, also in Hindi, linked from Products › Quanta AI): the visitor describes their business in their own words and gets a tailored plan: the right package, modules to start *now / next / later* with a reason for each, matching AI agents, a phased rollout, quick wins, risks and questions for the demo. **Book a demo with this plan** opens the demo form with those modules ticked and the plan summary in the message (the lead is marked `source: ai-advisor`). Download and print buttons included.
  - With an AI key on the backend, Claude writes the plan from the visitor's words and your website text (only real packages, modules and agents; no invented prices).
  - Without a key (or with no backend at all) a rule-based plan is built in the browser, so the page always works.
- **Smarter Quanta AI search**: questions are also matched through synonyms in English and Hindi (for example *GST* also finds the tax and e-invoicing sections, *वेतन* finds *पेरोल*). Edit the list in `tools/assistant-synonyms.json`, then run `python3 tools/build-assistant-kb.py`.
- "Which modules do I need?" in Quanta AI now also offers the full AI plan.

**For your team (admin dashboard)**
- **AI lead brief** on every lead: summary, buying intent (high/medium/low) and why, which packages fit, the single best next step, talking points, questions to ask, and a **draft reply in the lead's language** (copy or open in your email app). Saved in the lead's history.
- **AI insights** page: how many questions visitors ask Quanta AI, in which language and on which pages, the most-used words, and **the questions your website could not answer** (content gaps). **Analyse with AI** groups them into themes and suggests content to add and new FAQ entries.
  Questions are stored with email addresses, phone numbers, PAN and Aadhaar-style numbers removed, and deleted after 180 days. Mention this in your privacy policy.

**Fixes in v7**
- Admin dashboard: **Sign out, Set up 2FA, Send test email, Retry (emails) and Refresh knowledge did not work** (the server refused their empty requests). Fixed.
- `assets/data/assistant-knowledge.json` was missing from the site, although `KNOWLEDGE_URL` points to it. It is now included, and `build-assistant-kb.py` also refreshes the backend's own copy (`quantinox-backend/knowledge/`).
- Single-server mode: `apiBase: "/"` now means "the backend is this website's own address". Before, the instructions said to leave it empty, which switched all forms off.

## What's new in v6: the backend is included and connected

The `quantinox-backend` folder (next to this one) is a complete server for the website. Set `apiBase` in `assets/js/config.js` to its address and everything comes alive:

- **All forms are saved and answered**: demo, contact, call back, events, trials, downloads, Quanta AI demo requests. Each lead is scored A/B/C, the visitor gets a confirmation email (English or Hindi, with the checklist PDF for downloads), and your sales inbox gets an alert. Optional Slack/Teams/Zapier/CRM webhook.
- **Newsletter** with a confirm-by-email step and one-click unsubscribe.
- **Accounts** work end to end: sign up, confirm email, log in, forgot/reset password, My account.
- **My account → Your data**: customers can download everything you hold about them, or delete their account with their password (DPDP Act / GDPR).
- **Quanta AI switches to full AI answers by itself** when the backend has an AI key; otherwise it stays the free site guide. No separate AI server needed any more.
- **Admin dashboard** at `https://api.yourdomain.com/admin`: leads pipeline with status, notes, history and one-click email/call/WhatsApp, CSV export, customers, newsletter, AI feedback, email queue with retry, audit log, team roles and two-factor sign-in.
- Tested end to end in a real browser: demo form → database → emails → admin; sign up → confirm → My account → log out → log in → reset (Hindi) → download data → delete account; Quanta AI streaming through the backend.

See `quantinox-backend/README.md` to run it on your computer in 5 minutes and to put it online.

## What's new in v5: Quanta AI website assistant (like SAP Joule)

A sparkle button in the header (or **Ctrl + I**, or the round button on phones) opens **Quanta AI**, a side-panel assistant on every page, in English and Hindi.

**What it can do**
- Answer questions about Quantinox from your own website content, with **source links** to the right page and section.
- **Summarise the page** the visitor is on, and suggest questions that fit that page.
- **Take action inside the chat**: book a demo, request a call back, recommend a package (with the modules pre-ticked on the demo form), estimate savings, open the product tour, start a trial request.
- **Hand over to a person**: WhatsApp (with the conversation summary pre-filled), call back, or the contact form.
- **Voice**: speak your question (where the browser supports it) and turn on read-aloud answers.
- Remember the conversation while the visitor moves between pages, with new chat, copy, thumbs up/down and download-conversation buttons.
- Reply in Hindi when the visitor writes in Hindi, on any page.
- Show a small one-time hint after 20 seconds ("Questions about pricing? Ask Quanta AI.").

**Two modes**
1. **Site guide** (default, free, works now): answers come from your website pages via `assets/js/assistant-kb.js`. Nothing is sent to any AI service.
2. **AI mode**: add an `ANTHROPIC_API_KEY` to the backend's `.env` (v6). Quanta AI notices and switches on by itself. (The older separate **quantinox-ai-server** still works via `assistantEndpoint`.) Answers are then written by Claude, grounded in your website text, streamed live, with the same buttons and cards. If the server is unreachable, it falls back to site-guide answers.

**After you change page text**, run `python3 tools/build-assistant-kb.py` in this folder and upload `assets/js/assistant-kb.js` and `assets/data/assistant-knowledge.json`, so the assistant knows the new text.

Demo and call-back requests from the assistant are sent like the other forms (`lead_type` `assistant_demo` or `callback`, with the visitor's last questions in `message`).

## What's new in v4: SAP-style features

New pages (each also in Hindi in `hi/`):

| File | What it does |
| --- | --- |
| `contact.html` | Contact page: teams, contact form with topic, phone/email/WhatsApp, offices, grievance officer link |
| `tour.html` | Interactive product tour: 6 clickable steps with sample screens and pulsing hotspots (hero "Take the product tour" now opens it) |
| `customers.html` | Customer story library with industry, module and text filters (6 sample cards to replace with real stories) |
| `resources.html` | Resource library with type/topic filters, plus the **ERP buyer's checklist** download behind a short form |
| `events.html` | Upcoming events, on-demand sessions and a registration form ("Register" pre-selects the event) |
| `trials.html` | Trials and demos: tour, live demo, free-trial request form, value calculator |
| `value-calculator.html` | Business value calculator: visitors enter their own numbers; the formula is shown on the page |
| `ai-advisor.html` | AI Solution Advisor (v7): a tailored ERP plan from the visitor's own description |
| `industry-manufacturing.html`, `industry-retail.html`, `industry-wholesale.html`, `industry-life-sciences.html`, `industry-professional-services.html` | Full industry pages: challenges, solutions, AI agents, processes, FAQ |
| `legal.html` | Legal notice: company details, grievance officer, trademarks |
| `accessibility.html` | Accessibility statement |
| `sitemap.html` | Every page, grouped by menu |
| `assets/docs/erp-buyers-checklist-en.pdf`, `-hi.pdf` | The 40-question checklist (English and Hindi) |

Site-wide additions:

- **Contact panel** (bottom right, replaces the WhatsApp-only button): WhatsApp chat, call-back request form, contact form, phone.
- **Newsletter signup** in the footer, plus **social media icons** that appear when you add links in `config.js`.
- **Footer legal links**: privacy, terms, legal notice, accessibility, sitemap.
- **Hindi suggestion**: visitors whose browser prefers Hindi see a small "यह पेज हिन्दी में भी उपलब्ध है" note on English pages (dismissible).
- **Optional analytics with cookie consent**: set `ga4Id` in `config.js` and visitors get an Accept/Decline banner; Google Analytics loads only after Accept. Leave it empty and no cookie banner or analytics appears.

**Where the new forms send data.** Call back, contact, event, trial, download and newsletter forms post JSON to `formEndpoint` (if set) or `apiBase + /api/leads`, with a `lead_type` field (`callback`, `contact`, `event`, `trial`, `download`, `newsletter`). Make sure your backend accepts these fields (the newsletter sends only `email` and `consent`; call back sends `first_name`, `phone`, `email`, `call_time`). Until an endpoint is set, the forms show their thank-you message but **nothing is sent**, so connect it before launch.

## What's new in v3: SAP-style menus and pages

- **Seven menus in the header**, laid out like SAP's site: **Products, Industries, Transform and support, Learning, Community, Partners, About**. Each opens a panel with columns, headings and links (hover or click on desktop, tap to expand on phones and tablets).
- **10 new pages** (each also in Hindi in `hi/`), with a section or card for every link in the menus:

  | File | Menu | What's on it |
  | --- | --- | --- |
  | `products.html` | Products | Applications, platform, AI, more offerings (Cloud ERP Private, midsize packages, sustainability, supplier network, mobile apps), all products A–Z |
  | `platform.html` | Products | Develop, integrate, data and analytics, AI models, AI agent governance, transformation management |
  | `ai.html` | Products | Quanta AI assistant, agents, agent builder, responsible AI |
  | `industries.html` | Industries | Industry AI and 30 industries in 6 groups |
  | `transform.html` | Transform and support | Ways to move to the cloud, success plans, services |
  | `support.html` | Transform and support | Get support, case priorities, knowledge base, documentation, release notes, status, maintenance |
  | `learning.html` | Learning | Learning hub, classes, certification |
  | `community.html` | Community | Forums, groups, developers, events, help, topic pages |
  | `partners.html` | Partners | Find solutions and partners, partner programs, awards, partner login |
  | `about.html` | About | Company, careers, stories, ethics, events, investors, news, trust center |

- **Site search**: the magnifier button (or the `/` key) searches every menu and footer link.
- **Event banner** on the home page (like SAP's TechEd band). It links to Community › Events.
- **Bigger footer** with Products, Solutions, Services & support and Company columns. "Pricing" is now in the top bar and the Products menu.
- Every menu link goes straight to its card, and the card is highlighted when you arrive (for example `industries.html#automotive`).

**To change a menu**: the menus are the same on every page. Edit them with find-and-replace across all files, or ask your developer to regenerate them. Keep English and Hindi in step.

**Placeholders on the new pages** (search for `[`): company facts (founding year, city, team size, customers), careers and ethics emails, support email/phone/hours, response targets, success plan details, event dates, partner portal and marketplace links, knowledge base/documentation/status page links, and certifications you actually hold. Remove the Investor relations section if the company is privately held.

## What's new in v2

- **Solutions menu**: "Solutions" in the header now opens a menu of all eight modules with icons and one-line descriptions (hover or click on desktop, tap to expand on phones).
- **Dark mode**: follows the visitor's phone or computer setting, with a sun/moon button in the header to switch. The choice is remembered. All colors are now named tokens at the top of `styles.css`, with a second set for dark mode.
- **Home page**:
  - *Build your suite*: visitors tick the areas they need, see a suggested package (Finance Essentials or Business Suite, plus add-ons), and go to the demo form with those modules already ticked.
  - *Quanta AI demo*: three example questions visitors can click; the assistant "types" a scripted answer. The answers are in `<template>` tags in `index.html`, so you can edit them.
  - *Already running an ERP?*: a migration section for companies moving from another system.
- **Motion**: cards fade in as you scroll, the hero chart bars grow on load and cards lift on hover. All of it is switched off for visitors who ask for reduced motion.
- **Linkable tabs**: every capability tab on the module pages has its own link, for example `finance.html#finance-tab-4` opens Tax & compliance.
- **SEO and sharing**: a share image for WhatsApp, LinkedIn and X (`assets/img/og-image.png`), structured data for Google (organization, breadcrumbs, FAQs), `sitemap.xml` with English/Hindi pairs, app icons and `site.webmanifest`. Login, signup and account pages are marked `noindex`.
- **Hosting files**: `404.html` (friendly not-found page), `.htaccess` (cPanel/Apache: 404 page, security headers, compression, caching) and `_headers` (Netlify / Cloudflare Pages: security headers and caching).
- **Small fixes**: the mobile menu closes after you tap an in-page link, the header gets a soft shadow once you scroll, and the "Products" link is no longer highlighted on every page.

## What's inside

| File | Page |
| --- | --- |
| `index.html` | Home |
| `finance.html` | Finance module |
| `supply-chain.html` | Supply chain module |
| `manufacturing.html` | Manufacturing module |
| `procurement.html` | Procurement module |
| `sales.html` | Sales & billing module |
| `services.html` | Projects & services module |
| `asset-management.html` | Asset management module |
| `hr.html` | People & HR module |
| `pricing.html` | Pricing (monthly / annual toggle) |
| `demo.html` | Book a demo form |
| `signup.html` | Create an account |
| `login.html` | Log in |
| `verify.html` | Opened from the "confirm your email" link |
| `forgot-password.html`, `reset-password.html` | Password reset |
| `account.html` | My account (after logging in) |
| `privacy.html`, `terms.html` | Legal pages (add your text) |
| `assets/css/styles.css` | All styling. Brand colors are at the top in `:root` |
| `assets/js/main.js` | Mobile menu, tabs, pricing toggle, forms |
| `assets/js/config.js` | **The only settings file you need to edit** |
| `assets/js/assistant.js`, `assistant-kb.js` | Quanta AI assistant and its knowledge of your site |
| `assets/js/advisor.js` | AI Solution Advisor page |
| `tools/assistant-synonyms.json` | Words visitors use → words your pages use, for Quanta AI search |
| `assets/data/assistant-knowledge.json` | The same knowledge, read by the backend for full AI answers |
| `tools/build-assistant-kb.py` | Rebuilds the assistant's knowledge after you edit pages |
| `assets/img/logo-mark.svg` | Logo mark and browser icon |
| `assets/img/og-image.png` | Image shown when a link is shared (1200 × 630) |
| `assets/img/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App and home-screen icons |
| `404.html` | Page not found |
| `sitemap.xml`, `robots.txt` | For search engines |
| `site.webmanifest` | App name and icons for phones |
| `.htaccess` | Settings for cPanel / Apache hosts (hidden file: turn on "show hidden files" when uploading) |
| `_headers` | Settings for Netlify and Cloudflare Pages |
| `hi/` | Hindi versions of every page (same file names) |

## 1. Put it online

Upload **everything in this folder** (keep the `assets` folder next to the HTML files) to your host:

- **cPanel / Hostinger / GoDaddy**: open File Manager, go to `public_html`, upload the zip and choose Extract.
- **Netlify**: drag this folder onto app.netlify.com/drop.
- **GitHub Pages / Vercel / Cloudflare Pages**: push the folder to a repository and deploy it as a static site.

`index.html` is the home page, so your domain opens it automatically.

## 2. Connect the backend (forms, accounts, AI and admin)

Forms, Sign up, Log in, password reset, My account, the newsletter and full AI answers all use the Quantinox backend (the `quantinox-backend` folder; its README explains how to run it and put it online).

1. Put the backend online on a **sub-domain of the same domain as the website**, for example `api.yourdomain.com` for a website on `www.yourdomain.com`, and set `COOKIE_DOMAIN=.yourdomain.com` in its `.env`. Login sessions only work when both share the same main domain. (Or let the backend serve this website too: `SERVE_SITE_DIR`, single-server mode.)
2. Open `assets/js/config.js` and set:
   ```js
   apiBase: "https://api.yourdomain.com",
   ```
   While testing on your computer use `"http://localhost:4000"`. If the backend serves this website itself (`SERVE_SITE_DIR`), use `"/"`.
3. Test it: send a demo request and check your sales inbox and the admin dashboard, then create an account, open the confirmation email, log in and log out.

Until `apiBase` is set, forms only show their thank-you message, the account pages show a short "not switched on yet" notice, and Quanta AI runs as the site guide.

**How accounts work:** people sign up → get a confirmation email (in English or Hindi) → click the link → their account is active and they continue to **My account**. Logging in before confirming offers to resend the link. "Forgot password?" emails a reset link that works for 1 hour; resetting signs them out everywhere else. My account shows their details, that their workspace is being prepared, and **Your data** (download a copy, delete the account). It becomes the door to your ERP product later.

Only want to collect demo requests through a form service such as Formspree? Leave `apiBase` empty and put the service URL in `formEndpoint` instead.

## 3. Turn on WhatsApp chat

Every page has a green "Chat on WhatsApp" button (bottom-right), and the demo page has a "message us on WhatsApp" link. Each one opens WhatsApp with a message already typed for that page, for example *"Hi Quantinox, I would like to know more about Quantinox Finance."* (in Hindi on the Hindi pages).

Set your WhatsApp Business number in `assets/js/config.js`, country code first, digits only:

```js
whatsappNumber: "919876543210",
```

Until a number is set, the button opens the Book a demo page instead, so nothing is ever broken.

## 4. Hindi version

Every page has a Hindi copy in the `hi/` folder (for example `hi/finance.html`). The "हिन्दी" link at the top of each English page opens the same page in Hindi, and "English" switches back. Search engines are told about both versions with `hreflang` tags.

- Product and brand names (Quantinox Cloud ERP, Quanta AI, Finance Essentials…) stay in English on purpose.
- Common business terms are written the way Indian businesses say them (इनवॉइस, डेमो, पेरोल).
- **Have a native Hindi speaker review the text before launch**, especially headlines and legal pages.
- When you change text on an English page, make the same change in its `hi/` copy.
- Replace `https://www.yourdomain.com` in every page's `<head>` with your real domain (one find-and-replace across all files).

## 5. Fill in the placeholders

Search the HTML files for `[` to find every placeholder. Replace them with real information before launch:

- **Prices**: `[PRICE]`, `[YOUR PRICE]`, and `[XX]` (annual discount, minimum users, results figures, country and language counts)
- **Contact**: `[PHONE]`, `[PHONE NUMBER]`, `[YOUR EMAIL]` (in `demo.html` and `assets/js/main.js`)
- **Customer stories** on the home page: name, photo, headline, summary. Only use real customers who have agreed to be featured.
- **FAQ answers** marked `[Describe…]`, `[List…]` or `[Explain…]` on the module and pricing pages
- **Legal**: privacy policy and terms text, plus `[DATE]`. These are required: the demo form and signup collect personal data (India's DPDP Act applies), and people agree to your terms when they create an account.

The home page's Resources cards and "Read the story" links point back to their own section for now. Change their `href` when you publish real articles and case studies.

## Changing the look

- **Brand color**: in `assets/css/styles.css`, change `--accent` (and `--accent-hover`, `--accent-tint`) at the top. Also update the `#2F54EB` fill in `assets/img/logo-mark.svg` and the inline logo in each page.
- **Fonts**: Sora (headings) and Inter (text) load from Google Fonts in each page's `<head>`.
- **Dark mode colors**: in `assets/css/styles.css`, the block under "Dark theme tokens" holds the dark values. It appears twice (once for the system setting, once for the header button); change both.
- **Share image**: replace `assets/img/og-image.png` with your own 1200 × 630 image, same file name.

## Before launch checklist

- [ ] Placeholders replaced
- [ ] `apiBase` set; demo request, signup, email confirmation, login and password reset tested
- [ ] `whatsappNumber` set and the chat button tested on a phone
- [ ] Hindi pages reviewed by a native speaker
- [ ] `https://www.yourdomain.com` replaced with your real domain in every page
- [ ] Privacy policy and terms added (in both languages)
- [ ] `https://www.yourdomain.com` also replaced in `sitemap.xml` and `robots.txt` (the same find-and-replace covers them)
- [ ] Submit `https://your-domain/sitemap.xml` in Google Search Console
- [ ] Share a page link on WhatsApp to check the preview image
- [ ] Edit the Quanta AI example answers on the home page (English and Hindi) if you want different examples
- [ ] Check the new Hindi text (menus, the 10 new pages, Build your suite, Quanta AI examples, migration section) with a native speaker
- [ ] Fill in the placeholders on the 10 new pages, or remove sections you do not offer yet (for example Investor relations or Partner awards)
- [ ] Confirm every product claim on the new pages (platform, AI, industries, success plans) matches what you actually offer
- [ ] Connect the new forms (call back, contact, events, trial, checklist download, newsletter) and test each one
- [ ] Replace the 6 sample customer stories, event dates, trial length and the `[PHONE]` / email placeholders in the contact panel
- [ ] Fill in `legal.html` (company details, CIN, GSTIN, grievance officer) with your legal advisor
- [ ] Add `[YOUR WEBSITE]` and `[YOUR EMAIL]` to the checklist PDFs (or ask your developer to regenerate them)
- [ ] Optional: set `ga4Id` and your social links in `assets/js/config.js`
- [ ] Try Quanta AI on a few pages (English and Hindi); after filling in placeholders, run `python3 tools/build-assistant-kb.py`
- [ ] Backend online, `apiBase` set, test email received, first admin created and 2FA turned on
- [ ] Optional AI mode: `ANTHROPIC_API_KEY` and `KNOWLEDGE_URL` set in the backend `.env`
- [ ] Nightly `npm run backup` scheduled on the backend server
- [ ] Try the AI Solution Advisor (English and Hindi) and book a demo from a plan
- [ ] Privacy policy mentions that assistant questions and advisor descriptions are processed by an AI provider (Anthropic) and stored anonymised for 180 days
- [ ] Test on a phone
