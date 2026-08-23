/* ============================================================
   leagues/vacuum/maps/standard.js  —  the STANDARD reference house.

   Built to the organiser's map standard (see MAP-STANDARD.md):
     · furniture backs against the walls — no floating beds
     · 3 bedrooms + kitchen + living room (TV WITH a sofa facing
       it) + bathroom, on the 22x22 grid
     · exactly ONE room has the push-open DOOR — bedroom 1
       (room == 2); every other doorway is wide open (3 tiles)
     · one-colour (purple) marker rugs outside every entrance —
       FS and U14 read them; u19/rules.js filters them out (U19
       navigates by position, not colour)
     · the living-room rug is a different colour AND slows the
       robot (kind green); the wet pair is U14/U19 only

   فارسی: خانه‌ی مرجعِ استاندارد — مبل‌ها چسبیده به دیوار، فقط
   اتاق‌خواب ۱ (room == 2) در دارد، فرش‌های نشانه همه بنفش و فقط
   برای FS/U14؛ فرش سبز پذیرایی کندکننده است.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});

  const STANDARD = {
    v: 1, name: 'vacuum-standard-22', league: 'vacuum', cols: 22, rows: 22, tileSize: 0.625,
    surround: 'grass',
    objects: [
      // ---- the living room (east hall): TV on the east wall, sofa facing it ----
      { t: 'tv', x: 13.3, y: 6.2, w: 3.1, d: 0.9, rot: 1 },
      { t: 'sofa', x: 11.2, y: 6.2, w: 3.5, d: 0.95, rot: 3 },
      { t: 'plant', x: 13.4, y: 8.9, w: 0.6, d: 0.6, rot: 0 },
      { t: 'bench', x: 7.5, y: 0.4, w: 1.8, d: 0.55, rot: 0 },
      { t: 'trash', x: 8.5, y: 0.35, w: 0.45, d: 0.45, rot: 0 },
      { t: 'plant', x: 6.1, y: 13.4, w: 0.6, d: 0.6, rot: 0 },
      // ---- the kitchen (top-right): everything against the walls ----
      { t: 'kitchen', x: 10.5, y: 13.35, w: 2.2, d: 0.65, rot: 0 },
      { t: 'stove', x: 12.3, y: 13.35, w: 0.8, d: 0.65, rot: 0 },
      { t: 'fridge', x: 13.3, y: 13.3, w: 0.75, d: 0.75, rot: 0 },
      { t: 'dining', x: 11.0, y: 11.0, w: 1.4, d: 1.0, rot: 0 },
      { t: 'petbowl', x: 9.2, y: 9.8, w: 0.4, d: 0.4, rot: 0 },
      // ---- bedroom 1 (top-left, THE DOORED ROOM, room == 2) ----
      { t: 'bed', x: 1.3, y: 12.55, w: 2.0, d: 2.4, rot: 0 },
      { t: 'dresser', x: 0.35, y: 10.4, w: 0.9, d: 0.45, rot: 1 },
      { t: 'lamp', x: 5.1, y: 13.35, w: 0.5, d: 0.5, rot: 0 },
      // ---- bedroom 2 (bottom-left) ----
      { t: 'bed', x: 1.3, y: 1.2, w: 2.0, d: 2.4, rot: 2 },
      { t: 'dresser', x: 0.35, y: 3.6, w: 0.9, d: 0.45, rot: 1 },
      // ---- bedroom 3 (mid-left) ----
      { t: 'bed', x: 1.2, y: 6.875, w: 2.0, d: 2.4, rot: 3 },
      { t: 'dresser', x: 3.2, y: 9.05, w: 0.9, d: 0.45, rot: 0 },
      // ---- the bathroom (bottom-right) ----
      { t: 'toilet', x: 13.35, y: 2.5, w: 0.5, d: 0.7, rot: 1 },
      { t: 'bathtub', x: 11.9, y: 0.55, w: 1.6, d: 0.75, rot: 0 },
      { t: 'washer', x: 10.6, y: 2.7, w: 0.65, d: 0.65, rot: 0 },
      { t: 'trash', x: 13.45, y: 0.4, w: 0.4, d: 0.4, rot: 0 },
      // ---- THE door: bedroom 1's east doorway (room 2) ----
      { t: 'door', x: 5.625, y: 11.875, w: 1.25, d: 0.16, rot: 1 },
      // ---- a wall lamp for looks, and the U19 stations ----
      { t: 'sconce', x: 9.0, y: 13.6, w: 0.3, d: 0.18, rot: 0 },
      { t: 'dock', x: 13.15, y: 4.0, w: 1.1, d: 1.1, rot: 0 },
      { t: 'dump', x: 8.35, y: 13.4, w: 0.5, d: 0.5, rot: 0 },
    ],
    /* the doored room keeps a 2-tile doorway; every OPEN room gets 3 tiles */
    walls: [
      // bedroom 1 (doored): floor wall solid, east wall with the 2-tile gap
      { x: 2.8125, y: 9.375, w: 5.625, d: 0.15 },
      { x: 5.625, y: 10.3125, w: 0.15, d: 1.875 },
      { x: 5.625, y: 13.125, w: 0.15, d: 1.25 },
      // bedroom 3: east wall, 3-tile doorway y 5.9375..7.8125
      { x: 4.375, y: 5.15625, w: 0.15, d: 1.5625 },
      { x: 4.375, y: 8.59375, w: 0.15, d: 1.5625 },
      // bedroom 2: ceiling solid + east wall, 3-tile doorway y 1.5625..3.4375
      { x: 2.8125, y: 4.375, w: 5.625, d: 0.15 },
      { x: 5.625, y: 0.78125, w: 0.15, d: 1.5625 },
      { x: 5.625, y: 3.90625, w: 0.15, d: 0.9375 },
      // the kitchen: floor wall + west wall, 3-tile doorway y 10.625..12.5
      { x: 11.25, y: 9.375, w: 5.0, d: 0.15 },
      { x: 8.75, y: 10.0, w: 0.15, d: 1.25 },
      { x: 8.75, y: 13.125, w: 0.15, d: 1.25 },
      // the bathroom: ceiling + west wall, 3-tile doorway y 0.625..2.5
      { x: 11.875, y: 3.125, w: 3.75, d: 0.15 },
      { x: 10.0, y: 0.3125, w: 0.15, d: 0.625 },
      { x: 10.0, y: 2.8125, w: 0.15, d: 0.625 },
    ],
    rugs: [
      // the living-room rug: its own colour, and it SLOWS the robot
      { x: 7.1875, y: 6.5625, w: 3.125, d: 1.875, kind: 'green' },
      // ONE-COLOUR marker rugs outside every entrance (FS + U14 read them;
      // u19/rules.js strips them — U19 navigates by position)
      { x: 6.25, y: 11.875, w: 0.625, d: 0.625, kind: 'purple' },   // bedroom 1 (the door)
      { x: 5.0, y: 6.875, w: 0.625, d: 0.625, kind: 'purple' },     // bedroom 3
      { x: 6.25, y: 2.5, w: 0.625, d: 0.625, kind: 'purple' },      // bedroom 2
      { x: 8.125, y: 11.5625, w: 0.625, d: 0.625, kind: 'purple' }, // the kitchen
      { x: 9.375, y: 1.5625, w: 0.625, d: 0.625, kind: 'purple' },  // the bathroom
      // the wet pair (U14/U19; FS auto-dried): mirrored + tile-aligned
      { x: 6.875, y: 10.3125, w: 1.25, d: 0.625, kind: 'wet' },
      { x: 6.875, y: 3.4375, w: 1.25, d: 0.625, kind: 'wet' },
    ],
    spawns: {
      red: { x: 6.3, y: 1.1, rot: 0 }, blue: { x: 7.0, y: 12.9, rot: 2 },
      cat: { x: 10.2, y: 8.6, on: true }, dog: { x: 9.3, y: 4.2, on: true },
    },
    rooms: [
      { id: 1, name: 'kitchen', x1: 8.75, y1: 9.375, x2: 13.75, y2: 13.75 },
      { id: 2, name: 'bedroom 1 (door)', x1: 0, y1: 9.375, x2: 5.625, y2: 13.75 },
      { id: 3, name: 'bedroom 2', x1: 0, y1: 0, x2: 5.625, y2: 4.375 },
      { id: 4, name: 'bedroom 3', x1: 0, y1: 4.375, x2: 4.375, y2: 9.375 },
      { id: 5, name: 'bathroom', x1: 10.0, y1: 0, x2: 13.75, y2: 3.125 },
    ],
  };

  M.STANDARD = STANDARD;
})(typeof self !== 'undefined' ? self : this);
