// Email templates in English and Hindi. Every email has an HTML and a plain-text version.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout({ lang, preheader, title, paragraphs, button, footer, rows }) {
  const font = lang === 'hi' ? "'Noto Sans Devanagari', Arial, sans-serif" : 'Inter, Arial, Helvetica, sans-serif';
  const ps = paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3A4256">${p}</p>`).join('');
  const btn = button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;background:#2F54EB;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${esc(button.label)}</a></p><p style="margin:0 0 14px;font-size:12px;color:#5B6478;word-break:break-all">${esc(button.url)}</p>` : '';
  const table = rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 18px">${rows.map(([k, v]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #E3E7EF;font-size:13px;color:#5B6478;width:34%;vertical-align:top">${esc(k)}</td><td style="padding:8px 10px;border-bottom:1px solid #E3E7EF;font-size:14px;color:#0B1020">${esc(v)}</td></tr>`).join('')}</table>` : '';
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F5F7FB;font-family:${font}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FB;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E3E7EF;border-radius:16px">
<tr><td style="padding:22px 28px;border-bottom:1px solid #E3E7EF"><span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:#2F54EB;color:#fff;text-align:center;line-height:28px;font-weight:700;font-family:Arial">Q</span>
<strong style="font-size:16px;letter-spacing:.06em;color:#0B1020;vertical-align:middle;margin-left:8px">QUANTINOX</strong></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0B1020">${esc(title)}</h1>${ps}${table}${btn}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #E3E7EF;font-size:12px;line-height:1.5;color:#5B6478">${footer}</td></tr>
</table></td></tr></table></body></html>`;
  const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const text = [title, '', ...paragraphs.map(strip), ...(rows ? rows.map(([k, v]) => `${k}: ${v}`) : []), button ? `\n${button.label}: ${button.url}` : '', '', strip(footer)].join('\n');
  return { html, text };
}

const FOOT = {
  en: (site) => `Quantinox IT Technology · <a href="${esc(site)}" style="color:#2F54EB">${esc(site.replace(/^https?:\/\//, ''))}</a><br>You received this email because of a request made on our website. If it wasn’t you, you can ignore it.`,
  hi: (site) => `Quantinox IT Technology · <a href="${esc(site)}" style="color:#2F54EB">${esc(site.replace(/^https?:\/\//, ''))}</a><br>यह ईमेल हमारी वेबसाइट पर किए गए अनुरोध की वजह से भेजा गया है। अगर यह अनुरोध आपने नहीं किया, तो इसे अनदेखा करें।`,
};

const LEAD_COPY = {
  demo: { en: ['We’ve received your demo request', 'A Quantinox product expert will email you within one business day to schedule your demo.'], hi: ['आपका डेमो अनुरोध मिल गया है', 'Quantinox प्रोडक्ट विशेषज्ञ एक कार्यदिवस के भीतर डेमो का समय तय करने के लिए ईमेल करेंगे।'] },
  assistant_demo: { en: ['We’ve received your demo request', 'A Quantinox product expert will email you within one business day to schedule your demo.'], hi: ['आपका डेमो अनुरोध मिल गया है', 'Quantinox प्रोडक्ट विशेषज्ञ एक कार्यदिवस के भीतर डेमो का समय तय करने के लिए ईमेल करेंगे।'] },
  callback: { en: ['We’ll call you back', 'Thanks! A member of our team will call you at the time you chose.'], hi: ['हम आपको कॉल करेंगे', 'धन्यवाद! हमारी टीम का सदस्य आपके चुने समय पर कॉल करेगा।'] },
  contact: { en: ['We’ve received your message', 'Thanks for writing to us. The right team will reply within one business day.'], hi: ['आपका संदेश मिल गया है', 'हमें लिखने के लिए धन्यवाद। सही टीम एक कार्यदिवस के भीतर जवाब देगी।'] },
  event: { en: ['You’re registered', 'Thanks for registering. We will email the joining details before the event.'], hi: ['आपका रजिस्ट्रेशन हो गया', 'रजिस्टर करने के लिए धन्यवाद। इवेंट से पहले हम जुड़ने की जानकारी ईमेल करेंगे।'] },
  trial: { en: ['Your trial request is in', 'We set up each trial by hand and will email your login within one business day.'], hi: ['आपका ट्रायल अनुरोध मिल गया', 'हम हर ट्रायल खुद तैयार करते हैं और एक कार्यदिवस के भीतर लॉगिन ईमेल करेंगे।'] },
  download: { en: ['Your ERP buyer’s checklist', 'Thanks for your interest. Here is your copy of the checklist.'], hi: ['आपकी ERP चेकलिस्ट', 'आपकी रुचि के लिए धन्यवाद। यह रही आपकी चेकलिस्ट।'] },
};
const TYPE_LABEL = { demo: 'Demo request', assistant_demo: 'Demo request (Quanta AI)', callback: 'Call-back request', contact: 'Contact message', event: 'Event registration', trial: 'Trial request', download: 'Checklist download' };

export function buildEmail(kind, lang, d, cfg) {
  const L = lang === 'hi' ? 'hi' : 'en';
  const site = cfg.SITE_URL;
  const help = cfg.SUPPORT_EMAIL ? (L === 'hi' ? ` सवाल हैं? <a href="mailto:${esc(cfg.SUPPORT_EMAIL)}" style="color:#2F54EB">${esc(cfg.SUPPORT_EMAIL)}</a> पर लिखें।` : ` Questions? Write to <a href="mailto:${esc(cfg.SUPPORT_EMAIL)}" style="color:#2F54EB">${esc(cfg.SUPPORT_EMAIL)}</a>.`) : '';
  const foot = FOOT[L](site) + help;
  const hiPath = L === 'hi' ? '/hi' : '';
  const name = esc(d.firstName || '');
  switch (kind) {
    case 'verify': {
      const url = `${site}${hiPath}/verify.html?token=${d.token}`;
      return L === 'hi'
        ? { subject: 'Quantinox के लिए अपना ईमेल कन्फ़र्म करें', ...layout({ lang: L, title: `नमस्ते ${name}, अपना ईमेल कन्फ़र्म करें`, paragraphs: ['आपका Quantinox खाता लगभग तैयार है। इसे चालू करने के लिए नीचे दिए बटन पर क्लिक करें। यह लिंक 24 घंटे तक काम करेगा।'], button: { label: 'ईमेल कन्फ़र्म करें', url }, footer: foot }) }
        : { subject: 'Confirm your email for Quantinox', ...layout({ lang: L, title: `Hi ${name}, please confirm your email`, paragraphs: ['Your Quantinox account is almost ready. Click the button below to activate it. The link works for 24 hours.'], button: { label: 'Confirm email', url }, footer: foot }) };
    }
    case 'signup_exists': {
      const url = `${site}${hiPath}/login.html`;
      return L === 'hi'
        ? { subject: 'आपका Quantinox खाता पहले से है', ...layout({ lang: L, title: 'आपका खाता पहले से मौजूद है', paragraphs: ['किसी ने इस ईमेल से नया Quantinox खाता बनाने की कोशिश की, लेकिन इस ईमेल का खाता पहले से है। आप लॉग इन कर सकते हैं, या पासवर्ड भूल गए हों तो रीसेट करें।'], button: { label: 'लॉग इन करें', url }, footer: foot }) }
        : { subject: 'You already have a Quantinox account', ...layout({ lang: L, title: 'You already have an account', paragraphs: ['Someone tried to create a new Quantinox account with this email, but an account already exists. You can log in, or reset your password if you’ve forgotten it.'], button: { label: 'Log in', url }, footer: foot }) };
    }
    case 'reset': {
      const url = `${site}${hiPath}/reset-password.html?token=${d.token}`;
      return L === 'hi'
        ? { subject: 'अपना Quantinox पासवर्ड रीसेट करें', ...layout({ lang: L, title: 'पासवर्ड रीसेट करें', paragraphs: [`नमस्ते ${name}, नया पासवर्ड चुनने के लिए नीचे क्लिक करें। यह लिंक 1 घंटे तक काम करेगा।`, 'अगर आपने यह अनुरोध नहीं किया, तो इस ईमेल को अनदेखा करें; आपका पासवर्ड नहीं बदलेगा।'], button: { label: 'नया पासवर्ड चुनें', url }, footer: foot }) }
        : { subject: 'Reset your Quantinox password', ...layout({ lang: L, title: 'Reset your password', paragraphs: [`Hi ${name}, click below to choose a new password. The link works for 1 hour.`, 'If you didn’t ask for this, ignore this email and your password will not change.'], button: { label: 'Choose a new password', url }, footer: foot }) };
    }
    case 'password_changed':
      return L === 'hi'
        ? { subject: 'आपका Quantinox पासवर्ड बदल दिया गया', ...layout({ lang: L, title: 'पासवर्ड बदल दिया गया', paragraphs: [`नमस्ते ${name}, आपका पासवर्ड अभी बदला गया और दूसरे सभी डिवाइस से लॉग आउट कर दिया गया।`, 'अगर यह आपने नहीं किया, तो तुरंत हमसे संपर्क करें।'], footer: foot }) }
        : { subject: 'Your Quantinox password was changed', ...layout({ lang: L, title: 'Your password was changed', paragraphs: [`Hi ${name}, your password was just changed and every other device was signed out.`, 'If this wasn’t you, contact us right away.'], footer: foot }) };
    case 'account_deleted':
      return L === 'hi'
        ? { subject: 'आपका Quantinox खाता हटा दिया गया', ...layout({ lang: L, title: 'खाता हटा दिया गया', paragraphs: [`नमस्ते ${name}, आपके अनुरोध पर आपका खाता और उससे जुड़ा निजी डेटा हटा दिया गया है।`], footer: foot }) }
        : { subject: 'Your Quantinox account was deleted', ...layout({ lang: L, title: 'Your account was deleted', paragraphs: [`Hi ${name}, as you asked, your account and the personal data linked to it have been deleted.`], footer: foot }) };
    case 'newsletter_confirm': {
      const url = `${cfg.PUBLIC_URL}/api/newsletter/confirm?token=${d.token}`;
      return L === 'hi'
        ? { subject: 'Quantinox न्यूज़लेटर की पुष्टि करें', ...layout({ lang: L, title: 'बस एक कदम और', paragraphs: ['प्रोडक्ट समाचार और इवेंट निमंत्रण पाने के लिए अपना सब्सक्रिप्शन कन्फ़र्म करें।'], button: { label: 'सब्सक्रिप्शन कन्फ़र्म करें', url }, footer: foot }) }
        : { subject: 'Confirm your Quantinox newsletter subscription', ...layout({ lang: L, title: 'One more step', paragraphs: ['Confirm your subscription to receive product news and event invitations.'], button: { label: 'Confirm subscription', url }, footer: foot }) };
    }
    case 'lead_confirm': {
      const [title, body] = (LEAD_COPY[d.type] || LEAD_COPY.contact)[L];
      const extra = [];
      let button = null;
      if (d.type === 'download') button = { label: L === 'hi' ? 'PDF डाउनलोड करें' : 'Download the PDF', url: `${site}/assets/docs/erp-buyers-checklist-${L}.pdf` };
      if (d.type === 'event' && d.event) extra.push(L === 'hi' ? `इवेंट: ${esc(d.event)}` : `Event: ${esc(d.event)}`);
      if (d.type === 'callback' && d.callTime) extra.push(L === 'hi' ? `कॉल का समय: ${esc(d.callTime)}` : `Call time: ${esc(d.callTime)}`);
      return { subject: title, ...layout({ lang: L, title: `${L === 'hi' ? 'नमस्ते' : 'Hi'} ${name || ''}`.trim() + (L === 'hi' ? ',' : ','), paragraphs: [`<strong>${esc(title)}.</strong> ${esc(body)}`, ...extra], button, footer: foot }) };
    }
    case 'sales_lead': {
      const l = d.lead;
      const rows = [
        ['Type', TYPE_LABEL[l.type] || l.type], ['Score', `${l.score} (grade ${l.grade})`], ['Name', `${l.first_name || ''} ${l.last_name || ''}`.trim()],
        ['Email', l.email], ['Phone', l.phone || '—'], ['Company', l.company || '—'], ['Country', l.country || '—'], ['Company size', l.company_size || '—'],
        ['Modules', JSON.parse(l.modules || '[]').join(', ') || '—'], ['Message', l.message || '—'],
        ...Object.entries(JSON.parse(l.details || '{}')).map(([k, v]) => [k.replace(/_/g, ' '), String(v)]),
        ['Language', l.lang], ['Page', l.page || '—'],
      ];
      return { subject: `New ${TYPE_LABEL[l.type] || l.type}: ${l.company || l.email} (grade ${l.grade})`, replyTo: l.email,
        ...layout({ lang: 'en', title: `New lead: ${l.first_name || ''} ${l.last_name || ''}`.trim(), paragraphs: [`A new <strong>${esc(TYPE_LABEL[l.type] || l.type)}</strong> just came in from the website.`], rows, button: { label: 'Open in the admin dashboard', url: `${cfg.PUBLIC_URL}/admin/#/leads/${l.id}` }, footer: 'Sent by the Quantinox backend. Reply to this email to answer the lead directly.' }) };
    }
    default: throw new Error(`Unknown email: ${kind}`);
  }
}
