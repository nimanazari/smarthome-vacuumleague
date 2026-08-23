/* ============================================================
   HomeObjects — standalone low-poly furniture / prop library
   for Three.js. No dependencies beyond THREE itself.

   Use it in ANY project:

     <script src="three.min.js"></script>
     <script src="homeobjects.js"></script>
     <script>
       const sofa = HomeObjects.build('sofa', { w: 3.0, d: 0.95, color: '#7a3fd0' });
       scene.add(sofa);            // centred at origin, floor at y = 0
     </script>

   API
     HomeObjects.TYPES                    -> array of furniture type ids
     HomeObjects.DEFAULTS[type]           -> { w, d, color } defaults
     HomeObjects.build(type, opts)        -> THREE.Group
         opts: { w, d, color }  (metres; color '#hex' string or 0xhex int)
     HomeObjects.buildRug(opts)           -> THREE.Group  { w, d, color }
     HomeObjects.buildWindow(opts)        -> THREE.Group  { len, color }   (for a 0.7 m dollhouse wall)
     HomeObjects.buildPillar(opts)        -> THREE.Group  { r, color }     (round column)
     HomeObjects.buildCat()               -> { group, legs, tail }
     HomeObjects.buildDog()               -> { group, legs, tail }
         animate: legs[i].rotation.z (walk swing), tail.rotation.y/x (wag),
         group.position.y ~ 0.08 + bob. Nose points along local +x.
     HomeObjects.buildRobot(style)        -> THREE.Group
         style: { body, top, accent } hex ints. Spin style.userData.brushes
         by brush.userData.dir for the vacuum side-sweepers.

   In a bundler / Node: window.THREE absent -> use
     const HomeObjects = HomeObjectsFactory(THREE);
   ============================================================ */
