/* ============================================================
   leagues/vacuum/u19/rules.js  —  the U19 sub-league.

   Just the switches that make this division different. The rule
   engine itself lives one folder up, in league.js; the program the
   editor loads for this division sits next to this file.
   ============================================================ */
(function (root) {
  'use strict';
  const L = root.Leagues;
  const { mk, GROWN_ROOMS } = root.VacuumLeague;

  // THE STANDARD, applied: U19 navigates by POSITION (GPS / goto), so the
  // one-colour marker rugs that guide FS and U14 through the doorways are
  // stripped from its floor. The wet floor is gone league-wide — U19's is the
  // battery, not puddles — so only the slowing green rug stays. The map itself
  // is untouched for the other divisions.
  const NO_MARKERS = Object.assign({}, GROWN_ROOMS, {
    name: GROWN_ROOMS.name + '-u19',
    rugs: GROWN_ROOMS.rugs.filter((r) => r.kind === 'green'),
  });

  L.register({
    id: 'u19',
    // the program this sub-league loads into the editor — it lives
    // next to this file, so changing it changes nothing anywhere else
    program: 'leagues/vacuum/u19/program.py',
    group: 'vacuum',
    map: NO_MARKERS,    // the rooms house WITHOUT the doorway marker rugs
    // ---- the ROUTE helper: waypoints + the battery guard ----
    // U19's lesson is POSITION: tap the map, drop numbered points, and the
    // page writes goto(x, y) Python that drives them in order — and walks
    // itself to the charging pad below a battery threshold, then resumes.
    helper: 'leagues/vacuum/helper3/route.html',
    helperLabel: '&#128205; Route',
    code: 'U19',
    ready: true,
    accent: '#2fd08a',
    icon: '⚡',
    name: { en: 'U19', fa: 'زیر ۱۹ سال' },
    age: { en: 'ages 14 – 19', fa: '۱۴ تا ۱۹ سال' },
    blurb: {
      en: 'Everything in U14 plus a real battery. The charging station has a fixed home in the house and its coordinates are sent to both robots — plan the trips home yourself.',
      fa: 'همه‌چیز U14 به‌علاوه‌ی باتری واقعی. ایستگاه شارژ جای ثابت خودش را در خانه دارد و مختصاتش برای هر دو ربات ارسال می‌شود — سفرِ برگشت را خودت باید برنامه‌ریزی کنی.',
    },
    bullets: [
      { en: 'Battery: 100% is about 60 s of full-throttle driving', fa: 'باتری: ۱۰۰٪ یعنی حدود ۶۰ ثانیه رانندگی با تمام سرعت' },
      { en: 'The charging station has a fixed home — dockx / docky', fa: 'ایستگاه شارژ جای ثابت خودش را دارد — dockx / docky' },
      { en: 'Park on the pad to refill at 25% per second', fa: 'روی پد پارک کن تا ۲۵٪ در ثانیه شارژ شود' },
      { en: 'At 0% the robot only CRAWLS (15% speed) — it can still drag itself to the pad', fa: 'باتری صفر یعنی خزیدن با ۱۵٪ سرعت — هنوز می‌تواند خودش را تا شارژر بکشاند' },
      { en: 'SINGLE PLAYER: the bin holds 30 tiles — full means you clean nothing until you empty it', fa: 'تک‌نفره: مخزن فقط ۳۰ کاشی جا دارد — پر که شد تا خالی‌اش نکنی هیچ کاشی‌ای تمیز نمی‌شود' },
    ],
    // No robot building in this league either — the rig is READY-MADE in
    // kit.js; teams only pick a colour and write the brain.
    builder: false,
    defaults: { matchSeconds: 180 },
    // the in-game rulebook (the 📖 button on the setup page)
    guide: {
      title: { fa: 'قوانین U19', en: 'U19 rules' },
      sections: [
        { h: '🎯 هدف بازی', b: 'همان مسابقه‌ی U14 — کاشی بگیر، کاشی بدزد، ۳ دقیقه — به‌علاوه‌ی یک واقعیت جدید: <b>انرژی تمام می‌شود</b>.<br><small>EN: U14 plus a real battery.</small>' },
        { h: '🔋 باتری', b: '<b>battery</b> از ۱۰۰ شروع می‌شود؛ رانندگی با تمام سرعت حدود <b>۱٫۷٪ در ثانیه</b> می‌سوزاند (۱۰۰٪ ≈ ۶۰ ثانیه). در <b>صفر</b>، ربات همان‌جا برای همیشه خاموش می‌ماند — داور هم نجاتش نمی‌دهد، چون قانونِ خودِ بازی است.' },
        { h: '⚡ ایستگاه شارژ', b: 'جای ایستگاه ثابت است و مختصاتش (<b>dockx</b>، <b>docky</b>) به هر دو ربات داده می‌شود. روی پد پارک کن: <b>+۲۵٪ در ثانیه</b>. تا در حال شارژی، داورِ گیرکردن کاری به تو ندارد — ولی پر که شدی برمی‌گردد؛ روی پد چادر نزن. قانون سرانگشتی برگشتن: <b>distto(dockx, docky) / 25 + حاشیه‌ی چاق</b>.' },
        { h: '🗑 مخزن خاک — تک‌نفره', b: 'در مسابقه‌ی تک‌نفره مخزن هر <b>۳۰ کاشی</b> پر می‌شود و رباتِ پُر هیچ کاشی‌ای نمی‌گیرد تا خودش را به <b>ایستگاه تخلیه</b> برساند (dumpx و dumpy — دستگاهی جدا از پد شارژ). دو مأموریت، دو سفر. در بازی دو نفره مخزن پر نمی‌شود و رسیدن به ایستگاه یک بار <b>+۵</b> دارد.' },
        { h: '🐈 مثل U14', b: 'گربه و سگ، فرش‌ها، FINAL mode و جریمه‌ی جابه‌جایی <b>−۵ کاشی</b> — همه مثل U14 برقرارند.' },
        { h: '🛠 ربات U19', b: 'ربات را کامل خودت می‌سازی — GPS و <b>goto(x, y)</b> هم اینجا باز می‌شوند: مختصات به سانتی‌متر، گوشه‌ی پایین-چپ (0,0). goto مانع را دور نمی‌زند؛ سپر و چشم‌ها هنوز کار خودشان را دارند.' },
        { h: '🎓 از کجا شروع کنم؟', b: '<b>۱)</b> «🎓 آموزش» — پنج درسِ باتری، داک، بودجه، ماشین حالت و مخزن. <b>۲)</b> پله‌ی ۵ «🏆 چالش فنی» را قبول شو (کد استارتر قبول نمی‌شود — باید بهترش کنی!). <b>۳)</b> کد کامل «🏆 قهرمان U19» را بخوان: ماشین حالت با دو مأموریت. <b>۴)</b> «📊 گزارش مسابقه» بعد از هر بازی.' },
        { h: '🧭 حس‌های ربات · The senses', b: 'ربات FS دقیقاً شش چیز حس می‌کند — سه سنسور فاصله رو به جلو، حلقه‌ی سپر و سنسور رنگ — به‌علاوه‌ی آنچه خانه می‌گوید (room و clean). قطب‌نما و GPS مال رده‌های بالاترند.<br><small>EN: exactly six senses — three forward ultrasonic sensors, the bumper ring and the colour sensor — plus what the HOUSE reports (room, clean). Compass and GPS start at U14/U19.</small>' + "<table><tr><th>python</th><th>چیست · what</th></tr><tr><td><code>front / frontleft / frontright</code></td><td>سنسور فاصله (اولتراسونیک)، سانتی\u200cمتر؛ عدد کوچک\u200cتر = نزدیک\u200cتر؛ بیشینه ۲۰۰ · ultrasonic distance, cm; smaller = closer; max 200</td></tr><tr><td><code>bumperfront / bumperback / bumper</code></td><td>دو نیمه\u200cی حلقه\u200cی سپر و «هر کدام» · the ring's two halves, and either</td></tr><tr><td><code>color</code></td><td>رنگ کفِ جلوی ربات · the floor just ahead: <code>white</code> تمیزنشده، <code>red/blue</code> مال ربات\u200cها، <code>green</code> فرش بزرگ (نصف سرعت)، <code>purple/orange/cyan</code> فرش\u200cهای نشانه\u200cی درها، <code>black</code> دیوار/مبل</td></tr><tr><td><code>room</code>, <code>clean1..clean5</code></td><td>شماره\u200cی اتاق و درصد تمیزیِ هر اتاق برای من · which room I am in, and each room's clean-% for me (0 هال · 1 آشپزخانه · 2/3/4 خواب\u200cها · 5 سرویس)</td></tr><tr><td><code>timer</code>, <code>movetime</code>, <code>state</code>, <code>nextmove</code></td><td>حافظه\u200cی بین قدم\u200cها؛ movetime چرخ\u200cها را نگه می\u200cدارد · step-to-step memory; movetime holds the wheels</td></tr><tr><td><code>mytiles / rivaltiles / timeleft</code></td><td>کاشی\u200cهای من/حریف و ثانیه\u200cهای مانده · tiles owned and seconds left</td></tr><tr><td><code>wheelleft / wheelright</code></td><td>فرمان چرخ\u200cها، −۲۵..۲۵ · the wheel commands, −25..25</td></tr><tr><td><code>forward(s) backward(s) turnleft(s) turnright(s) stop(s)</code></td><td>حرکت\u200cهای آسان؛ عدد = ثانیه\u200cی واقعی · easy moves; the number is real seconds</td></tr><tr><td><code>x, y, heading</code></td><td>موقعیت (سانتی\u200cمتر، پایین-چپ (0,0)) و جهت · position (cm) and heading</td></tr><tr><td><code>goto(x,y), atgoal, stopgoto(), distto, angleto</code></td><td>ناوبری خط مستقیم — از دیوار رد نمی\u200cشود! · straight-line navigation — it does NOT dodge walls</td></tr><tr><td><code>battery, dockx, docky</code></td><td>باتری ۰..۱۰۰ (۱۰۰٪ ≈ ۶۰ ثانیه\u200cی تمام\u200cسرعت) و جای پد شارژ؛ روی پد +۲۵٪/ثانیه؛ باتریِ صفر = توقف ابدی · the battery and the fixed pad; 0 % stops you for good</td></tr><tr><td><code>dust, dustmax, dustfull, dumpx, dumpy</code></td><td>سطل خاک (تک\u200cنفره): ۳۰ کاشی، بعد برو خالی کن · the dust bin (1P): 30 tiles, then go empty</td></tr>" },
        { h: '⚖️ Rules at a glance (EN)', b: 'Every floor tile you drive over turns your colour and scores one point; LAST TOUCH owns the tile. Stuck for 15 s in one small circle → the referee relocates you at a penalty. Wet floor (U14/U19): −2 tiles per entry. Green rug: half speed, no points. Purple / orange / cyan rugs: doorway markers — no points, full speed. Draw → +10 s then +5 s steps up to 35 s of overtime. The full referee book with every number is <b>RULES.md</b> beside the game.' },
        { h: '📚 متن کامل', b: 'کتابچه‌ی کامل داوری: پرونده‌ی <b>RULES.md</b> کنار بازی.' },
      ],
    },
    // dumpEvery only bites in a ONE-player match (see league.js) — head to head
    // the bin never fills and reaching it once is worth +5, exactly as before
    // the dump stays OFF until the route helper can plan emptying trips;
    // battery (and its charger pad) is the one resource U19 manages for now
    // U19 has the battery to manage; no division has a wet floor any more
    rules: { pets: true, wet: false, penalty: 5, battery: true, dump: false },
    create: mk,
  });
})(typeof self !== 'undefined' ? self : this);
