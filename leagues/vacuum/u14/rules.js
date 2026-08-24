/* ============================================================
   leagues/vacuum/u14/rules.js  —  the U14 sub-league.

   Just the switches that make this division different. The rule
   engine itself lives one folder up, in league.js; the program the
   editor loads for this division sits next to this file.
   ============================================================ */
(function (root) {
  'use strict';
  const L = root.Leagues;
  const { mk, GROWN_ROOMS } = root.VacuumLeague;

  L.register({
    id: 'u14',
    // the program this sub-league loads into the editor — it lives
    // next to this file, so changing it changes nothing anywhere else
    program: 'leagues/vacuum/u14/program.py',
    // U14 may write Python by hand OR open the AI page (the FS rule builder,
    // shared for now) — the button on the setup page follows this line
    helper: 'leagues/vacuum/helper/helper.html',
    // U14's rig lives in kit.js NEXT DOOR (one file, one truth): FS's rig
    // plus the compass. The helper page reads the same object.
    kit: root.VacuumU14Kit,
    group: 'vacuum',
    map: GROWN_ROOMS,   // the 22x22 ROOMS house: kitchen + two bedrooms, room numbers live
    code: 'U14',
    ready: true,
    accent: '#ffd23b',
    icon: '🐈',
    name: { en: 'U14', fa: 'زیر ۱۴ سال' },
    age: { en: 'ages 11 – 14', fa: '۱۱ تا ۱۴ سال' },
    blurb: {
      en: 'The full house: a cat, a dog, rugs, wet floor — and a rival who can steal every tile you just cleaned.',
      fa: 'خانه‌ی کامل: گربه، سگ، فرش، کف خیس — و حریفی که می‌تواند هر کاشی‌ای را که تازه تمیز کرده‌ای بدزدد.',
    },
    bullets: [
      { en: 'The cat and the dog wander around as moving obstacles', fa: 'گربه و سگ به‌عنوان مانع متحرک در خانه می‌چرخند' },
      { en: 'Wet floor costs you 2 tiles every time', fa: 'هر بار ورود به کف خیس ۲ کاشی جریمه دارد' },
      { en: 'Steal tiles back from the rival by cleaning over them', fa: 'با تمیزکردن روی کاشی حریف، آن را پس بگیر' },
      { en: 'FINAL mode available: the cat erases painted tiles', fa: 'حالت فینال: گربه کاشی‌های رنگ‌شده را پاک می‌کند' },
    ],
    // No robot building in this league either — the rig is READY-MADE in
    // kit.js; teams only pick a colour and write the brain.
    builder: false,
    defaults: { matchSeconds: 180 },
    rules: { pets: true, wet: true, penalty: 5, battery: false },
    // the in-game rulebook (the 📖 button on the setup page)
    guide: {
      title: { fa: 'قوانین U14', en: 'U14 rules' },
      sections: [
        { h: '🎯 هدف بازی', b: 'هر کاشی که از رویش رد شوی رنگ تو می‌شود و یک امتیاز است؛ <b>لمسِ آخر مالک است</b> — از روی کاشی حریف رد شوی، دزدیده‌ای! آخرِ ۳ دقیقه، کاشیِ بیشتر = برد.<br><small>EN: last touch owns the tile; most tiles at the whistle wins.</small>' },
        { h: '🐈 خانه‌ی زنده', b: 'گربه و سگ در خانه می‌چرخند — مانعِ متحرک‌اند و سپر تو را فعال می‌کنند. در حالت <b>FINAL</b> (فقط فینال‌ها؛ تیک روی صفحه‌ی آماده‌سازی) گربه خطرناک هم می‌شود: هر کاشیِ رنگی که رویش راه برود دوباره سفید می‌شود و آن امتیاز می‌پرد.' },
        { h: '💧 کف خیس', b: 'دو لکه‌ی آبِ ریخته روی نقشه هست. هر بار که واردشان شوی <b>۲ کاشی</b> جریمه می‌شوی — و هر بارِ دوباره، دوباره! خودِ کاشی‌های خیس هم هیچ‌وقت تمیز نمی‌شوند. با فاصله دورشان بزن.' },
        { h: '🧶 فرش‌ها', b: 'فرش سبز بزرگ: نصف سرعت و صفر امتیاز. فرش بنفش کوچک: صفر امتیاز. سنسور رنگ هر دو را <b>قبل از ورود</b> می‌بیند — برنامه‌ات باید جواب داشته باشد.' },
        { h: '⚖️ جریمه‌ها', b: '۱۰ ثانیه گیرکردن در یک دایره‌ی کوچک = جابه‌جایی توسط داور و <b>−۵ کاشی</b>. جابه‌جایی دستی داور هم همان جریمه را دارد. تساوی؟ +۱۰ ثانیه، بعد +۵های پیاپی تا سقف ۳۵ ثانیه.' },
        { h: '🧭 ربات U14', b: 'همان حواس FS به‌علاوه‌ی <b>قطب‌نما</b> (heading، ۰ تا ۳۵۹ درجه؛ ۰ = راست، ۹۰ = بالا، ۱۸۰ = چپ، ۲۷۰ = پایین) — و این بار ربات را خودت در «🔧 Robot» می‌سازی. GPS و goto هنوز مال U19 است.' },
        { h: '🚪 اتاق‌ها', b: 'خانه‌ی بزرگ <b>شش ناحیه</b> دارد: آشپزخانه (<b>۱</b>)، اتاق‌خواب ۱ (<b>۲</b>)، اتاق‌خواب ۲ (<b>۳</b>)، اتاق‌خواب ۳ (<b>۴</b>)، سرویس بهداشتی (<b>۵</b>) و هال/پذیرایی (<b>۰</b>). <code>room</code> می‌گوید الان کجایی و <code>clean1..clean5</code> می‌گوید چند درصد هر اتاق رنگ توست — «اتاقِ تمام‌شده را ول کن، برو بعدی» یک شرط ساده است. دم هر در یک فرش نشانه هست تا سنسور رنگ هم در را بشناسد.<br><small>EN: six zones — kitchen 1, bedrooms 2/3/4, bathroom 5, hall 0; read <code>room</code> and <code>clean1..clean5</code>.</small>' },
        { h: '🎓 از کجا شروع کنم؟', b: '<b>۱)</b> «🎓 آموزش» — شش درس مخصوص U14 (قوس‌زدن، تایمر و state، قطب‌نما، کنج). <b>۲)</b> «🏆 چالش فنی» پله‌های ۳ و ۴. <b>۳)</b> کد کامل «🏆 قهرمان U14» را بخوان — هر ترفندش اندازه‌گیری شده. <b>۴)</b> بعد از هر مسابقه «📊 گزارش» را باز کن.' },
        { h: '🧭 حس‌های ربات · The senses', b: 'ربات FS دقیقاً شش چیز حس می‌کند — سه سنسور فاصله رو به جلو، حلقه‌ی سپر و سنسور رنگ — به‌علاوه‌ی آنچه خانه می‌گوید (room و clean). قطب‌نما و GPS مال رده‌های بالاترند.<br><small>EN: exactly six senses — three forward ultrasonic sensors, the bumper ring and the colour sensor — plus what the HOUSE reports (room, clean). Compass and GPS start at U14/U19.</small>' + "<table><tr><th>python</th><th>چیست · what</th></tr><tr><td><code>front / frontleft / frontright</code></td><td>سنسور فاصله (اولتراسونیک)، سانتی\u200cمتر؛ عدد کوچک\u200cتر = نزدیک\u200cتر؛ بیشینه ۲۰۰ · ultrasonic distance, cm; smaller = closer; max 200</td></tr><tr><td><code>bumperfront / bumperback / bumper</code></td><td>دو نیمه\u200cی حلقه\u200cی سپر و «هر کدام» · the ring's two halves, and either</td></tr><tr><td><code>color</code></td><td>رنگ کفِ جلوی ربات · the floor just ahead: <code>white</code> تمیزنشده، <code>red/blue</code> مال ربات\u200cها، <code>green</code> فرش بزرگ (نصف سرعت)، <code>purple/orange/cyan</code> فرش\u200cهای نشانه\u200cی درها، <code>black</code> دیوار/مبل</td></tr><tr><td><code>room</code>, <code>clean1..clean5</code></td><td>شماره\u200cی اتاق و درصد تمیزیِ هر اتاق برای من · which room I am in, and each room's clean-% for me (0 هال · 1 آشپزخانه · 2/3/4 خواب\u200cها · 5 سرویس)</td></tr><tr><td><code>timer</code>, <code>movetime</code>, <code>state</code>, <code>nextmove</code></td><td>حافظه\u200cی بین قدم\u200cها؛ movetime چرخ\u200cها را نگه می\u200cدارد · step-to-step memory; movetime holds the wheels</td></tr><tr><td><code>mytiles / rivaltiles / timeleft</code></td><td>کاشی\u200cهای من/حریف و ثانیه\u200cهای مانده · tiles owned and seconds left</td></tr><tr><td><code>wheelleft / wheelright</code></td><td>فرمان چرخ\u200cها، −۲۵..۲۵ · the wheel commands, −25..25</td></tr><tr><td><code>forward(s) backward(s) turnleft(s) turnright(s) stop(s)</code></td><td>حرکت\u200cهای آسان؛ عدد = ثانیه\u200cی واقعی · easy moves; the number is real seconds</td></tr><tr><td><code>heading</code></td><td>قطب\u200cنما، ۰..۳۵۹ درجه (۰ راست · ۹۰ بالا · ۱۸۰ چپ · ۲۷۰ پایین) · the compass, 0..359°</td></tr>" },
        { h: '⚖️ Rules at a glance (EN)', b: 'Every floor tile you drive over turns your colour and scores one point; LAST TOUCH owns the tile. Stuck for 15 s in one small circle → the referee relocates you at a penalty. Wet floor (U14/U19): −2 tiles per entry. Green rug: half speed, no points. Purple / orange / cyan rugs: doorway markers — no points, full speed. Draw → +10 s then +5 s steps up to 35 s of overtime. The full referee book with every number is <b>RULES.md</b> beside the game.' },
        { h: '📚 متن کامل', b: 'کتابچه‌ی کامل داوری: پرونده‌ی <b>RULES.md</b> کنار بازی.' },
      ],
    },
    create: mk,
  });
})(typeof self !== 'undefined' ? self : this);
