/* ============================================================
   leagues/vacuum/maps/corridor.js  —  the CORRIDOR house (22x22).

   Built to the organiser's map standard (MAP-STANDARD.md), with a
   floor plan that shares NOTHING with the standard house:
     · a wide living corridor runs EAST–WEST through the middle
     · the three bedrooms sit side by side along the NORTH wall
     · the kitchen (west) and the bathroom (east) share the SOUTH
       band, with a little bench nook between them
     · the ONE push-open door belongs to the MIDDLE bedroom —
       room == 2, as in every official map, so a program that
       targets "the doored room" keeps working here
     · purple marker rugs outside every entrance (FS + U14),
       the green living rug slows, no wet floor anywhere

   فارسی: خانه‌ی راهرودار — پذیرایی راهرویی پهن وسط خانه، سه
   اتاق‌خواب کنار هم بالا، آشپزخانه و سرویس پایین. فقط اتاق‌خواب
   وسط (room == 2) در دارد.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});

  const CORRIDOR = {
    v: 1, name: 'vacuum-corridor-22', league: 'vacuum', cols: 22, rows: 22, tileSize: 0.625,
    surround: 'grass',
    objects: [
      // ---- the living corridor: TV on the WEST wall, sofa facing it ----
      { t: 'tv', x: 0.45, y: 6.875, w: 3.1, d: 0.9, rot: 1 },
      { t: 'sofa', x: 2.7, y: 6.875, w: 3.5, d: 0.95, rot: 1 },
      { t: 'plant', x: 13.4, y: 4.75, w: 0.6, d: 0.6, rot: 0 },
      { t: 'trash', x: 13.4, y: 9.0, w: 0.45, d: 0.45, rot: 0 },
      { t: 'bookshelf', x: 10.0, y: 9.1, w: 1.8, d: 0.45, rot: 0 },
      // ---- the bench nook between kitchen and bathroom ----
      { t: 'bench', x: 7.8, y: 0.4, w: 1.8, d: 0.55, rot: 0 },
      // ---- the kitchen (south-west): counters along the south wall ----
      { t: 'kitchen', x: 1.5, y: 0.35, w: 2.2, d: 0.65, rot: 0 },
      { t: 'stove', x: 3.1, y: 0.35, w: 0.8, d: 0.65, rot: 0 },
      { t: 'fridge', x: 3.95, y: 0.4, w: 0.75, d: 0.75, rot: 0 },
      { t: 'dining', x: 2.0, y: 2.6, w: 1.4, d: 1.0, rot: 0 },
      { t: 'petbowl', x: 5.9, y: 0.4, w: 0.4, d: 0.4, rot: 0 },
      { t: 'trash', x: 0.35, y: 4.0, w: 0.4, d: 0.4, rot: 0 },
      // ---- bedroom 2 (north-west) ----
      { t: 'bed', x: 1.3, y: 12.55, w: 2.0, d: 2.4, rot: 0 },
      { t: 'dresser', x: 0.35, y: 10.5, w: 0.9, d: 0.45, rot: 1 },
      { t: 'lamp', x: 3.9, y: 13.4, w: 0.5, d: 0.5, rot: 0 },
      // ---- bedroom 1 (north-middle, THE DOORED ROOM, room == 2) ----
      { t: 'bed', x: 6.875, y: 12.55, w: 2.0, d: 2.4, rot: 0 },
      { t: 'bookshelf', x: 9.15, y: 11.0, w: 1.8, d: 0.45, rot: 1 },
      { t: 'lamp', x: 4.7, y: 13.4, w: 0.5, d: 0.5, rot: 0 },
      // ---- bedroom 3 (north-east): bed along the east wall ----
      { t: 'bed', x: 12.55, y: 12.5, w: 2.0, d: 2.4, rot: 1 },
      { t: 'dresser', x: 10.3, y: 13.5, w: 0.9, d: 0.45, rot: 0 },
      // ---- the bathroom (south-east) ----
      { t: 'bathtub', x: 11.9, y: 0.55, w: 1.6, d: 0.75, rot: 0 },
      { t: 'toilet', x: 13.35, y: 2.5, w: 0.5, d: 0.7, rot: 1 },
      { t: 'washer', x: 9.75, y: 0.7, w: 0.65, d: 0.65, rot: 0 },
      { t: 'trash', x: 13.45, y: 3.9, w: 0.4, d: 0.4, rot: 0 },
      // ---- THE door: the middle bedroom's south doorway (room 2) ----
      { t: 'door', x: 6.875, y: 9.375, w: 1.25, d: 0.16, rot: 0 },
      // ---- a wall lamp for looks, and the U19 stations ----
      { t: 'sconce', x: 11.5, y: 9.3, w: 0.3, d: 0.18, rot: 0 },
      { t: 'dock', x: 13.15, y: 6.875, w: 1.1, d: 1.1, rot: 0 },
      { t: 'dump', x: 6.9, y: 4.7, w: 0.5, d: 0.5, rot: 0 },
    ],
    /* the doored room keeps a 2-tile doorway; every OPEN room gets 3 tiles */
    walls: [
      // the north band's floor wall (y 9.375) — three bedrooms
      { x: 0.625, y: 9.375, w: 1.25, d: 0.15 },      // bedroom 2: doorway x 1.25..3.125
      { x: 3.75, y: 9.375, w: 1.25, d: 0.15 },
      { x: 5.3125, y: 9.375, w: 1.875, d: 0.15 },    // bedroom 1 (door): gap x 6.25..7.5
      { x: 8.4375, y: 9.375, w: 1.875, d: 0.15 },
      { x: 10.0, y: 9.375, w: 1.25, d: 0.15 },       // bedroom 3: doorway x 10.625..12.5
      { x: 13.125, y: 9.375, w: 1.25, d: 0.15 },
      // the dividers between the bedrooms
      { x: 4.375, y: 11.5625, w: 0.15, d: 4.375 },
      { x: 9.375, y: 11.5625, w: 0.15, d: 4.375 },
      // the kitchen: ceiling (y 4.375) with the doorway x 2.5..4.375, east wall solid
      { x: 1.25, y: 4.375, w: 2.5, d: 0.15 },
      { x: 5.3125, y: 4.375, w: 1.875, d: 0.15 },
      { x: 6.25, y: 2.1875, w: 0.15, d: 4.375 },
      // the bathroom: ceiling with the doorway x 10.625..12.5, west wall solid
      { x: 10.0, y: 4.375, w: 1.25, d: 0.15 },
      { x: 13.125, y: 4.375, w: 1.25, d: 0.15 },
      { x: 9.375, y: 2.1875, w: 0.15, d: 4.375 },
    ],
    rugs: [
      // the living-room rug: its own colour, and it SLOWS the robot
      { x: 6.0, y: 6.875, w: 3.125, d: 1.875, kind: 'green' },
      // ONE-COLOUR marker rugs outside every entrance (FS + U14 read them;
      // u19/rules.js strips them — U19 navigates by position)
      { x: 2.1875, y: 9.0625, w: 0.625, d: 0.625, kind: 'purple' },   // bedroom 2
      { x: 6.875, y: 9.0625, w: 0.625, d: 0.625, kind: 'purple' },    // bedroom 1 (the door)
      { x: 11.5625, y: 9.0625, w: 0.625, d: 0.625, kind: 'purple' },  // bedroom 3
      { x: 3.4375, y: 4.6875, w: 0.625, d: 0.625, kind: 'purple' },   // the kitchen
      { x: 11.5625, y: 4.6875, w: 0.625, d: 0.625, kind: 'purple' },  // the bathroom
    ],
    spawns: {
      red: { x: 5.0, y: 5.0, rot: 0 }, blue: { x: 8.75, y: 8.75, rot: 2 },
      cat: { x: 10.0, y: 7.0, on: true }, dog: { x: 4.5, y: 8.5, on: true },
    },
    rooms: [
      { id: 1, name: 'kitchen', x1: 0, y1: 0, x2: 6.25, y2: 4.375 },
      { id: 2, name: 'bedroom 1 (door)', x1: 4.375, y1: 9.375, x2: 9.375, y2: 13.75 },
      { id: 3, name: 'bedroom 2', x1: 0, y1: 9.375, x2: 4.375, y2: 13.75 },
      { id: 4, name: 'bedroom 3', x1: 9.375, y1: 9.375, x2: 13.75, y2: 13.75 },
      { id: 5, name: 'bathroom', x1: 9.375, y1: 0, x2: 13.75, y2: 4.375 },
    ],
  };

  M.CORRIDOR = CORRIDOR;
})(typeof self !== 'undefined' ? self : this);
