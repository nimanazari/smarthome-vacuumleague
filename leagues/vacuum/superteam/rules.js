/* ============================================================
   leagues/vacuum/superteam/rules.js  —  the SUPERTEAM division.

   Not a fourth age group: the FINALS tier. The best teams of the
   event are combined into four super teams (SUPERTEAM 1..4) and
   play every one of the others once — six games, three each, and
   the table at the end is the whole story.

   So the rules are the hardest the league ships, and the floor is
   the organiser's own reference house rather than a teaching map:

     · everything U19 manages — pets, a real battery and its pad,
       water that costs charge, the stepped relocation penalty
     · the STANDARD competition house, with the doorway marker
       rugs stripped: at this level you navigate by POSITION, not
       by driving around looking for a coloured carpet
     · a longer clock — four minutes, because a super team has the
       tools to plan a whole route and should be given the time to
       show it

   فارسی: رده‌ی فینال. چهار سوپرتیم، هر کدام با هر سه‌تای دیگر یک
   بازی — شش بازی و سه بازی برای هر تیم. سخت‌ترین قوانین لیگ روی
   خانه‌ی استاندارد مسابقه، بدون فرش‌های نشانه: اینجا با مختصات
   مسیر می‌چینی، نه با دنبال‌کردن رنگ.
   ============================================================ */
