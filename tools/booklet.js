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

/* ---- the printed booklet speaks FORMAL PLURAL Persian (شما) ----
   The in-app tutorial talks to one child; a printed booklet handed to a
   school talks to a class. Order matters: longer phrases come first. */
const FORMAL = [
  // duplicated lead-in: the booklet prints its own label
  [/^\s*باید ببینی[:،]\s*/, ''],
  [/^\s*You should see:\s*/, ''],
  // no "golden rule" wording
  ['قانون طلایی', 'نکته‌ی مهم'],
  // specific phrases first
  ['بهش بگو', 'به آن بگویید'],
  ['اگر از پشت خوردی', 'اگر از پشت ضربه خوردید'],
  ['محکم‌ترت می‌چسباند', 'شما را محکم‌تر می‌چسباند'],
  ['برت می‌گردانند', 'شما را برمی‌گردانند'],
  ['نجاتش بده', 'نجاتش بدهید'],
  ['فرمان بدهی', 'فرمان بدهید'],
  ['فرمان بده.', 'فرمان بدهید.'],
  ['بردار و مقایسه کن', 'بردارید و مقایسه کنید'],
  ['بگذار بدود', 'بگذارید بدود'],
  ['بگذار حسابی تمیز کند', 'بگذارید حسابی تمیز کند'],
  ['تنظیم کن و بگو', 'تنظیم کنید و بگویید'],
  ['خودت می‌شماری', 'خودتان می‌شمارید'],
  ['ابزار داری:', 'ابزار دارید:'],
  ['سپر را بپا!', 'مراقب سپر باشید!'],
  ['حواست باشد:', 'توجه داشته باشید:'],
  ['حواست باشه:', 'توجه داشته باشید:'],
  ['را بکن 30', 'را ۳۰ کنید'],
  ['را بکن 0', 'را ۰ کنید'],
  ['را بکن 5', 'را ۵ کنید'],
  ['کوتاه و بلند کن', 'کوتاه و بلند کنید'],
  ['و ببین چقدر', 'و ببینید چقدر'],
  ['تفاوت را ببین.', 'تفاوت را ببینید.'],
  ['در پنل ببین.', 'در پنل ببینید.'],
  ['را ببین!', 'را ببینید!'],
  ['بخوانش:', 'آن را بخوانید:'],
  ['دربیاور', 'دربیاورید'],
  ['نگاه کن:', 'نگاه کنید:'],
  ['باز کن:', 'باز کنید:'],
  ['دقت کن:', 'دقت کنید:'],
  ['راه بیفت.', 'راه بیفتید.'],
  ['رسیده‌ای.', 'رسیده‌اید.'],
  ['قوس بزن.', 'قوس بزنید.'],
  ['را بزن و', 'را بزنید و'],
  ['تماشا کنی', 'تماشا کنید'],
  ['تماشا کن', 'تماشا کنید'],
  ['مقایسه‌اش کن', 'مقایسه‌اش کنید'],
  ['کاری کن', 'کاری کنید'],
  ['جابه‌جا کن', 'جابه‌جا کنید'],
  ['بزرگ‌تر کن', 'بزرگ‌تر کنید'],
  ['عوض کن', 'عوض کنید'],
  ['اجرا کن', 'اجرا کنید'],
  ['بگذار و', 'بگذارید و'],
  ['بنویسی،', 'بنویسید،'],
  ['پیدا کنی،', 'پیدا کنید،'],
  ['نشانه بگیری.', 'نشانه بگیرید.'],
  ['می‌توانی', 'می‌توانید'],
  // sensors are SENSORS, not eyes — the booklet uses the official wording
  ['درس ۱ — چشم‌های فاصله', 'درس ۱ — سنسورهای فاصله (Ultrasonic)'],
  ['ربات FS سه چشم رو به جلو دارد که فاصله را به سانتی‌متر می‌گویند: <b>frontleft</b> و <b>front</b> و <b>frontright</b>.',
   'ربات FS سه سنسور فاصله‌ی آلتراسونیک (Ultrasonic Sensor — به‌اختصار US) رو به جلو دارد که حکم چشمِ ربات را دارند و فاصله را به سانتی‌متر گزارش می‌کنند: <b>front</b> جلوی ربات، <b>frontleft</b> جلو سمتِ چپ و <b>frontright</b> جلو سمتِ راست.'],
  ['چشمِ وسط همه‌چیز را نمی‌بیند!', 'سنسورِ وسط (front) همه‌چیز را نمی‌بیند!'],
  ['درس ۲ — چپ و راست را جدا ببین', 'درس ۲ — جلو-چپ و جلو-راست را جدا ببینید'],
  ['با سه چشمِ جلو', 'با سه سنسور جلو'],
  ['درس ۱ — سه چشم، بدون توقف', 'درس ۱ — سه سنسور فاصله، بدون توقف'],
  ['وقتی هر سه چشم عدد کوچک می‌گویند', 'وقتی هر سه سنسورِ فاصله عدد کوچک می‌گویند'],
  ['چشم‌ها', 'سنسورهای فاصله'],
  ['هر سه چشم', 'هر سه سنسور فاصله'],
  ['سه چشمِ جلو', 'سه سنسور فاصله‌ی جلو'],
  ['چشمِ وسط', 'سنسور فاصله‌ی وسط'],
  ['سه چشم', 'سه سنسور فاصله'],
  ['چشمِ', 'سنسورِ فاصله‌ی'],
  ['چشم', 'سنسور فاصله'],
  // possessives that address one child
  ['کدت', 'کدِ شما'],
  ['شارژت', 'شارژ شما'],
  ['مسیرت', 'مسیر شما'],
  ['چرخِ تو', 'چرخِ شما'],
  ['عادی‌ات', 'عادیِ شما'],
  ['تو عقربه', 'شما عقربه'],
];
const FORMAL_EN = [
  ['The distance eyes', 'The ultrasonic distance sensors'],
  ['three forward eyes that report distance in centimetres: frontleft, front and frontright',
   'three forward ULTRASONIC distance sensors (US) that act as its eyes and report distance in centimetres: front looks straight ahead, frontleft looks to the front-LEFT and frontright to the front-RIGHT'],
  ['The middle eye cannot see everything!', 'The middle sensor (front) cannot see everything!'],
  ['Three eyes, no stopping', 'Three distance sensors, no stopping'],
  ['with the three front eyes', 'with the three front sensors'],
  ['ALL THREE eyes read small numbers', 'ALL THREE distance sensors read small numbers'],
  ['the eyes get more warning', 'the distance sensors get more warning'],
  ['three forward eyes', 'three forward distance sensors'],
  ['the three eyes', 'the three distance sensors'],
  ['forward eyes', 'forward distance sensors'],
  ['eyes', 'distance sensors'],
];
function formalize(text, lang) {
  let t = String(text);
  const table = lang === 'fa' ? FORMAL : FORMAL_EN.concat([[/^\s*You should see:\s*/, '']]);
  for (const [from, to] of table) {
    t = (from instanceof RegExp) ? t.replace(from, to) : t.split(from).join(to);
  }
  return t;
}

