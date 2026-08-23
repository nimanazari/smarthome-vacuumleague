/* ============================================================
   leagues/vacuum/maps/grown.js  —  the official house scaled to 22x22 (no rooms)

   ONE map, one file. All maps hang off `root.VacuumMaps` and are
   loaded before league.js (the `pre:` list in leagues/manifest.js),
   so any file in this league — league.js, a division, the helper,
   the map maker — can read them without owning them.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});
  const HOUSE = M.HOUSE;

  /* ---------------- the GROWN house (U14 / U19) ----------------
     The official floor plan scaled onto a 22 x 22 grid (13.75 m a side).
     Same furniture, same layout — but almost twice the floor, so a 3-minute
     match can no longer finish the whole house and pacing starts to matter.
     FS keeps the cosy 16 x 16. The dock and the emptying bin stand in it as
     Map-Maker OBJECTS, so both can be moved and turned like any other piece. */
  const GROWN = (() => {
    const f = 22 / 16;
    const m = JSON.parse(JSON.stringify(HOUSE));
    m.name = 'vacuum-official-22';
    m.cols = 22; m.rows = 22;
    m.objects.forEach((o) => { o.x = +(o.x * f).toFixed(3); o.y = +(o.y * f).toFixed(3); });
    // rugs scale their POSITION; the wet pair is re-laid tile-aligned below
    m.rugs = m.rugs.filter((g) => g.kind !== 'wet');
    m.rugs.forEach((g) => { g.x = +(g.x * f).toFixed(3); g.y = +(g.y * f).toFixed(3); });
    m.rugs.push({ x: 8.125, y: 11.5625, w: 1.25, d: 0.625, kind: 'wet' });
    m.rugs.push({ x: 5.625, y: 2.1875, w: 1.25, d: 0.625, kind: 'wet' });
    m.spawns = {
      red: { x: 1.8, y: 1.8, rot: 0 }, blue: { x: 11.9, y: 11.9, rot: 2 },
      cat: { x: 6.9, y: 5.5, on: true }, dog: { x: 4.4, y: 7.7, on: true },
    };
    // the station (bay opening west) by the east shelf, the bin in the north-west corner
    m.objects.push({ t: 'dock', x: 9.9, y: 8.17, w: 1.1, d: 1.1, rot: 0 });
    m.objects.push({ t: 'dump', x: 0.9, y: 12.6, w: 0.5, d: 0.5, rot: 0 });
    return m;
  })();
  M.GROWN = GROWN;
})(typeof self !== 'undefined' ? self : this);
