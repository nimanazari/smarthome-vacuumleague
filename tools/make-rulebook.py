# -*- coding: utf-8 -*-
"""
tools/make-rulebook.py — rebuild the OFFICIAL RULEBOOK, both languages,
both formats, from the HTML that *is* the rulebook.

    python tools/make-rulebook.py            # fa + en, pdf + docx
    python tools/make-rulebook.py fa         # one language
    python tools/make-rulebook.py --site     # ...and copy onto the website

Output, next to the repo in SmartHome-Handouts/:
    SmartHomeLeague-Rulebook-FA.pdf   .docx
    SmartHomeLeague-Rulebook-EN.pdf   .docx

Why a tool and not a person with Ctrl+P: the seven figures are DRAWN by the
page as it loads — three.js renders the real house from the real map — so
there are no picture files to copy, and a hand-made PDF goes stale the moment
a rule or a map changes. This serves the rulebook, lets a headless browser
draw it, takes the text and the figures back out of the browser that drew
them, prints the PDF from the same page, and hands text + figures to
tools/rulebook-docx.js for the Word edition. One command, four files, never a
version behind the rules they state.

How the results come back: the browser runs with --dump-dom and everything is
read out of that one dump — the figures as the data: URLs the page put on its
own <img>s, the text as a JSON blob the injected script leaves in the
document. An earlier version had the page POST its results here instead, and
lost the race: --virtual-time-budget is what makes a headless browser actually
draw, and it ends the browser the moment the page goes idle, cutting the
uploads off mid-flight. The DOM is already there when the dump is taken, so
there is no race left to lose.

فارسی: کتابچه‌ی رسمی را از روی خودِ HTML می‌سازد — PDF و Word، فارسی و
انگلیسی — با تصویرهایی که مرورگر همان لحظه از نقشه‌ی واقعی رندر کرده است.
"""
import base64
import html
import http.server
import io
import json
import os
import re
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.dirname(ROOT)
OUT_DIR = os.path.join(DOCS, 'SmartHome-Handouts')
SITE_DL = os.path.join(DOCS, 'schedule', 'schedule', 'public', 'downloads')
BUILD = os.path.join(tempfile.gettempdir(), 'shl-rulebook-build')

LANGS = {
    'fa': {'page': 'rulebook.html',    'out': 'SmartHomeLeague-Rulebook-FA'},
    'en': {'page': 'rulebook-en.html', 'out': 'SmartHomeLeague-Rulebook-EN'},
}

BROWSERS = [
    r'%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe',
    r'%ProgramFiles%\Microsoft\Edge\Application\msedge.exe',
    r'%LocalAppData%\Microsoft\Edge\Application\msedge.exe',
    r'%ProgramFiles%\Google\Chrome\Application\chrome.exe',
    r'%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe',
]

def find_browser():
    for c in BROWSERS:
        p = os.path.expandvars(c)
        if os.path.isfile(p):
            return p
    sys.exit('no Edge or Chrome found — the rulebook needs one to draw its figures')

