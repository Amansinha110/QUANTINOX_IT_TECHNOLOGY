// Website knowledge for Quanta AI: loaded from KNOWLEDGE_URL (refreshed hourly) or KNOWLEDGE_FILE,
// searched with BM25 plus a "covers the question" factor (same method as the browser assistant).
// Each question word is also matched through its synonyms (KB.syn, from tools/assistant-synonyms.json),
// e.g. "GST" also finds passages about "tax" and "compliance", "वेतन" also finds "पेरोल".
import fs from 'node:fs';
import path from 'node:path';

const STOP = new Set(('a an and are as at be by can do does for from has have how i in is it its me my of on or our the this to we what when where which who why will with you your about tell show give need want quantinox handle handles work works offer offers provide provides available possible ' +
  'का की के है हैं में से को और या क्या कैसे कौन कौन-से मुझे मेरे हम आप यह वह पर भी तो एक लिए करें करता करती होता होती बताएँ बताइए').split(' '));
export function tokens(s) {
  const m = String(s).toLowerCase().replace(/[-–/]/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) || [];
  return m.filter((w) => w.length > 1 && !STOP.has(w)).map((w) => (/^[a-z0-9]+$/.test(w) && w.length > 6 ? w.slice(0, 6) : w));
}

export function createKnowledge(config, log) {
  let KB = { pages: [], chunks: [] }, INDEX = { docs: [], df: {}, avg: 1, n: 0 }, pageFiles = new Set(), loadedAt = null, SYN = {};

  function load(data) {
    KB = data;
    const docs = KB.chunks.map((c) => { const tf = {}; const tk = tokens(`${c.t} ${c.t} ${c.pt} ${c.x}`); tk.forEach((w) => { tf[w] = (tf[w] || 0) + 1; }); return { c, tf, len: tk.length }; });
    const df = {}; let total = 0;
    docs.forEach((d) => { total += d.len; Object.keys(d.tf).forEach((w) => { df[w] = (df[w] || 0) + 1; }); });
    INDEX = { docs, df, avg: total / Math.max(1, docs.length), n: docs.length };
    pageFiles = new Set(KB.pages.map((p) => p.p));
    SYN = buildSynonyms(KB.syn || {});
    loadedAt = new Date().toISOString();
    log.info({ pages: KB.pages.length, passages: KB.chunks.length }, 'assistant knowledge loaded');
  }
  function loadFile() {
    try { load(JSON.parse(fs.readFileSync(config.KNOWLEDGE_FILE, 'utf8'))); return true; } catch (e) { log.warn({ file: config.KNOWLEDGE_FILE, err: e.message }, 'no local assistant knowledge yet'); return false; }
  }
  async function refresh() {
    if (!config.KNOWLEDGE_URL) return loadFile();
    try {
      const r = await fetch(config.KNOWLEDGE_URL, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data?.chunks)) throw new Error('unexpected format');
      load(data);
      fs.mkdirSync(path.dirname(config.KNOWLEDGE_FILE), { recursive: true });
      fs.writeFileSync(config.KNOWLEDGE_FILE, JSON.stringify(data));
      return true;
    } catch (e) { log.error({ err: e.message }, 'could not download assistant knowledge'); return KB.chunks.length > 0 || loadFile(); }
  }
  function search(q, lang, limit, page) {
    const groups = expand(q, SYN);
    if (!groups.length) return [];
    const res = [];
    const bm25 = (d, w) => {
      const f = d.tf[w]; if (!f) return 0;
      const idf = Math.log(1 + (INDEX.n - INDEX.df[w] + 0.5) / (INDEX.df[w] + 0.5));
      return idf * (f * 2.4) / (f + 1.4 * (0.25 + 0.75 * d.len / INDEX.avg));
    };
    for (const d of INDEX.docs) {
      if (lang && d.c.l !== lang) continue;
      let score = 0, hit = 0;
      for (const g of groups) {
        // the word itself counts fully, a synonym counts a little less
        const own = bm25(d, g.w);
        let best = own;
        for (const a of g.alts) best = Math.max(best, 0.45 * bm25(d, a));
        if (best) { hit += own ? 1 : 0.5; score += best; }
      }
      if (!score) continue;
      score *= 0.35 + hit / groups.length;
      if (page && d.c.p === page) score *= 1.15;
      res.push({ c: d.c, s: score });
    }
    return res.sort((a, b) => b.s - a.s).slice(0, limit);
  }
  const onPage = (file, lang, n) => INDEX.docs.filter((d) => d.c.p === file && d.c.l === lang).slice(0, n).map((d) => d.c);
  return { refresh, loadFile, search, onPage, synonyms: () => SYN, hasPage: (f) => pageFiles.has(f), stats: () => ({ pages: KB.pages.length, passages: KB.chunks.length, loadedAt }) };
}

// { "gst": ["tax", "invoice"] } -> { gst: ["tax", "invoic"] } in the same token form as the index
export function buildSynonyms(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (k.startsWith('_') || !Array.isArray(v)) continue;
    const key = tokens(k)[0]; if (!key) continue;
    const alts = new Set(out[key] || []);
    for (const t of tokens(v.join(' '))) if (t !== key) alts.add(t);
    out[key] = [...alts];
  }
  return out;
}
// Question -> word groups: each word with its synonyms
export function expand(q, syn) {
  return [...new Set(tokens(q))].map((w) => ({ w, alts: syn[w] || [] }));
}
