// Lead scoring: a simple, explainable 0–100 score so sales can call the best leads first.
const SIZE = { '1–50 employees': 8, '51–250 employees': 18, '251–1,000 employees': 26, '1,000+ employees': 32 };
const TYPE = { demo: 22, assistant_demo: 22, trial: 22, callback: 18, contact: 10, event: 6, download: 6 };
const FREE_MAIL = /@(gmail|yahoo|ymail|hotmail|outlook|live|rediffmail|rediff|aol|icloud|proton|protonmail|zoho)\./i;

export function scoreLead(l) {
  const reasons = [];
  let s = TYPE[l.type] ?? 5; reasons.push(`${l.type} +${s}`);
  if (SIZE[l.company_size]) { s += SIZE[l.company_size]; reasons.push(`size +${SIZE[l.company_size]}`); }
  const mods = Math.min(5, (l.modules || []).length) * 4; if (mods) { s += mods; reasons.push(`modules +${mods}`); }
  if (l.email && !FREE_MAIL.test(l.email)) { s += 12; reasons.push('work email +12'); }
  if (l.phone) { s += 6; reasons.push('phone +6'); }
  if (l.company) { s += 4; reasons.push('company +4'); }
  if (l.message && l.message.length > 40) { s += 4; reasons.push('detailed message +4'); }
  s = Math.max(0, Math.min(100, s));
  const grade = s >= 65 ? 'A' : s >= 40 ? 'B' : 'C';
  return { score: s, grade, reasons };
}
