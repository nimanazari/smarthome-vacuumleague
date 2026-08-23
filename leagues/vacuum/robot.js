/* ============================================================
   leagues/vacuum/robot.js  —  the 3D model of THIS league's robot.

   It belongs to this league and nobody else: change it and only
   vacuum robots look different. It registers itself into the shared
   model library, so copying this folder to another project carries the
   robot with it.
   ============================================================ */
(function (root) {
  'use strict';
  const H = root.HomeObjects;
  if (!H || !H.registerRobot) return;      // no 3D library here (headless tests)
  const THREE = root.THREE;
  const mat = H._mat, shade = H._shade, paint = H._paint, smoked = H._smoked;
  const parseColor = H._parseColor;

    function buildRobot(c) {
      // a modern flat-deck robot vacuum: rubber bumper band, charcoal chassis,
      // a clear-coated team-colour deck, brushed trim and a smoked-glass lidar
      const g = new THREE.Group(), R = 0.25;
      const bump = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.005, 0.075, 64), mat(0x171a20, 0.92)); bump.position.y = 0.0375; bump.castShadow = true; g.add(bump);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.985, R * 0.995, 0.105, 64), mat(0x272c35, 0.55, 0.25)); body.position.y = 0.1275; body.castShadow = true; g.add(body);
      // side vents at the back — three slim dark slits
      for (const a of [2.55, 2.85, 3.15, 3.45, 3.75]) {
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.028), mat(0x0c0e12, 0.9));
        v.position.set(Math.cos(a) * R * 0.985, 0.126, -Math.sin(a) * R * 0.985);
        v.rotation.y = a; g.add(v);
      }
      // the deck: FLAT and lacquered in the team colour, with a chamfered lip
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.93, R * 0.975, 0.028, 64), paint(c.body)); deck.position.y = 0.194; deck.castShadow = true; g.add(deck);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(R * 0.95, 0.0075, 10, 64), mat(0xb9c2cf, 0.22, 0.9));
      lip.rotation.x = Math.PI / 2; lip.position.y = 0.181; g.add(lip);
      // the accent light-ring, sunk into the deck near the edge
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.80, 0.011, 10, 64),
        new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 1.1, roughness: 0.3 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.208; g.add(ring);
      // smoked-glass sensor window across the nose of the bumper
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.002, R * 1.002, 0.034, 48, 1, true, -0.62, 1.24), smoked());
      visor.position.y = 0.045; g.add(visor);
      // lidar turret: smoked glass on a brushed collar, team tally dot on top
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.016, 32), mat(0x9aa4b2, 0.28, 0.85)); collar.position.y = 0.216; g.add(collar);
      const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.052, 32), smoked()); lidar.position.y = 0.248; lidar.castShadow = true; g.add(lidar);
      const lidTop = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.052, 0.012, 32), mat(0x1c2230, 0.4, 0.3)); lidTop.position.y = 0.279; g.add(lidTop);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 16),
        new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 0.9, roughness: 0.3 }));
      dot.position.y = 0.287; g.add(dot);
      // deck furniture: two buttons and a glossy status window
      const btn1 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.010, 18), mat(0xdde3ec, 0.25, 0.7));
      btn1.position.set(-0.105, 0.212, 0.040); g.add(btn1);
      const btn2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.010, 18),
        new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 0.7, roughness: 0.3 }));
      btn2.position.set(-0.105, 0.212, -0.040); g.add(btn2);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.085), smoked());
      glass.position.set(0.125, 0.209, 0); g.add(glass);
      // the white heading cone the referee (and the kids) read at a glance
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.3 })); nose.rotation.z = -Math.PI / 2; nose.position.set(R * 0.80, 0.155, 0); g.add(nose);
      g.userData.brushes = [];
      const armMat = mat(0xd8dde6, 0.8), tipMat = mat(0xf2c744, 0.9), hubMat = mat(0x22262e, 0.5);
      for (const s of [-1, 1]) {
        const br = new THREE.Group();
        br.position.set(R * 0.62, 0.065, s * R * 0.62);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 12), hubMat); br.add(hub);
        for (let k = 0; k < 3; k++) {
          const holder = new THREE.Group();
          holder.rotation.y = k * Math.PI * 2 / 3;
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.006, 0.018), armMat);
          arm.position.x = 0.055; holder.add(arm);
          const tip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.03), tipMat);
          tip.position.x = 0.117; holder.add(tip);
          br.add(holder);
        }
        br.userData.dir = s;
        g.add(br); g.userData.brushes.push(br);
      }
      const wheelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.035, 20);
      for (const s of [-1, 1]) { const wl = new THREE.Mesh(wheelGeo, mat(0x0a0c10, 0.7)); wl.rotation.x = Math.PI / 2; wl.position.set(-0.01, 0.07, s * (R - 0.004)); wl.castShadow = true; g.add(wl); }
      return g;
    }
  H.registerRobot('vacuum', buildRobot, { icon: '🤖', label: 'Round' });
})(typeof self !== 'undefined' ? self : this);
