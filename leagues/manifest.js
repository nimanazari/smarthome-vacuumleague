/* ============================================================
   leagues/manifest.js  —  which league folders exist.

   This is the ONLY shared list. Drop a folder in, add a line here,
   and the game picks the league up. Delete a line and that league is
   gone — nothing else in the codebase mentions it.

   Each entry: { id: <folder name>, divisions: [<sub-folder names>] }
   Load order inside a folder: robot.js, league.js, `extra`, then each division.

   `pre: [...]` is optional — files loaded BEFORE the league's own league.js
   (its maps live there, one file each, under maps/).
   `extra: [...]` is optional — paths inside the league's own folder that must
   be in memory BEFORE its divisions register. It is how a league ships a plain
   data file that more than one of its own files needs (and that a page of its
   own, like a helper, can load on its own too) without any of them duplicating
   the data. Nothing outside the league folder is reachable through it.
   ============================================================ */
(function (root) {
  'use strict';
  root.LEAGUE_MANIFEST = [
    {
      id: 'vacuum', divisions: ['fs', 'u14', 'u19'],
      // `pre:` loads BEFORE league.js — the maps, one file each
      pre: ['maps/house.js', 'maps/rooms.js', 'maps/grown.js', 'maps/grown-rooms.js', 'maps/open.js', 'maps/standard.js'],
      extra: ['fs/kit.js', 'u14/kit.js'],
    },
  ];
})(typeof self !== 'undefined' ? self : this);