const HELPERS = {
  fs: {
    fa: `
<h2>هلپرها — ابزارهای کدساز</h2>
<p>در صفحه‌ی اول لیگ، دو هلپر می‌بینید. هر دو در پایان یک <b>فایل پایتون واقعی</b> می‌سازند — همان چیزی که در مسابقه اجرا می‌شود.</p>
<h3>🤖 هلپر AI (قانون‌ساز پرسش‌وپاسخی)</h3>
<ol>
<li>از صفحه‌ی اول لیگ، «هلپر AI» را بزنید.</li>
<li>روی یکی از سنسورهای روی عکسِ ربات بزنید (یا بکشید) — یک «قانون» ساخته می‌شود.</li>
<li>به پرسش‌ها جواب بدهید: «نزدیک‌تر از چند سانتی‌متر؟»، «ربات کدام طرف برود؟»، «با چه سرعتی و چند ثانیه؟».</li>
<li>در صورت نیاز «حرکت دوم» را هم اضافه کنید (مثلاً: عقب بکش، بعد بچرخ).</li>
<li>در اتاقکِ شبیه‌ساز، همان لحظه نتیجه‌ی قانون‌ها را تماشا کنید.</li>
<li>پایین صفحه، پایتونِ ساخته‌شده را می‌بینید — <b>عددهای زرد را می‌توانید همان‌جا در خودِ کد ویرایش کنید</b>.</li>
<li>در پایان «▶ با همین کد بازی کن» را بزنید — مسابقه خودش شروع می‌شود. با «⬇ فایل پایتون» هم می‌توانید کد را ذخیره کنید.</li>
</ol>
<h3>🧩 هلپر بلاکی (پازلی)</h3>
<ol>
<li>از صفحه‌ی اول، «هلپر بلاکی» را بزنید.</li>
<li>از ستون بلاک‌ها، بلوکِ «اگر …» (سنسور) و بلوکِ حرکت را انتخاب کنید — بلوک‌ها مثل پازل به هم چفت می‌شوند.</li>
<li>«+ قانون جدید» بالای صفحه قانون تازه می‌سازد؛ بعد از انداختن هر شرط، جعبه‌ی چشمک‌زن می‌پرسد: «شرط دیگر یا دستور؟».</li>
<li>هلپر بلاکی و هلپر AI <b>یک پرونده‌ی قوانین مشترک</b> دارند — هر جا ساختید، در دیگری هم قابل ادامه است؛ حتی می‌توانید یک فایل پایتون را در بلاکی «لود» کنید تا دوباره بلوک شود.</li>
<li>در پایان ▶ را بزنید تا همان کد در مسابقه اجرا شود.</li>
</ol>`,
    en: `
<h2>The helpers — code-building tools</h2>
<p>The league's front page offers two helpers. Both end by producing a <b>real Python file</b> — exactly what the match runs.</p>
<h3>🤖 The AI helper (question-and-answer rule builder)</h3>
<ol>
<li>Open <b>AI helper</b> from the league's front page.</li>
<li>Tap (or drag) a sensor on the robot picture — a rule is created.</li>
<li>Answer its questions: closer than how many centimetres? which way should the robot go? how fast, for how long?</li>
<li>Add an optional second move (for example: back away, then turn).</li>
<li>Watch the little simulator room act out your rules live.</li>
<li>The generated Python appears below — <b>the yellow numbers are editable right inside the code</b>.</li>
<li>Press <b>▶ Play with this code</b> — the match starts by itself. <b>⬇ Download .py</b> saves the file.</li>
</ol>
<h3>🧩 The Blocks helper (puzzle pieces)</h3>
<ol>
<li>Open <b>Blocks helper</b> from the front page.</li>
<li>Pick an "if …" (sensor) block and a move block from the palette — the pieces snap together like a puzzle.</li>
<li><b>+ New rule</b> at the top creates a fresh rule; after each condition a blinking prompt asks: another condition, or a move?</li>
<li>Blocks and the AI helper share <b>one rules file</b> — build in either, continue in the other; you can even load a Python file back into blocks.</li>
<li>Press ▶ to run the same code in the match.</li>
</ol>`,
  },
  u14: {
    fa: `
<h2>هلپر AI در U14 — قدرت‌های اضافه</h2>
<p>همان هلپر AI فرست‌استپ است، با حس‌ها و حرکت‌های بیشتر:</p>
<ol>
<li><b>قطب‌نما:</b> حرکتِ «Turn to °» بچرخ-تا-درجه‌ی مطلق است — ربات آن‌قدر می‌چرخد تا heading همان عدد شود.</li>
<li><b>شماره‌ی اتاق و درصد تمیزی:</b> حس‌های room و clean را روی یک قانون بیندازید: «اگر در اتاق ۲ بودم و اتاق ۲ بیش از ۸۰٪ تمیز بود…».</li>
<li><b>قانون سه‌حرکته:</b> هر قانون تا ۳ حرکت پشت‌سرهم دارد — «بچرخ به ۲۷۰ ← مستقیم برو ← بچرخ به ۱۸۰» دقیقاً مسیر خروج از اتاق است.</li>
<li>دکمه‌ی <b>«🚪 قانونِ خروج از اتاقِ تمام‌شده»</b> همین قانون نمونه را یک‌جا می‌سازد؛ درجه‌ی هر مرحله را با نقشه‌ی خودتان تنظیم کنید.</li>
<li>مثل همیشه: ▶ اجرا، ⬇ ذخیره، و عددهای زرد قابل ویرایش در خودِ کد.</li>
</ol>`,
    en: `
<h2>The AI helper in U14 — extra powers</h2>
<p>The same AI helper as First Step, with more senses and moves:</p>
<ol>
<li><b>The compass:</b> the "Turn to °" move is an absolute turn — the robot keeps turning until heading reads your number.</li>
<li><b>Room number and clean-%:</b> drop the room and clean senses onto one rule: "while I am in room 2 and room 2 is more than 80% clean…".</li>
<li><b>Three-move rules:</b> every rule chains up to three moves — "Turn to 270 → Forward → Turn to 180" is exactly the way out of a room.</li>
<li>The <b>"leave the finished room"</b> button builds that sample rule in one tap; tune each leg's degree to your map.</li>
<li>As always: ▶ to run, ⬇ to save, yellow numbers editable inside the code.</li>
</ol>`,
  },
  u19: {
    fa: `
<h2>📍 هلپر مسیر (U19) — نقطه بزنید، کد تحویل بگیرید</h2>
<ol>
<li>از صفحه‌ی اول لیگ، «هلپر مسیر» را بزنید — عکسِ واقعیِ از بالای خانه باز می‌شود.</li>
<li>اول در تنظیمات مشخص کنید <b>ربات شما قرمز است یا آبی</b> — نقطه‌ی شروعِ همان ربات روی عکس با برچسب START نشان داده می‌شود.</li>
<li>روی نقشه کلیک کنید تا نقطه‌های مسیر ساخته شوند (یا با حالت «کشیدن»، مسیر آزاد بکشید تا خودش به نقطه تبدیل شود).</li>
<li>هلپر خودش نقطه‌های میانیِ رد شدن از درها را حساب می‌کند — چون goto فقط خط مستقیم می‌رود.</li>
<li>کنار هر نقطه یک چیپ باتری می‌بینید: 🔋 شارژ تقریبی هنگام رسیدن، 🏠 هزینه‌ی راهِ برگشت تا شارژر — و اگر با تنظیمات فعلی به شارژر نرسد، ⚠ هشدار قرمز می‌گیرید.</li>
<li>در جعبه‌ی ⚙ تنظیمات: مسیر حلقه باشد یا یک‌بار؛ گارد باتری روشن/خاموش؛ آستانه‌ی «زیر چند ٪ برو شارژر»؛ و اینکه روی پد «تا چند ٪» یا «چند ثانیه» بماند.</li>
<li>کد ساخته‌شده دو تابع دارد: <code>follow_route()</code> برای مسیر و <code>go_charge()</code> برای سفرِ شارژ — پایینِ فایل صدا زده می‌شوند و اسمشان را هم می‌توانید عوض کنید. اگر پد اشغال باشد، ربات آرام در صف می‌ماند.</li>
<li>در پایان: «کپی پایتون»، «⬇ فایل پایتون» یا «▶» — با ▶ مسابقه خودش شروع می‌شود.</li>
</ol>`,
    en: `
<h2>📍 The Route helper (U19) — tap points, receive code</h2>
<ol>
<li>Open <b>Route helper</b> from the league's front page — a real top-down photo of the house opens.</li>
<li>First pick in the settings whether <b>your robot is red or blue</b> — that robot's starting point appears on the photo with a START badge.</li>
<li>Click the map to drop route points (or use draw mode to sketch a free path that becomes points by itself).</li>
<li>The helper computes the in-between doorway points for you — goto only drives straight lines.</li>
<li>Every point carries a battery chip: 🔋 the estimated charge on arrival and 🏠 the cost of the trip home to the charger — and a red ⚠ if the current settings cannot reach it.</li>
<li>The ⚙ settings box: loop or single pass; battery guard on/off; the "below N% go charge" threshold; and whether to stay on the pad "to N%" or "for N seconds".</li>
<li>The generated code is built on two functions: <code>follow_route()</code> for the route and <code>go_charge()</code> for the charging trip — called at the bottom of the file; you may rename them. If the pad is taken, the robot waits in line politely.</li>
<li>Finish with Copy, ⬇ Download .py, or ▶ — with ▶ the match starts by itself.</li>
</ol>`,
  },
};

