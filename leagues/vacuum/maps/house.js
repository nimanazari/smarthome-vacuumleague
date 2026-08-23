/* ============================================================
   leagues/vacuum/maps/house.js  —  the classic official 16x16 house

   ONE map, one file. All maps hang off `root.VacuumMaps` and are
   loaded before league.js (the `pre:` list in leagues/manifest.js),
   so any file in this league — league.js, a division, the helper,
   the map maker — can read them without owning them.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});

  /* ---------------- the VACUUM league's own house ----------------
     This floor plan belongs to THIS league and nobody else. It is the classic
     official house, converted verbatim to Map-Maker format (centre + size).
     Change a wall here and only the vacuum league changes; every other league
     has — or will get — a house of its own. The physics default in physics.js
     stays untouched as the neutral fallback. */
  const HOUSE = {
    v: 1, name: 'vacuum-official', cols: 16, rows: 16, tileSize: 0.625,
    objects: [
      { t: 'sofa', x: 5.75, y: 0.675, w: 3.5, d: 0.95, rot: 0 },
      { t: 'table', x: 5.7, y: 2.5, w: 1.4, d: 1.0, rot: 0 },
      { t: 'tv', x: 4.05, y: 9.35, w: 3.1, d: 0.9, rot: 0 },
      { t: 'bed', x: 1.2, y: 8.5, w: 2.0, d: 2.6, rot: 0 },
      { t: 'shelf', x: 9.325, y: 4.5, w: 0.95, d: 3.0, rot: 0 },
      { t: 'shelf', x: 0.575, y: 4.5, w: 0.75, d: 2.6, rot: 2 },   // doors face into the room
      { t: 'plant', x: 2.8, y: 0.6, w: 0.6, d: 0.6, rot: 0 },
      { t: 'plant', x: 0.65, y: 6.4, w: 0.6, d: 0.6, rot: 0 },
      { t: 'plant', x: 7.2, y: 9.5, w: 0.6, d: 0.6, rot: 0 },
      { t: 'pouf', x: 8.5, y: 6.95, w: 0.8, d: 0.8, rot: 0 },   // clear of the blue spawn corner
      { t: 'dining', x: 2.0, y: 2.1, w: 1.4, d: 1.0, rot: 0 },
      { t: 'lamp', x: 9.4, y: 9.2, w: 0.5, d: 0.5, rot: 0 },
      { t: 'trash', x: 0.525, y: 2.425, w: 0.45, d: 0.45, rot: 0 },
      { t: 'petbowl', x: 6.55, y: 9.55, w: 0.4, d: 0.4, rot: 0 },
    ],
    walls: [],
    rugs: [
      { x: 4.0625, y: 7.8125, w: 3.125, d: 1.875, kind: 'green' },
      { x: 9.375, y: 0.625, w: 1.25, d: 1.25, kind: 'purple' },
      // Spilled water — the WET floor. This is what the `wet` rule punishes, so
      // the house has to actually contain some: without a `kind: 'wet'` rug here
      // physics.js builds an empty `puddles` list and the U14 / U19 wet-floor
      // penalty can never fire at all. FS keeps the puddles but switches the
      // penalty off (`wet: false`), so they are just floor it cannot clean.
      // Tile-aligned (tile = 0.625) so each one owns exactly two whole tiles,
      // and placed as a MIRRORED PAIR about the centre of the house — tile
      // (9,13)+(10,13) and (6,2)+(5,2) — so the hazard is the same distance
      // from the blue corner as from the red one.
      { x: 6.25, y: 8.4375, w: 1.25, d: 0.625, kind: 'wet' },
      { x: 3.75, y: 1.5625, w: 1.25, d: 0.625, kind: 'wet' },
    ],
    spawns: {
      red: { x: 1.8, y: 1.8, rot: 0 }, blue: { x: 8.2, y: 8.2, rot: 2 },
      cat: { x: 5.0, y: 4.0, on: true }, dog: { x: 3.2, y: 5.6, on: true },
    },
  };
  M.HOUSE = HOUSE;
})(typeof self !== 'undefined' ? self : this);
