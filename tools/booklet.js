/* ============================================================
   tools/booklet.js — build the six LESSON BOOKLETS (fa/en × FS/U14/U19)
   straight from the game's own tutorial data, install guide first.
   Output: HTML files ready for headless-Edge PDF printing.
   Usage:  node tools/booklet.js <outDir>
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const OUT = process.argv[2] || path.join(ROOT, '..', 'SmartHome-Handouts', 'html');
fs.mkdirSync(OUT, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function grab(name, endName) {
  const a = src.indexOf('const ' + name + ' = [');
  const b = src.indexOf('const ' + endName);
  if (a < 0 || b < 0) throw new Error('cannot find ' + name);
  let body = src.slice(a + ('const ' + name + ' = ').length, b);
  body = body.trim().replace(/;$/, '');
  /* the lesson objects contain setup(eng){} methods — valid literals */
  return eval('(' + body + ')');       // eslint-disable-line no-eval
}
const SETS = {
  fs: grab('FS_LESSONS', 'U14_LESSONS'),
  u14: grab('U14_LESSONS', 'U19_LESSONS'),
  u19: grab('U19_LESSONS', 'LESSONS'),
};

const LEAGUE_TITLES = {
  fs: { fa: 'فرست‌استپ (دبستان)', en: 'First Step (Elementary)' },
  u14: { fa: 'زیر ۱۴ سال (پرایمری)', en: 'U14 (Primary)' },
  u19: { fa: 'زیر ۱۹ سال (سکندری)', en: 'U19 (Secondary)' },
};

