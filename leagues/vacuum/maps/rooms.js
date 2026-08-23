/* ============================================================
   leagues/vacuum/maps/rooms.js  —  the cosy 16x16 rooms house (kitchen + two bedrooms)

   ONE map, one file. All maps hang off `root.VacuumMaps` and are
   loaded before league.js (the `pre:` list in leagues/manifest.js),
   so any file in this league — league.js, a division, the helper,
   the map maker — can read them without owning them.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});

  /* ---------------- the ROOMS house ----------------
     The same 10 x 10 m floor for all three divisions, but with interior WALLS:
     a kitchen (top-right), bedroom 1 (top-left) and bedroom 2 (bottom-right),
     each with a doorway and a ROOM NUMBER the code can read:

         room == 1   kitchen        room == 2   bedroom 1
         room == 3   bedroom 2      room == 0   the living area / hall

     Two rug MARKERS sit right outside two of the doors — purple at bedroom 1,
     green at the kitchen — so a colour sensor alone can tell which door it is
     passing. First Step drives it colourful and wall-following; U14 adds the
     compass; U19 builds its own robot. Doors are 1.25 m — two tiles — wide. */
  const ROOMS = {
    v: 1, name: 'vacuum-rooms', league: 'vacuum', cols: 16, rows: 16, tileSize: 0.625,
    objects: [
      // living area
      { t: 'sofa', x: 5.75, y: 0.675, w: 3.5, d: 0.95, rot: 0 },
      { t: 'table', x: 5.7, y: 2.5, w: 1.4, d: 1.0, rot: 0 },
      { t: 'tv', x: 5.0, y: 5.65, w: 3.1, d: 0.9, rot: 2 },
      { t: 'pouf', x: 1.6, y: 6.1, w: 0.8, d: 0.8, rot: 0 },
      { t: 'plant', x: 0.65, y: 5.3, w: 0.6, d: 0.6, rot: 0 },
      { t: 'trash', x: 0.55, y: 3.4, w: 0.45, d: 0.45, rot: 0 },
      // bedroom 1 (top-left)
      { t: 'bed', x: 1.2, y: 8.7, w: 2.0, d: 2.4, rot: 0 },
      { t: 'lamp', x: 3.7, y: 9.45, w: 0.5, d: 0.5, rot: 0 },
      // the kitchen (top-right)
      { t: 'dining', x: 8.6, y: 9.1, w: 1.4, d: 1.0, rot: 0 },
      { t: 'plant', x: 6.75, y: 9.5, w: 0.6, d: 0.6, rot: 0 },
      { t: 'petbowl', x: 9.55, y: 6.75, w: 0.4, d: 0.4, rot: 0 },
      // bedroom 2 (bottom-right)
      { t: 'bed', x: 9.05, y: 1.35, w: 1.7, d: 2.4, rot: 0 },
      { t: 'lamp', x: 7.35, y: 0.55, w: 0.5, d: 0.5, rot: 0 },
    ],
    walls: [
      // bedroom 1: wall along y = 6.875 with its door, then down x = 4.375
      { x: 1.25, y: 6.875, w: 2.5, d: 0.15 },
      { x: 4.0625, y: 6.875, w: 0.625, d: 0.15 },
      { x: 4.375, y: 8.4375, w: 0.15, d: 3.125 },
      // the kitchen: wall down x = 6.25, and along y = 6.25 with its door
      { x: 6.25, y: 8.125, w: 0.15, d: 3.75 },
      { x: 6.875, y: 6.25, w: 1.25, d: 0.15 },
      { x: 9.375, y: 6.25, w: 1.25, d: 0.15 },
      // bedroom 2: wall up x = 6.875, and along y = 3.125 with its door
      { x: 6.875, y: 1.5625, w: 0.15, d: 3.125 },
      { x: 7.5, y: 3.125, w: 1.25, d: 0.15 },
      { x: 9.6875, y: 3.125, w: 0.625, d: 0.15 },
    ],
    rugs: [
      // the big rug keeps the living area colourful (half speed, no points)
      { x: 3.125, y: 4.0625, w: 3.125, d: 1.875, kind: 'green' },
      // A MARKER RUG AT EVERY DOOR: purple = bedroom 1, green = the kitchen,
      // purple again = bedroom 2 (which side of the house tells them apart)
      { x: 3.125, y: 6.25, w: 0.625, d: 0.625, kind: 'purple' },
      { x: 8.125, y: 5.625, w: 0.625, d: 0.625, kind: 'green' },
      { x: 8.75, y: 3.75, w: 0.625, d: 0.625, kind: 'purple' },
      // the wet pair, out in the open floor (U14 / U19 punish it, FS does not)
      { x: 5.3125, y: 8.4375, w: 1.25, d: 0.625, kind: 'wet' },
      { x: 4.6875, y: 1.5625, w: 1.25, d: 0.625, kind: 'wet' },
    ],
    spawns: {
      red: { x: 1.8, y: 1.8, rot: 0 }, blue: { x: 8.2, y: 8.2, rot: 2 },
      cat: { x: 5.0, y: 4.0, on: true }, dog: { x: 2.8, y: 5.2, on: true },
    },
    rooms: [
      { id: 1, name: 'kitchen', x1: 6.25, y1: 6.25, x2: 10, y2: 10 },
      { id: 2, name: 'bedroom 1', x1: 0, y1: 6.875, x2: 4.375, y2: 10 },
      { id: 3, name: 'bedroom 2', x1: 6.875, y1: 0, x2: 10, y2: 3.125 },
    ],
  };

  // the ROOMS house gets a reachable station too: in the kitchen, bay to the west
  ROOMS.objects.push({ t: 'dock', x: 9.35, y: 7.6, w: 1.1, d: 1.1, rot: 0 });
  ROOMS.objects.push({ t: 'dump', x: 0.8, y: 4.3, w: 0.5, d: 0.5, rot: 0 });
  M.ROOMS = ROOMS;
})(typeof self !== 'undefined' ? self : this);
