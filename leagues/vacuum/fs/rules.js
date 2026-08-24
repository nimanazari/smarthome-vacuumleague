/* ============================================================
   leagues/vacuum/fs/rules.js  —  the FS sub-league.

   Just the switches that make this division different. The rule
   engine itself lives one folder up, in league.js; the program the
   editor loads for this division sits next to this file.
   ============================================================ */
(function (root) {
  'use strict';
  const L = root.Leagues;
  const { mk, GROWN_ROOMS } = root.VacuumLeague;

  // FS plays the same house with the PUDDLES MOPPED UP. `wet: false` already
  // switches the penalty off, but leaving the water on the floor would still
  // give an 8-year-old tiles that never turn their colour however often they
  // drive over them — and the colour sensor reads a puddle as plain white, so
  // there is nothing on screen to explain why. Filtering the wet rugs out here
  // is what makes "no wet floor" literally true, and it touches nothing but
  // this division: HOUSE itself is left exactly as league.js declares it.
  const DRY_HOUSE = Object.assign({}, GROWN_ROOMS, {
    name: GROWN_ROOMS.name + '-fs',
    rugs: GROWN_ROOMS.rugs.filter((r) => r.kind !== 'wet'),
  });

  L.register({
    id: 'fs',
    // the program this sub-league loads into the editor — it lives
    // next to this file, so changing it changes nothing anywhere else
    program: 'leagues/vacuum/fs/program.py',
    group: 'vacuum',
    map: DRY_HOUSE,
    code: 'FS',
    ready: true,
    accent: '#4fc3f7',
    icon: '🧹',
    name: { en: 'First Step', fa: 'فرست استپ' },
    age: { en: 'ages 8 – 11', fa: '۸ تا ۱۱ سال' },
    blurb: {
      en: 'A quiet house and a first robot. Drive, find the white floor and clean it — nothing else can go wrong.',
      fa: 'یک خانه‌ی آرام و اولین ربات. حرکت کن، کف سفید را پیدا کن و تمیزش کن — هیچ چیز دیگری خراب نمی‌شود.',
    },
    bullets: [
      { en: 'No cat and no dog in the house', fa: 'بدون گربه و سگ در خانه' },
      { en: 'No wet floor to punish you', fa: 'بدون کف خیس و جریمه‌اش' },
      { en: 'Gentle 2-tile penalty if the referee moves you', fa: 'جریمه‌ی ملایم ۲ کاشی برای جابه‌جایی داور' },
      { en: '2-minute matches', fa: 'مسابقه‌های ۲ دقیقه‌ای' },
    ],
    // the in-game rulebook: the 📖 button on the setup page renders whatever
    // a division declares here — Persian first, one section per idea
    guide: {
      title: { fa: 'قوانین فرست استپ', en: 'First Step rules' },
      sections: [
        { h: '🎯 هدف بازی', b: 'دو ربات، یک خانه. از روی هر کاشیِ کف که رد شوی رنگِ تیم تو را می‌گیرد و <b>یک امتیاز</b> است. از روی کاشیِ حریف رد شوی، پس گرفته‌ای! آخرِ وقت، هر کس کاشیِ بیشتری دارد برنده است.<br><small>EN: every tile you drive over turns your colour; last touch wins the tile.</small>' },
        { h: '⏱ زمان', b: 'مسابقه‌ی FS «۲ دقیقه» است. اگر مساوی شد، بازی تمام نمی‌شود: اول +۱۰ ثانیه، بعد هر بار +۵ ثانیه — تا مجموع ۳۵ ثانیه وقت اضافه. باز هم مساوی؟ نتیجه تساوی ثبت می‌شود.' },
        { h: '🤖 ربات FS', b: 'همه با <b>یک ربات یکسان</b> بازی می‌کنند: سه چشمِ جلو، حلقه‌ی سپر (دو نیمه) و سنسور رنگ — نه بیشتر. تنها انتخاب تو، رنگ تیم است. برنامه را هم می‌توانی بدون تایپ در صفحه‌ی «🤖 AI» بسازی.' },
        { h: '🧹 خانه‌ی آرام', b: 'در FS خبری از گربه، سگ و کفِ خیس نیست — فقط تو، مبل‌ها و کف. دو فرش (سبز بزرگ و بنفش کوچک) امتیاز نمی‌دهند؛ فرش سبز سرعتت را هم نصف می‌کند.' },
        { h: '⚖️ جریمه‌ها', b: 'رباتی که <b>۱۰ ثانیه</b> در یک دایره‌ی کوچک گیر کند، داور جابه‌جایش می‌کند و <b>۲ کاشی</b> از او کم می‌شود (در FS فقط ۲ تا — بقیه‌ی رده‌ها ۵ تا!). داور با دکمه‌ی منو هم می‌تواند جابه‌جا کند، با همان جریمه.' },
        { h: '🎓 از کجا شروع کنم؟', b: 'مسیر پیشنهادی: <b>۱)</b> دکمه‌ی «🎓 آموزش» — شش درس کوتاه با اجرای زنده. <b>۲)</b> «🏆 چالش فنی» — پله‌پله قبول شو. <b>۳)</b> کد کامل «🏆 قهرمان FS» را از منوی ربات‌ها باز کن و بخوان. <b>۴)</b> مسابقه بده و بعدش «📊 گزارش مسابقه» را ببین تا بفهمی کجا وقت تلف شد.' },
        { h: '🧭 حس‌های ربات · The senses', b: 'ربات FS دقیقاً شش چیز حس می‌کند — سه سنسور فاصله رو به جلو، حلقه‌ی سپر و سنسور رنگ — به‌علاوه‌ی آنچه خانه می‌گوید (room و clean). قطب‌نما و GPS مال رده‌های بالاترند.<br><small>EN: exactly six senses — three forward ultrasonic sensors, the bumper ring and the colour sensor — plus what the HOUSE reports (room, clean). Compass and GPS start at U14/U19.</small>' + "<table><tr><th>python</th><th>چیست · what</th></tr><tr><td><code>front / frontleft / frontright</code></td><td>سنسور فاصله (اولتراسونیک)، سانتی\u200cمتر؛ عدد کوچک\u200cتر = نزدیک\u200cتر؛ بیشینه ۲۰۰ · ultrasonic distance, cm; smaller = closer; max 200</td></tr><tr><td><code>bumperfront / bumperback / bumper</code></td><td>دو نیمه\u200cی حلقه\u200cی سپر و «هر کدام» · the ring's two halves, and either</td></tr><tr><td><code>color</code></td><td>رنگ کفِ جلوی ربات · the floor just ahead: <code>white</code> تمیزنشده، <code>red/blue</code> مال ربات\u200cها، <code>green</code> فرش بزرگ (نصف سرعت)، <code>purple/orange/cyan</code> فرش\u200cهای نشانه\u200cی درها، <code>black</code> دیوار/مبل</td></tr><tr><td><code>room</code>, <code>clean1..clean5</code></td><td>شماره\u200cی اتاق و درصد تمیزیِ هر اتاق برای من · which room I am in, and each room's clean-% for me (0 هال · 1 آشپزخانه · 2/3/4 خواب\u200cها · 5 سرویس)</td></tr><tr><td><code>timer</code>, <code>movetime</code>, <code>state</code>, <code>nextmove</code></td><td>حافظه\u200cی بین قدم\u200cها؛ movetime چرخ\u200cها را نگه می\u200cدارد · step-to-step memory; movetime holds the wheels</td></tr><tr><td><code>mytiles / rivaltiles / timeleft</code></td><td>کاشی\u200cهای من/حریف و ثانیه\u200cهای مانده · tiles owned and seconds left</td></tr><tr><td><code>wheelleft / wheelright</code></td><td>فرمان چرخ\u200cها، −۲۵..۲۵ · the wheel commands, −25..25</td></tr><tr><td><code>forward(s) backward(s) turnleft(s) turnright(s) stop(s)</code></td><td>حرکت\u200cهای آسان؛ عدد = ثانیه\u200cی واقعی · easy moves; the number is real seconds</td></tr>" },
        { h: '⚖️ Rules at a glance (EN)', b: 'Every floor tile you drive over turns your colour and scores one point; LAST TOUCH owns the tile. Stuck for 15 s in one small circle → the referee relocates you at a penalty. Wet floor (U14/U19): −2 tiles per entry. Green rug: half speed, no points. Purple / orange / cyan rugs: doorway markers — no points, full speed. Draw → +10 s then +5 s steps up to 35 s of overtime. The full referee book with every number is <b>RULES.md</b> beside the game.' },
        { h: '📚 متن کامل', b: 'کتابچه‌ی کامل داوری (همه‌ی اعداد، همه‌ی حالت‌ها) در پرونده‌ی <b>RULES.md</b> کنار بازی است — هر عددِ آن مستقیم از همین کد خوانده شده.' },
      ],
    },
    // FS builds no robot: every 8-year-old drives the SAME machine — the fixed
    // rig in kit.js — and the only choice is the team colour on the setup page.
    // The chosen colour paints the shell AND the tiles it cleans.
    builder: false,
    defaults: { matchSeconds: 120 },
    rules: { pets: false, wet: false, penalty: 2, battery: false },

    // ---- what an FS robot can feel ----
    // The bottom rung of the ladder senses what is right in front of it and
    // what it has run into — three eyes forward, the colour of the floor ahead,
    // and the bumper ring (front half and back half). Side and rear
    // rangefinders, the compass and the GPS are U14's, not FS's. The rig itself
    // lives in kit.js next door, because the helper page reads the same object.
    kit: root.VacuumFsKit,

    // ---- the helper: a PAGE OF ITS OWN ----
    // An 8-to-11-year-old should never meet an empty editor — but he does not
    // need a strip of forward/backward blocks either. He needs to answer one
    // question per sensor: "this eye just saw a wall, which way do I go?".
    // That question, the picture of his real sensor rig and the animation that
    // answers it live in helper.html, on their own URL. The game only opens the
    // link and takes the Python back; declaring `helper` is the whole contract.
    helper: 'leagues/vacuum/helper/helper.html',

    // ---- the SECOND helper: the BLOCKS page ----
    // Scratch-style stacks that compile to the very same rules file the AI
    // helper saves (one storage key, two views) — so blocks ⇆ AI rules ⇆
    // Python convert freely. It exports .py AND a blocks .json file.
    helper2: 'leagues/vacuum/helper2/blocks.html',

    // ---- the block-coding app, as THIS division wants it ----
    // The older 🧩 app in fsapp/ still works and is still described here: it is
    // what the setup button falls back to when a division declares no `helper`.
    blocks: {
      intro: 'Stack blocks or just say it — your robot drives off, and every tile it crosses turns your colour.',
      moves: ['forward', 'backward', 'turnright', 'turnleft', 'stop'],
      // FS has three front eyes and a bumper, so it can notice a wall and a
      // knock. The colour block is in because the floor IS the game here:
      // white is dirty, your own colour is already cleaned.
      conds: ['wall', 'bump', 'color'],
    },
    create: mk,
  });
})(typeof self !== 'undefined' ? self : this);
