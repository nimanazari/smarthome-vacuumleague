/* ============================================================
   leagues/vacuum/maps/courtyard.js  —  the COURTYARD house (22x22).

   Built to the organiser's map standard (MAP-STANDARD.md), with a
   floor plan that shares NOTHING with the standard house:
     · the living room is a SQUARE IN THE MIDDLE of the house, and
       every other room opens onto it — like rooms around a
       courtyard; a foyer in the south-east is where the robots
       start
     · kitchen north-west, bedroom 1 north-east, bedroom 2 west,
       bedroom 3 east, bathroom south-west
     · the ONE push-open door belongs to the north-east bedroom —
       room == 2, as in every official map
     · purple marker rugs outside every entrance (FS + U14),
       the green living rug slows, no wet floor anywhere

   فارسی: خانه‌ی حیاط‌مرکزی — پذیرایی مربعی وسط خانه و همه‌ی
   اتاق‌ها دورش؛ ورودی (فویه) در جنوب‌شرق جای شروع ربات‌هاست.
   فقط اتاق‌خواب شمال‌شرق (room == 2) در دارد.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});

  const COURTYARD = {
    v: 1, name: 'vacuum-courtyard-22', league: 'vacuum', cols: 22, rows: 22, tileSize: 0.625,
    surround: 'grass',
    objects: [
      // ---- the central living room: TV on the EAST wall, sofa facing it ----
      { t: 'tv', x: 9.6, y: 5.0, w: 3.1, d: 0.9, rot: 1 },
      { t: 'sofa', x: 7.5, y: 5.0, w: 3.0, d: 0.95, rot: 3 },
      { t: 'plant', x: 4.1, y: 9.6, w: 0.6, d: 0.6, rot: 0 },
      { t: 'lamp', x: 4.1, y: 4.1, w: 0.5, d: 0.5, rot: 0 },
      // ---- the foyer (south-east) ----
      { t: 'bench', x: 9.0, y: 0.4, w: 1.8, d: 0.55, rot: 0 },
      { t: 'plant', x: 13.4, y: 0.4, w: 0.6, d: 0.6, rot: 0 },
      { t: 'trash', x: 13.45, y: 3.4, w: 0.4, d: 0.4, rot: 0 },
      // ---- the kitchen (north-west): counters along the north wall ----
      { t: 'kitchen', x: 1.5, y: 13.4, w: 2.2, d: 0.65, rot: 0 },
      { t: 'stove', x: 3.1, y: 13.4, w: 0.8, d: 0.65, rot: 0 },
      { t: 'fridge', x: 3.95, y: 13.35, w: 0.75, d: 0.75, rot: 0 },
      { t: 'dining', x: 2.6, y: 11.4, w: 1.4, d: 1.0, rot: 0 },
      { t: 'petbowl', x: 6.45, y: 13.3, w: 0.4, d: 0.4, rot: 0 },
      { t: 'trash', x: 0.35, y: 10.4, w: 0.4, d: 0.4, rot: 0 },
      // ---- bedroom 1 (north-east, THE DOORED ROOM, room == 2) ----
      { t: 'bed', x: 12.5, y: 12.55, w: 2.0, d: 2.4, rot: 0 },
      { t: 'desk', x: 9.2, y: 13.0, w: 1.5, d: 1.4, rot: 0 },
      { t: 'dresser', x: 7.2, y: 12.5, w: 0.9, d: 0.45, rot: 1 },
      { t: 'lamp', x: 10.4, y: 10.4, w: 0.5, d: 0.5, rot: 0 },
      // ---- bedroom 2 (west): bed along the west wall ----
      { t: 'bed', x: 1.2, y: 8.4, w: 2.0, d: 2.4, rot: 3 },
      { t: 'dresser', x: 1.2, y: 4.05, w: 0.9, d: 0.45, rot: 0 },
      { t: 'bookshelf', x: 2.2, y: 9.7, w: 1.8, d: 0.45, rot: 0 },
      // ---- bedroom 3 (east): bed along the east wall ----
      { t: 'bed', x: 12.55, y: 5.0, w: 2.0, d: 2.4, rot: 1 },
      { t: 'dresser', x: 12.5, y: 9.7, w: 0.9, d: 0.45, rot: 0 },
      { t: 'plant', x: 10.4, y: 4.1, w: 0.6, d: 0.6, rot: 0 },
      // ---- the bathroom (south-west), opening east onto the foyer ----
      { t: 'bathtub', x: 1.2, y: 0.55, w: 1.6, d: 0.75, rot: 0 },
      { t: 'toilet', x: 0.4, y: 2.5, w: 0.5, d: 0.7, rot: 1 },
      { t: 'washer', x: 4.8, y: 0.7, w: 0.65, d: 0.65, rot: 0 },
      { t: 'trash', x: 5.3, y: 3.4, w: 0.4, d: 0.4, rot: 0 },
      // ---- THE door: the north-east bedroom's south doorway (room 2) ----
      { t: 'door', x: 8.125, y: 10.0, w: 1.25, d: 0.16, rot: 0 },
      // ---- a wall lamp for looks, and the U19 stations ----
      { t: 'sconce', x: 11.0, y: 3.6, w: 0.3, d: 0.18, rot: 0 },
      { t: 'dock', x: 12.5, y: 2.0, w: 1.1, d: 1.1, rot: 0 },
      { t: 'dump', x: 6.2, y: 3.3, w: 0.5, d: 0.5, rot: 0 },
    ],
    /* the doored room keeps a 2-tile doorway; every OPEN room gets 3 tiles */
    walls: [
      // the kitchen: floor wall (y 10) with the doorway x 4.375..6.25; east wall solid
      { x: 2.1875, y: 10.0, w: 4.375, d: 0.15 },
      { x: 6.5625, y: 10.0, w: 0.625, d: 0.15 },
      { x: 6.875, y: 11.875, w: 0.15, d: 3.75 },
      // bedroom 1 (doored): floor wall (y 10) with the 2-tile gap x 7.5..8.75
      { x: 7.1875, y: 10.0, w: 0.625, d: 0.15 },
      { x: 11.25, y: 10.0, w: 5.0, d: 0.15 },
      // bedroom 2 (west): east wall (x 3.75) with the doorway y 5.625..7.5
      { x: 3.75, y: 4.6875, w: 0.15, d: 1.875 },
      { x: 3.75, y: 8.75, w: 0.15, d: 2.5 },
      // bedroom 3 (east): west wall (x 10) with the doorway y 7.5..9.375; floor wall solid
      { x: 10.0, y: 5.625, w: 0.15, d: 3.75 },
      { x: 10.0, y: 9.6875, w: 0.15, d: 0.625 },
      { x: 11.875, y: 3.75, w: 3.75, d: 0.15 },
      // the bathroom: ceiling solid; east wall (x 5.625) with the doorway y 1.25..3.125
      { x: 2.8125, y: 3.75, w: 5.625, d: 0.15 },
      { x: 5.625, y: 0.625, w: 0.15, d: 1.25 },
      { x: 5.625, y: 3.4375, w: 0.15, d: 0.625 },
    ],
    rugs: [
      // the living-room rug: its own colour, and it SLOWS the robot
      { x: 6.875, y: 8.4, w: 3.125, d: 1.875, kind: 'green' },
      // ONE-COLOUR marker rugs outside every entrance (FS + U14 read them;
      // u19/rules.js strips them — U19 navigates by position)
      { x: 5.3125, y: 9.6875, w: 0.625, d: 0.625, kind: 'purple' },   // the kitchen
      { x: 8.125, y: 9.6875, w: 0.625, d: 0.625, kind: 'purple' },    // bedroom 1 (the door)
      { x: 4.0625, y: 6.5625, w: 0.625, d: 0.625, kind: 'purple' },   // bedroom 2 (west)
      { x: 9.6875, y: 8.4375, w: 0.625, d: 0.625, kind: 'purple' },   // bedroom 3 (east)
      { x: 5.9375, y: 2.1875, w: 0.625, d: 0.625, kind: 'purple' },   // the bathroom
    ],
    spawns: {
      red: { x: 7.0, y: 1.5, rot: 0 }, blue: { x: 5.0, y: 8.5, rot: 2 },
      cat: { x: 8.0, y: 8.5, on: true }, dog: { x: 11.5, y: 1.2, on: true },
    },
    rooms: [
      { id: 1, name: 'kitchen', x1: 0, y1: 10.0, x2: 6.875, y2: 13.75 },
      { id: 2, name: 'bedroom 1 (door)', x1: 6.875, y1: 10.0, x2: 13.75, y2: 13.75 },
      { id: 3, name: 'bedroom 2', x1: 0, y1: 3.75, x2: 3.75, y2: 10.0 },
      { id: 4, name: 'bedroom 3', x1: 10.0, y1: 3.75, x2: 13.75, y2: 10.0 },
      { id: 5, name: 'bathroom', x1: 0, y1: 0, x2: 5.625, y2: 3.75 },
    ],
  };

  M.COURTYARD = COURTYARD;
})(typeof self !== 'undefined' ? self : this);
