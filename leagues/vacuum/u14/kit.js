/* ============================================================
   leagues/vacuum/u14/kit.js  —  the U14 robot's sensor rig.

   ONE source of truth for what an 11-to-14-year-old's robot can
   feel: FS's rig PLUS the compass. `rules.js` hands it to the
   engine as this division's `kit:`, and the helper page reads the
   same object. Change it here and both follow.

   U14 senses  ·  حس‌های ربات U14:
       three eyes forward      frontleft · front · frontright
       one colour sensor       the floor just ahead   (color)
       a bumper ring           bumperfront / bumperback
       the compass             heading, 0..359 deg
                               (0 = right, 90 = up, 180 = left, 270 = down)
   ...and, on maps with rooms, the HOUSE tells it:
       room                    which numbered room I am in (0 = the hall)
       clean1..clean5          how much of that room wears MY colour, %

   GPS and goto() stay out — they are U19's builder toys.
   فارسی: کیت U14 = کیت FS + قطب‌نما. GPS و goto مال U19 است؛
   room و clean1..clean5 را خودِ خانه (نقشه‌ی اتاق‌دار) می‌دهد.
   ============================================================ */
(function (root) {
  'use strict';
  root.VacuumU14Kit = {
    parts: [
      { type: 'dist', angle: 30 },       // frontleft
      { type: 'dist', angle: 0 },        // front
      { type: 'dist', angle: -30 },      // frontright
      { type: 'bumper' },                // -> bumperfront + bumperback
      { type: 'color' },                 // the floor just ahead of the nose
      { type: 'compass' },               // -> heading, 0..359
    ],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VacuumU14Kit;
})(typeof self !== 'undefined' ? self : this);
