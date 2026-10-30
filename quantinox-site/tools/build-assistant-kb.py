"""Builds the Quanta AI knowledge index from the website pages (English + Hindi).
Outputs:
  assets/js/assistant-kb.js           -> window.QX_KB = {...}  (loaded by the browser widget)
  assets/data/assistant-knowledge.json  -> public copy the AI server can load with KNOWLEDGE_URL
  ../quantinox-backend/knowledge/assistant-knowledge.json  -> local copy for the backend, if it sits next to the site
  ../quantinox-ai-server/assistant-knowledge.json  -> local copy, if the older AI server folder sits next to the site
Synonyms in tools/assistant-synonyms.json are embedded too, so "GST" also finds the tax section.
"""
import os, re, json, glob
from html.parser import HTMLParser

# Run from anywhere: python3 tools/build-assistant-kb.py  (the site folder is the parent of tools/)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_PAGES = {'login.html', 'signup.html', 'verify.html', 'forgot-password.html', 'reset-password.html', 'account.html', '404.html'}
SKIP_TAGS = {'script', 'style', 'template', 'svg', 'form', 'select', 'option', 'label', 'button', 'nav', 'noscript'}
SKIP_CLASSES = ('eyebrow', 'btn', 'link-arrow', 'pill', 'badge-sample', 'card-tag', 'kind', 'mock', 'chat', 'tour-screen', 'filter-bar', 'filter-count', 'filter-empty', 'success', 'calc-results', 'kpi', 'hotspot', 'sample-note', 'toc')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
TEXT_TAGS = {'p', 'li', 'td', 'th', 'dd', 'dt', 'summary', 'span', 'strong', 'small', 'a', 'div', 'h3', 'h4'}

class Extract(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_main = False
        self.stack = []          # (tag, skipping, id)
        self.skip = 0
        self.anchor = ''
        self.h2 = ''
        self.chunks = []
        self.cur = None
        self.capture_head = None
        self.head_buf = ''

    def start_chunk(self, title):
        self.flush()
        self.cur = {'title': title, 'anchor': self.anchor, 'text': []}

    def flush(self):
        if self.cur and ''.join(self.cur['text']).strip():
            self.chunks.append(self.cur)
        self.cur = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'main':
            self.in_main = True
            self.start_chunk('')
            return
        if not self.in_main or tag in VOID:
            return
        cls = a.get('class', '') or ''
        skipping = tag in SKIP_TAGS or a.get('role') == 'img' or a.get('hidden') is not None and tag != 'div' \
            or any(c in cls.split() or any(part.startswith(c) for part in cls.split()) for c in SKIP_CLASSES) or 'aria-hidden' in a
        self.stack.append((tag, skipping, a.get('id') or ''))
        if skipping:
            self.skip += 1
            return
        if self.skip:
            return
        self.anchor = next((i for _, _, i in reversed(self.stack) if i), '')
        if tag in ('h1', 'h2', 'h3'):
            self.capture_head = tag
            self.head_buf = ''
        if tag in ('p', 'li', 'td', 'dd', 'summary', 'br') and self.cur:
            self.cur['text'].append(' ')

    def handle_endtag(self, tag):
        if tag == 'main':
            self.flush(); self.in_main = False; return
        if not self.in_main or tag in VOID:
            return
        # pop to matching tag
        while self.stack:
            t, sk, _ = self.stack.pop()
            if sk:
                self.skip -= 1
            if t == tag:
                break
        self.anchor = next((i for _, _, i in reversed(self.stack) if i), '')
        if self.capture_head == tag and not self.skip:
            head = re.sub(r'\s+', ' ', self.head_buf).strip()
            self.capture_head = None
            if tag == 'h1':
                self.start_chunk(head)
            elif tag == 'h2':
                self.h2 = head
                self.start_chunk(head)
            else:
                self.start_chunk((self.h2 + ' › ' if self.h2 else '') + head)
        if tag in ('p', 'li', 'td', 'th', 'dd', 'dt', 'summary') and self.cur:
            self.cur['text'].append('. ' if tag in ('li', 'td', 'th', 'dt', 'summary') else ' ')

    def handle_data(self, data):
        if not self.in_main or self.skip:
            return
        if self.capture_head:
            self.head_buf += data
            return
        if self.cur is not None:
            self.cur['text'].append(data)

def clean(t):
    t = re.sub(r'\[[^\]]{1,160}\]', ' ', t)   # drop [placeholders] until real text is added
    t = re.sub(r'\s+', ' ', t)
    t = re.sub(r'(^|[.:])\s*[,·]\s*', r'\1 ', t)
    t = re.sub(r'\s*\.\s*(\.\s*)+', '. ', t)
    t = re.sub(r'\s+([.,;:])', r'\1', t)
    t = t.replace('→', '').strip(' .')
    return t.strip()

def page_title(html):
    m = re.search(r'<title>(.*?)</title>', html, re.S)
    t = re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
    return t.split(' | ')[0]

def build():
    chunks = []
    pages = []
    for path in sorted(glob.glob(ROOT + '/*.html') + glob.glob(ROOT + '/hi/*.html')):
        name = os.path.basename(path)
        if name in SKIP_PAGES:
            continue
        lang = 'hi' if '/hi/' in path else 'en'
        html = open(path, encoding='utf-8').read()
        ex = Extract(); ex.feed(html); ex.flush()
        ptitle = page_title(html)
        pages.append({'p': name, 'l': lang, 't': ptitle})
        for c in ex.chunks:
            text = clean(''.join(c['text']))
            if len(text) < 25:
                continue
            title = c['title'] or ptitle
            url = name + ('#' + c['anchor'] if c['anchor'] and c['anchor'] != 'main' else '')
            # split long chunks on sentence boundaries
            parts, buf = [], ''
            for sent in re.split(r'(?<=[.!?।])\s+', text):
                if len(buf) + len(sent) > 700 and buf:
                    parts.append(buf); buf = ''
                buf += (' ' if buf else '') + sent
            if buf:
                parts.append(buf)
            for ptxt in parts:
                chunks.append({'u': url, 'p': name, 'l': lang, 'pt': ptitle, 't': title, 'x': ptxt})
    syn_file = os.path.join(ROOT, 'tools', 'assistant-synonyms.json')
    syn = {}
    if os.path.exists(syn_file):
        syn = {k: v for k, v in json.load(open(syn_file, encoding='utf-8')).items() if not k.startswith('_')}
    kb = {'v': 2, 'pages': pages, 'chunks': chunks, 'syn': syn}
    js = '/* Generated from the website pages: rebuild when page text changes. */\nwindow.QX_KB = ' + json.dumps(kb, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(ROOT + '/assets/js/assistant-kb.js', 'w', encoding='utf-8').write(js)
    data = json.dumps(kb, ensure_ascii=False, separators=(',', ':'))
    os.makedirs(ROOT + '/assets/data', exist_ok=True)
    open(ROOT + '/assets/data/assistant-knowledge.json', 'w', encoding='utf-8').write(data)   # public copy the AI server can download
    parent = os.path.dirname(ROOT)
    for folder, name in (('quantinox-backend/knowledge', 'assistant-knowledge.json'), ('quantinox-ai-server', 'assistant-knowledge.json')):
        d = os.path.join(parent, folder)
        if os.path.isdir(d):                                                                   # local copies for the servers, if they sit next to the site
            open(os.path.join(d, name), 'w', encoding='utf-8').write(data)
            print('updated', os.path.join(folder, name))
    print('pages', len(pages), 'chunks', len(chunks), 'synonyms', len(syn), 'kb.js bytes', len(js.encode()))

if __name__ == '__main__':
    build()
