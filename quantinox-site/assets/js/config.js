/*
 * Site settings — edit these values, nothing else needs changing.
 * The same file is used by the English and Hindi pages.
 *
 * apiBase: the address of your Quantinox backend (the quantinox-backend folder), no slash at the end.
 *   Examples: "https://api.yourdomain.com" when it runs on its own subdomain,
 *             "http://localhost:4000" while testing on your computer,
 *             "/" when the backend serves this website itself (single-server mode, SERVE_SITE_DIR).
 *   This turns on: every form (demo, contact, call back, events, trials, downloads, newsletter),
 *   Sign up, Log in, Forgot password, My account (with data download and account deletion),
 *   full AI answers in Quanta AI, AI plans in the Solution Advisor (ai-advisor.html) and the
 *   AI insights in the admin dashboard, when the backend has an ANTHROPIC_API_KEY.
 *   Leave empty ("") while the backend is not online: the demo form then only shows
 *   its thank-you message, and the account pages show a "not connected" notice.
 *
 * formEndpoint: optional. Only set this to send demo requests somewhere other than
 *   the backend (for example a Formspree URL). Leave empty to use apiBase.
 *
 * assistantEndpoint: leave empty. Quanta AI asks the backend (apiBase) whether AI answers are on,
 *   and otherwise works as a free "site guide" that answers from this website's own pages.
 *   Only set this if you run the older stand-alone Quanta AI server on a different address.
 *
 * ga4Id: optional Google Analytics 4 ID, e.g. "G-ABC123XYZ". When set, visitors see a cookie
 *   banner and analytics only loads after they click Accept. Leave empty for no analytics.
 *
 * social: optional links to your social media pages (full https:// address). Icons only
 *   appear in the footer for the ones you fill in.
 *
 * whatsappNumber: your WhatsApp Business number, country code first, digits only.
 *   Example for an Indian mobile: "919876543210" (91 + 10-digit number).
 *   Leave empty ("") and the chat button opens the Book a demo page instead.
 */
window.QX_CONFIG = {
  apiBase: "",
  formEndpoint: "",
  whatsappNumber: "",
  assistantEndpoint: "",
  ga4Id: "",
  social: {
    linkedin: "",
    x: "",
    youtube: "",
    instagram: "",
    facebook: ""
  }
};
