/* ============================================================
   leagues/vacuum/fs/kit.js  —  the FS robot's sensor rig.

   ONE source of truth for what an 8-to-11-year-old's robot can
   feel. `rules.js` hands it to the engine as this division's
   `kit:`, and `helper.html` reads the same object to know which
   questions to ask. Change it here and both follow.

   FS is the reaction rung of the ladder: it senses what is right
   in front of it and what it has already run into, and nothing
   else. No side or rear rangefinders, no compass, no GPS — those
   are what U14 opens up.

       three eyes forward   frontleft · front · frontright
       one colour sensor    the floor just ahead
       a bumper ring        which reads as bumperfront / bumperback

   The ring is one part, as it is on a real robot: a strip round
   the shell. What the code gets is which HALF of it was pressed,
   so "I hit something in front" and "somebody backed into me" are
   two different questions — the two bumpers of the FS rules.
   ============================================================ */
(function (root) {
  'use strict';

  // angle: degrees around the shell, 0 = straight ahead, + = left (CCW).
  // The FS eyes sit at a round ±30° — a number a child can say and check —
  // still inside the 22° tolerance around the classic 25.8° slots, so they
  // keep their frontleft / frontright names everywhere.
  root.VacuumFsKit = {
    parts: [
      { type: 'dist', angle: 30 },       // frontleft
      { type: 'dist', angle: 0 },        // front
      { type: 'dist', angle: -30 },      // frontright
      { type: 'bumper' },                // -> bumperfront + bumperback
      { type: 'color' },                 // the floor just ahead of the nose
    ],
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.VacuumFsKit;
})(typeof self !== 'undefined' ? self : this);