(function (root) {

  /* ============================================================
     FOOTPRINTS — what each prop actually blocks at robot height.

     A cleaning robot is ~29 cm tall, so it drives UNDER a table top and a
     bench seat, a floor lamp only blocks its foot (the shade is at 1.2 m),
     and a round pouf must not collide as a square. Each entry returns the
     blocking shapes in LOCAL metres, measured from the object's centre in
     its UNROTATED orientation:

        { c: [x, y, radius] }        a circle
        { r: [x, y, halfW, halfD] }  a rectangle

     Types that are missing from this table are solid from the floor up and
     block their whole footprint. This lives next to the models on purpose:
     any project that draws a HomeObjects prop gets its true footprint too.
     Pure data — no THREE needed, so a physics engine can require it alone.
     ============================================================ */
  const ROBOT_CLEARANCE = 0.30;          // anything higher than this is driven under

  const corners = (w, d, inset, r) =>
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) =>
      ({ c: [sx * (w / 2 - inset), sy * (d / 2 - inset), r] }));

  const FOOTPRINTS = {
    // ---- round props: a circle, never a square ----
    columnR: (w, d) => [{ c: [0, 0, Math.min(w, d) * 0.50] }],
    pouf:    (w, d) => [{ c: [0, 0, Math.min(w, d) * 0.48] }],
    trash:   (w, d) => [{ c: [0, 0, Math.min(w, d) * 0.38] }],
    // ---- only a slim base is down at robot height ----
    lamp:    (w, d) => [{ c: [0, 0, Math.min(w, d) * 0.34] }],   // foot; shade at 1.2 m
    plant:   (w, d) => [{ c: [0, 0, Math.min(w, d) * 0.34] }],   // pot; leaves at 0.42 m
    cactus:  (w, d) => [{ c: [0, 0, Math.min(w, d) * 0.34] }],   // pot; arms at 0.60 m
    palm:    (w, d) => [{ c: [0, 0, Math.min(w, d) * 0.30] }],   // pot; fronds at 1.3 m
    // ---- the robot drives UNDER these: only the legs block ----
    table:   (w, d) => corners(w, d, 0.08, 0.050),               // top at 0.40 m
    dining:  (w, d) => corners(w, d, 0.09, 0.065),               // top at 0.71 m
    bench:   (w, d) => [                                          // seat at 0.42 m
      { r: [-(w / 2 - 0.06), 0, 0.030, d * 0.40] },
      { r: [(w / 2 - 0.06), 0, 0.030, d * 0.40] },
    ],
    desk:    (w, d) => [                                          // desktop at 0.70 m
      { r: [-(w / 2 - 0.03), d * 0.23, 0.025, d * 0.23] },
      { r: [(w / 2 - 0.03), d * 0.23, 0.025, d * 0.23] },
      { c: [0, -d * 0.20, 0.19] },                                // the chair's base
    ],
    // ---- a flat mat the robot rolls over; only the bowls block ----
    sconce: () => [],                 // wall decoration — nothing at robot height
    petbowl: (w, d) => [
      { c: [-w * 0.24, 0, Math.min(w, d) * 0.34] },
      { c: [w * 0.24, 0, Math.min(w, d) * 0.34] },
    ],
  };

  root.HomeObjectsFootprints = { FOOTPRINTS, ROBOT_CLEARANCE };
  if (typeof module !== 'undefined' && module.exports) module.exports = { FOOTPRINTS, ROBOT_CLEARANCE };

  function lib(THREE) {

    const mat = (color, rough = 0.7, metal = 0.0) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

    // car-paint: a clear-coated finish for robot shells, so the team colour
    // reads as lacquered metal instead of toy plastic (falls back gracefully)
    const paint = (color) => (THREE.MeshPhysicalMaterial
      ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.35, clearcoat: 1.0, clearcoatRoughness: 0.16 })
      : mat(color, 0.32, 0.35));
    // smoked glass for sensor windows and lidar turrets
    const smoked = () => (THREE.MeshPhysicalMaterial
      ? new THREE.MeshPhysicalMaterial({ color: 0x0a0d12, roughness: 0.08, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.06 })
      : new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.1, metalness: 0.3 }));

    function shade(hex, mul) {
      const r = Math.min(255, Math.round(((hex >> 16) & 255) * mul));
      const g = Math.min(255, Math.round(((hex >> 8) & 255) * mul));
      const b = Math.min(255, Math.round((hex & 255) * mul));
      return (r << 16) | (g << 8) | b;
    }

    const parseColor = (c) => (c == null ? null : (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16)));

    const DEFAULTS = {
      sofa:      { w: 3.0,  d: 0.95, color: '#4f5c70' },
      pouf:      { w: 0.8,  d: 0.8,  color: '#b3573f' },
      table:     { w: 1.4,  d: 1.0,  color: '#6b4f38' },
      dining:    { w: 1.8,  d: 1.1,  color: '#7a5230' },
      bookshelf: { w: 1.8,  d: 0.45, color: '#5a4028' },
      fireplace: { w: 1.6,  d: 0.55, color: '#8a8078' },
      piano:     { w: 1.5,  d: 0.65, color: '#241f26' },
      aquarium:  { w: 1.4,  d: 0.55, color: '#3a3f4a' },
      lamp:      { w: 0.55, d: 0.55, color: '#caa25a' },
      tv:        { w: 3.1,  d: 0.9,  color: '#2f261d' },
      bed:       { w: 1.6,  d: 2.1,  color: '#5b7d9c' },
      shelf:     { w: 2.4,  d: 0.7,  color: '#54402d' },
      dresser:   { w: 1.1,  d: 0.5,  color: '#6b533a' },
      desk:      { w: 1.5,  d: 1.4,  color: '#5f4a36' },
      treadmill: { w: 0.8,  d: 1.7,  color: '#2e3238' },
      fridge:    { w: 0.85, d: 0.75, color: '#c9ced6' },
      kitchen:   { w: 2.4,  d: 0.65, color: '#8b6a48' },
      stove:     { w: 0.9,  d: 0.65, color: '#3a3f46' },
      washer:    { w: 0.7,  d: 0.7,  color: '#dfe3e8' },
      bathtub:   { w: 1.7,  d: 0.8,  color: '#eef1f3' },
      toilet:    { w: 0.55, d: 0.75, color: '#f0f2f4' },
      column:    { w: 0.5,  d: 0.5,  color: '#9aa3b0' },
      plant:     { w: 0.6,  d: 0.6,  color: '#3f8f4f' },
      armchair:  { w: 1.1,  d: 0.95, color: '#4f5c70' },
      chair:     { w: 0.5,  d: 0.55, color: '#7a5230' },
      cactus:    { w: 0.5,  d: 0.5,  color: '#3f8f4f' },
      palm:      { w: 0.75, d: 0.75, color: '#3f9e5f' },
      trash:     { w: 0.45, d: 0.45, color: '#5b6675' },
      dump:      { w: 0.5,  d: 0.5,  color: '#f4f7fb' },   // the emptying station
      box:       { w: 0.6,  d: 0.6,  color: '#b08d57' },
      bench:     { w: 1.5,  d: 0.55, color: '#8a5a2e' },
      doghouse:  { w: 0.95, d: 1.05, color: '#8a5a2e' },
      cattree:   { w: 0.7,  d: 0.7,  color: '#b9a58e' },
      petbowl:   { w: 0.55, d: 0.35, color: '#4f5c70' },
      door:      { w: 1.25, d: 0.16, color: '#7a5230' },
      sconce:    { w: 0.3,  d: 0.18, color: '#3a4356' },
    };

    /* ---------- furniture: every model FILLS its w x d footprint,
       so a physics AABB of the same size matches what you see ---------- */
    function build(type, opts) {
      opts = opts || {};
      const def = DEFAULTS[type] || { w: 1, d: 1 };
      const w = opts.w || def.w, d = opts.d || def.d;
      const g = new THREE.Group();
      const tint = parseColor(opts.color != null ? opts.color : null);
      const pick = (dv) => (tint != null ? tint : dv);
      const pickS = (mul, dv) => (tint != null ? shade(tint, mul) : dv);
      const box = (bw, bh, bd, x, y, z, m) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
        mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
      };

      if (type === 'door') {
        // a doorway with a HINGED LEAF: the frame's two posts stand on the
        // wall line; the leaf hangs off userData.leaf so the renderer can
        // swing it open (rotation.y) when the physics says so
        const fr = mat(pick(0x7a5230), 0.55);
        box(0.09, 2.0, d, -w / 2 + 0.045, 1.0, 0, fr);
        box(0.09, 2.0, d, w / 2 - 0.045, 1.0, 0, fr);
        box(w, 0.09, d, 0, 2.02, 0, fr);
        const hinge = new THREE.Group();
        hinge.position.set(-w / 2 + 0.09, 0, 0);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 1.9, Math.max(0.05, d * 0.4)), mat(pickS(1.15, 0x9a6a3f), 0.6));
        leaf.position.set((w - 0.2) / 2, 0.97, 0);
        leaf.castShadow = true;
        hinge.add(leaf);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), mat(0xd8b24a, 0.3));
        knob.position.set(w - 0.28, 0.95, Math.max(0.05, d * 0.4) / 2 + 0.03);
        hinge.add(knob);
        g.add(hinge);
        g.userData.leaf = hinge;

      } else if (type === 'sconce') {
        // a WALL LAMP: a little bracket and a warm glowing shade up at
        // 1.4 m — pure decoration, the robot never feels it
        const arm = mat(pick(0x3a4356), 0.5);
        box(0.08, 0.3, 0.08, 0, 1.3, 0, arm);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.16, 12, 1, true),
          new THREE.MeshStandardMaterial({ color: 0xf3e4c2, emissive: 0xffc36b, emissiveIntensity: 0.9, roughness: 0.6, side: THREE.DoubleSide }));
        shade.position.set(0, 1.48, 0);
        g.add(shade);
        const lightDot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffe9b8, emissive: 0xffd98a, emissiveIntensity: 1.4 }));
        lightDot.position.set(0, 1.44, 0);
        g.add(lightDot);

      } else if (type === 'sofa') {
        const f = mat(pick(0x4f5c70)), dk = mat(pickS(0.78, 0x414c5e)), cu = mat(pickS(1.28, 0x63728b));
        box(w, 0.24, d, 0, 0.13, 0, f);
        box(w, 0.4, d * 0.22, 0, 0.35, -d / 2 + d * 0.11, dk);
        box(w * 0.09, 0.28, d, -w / 2 + w * 0.045, 0.31, 0, dk);
        box(w * 0.09, 0.28, d, w / 2 - w * 0.045, 0.31, 0, dk);
        const inW = w * 0.82, seg = inW / 2;
        for (let i = 0; i < 2; i++) {
          box(seg * 0.92, 0.12, d * 0.6, -inW / 2 + (i + 0.5) * seg, 0.31, d * 0.05, cu);
          box(seg * 0.92, 0.26, d * 0.13, -inW / 2 + (i + 0.5) * seg, 0.42, -d / 2 + d * 0.22, cu);
        }

      } else if (type === 'table') {
        const wd = mat(pick(0x6b4f38), 0.5);
        box(w, 0.08, d, 0, 0.4, 0, wd);
        const lx = w / 2 - 0.08, lz = d / 2 - 0.08;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.07, 0.4, 0.07, sx * lx, 0.2, sz * lz, wd);
        const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.17, 16), mat(0x3f8f6f, 0.4));
        vase.position.set(0, 0.52, 0); vase.castShadow = true; g.add(vase);

      } else if (type === 'tv') {
        box(w, 0.34, d, 0, 0.17, 0, mat(pick(0x2f261d), 0.6));
        box(w * 0.9, 0.5, 0.04, 0, 0.66, -d / 2 + 0.10, mat(0x101317, 0.4));
        const scr = new THREE.MeshStandardMaterial({ color: 0x0a0f14, emissive: 0x18384f, emissiveIntensity: 0.75, roughness: 0.3 });
        box(w * 0.82, 0.42, 0.02, 0, 0.66, -d / 2 + 0.08, scr);

      } else if (type === 'bed') {
        box(w, 0.18, d, 0, 0.09, 0, mat(pickS(0.55, 0x4a3728), 0.7));
        box(w, 0.46, d * 0.1, 0, 0.32, d / 2 - d * 0.05, mat(pickS(0.65, 0x5a4230), 0.7));
        box(w * 0.9, 0.14, d * 0.82, 0, 0.27, -d * 0.04, mat(0xe8e2d5, 0.9));
        box(w * 0.9, 0.17, d * 0.5, 0, 0.3, -d * 0.22, mat(pick(0x5b7d9c), 0.75));
        if (w >= 1.3) {
          box(w * 0.38, 0.12, d * 0.15, -w * 0.22, 0.37, d * 0.28, mat(0xffffff, 0.9));
          box(w * 0.38, 0.12, d * 0.15, w * 0.22, 0.37, d * 0.28, mat(0xffffff, 0.9));
        } else {
          box(w * 0.55, 0.12, d * 0.15, 0, 0.37, d * 0.28, mat(0xffffff, 0.9));
        }

      } else if (type === 'shelf') {          // wardrobe with panelled doors
        const H = 1.35;
        let cw, cd;
        if (opts.autoRot != null) {           // legacy Map-1 orientation (doors face into the room)
          if (w <= d) { cw = w; cd = d; } else { cw = d; cd = w; }
          g.rotation.y = opts.autoRot;
        } else {
          cw = d; cd = w;
          g.rotation.y = -Math.PI / 2;        // face -z like every other model
        }
        const body = mat(pick(0x54402d), 0.75), door = mat(pickS(1.24, 0x6b533a), 0.55),
              panel = mat(pickS(1.5, 0x7d6247), 0.6), trim = mat(pickS(0.68, 0x3b2c1e), 0.7), handle = mat(0xd9c48c, 0.3, 0.7);
        box(cw * 0.94, 0.1, cd * 0.98, 0, 0.05, 0, trim);
        box(cw * 0.95, H - 0.17, cd * 0.97, 0, 0.085 + (H - 0.17) / 2, 0, body);
        box(cw, 0.08, cd, 0, H - 0.04, 0, trim);
        const fx = -cw / 2;
        const n = Math.max(2, Math.round(cd / 0.8)), dw = cd / n;
        const dh = H - 0.36, dy = 0.14 + dh / 2;
        for (let i = 0; i < n; i++) {
          const z = -cd / 2 + (i + 0.5) * dw;
          box(0.05, dh, dw * 0.92, fx + 0.025, dy, z, door);
          box(0.02, dh * 0.74, dw * 0.6, fx - 0.005, dy, z, panel);
          box(0.03, 0.2, 0.028, fx - 0.02, dy, z + dw * 0.36, handle);
        }
        for (let i = 1; i < n; i++) box(0.055, dh, 0.022, fx + 0.02, dy, -cd / 2 + i * dw, trim);

      } else if (type === 'pouf') {
        const r = Math.min(w, d) * 0.48;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.94, 0.26, 28), mat(pick(0xb3573f), 0.9));
        body.position.y = 0.14; body.castShadow = true; g.add(body);
        const cushion = new THREE.Mesh(new THREE.SphereGeometry(r * 0.99, 28, 14), mat(pickS(1.18, 0xc96a50), 0.95));
        cushion.scale.set(1, 0.38, 1); cushion.position.y = 0.28; cushion.castShadow = true; g.add(cushion);
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.02, 12), mat(pickS(0.62, 0x7e3c2b), 0.9));
        btn.position.y = 0.375; g.add(btn);
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.99, 0.05, 28), mat(pickS(0.7, 0x8a4433), 0.95));
        skirt.position.y = 0.025; g.add(skirt);

      } else if (type === 'dining') {
        const wood = mat(pick(0x7a5230), 0.5);
        box(w, 0.07, d, 0, 0.745, 0, wood);
        box(w * 0.86, 0.05, d * 0.8, 0, 0.69, 0, mat(pickS(0.8, 0x62422a), 0.6));
        const lx = w / 2 - 0.09, lz = d / 2 - 0.09;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.09, 0.71, 0.09, sx * lx, 0.355, sz * lz, wood);
        const plateM = mat(0xeef0ee, 0.35);
        for (const sx of [-1, 1]) {
          const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.02, 20), plateM);
          pl.position.set(sx * w * 0.24, 0.79, 0); pl.castShadow = true; g.add(pl);
        }
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.24, 14), mat(0x3f7d5e, 0.25));
        bottle.position.set(0, 0.9, 0); bottle.castShadow = true; g.add(bottle);

      } else if (type === 'bookshelf') {
        const H = 1.5;
        const wood = mat(pick(0x5a4028), 0.7), dkw = mat(pickS(0.72, 0x412e1c), 0.75);
        box(w, 0.07, d, 0, 0.035, 0, dkw);
        box(0.05, H, d, -w / 2 + 0.025, H / 2, 0, wood);
        box(0.05, H, d, w / 2 - 0.025, H / 2, 0, wood);
        box(w, H, 0.035, 0, H / 2, d / 2 - 0.0175, dkw);
        box(w, 0.06, d, 0, H - 0.03, 0, wood);
        const shelfYs = [0.42, 0.78, 1.14];
        for (const y of shelfYs) box(w - 0.1, 0.045, d * 0.92, 0, y, 0, wood);
        const paletteB = [0xc0504d, 0x4f81bd, 0x9bbb59, 0x8064a2, 0xf2a444, 0x4bacc6, 0xd8b25c];
        const rows = [0.07, 0.4425, 0.8025, 1.1625];
        const inW = w - 0.2, n = Math.max(3, Math.floor(inW / 0.075));
        for (let rI = 0; rI < rows.length; rI++) {
          for (let k = 0; k < n; k++) {
            if ((k + rI * 3) % 9 === 7) continue;
            const bh = 0.22 + ((k * 5 + rI * 3) % 3) * 0.03;
            const bm = mat(paletteB[(k * 7 + rI * 5) % paletteB.length], 0.85);
            box(0.055, bh, d * 0.55, -inW / 2 + (k + 0.5) * (inW / n), rows[rI] + bh / 2, 0.02, bm);
          }
        }

      } else if (type === 'fireplace') {
        const stone = mat(pick(0x8a8078), 0.95), trim = mat(pickS(0.75, 0x6f665e), 0.9);
        box(w * 0.94, 1.05, d * 0.88, 0, 0.525, 0, stone);
        box(w, 0.09, d, 0, 1.1, 0, trim);
        box(w * 0.42, 0.28, d * 0.62, 0, 1.28, 0, stone);
        box(w * 0.66, 0.56, 0.05, 0, 0.33, -d / 2 + 0.028, mat(0x15120f, 0.95));
        const fire = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, 0.42, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x2b1206, emissive: 0xff7a26, emissiveIntensity: 1.15, roughness: 0.6 }));
        fire.position.set(0, 0.28, -d / 2 - 0.002); g.add(fire);
        const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.24, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x3a1a06, emissive: 0xffc266, emissiveIntensity: 1.35, roughness: 0.6 }));
        core.position.set(0, 0.22, -d / 2 - 0.006); g.add(core);
        const logM = mat(0x4a3320, 0.95);
        for (const sy of [[0, 0.09], [0.07, 0.14]]) {
          const log = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, w * 0.42, 10), logM);
          log.rotation.z = Math.PI / 2; log.position.set(sy[0], sy[1], -d / 2 + 0.1); g.add(log);
        }

      } else if (type === 'piano') {
        const bodyM = mat(pick(0x241f26), 0.32, 0.18);
        box(w, 1.12, d * 0.6, 0, 0.56, d * 0.2, bodyM);
        box(w, 0.045, d * 0.64, 0, 1.14, d * 0.2, bodyM);
        box(w * 0.97, 0.1, d * 0.44, 0, 0.66, -d * 0.27, bodyM);
        box(w * 0.88, 0.028, d * 0.32, 0, 0.727, -d * 0.29, mat(0xf2efe6, 0.35));
        const nk = Math.max(6, Math.round(w / 0.115));
        for (let k = 0; k < nk; k++) {
          if (k % 7 === 2 || k % 7 === 6) continue;
          box(0.026, 0.03, d * 0.16, -w * 0.4 + (k + 0.5) * (w * 0.8 / nk), 0.748, -d * 0.33, bodyM);
        }
        box(w * 0.6, 0.2, 0.022, 0, 0.98, -d * 0.095, mat(pickS(1.3, 0x3a333d), 0.4));
        for (const sx of [-1, 1]) box(0.06, 0.62, 0.06, sx * (w / 2 - 0.05), 0.31, -d * 0.4, bodyM);
        const pedM = mat(0xd9b24a, 0.3, 0.8);
        for (const sx of [-0.09, 0, 0.09]) box(0.035, 0.02, 0.08, sx, 0.05, -d * 0.36, pedM);

      } else if (type === 'aquarium') {
        box(w, 0.5, d, 0, 0.25, 0, mat(pick(0x3a3f4a), 0.6));
        box(w, 0.035, d, 0, 1.0, 0, mat(pickS(0.7, 0x282c34), 0.5));
        const water = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.4, d * 0.86),
          new THREE.MeshStandardMaterial({ color: 0x2f7fc4, roughness: 0.15, transparent: true, opacity: 0.5, emissive: 0x134a6b, emissiveIntensity: 0.55 }));
        water.position.set(0, 0.73, 0); g.add(water);
        box(w * 0.9, 0.05, d * 0.86, 0, 0.545, 0, mat(0xc9b98a, 0.95));
        const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.47, d * 0.92),
          new THREE.MeshStandardMaterial({ color: 0xbfe4f2, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18 }));
        glass.position.set(0, 0.755, 0); g.add(glass);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.018, 0.07),
          new THREE.MeshStandardMaterial({ color: 0xdff2ff, emissive: 0x9fd4ff, emissiveIntensity: 0.9, roughness: 0.4 }));
        strip.position.set(0, 0.99, 0); g.add(strip);
        const fishM = mat(0xf28a3d, 0.6), finM = mat(0xd96c22, 0.7);
        const spots = [[-w * 0.22, 0.68, -d * 0.12, 0.5], [w * 0.18, 0.78, d * 0.1, 2.4], [w * 0.05, 0.72, -d * 0.05, 3.6]];
        for (const s of spots) {
          const f = new THREE.Group();
          const bodyF = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), fishM);
          bodyF.scale.set(1.5, 1, 0.7); f.add(bodyF);
          const tail = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.045, 8), finM);
          tail.rotation.z = Math.PI / 2; tail.position.x = -0.055; f.add(tail);
          f.position.set(s[0], s[1], s[2]); f.rotation.y = s[3]; g.add(f);
        }
        for (const sx of [-1, 1]) {
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.26, 0.02), mat(0x3f9e5f, 0.8));
          leaf.position.set(sx * w * 0.3, 0.68, sx * d * 0.18); leaf.rotation.z = sx * 0.18; g.add(leaf);
        }

      } else if (type === 'lamp') {
        const s = Math.min(w, d);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.3, s * 0.34, 0.05, 20), mat(0x23262d, 0.5, 0.4));
        base.position.y = 0.025; base.castShadow = true; g.add(base);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.12, 12), mat(0x3a3f48, 0.4, 0.6));
        pole.position.y = 0.6; pole.castShadow = true; g.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xfff1cc, emissiveIntensity: 1.2, roughness: 0.4 }));
        bulb.position.y = 1.2; g.add(bulb);
        const shadeM = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.24, s * 0.46, 0.34, 24, 1, true),
          new THREE.MeshStandardMaterial({ color: pick(0xcaa25a), emissive: 0xffd9a0, emissiveIntensity: 0.5, roughness: 0.65, side: THREE.DoubleSide }));
        shadeM.position.y = 1.27; shadeM.castShadow = true; g.add(shadeM);

      } else if (type === 'column') {
        const cm2 = mat(pick(0x9aa3b0), 0.8), trim2 = mat(pickS(0.78, 0x7b8492), 0.8);
        box(w, 0.1, d, 0, 0.05, 0, trim2);
        box(w * 0.9, 1.45, d * 0.9, 0, 0.82, 0, cm2);
        box(w, 0.09, d, 0, 1.6, 0, trim2);

      } else if (type === 'fridge') {
        const steel = mat(pick(0xc9ced6), 0.32, 0.55), dkst = mat(pickS(0.78, 0x9ba2ac), 0.4, 0.5);
        box(w, 0.06, d, 0, 0.03, 0, mat(0x2a2e34, 0.6));
        box(w, 1.48, d, 0, 0.8, 0, steel);
        box(w, 0.03, d, 0, 1.55, 0, dkst);
        box(w * 0.98, 0.018, 0.02, 0, 0.62, -d / 2 - 0.004, dkst);
        box(0.014, 0.86, 0.02, 0, 1.06, -d / 2 - 0.004, dkst);
        const hm = mat(0xe8ecf1, 0.22, 0.85);
        box(0.03, 0.5, 0.035, -0.055, 1.05, -d / 2 - 0.028, hm);
        box(0.03, 0.5, 0.035, 0.055, 1.05, -d / 2 - 0.028, hm);
        box(w * 0.5, 0.03, 0.035, 0, 0.5, -d / 2 - 0.028, hm);

      } else if (type === 'kitchen') {
        const wood = mat(pick(0x8b6a48), 0.65), dkw = mat(pickS(0.74, 0x67503a), 0.7);
        box(w * 0.97, 0.12, d * 0.9, 0, 0.06, d * 0.04, mat(0x24272c, 0.75));
        box(w * 0.97, 0.72, d * 0.94, 0, 0.48, 0, wood);
        box(w, 0.05, d, 0, 0.865, 0, mat(0xd8dce2, 0.35));
        const nDoors = Math.max(2, Math.round(w / 0.6)), dw2 = (w * 0.94) / nDoors;
        for (let k = 1; k < nDoors; k++) box(0.014, 0.56, 0.014, -w * 0.47 + k * dw2, 0.45, -d / 2 - 0.004, dkw);
        for (let k = 0; k < nDoors; k++) box(0.09, 0.02, 0.03, -w * 0.47 + (k + 0.5) * dw2, 0.68, -d / 2 - 0.02, mat(0xb9c2cf, 0.3, 0.7));
        const sx = w * 0.16;
        box(Math.min(0.6, w * 0.4), 0.025, d * 0.56, sx, 0.885, 0, mat(0x9aa2ab, 0.25, 0.7));
        const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.2, 12), mat(0xc2cad4, 0.2, 0.85));
        fp.position.set(sx, 0.99, d * 0.26); fp.castShadow = true; g.add(fp);
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 10), mat(0xc2cad4, 0.2, 0.85));
        sp.rotation.x = Math.PI / 2; sp.position.set(sx, 1.08, d * 0.14); g.add(sp);

      } else if (type === 'stove') {
        const bodyM = mat(pick(0x3a3f46), 0.55);
        box(w, 0.1, d, 0, 0.05, 0, mat(0x1c1f24, 0.7));
        box(w, 0.74, d, 0, 0.47, 0, bodyM);
        box(w, 0.035, d, 0, 0.855, 0, mat(0x15171b, 0.3));
        for (const bx of [-1, 1]) for (const bz of [-1, 1]) {
          const br = Math.min(w, d) * 0.14;
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(br, br, 0.012, 18), mat(0x22262b, 0.5));
          ring.position.set(bx * w * 0.22, 0.878, bz * d * 0.2); g.add(ring);
          const fl = new THREE.Mesh(new THREE.TorusGeometry(br * 0.55, 0.015, 8, 18),
            new THREE.MeshStandardMaterial({ color: 0x3a1a06, emissive: 0xff7a26, emissiveIntensity: 1.1, roughness: 0.5 }));
          fl.rotation.x = Math.PI / 2; fl.position.set(bx * w * 0.22, 0.885, bz * d * 0.2); g.add(fl);
        }
        const ov = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.3, 0.02),
          new THREE.MeshStandardMaterial({ color: 0x0c0f13, emissive: 0x63340f, emissiveIntensity: 0.5, roughness: 0.3 }));
        ov.position.set(0, 0.4, -d / 2 - 0.006); g.add(ov);
        box(w * 0.76, 0.03, 0.04, 0, 0.66, -d / 2 - 0.035, mat(0xb9c2cf, 0.3, 0.7));
        box(w * 0.85, 0.1, d * 0.8, 0, 1.5, 0, mat(pickS(0.85, 0x31353c), 0.5, 0.4));
        box(w * 0.3, 0.42, d * 0.4, 0, 1.76, 0, mat(pickS(0.85, 0x31353c), 0.5, 0.4));

      } else if (type === 'washer') {
        const wm = mat(pick(0xdfe3e8), 0.4);
        box(w, 0.82, d, 0, 0.44, 0, wm);
        box(w, 0.09, d, 0, 0.885, 0, mat(pickS(0.85, 0xc6cbd2), 0.5));
        box(w * 0.92, 0.13, 0.02, 0, 0.76, -d / 2 - 0.005, mat(0x2a2e34, 0.4));
        for (const kx of [-1, 0.4, 0.75]) {
          const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 12), mat(0xe8ecf1, 0.3, 0.6));
          kn.rotation.x = Math.PI / 2; kn.position.set(kx * w * 0.3, 0.76, -d / 2 - 0.018); g.add(kn);
        }
        const dr = Math.min(w, d) * 0.28;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(dr, 0.032, 12, 28), mat(0xaeb5bf, 0.3, 0.7));
        ring.position.set(0, 0.42, -d / 2 - 0.015); g.add(ring);
        const glass2 = new THREE.Mesh(new THREE.CylinderGeometry(dr * 0.82, dr * 0.82, 0.03, 24),
          new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.15, metalness: 0.3, emissive: 0x16273a, emissiveIntensity: 0.4 }));
        glass2.rotation.x = Math.PI / 2; glass2.position.set(0, 0.42, -d / 2 - 0.02); g.add(glass2);

      } else if (type === 'bathtub') {
        const shell = mat(pick(0xeef1f3), 0.3);
        box(w * 0.95, 0.5, d * 0.92, 0, 0.25, 0, shell);
        box(w, 0.055, d, 0, 0.53, 0, mat(pickS(0.93, 0xdde2e6), 0.28));
        const wat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.03, d * 0.7),
          new THREE.MeshStandardMaterial({ color: 0x63b7e6, roughness: 0.08, transparent: true, opacity: 0.8, emissive: 0x1e4c66, emissiveIntensity: 0.35 }));
        wat.position.set(-w * 0.04, 0.485, 0); g.add(wat);
        const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 10), mat(0xc2cad4, 0.2, 0.85));
        tap.position.set(w / 2 - 0.13, 0.62, 0); tap.castShadow = true; g.add(tap);
        const spo = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 10), mat(0xc2cad4, 0.2, 0.85));
        spo.rotation.z = Math.PI / 2; spo.position.set(w / 2 - 0.2, 0.7, 0); g.add(spo);

      } else if (type === 'toilet') {
        const wm2 = mat(pick(0xf0f2f4), 0.3);
        box(w * 0.85, 0.5, d * 0.28, 0, 0.5, d / 2 - d * 0.15, wm2);
        box(w * 0.88, 0.04, d * 0.3, 0, 0.77, d / 2 - d * 0.15, mat(pickS(0.93, 0xdde2e6), 0.3));
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.32, Math.min(w, d) * 0.22, 0.4, 20), wm2);
        bowl.scale.z = 1.3; bowl.position.set(0, 0.22, -d * 0.12); bowl.castShadow = true; g.add(bowl);
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.35, Math.min(w, d) * 0.35, 0.045, 20), mat(pickS(1.03, 0xffffff), 0.35));
        seat.scale.z = 1.3; seat.position.set(0, 0.44, -d * 0.12); g.add(seat);

      } else if (type === 'dresser') {
        const wood2 = mat(pick(0x6b533a), 0.6), trim3 = mat(pickS(0.72, 0x4d3a27), 0.7);
        box(w * 0.94, 0.09, d * 0.9, 0, 0.045, 0, trim3);
        box(w * 0.95, 0.6, d * 0.93, 0, 0.39, 0, wood2);
        box(w, 0.04, d, 0, 0.71, 0, trim3);
        for (const dy of [0.3, 0.53]) {
          box(w * 0.9, 0.014, 0.014, 0, dy, -d / 2 - 0.004, trim3);
          const kb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat(0xd9c48c, 0.3, 0.7));
          kb.position.set(0, dy + 0.11, -d / 2 - 0.02); g.add(kb);
        }

      } else if (type === 'desk') {
        const wood3 = mat(pick(0x5f4a36), 0.55);
        box(w, 0.05, d * 0.5, 0, 0.72, d * 0.23, wood3);
        for (const sxx of [-1, 1]) box(0.05, 0.72, d * 0.46, sxx * (w / 2 - 0.03), 0.36, d * 0.23, wood3);
        box(0.05, 0.1, 0.05, 0, 0.8, d * 0.3, mat(0x22262c, 0.5));
        const scr2 = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.55, 0.72), 0.34, 0.03),
          new THREE.MeshStandardMaterial({ color: 0x0a0f14, emissive: 0x1f4a66, emissiveIntensity: 0.85, roughness: 0.3 }));
        scr2.position.set(0, 1.02, d * 0.32); scr2.castShadow = true; g.add(scr2);
        box(w * 0.32, 0.016, 0.11, 0, 0.755, d * 0.1, mat(0x1c2026, 0.6));
        const chC = mat(pickS(0.6, 0x2b2f36), 0.6);
        const seat2 = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 18), chC);
        seat2.position.set(0, 0.44, -d * 0.2); seat2.castShadow = true; g.add(seat2);
        box(0.34, 0.4, 0.05, 0, 0.68, -d * 0.2 - 0.19, chC);
        const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.3, 10), mat(0x14171c, 0.5, 0.4));
        pole2.position.set(0, 0.27, -d * 0.2); g.add(pole2);
        const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.035, 16), mat(0x14171c, 0.5, 0.4));
        bs.position.set(0, 0.12, -d * 0.2); g.add(bs);

      } else if (type === 'treadmill') {
        const dkm = mat(pick(0x2e3238), 0.6);
        box(w * 0.9, 0.09, d * 0.78, 0, 0.1, d * 0.08, dkm);
        box(w * 0.62, 0.014, d * 0.7, 0, 0.155, d * 0.08, mat(0x14161a, 0.85));
        for (const sxx of [-1, 1]) {
          box(0.05, 0.72, 0.05, sxx * w * 0.32, 0.5, -d * 0.33, dkm);
          box(0.035, 0.035, d * 0.42, sxx * w * 0.32, 0.82, -d * 0.12, mat(pickS(1.3, 0x545a63), 0.5));
        }
        box(w * 0.7, 0.15, 0.1, 0, 0.95, -d * 0.33, dkm);
        const tsc = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.08, 0.014),
          new THREE.MeshStandardMaterial({ color: 0x0a0f14, emissive: 0x1f6653, emissiveIntensity: 0.9, roughness: 0.3 }));
        tsc.position.set(0, 0.97, -d * 0.33 - 0.058); g.add(tsc);

      } else if (type === 'plant') {
        const s = Math.min(w, d);
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.34, s * 0.28, 0.28, 18), mat(pickS(0.9, 0xa0522d), 0.8));
        pot.position.y = 0.14; pot.castShadow = true; g.add(pot);
        for (const p of [[0, 0.48, 0, 0.56], [-0.1, 0.42, 0.05, 0.34], [0.1, 0.44, -0.05, 0.36]]) {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(s * p[3], 0), mat(pick(0x3f8f4f), 0.8));
          leaf.position.set(p[0], p[1], p[2]); leaf.castShadow = true; g.add(leaf);
        }

      } else if (type === 'armchair') {              // single-seat sofa
        const f = mat(pick(0x4f5c70)), dk = mat(pickS(0.78, 0x414c5e)), cu = mat(pickS(1.28, 0x63728b));
        box(w, 0.24, d, 0, 0.13, 0, f);
        box(w, 0.44, d * 0.24, 0, 0.36, -d / 2 + d * 0.12, dk);
        box(w * 0.16, 0.3, d, -w / 2 + w * 0.08, 0.32, 0, dk);
        box(w * 0.16, 0.3, d, w / 2 - w * 0.08, 0.32, 0, dk);
        box(w * 0.62, 0.12, d * 0.58, 0, 0.31, d * 0.06, cu);
        box(w * 0.62, 0.26, d * 0.14, 0, 0.44, -d / 2 + d * 0.24, cu);

      } else if (type === 'chair') {                 // dining chair (back at +z)
        const wood = mat(pick(0x7a5230), 0.6);
        box(w * 0.9, 0.05, d * 0.85, 0, 0.45, -d * 0.05, wood);                 // seat
        const lx = w * 0.36, lz = d * 0.32;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.045, 0.45, 0.045, sx * lx, 0.225, sz * lz - d * 0.05, wood);
        box(w * 0.9, 0.5, 0.05, 0, 0.72, d * 0.28, wood);                       // backrest
        box(w * 0.7, 0.08, 0.05, 0, 0.6, d * 0.28, mat(pickS(1.25, 0x96702e), 0.6));

      } else if (type === 'cactus') {                // potted cactus
        const s = Math.min(w, d);
        const grn = mat(pick(0x3f8f4f), 0.85), pot2 = mat(pickS(0.75, 0xa0522d), 0.8);
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.34, s * 0.27, 0.26, 16), pot2);
        pot.position.y = 0.13; pot.castShadow = true; g.add(pot);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.16, s * 0.18, 0.75, 12), grn);
        trunk.position.y = 0.6; trunk.castShadow = true; g.add(trunk);
        const top = new THREE.Mesh(new THREE.SphereGeometry(s * 0.16, 12, 8), grn);
        top.position.y = 0.98; g.add(top);
        for (const sx of [-1, 1]) {                                             // two arms
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.09, s * 0.09, 0.3, 10), grn);
          arm.position.set(sx * s * 0.26, 0.72 + (sx > 0 ? 0.08 : 0), 0); arm.castShadow = true; g.add(arm);
          const elbow = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.09, s * 0.09, s * 0.24, 10), grn);
          elbow.rotation.z = Math.PI / 2; elbow.position.set(sx * s * 0.17, 0.6 + (sx > 0 ? 0.08 : 0), 0); g.add(elbow);
        }

      } else if (type === 'palm') {                  // tall potted palm
        const s = Math.min(w, d);
        const leafM = mat(pick(0x3f9e5f), 0.8);
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.3, s * 0.24, 0.3, 16), mat(pickS(0.7, 0x8a5a3a), 0.8));
        pot.position.y = 0.15; pot.castShadow = true; g.add(pot);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.95, 10), mat(0x8a6a45, 0.9));
        trunk.position.y = 0.77; trunk.castShadow = true; g.add(trunk);
        for (let k = 0; k < 6; k++) {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), leafM);
          leaf.scale.set(1.6, 0.12, 0.38);
          const a = (k / 6) * Math.PI * 2;
          leaf.position.set(Math.cos(a) * 0.26, 1.3, Math.sin(a) * 0.26);
          leaf.rotation.y = -a; leaf.rotation.z = 0.45;
          leaf.castShadow = true; g.add(leaf);
        }

      } else if (type === 'trash') {                 // pedal bin
        const s = Math.min(w, d);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.38, s * 0.32, 0.62, 18), mat(pick(0x5b6675), 0.45, 0.4));
        body.position.y = 0.31; body.castShadow = true; g.add(body);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.4, s * 0.4, 0.05, 18), mat(pickS(0.75, 0x454f5c), 0.4, 0.4));
        rim.position.y = 0.65; g.add(rim);
        const lid = new THREE.Mesh(new THREE.SphereGeometry(s * 0.39, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(pickS(1.15, 0x76828f), 0.4, 0.4));
        lid.scale.y = 0.45; lid.position.y = 0.675; g.add(lid);
        box(0.1, 0.035, 0.09, 0, 0.02, -s * 0.36, mat(0x2a2e34, 0.5));          // pedal

      } else if (type === 'dump') {
        // The EMPTYING STATION (U19 solo): the auto-empty base a real Xiaomi /
        // Roborock robot noses into to have its bin sucked out. A slim glossy
        // tower standing at the BACK, a low tray in FRONT for the robot to
        // drive onto, and every panel flush with the body it sits on — nothing
        // here is a slab floating through a curved surface.
        const s = Math.max(0.42, Math.min(w, d));
        const BW = s * 0.9, BD = s * 0.66, H = 0.58;   // the tower's own box
        const FL = 0.055;                              // floor = tile top
        const zBack = -s * 0.14;                       // the tower stands back
        const front = zBack + BD / 2;                  // its front face
        const shell = mat(pick(0xf6f8fb), 0.22, 0.06);
        const shellDk = mat(pickS(0.88, 0xdde4ec), 0.3, 0.08);
        const dark = mat(0x1a2028, 0.4, 0.2);
        const M = (bw, bh, bd, x, y, z, m, shadow) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
          mesh.position.set(x, y, z);
          if (shadow) { mesh.castShadow = true; }
          mesh.receiveShadow = true; g.add(mesh); return mesh;
        };

        // ---- the tray the robot noses onto, and the mouth the dust goes down
        M(BW, 0.018, s * 0.66, 0, FL + 0.009, zBack + BD / 2 + s * 0.3, shellDk);
        M(BW * 0.52, 0.011, s * 0.17, 0, FL + 0.019, zBack + BD / 2 + s * 0.16, mat(0x0e131a, 0.55));
        // the two guide fins that funnel the robot straight in
        for (const sx of [-1, 1]) M(0.016, 0.03, s * 0.6, sx * BW * 0.46, FL + 0.03, zBack + BD / 2 + s * 0.32, shellDk);

        // ---- the tower ----
        M(BW, H, BD, 0, FL + H / 2, zBack, shell, true);
        // a stepped lid, so the silhouette is a product and not a brick
        M(BW * 0.93, 0.055, BD * 0.9, 0, FL + H + 0.027, zBack, shell, true);
        M(BW * 0.6, 0.012, BD * 0.55, 0, FL + H + 0.06, zBack, dark);
        // the seam between lid and body — standing PROUD of the body, never
        // flush with it, or the two surfaces fight and the band goes jagged
        M(BW * 1.03, 0.01, BD * 1.03, 0, FL + H - 0.02, zBack, shellDk);

        // ---- the front face: everything below is FLUSH with it ----
        // the smoked dust-bag window, inset like a real one
        M(BW * 0.6, H * 0.4, 0.008, 0, FL + H * 0.46, front,
          new THREE.MeshStandardMaterial({ color: 0x2b3441, roughness: 0.18, metalness: 0.1 }));
        M(BW * 0.5, H * 0.3, 0.006, 0, FL + H * 0.45, front + 0.003, mat(0xcfc9bb, 0.95));
        // the status light
        M(BW * 0.3, 0.016, 0.006, 0, FL + H * 0.8, front + 0.001,
          new THREE.MeshStandardMaterial({ color: 0x2fd08a, emissive: 0x2fd08a, emissiveIntensity: 1.3, roughness: 0.3 }));
        // the dark intake throat under the window, where the tray meets the body
        M(BW * 0.66, H * 0.13, 0.007, 0, FL + H * 0.09, front + 0.001, mat(0x0e131a, 0.5));

        // a painted mark on the floor so the aim point reads from above
        const markM = new THREE.MeshBasicMaterial({ color: 0x2fd08a, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
        const mark = new THREE.Mesh(new THREE.RingGeometry(s * 0.66, s * 0.74, 36), markM);
        mark.rotation.x = -Math.PI / 2; mark.position.set(0, 0.0575, zBack + s * 0.2); g.add(mark);

      } else if (type === 'box') {                   // cardboard boxes
        const card = mat(pick(0xb08d57), 0.95), dark2 = mat(pickS(0.8, 0x8d6f42), 0.95);
        box(w * 0.96, 0.42, d * 0.96, 0, 0.21, 0, card);                        // big box
        for (const fl of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {                  // open flaps
          const flap = new THREE.Mesh(new THREE.BoxGeometry(fl[0] ? w * 0.3 : w * 0.9, 0.02, fl[1] ? d * 0.3 : d * 0.9), dark2);
          flap.position.set(fl[0] * w * 0.45, 0.45, fl[1] * d * 0.45);
          flap.rotation.z = fl[0] * 0.5; flap.rotation.x = -fl[1] * 0.5;
          g.add(flap);
        }
        box(w * 0.42, 0.3, d * 0.42, w * 0.2, 0.57, -d * 0.18, card);           // small box on top

      } else if (type === 'bench') {                 // wooden bench
        const wood = mat(pick(0x8a5a2e), 0.75), dkw = mat(pickS(0.7, 0x67411f), 0.8);
        for (const sz of [-1, 0, 1]) box(w, 0.045, d * 0.24, 0, 0.42, sz * d * 0.3, wood);   // seat slats
        for (const sx of [-1, 1]) {
          box(0.06, 0.42, d * 0.8, sx * (w / 2 - 0.06), 0.21, 0, dkw);          // legs
        }
        for (const sy of [0.62, 0.76]) box(w, 0.05, 0.04, 0, sy, -d / 2 + 0.03, wood);       // back slats
        for (const sx of [-1, 1]) box(0.05, 0.4, 0.04, sx * (w / 2 - 0.07), 0.6, -d / 2 + 0.03, dkw);

      } else if (type === 'doghouse') {              // kennel (door at -z)
        const wall2 = mat(pick(0x8a5a2e), 0.85), roof2 = mat(pickS(0.62, 0x5c3a1c), 0.85);
        box(w, 0.55, d, 0, 0.275, 0, wall2);                                    // body
        const rw = Math.hypot(w / 2, 0.32);
        for (const sx of [-1, 1]) {                                             // gable roof
          const panel = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.045, d), roof2);
          panel.position.set(sx * w * 0.23, 0.71, 0); panel.rotation.z = -sx * 0.61;
          panel.castShadow = true; g.add(panel);
        }
        const door = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.2, 0.03, 16, 1, false, 0, Math.PI), mat(0x1c140c, 0.95));
        door.rotation.x = Math.PI / 2; door.rotation.z = Math.PI / 2;
        door.position.set(0, 0.3, -d / 2 - 0.005); g.add(door);
        box(w * 0.4, 0.3, 0.03, 0, 0.15, -d / 2 - 0.004, mat(0x1c140c, 0.95));

      } else if (type === 'cattree') {               // scratching post tower
        const carpet = mat(pick(0xb9a58e), 0.95), post = mat(pickS(0.8, 0x94816c), 0.95);
        box(w, 0.06, d, 0, 0.03, 0, carpet);                                    // base
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.52, 12), post);
        p1.position.set(-w * 0.2, 0.32, -d * 0.15); p1.castShadow = true; g.add(p1);
        box(w * 0.5, 0.05, d * 0.5, -w * 0.15, 0.6, -d * 0.1, carpet);          // mid platform
        const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 12), post);
        p2.position.set(w * 0.18, 0.83, d * 0.12); p2.castShadow = true; g.add(p2);
        box(w * 0.42, 0.05, d * 0.42, w * 0.18, 1.06, d * 0.12, carpet);        // top platform
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0xd96c22, 0.6));
        ball.position.set(-w * 0.32, 0.5, d * 0.28); g.add(ball);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), mat(0x6b5b45, 0.9));
        rope.position.set(-w * 0.32, 0.6, d * 0.28); g.add(rope);

      } else if (type === 'petbowl') {               // feeding mat with two bowls
        const s = Math.min(w, d);
        box(w, 0.02, d, 0, 0.01, 0, mat(pick(0x4f5c70), 0.9));                  // mat
        const mk = (x, liquid, lm) => {
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.34, s * 0.26, 0.1, 16), mat(0xdfe3e8, 0.4));
          bowl.position.set(x, 0.07, 0); bowl.castShadow = true; g.add(bowl);
          const fill = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.28, s * 0.28, 0.02, 16), lm);
          fill.position.set(x, 0.115, 0); g.add(fill);
        };
        mk(-w * 0.24, 'food', mat(0x8a5a2e, 0.95));
        mk(w * 0.24, 'water', new THREE.MeshStandardMaterial({ color: 0x63b7e6, roughness: 0.1, transparent: true, opacity: 0.85 }));
      }

      return g;
    }

    /* ---------- rug: border + keyline + medallion + fringe ---------- */
    function buildRug(opts) {
      // a ROUND factor (0..1) turns the corners: 0 = rectangle, 1 = oval
      if (opts && opts.round) {
        const w = opts.w || 2, d = opts.d || 1.4;
        const r = Math.min(w, d) / 2 * Math.min(1, Math.max(0, opts.round));
        const sh = new THREE.Shape();
        const hw = w / 2 - r, hd = d / 2 - r;
        sh.moveTo(-hw, -d / 2);
        sh.lineTo(hw, -d / 2); sh.absarc(hw, -hd, r, -Math.PI / 2, 0);
        sh.lineTo(w / 2, hd); sh.absarc(hw, hd, r, 0, Math.PI / 2);
        sh.lineTo(-hw, d / 2); sh.absarc(-hw, hd, r, Math.PI / 2, Math.PI);
        sh.lineTo(-w / 2, -hd); sh.absarc(-hw, -hd, r, Math.PI, Math.PI * 1.5);
        const geo = new THREE.ShapeGeometry(sh, 24);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: parseColor(opts.color) != null ? parseColor(opts.color) : 0x2f7d4a, roughness: 0.95 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.012;
        mesh.receiveShadow = true;
        const g = new THREE.Group();
        g.add(mesh);
        return g;
      }
      const rw = opts.w, rd = opts.d;
      const rc = parseColor(opts.color) != null ? parseColor(opts.color) : 0x2f7d4a;
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.02, rd), mat(rc, 0.98));
      base.position.y = 0.066; base.receiveShadow = true; g.add(base);
      const bt = Math.min(0.13, Math.min(rw, rd) * 0.09);
      const bm = mat(shade(rc, 0.68), 0.98);
      for (const b of [[rw, bt, 0, -rd / 2 + bt / 2], [rw, bt, 0, rd / 2 - bt / 2], [bt, rd, -rw / 2 + bt / 2, 0], [bt, rd, rw / 2 - bt / 2, 0]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(b[0], 0.023, b[1]), bm);
        m.position.set(b[2], 0.069, b[3]); g.add(m);
      }
      const lt = mat(shade(rc, 1.4), 0.95), kt = bt * 0.4;
      const inW = rw - bt * 3.4, inD = rd - bt * 3.4;
      if (inW > 0.35 && inD > 0.35) {
        for (const b of [[inW, kt, 0, -inD / 2], [inW, kt, 0, inD / 2], [kt, inD, -inW / 2, 0], [kt, inD, inW / 2, 0]]) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(b[0], 0.0235, b[1]), lt);
          m.position.set(b[2], 0.0695, b[3]); g.add(m);
        }
      }
      const mr = Math.min(rw, rd) * 0.17;
      if (mr > 0.12) {
        const med = new THREE.Mesh(new THREE.CylinderGeometry(mr, mr, 0.006, 28), lt);
        med.position.y = 0.0715; g.add(med);
        const med2 = new THREE.Mesh(new THREE.CylinderGeometry(mr * 0.55, mr * 0.55, 0.007, 22), mat(shade(rc, 0.78), 0.95));
        med2.position.y = 0.0722; g.add(med2);
      }
      const fm = mat(0xe8e0cc, 0.95);
      const alongX = rw >= rd;
      const edge = alongX ? rd : rw;
      const n = Math.max(4, Math.floor(edge / 0.16));
      for (let k = 0; k < n; k++) {
        const t = -edge / 2 + (k + 0.5) * (edge / n);
        for (const s of [-1, 1]) {
          const tas = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.07 : 0.045, 0.012, alongX ? 0.045 : 0.07), fm);
          if (alongX) tas.position.set(s * (rw / 2 + 0.035), 0.062, t);
          else tas.position.set(t, 0.062, s * (rd / 2 + 0.035));
          g.add(tas);
        }
      }
      return g;
    }

    /* ---------- window pane for a 0.7 m dollhouse wall ---------- */
    function buildWindow(opts) {
      const len = opts.len || 1.25;
      const tint = parseColor(opts.color) != null ? parseColor(opts.color) : 0xdfe8f2;
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(len, 0.42, 0.2), mat(tint, 0.55));
      frame.position.y = 0.41; frame.castShadow = true; g.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(len - 0.07, 0.33, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0xa8d4ff, emissiveIntensity: 0.85, roughness: 0.25 }));
      glass.position.y = 0.41; g.add(glass);
      const n = Math.max(1, Math.round(len / 0.55));
      const mulM = mat(shade(tint, 0.8), 0.55);
      for (let k = 1; k <= n; k++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.33, 0.23), mulM);
        bar.position.set(-len / 2 + (k * len) / (n + 1), 0.41, 0); g.add(bar);
      }
      const sill = new THREE.Mesh(new THREE.BoxGeometry(len + 0.09, 0.035, 0.28), mat(shade(tint, 0.9), 0.6));
      sill.position.y = 0.195; g.add(sill);
      return g;
    }

    /* ---------- charging station ----------
       The dock a battery-powered robot parks on. Built like a real cordless-
       vacuum base: a graphite slab with a brushed-aluminium rim, brass contact
       plates, an induction coil, a ring of charge LEDs and a soft light shell
       that only wakes up while a robot is actually drinking.

       Nothing on it is taller than the chassis except the LIGHT, which has no
       body at all — so the pad can be driven onto from any direction and the
       station never becomes an obstacle.

       opts: { r = 0.32 }
       -> { group, coils, glow, halo, rise, leds, bolt, spill, contacts }       */
    function buildDock(opts) {
      opts = opts || {};
      const r = opts.r || 0.32;
      const g = new THREE.Group();

      // ---- the BOXED home (a match setting in the vacuum league's U19) ----
      // Styled like a real base station: the robot backs into a bay between
      // two low arms, the charge face and dust tower stand behind it (east),
      // and the only way in is from the west. The three physics lips carry
      // exactly this footprint — this is just their skin.
      if (opts.boxed) {
        const shell = new THREE.MeshStandardMaterial({ color: 0xf2f5f9, roughness: 0.28, metalness: 0.06 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x161c26, roughness: 0.4, metalness: 0.2 });
        const FLOOR = 0.055;
        // the tower: charging home + dust collector in one body
        const tower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.98), shell);
        tower.position.set(0.53, FLOOR + 0.25, 0); tower.castShadow = true; g.add(tower);
        const towerTop = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.03, 0.99), dark);
        towerTop.position.set(0.53, FLOOR + 0.515, 0); g.add(towerTop);
        // the dark charge face the robot backs up against
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.34, 0.84), dark);
        face.position.set(0.414, FLOOR + 0.19, 0); g.add(face);
        // its LED line — the same green the pad glows with
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x2fd08a, emissive: 0x2fd08a, emissiveIntensity: 1.2, roughness: 0.3 }));
        led.position.set(0.405, FLOOR + 0.09, 0); g.add(led);
        // the smoked dust bin riding the tower, with the dust showing inside
        const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.24, 24),
          new THREE.MeshStandardMaterial({ color: 0xbcd6e8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.38 }));
        bin.position.set(0.53, FLOOR + 0.5 + 0.12, 0.26); bin.castShadow = true; g.add(bin);
        const dust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.09, 20),
          new THREE.MeshStandardMaterial({ color: 0x8a7358, roughness: 0.95 }));
        dust.position.set(0.53, FLOOR + 0.5 + 0.05, 0.26); g.add(dust);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.028, 24), dark);
        cap.position.set(0.53, FLOOR + 0.5 + 0.25, 0.26); g.add(cap);
        // the two low arms that make the bay — one way in, from the west
        for (const sZ of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.13, 0.1), shell);
          arm.position.set(0, FLOOR + 0.065, sZ * 0.46); arm.castShadow = true; g.add(arm);
          const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 14), shell);
          tip.position.set(-0.5, FLOOR + 0.065, sZ * 0.46); g.add(tip);
          const armLed = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.012, 0.014),
            new THREE.MeshStandardMaterial({ color: 0x2fd08a, emissive: 0x2fd08a, emissiveIntensity: 0.8, roughness: 0.3 }));
          armLed.position.set(-0.15, FLOOR + 0.135, sZ * 0.46); g.add(armLed);
        }
      }
      const GREEN = 0x2fd08a, LIGHT = 0x8bffd0;
      const flat = (color, opacity) => new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
      });

      // light spilling onto the floor around the station (flush with the tiles)
      const spill = new THREE.Mesh(new THREE.CircleGeometry(r * 1.85, 40), flat(GREEN, 0.13));
      spill.rotation.x = -Math.PI / 2; spill.position.y = 0.0565; g.add(spill);

      // the painted parking ring on the floor — you can see where to aim
      const marks = new THREE.Mesh(new THREE.RingGeometry(r * 1.12, r * 1.2, 44), flat(GREEN, 0.5));
      marks.rotation.x = -Math.PI / 2; marks.position.y = 0.0575; g.add(marks);
      for (let k = 0; k < 4; k++) {                       // four approach ticks
        const t = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.10, r * 0.34), flat(GREEN, 0.45));
        t.rotation.x = -Math.PI / 2; t.rotation.z = k * Math.PI / 2;
        t.position.set(Math.cos(k * Math.PI / 2) * r * 1.38, 0.0575, Math.sin(k * Math.PI / 2) * r * 1.38);
        g.add(t);
      }

      // the slab (0.055 = tile top, so it is a 2 cm step the robot rides onto)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.03, 0.019, 48),
        new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.45, metalness: 0.18 }));
      base.position.y = 0.0645; base.receiveShadow = true; g.add(base);

      // brushed-aluminium rim (there is no environment map in this scene, so the
      // metals are kept semi-rough — full metalness would render pitch black)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.995, 0.009, 10, 48),
        new THREE.MeshStandardMaterial({ color: 0xe4ebf3, roughness: 0.34, metalness: 0.35 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.0725; g.add(rim);

      // the glossy inlay the robot actually sits on
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.004, 48),
        new THREE.MeshStandardMaterial({ color: 0x101a22, emissive: GREEN, emissiveIntensity: 0.14, roughness: 0.2, metalness: 0.3 }));
      glow.position.y = 0.0745; g.add(glow);

      // induction coil: three fine rings that pulse outward while charging
      const coils = new THREE.Group();
      for (let k = 1; k <= 3; k++) {
        const rr = r * (0.24 + k * 0.19);
        const c = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0042, 8, 44),
          new THREE.MeshStandardMaterial({ color: 0xe6fff4, emissive: LIGHT, emissiveIntensity: 0.75, roughness: 0.35 }));
        c.rotation.x = Math.PI / 2; c.position.y = 0.0765; coils.add(c);
      }
      g.add(coils);

      // brass charging contacts, exactly where a real dock puts them
      const contacts = new THREE.Group();
      const brass = new THREE.MeshStandardMaterial({ color: 0xf3c766, roughness: 0.28, metalness: 0.4 });
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(r * 0.13, 0.005, r * 0.42), brass);
        p.position.set(s * r * 0.30, 0.0775, 0); contacts.add(p);
      }
      g.add(contacts);

      // the lightning bolt in the middle — reads as "charge here" at a glance
      const bolt = new THREE.Group();
      const boltM = new THREE.MeshStandardMaterial({ color: 0xffd88a, emissive: 0xffc02e, emissiveIntensity: 0.5, roughness: 0.35, side: THREE.DoubleSide });
      // the outline of a ⚡, drawn once around: the two waist steps sit at
      // different heights, otherwise the outline crosses itself into a bowtie
      const bs = new THREE.Shape();
      bs.moveTo(0.50, 1.00); bs.lineTo(-0.50, 0.15); bs.lineTo(-0.05, 0.15);
      bs.lineTo(-0.50, -1.00); bs.lineTo(0.50, -0.15); bs.lineTo(0.05, -0.15);
      bs.closePath();
      const boltMesh = new THREE.Mesh(new THREE.ShapeGeometry(bs), boltM);
      boltMesh.rotation.x = -Math.PI / 2;
      boltMesh.scale.setScalar(r * 0.42);
      boltMesh.position.y = 0.0785;
      bolt.add(boltMesh);
      g.add(bolt);

      // A soft beam standing on the empty station so a robot can spot it from
      // across the room. It fades out the moment someone parks, so it never
      // cuts through the chassis.
      const beam = new THREE.Group();
      for (const [rr, h, op] of [[r * 0.42, 0.36, 0.16], [r * 0.20, 0.50, 0.11]]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.45, rr, h, 22, 1, true), flat(LIGHT, op));
        c.position.y = 0.058 + h / 2; beam.add(c);
      }
      g.add(beam);

      // charge LEDs around the rim — they fill up like a battery gauge
      const leds = [];
      const N = 16;
      for (let k = 0; k < N; k++) {
        const a = -Math.PI / 2 + (k / N) * Math.PI * 2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.004, 0.024),
          new THREE.MeshStandardMaterial({ color: 0x2c3a44, emissive: GREEN, emissiveIntensity: 0, roughness: 0.4 }));
        m.position.set(Math.cos(a) * r * 0.945, 0.0775, Math.sin(a) * r * 0.945);
        m.rotation.y = -a;
        leds.push(m); g.add(m);
      }

      // A shell of light standing AROUND the parking spot — wider than the robot,
      // so it wraps it instead of cutting through it. Pure light: no geometry the
      // physics ever sees.
      const halo = new THREE.Group();
      for (const [rr, h, op] of [[r * 0.93, 0.30, 0.13], [r * 1.02, 0.20, 0.07]]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, h, 36, 1, true), flat(LIGHT, op));
        c.position.y = 0.056 + h / 2; halo.add(c);
      }
      g.add(halo);

      // rings of energy that climb the shell while the robot drinks
      const rise = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.007, 8, 40), flat(LIGHT, 0.0));
        c.rotation.x = Math.PI / 2; c.position.y = 0.08; rise.add(c);
      }
      g.add(rise);

      return { group: g, coils, glow, halo, rise, leds, bolt, beam, spill, contacts, ring: coils };
    }

    /* ---------- a person ----------
       The resident an assistive robot guides. Low-poly and deliberately plain:
       ordinary clothes, a white cane in one hand, a relaxed stance. Same build
       style as the pets so it belongs in the same house.
       opts: { color, skin, r = 0.22 } -> { group, legs, arms, cane, head, body } */
    function buildPerson(opts) {
      opts = opts || {};
      const coat = parseColor(opts.color) || 0x4a6fa5;
      const skin = parseColor(opts.skin) || 0xe0b08a;
      const g = new THREE.Group();

      const hips = new THREE.Group(); hips.position.y = 0.30; g.add(hips);

      // legs (animated by the renderer) — cut so the SOLES land exactly at
      // y = 0 of the group: the renderer stands the group on the tile top
      const legs = [];
      for (const s of [-1, 1]) {
        const l = new THREE.Group();
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.040, 0.27, 10), mat(0x33415c, 0.85));
        thigh.position.y = -0.14; l.add(thigh);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.14), mat(0x22262e, 0.8));
        shoe.position.set(0, -0.272, 0.02); l.add(shoe);
        l.position.set(s * 0.065, 0, 0);
        hips.add(l); legs.push(l);
      }

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.135, 0.34, 14), mat(coat, 0.82));
      body.position.y = 0.17; body.castShadow = true; hips.add(body);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.10, 0.05, 12), mat(shade(coat, 0.85), 0.8));
      collar.position.y = 0.35; hips.add(collar);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 8), mat(skin, 0.75));
      neck.position.y = 0.385; hips.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.093, 16, 12), mat(skin, 0.72));
      head.position.y = 0.475; head.castShadow = true; hips.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.097, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(0x2b2118, 0.85));
      hair.position.y = 0.482; hips.add(hair);
      // sunglasses, the everyday kind
      const gl = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.035, 0.02), mat(0x1a1d24, 0.35, 0.2));
      gl.position.set(0, 0.482, 0.086); hips.add(gl);

      // arms — the right one holds the cane, the left swings
      const arms = [];
      for (const s of [-1, 1]) {
        const a = new THREE.Group();
        const up = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.030, 0.27, 9), mat(shade(coat, 1.06), 0.82));
        up.position.y = -0.135; a.add(up);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.037, 10, 8), mat(skin, 0.72));
        hand.position.y = -0.29; a.add(hand);
        a.position.set(s * 0.135, 0.31, 0);
        hips.add(a); arms.push(a);
      }

      // NO cane: in this league the ROBOT is the cane — one hand rides the
      // robot's handle, and that is the whole safety story.
      return { group: g, hips, legs, arms, head, body };
    }

    /* ---------- sumo scoring ring ----------
       A lit circle painted on the floor: standing inside it scores. Flat, so a
       robot rolls straight over the edge.
       opts: { r = 1.4, color } -> { group, ring, glow, ticks }                 */
    function buildZone(opts) {
      opts = opts || {};
      const r = opts.r || 1.4;
      const col = parseColor(opts.color) || 0xffa73b;
      const g = new THREE.Group();
      const flat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });

      const glow = new THREE.Mesh(new THREE.CircleGeometry(r, 52), flat(col, 0.15));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.0575; g.add(glow);

      const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.90, r * 1.02, 56), flat(col, 0.85));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.058; g.add(ring);

      // the bullseye: the closer to it you are, the more surely the ring is yours
      const inner = new THREE.Mesh(new THREE.RingGeometry(r * 0.34, r * 0.40, 44), flat(col, 0.5));
      inner.rotation.x = -Math.PI / 2; inner.position.y = 0.058; g.add(inner);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 24), flat(col, 0.55));
      dot.rotation.x = -Math.PI / 2; dot.position.y = 0.0581; g.add(dot);

      // hazard ticks around the edge, like a real sumo ring
      const ticks = new THREE.Group();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const t = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.075, r * 0.20), flat(col, 0.6));
        t.rotation.x = -Math.PI / 2; t.rotation.z = -a;
        t.position.set(Math.cos(a) * r * 1.12, 0.0578, Math.sin(a) * r * 1.12);
        ticks.add(t);
      }
      g.add(ticks);
      return { group: g, ring, glow, ticks };
    }

    /* ---------- round column ---------- */
    function buildPillar(opts) {
      const r = opts.r || 0.25;
      const tint = parseColor(opts.color) != null ? parseColor(opts.color) : 0x9aa3b0;
      const g = new THREE.Group();
      const m = mat(tint, 0.8), trim = mat(shade(tint, 0.78), 0.8);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.18, 0.1, 24), trim);
      base.position.y = 0.05; base.castShadow = true; g.add(base);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r, 1.45, 24), m);
      shaft.position.y = 0.82; shaft.castShadow = true; g.add(shaft);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.14, r * 1.05, 0.09, 24), trim);
      cap.position.y = 1.6; cap.castShadow = true; g.add(cap);
      return g;
    }

    /* ---------- the orange tabby cat (opts.color changes the fur) ---------- */
    function buildCat(opts) {
      const tintC = parseColor(opts && opts.color);
      const g = new THREE.Group();
      const fur = mat(tintC != null ? tintC : 0xb5661e, 0.95);
      const mantle = mat(tintC != null ? shade(tintC, 0.7) : 0x8a4d16, 0.95);
      const dark = mat(tintC != null ? shade(tintC, 0.5) : 0x6a3a0e, 0.95);
      const cream = mat(0xefe0c6, 0.95);
      const pink = mat(0xe08f9a, 0.7);

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), fur);
      body.scale.set(1.5, 0.85, 0.9); body.position.set(-0.02, 0.17, 0); body.castShadow = true; g.add(body);
      const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.148, 24, 16), mantle);
      saddle.scale.set(1.35, 0.72, 0.82); saddle.position.set(-0.03, 0.21, 0); saddle.castShadow = true; g.add(saddle);
      for (const sx of [-0.075, -0.025, 0.025, 0.075]) {
        const r = Math.sqrt(0.148 * 0.148 - sx * sx) + 0.002;
        const arc = 1.9;
        const tg = new THREE.TorusGeometry(r, 0.008, 8, 20, arc);
        tg.rotateZ((Math.PI - arc) / 2);
        tg.rotateY(Math.PI / 2);
        const stripe = new THREE.Mesh(tg, dark);
        stripe.position.x = sx; saddle.add(stripe);
      }
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), cream);
      chest.scale.set(1.0, 0.9, 0.85); chest.position.set(0.105, 0.145, 0); g.add(chest);
      for (const s of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), fur);
        h.scale.set(1.1, 1.3, 0.7); h.position.set(-0.125, 0.185, s * 0.085); h.castShadow = true; g.add(h);
      }
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 28, 20), fur);
      head.position.set(0.20, 0.26, 0); head.castShadow = true; g.add(head);
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 12), cream);
      muzzle.scale.set(0.85, 0.7, 1.0); muzzle.position.set(0.272, 0.235, 0); g.add(muzzle);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), pink);
      nose.position.set(0.312, 0.247, 0); g.add(nose);
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.085, 12), dark);
        ear.position.set(0.185, 0.345, s * 0.055); ear.rotation.x = s * 0.22; ear.castShadow = true; g.add(ear);
        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.055, 10), pink);
        inner.position.set(0.193, 0.343, s * 0.052); inner.rotation.x = s * 0.22; g.add(inner);
      }
      const irisMat = new THREE.MeshStandardMaterial({ color: 0x6f9c38, roughness: 0.25, emissive: 0x33500f, emissiveIntensity: 0.5 });
      for (const s of [-1, 1]) {
        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), irisMat);
        iris.position.set(0.285, 0.267, s * 0.042); g.add(iris);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 8), mat(0x10141a, 0.25));
        pupil.position.set(0.294, 0.269, s * 0.0435); g.add(pupil);
      }
      const whiskGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.09, 4);
      whiskGeo.translate(0, 0.045, 0); whiskGeo.rotateX(Math.PI / 2);
      const whiskMat = new THREE.MeshBasicMaterial({ color: 0xe8e2d2 });
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const wsk = new THREE.Mesh(whiskGeo, whiskMat);
        wsk.position.set(0.296, 0.243 - k * 0.008, s * 0.03);
        const fan = 0.3 - k * 0.25;
        wsk.rotation.y = s > 0 ? fan : Math.PI - fan;
        g.add(wsk);
      }
      const colGeo = new THREE.TorusGeometry(0.072, 0.012, 8, 24);
      colGeo.rotateY(Math.PI / 2);
      const collar = new THREE.Mesh(colGeo, mat(0xb03434, 0.5));
      collar.position.set(0.145, 0.25, 0); collar.rotation.z = -0.45; g.add(collar);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), mat(0xd9b24a, 0.25, 0.8));
      bell.position.set(0.205, 0.195, 0); g.add(bell);

      const legs = [];
      for (const fx of [0.105, -0.125]) for (const s of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(fx, 0.16, s * 0.078);
        const r = fx > 0 ? 0.024 : 0.027;
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, 0.13, 10), fur);
        upper.position.y = -0.065; upper.castShadow = true; leg.add(upper);
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.031, 12, 10), cream);
        paw.scale.set(1.2, 0.75, 1.05); paw.position.set(0.012, -0.135, 0); paw.castShadow = true; leg.add(paw);
        g.add(leg); legs.push(leg);
      }
      const tail = new THREE.Group();
      tail.position.set(-0.235, 0.21, 0); g.add(tail);
      let joint = tail;
      const segLen = 0.085;
      for (let i = 0; i < 4; i++) {
        const j = new THREE.Group();
        j.position.y = i === 0 ? 0 : segLen * 0.92;
        j.rotation.z = i === 0 ? 1.5 : -0.5;
        const r1 = 0.020 - i * 0.0025, r2 = 0.020 - (i + 1) * 0.0025;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, segLen, 10), i === 3 ? dark : fur);
        seg.position.y = segLen / 2; seg.castShadow = true; j.add(seg);
        if (i === 3) { const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), dark); tip.position.y = segLen; j.add(tip); }
        joint.add(j); joint = j;
      }
      return { group: g, legs, tail };
    }

    /* ---------- the tricolour beagle (opts.color changes the coat) ---------- */
    function buildDog(opts) {
      const tintD = parseColor(opts && opts.color);
      const g = new THREE.Group();
      const tan = mat(tintD != null ? tintD : 0xa06a2e, 0.95);
      const saddleM = mat(tintD != null ? shade(tintD, 0.42) : 0x40342a, 0.95);
      const earM = mat(tintD != null ? shade(tintD, 0.62) : 0x6b3f1c, 0.95);
      const white = mat(0xefe6d4, 0.95);
      const black = mat(0x1a1512, 0.5);

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 20), tan);
      body.scale.set(1.65, 0.95, 0.95); body.position.set(-0.02, 0.26, 0); body.castShadow = true; g.add(body);
      const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.165, 24, 16), saddleM);
      saddle.scale.set(1.35, 0.85, 0.88); saddle.position.set(-0.06, 0.30, 0); saddle.castShadow = true; g.add(saddle);
      const chest = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), white);
      chest.scale.set(1.05, 1.0, 0.85); chest.position.set(0.14, 0.19, 0); g.add(chest);
      for (const s of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 12), tan);
        h.scale.set(1.05, 1.25, 0.6); h.position.set(-0.17, 0.28, s * 0.10); h.castShadow = true; g.add(h);
      }
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.16, 16), tan);
      neck.position.set(0.26, 0.38, 0); neck.rotation.z = -0.6; neck.castShadow = true; g.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.105, 28, 20), tan);
      head.position.set(0.31, 0.45, 0); head.castShadow = true; g.add(head);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), white);
      snout.scale.set(1.7, 0.75, 0.85); snout.position.set(0.425, 0.415, 0); snout.castShadow = true; g.add(snout);
      const bridge = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), tan);
      bridge.scale.set(1.3, 0.6, 0.75); bridge.position.set(0.40, 0.445, 0); g.add(bridge);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), black);
      nose.scale.set(0.8, 0.75, 1); nose.position.set(0.515, 0.43, 0); g.add(nose);
      const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), mat(0xd97684, 0.6));
      tongue.scale.set(1.1, 0.3, 0.6); tongue.position.set(0.46, 0.373, 0.015); tongue.rotation.z = -0.25; g.add(tongue);
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), earM);
        ear.scale.set(0.45, 1.45, 0.8); ear.position.set(0.29, 0.40, s * 0.105);
        ear.rotation.x = s * 0.28; ear.rotation.z = 0.12; ear.castShadow = true; g.add(ear);
      }
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), mat(0x2b1c0e, 0.25));
        eye.position.set(0.385, 0.475, s * 0.055); g.add(eye);
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        glint.position.set(0.394, 0.483, s * 0.057); g.add(glint);
      }
      const colGeo = new THREE.TorusGeometry(0.085, 0.016, 8, 24);
      colGeo.rotateY(Math.PI / 2);
      const collar = new THREE.Mesh(colGeo, mat(0x2f63d8, 0.5));
      collar.position.set(0.255, 0.365, 0); collar.rotation.z = -0.55; g.add(collar);
      const tag = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), mat(0xd9b24a, 0.25, 0.8));
      tag.position.set(0.315, 0.30, 0); g.add(tag);

      const legs = [];
      for (const fx of [0.14, -0.17]) for (const s of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(fx, 0.24, s * 0.095);
        const r = fx > 0 ? 0.030 : 0.034;
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.20, 10), tan);
        upper.position.y = -0.10; upper.castShadow = true; leg.add(upper);
        const paw = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), white);
        paw.scale.set(1.25, 0.7, 1.05); paw.position.set(0.014, -0.21, 0); paw.castShadow = true; leg.add(paw);
        g.add(leg); legs.push(leg);
      }
      const tail = new THREE.Group();
      tail.position.set(-0.29, 0.32, 0); g.add(tail);
      let joint = tail;
      const segLen = 0.075;
      for (let i = 0; i < 4; i++) {
        const j = new THREE.Group();
        j.position.y = i === 0 ? 0 : segLen * 0.92;
        j.rotation.z = i === 0 ? 1.15 : -0.35;
        const r1 = 0.019 - i * 0.0025, r2 = 0.019 - (i + 1) * 0.0025;
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, segLen, 10), i === 3 ? white : tan);
        seg.position.y = segLen / 2; seg.castShadow = true; j.add(seg);
        if (i === 3) { const tip = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), white); tip.position.y = segLen; j.add(tip); }
        joint.add(j); joint = j;
      }
      return { group: g, legs, tail };
    }

    /* ---------- the robot vacuum ---------- */

    /* ---------- the sumo platform (dohyo) ----------
       A raised round stage with nothing around it. Everything above the rim is
       decoration; the physics only knows the radius.
       opts: { r = 2.0, color } -> { group, top, rim, ticks, setRadius(r) }     */
    function buildArena(opts) {
      opts = opts || {};
      let R = opts.r || 2.0;
      const accent = parseColor(opts.color) || 0xff8a4c;
      const g = new THREE.Group();

      // A REAL dohyo: a raised clay stage with a straw-rope (tawara) border,
      // a bright combat surface, shikiri start lines and a white edge ring.
      const H = 0.16;
      // the clay pedestal, slightly flared, with a shadowed underside
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.10, H, 72), mat(0x6e5138, 0.92));
      body.position.y = 0.055 - H / 2; body.receiveShadow = true; body.castShadow = true; g.add(body);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.10, 1.16, 0.035, 72), mat(0x54402c, 0.95));
      skirt.position.y = 0.055 - H + 0.017; g.add(skirt);

      // the combat surface: bright packed clay, catching the light
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.014, 72),
        new THREE.MeshStandardMaterial({ color: 0xb5966a, roughness: 0.9, metalness: 0.02 }));
      top.position.y = 0.055; top.receiveShadow = true; g.add(top);

      const flat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });

      // the tawara: a ring of straw bales half-sunk into the clay at the edge
      const tawara = new THREE.Group();
      const bales = 28;
      const baleMat = mat(0x8a6d42, 0.95);
      for (let k = 0; k < bales; k++) {
        const a = (k / bales) * Math.PI * 2;
        // plain cylinders: the vendored three.js predates CapsuleGeometry
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.20, 8), baleMat);
        bale.rotation.z = Math.PI / 2;
        bale.rotation.y = -a + Math.PI / 2;
        bale.position.set(Math.cos(a) * 0.965, 0.068, Math.sin(a) * 0.965);
        bale.castShadow = true;
        tawara.add(bale);
      }
      g.add(tawara);

      // the WHITE border ring — the real out-line, exactly what edge sensors see
      const rim = new THREE.Mesh(new THREE.RingGeometry(0.90, 0.955, 72), flat(0xffffff, 0.95));
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.0642; g.add(rim);

      // the two SHIKIRI start lines, facing each other in the middle
      const shikiri = new THREE.Group();
      for (const sgn of [-1, 1]) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.42), flat(0xf4f6f8, 0.85));
        line.rotation.x = -Math.PI / 2;
        line.position.set(sgn * 0.18, 0.0643, 0);
        shikiri.add(line);
      }
      g.add(shikiri);

      // a faint inner circle, the gyoji's guide
      const mid = new THREE.Mesh(new THREE.RingGeometry(0.60, 0.615, 56), flat(accent, 0.22));
      mid.rotation.x = -Math.PI / 2; mid.position.y = 0.0642; g.add(mid);

      // hazard ticks OUTSIDE the tawara, on the slope where nobody fights
      const ticks = new THREE.Group();
      for (let k = 0; k < 36; k++) {
        const a = (k / 36) * Math.PI * 2;
        const t = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.08), flat(k % 2 ? accent : 0xffffff, 0.4));
        t.rotation.x = -Math.PI / 2; t.rotation.z = -a;
        t.position.set(Math.cos(a) * 1.045, 0.052, Math.sin(a) * 1.045);
        ticks.add(t);
      }
      g.add(ticks);

      // everything above is modelled at radius 1 and scaled, so the platform can
      // shrink during a match without rebuilding a single mesh
      const setRadius = (r) => { R = r; g.scale.set(r, 1, r); };
      setRadius(R);
      return { group: g, top, rim, ticks, setRadius, get radius() { return R; } };
    }

    /* ---------- SUMO robot: a low wedge built to shove ----------
       Heavy, flat, and all blade at the front. Same 0.25 m footprint as every
       other chassis so the physics never changes.                             */

    /* ---------- GUIDE robot: taller, with a handle to hold ----------
       An assistive robot is not a vacuum: the person needs something to hold,
       and needs to see where it is going. Same footprint, different machine.  */

    /* ---------- BOX robot: the square bruiser ----------
       A flat armoured slab. Same 0.25 m collision circle as everything else —
       the corners are bumper foam, not weapons.                                */
    function buildBoxRobot(c) {
      const g = new THREE.Group(), R = 0.25, W = R * 1.42;

      const hull = new THREE.Mesh(new THREE.BoxGeometry(W, 0.10, W), mat(c.body, 0.42, 0.2));
      hull.position.y = 0.085; hull.castShadow = true; g.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.045, W * 0.78), mat(shade(c.body, 0.72), 0.45, 0.25));
      deck.position.y = 0.155; g.add(deck);

      // foam bumper strips on all four sides
      const foam = mat(0x22262e, 0.85);
      for (const [dx, dz, w, d] of [[0, W / 2, W * 1.02, 0.035], [0, -W / 2, W * 1.02, 0.035],
        [W / 2, 0, 0.035, W * 1.02], [-W / 2, 0, 0.035, W * 1.02]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.075, d), foam);
        b.position.set(dx, 0.075, dz); g.add(b);
      }
      // the glowing frame that says which team this slab belongs to
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.012, W * 0.84),
        new THREE.MeshStandardMaterial({ color: c.accent, emissive: c.accent, emissiveIntensity: 0.85, roughness: 0.35 }));
      stripe.position.y = 0.135; g.add(stripe);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.09),
        new THREE.MeshStandardMaterial({ color: 0x0b0e12, roughness: 0.15, metalness: 0.4, emissive: c.accent, emissiveIntensity: 0.55 }));
      eye.position.set(W / 2 - 0.015, 0.115, 0); g.add(eye);

      const wheelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.045, 20);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const wl = new THREE.Mesh(wheelGeo, mat(0x0a0c10, 0.75));
        wl.rotation.x = Math.PI / 2; wl.position.set(sx * W * 0.3, 0.07, sz * (W / 2 - 0.01)); wl.castShadow = true; g.add(wl);
      }
      g.userData.brushes = [];
      return g;
    }

    /* ---------- FIREFIGHTER robot ----------
       Fire-engine red, a silver water tank on its back, a nozzle out front and
       a warning beacon on top. Built to be recognised across a smoky room.     */

    /* ---------- ENERGY service robot ----------
       The house electrician: a lacquered utility bot with a tool deck, a bolt
       antenna and a meter window. Same 0.25 m collision circle as the rest.   */

    /* ---------- a fire ----------
       Three flame cones licking upward around a glowing core, over a scorch
       mark. The renderer scales the whole group with the fire's size and
       flickers the cones.                       -> { group, flames, glow }     */
    function buildFire() {
      const g = new THREE.Group();
      const add = (hex, op) => new THREE.MeshBasicMaterial({
        color: hex, transparent: true, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      // the black scorch mark and a hot floor glow, in two rings
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24),
        new THREE.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0.8, depthWrite: false }));
      scorch.rotation.x = -Math.PI / 2; scorch.position.y = 0.058; g.add(scorch);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 26), add(0xff6a1f, 0.30));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.0585; g.add(glow);
      const glow2 = new THREE.Mesh(new THREE.CircleGeometry(0.22, 22), add(0xffc23b, 0.35));
      glow2.rotation.x = -Math.PI / 2; glow2.position.y = 0.059; g.add(glow2);

      // a RING of licking outer tongues + taller middle tongues, additive so
      // they burn through each other into one bright body of flame
      const flames = [];
      const specs = [
        [0, 0, 0.115, 0.44, 0xff4d1a, 0.85],
        [0.065, 0.035, 0.075, 0.30, 0xff7a2b, 0.85],
        [-0.06, -0.04, 0.07, 0.27, 0xff9a3b, 0.85],
        [0.015, -0.065, 0.055, 0.22, 0xffc23b, 0.9],
        [-0.035, 0.06, 0.05, 0.20, 0xffb03b, 0.9],
        [0.08, -0.02, 0.04, 0.15, 0xffd27f, 0.9],
        [-0.075, 0.015, 0.04, 0.14, 0xffd27f, 0.9],
      ];
      for (const [x, z, r, h, col, op] of specs) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), add(col, op));
        f.position.set(x, 0.06 + h / 2, z);
        flames.push(f); g.add(f);
      }
      // the white-hot CORE — the part a real fire is brightest at the base
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.20, 9), add(0xfff3c9, 1.0));
      core.position.set(0, 0.155, 0); g.add(core);

      // EMBERS: sparks the renderer floats up and swirls
      const embers = [];
      for (let i = 0; i < 8; i++) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.012 + (i % 3) * 0.005, 6, 5),
          add(i % 2 ? 0xffd27f : 0xff8a3b, 0.9));
        e.userData.ph = i / 8;
        e.userData.rr = 0.05 + (i % 4) * 0.03;
        g.add(e); embers.push(e);
      }
      // SMOKE: dark puffs that rise, swell and thin out above the flames
      const smoke = [];
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 7),
          new THREE.MeshBasicMaterial({ color: 0x2a2a30, transparent: true, opacity: 0.22, depthWrite: false }));
        s.userData.ph = i / 4;
        g.add(s); smoke.push(s);
      }
      return { group: g, flames, core, glow, glow2, embers, smoke };
    }

    /* ---------- a smart appliance station ----------
       A wall-plug pedestal with the appliance's own colour and a status lamp:
       lit = drawing power. The physics circle is small — it is a switch, not
       a sofa.                                   -> { group, lamp, dial }       */
    function buildDevice(opts) {
      opts = opts || {};
      const col = parseColor(opts.color) || 0x9ab0c4;
      const g = new THREE.Group();
      // ---- WALL-mounted variants ---- the group's local -z presses against
      // the wall, +z faces the room (the renderer rotates it onto the wall's
      // outward normal). Every variant returns the same { group, lamp, dial }.
      if (opts.wall && opts.outlet) {
        // a wall OUTLET (پریز): white socket plate screwed to the wall at
        // skirting height, two dark sockets, a trim ring and a status lamp
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.26, 0.035), mat(0xeef2f7, 0.35, 0.2));
        plate.position.set(0, 0.30, -0.055); plate.castShadow = true; g.add(plate);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.29, 0.018), mat(0xd4dae2, 0.4));
        frame.position.set(0, 0.30, -0.068); g.add(frame);
        for (const sy of [0.365, 0.245]) {
          const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.016, 14), mat(0x1d2229, 0.5));
          hole.rotation.x = Math.PI / 2; hole.position.set(0, sy, -0.036); g.add(hole);
          for (const sx of [-0.012, 0.012]) {
            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6), mat(0x555f6b, 0.4));
            pin.rotation.x = Math.PI / 2; pin.position.set(sx, sy, -0.032); g.add(pin);
          }
        }
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x8fe3a4, emissive: 0x2fd08a, emissiveIntensity: 0, roughness: 0.35 }));
        lamp.position.set(0, 0.47, -0.05); g.add(lamp);
        const dial = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 18), mat(0xd8dfe8, 0.35, 0.5));
        dial.position.set(0, 0.30, -0.034); g.add(dial);
        return { group: g, lamp, dial };
      }
      if (opts.wall && String(opts.dev || '').indexOf('lamp') === 0) {
        // a wall SCONCE: bracket arm out of the wall, warm shade, and the
        // glowing bulb IS the status lamp — it lights when the lamp is ON
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), mat(0x39404a, 0.5));
        arm.position.set(0, 0.52, -0.01); g.add(arm);
        const backpl = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.16, 0.02), mat(0x39404a, 0.5));
        backpl.position.set(0, 0.52, -0.065); g.add(backpl);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.10, 0.11, 14, 1, true), mat(col, 0.5));
        shade.position.set(0, 0.50, 0.06); g.add(shade);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd27f, emissiveIntensity: 0, roughness: 0.35 }));
        lamp.position.set(0, 0.475, 0.06); g.add(lamp);
        const dial = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 8, 18), mat(0xd8dfe8, 0.35, 0.5));
        dial.position.set(0, 0.36, -0.05); g.add(dial);
        return { group: g, lamp, dial };
      }
      if (opts.wall && opts.dev === 'ac') {
        // a SPLIT-UNIT AC hung high on the wall: white body, vent slats, and
        // the standby lamp on its face
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.15, 0.13), mat(0xf2f5f9, 0.35, 0.15));
        body.position.set(0, 0.55, -0.005); body.castShadow = true; g.add(body);
        for (let i = 0; i < 3; i++) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.012, 0.012), mat(0xc3ccd6, 0.4));
          slat.position.set(0, 0.492 + i * 0.02, 0.062); g.add(slat);
        }
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.135), mat(shade(col, 1.0), 0.4));
        trim.position.set(0, 0.615, -0.005); g.add(trim);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x8fe3a4, emissive: 0x2fd08a, emissiveIntensity: 0, roughness: 0.35 }));
        lamp.position.set(0.17, 0.53, 0.066); g.add(lamp);
        const dial = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 18), mat(0xd8dfe8, 0.35, 0.5));
        dial.position.set(0, 0.40, -0.05); g.add(dial);
        return { group: g, lamp, dial };
      }
      if (opts.wall) {
        // any other wall device: a compact box unit on the wall
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.24, 0.10), mat(shade(col, 0.6), 0.5, 0.2));
        body.position.set(0, 0.42, -0.02); body.castShadow = true; g.add(body);
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.17, 0.012), mat(col, 0.4, 0.3));
        face.position.set(0, 0.42, 0.033); g.add(face);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x8fe3a4, emissive: 0x2fd08a, emissiveIntensity: 0, roughness: 0.35 }));
        lamp.position.set(0, 0.58, -0.02); g.add(lamp);
        const dial = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 18), mat(0xd8dfe8, 0.35, 0.5));
        dial.position.set(0, 0.42, 0.04); g.add(dial);
        return { group: g, lamp, dial };
      }
      if (opts.outlet) {
        // (legacy floor variant) a low post carrying a socket plate
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.05), mat(0x39404a, 0.6));
        post.position.y = 0.12; g.add(post);
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.035), mat(0xeef2f7, 0.35, 0.2));
        plate.position.y = 0.30; plate.castShadow = true; g.add(plate);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x8fe3a4, emissive: 0x2fd08a, emissiveIntensity: 0, roughness: 0.35 }));
        lamp.position.set(0, 0.42, 0); g.add(lamp);
        const dial = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 18), mat(0xd8dfe8, 0.35, 0.5));
        dial.position.set(0, 0.30, 0.04); g.add(dial);
        return { group: g, lamp, dial };
      }
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 18), mat(0x2a3038, 0.6));
      base.position.y = 0.08; base.castShadow = true; g.add(base);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), mat(shade(col, 0.55), 0.5, 0.2));
      body.position.y = 0.21; body.castShadow = true; g.add(body);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.16, 0.012), mat(col, 0.4, 0.3));
      face.position.set(0, 0.22, 0.083); g.add(face);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x8fe3a4, emissive: 0x2fd08a, emissiveIntensity: 0, roughness: 0.35 }));
      lamp.position.set(0, 0.345, 0); g.add(lamp);
      const dial = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 20), mat(0xd8dfe8, 0.35, 0.5));
      dial.position.set(0, 0.22, 0.09); dial.rotation.x = 0; g.add(dial);
      return { group: g, lamp, dial };
    }

    /* ---------- the breaker box ----------
       The grey panel on a post that everything races to when the fuse trips.
       lamp: green = power on, red = tripped.    -> { group, lamp, lever }      */
    function buildBreaker() {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.34, 12), mat(0x3a4148, 0.6, 0.3));
      post.position.y = 0.22; post.castShadow = true; g.add(post);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.26, 0.09), mat(0x9aa5b3, 0.45, 0.4));
      box.position.y = 0.45; box.castShadow = true; g.add(box);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.21, 0.012), mat(0xb9c2cf, 0.4, 0.5));
      door.position.set(0, 0.45, 0.052); g.add(door);
      const bolt = new THREE.Mesh(new THREE.ShapeGeometry((() => {
        const s = new THREE.Shape();
        s.moveTo(0.02, 0.05); s.lineTo(-0.028, 0.004); s.lineTo(-0.003, 0.004);
        s.lineTo(-0.02, -0.05); s.lineTo(0.028, -0.004); s.lineTo(0.003, -0.004);
        s.closePath(); return s;
      })()), new THREE.MeshStandardMaterial({ color: 0xffd23b, emissive: 0xffc02e, emissiveIntensity: 0.5, roughness: 0.4, side: THREE.DoubleSide }));
      bolt.position.set(0, 0.455, 0.062); g.add(bolt);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x8fe3a4, emissive: 0x2fd08a, emissiveIntensity: 0.8, roughness: 0.35 }));
      lamp.position.set(0, 0.60, 0); g.add(lamp);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), mat(0xd63c2e, 0.5));
      lever.position.set(0.13, 0.45, 0); g.add(lever);
      return { group: g, lamp, lever };
    }

    /* ---------- the robot model registry ----------
       The library ships ONE neutral chassis (the box). Every league brings its
       own model in leagues/<id>/robot.js and registers it here, so a model can
       never be changed by accident from another league — and copying a league
       folder carries its robot along. */
    const ROBOTS = { box: buildBoxRobot };
    const ROBOT_META = { box: { icon: '\uD83D\uDCE6', label: 'Box' } };
    function registerRobot(kind, fn, meta) {
      if (!kind || typeof fn !== 'function') return;
      ROBOTS[kind] = fn;
      ROBOT_META[kind] = meta || { icon: '\uD83E\uDD16', label: kind };
    }
    // every chassis a builder can offer: the leagues that are loaded, box last
    function robotShapes() {
      const out = [];
      for (const k in ROBOTS) if (k !== 'box') out.push({ kind: k, icon: ROBOT_META[k].icon, label: ROBOT_META[k].label });
      out.push({ kind: 'box', icon: ROBOT_META.box.icon, label: ROBOT_META.box.label });
      return out;
    }
    function buildRobotOf(kind, c) { return (ROBOTS[kind] || ROBOTS.box)(c); }

    /* ---------- one sensor part, as the team bolted it on ----------
       type: dist | cliff | bumper | color | compass | gyro | gps | impact      */
    function buildPart(type, opts) {
      opts = opts || {};
      const col = parseColor(opts.color) || 0x4d8bff;
      const g = new THREE.Group();
      const lit = (c, i) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i == null ? 0.8 : i, roughness: 0.35 });
      // the casing carries a hint of the part's colour, so a glance at the robot
      // tells you what is bolted where
      const shell = mat(shade(col, 0.32), 0.45, 0.25);

      if (type === 'dist') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.032, 0.055), shell);
        box.castShadow = true; g.add(box);
        for (const s of [-1, 1]) {                     // the two ultrasonic eyes
          const e = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 14), lit(col, 0.55));
          e.rotation.z = Math.PI / 2; e.position.set(0.021, 0, s * 0.015); g.add(e);
        }
      } else if (type === 'cliff') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.038), shell); g.add(box);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), lit(col, 0.9));
        led.position.set(0.006, -0.014, 0); g.add(led);
      } else if (type === 'color') {
        const box = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.026, 14), shell); g.add(box);
        const led = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.006, 14), lit(col, 1.0));
        led.position.y = -0.015; g.add(led);
      } else if (type === 'camera') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.05), shell); body.castShadow = true; g.add(body);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.02, 14), lit(col, 0.5));
        lens.rotation.z = Math.PI / 2; lens.position.x = 0.03; g.add(lens);
        const glass = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), lit(0x0b0e12, 0.9));
        glass.position.x = 0.042; g.add(glass);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), lit(0xff5252, 1.2));
        led.position.set(0.012, 0.024, 0.018); g.add(led);
      } else if (type === 'encoder') {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.014, 16), shell); g.add(disc);
        for (let k = 0; k < 4; k++) {                  // the slotted code wheel
          const sp = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.004, 0.006), lit(col, 0.7));
          sp.rotation.y = k * Math.PI / 4; sp.position.y = 0.009; g.add(sp);
        }
      } else if (type === 'load') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.03), shell); g.add(box);
        const needle = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.004, 0.005), lit(col, 1.0));
        needle.position.y = 0.012; needle.rotation.y = 0.5; g.add(needle);
      } else if (type === 'heat') {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.03, 12), shell);
        cup.rotation.z = Math.PI / 2; g.add(cup);
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), lit(col, 1.2));
        lens.position.x = 0.017; g.add(lens);
      } else if (type === 'handle') {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.10, 10), shell);
        post.position.y = 0.05; post.rotation.z = 0.15; g.add(post);
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10), lit(col, 0.5));
        grip.rotation.x = Math.PI / 2; grip.position.y = 0.105; g.add(grip);
      } else if (type === 'compass' || type === 'gyro') {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.016, 18), shell); g.add(disc);
        const top = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.004, 8, 22), lit(col, 0.85));
        top.rotation.x = Math.PI / 2; top.position.y = 0.010; g.add(top);
        if (type === 'gyro') {
          const ax = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.003, 8, 20), lit(col, 0.7));
          ax.position.y = 0.010; g.add(ax);
        }
      } else if (type === 'gps') {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.010, 0.05, 12), shell);
        post.position.y = 0.025; g.add(post);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.020, 14, 12), lit(col, 0.75));
        ball.position.y = 0.058; g.add(ball);
      } else if (type === 'impact') {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.075), shell); g.add(pad);
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.042, 0.066), lit(col, 0.7));
        face.position.x = 0.014; g.add(face);
      } else {                                          // bumper: a ring, drawn whole
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.011, 10, 48), lit(col, 0.55));
        ring.rotation.x = Math.PI / 2; g.add(ring);
      }
      g.userData.partType = type;
      return g;
    }

    return {
      TYPES: Object.keys(DEFAULTS),
      DEFAULTS,
      build, buildRug, buildWindow, buildPillar, buildDock, buildPerson, buildZone,
      buildCat, buildDog, buildBoxRobot,
      buildFire, buildDevice, buildBreaker, buildRobotOf, buildArena, buildPart, ROBOTS,
      registerRobot, robotShapes,
      _mat: mat, _shade: shade, _paint: paint, _smoked: smoked, _parseColor: parseColor,
    };
  }

  if (typeof root.THREE !== 'undefined') root.HomeObjects = lib(root.THREE);
  root.HomeObjectsFactory = lib;
})(typeof self !== 'undefined' ? self : this);