# ---------------------------------------------------------------- the extractor
# Injected at the end of the page, after the script that draws the figures. It
# walks the rulebook in document order and leaves the result in the document as
# JSON, for --dump-dom to carry out. It decides nothing about what the rules
# SAY: it only carries the page across, so the Word file, the PDF and the web
# page can never disagree.
EXTRACT_JS = r'''
(function () {
  // ---- inline text, keeping the two marks the rulebook uses: bold and code ----
  const runs = (el) => {
    const out = [];
    (function walk(node, b, c) {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          const t = n.textContent.replace(/\s+/g, ' ');
          if (t) out.push({ t: t, b: b || undefined, c: c || undefined });
        } else if (n.nodeType === 1) {
          const tag = n.tagName.toLowerCase();
          if (tag === 'br') { out.push({ t: ' ' }); return; }
          walk(n, b || tag === 'b' || tag === 'strong', c || tag === 'code');
        }
      });
    })(el, false, false);
    const merged = [];                    // glue neighbours that carry the same marks
    out.forEach((r) => {
      const last = merged[merged.length - 1];
      if (last && !!last.b === !!r.b && !!last.c === !!r.c) last.t += r.t;
      else merged.push(Object.assign({}, r));
    });
    if (merged.length) {
      merged[0].t = merged[0].t.replace(/^\s+/, '');
      merged[merged.length - 1].t = merged[merged.length - 1].t.replace(/\s+$/, '');
    }
    return merged.filter((r) => r.t !== '');
  };

  const blocks = [];
  const push = (b) => { if (b) blocks.push(b); };

  const table = (el) => ({
    k: 'table',
    rows: Array.from(el.rows).map((tr) => ({
      head: tr.cells.length > 0 && tr.cells[0].tagName.toLowerCase() === 'th',
      c: Array.from(tr.cells).map(runs),
    })),
  });

  const list = (el) => ({
    k: 'list',
    ordered: el.tagName.toLowerCase() === 'ol',
    items: Array.from(el.children).map(runs),
  });

  const one = (el) => {
    const tag = el.tagName.toLowerCase();
    const cls = el.className || '';
    if (cls === 'printbtn' || cls === 'langbtn') return;
    if (tag === 'h1') return push({ k: 'title', r: runs(el) });
    if (tag === 'h2') return push({ k: 'h1', r: runs(el) });
    if (tag === 'h3' || tag === 'h4') return push({ k: 'h2', r: runs(el) });
    if (tag === 'p') return push({ k: 'p', r: runs(el) });
    if (tag === 'ul' || tag === 'ol') return push(list(el));
    if (tag === 'table') return push(table(el));
    // a figure is referenced by id; the picture itself rides out in the img's src
    if (tag === 'img' && el.id) return push({ k: 'figure', id: el.id });
    if (tag === 'div' || tag === 'span') {
      if (cls === 'sub' || cls === 'ver') return push({ k: 'subtitle', r: runs(el) });
      if (cls === 'auth') return push({ k: 'author', r: runs(el) });
      if (cls === 'cap') return push({ k: 'caption', r: runs(el) });
      if (cls === 'note') return push({ k: 'note', r: runs(el) });
      if (cls === 'formula') return push({ k: 'formula', r: runs(el) });
      if (cls === 'cover') return Array.from(el.children).forEach(one);
    }
  };

  Array.from(document.querySelector('.page').children).forEach(one);

  const out = document.createElement('pre');
  out.id = '__rb_blocks';
  out.textContent = JSON.stringify(blocks);
  document.body.appendChild(out);
})();
'''

# ---------------------------------------------------------------- the server
class Handler(http.server.SimpleHTTPRequestHandler):
    """The repo, served as it is — plus the one route that injects the extractor."""

    def translate_path(self, path):
        rel = urllib.parse.urlparse(path).path.lstrip('/')
        return os.path.join(ROOT, urllib.parse.unquote(rel).replace('/', os.sep))

    def log_message(self, *a):
        pass

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        # The injected copy is served AT THE RULEBOOK'S OWN PATH, with a query
        # flag. It has to be: the page loads three.js, the maps and the engine
        # by relative path, so a page handed out at /__rb/page would resolve
        # every one of them one directory too deep, get nothing, and quietly
        # hide all seven figures instead of drawing them.
        if u.query and 'rb=1' in u.query and u.path.lstrip('/') in RB_PAGES:
            lang = RB_PAGES[u.path.lstrip('/')]
            src = io.open(os.path.join(ROOT, LANGS[lang]['page']), encoding='utf-8').read()
            src = src.replace('</body>', '<script>' + EXTRACT_JS + '</script></body>')
            body = src.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

RB_PAGES = {cfg['page']: lang for lang, cfg in LANGS.items()}

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

def run_browser(exe, url, extra, out_file=None, timeout=300):
    """One throwaway headless run.

    SwiftShader is spelled out because the figures are WebGL: a headless
    browser with no GPU draws nothing without it, and a blank figure is worse
    than no figure. --virtual-time-budget is what carries the page to the end
    of its work before the browser is finished with it."""
    profile = tempfile.mkdtemp(prefix='shl-rb-')
    args = [exe, '--headless=new', '--disable-gpu', '--no-first-run',
            '--no-default-browser-check', '--disable-extensions',
            '--user-data-dir=' + profile,
            '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
            '--virtual-time-budget=30000'] + extra + [url]
    sink = io.open(out_file, 'wb') if out_file else io.open(os.devnull, 'wb')
    try:
        subprocess.run(args, stdout=sink, stderr=subprocess.DEVNULL, timeout=timeout)
    except subprocess.TimeoutExpired:
        print('   (the browser timed out — carrying on with what it produced)')
    finally:
        sink.close()
        shutil.rmtree(profile, ignore_errors=True)

