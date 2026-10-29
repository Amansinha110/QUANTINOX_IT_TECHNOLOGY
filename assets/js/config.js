/*
 * Site settings — edit these values, nothing else needs changing.
 * The same file is used by the English and Hindi pages.
 *
 * apiBase: the address of your Quantinox backend (no slash at the end),
 *   for example "https://api.yourdomain.com".
 *   This turns on: demo requests, Sign up, Log in, Forgot password and My account.
 *   Leave empty ("") while the backend is not online: the demo form then only shows
 *   its thank-you message, and the account pages show a "not connected" notice.
 *
 * formEndpoint: optional. Only set this to send demo requests somewhere other than
 *   the backend (for example a Formspree URL). Leave empty to use apiBase.
 *
 * whatsappNumber: your WhatsApp Business number, country code first, digits only.
 *   Example for an Indian mobile: "919876543210" (91 + 10-digit number).
 *   Leave empty ("") and the chat button opens the Book a demo page instead.
 */
window.QX_CONFIG = {
  apiBase: "",
  formEndpoint: "",
  whatsappNumber: ""
};