(function (root) {
  'use strict';
  const L = root.Leagues;
  const { mk } = root.VacuumLeague;
  // the maps register themselves into VacuumMaps before league.js runs
  // (the `pre:` list in leagues/manifest.js), which is where STANDARD is
  const { STANDARD } = root.VacuumMaps;

  /* THE FINALS FLOOR: the standard house, minus the marker rugs, plus water.

     The marker rugs go for the same reason they go in U19 — a division that
     reads `x, y` has no business steering by carpet colour. The green rug
     stays, because it still costs half your speed and dodging it is a real
     decision. The water stays too and is drawn from the first second: at
     ten percent of the battery a puddle is worth planning around, and the
     coordinates are printed in the guide so there is no guessing. */
  const FINALS = Object.assign({}, STANDARD, {
    name: STANDARD.name + '-superteam',
    rugs: STANDARD.rugs.filter((r) => r.kind !== 'purple'),
  });

  L.register({
    id: 'superteam',
    program: 'leagues/vacuum/superteam/program.py',
    group: 'vacuum',
    map: FINALS,
    // the same route helper U19 uses: this division is about planning a
    // path by coordinate and guarding the charge while you drive it
    helper: 'leagues/vacuum/helper3/route.html',
    helperLabel: '&#128205; Route',
    code: 'SUPER',
    ready: true,
    accent: '#ff8c33',
    icon: '🏆',
    name: { en: 'Superteam', fa: 'سوپرتیم' },
    age: { en: 'the finals tier', fa: 'رده‌ی فینال' },
    blurb: {
      en: 'The finals. Four super teams, each playing all three others once — six games, three each, and the table decides it. Every rule the league has, on the standard competition house.',
      fa: 'فینال. چهار سوپرتیم که هرکدام با سه تیم دیگر یک بازی می‌کنند — شش بازی، سه بازی برای هر تیم، و جدول تصمیم می‌گیرد. همه‌ی قوانین لیگ، روی خانه‌ی استاندارد مسابقه.',
    },
    bullets: [
      { en: 'Four teams, six games: everybody plays everybody once', fa: 'چهار تیم، شش بازی: همه با همه، هرکدام یک بار' },
      { en: 'Four-minute matches — long enough to plan a whole route', fa: 'مسابقه‌ی چهار دقیقه‌ای — به‌اندازه‌ی چیدن یک مسیر کامل' },
      { en: 'No doorway marker rugs: navigate by x / y, not by colour', fa: 'بدون فرش نشانه‌ی در: با مختصات مسیر بچین، نه با رنگ' },
      { en: 'Battery, charging pad and water — every U19 rule, all on', fa: 'باتری، پد شارژ و آب — همه‌ی قوانین U19 برقرار' },
      { en: '3 points a win, 1 a draw — the league table decides the title', fa: '۳ امتیاز برد، ۱ مساوی — قهرمان را جدول تعیین می‌کند' },
    ],
    builder: false,
    defaults: { matchSeconds: 240 },
    guide: {
      title: { fa: 'قوانین سوپرتیم', en: 'Superteam rules' },
      sections: [
        { h: '🏆 این رده چیست؟', b: 'رده‌ی <b>فینال</b>. بهترین تیم‌های رویداد در چهار سوپرتیم ترکیب می‌شوند — <b>SUPERTEAM 1</b> تا <b>SUPERTEAM 4</b> — و هر تیم با هر سه تیم دیگر <b>یک بازی</b> می‌کند. یعنی در کل <b>شش بازی</b> و برای هر تیم <b>سه بازی</b>. قرعه‌کشی تعیین می‌کند چه کسی اول با چه کسی بازی کند.<br><small>EN: the finals tier — four super teams, a single round-robin: six games, three each.</small>' },
        { h: '📊 جدول', b: 'برد <b>۳ امتیاز</b>، مساوی <b>۱</b>، باخت <b>صفر</b>. در پایان، تیمی که بیشترین امتیاز را دارد قهرمان است؛ اگر امتیازها برابر شد، تفاضل کاشی و بعد کاشی‌های به‌دست‌آمده تصمیم می‌گیرد. جدول و نتایج در بخش مسابقات سایت وارد و دیده می‌شود.' },
        { h: '⏱ چهار دقیقه', b: 'مسابقه‌ی این رده <b>۲۴۰ ثانیه</b> است، نه ۱۸۰. یک سوپرتیم ابزار چیدن مسیر کامل را دارد و باید فرصت نشان‌دادنش را هم داشته باشد.' },
        { h: '🗺 خانه‌ی استاندارد، بدون فرش نشانه', b: 'زمین، خانه‌ی مرجعِ مسابقه است؛ ولی <b>فرش‌های بنفشِ نشانه‌ی در برداشته شده‌اند</b>. در این رده با <b>مختصات</b> مسیر می‌چینی — <code>x</code>، <code>y</code> و <code>goto(x, y)</code> — نه با دنبال‌کردن رنگ. فرش سبز پذیرایی سر جایش است و هنوز سرعتت را نصف می‌کند.' },
        { h: '🔋 باتری و شارژ', b: 'همان قانون U19: <b>battery</b> از ۱۰۰ شروع می‌شود و رانندگی با تمام سرعت حدود <b>۱٫۷٪ در ثانیه</b> می‌سوزاند. ایستگاه شارژ جای ثابتی دارد (<b>dockx</b>، <b>docky</b>) و روی پد <b>+۲۵٪ در ثانیه</b> می‌گیری. در صفر، ربات فقط می‌خزد (۱۵٪ سرعت) — هنوز می‌تواند خودش را به پد برساند، ولی خزیدن در طول خانه بیشترِ وقتِ باقی‌مانده‌ات را می‌خورد.' },
        { h: '💦 آب', b: 'لکه‌های آب از ثانیه‌ی اول روی زمین دیده می‌شوند و هر <b>ورود تازه</b> به آب <b>۱۰٪ باتری</b> می‌برد (کاشی از دست نمی‌دهی). ایستادن داخلش هزینه‌ی دوباره ندارد. راه درست دور زدن با مختصات است.' },
        { h: '🐈 بقیه‌ی قوانین', b: 'گربه و سگ مثل U14 در خانه می‌چرخند، <b>آخرین لمس مالک کاشی است</b> (کاشی حریف را می‌شود پس گرفت)، و جریمه‌ی جابه‌جایی پله‌ای است: <b>−۵</b>، بعد <b>−۱۰</b>، بعد <b>−۱۲</b> کاشی.' },
        { h: '🎓 آماده شدن', b: '<b>۱)</b> کد قهرمان U19 را بخوان — نزدیک‌ترین چیز به یک برنامه‌ی سوپرتیم است. <b>۲)</b> از <b>📍 هلپر مسیر</b> برای چیدن نقطه‌به‌نقطه و گذاشتن نگهبان باتری استفاده کن. <b>۳)</b> بعد از هر بازی <b>📊 گزارش</b> را بخوان: می‌گوید کجا وقت تلف کرده‌ای و کدام درس را باید مرور کنی.' },
      ],
    },
    // every U19 rule, unchanged. The dust dump stays OFF for the same reason
    // it is off in U19 -- until the route helper can plan an emptying trip,
    // a full bin is luck rather than a decision a team can prepare for.
    rules: { pets: true, wet: true, waterBattery: 10, penalty: [5, 10, 12], battery: true, dump: false },
    create: mk,
  });
})(typeof self !== 'undefined' ? self : this);