const INSTALL = {
  fa: `
<h2>نصب و اجرا</h2>
<p>پوشه‌ی <b>Smart Home League</b> که دریافت کرده‌اید دو زیرپوشه دارد: <b>Windows</b> و <b>Mac</b>.</p>
<h3>ویندوز</h3>
<ol>
<li>وارد پوشه‌ی <b>Windows</b> شوید و روی <code>Smart Home League.exe</code> دوبار کلیک کنید.</li>
<li>اگر بار اول ویندوز پیام امنیتی داد: <b>More info</b> و سپس <b>Run anyway</b> را بزنید.</li>
<li>پنجره‌ی بازی خودش باز می‌شود — همین!</li>
</ol>
<h3>مک</h3>
<ol>
<li>وارد پوشه‌ی <b>Mac</b> شوید و روی <code>Smart Home League (Mac).command</code> دوبار کلیک کنید.</li>
<li>اگر مک اجازه نداد: روی همان فایل <b>راست‌کلیک → Open → Open</b> (فقط بار اول لازم است).</li>
<li>اگر مک پیشنهاد نصب ابزار خط فرمان (python3) داد، <b>Install</b> را بزنید و بعد از پایان، دوباره دوبار کلیک کنید.</li>
</ol>
<p>در خودِ برنامه: زبان از منوی ☰ قابل تغییر است؛ «کد پایه»، «هلپرها» و «حالت مسابقه» روی صفحه‌ی اول هر لیگ هستند و کتابچه‌ی کامل قوانین از دکمه‌ی «قوانین» باز می‌شود.</p>`,
  en: `
<h2>Install &amp; run</h2>
<p>The <b>Smart Home League</b> folder you received contains two sub-folders: <b>Windows</b> and <b>Mac</b>.</p>
<h3>Windows</h3>
<ol>
<li>Open the <b>Windows</b> folder and double-click <code>Smart Home League.exe</code>.</li>
<li>If Windows shows a security prompt the first time, choose <b>More info</b> → <b>Run anyway</b>.</li>
<li>The game window opens by itself — that is all.</li>
</ol>
<h3>Mac</h3>
<ol>
<li>Open the <b>Mac</b> folder and double-click <code>Smart Home League (Mac).command</code>.</li>
<li>If macOS refuses: <b>right-click the file → Open → Open</b> (needed only once).</li>
<li>If macOS offers to install its command-line tools (python3), click <b>Install</b>, then double-click again.</li>
</ol>
<p>Inside the app: the language switches from the ☰ menu; the base code, the helpers and Match mode sit on each league's front page, and the full rulebook opens from the Rules button.</p>`,
};

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function page(lang, leagueId) {
  const rtl = lang === 'fa';
  const set = SETS[leagueId];
  const L = LEAGUE_TITLES[leagueId][lang];
  const t = (faTxt, enTxt) => (rtl ? faTxt : enTxt);
  let body = '';
  set.forEach((ls, i) => {
    const v = (!rtl && ls.en) ? Object.assign({}, ls, ls.en) : ls;
    body += `
<div class="lesson">
  <h2>${esc(v.title)}</h2>
  <div class="lb">${v.body}</div>
  <pre dir="ltr">${esc(v.code)}</pre>
  <div class="exp"><b>${t('باید ببینی:', 'You should see:')}</b> ${v.expect}</div>
</div>`;
  });
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head><meta charset="UTF-8">
<title>Smart Home League — ${esc(L)} — ${t('جزوه‌ی آموزشی', 'Lesson Booklet')}</title>
<style>
@font-face { font-family:'Vazirmatn'; src:url('${ROOT.replace(/\\/g, '/')}/fonts/Vazirmatn-Regular.woff2') format('woff2'); font-weight:400; }
@font-face { font-family:'Vazirmatn'; src:url('${ROOT.replace(/\\/g, '/')}/fonts/Vazirmatn-Bold.woff2') format('woff2'); font-weight:700 900; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:${rtl ? "'Vazirmatn'," : ''}"Segoe UI",Tahoma,sans-serif; color:#182030; line-height:1.9; padding:26px 34px; }
h1 { font-size:26px; font-weight:900; }
.sub { color:#5b6880; margin:2px 0 18px; }
h2 { font-size:17px; font-weight:800; margin:26px 0 6px; padding:7px 13px; background:#eef4ff; border-inline-start:5px solid #2e6fe0; border-radius:8px; break-after:avoid; }
h3 { font-size:14px; font-weight:800; margin:12px 0 4px; color:#20437e; }
p, li, .lb, .exp { font-size:13px; }
code { direction:ltr; unicode-bidi:embed; background:#f0f3f9; padding:1px 6px; border-radius:5px; font-family:Consolas,monospace; font-size:11.5px; }
pre { direction:ltr; text-align:left; background:#0b1017; color:#d7e3f4; border-radius:10px; padding:12px 14px; font-family:Consolas,monospace; font-size:11.5px; line-height:1.55; margin:8px 0; white-space:pre-wrap; break-inside:avoid; }
.exp { background:#eefaf0; border:1px solid #bfe5c8; border-radius:9px; padding:8px 12px; margin:6px 0 4px; }
.lesson { break-inside:avoid-page; }
ol,ul { padding-inline-start:22px; }
.cover { text-align:center; margin-bottom:8px; }
.badge { display:inline-block; background:#182030; color:#fff; border-radius:999px; padding:3px 14px; font-size:11px; letter-spacing:1px; }
@page { margin:14mm 12mm; }
</style></head>
<body>
<div class="cover">
  <h1>Smart Home League</h1>
  <div class="sub">${t('جزوه‌ی آموزشی درس‌به‌درس', 'Step-by-step Lesson Booklet')} — <b>${esc(L)}</b></div>
  <span class="badge">${set.length} ${t('درس', 'LESSONS')}</span>
</div>
${INSTALL[lang]}
<h2>${t('پیش از شروع', 'Before you start')}</h2>
<p>${t(
    'قانون طلایی: برنامه‌ی ربات ۱۰ بار در ثانیه از بالا تا پایین اجرا می‌شود؛ مقداری که در <code>wheelleft</code> و <code>wheelright</code> می‌گذاری تا اجرای بعدی می‌ماند. هر درس یک برنامه‌ی کامل و قابل‌اجراست — آن را در «آموزش» داخل برنامه اجرا کن یا در ادیتور مسابقه بگذار.',
    'The golden rule: the robot program runs 10 times a second, top to bottom; whatever you put in <code>wheelleft</code> / <code>wheelright</code> holds until the next run. Every lesson is a complete runnable program — run it in the in-app Tutorial or paste it into the match editor.')}</p>
${body}
</body></html>`;
}

for (const lang of ['fa', 'en']) {
  for (const lg of ['fs', 'u14', 'u19']) {
    const f = path.join(OUT, `booklet-${lg}-${lang}.html`);
    fs.writeFileSync(f, page(lang, lg));
    console.log('wrote', f);
  }
}
