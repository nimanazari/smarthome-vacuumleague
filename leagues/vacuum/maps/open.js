/* ============================================================
   leagues/vacuum/maps/open.js  —  the OPEN training hall, 22x22.

   ONE map, one file (see maps/grown-rooms.js for the pattern).
   Almost no furniture and no rooms: a big flat floor for first
   drives, speed tests and tuning — pick it from the map menu.
   فارسی: سالن تمرین — زمین باز ۲۲×۲۲ تقریباً خالی برای اولین
   حرکت‌ها و تنظیم برنامه؛ از منوی نقشه انتخابش کن.
   ============================================================ */
(function (root) {
  'use strict';
  const M = (root.VacuumMaps = root.VacuumMaps || {});
  M.OPEN = {
    v: 1, name: 'vacuum-open-22', league: 'vacuum', cols: 22, rows: 22, tileSize: 0.625,
    objects: [
      { t: 'plant', x: 1.0, y: 12.75, w: 0.6, d: 0.6, rot: 0 },
      { t: 'plant', x: 12.75, y: 1.0, w: 0.6, d: 0.6, rot: 0 },
      { t: 'pouf', x: 6.875, y: 6.875, w: 0.8, d: 0.8, rot: 0 },
      { t: 'dock', x: 12.9, y: 6.875, w: 1.1, d: 1.1, rot: 0 },
      { t: 'dump', x: 0.9, y: 6.875, w: 0.5, d: 0.5, rot: 0 },
    ],
    walls: [],
    rugs: [
      { x: 7.5, y: 10.3125, w: 1.25, d: 0.625, kind: 'wet' },
      { x: 6.25, y: 3.4375, w: 1.25, d: 0.625, kind: 'wet' },
    ],
    spawns: {
      red: { x: 1.8, y: 1.8, rot: 0 }, blue: { x: 11.9, y: 11.9, rot: 2 },
      cat: { x: 9.0, y: 4.5, on: true }, dog: { x: 4.5, y: 9.0, on: true },
    },
  };
})(typeof self !== 'undefined' ? self : this);