# ---------------------------------------------------------------- reading the dump
FIG_RE = re.compile(r'<img\b[^>]*\bid="([^"]+)"[^>]*>')
SRC_RE = re.compile(r'\bsrc="data:image/png;base64,([^"]*)"')
BLOCKS_RE = re.compile(r'<pre id="__rb_blocks">(.*?)</pre>', re.S)

def read_dump(path, figs_dir):
    dom = io.open(path, encoding='utf-8', errors='replace').read()
    m = BLOCKS_RE.search(dom)
    if not m:
        sys.exit('the page produced no text — did it fail to load? (' + path + ')')
    blocks = json.loads(html.unescape(m.group(1)))
    os.makedirs(figs_dir, exist_ok=True)
    n = 0
    for tag in FIG_RE.finditer(dom):
        src = SRC_RE.search(tag.group(0))
        if not src:
            continue                      # a figure the page could not draw
        io.open(os.path.join(figs_dir, tag.group(1) + '.png'), 'wb').write(
            base64.b64decode(src.group(1)))
        n += 1
    return blocks, n

def build(lang, port, exe):
    cfg = LANGS[lang]
    d = os.path.join(BUILD, lang)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d, exist_ok=True)
    base = 'http://127.0.0.1:%d/' % port
    figs = os.path.join(d, 'figs')

    print('[%s] drawing the rulebook and reading it back ...' % lang)
    dump = os.path.join(d, 'dom.html')
    run_browser(exe, base + cfg['page'] + '?rb=1', ['--dump-dom'], out_file=dump)
    blocks, nfigs = read_dump(dump, figs)
    bj = os.path.join(d, 'blocks.json')
    io.open(bj, 'w', encoding='utf-8').write(json.dumps(blocks, ensure_ascii=False))
    print('   %d blocks, %d figures' % (len(blocks), nfigs))
    if nfigs < 7:
        print('   WARNING: the rulebook has 7 figures — only %d were drawn' % nfigs)

    os.makedirs(OUT_DIR, exist_ok=True)
    pdf = os.path.join(OUT_DIR, cfg['out'] + '.pdf')
    print('[%s] printing the PDF ...' % lang)
    run_browser(exe, base + cfg['page'],
                ['--print-to-pdf=' + pdf, '--no-pdf-header-footer'])
    if not os.path.isfile(pdf):
        sys.exit('[%s] the PDF was not written' % lang)
    print('   %s  (%.1f MB)' % (os.path.basename(pdf), os.path.getsize(pdf) / 1e6))

    docx = os.path.join(OUT_DIR, cfg['out'] + '.docx')
    print('[%s] building the Word edition ...' % lang)
    r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'rulebook-docx.js'),
                        bj, figs, docx, lang], capture_output=True, text=True, cwd=ROOT)
    print('   ' + (r.stdout or r.stderr).strip().splitlines()[-1])
    if r.returncode:
        sys.exit('[%s] rulebook-docx.js failed' % lang)
    return [pdf, docx]

def main():
    args = sys.argv[1:]
    to_site = '--site' in args
    langs = [a for a in args if a in LANGS] or list(LANGS)
    exe = find_browser()
    shutil.rmtree(BUILD, ignore_errors=True)
    os.makedirs(BUILD, exist_ok=True)

    srv = Server(('127.0.0.1', 0), Handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print('serving the repo on 127.0.0.1:%d' % port)

    made = []
    try:
        for lang in langs:
            made += build(lang, port, exe)
    finally:
        srv.shutdown()

    if to_site and os.path.isdir(SITE_DL):
        for f in made:
            shutil.copy2(f, os.path.join(SITE_DL, os.path.basename(f)))
        print('copied %d files into the site downloads' % len(made))
    print('done — the rulebook is rebuilt from the current rules.')

if __name__ == '__main__':
    main()
