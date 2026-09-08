/* ============================================================
   leagues/vacuum/maps/villa.js  —  the VILLA house (22x22).

   Built to the organiser's map standard (MAP-STANDARD.md), with a
   floor plan that shares NOTHING with the standard house:
     · an L-shaped living room fills the SOUTH-WEST, wrapping into
       a hallway that climbs the east side of the house
     · the kitchen and the bathroom sit in the NORTH-WEST
     · the three bedrooms are STACKED down the EAST wall, each
       opening west onto the hallway
     · the ONE push-open door belongs to the MIDDLE bedroom —
       room == 2, as in every official map
     · purple marker rugs outside every entrance (FS + U14),
       the green living rug slows, no wet floor anywhere

   فارسی: خانه‌ی ویلایی — پذیرایی L شکل در جنوب‌غرب که به راهروی
   شرقی وصل می‌شود؛ آشپزخانه و سرویس در شمال‌غرب؛ سه اتاق‌خواب
   روی هم کنار دیوار شرقی. فقط اتاق وسط (room == 2) در دارد.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});

  const VILLA = {
    v: 1, name: 'vacuum-villa-22', league: 'vacuum', cols: 22, rows: 22, tileSize: 0.625,
    surround: 'stone',
    objects: [
      // ---- the living room (south-west): TV on the SOUTH wall, sofa facing it ----
      { t: 'tv', x: 4.0, y: 0.45, w: 3.1, d: 0.9, rot: 0 },
      { t: 'sofa', x: 4.0, y: 2.6, w: 3.5, d: 0.95, rot: 2 },
      { t: 'armchair', x: 0.55, y: 2.5, w: 1.1, d: 0.95, rot: 1 },
      { t: 'bookshelf', x: 0.25, y: 5.0, w: 1.8, d: 0.45, rot: 1 },
      { t: 'piano', x: 7.7, y: 1.9, w: 1.5, d: 0.65, rot: 1 },
      { t: 'plant', x: 7.8, y: 0.4, w: 0.6, d: 0.6, rot: 0 },
      // ---- the hallway band under the kitchen ----
      { t: 'bench', x: 4.8, y: 8.4, w: 1.8, d: 0.55, rot: 0 },
      { t: 'trash', x: 0.35, y: 8.4, w: 0.45, d: 0.45, rot: 0 },
      // ---- the kitchen (north-west): counters along the north wall ----
      { t: 'kitchen', x: 1.5, y: 13.4, w: 2.2, d: 0.65, rot: 0 },
      { t: 'stove', x: 3.1, y: 13.4, w: 0.8, d: 0.65, rot: 0 },
      { t: 'fridge', x: 3.95, y: 13.35, w: 0.75, d: 0.75, rot: 0 },
      { t: 'dining', x: 2.6, y: 11.0, w: 1.4, d: 1.0, rot: 0 },
      { t: 'petbowl', x: 5.2, y: 9.2, w: 0.4, d: 0.4, rot: 0 },
      { t: 'trash', x: 0.35, y: 9.1, w: 0.4, d: 0.4, rot: 0 },
      // ---- the bathroom (north-middle), opening east onto the hallway ----
      { t: 'bathtub', x: 6.875, y: 13.35, w: 1.6, d: 0.75, rot: 0 },
      { t: 'toilet', x: 5.95, y: 10.0, w: 0.5, d: 0.7, rot: 1 },
      { t: 'washer', x: 5.99, y: 12.2, w: 0.65, d: 0.65, rot: 0 },
      { t: 'trash', x: 7.85, y: 9.1, w: 0.4, d: 0.4, rot: 0 },
      // ---- bedroom 1 (east, MIDDLE — THE DOORED ROOM, room == 2) ----
      { t: 'bed', x: 12.55, y: 6.875, w: 2.0, d: 2.4, rot: 1 },
      { t: 'dresser', x: 10.9, y: 4.65, w: 0.9, d: 0.45, rot: 0 },
      // ---- bedroom 2 (east, SOUTH corner) ----
      { t: 'bed', x: 12.75, y: 1.2, w: 2.0, d: 2.4, rot: 2 },
      { t: 'dresser', x: 12.5, y: 4.1, w: 0.9, d: 0.45, rot: 0 },
      // ---- bedroom 3 (east, NORTH corner) ----
      { t: 'bed', x: 12.5, y: 12.55, w: 2.0, d: 2.4, rot: 0 },
      { t: 'dresser', x: 10.35, y: 9.9, w: 0.9, d: 0.45, rot: 1 },
      { t: 'plant', x: 13.4, y: 9.75, w: 0.6, d: 0.6, rot: 0 },
      // ---- THE door: the middle bedroom's west doorway (room 2) ----
      { t: 'door', x: 10.0, y: 6.875, w: 1.25, d: 0.16, rot: 1 },
      // ---- a wall lamp for looks, and the U19 stations ----
      { t: 'sconce', x: 8.0, y: 8.55, w: 0.3, d: 0.18, rot: 0 },
      { t: 'dock', x: 9.0, y: 13.2, w: 1.1, d: 1.1, rot: 0 },
      { t: 'dump', x: 9.1, y: 0.5, w: 0.5, d: 0.5, rot: 0 },
    ],
    /* the doored room keeps a 2-tile doorway; every OPEN room gets 3 tiles */
    walls: [
      // the living room's east half-wall (the L)
      { x: 8.125, y: 1.875, w: 0.15, d: 3.75 },
      // the kitchen: floor wall (y 8.75) with the doorway x 1.875..3.75; east wall solid
      { x: 0.9375, y: 8.75, w: 1.875, d: 0.15 },
      { x: 4.6875, y: 8.75, w: 1.875, d: 0.15 },
      { x: 5.625, y: 11.25, w: 0.15, d: 5.0 },
      // the bathroom: floor wall solid; east wall with the doorway y 10.625..12.5
      { x: 6.875, y: 8.75, w: 2.5, d: 0.15 },
      { x: 8.125, y: 9.6875, w: 0.15, d: 1.875 },
      { x: 8.125, y: 13.125, w: 0.15, d: 1.25 },
      // bedroom 2 (south): west wall with the doorway y 1.25..3.125; ceiling solid
      { x: 10.0, y: 0.625, w: 0.15, d: 1.25 },
      { x: 10.0, y: 3.75, w: 0.15, d: 1.25 },
      { x: 11.875, y: 4.375, w: 3.75, d: 0.15 },
      // bedroom 1 (middle, doored): west wall with the 2-tile gap y 6.25..7.5; ceiling solid
      { x: 10.0, y: 5.3125, w: 0.15, d: 1.875 },
      { x: 10.0, y: 8.4375, w: 0.15, d: 1.875 },
      { x: 11.875, y: 9.375, w: 3.75, d: 0.15 },
      // bedroom 3 (north): west wall with the doorway y 10.625..12.5
      { x: 10.0, y: 10.0, w: 0.15, d: 1.25 },
      { x: 10.0, y: 13.125, w: 0.15, d: 1.25 },
    ],
    rugs: [
      // the living-room rug: its own colour, and it SLOWS the robot
      { x: 4.0, y: 5.0, w: 3.125, d: 1.875, kind: 'green' },
      // ONE-COLOUR marker rugs outside every entrance (FS + U14 read them;
      // u19/rules.js strips them — U19 navigates by position)
      { x: 2.8125, y: 8.4375, w: 0.625, d: 0.625, kind: 'purple' },   // the kitchen
      { x: 8.4375, y: 11.5625, w: 0.625, d: 0.625, kind: 'purple' },  // the bathroom
      { x: 9.6875, y: 2.1875, w: 0.625, d: 0.625, kind: 'purple' },   // bedroom 2 (south)
      { x: 9.6875, y: 6.875, w: 0.625, d: 0.625, kind: 'purple' },    // bedroom 1 (the door)
      { x: 9.6875, y: 11.5625, w: 0.625, d: 0.625, kind: 'purple' },  // bedroom 3 (north)
    ],
    spawns: {
      red: { x: 1.2, y: 7.5, rot: 0 }, blue: { x: 9.0, y: 5.0, rot: 2 },
      cat: { x: 6.0, y: 7.8, on: true }, dog: { x: 9.0, y: 9.5, on: true },
    },
    rooms: [
      { id: 1, name: 'kitchen', x1: 0, y1: 8.75, x2: 5.625, y2: 13.75 },
      { id: 2, name: 'bedroom 1 (door)', x1: 10.0, y1: 4.375, x2: 13.75, y2: 9.375 },
      { id: 3, name: 'bedroom 2', x1: 10.0, y1: 0, x2: 13.75, y2: 4.375 },
      { id: 4, name: 'bedroom 3', x1: 10.0, y1: 9.375, x2: 13.75, y2: 13.75 },
      { id: 5, name: 'bathroom', x1: 5.625, y1: 8.75, x2: 8.125, y2: 13.75 },
    ],
  };

  M.VILLA = VILLA;
})(typeof self !== 'undefined' ? self : this);