/* what each division's robot actually carries */
const SENSOR_LIST = {
  fs: {
    fa: `<ul>
<li><b>سه سنسور فاصله‌ی آلتراسونیک (US)</b> — <code>front</code> رو‌به‌جلو، <code>frontleft</code> جلو سمتِ چپ، <code>frontright</code> جلو سمتِ راست؛ بر حسب سانتی‌متر، عدد کوچک‌تر یعنی نزدیک‌تر.</li>
<li><b>بامپر (سپر لمسی)</b> — <code>bumperfront</code> برخورد با جلو و <code>bumperback</code> برخورد از پشت (۰ یا ۱).</li>
<li><b>سنسور رنگ</b> — <code>color</code>: رنگِ کفِ درست جلوی ربات (<code>white</code>، <code>green</code>، <code>purple</code>، …).</li>
</ul>`,
    en: `<ul>
<li><b>Three ultrasonic distance sensors (US)</b> — <code>front</code> straight ahead, <code>frontleft</code> to the front-left, <code>frontright</code> to the front-right; in centimetres, smaller means closer.</li>
<li><b>The bumper</b> — <code>bumperfront</code> for a front hit and <code>bumperback</code> for a hit from behind (0 or 1).</li>
<li><b>The colour sensor</b> — <code>color</code>: the floor colour just ahead (<code>white</code>, <code>green</code>, <code>purple</code>, …).</li>
</ul>`,
  },
  u14: {
    fa: `<ul>
<li><b>سه سنسور فاصله‌ی آلتراسونیک (US)</b> — <code>front</code> رو‌به‌جلو، <code>frontleft</code> جلو سمتِ چپ، <code>frontright</code> جلو سمتِ راست (سانتی‌متر).</li>
<li><b>بامپر</b> — <code>bumperfront</code> و <code>bumperback</code> (۰ یا ۱).</li>
<li><b>سنسور رنگ</b> — <code>color</code>.</li>
<li><b>قطب‌نما</b> — <code>heading</code> از ۰ تا ۳۵۹ درجه.</li>
<li><b>شماره‌ی اتاق و درصد تمیزی</b> — <code>room</code> و <code>clean1..clean5</code>.</li>
</ul>`,
    en: `<ul>
<li><b>Three ultrasonic distance sensors (US)</b> — <code>front</code>, <code>frontleft</code> (front-left), <code>frontright</code> (front-right), in centimetres.</li>
<li><b>The bumper</b> — <code>bumperfront</code> and <code>bumperback</code> (0 or 1).</li>
<li><b>The colour sensor</b> — <code>color</code>.</li>
<li><b>The compass</b> — <code>heading</code>, 0 to 359 degrees.</li>
<li><b>Room number and clean-%</b> — <code>room</code> and <code>clean1..clean5</code>.</li>
</ul>`,
  },
  u19: {
    fa: `<ul>
<li><b>سه سنسور فاصله‌ی آلتراسونیک (US)</b> — <code>front</code>، <code>frontleft</code> (جلو-چپ)، <code>frontright</code> (جلو-راست)، بر حسب سانتی‌متر.</li>
<li><b>بامپر</b> — <code>bumperfront</code> و <code>bumperback</code> (۰ یا ۱).</li>
<li><b>سنسور رنگ</b> — <code>color</code>.</li>
<li><b>قطب‌نما</b> — <code>heading</code>.</li>
<li><b>GPS</b> — <code>x</code> و <code>y</code> (سانتی‌متر) به‌همراه <code>goto(x, y)</code>، <code>distto</code> و <code>angleto</code>.</li>
<li><b>باتری و ایستگاه شارژ</b> — <code>battery</code> (٪) و مختصات پد: <code>dockx</code>، <code>docky</code>.</li>
</ul>`,
    en: `<ul>
<li><b>Three ultrasonic distance sensors (US)</b> — <code>front</code>, <code>frontleft</code> (front-left), <code>frontright</code> (front-right), in centimetres.</li>
<li><b>The bumper</b> — <code>bumperfront</code> and <code>bumperback</code> (0 or 1).</li>
<li><b>The colour sensor</b> — <code>color</code>.</li>
<li><b>The compass</b> — <code>heading</code>.</li>
<li><b>GPS</b> — <code>x</code> and <code>y</code> (cm) with <code>goto(x, y)</code>, <code>distto</code> and <code>angleto</code>.</li>
<li><b>Battery and charging station</b> — <code>battery</code> (%) and the pad coordinates <code>dockx</code>, <code>docky</code>.</li>
</ul>`,
  },
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
  <h2>${esc(formalize(v.title, lang))}</h2>
  <div class="lb">${formalize(v.body, lang)}</div>
  <pre dir="ltr">${esc(v.code)}</pre>
  <div class="exp"><b>${t('نتیجه‌ی مورد انتظار:', 'You should see:')}</b> ${formalize(v.expect, lang)}</div>
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
${HELPERS[leagueId][lang]}
<h2>${t('سنسورهای ربات در یک نگاه', 'The robot\'s sensors at a glance')}</h2>
${SENSOR_LIST[leagueId][lang]}
<canvas id="sensCv" width="980" height="560" style="width:100%;border:1px solid #ccd4e2;border-radius:12px"></canvas>
<div style="text-align:center;color:#5b6880;font-size:11px;margin:4px 0 10px">${t(
  'سه سنسور فاصله‌ی آلتراسونیک (US): front جلوی ربات، frontleft جلو-چپ، frontright جلو-راست — و حلقه‌ی نارنجی، بامپر (سپر لمسی) است',
  'The ultrasonic distance sensors (US): front looks straight ahead, frontleft front-left, frontright front-right — the orange arc is the touch bumper')}</div>
<script>
(function () {
  var c = document.getElementById('sensCv'), g = c.getContext('2d');
  g.fillStyle = '#f7f9fd'; g.fillRect(0, 0, 980, 560);
  var cx = 490, cy = 300, R = 130;
  function beam(ang, len) {
    var a = ang * Math.PI / 180;
    g.beginPath();
    g.moveTo(cx + Math.cos(a - 0.15) * R, cy - Math.sin(a - 0.15) * R);
    g.lineTo(cx + Math.cos(a) * (R + len), cy - Math.sin(a) * (R + len));
    g.lineTo(cx + Math.cos(a + 0.15) * R, cy - Math.sin(a + 0.15) * R);
    g.closePath(); g.fillStyle = 'rgba(46,111,224,.16)'; g.fill();
  }
  beam(90, 150); beam(130, 140); beam(50, 140);
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2);
  g.fillStyle = '#dfe7f4'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#8fa3c4'; g.stroke();
  g.beginPath(); g.arc(cx, cy, R + 9, -Math.PI * 0.80, -Math.PI * 0.20);
  g.lineWidth = 11; g.strokeStyle = '#f59e0b'; g.stroke();
  g.fillStyle = '#5b6880';
  g.fillRect(cx - R - 4, cy - 38, 15, 76); g.fillRect(cx + R - 11, cy - 38, 15, 76);
  function dot(ang, name, dy) {
    var a = ang * Math.PI / 180;
    var x = cx + Math.cos(a) * R, y = cy - Math.sin(a) * R;
    g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2);
    g.fillStyle = '#2e6fe0'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#20437e'; g.font = '700 19px Consolas, monospace'; g.textAlign = 'center';
    g.fillText(name, cx + Math.cos(a) * (R + 175), cy - Math.sin(a) * (R + 175) + (dy || 0));
  }
  dot(90, 'front'); dot(130, 'frontleft', 6); dot(50, 'frontright', 6);
  g.fillStyle = '#b45309'; g.font = '700 17px Consolas, monospace';
  g.fillText('bumper', cx, cy - R - 34);
})();
</script>
<h2>${t('پیش از شروع', 'Before you start')}</h2>
<p>${t(
    'نکته: برنامه‌ی ربات ۱۰ بار در ثانیه از بالا تا پایین اجرا می‌شود؛ مقداری که در <code>wheelleft</code> و <code>wheelright</code> می‌گذارید تا اجرای بعدی می‌ماند. هر درس یک برنامه‌ی کامل و قابل‌اجراست — آن را در بخش «آموزش» داخل برنامه اجرا کنید یا در ادیتور مسابقه بگذارید.',
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
