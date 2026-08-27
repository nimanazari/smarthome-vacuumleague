/* ============================================================
   render.js  —  3D rendering with Three.js.
   The simulation is 2D; here we present it in 3D.
   Mapping: sim(x,y) -> three(x - W/2 , up , y - H/2)
   ============================================================ */

const COL = {
  dirty: 0xc6cbd3,          // "white" floor — the tiles you still have to clean
  redTile: 0xff0000, blueTile: 0x0038ff, blocked: 0x2b2f36,
  rugTile: 0x2f7d4a,        // "green" rug
  wall: 0x8891a3, wallCap: 0xb4bdcb, base: 0x141820, skirt: 0x2b303a,
};

// how high the uphill end of a sloped ramp stands (the energy maze wedges)
const RAMP_H = 0.30;

// the view name is shown in the HUD, so it follows the app language
const TR_VIEW = (fa, en) => ((typeof window !== 'undefined' && window.LANG === 'fa') ? fa : en);

const VIEWS = {
  top:    { az: Math.PI * 0.70, pol: 0.34, rad: 20, fov: 44, get label() { return TR_VIEW('نمای بالا', 'Top view'); } },
  '3d':   { az: Math.PI * 0.72, pol: 0.92, rad: 16, fov: 48, get label() { return TR_VIEW('نمای سه‌بعدی', '3D view'); } },
  '2.5d': { az: Math.PI * 0.75, pol: 0.60, rad: 32, fov: 22, get label() { return TR_VIEW('نمای ۲.۵ بعدی', '2.5D view'); } },
};

class Renderer3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = this._gradientBg();
    this.scene.fog = new THREE.Fog(0x0c0f14, 30, 95);

    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // exposure + sun kept moderate: ACES pushes over-lit saturated colours
    // (pure red/blue ink) toward pastel white — the "sun-bleached" look
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xbcd2ff, 0x2a2620, 0.62));
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const sun = new THREE.DirectionalLight(0xfff2df, 0.68);
    sun.position.set(8, 16, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    // camera (2.5D view by default — the whole board in one glance) + smooth view transitions
    const v = VIEWS['2.5d']; this._vi = 2;
    this.az = v.az; this.pol = v.pol; this.rad = v.rad;
    this.tAz = v.az; this.tPol = v.pol; this.tRad = v.rad; this.tFov = v.fov;
    this.camera.fov = v.fov; this.camera.updateProjectionMatrix();
    this.anim = false;
    this._installControls();

    this.tileMeshes = []; this.robotMeshes = {};
    this.dyn = new THREE.Group(); this.scene.add(this.dyn);

    window.addEventListener('resize', () => this._resize());
    this._resize();
  }

  setView(name) { const v = VIEWS[name]; if (!v) return; this.tAz = v.az; this.tPol = v.pol; this.tRad = v.rad; this.tFov = v.fov; this.anim = true; }
  // top → 3d → 2.5d → a slow 360° orbit → the ROBOT'S OWN EYES (team 1)
  // live wall recolour from the settings panel
  setWallColor(hex) {
    try { localStorage.setItem('shl_wallcolor', hex); } catch (e) { /* private mode */ }
    if (this._wallMat) this._wallMat.color.setHex(parseInt(hex.slice(1), 16));
  }

  cycleView() {
    const keys = ['top', '3d', '2.5d', 'spin', 'pov', 'cine'];
    this._vi = ((this._vi || 0) + 1) % keys.length;
    const k = keys[this._vi];
    this.viewMode = k;
    if (k === 'spin') { this.setView('2.5d'); return TR_VIEW('چرخش ۳۶۰ درجه', '360° orbit'); }
    if (k === 'pov') return TR_VIEW('از نگاه ربات', 'Robot POV');
    if (k === 'cine') { this._cine = null; return TR_VIEW('🎬 سینماتیک', '🎬 Cinematic'); }
    this.setView(k);
    return VIEWS[k].label;
  }

  _gradientBg() {
    const cvs = document.createElement('canvas'); cvs.width = 2; cvs.height = 256;
    const ctx = cvs.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#1b2333'); g.addColorStop(0.55, '#12161e'); g.addColorStop(1, '#0a0c11');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(cvs); tex.encoding = THREE.sRGBEncoding; return tex;
  }

  _installControls() {
    const el = this.renderer.domElement; let drag = false, px = 0, py = 0;
    const rotate = (x, y) => {
      this.anim = false;
      this.az -= (x - px) * 0.008;
      this.pol = Math.max(0.2, Math.min(1.45, this.pol - (y - py) * 0.006));
      px = x; py = y;
    };

    // ---- the referee's hand: SHIFT + drag a robot and drop it anywhere ----
    // Works in every league. While held, the robot is pinned to the cursor
    // (sync() re-pins it each frame, so its own wheels cannot wander off).
    this.carry = null; this._carryPos = null;
    this._ray = new THREE.Raycaster();
    this._floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = (x, y) => {
      const r = el.getBoundingClientRect();
      return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    };
    const pickRobot = (x, y) => {
      const eng = this._engine;
      if (!eng) return null;
      this._ray.setFromCamera(ndc(x, y), this.camera);
      for (const k of eng.world.teams) {
        const m = this.robotMeshes[k];
        if (!m) continue;
        m.updateMatrixWorld(true);
        if (this._ray.intersectObject(m, true).length) return k;
      }
      return null;
    };
    const carryTo = (x, y) => {
      const eng = this._engine;
      if (!eng || !eng.robots[this.carry]) return;
      this._ray.setFromCamera(ndc(x, y), this.camera);
      const hit = new THREE.Vector3();
      if (!this._ray.ray.intersectPlane(this._floorPlane, hit)) return;
      const c = eng.cfg, rb = eng.robots[this.carry];
      this._carryPos = {
        x: Math.max(rb.r, Math.min(c.W - rb.r, hit.x + c.W / 2)),
        y: Math.max(rb.r, Math.min(c.H - rb.r, hit.z + c.H / 2)),
      };
    };

    // ---- the Sims button: live house editing during a match ----
    // index.html flips renderer.editMode on and commits the actions; here we
    // only pick furniture, drag its model along the floor, and report back.
    this.editMode = false;
    this.editArm = null;        // a palette item waiting to be dropped on the floor
    this.onEditAction = null;   // ({ kind: 'pick'|'move'|'add', ... }) -> void
    let editDrag = null;        // { fg, idx, dx, dz, moved } while dragging furniture
    const floorAt = (x, y) => {
      if (!this._engine) return null;
      this._ray.setFromCamera(ndc(x, y), this.camera);
      const hit = new THREE.Vector3();
      if (!this._ray.ray.intersectPlane(this._floorPlane, hit)) return null;
      const c = this._engine.cfg;
      return { x: hit.x + c.W / 2, y: hit.z + c.H / 2, wx: hit.x, wz: hit.z };
    };
    // pick furniture first, then interior walls — both are live-editable.
    // matrixWorld is refreshed by hand: right after a rebuild the renderer may
    // not have drawn a frame yet, and a raycast against a stale matrix misses.
    const pickEdit = (x, y) => {
      this._ray.setFromCamera(ndc(x, y), this.camera);
      for (const fg of this.furn || []) {
        fg.updateMatrixWorld(true);
        if (this._ray.intersectObject(fg, true).length) return { target: 'furn', fg, idx: fg.userData.obIdx };
      }
      for (const wm of this.wallMeshes || []) {
        wm.m.updateMatrixWorld(true);
        if (this._ray.intersectObject(wm.m, true).length) return { target: 'wall', wm, idx: wm.wallIdx };
      }
      for (const rg of this.rugMeshes || []) {
        rg.updateMatrixWorld(true);
        if (this._ray.intersectObject(rg, true).length) return { target: 'rug', fg: rg, idx: rg.userData.rugIdx, arr: rg.userData.rugArr };
      }
      return null;
    };

    el.addEventListener('mousedown', (e) => {
      // official mode (window.SHL_LOCK): the free Shift+drag is exactly the
      // kind of unlogged robot move a real event must not allow
      if (e.shiftKey && !window.SHL_LOCK) {
        const k = pickRobot(e.clientX, e.clientY);
        if (k) { this.carry = k; carryTo(e.clientX, e.clientY); el.style.cursor = 'grabbing'; return; }
      }
      if (this.editMode && this._engine) {
        const p = floorAt(e.clientX, e.clientY);
        if (this.editArm && p) { if (this.onEditAction) this.onEditAction({ kind: 'add', x: p.x, y: p.y }); return; }
        const hit = pickEdit(e.clientX, e.clientY);
        if (hit && p) {
          const obj = hit.target === 'wall' ? hit.wm.m : hit.fg;
          editDrag = { target: hit.target, fg: hit.fg, wm: hit.wm, arr: hit.arr, idx: hit.idx, dx: obj.position.x - p.wx, dz: obj.position.z - p.wz, moved: false };
          if (this.onEditAction) this.onEditAction({ kind: 'pick', target: hit.target, idx: hit.idx });
          el.style.cursor = 'grabbing';
          return;
        }
      }
      drag = true; px = e.clientX; py = e.clientY;
    });
    window.addEventListener('mouseup', () => {
      if (editDrag) {
        const c = this._engine.cfg;
        const obj = editDrag.target === 'wall' ? editDrag.wm.m : editDrag.fg;
        if (editDrag.moved && this.onEditAction) {
          const kind = editDrag.target === 'wall' ? 'movewall' : editDrag.target === 'rug' ? 'moverug' : 'move';
          this.onEditAction({ kind, arr: editDrag.arr, idx: editDrag.idx, x: obj.position.x + c.W / 2, y: obj.position.z + c.H / 2 });
        }
        editDrag = null;
      }
      drag = false; this.carry = null; this._carryPos = null; el.style.cursor = '';
    });
    window.addEventListener('mousemove', (e) => {
      if (editDrag) {
        const p = floorAt(e.clientX, e.clientY);
        if (p) {
          const nx = p.wx + editDrag.dx, nz = p.wz + editDrag.dz;
          if (editDrag.target === 'wall') {
            editDrag.wm.m.position.x = nx; editDrag.wm.m.position.z = nz;
            editDrag.wm.cap.position.x = nx; editDrag.wm.cap.position.z = nz;
          } else {
            editDrag.fg.position.x = nx; editDrag.fg.position.z = nz;
          }
          editDrag.moved = true;
        }
        return;
      }
      if (this.carry) { carryTo(e.clientX, e.clientY); return; }
      if (drag) rotate(e.clientX, e.clientY);
    });
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.anim = false; this.rad = Math.max(6, Math.min(48, this.rad + (e.deltaY > 0 ? 1 : -1))); }, { passive: false });

    // touch: one finger rotates the camera, two fingers pinch to zoom
    let pinch = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) { drag = true; px = e.touches[0].clientX; py = e.touches[0].clientY; }
      else if (e.touches.length === 2) { drag = false; pinch = dist(e.touches); }
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && drag) { e.preventDefault(); rotate(e.touches[0].clientX, e.touches[0].clientY); }
      else if (e.touches.length === 2 && pinch !== null) {
        e.preventDefault(); this.anim = false;
        const d = dist(e.touches);
        this.rad = Math.max(6, Math.min(48, this.rad * (pinch / d)));
        pinch = d;
      }
    }, { passive: false });
    el.addEventListener('touchend', () => { drag = false; pinch = null; });
  }

  _resize() { const w = this.container.clientWidth, h = this.container.clientHeight; this.renderer.setSize(w, h); this.camera.aspect = w / (h || 1); this.camera.updateProjectionMatrix(); }

  _mat(color, rough = 0.7, metal = 0.0) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }); }

  // darken (mul < 1) or lighten (mul > 1) a hex colour — used to derive
  // secondary shades from a user-picked furniture colour in custom maps
  _shade(hex, mul) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * mul));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * mul));
    const b = Math.min(255, Math.round((hex & 255) * mul));
    return (r << 16) | (g << 8) | b;
  }

  // a completed assistive mission, played out ON the furniture itself:
  // the fridge door swings open, the TV lights up, the bedside lamp glows,
  // and the solo chores stamp a green pulse ring where the work was done
  _buildMissionFx(e, ox, oz) {
    const fx = { t: 0 };
    const glowMat = (hex, op) => new THREE.MeshBasicMaterial({
      color: hex, transparent: true, opacity: op == null ? 0 : op,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    if (e.key === 'fridge') {
      // hinge pinned at the front-left corner of the fridge; the white door
      // panel eases open around it, and cold light spills from the opening
      const hinge = new THREE.Group();
      hinge.position.set(ox + e.x - 0.40, 0.02, oz + e.y - 0.38);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.78, 0.72),
        new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.5 }));
      door.position.set(0, 0.41, 0.36); door.castShadow = true; hinge.add(door);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.4 }));
      bar.position.set(-0.045, 0.45, 0.62); hinge.add(bar);
      this.dyn.add(hinge);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.75), glowMat(0xbfe6ff));
      glow.position.set(ox + e.x - 0.435, 0.45, oz + e.y);
      glow.rotation.y = -Math.PI / 2;
      this.dyn.add(glow);
      fx.door = hinge; fx.doorSign = -1; fx.glow = glow;
    } else if (e.key === 'sofa') {
      // the TV comes ON: a flickering blue screen facing the sofa
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.8), glowMat(0x9fd4ff));
      scr.position.set(ox + e.x, 0.78, oz + e.y - 0.29);
      scr.rotation.y = Math.PI;
      this.dyn.add(scr);
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), glowMat(0x6fa8dd));
      spill.position.set(ox + e.x, 0.02, oz + e.y - 1.2);
      spill.rotation.x = -Math.PI / 2;
      spill.material.opacity = 0;
      this.dyn.add(spill);
      fx.screen = scr; fx.glow = spill;
    } else if (e.key === 'bedsit') {
      // the bedside lamp warms up while they sit on the edge of the bed
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), glowMat(0xffd08a));
      glow.position.set(ox + e.x, 0.72, oz + e.y);
      this.dyn.add(glow);
      fx.glow = glow;
    } else {
      // a solo chore (stove / door / trash): a green DONE pulse on the spot
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.40, 28), glowMat(0x53e58e, 0));
      ring.position.set(ox + e.x, 0.065, oz + e.y);
      ring.rotation.x = -Math.PI / 2;
      this.dyn.add(ring);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.9, 10, 1, true), glowMat(0x53e58e, 0));
      beam.position.set(ox + e.x, 0.45, oz + e.y);
      this.dyn.add(beam);
      fx.ring = ring; fx.glow = beam;
    }
    return fx;
  }

  buildScene(engine) {
    while (this.dyn.children.length) this.dyn.remove(this.dyn.children[0]);
    this.tileMeshes = []; this.robotMeshes = {}; this.arenaParts = null;
    this._doorMeshes = [];
    this.furn = [];                            // furniture groups, for live editing
    this.wallMeshes = [];                      // interior walls, ditto
    // the wipe above took the hose-line and the water jets with it — forget
    // them, so the next sync() builds them fresh instead of believing they exist
    this._lineMesh = null; this._lineStamp = -1; this._jets = {}; this._fx = {};
    const c = engine.cfg, t = c.tile, ox = -c.W / 2, oz = -c.H / 2;

    // the hall floor — and around it, whatever ground the map asked for:
    // dark (the classic void), GRASS, or STONE paving. Flat meshes: free.
    const surround = (c.map && c.map.surround) || 'dark';
    const groundCol = engine.arena ? 0x11151b
      : surround === 'grass' ? 0x2e6b34
      : surround === 'stone' ? 0x757c88
      : COL.base;
    // TWO layers: the surround (grass / stone / dark) stays OUTSIDE —
    // the house floor keeps its own colour so the tiles never tint
    const base = new THREE.Mesh(new THREE.BoxGeometry(c.W + 7, 0.4, c.H + 7),
      this._mat(groundCol, 1));
    base.position.y = -0.24; base.receiveShadow = true; this.dyn.add(base);
    if (!engine.arena) {
      const floor = new THREE.Mesh(new THREE.BoxGeometry(c.W + 0.3, 0.4, c.H + 0.3),
        this._mat(COL.base, 1));
      floor.position.y = -0.2; floor.receiveShadow = true; this.dyn.add(floor);
    }

    // ---- an ARENA league (sumo): a round stage and nothing else ----
    if (engine.arena) {
      const a = HomeObjects.buildArena({ r: engine.arena.r });
      a.group.position.set(ox + engine.arena.x, 0, oz + engine.arena.y);
      this.arenaParts = a;
      this.dyn.add(a.group);
      this._buildActors(engine, ox, oz);
      return;
    }

    const skirtMat = this._mat(COL.skirt, 0.9);
    const skirt = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), skirtMat); m.position.set(x, 0.0, z); m.receiveShadow = true; this.dyn.add(m); };
    skirt(c.W + 0.6, 0.3, 0, oz - 0.15); skirt(c.W + 0.6, 0.3, 0, -oz + 0.15);
    skirt(0.3, c.H + 0.6, ox - 0.15, 0); skirt(0.3, c.H + 0.6, -ox + 0.15, 0);

    const tileGeo = new THREE.BoxGeometry(t * 0.9, 0.05, t * 0.9);
    for (let i = 0; i < engine.cols; i++) {
      this.tileMeshes[i] = [];
      for (let j = 0; j < engine.rows; j++) {
        const mat = new THREE.MeshStandardMaterial({ color: COL.dirty, roughness: 0.95, emissive: 0x000000 });
        const m = new THREE.Mesh(tileGeo, mat);
        m.position.set(ox + (i + 0.5) * t, 0.03, oz + (j + 0.5) * t);
        m.receiveShadow = true; this.dyn.add(m); this.tileMeshes[i][j] = m;
      }
    }

    // wall colour: dark by default so walls READ as walls from above; the
    // settings panel can pick any colour, saved and applied live
    let wallHex = 0x1f242e;
    try { const wc = localStorage.getItem('shl_wallcolor'); if (wc) wallHex = parseInt(wc.slice(1), 16); } catch (e) { /* private mode */ }
    const wallMat = this._mat(wallHex, 0.85);
    this._wallMat = wallMat;
    const capMat = this._mat(COL.wallCap, 0.6);
    const wall = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), wallMat); m.position.set(x, 0.35, z); m.castShadow = true; m.receiveShadow = true; this.dyn.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.035, d + 0.02), capMat); cap.position.set(x, 0.7175, z); this.dyn.add(cap);
      return { m, cap };
    };
    wall(c.W + 0.3, 0.16, 0, oz - 0.05); wall(c.W + 0.3, 0.16, 0, -oz + 0.05);
    wall(0.16, c.H + 0.3, ox - 0.05, 0); wall(0.16, c.H + 0.3, -ox + 0.05, 0);
    // interior walls (custom maps from the Map Maker) — tagged, so the live
    // editor can grab, stretch and remove them like any other piece
    this.wallMeshes = [];
    let wIdx = 0;
    for (const wl of engine.walls || []) {
      // the boxed dock's three lips are drawn by the station model itself —
      // generic wall slabs there would bury it (they also stay un-editable)
      if (wl.dockbox) { wIdx++; continue; }
      const parts = wall(wl.x2 - wl.x1, wl.y2 - wl.y1, ox + (wl.x1 + wl.x2) / 2, oz + (wl.y1 + wl.y2) / 2);
      parts.wallIdx = wIdx;
      this.wallMeshes.push(parts);
      wIdx++;
    }
    // sloped RAMPS (the energy maze): REAL 3D wedges the robots ride — an
    // inclined amber deck rising RAMP_H at the top, solid sides, a back wall,
    // and chevrons ON the deck pointing downhill. `_slopeAt` lifts and tilts
    // everything that stands on one.
    for (const sl of (engine.mode && engine.mode.slopes) || []) {
      const cxm = (sl.x1 + sl.x2) / 2, cym = (sl.y1 + sl.y2) / 2;
      const wm = sl.x2 - sl.x1, dm = sl.y2 - sl.y1;
      const L = (sl.dir[0] !== 0) ? wm : dm;        // extent along the fall
      const A = (sl.dir[0] !== 0) ? dm : wm;        // extent across it
      const H = RAMP_H, phi = Math.atan2(H, L), slen = Math.hypot(L, H);
      // cache the surface tilt: robots and props riding the wedge reuse it
      sl._q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(sl.dir[0] * H / L, 1, sl.dir[1] * H / L).normalize());
      // local frame: origin at the DOWNHILL edge on the floor, +x runs uphill
      const grp = new THREE.Group();
      const deckMat = new THREE.MeshStandardMaterial({ color: 0xc9a05a, roughness: 0.85, emissive: 0x4a3514, emissiveIntensity: 0.3 });
      const sideMat = this._mat(0x8a6f42, 0.9);
      const tilt = new THREE.Group(); tilt.rotation.z = phi; grp.add(tilt);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(slen, 0.05, A * 0.985), deckMat);
      deck.position.set(slen / 2, 0.028, 0); deck.receiveShadow = true; deck.castShadow = true;
      tilt.add(deck);
      // hazard stripes across the DOWNHILL edge — this end spits you out fast
      for (let i = 0; i < 8; i++) {
        const st = new THREE.Mesh(new THREE.PlaneGeometry(0.22, A * 0.985 / 8),
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0x2b2b2b : 0xffc23b, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
        st.rotation.x = -Math.PI / 2;
        st.position.set(0.13, 0.056, (i + 0.5) * (A * 0.985 / 8) - A * 0.4925);
        tilt.add(st);
      }
      // amber edge rails along both sides of the deck
      for (const s of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(slen, 0.035, 0.05),
          new THREE.MeshStandardMaterial({ color: 0xe0a23c, roughness: 0.6, emissive: 0x7a5314, emissiveIntensity: 0.5 }));
        rail.position.set(slen / 2, 0.068, s * (A * 0.4925 - 0.025));
        tilt.add(rail);
      }
      for (let i = 0; i < 4; i++) {
        const ch = new THREE.Mesh(new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
        ch.geometry.setAttribute('position', new THREE.Float32BufferAttribute(
          [-0.17, 0, -0.1, 0.17, 0, -0.1, 0, 0, 0.14], 3));
        ch.geometry.setIndex([0, 1, 2]);
        ch.geometry.computeVertexNormals();
        ch.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);   // tip points DOWNHILL
        ch.position.set(slen * (i + 0.5) / 4, 0.058, 0);
        tilt.add(ch);
      }
      // solid triangular sides + a back wall under the high edge
      for (const s of [-1, 1]) {
        const tri = new THREE.Mesh(new THREE.BufferGeometry(), sideMat);
        tri.geometry.setAttribute('position', new THREE.Float32BufferAttribute(
          [0, 0, s * A * 0.4925, L, 0, s * A * 0.4925, L, H, s * A * 0.4925], 3));
        tri.geometry.setIndex([0, 1, 2]);
        tri.geometry.computeVertexNormals();
        tri.material = new THREE.MeshStandardMaterial({ color: 0x8a6f42, roughness: 0.9, side: THREE.DoubleSide });
        grp.add(tri);
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, H, A * 0.985), sideMat);
      back.position.set(L - 0.03, H / 2, 0); grp.add(back);
      // orient the local frame: +x (uphill) maps to world MINUS dir
      grp.rotation.y = Math.atan2(sl.dir[1], -sl.dir[0]);
      const ex = cxm + sl.dir[0] * L / 2, ey = cym + sl.dir[1] * L / 2;
      grp.position.set(ox + ex, 0.012, oz + ey);
      this.dyn.add(grp);
    }

    // windows (decor) — glowing daylight panes set into the outer wall
    for (const wn of engine.decor || []) this.dyn.add(this._window(wn, ox, oz));

    // rugs (slow zone + markers) — and every one of them is LIVE-EDITABLE:
    // the mesh remembers which world array + index it renders
    this.rugMeshes = [];
    const addRug = (r, arr, idx, col) => {
      const g = this._rugMesh(r, ox, oz, col);
      g.userData.rugArr = arr; g.userData.rugIdx = idx;
      this.rugMeshes.push(g);
      this.dyn.add(g);
    };
    engine.rugs.forEach((r, i) => addRug(r, 'rugs', i, 0x2f7d4a));
    engine.purples.forEach((r, i) => addRug(r, 'purples', i, 0x8a4fd8));
    (engine.oranges || []).forEach((r, i) => addRug(r, 'oranges', i, 0xe08a1e));
    (engine.cyans || []).forEach((r, i) => addRug(r, 'cyans', i, 0x22b8d4));
    // wet puddles: a spilled SPLASH of water — wavy outline, glassy sheen,
    // flush with the floor — not another rectangle that reads as a rug
    for (const p of engine.puddles) {
      const w2 = (p.x2 - p.x1) / 2, d2 = (p.y2 - p.y1) / 2;
      const shape = new THREE.Shape();
      const LOBES = 7;
      for (let k = 0; k <= 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        const rr = 0.82 + 0.16 * Math.sin(a * LOBES + p.x1 * 3.1) + 0.06 * Math.sin(a * 3 + p.y1 * 2.7);
        const px2 = Math.cos(a) * w2 * rr, py2 = Math.sin(a) * d2 * rr;
        if (k === 0) shape.moveTo(px2, py2); else shape.lineTo(px2, py2);
      }
      const geo = new THREE.ShapeGeometry(shape, 24);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: 0x3d9fe0, roughness: 0.02, metalness: 0.55,
        transparent: true, opacity: 0.62, emissive: 0x114a72, emissiveIntensity: 0.5,
        depthWrite: false,
      }));
      m.position.set(ox + (p.x1 + p.x2) / 2, 0.052, oz + (p.y1 + p.y2) / 2);
      this.dyn.add(m);
      // the light catching the surface: a small off-centre gloss
      const hl = new THREE.Mesh(new THREE.CircleGeometry(Math.min(w2, d2) * 0.35, 20),
        new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.28, depthWrite: false }));
      hl.rotation.x = -Math.PI / 2;
      hl.position.set(ox + (p.x1 + p.x2) / 2 - w2 * 0.25, 0.056, oz + (p.y1 + p.y2) / 2 - d2 * 0.2);
      this.dyn.add(hl);
    }

    let fIdx = 0;
    for (const o of engine.obstacles) {
      const fg = this._furniture(o, ox, oz);
      if (o.type === 'door') { this._doorMeshes = this._doorMeshes || []; this._doorMeshes.push(fg); }
      // the map object this model came from — the Map Maker grabs it by this
      fg.userData.srcIndex = (o.srcIdx != null) ? o.srcIdx : fIdx;
      fg.userData.obIdx = fIdx;                // index into engine.obstacles — live editing grabs it by THIS
      this.furn.push(fg);
      fIdx++;
      this.dyn.add(fg);
    }
    // only real round columns get a stone-column model; the other physics
    // circles (a lamp foot, a plant pot) already have their own furniture model
    for (const pl of engine.columns || []) this.dyn.add(this._pillar(pl, ox, oz));

    this._buildActors(engine, ox, oz);
  }

  // Everything that moves or is dropped in by a league: the station, the ring,
  // the people, the pets and the two robots. Shared by the house scenes and the
  // arena scene, so a new league only has to say what it wants.
  // where a point stands on a sloped ramp: its height up the wedge and the
  // deck's tilt (cached on the slope by buildScene). null on flat floor.
  _slopeAt(engine, x, y) {
    for (const sl of (engine.mode && engine.mode.slopes) || []) {
      if (x < sl.x1 || x > sl.x2 || y < sl.y1 || y > sl.y2) continue;
      let f = 0;
      if (sl.dir[0] > 0) f = (sl.x2 - x) / (sl.x2 - sl.x1);
      else if (sl.dir[0] < 0) f = (x - sl.x1) / (sl.x2 - sl.x1);
      else if (sl.dir[1] > 0) f = (sl.y2 - y) / (sl.y2 - sl.y1);
      else f = (y - sl.y1) / (sl.y2 - sl.y1);
      return { h: RAMP_H * f + 0.045, q: sl._q || null };
    }
    return null;
  }

  _buildActors(engine, ox, oz) {
    const c = engine.cfg;
    // the charging station (leagues that give the robots a battery, e.g. U19)
    this.dockParts = null;
    if (engine.dock) {
      const dk = HomeObjects.buildDock({ r: engine.dock.r, boxed: engine.dock.boxed });
      dk.group.position.set(ox + engine.dock.x, 0, oz + engine.dock.y);
      if (engine.dock.rot) dk.group.rotation.y = -engine.dock.rot * Math.PI / 2;
      dk.mix = 0;                    // 0 = idle glow, 1 = charging — eased each frame
      dk.park = 0;                   // 0 = empty station, 1 = a robot is sitting on it
      this.dockParts = dk;
      this.dyn.add(dk.group);
    }

    // task markers: a glowing ring per team on its current objective (leagues
    // that implement markers(), e.g. the assistive tour)
    this.taskRings = null;
    if (engine.mode && engine.mode.markers) {
      this.taskRings = {};
      for (const [team, col] of [['red', 0xff5252], ['blue', 0x4d8bff]]) {
        // the whole beacon moves as one: the breathing ring on the floor, a
        // second wider halo, and a bobbing pin so "go THERE" reads from any angle
        const grp = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 10, 40),
          new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false }));
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.065;
        grp.add(ring);
        const halo = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.62, 40),
          new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
        halo.rotation.x = -Math.PI / 2; halo.position.y = 0.055;
        grp.add(halo);
        const pin = new THREE.Group();
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 14),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.35 }));
        tip.rotation.x = Math.PI;            // point DOWN at the spot
        pin.add(tip);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.35 }));
        knob.position.y = 0.17;
        pin.add(knob);
        pin.position.y = 0.95;
        grp.add(pin);
        grp.visible = false;
        this.taskRings[team] = { group: grp, ring, halo, pin };
        this.dyn.add(grp);
      }
    }

    // the sumo scoring ring
    this.zoneParts = null;
    if (engine.zone) {
      const z = HomeObjects.buildZone({ r: engine.zone.r });
      z.group.position.set(ox + engine.zone.x, 0, oz + engine.zone.y);
      this.zoneParts = z;
      this.dyn.add(z.group);
    }

    // props a league put in the house: guided people, fires, …
    this.propMeshes = [];
    for (const p of engine.props || []) {
      if (p.kind === 'person') {
        const coat = p.team === 'blue' ? '#3f5f8f' : '#8a4a52';
        const pr = HomeObjects.buildPerson({ color: coat });
        pr.group.position.set(ox + p.x, 0, oz + p.y);
        // the guide link: a thin lit bar from their hand toward their robot
        const link = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8),
          new THREE.MeshStandardMaterial({ color: 0xdfe7f0, emissive: 0x8ab6ff, emissiveIntensity: 0.5, roughness: 0.4 }));
        link.rotation.z = Math.PI / 2;      // lie it flat, along +x
        this.dyn.add(link);
        this.propMeshes.push({ kind: 'person', prop: p, parts: pr, link, fall: 0 });
        this.dyn.add(pr.group);
      } else if (p.kind === 'fire') {
        const fr = HomeObjects.buildFire();
        fr.group.position.set(ox + p.x, 0, oz + p.y);
        this.propMeshes.push({ kind: 'fire', prop: p, parts: fr });
        this.dyn.add(fr.group);
      } else if (p.kind === 'device') {
        const dv = HomeObjects.buildDevice({ color: p.color, outlet: p.outlet, wall: p.wall, dev: p.dev });
        const shp = this._slopeAt(engine, p.x, p.y);
        dv.group.position.set(ox + p.x, 0.055 + (shp ? shp.h : 0), oz + p.y);
        // a WALL device faces away from its wall: local +z maps onto `face`
        if (p.wall && p.face) dv.group.rotation.y = Math.atan2(p.face[0], p.face[1]);
        this.propMeshes.push({ kind: 'device', prop: p, parts: dv });
        this.dyn.add(dv.group);
      } else if (p.kind === 'breaker') {
        const br = HomeObjects.buildBreaker();
        const shb = this._slopeAt(engine, p.x, p.y);
        br.group.position.set(ox + p.x, 0.055 + (shb ? shb.h : 0), oz + p.y);
        this.propMeshes.push({ kind: 'breaker', prop: p, parts: br });
        this.dyn.add(br.group);
      }
    }
    // fire leagues keep lighting new ones mid-match; sync() picks them up here
    this._propCount = (engine.props || []).length;

    this.catMesh = this._cat(engine.cat && engine.cat.color); this.dyn.add(this.catMesh);
    this.dogMesh = this._dog(engine.dog && engine.dog.color); this.dyn.add(this.dogMesh);

    // robot shells take each team's chosen colour (set via renderer.teamStyle);
    // tile ink stays red/blue so the colour sensor story never changes
    const ts = this.teamStyle || {};
    // each team drives the chassis it picked in the builder; the league's
    // default body is only the starting point
    const kindOf = (k) => (engine.robots[k] && engine.robots[k].kit && engine.robots[k].kit.body) || engine.robotModel || 'vacuum';
    // the team's own PAINT (picked in the builder) wins over the swatch colour;
    // the glowing accent stays the team colour so red/blue never gets confusing
    const styleOf = (k, fallback) => {
      const kit = engine.robots[k] && engine.robots[k].kit;
      const base = ts[k] || fallback;
      if (!kit || !kit.paint) return base;
      const hex = parseInt(String(kit.paint).replace('#', ''), 16);
      return { body: hex, top: this._shade(hex, 1.35), accent: base.accent };
    };
    const DEFSTYLE = { red: { body: 0xe23b3b, top: 0xff7a7a, accent: 0xff5252 },
      blue: { body: 0x2f6bff, top: 0x74a3ff, accent: 0x4d8bff } };
    for (const k of engine.world.teams) {
      this.robotMeshes[k] = this._robot(styleOf(k, DEFSTYLE[k]), kindOf(k));
      const rb = engine.robots[k];
      if (rb && rb.kit) this.constructor.mountParts(this.robotMeshes[k], rb.kit);
      this.dyn.add(this.robotMeshes[k]);
    }

    // fit the camera to what is actually being played on: a bigger custom board
    // needs the camera pulled back, a small sumo platform needs it brought in
    const span = engine.arena ? (engine.arena.r * 2 + 1.5) / 10 : Math.max(c.W, c.H) / 10;
    if (this._fitSpan !== span) {
      this._fitSpan = span;
      if (Math.abs(span - 1) > 0.01) { this.tRad = VIEWS['2.5d'].rad * span; this.rad = this.tRad; }
    }

    this.sync(engine);
  }

  // a round column (model from the shared HomeObjects library)
  _pillar(pl, ox, oz) {
    const g = HomeObjects.buildPillar({ r: pl.r, color: pl.color });
    g.position.set(ox + pl.x, 0, oz + pl.y);
    return g;
  }

  // a woven rug (model from HomeObjects)
  _findLeaf(g) {
    if (g.userData && g.userData.leaf) return g.userData.leaf;
    for (const ch of g.children || []) { const f = this._findLeaf(ch); if (f) return f; }
    return null;
  }

  _rugMesh(r, ox, oz, defColor) {
    const g = HomeObjects.buildRug({ w: r.x2 - r.x1, d: r.y2 - r.y1, round: r.round || 0, color: r.color != null ? r.color : defColor });
    g.position.set(ox + (r.x1 + r.x2) / 2, 0, oz + (r.y1 + r.y2) / 2);
    return g;
  }

  // a window set into the outer wall (model from HomeObjects)
  _window(o, ox, oz) {
    const w0 = o.x2 - o.x1, d0 = o.y2 - o.y1, rot = o.rot || 0;
    const g = HomeObjects.buildWindow({ len: rot % 2 ? d0 : w0, color: o.color });
    g.position.set(ox + (o.x1 + o.x2) / 2, 0, oz + (o.y1 + o.y2) / 2);
    if (rot % 2) g.rotation.y = Math.PI / 2;
    return g;
  }

  // Furniture models live in the shared HomeObjects library (homeobjects.js)
  // so any other project can reuse them. Custom maps rotate in quarter turns:
  // the stored AABB already has the rotated footprint, so build with the
  // unrotated dims and spin the group. Models always FILL the physics AABB.
  _furniture(o, ox, oz) {
    const w0 = o.x2 - o.x1, d0 = o.y2 - o.y1, rot = o.rot || 0;
    const w = rot % 2 ? d0 : w0, d = rot % 2 ? w0 : d0;
    const px = ox + (o.x1 + o.x2) / 2, pz = oz + (o.y1 + o.y2) / 2;
    let autoRot = null;                       // Map-1 wardrobes: doors face into the room
    if (o.type === 'shelf' && o.rot == null) {
      autoRot = (w0 <= d0) ? ((px < 0) ? Math.PI : 0) : ((pz < 0) ? Math.PI / 2 : -Math.PI / 2);
    }
    const g = HomeObjects.build(o.type, { w, d, color: o.color, autoRot });
    g.position.set(px, 0, pz);
    if (rot) g.rotation.y += -rot * Math.PI / 2;
    return g;
  }

  // the cat, dog and robots also come from HomeObjects (reusable anywhere)
  _cat(color) {
    const c = HomeObjects.buildCat({ color });
    this.catLegs = c.legs; this.catTail = c.tail;
    return c.group;
  }

  _dog(color) {
    const d = HomeObjects.buildDog({ color });
    this.dogLegs = d.legs; this.dogTail = d.tail;
    return d.group;
  }

  _robot(c, kind) { return HomeObjects.buildRobotOf(kind || 'vacuum', c); }

  /* ---------- the camera's own point of view ----------
     A small live render of the scene FROM the camera part, per robot — so a
     team can see exactly what `camsee` is looking at. Each POV gets its own
     little WebGL canvas; the scene is shared. */
  initPOV(canvases) {
    this.pov = {};
    for (const team of ['red', 'blue']) {
      const cv = canvases[team];
      if (!cv) continue;
      const r = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
      r.setPixelRatio(1);
      r.setSize(cv.width, cv.height, false);
      r.outputEncoding = THREE.sRGBEncoding;
      const cam = new THREE.PerspectiveCamera(72, cv.width / cv.height, 0.06, 60);
      this.pov[team] = { r, cam };
    }
  }

  // render each fitted camera's view; returns which teams actually have one
  renderPOV(engine) {
    const out = { red: false, blue: false };
    if (!this.pov) return out;
    const c = engine.cfg, ox = -c.W / 2, oz = -c.H / 2;
    for (const team of ['red', 'blue']) {
      const p = this.pov[team];
      if (!p) continue;
      const rb = engine.robots[team];
      if (!rb) continue;
      const part = rb.kit && rb.kit.of && rb.kit.of('camera')[0];
      if (!part) continue;
      out[team] = true;
      const A = rb.heading + part.angle * Math.PI / 180;
      const dx = Math.cos(A), dz = Math.sin(A);
      p.cam.position.set(ox + rb.x + dx * 0.20, 0.26, oz + rb.y + dz * 0.20);
      p.cam.lookAt(ox + rb.x + dx * 2.5, 0.16, oz + rb.y + dz * 2.5);
      p.r.render(this.scene, p.cam);
    }
    return out;
  }

  // Bolt a loadout onto a chassis. Angles are degrees, 0 = straight ahead and
  // + = to the left, exactly as the builder shows them; height 0..1 runs from
  // the bottom of the shell to the top. Used by the match AND by the builder,
  // so what a team sees while building is what drives out on the day.
  static mountParts(group, kit, opts) {
    opts = opts || {};
    const R = opts.radius || 0.25;
    const old = group.userData.parts || [];
    for (const m of old) group.remove(m);
    const mounted = [];
    for (const p of kit.parts) {
      const g = HomeObjects.buildPart(p.type, { color: p.color });
      const a = p.angle * Math.PI / 180;
      const y = 0.06 + (p.height != null ? p.height : 0.5) * 0.20;
      if (p.type === 'bumper') {
        g.position.set(0, 0.055, 0);
      } else if (p.type === 'compass' || p.type === 'gyro' || p.type === 'gps') {
        // these live on the deck, not on the rim
        g.position.set(Math.cos(a) * R * 0.42, 0.235, -Math.sin(a) * R * 0.42);
      } else if (p.type === 'color') {
        g.position.set(Math.cos(a) * R * 0.72, 0.075, -Math.sin(a) * R * 0.72);
      } else {
        g.position.set(Math.cos(a) * R * 0.99, y, -Math.sin(a) * R * 0.99);
        g.rotation.y = -a;                       // face outward, the way it looks
      }
      g.userData.part = p;
      group.add(g);
      mounted.push(g);
    }
    group.userData.parts = mounted;
    return mounted;
  }

  sync(engine) {
    const c = engine.cfg, ox = -c.W / 2, oz = -c.H / 2;
    this._engine = engine;                       // the referee's hand needs it
    // the door leaves swing with the physics
    if (this._doorMeshes && engine.doors) {
      for (let i = 0; i < this._doorMeshes.length && i < engine.doors.length; i++) {
        const h = this._doorMeshes[i] && this._findLeaf(this._doorMeshes[i]);
        if (h) h.rotation.y = -engine.doors[i].anim * Math.PI * 0.52;
      }
    }
    // team 1's pose, for the Robot-POV camera (world y becomes three.js z)
    const r0 = engine.robots && (engine.robots.red || engine.robots.blue);
    this._povPose = r0 ? { x: ox + r0.x, z: oz + r0.y, h: r0.heading } : null;
    // ...and BOTH poses + the score, for the cinematic director
    this._cinePoses = {};
    for (const k of ['red', 'blue']) {
      const rb = engine.robots && engine.robots[k];
      if (rb) this._cinePoses[k] = { x: ox + rb.x, z: oz + rb.y, h: rb.heading };
    }
    this._cineScores = engine.mode && engine.mode.scores ? engine.mode.scores : { red: 0, blue: 0 };
    // a robot held by SHIFT+drag stays pinned under the cursor, whatever its
    // own wheels are trying to do
    if (this.carry && this._carryPos && engine.robots[this.carry]) {
      const rb = engine.robots[this.carry];
      rb.x = this._carryPos.x; rb.y = this._carryPos.y;
      if (engine.world.resetStuck) engine.world.resetStuck(rb);
    }
    // cleaned tiles are painted in each side's TEAM colour (set via teamStyle)
    const ts = this.teamStyle || {};
    const redInk = (ts.red && ts.red.tile) || COL.redTile;
    const blueInk = (ts.blue && ts.blue.tile) || COL.blueTile;
    // per-colour glow: too much emissive washes saturated colours toward white
    const redGlow = (ts.red && ts.red.glow) || 0.38;
    const blueGlow = (ts.blue && ts.blue.glow) || 0.38;
    // an arena has no tiles to paint — just a platform that may be closing in
    if (this.arenaParts && engine.arena) {
      this.arenaParts.setRadius(engine.arena.r);
      const danger = engine.world.teams.some((k) => {
        const rb = engine.robots[k];
        return engine.arena.r - Math.hypot(rb.x - engine.arena.x, rb.y - engine.arena.y) < 0.3;
      });
      this.arenaParts.rim.material.opacity = danger ? 0.65 + Math.sin(engine.elapsed * 9) * 0.3 : 0.9;
      this.arenaParts.ticks.rotation.y = engine.elapsed * 0.12;
    }
    if (!this.tileMeshes.length) { this._syncActors(engine, ox, oz, c); return; }

    for (let i = 0; i < engine.cols; i++) for (let j = 0; j < engine.rows; j++) {
      const o = engine.owner[i][j], ter = engine.terrain[i][j], mat = this.tileMeshes[i][j].material;
      // A rug lies ON the tiles and hides them completely (it snaps to whole
      // tiles), so the floor underneath is left alone — no tinting needed.
      // A puddle is see-through water, so that one does get a tint.
      if (o === 'blocked') { mat.color.setHex(COL.blocked); mat.emissive.setHex(0x000000); }
      else if (ter === 2) { mat.color.setHex(0x1d3a52); mat.emissive.setHex(0x000000); }
      else if (ter === 1 || ter === 3) { mat.color.setHex(COL.dirty); mat.emissive.setHex(0x000000); }
      else if (o === 'red') { mat.color.setHex(redInk); mat.emissive.setHex(redInk); mat.emissiveIntensity = redGlow; }
      else if (o === 'blue') { mat.color.setHex(blueInk); mat.emissive.setHex(blueInk); mat.emissiveIntensity = blueGlow; }
      else { mat.color.setHex(COL.dirty); mat.emissive.setHex(0x000000); }
    }
    this._syncActors(engine, ox, oz, c);
  }

  // Per-frame movement of everything that is not floor.
  _syncActors(engine, ox, oz, c) {
    for (const k of engine.world.teams) {
      const rb = engine.robots[k], m = this.robotMeshes[k];
      // ride up on rugs / puddles (their meshes sit above the tiles) so the
      // shell and the sweeper brushes never sink out of sight
      const ti = Math.floor(rb.x / c.tile), tj = Math.floor(rb.y / c.tile);
      const ter = (engine.terrain[ti] && engine.terrain[ti][tj]) || 0;
      // the charging station is a 2 cm step, so the robot rides onto it too
      const onDock = engine.dock && Math.hypot(rb.x - engine.dock.x, rb.y - engine.dock.y) <= engine.dock.r;
      let lift = onDock ? 0.024 : (ter !== 0 ? 0.026 : 0);
      // riding a sloped ramp: up the wedge with the deck under the wheels
      const sh = this._slopeAt(engine, rb.x, rb.y);
      if (sh) lift += sh.h;
      // an arena stands proud of the floor: on the platform you are up, and the
      // moment you are shoved past the edge you drop off it
      if (engine.arena) {
        const over = Math.hypot(rb.x - engine.arena.x, rb.y - engine.arena.y) - engine.arena.r;
        lift = over > 0 ? Math.max(-0.14, -over * 1.4) : 0;
      }
      m.position.set(ox + rb.x, m.position.y + (lift - m.position.y) * 0.25, oz + rb.y);
      m.rotation.y = -rb.heading;
      // ...and pitched to lie flat ON the deck, not hovering level above it
      if (sh && sh.q) m.quaternion.premultiply(sh.q);
      if (engine.arena) {
        // a robot going over the edge tips forward as it falls
        const over = Math.hypot(rb.x - engine.arena.x, rb.y - engine.arena.y) - engine.arena.r;
        m.rotation.z = over > 0 ? Math.min(0.35, over * 1.2) : 0;
      }
      // sweeper brushes counter-rotate while the match clock runs
      for (const b of m.userData.brushes || []) b.rotation.y = b.userData.dir * engine.elapsed * 13;
    }

    // the cat: walk cycle on the legs, a swishing tail, and a little body bob
    const cat = engine.cat, cm = this.catMesh;
    if (cm) {
      cm.visible = cat.enabled !== false;
      cm.position.set(ox + cat.x, 0, oz + cat.y);
      cm.rotation.y = -cat.heading;
      const t = cat.t, walk = cat.moving ? 1 : 0;
      // 0.08 keeps the paws on TOP of the tiles (tile tops ~0.055, rug ~0.076)
      const shc = this._slopeAt(engine, cat.x, cat.y);
      cm.position.y = 0.08 + (shc ? shc.h : 0) + walk * Math.abs(Math.sin(t * 9)) * 0.015;
      for (let i = 0; i < this.catLegs.length; i++) {
        const phase = (i === 0 || i === 3) ? 0 : Math.PI;        // diagonal pairs
        this.catLegs[i].rotation.z = walk * Math.sin(t * 9 + phase) * 0.5;
      }
      this.catTail.rotation.y = Math.sin(t * (walk ? 3.5 : 1.6)) * 0.5;
      this.catTail.rotation.x = Math.sin(t * 2.2) * 0.15;
    }

    // ---- the charging station ----
    // idle it breathes slowly; the moment a robot parks on it the coils pulse,
    // the light shell brightens, rings climb it and the rim LEDs fill up.
    if (this.dockParts && engine.dock) {
      const d = this.dockParts, t = engine.elapsed;
      let level = 0, busy = false, parked = false;
      for (const k of engine.world.teams) {
        const rb = engine.robots[k];
        if (rb.battery == null) continue;
        if (Math.hypot(rb.x - engine.dock.x, rb.y - engine.dock.y) > engine.dock.r) continue;
        parked = true; level = Math.max(level, rb.battery / 100);
        if (rb.battery < 100) busy = true;
      }
      const beat = busy ? 1 : 0;                       // 0 = idle, 1 = charging
      d.mix += (beat - d.mix) * 0.12;                  // smooth fade between the two
      const m = d.mix;

      d.coils.children.forEach((c, k) => {
        const s = 1 + Math.sin(t * 6 - k * 0.9) * 0.10 * m;
        c.scale.set(s, s, 1);
        c.material.emissiveIntensity = 0.45 + m * 1.15 + (1 - m) * Math.sin(t * 1.3) * 0.12;
      });
      d.glow.material.emissiveIntensity = 0.18 + m * 0.6;
      d.bolt.children.forEach((b) => { b.material.emissiveIntensity = 0.7 + m * 1.4; });
      d.spill.material.opacity = 0.10 + m * 0.16;
      d.halo.children.forEach((c, k) => { c.material.opacity = parked ? (k ? 0.05 : 0.10) + m * (k ? 0.12 : 0.20) : 0; });
      // the empty-station beacon: on while nobody is home, gone once a robot parks
      d.park += ((parked ? 1 : 0) - d.park) * 0.14;
      const bo = (1 - d.park) * (0.85 + Math.sin(t * 1.6) * 0.15);
      d.beam.children.forEach((c, k) => { c.material.opacity = (k ? 0.11 : 0.16) * bo; });

      // three rings climbing the light shell, evenly spaced in the loop
      d.rise.children.forEach((c, k) => {
        const p = ((t * 0.7 + k / 3) % 1);
        c.position.y = 0.062 + p * 0.30;
        const s = 1 - p * 0.18;
        c.scale.set(s, s, 1);
        c.material.opacity = m * 0.55 * Math.sin(p * Math.PI);
      });

      // rim gauge: filled LEDs = charge on board. Empty station = a slow chase.
      const n = d.leds.length;
      for (let k = 0; k < n; k++) {
        const lit = parked ? (k / n) < level : ((t * 2.2 + k) % n) < 2.2;
        d.leds[k].material.emissiveIntensity = lit ? (parked ? 1.5 : 0.5) : 0.04;
        d.leds[k].material.emissive.setHex(!parked ? 0x2fd08a : (level > 0.45 ? 0x2fd08a : level > 0.18 ? 0xffc857 : 0xff5c5c));
      }
    }

    // the sumo ring: breathes gently, and flares when someone is holding it
    if (this.zoneParts && engine.zone) {
      const z = this.zoneParts;
      z.group.position.set(ox + engine.zone.x, 0, oz + engine.zone.y);
      const busy = ['red', 'blue'].some((k) => {
        const rb = engine.robots[k];
        return Math.hypot(rb.x - engine.zone.x, rb.y - engine.zone.y) <= engine.zone.r;
      });
      const b = 0.72 + (busy ? 0.28 : 0) + Math.sin(engine.elapsed * 2.4) * 0.08;
      z.ring.material.opacity = b;
      z.glow.material.opacity = 0.12 + (busy ? 0.12 : 0);
      z.ticks.rotation.y = engine.elapsed * 0.22;
    }

    // task beacons hover on each team's current objective: the ring breathes,
    // the pin bobs — nobody has to guess where the task is
    if (this.taskRings && engine.mode && engine.mode.markers) {
      const marks = engine.mode.markers();
      for (const team of ['red', 'blue']) {
        const tk = this.taskRings[team];
        const m = marks.filter((q) => q.team === team)[0];
        tk.group.visible = !!m;
        if (m) {
          const ph = team === 'red' ? 0 : 1.5;
          tk.group.position.set(ox + m.x, 0, oz + m.y);
          const s = 1 + Math.sin(engine.elapsed * 3 + ph) * 0.10;
          tk.ring.scale.set(s, s, 1);
          tk.halo.scale.set(s, s, 1);
          tk.pin.position.y = 0.95 + Math.sin(engine.elapsed * 2.4 + ph) * 0.09;
          tk.pin.rotation.y = engine.elapsed * 1.6;
        }
      }
    }

    // a fire league lights new fires mid-match: give them meshes as they appear
    if ((engine.props || []).length !== this._propCount) {
      for (const p of engine.props) {
        if (p.kind !== 'fire') continue;
        if (this.propMeshes.some((pm) => pm.prop === p)) continue;
        const fr = HomeObjects.buildFire();
        fr.group.position.set(ox + p.x, 0, oz + p.y);
        this.propMeshes.push({ kind: 'fire', prop: p, parts: fr });
        this.dyn.add(fr.group);
      }
      this._propCount = engine.props.length;
    }

    // ---- the fire league's hose-line: a painted stripe from the middle of
    //      the house to the fire, rebuilt whenever the fire moves on ----
    const fmode = engine.mode;
    if (fmode && fmode.guideLine && fmode.lineStamp !== this._lineStamp) {
      this._lineStamp = fmode.lineStamp;
      if (this._lineMesh) { this.dyn.remove(this._lineMesh); this._lineMesh = null; }
      const [A, B] = fmode.guideLine;
      const len = Math.hypot(B.x - A.x, B.y - A.y);
      const grp = new THREE.Group();
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xff5230, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
      stripe.rotation.x = -Math.PI / 2;
      grp.add(stripe);
      // dashes riding on it, so it reads as a LINE, not a smear
      for (let d = 0.25; d < len; d += 0.5) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.05),
          new THREE.MeshBasicMaterial({ color: 0xffe1b0, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
        dash.rotation.x = -Math.PI / 2; dash.position.set(d - len / 2, 0.002, 0);
        grp.add(dash);
      }
      grp.position.set(ox + (A.x + B.x) / 2, 0.058, oz + (A.y + B.y) / 2);
      grp.rotation.y = -Math.atan2(B.y - A.y, B.x - A.x);
      this._lineMesh = grp;
      this.dyn.add(grp);
    }
    if (this._lineMesh && (!fmode || !fmode.guideLine)) { this.dyn.remove(this._lineMesh); this._lineMesh = null; }

    // ---- the WATER: a real jet from the sprayer to the flames ----
    this._jets = this._jets || {};
    for (const k of ['red', 'blue']) {
      const sp = fmode && fmode.spraying && fmode.spraying[k];
      let jet = this._jets[k];
      if (sp && engine.robots[k]) {
        const rb = engine.robots[k];
        if (!jet) {
          jet = new THREE.Group();
          jet.drops = [];
          for (let i = 0; i < 7; i++) {
            const d = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6),
              new THREE.MeshStandardMaterial({ color: 0x9fdcff, emissive: 0x3f9fdf, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, roughness: 0.2 }));
            jet.add(d); jet.drops.push(d);
          }
          const mist = new THREE.Mesh(new THREE.CircleGeometry(0.26, 20),
            new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
          mist.rotation.x = -Math.PI / 2; jet.mist = mist; jet.add(mist);
          this.dyn.add(jet);
          this._jets[k] = jet;
        }
        jet.visible = true;
        const ax = ox + rb.x, az = oz + rb.y, bx2 = ox + sp.x, bz2 = oz + sp.y;
        const tt = engine.elapsed;
        jet.drops.forEach((d, i) => {
          const f = ((tt * 2.2 + i / jet.drops.length) % 1);
          d.position.set(ax + (bx2 - ax) * f, 0.16 + Math.sin(f * Math.PI) * 0.34, az + (bz2 - az) * f);
          d.material.opacity = 0.9 - f * 0.4;
        });
        jet.mist.position.set(bx2, 0.06, bz2);
        jet.mist.material.opacity = 0.25 + Math.sin(tt * 9) * 0.1;
      } else if (jet) {
        jet.visible = false;
      }
    }

    // ---- assistive: completed missions play out ON the furniture ----
    const am = engine.mode;
    if (am && am.effects && am.effects.length !== undefined) {
      this._fx = this._fx || {};
      for (const e of am.effects) {
        const id = e.team + ':' + e.key;
        if (!this._fx[id]) this._fx[id] = this._buildMissionFx(e, ox, oz);
      }
      const tt = engine.elapsed;
      for (const id in this._fx) {
        const fx = this._fx[id];
        fx.t = Math.min(1, fx.t + 0.025);
        const ease = 1 - Math.pow(1 - fx.t, 3);
        if (fx.door) fx.door.rotation.y = fx.doorSign * 1.45 * ease;
        if (fx.screen) fx.screen.material.opacity = ease * (0.55 + Math.sin(tt * 1.7) * 0.07 + Math.sin(tt * 13) * 0.05);
        if (fx.glow) fx.glow.material.opacity = ease * (fx.ring ? 0.18 : 0.30 + Math.sin(tt * 2.6) * 0.08);
        if (fx.ring) {
          fx.ring.scale.set(ease, ease, 1);
          fx.ring.material.opacity = ease * (0.45 + Math.sin(tt * 3.2) * 0.25);
        }
      }
    }

    // the guided person (walk / fall / get up) and the burning fires
    for (const pm of this.propMeshes || []) {
      const p = pm.prop, g = pm.parts;

      if (pm.kind === 'device') {
        // the status lamp: lit while the appliance is drawing power
        g.lamp.material.emissiveIntensity = p.on ? 1.1 : 0;
        g.lamp.material.color.setHex(p.on ? 0x8fe3a4 : 0x3a444e);
        continue;
      }
      if (pm.kind === 'breaker') {
        // green = power on · blinking red = tripped, come and reset me
        const trip = !!p.tripped;
        g.lamp.material.emissive.setHex(trip ? 0xff4d4d : 0x2fd08a);
        g.lamp.material.emissiveIntensity = trip ? 0.8 + Math.sin(engine.elapsed * 8) * 0.6 : 0.8;
        g.lever.rotation.z = trip ? 0.7 : 0;
        continue;
      }
      if (pm.kind === 'fire') {
        g.group.visible = !p.out && (p.size || 0) > 0.01;
        if (!g.group.visible) continue;
        const s = 0.45 + (p.size || 0) * 0.85;
        g.group.scale.set(s, s, s);
        const t = engine.elapsed;
        // the tongues LICK: each one stretches, sways and spins on its own beat
        g.flames.forEach((f, i) => {
          f.scale.y = 1 + Math.sin(t * 11 + i * 2.1) * 0.30 + Math.sin(t * 23 + i * 5.7) * 0.08;
          f.scale.x = f.scale.z = 1 + Math.sin(t * 9 + i * 1.4) * 0.16;
          f.rotation.y = t * (1.5 + i * 0.4);
          f.rotation.z = Math.sin(t * 6 + i * 2.4) * 0.10;
          f.rotation.x = Math.cos(t * 5 + i * 1.9) * 0.10;
        });
        // the white-hot core throbs fast and never sits still
        if (g.core) {
          g.core.scale.y = 1 + Math.sin(t * 17) * 0.30;
          g.core.scale.x = g.core.scale.z = 1 + Math.sin(t * 13) * 0.18;
          g.core.material.opacity = 0.75 + Math.sin(t * 21) * 0.25;
        }
        // floor glow flickers like real firelight — two rings out of phase
        g.glow.material.opacity = 0.22 + (p.size || 0) * 0.15 + Math.sin(t * 7) * 0.07 + Math.sin(t * 19) * 0.04;
        if (g.glow2) g.glow2.material.opacity = 0.28 + Math.sin(t * 13 + 1.3) * 0.10;
        // embers spiral UP out of the fire and die, each on its own loop
        for (const e of g.embers || []) {
          const f2 = (t * (0.35 + e.userData.ph * 0.25) + e.userData.ph) % 1;
          const a = e.userData.ph * 6.28 + t * 2.2;
          const rr = e.userData.rr * (1 + f2 * 1.6);
          e.position.set(Math.cos(a) * rr, 0.10 + f2 * 0.85, Math.sin(a) * rr);
          e.material.opacity = (1 - f2) * (0.9 - 0.3 * Math.sin(t * 31 + e.userData.ph * 9));
        }
        // smoke puffs ride up above the flames, swelling and thinning
        for (const sm of g.smoke || []) {
          const f2 = (t * 0.30 + sm.userData.ph) % 1;
          sm.position.set(Math.sin(t + sm.userData.ph * 7) * 0.06 * f2, 0.42 + f2 * 0.70, Math.cos(t * 0.8 + sm.userData.ph * 5) * 0.05 * f2);
          const sc = 0.7 + f2 * 1.8;
          sm.scale.set(sc, sc, sc);
          sm.material.opacity = 0.20 * (1 - f2) * Math.min(1, (p.size || 0) * 2);
        }
        continue;
      }

      // ---- a person ---- grounded, eased, cane-free (the ROBOT is the cane)
      // Every state change is EASED: the walk fades in and out instead of
      // snapping, the body turns through the short way round, and getting up
      // is twice as quick as going down.
      const fallTarget = (p.fallen || p.resting) ? 1 : 0;
      pm.fall += (fallTarget - pm.fall) * (fallTarget ? 0.10 : 0.20);
      pm.sit = pm.sit || 0;
      pm.sit += (((p.seated && !p.fallen && !p.resting) ? 1 : 0) - pm.sit) * 0.12;
      pm.walk = pm.walk || 0;
      pm.walk += ((p.walking ? 1 : 0) - pm.walk) * 0.15;
      // shortest-way heading ease — the twitchy snap-turns are gone
      const wantYaw = -p.heading + Math.PI / 2;
      if (pm.yaw == null) pm.yaw = wantYaw;
      let dYaw = wantYaw - pm.yaw;
      while (dYaw > Math.PI) dYaw -= 2 * Math.PI;
      while (dYaw < -Math.PI) dYaw += 2 * Math.PI;
      pm.yaw += dYaw * 0.22;
      // the pivot is at the FEET: standing rides the tile top, lying gets a
      // lift of half the body's thickness so nothing sinks into the floor
      const lift = pm.fall * (p.resting ? 0.10 : 0.16);
      const base = p.resting ? 0.42 : (0.055 - pm.sit * 0.02);
      g.group.position.set(ox + p.x, base + lift, oz + p.y);
      g.group.rotation.y = pm.yaw;
      g.group.rotation.x = -1.42 * pm.fall;
      const t = p.t || 0, walk = pm.walk * (1 - pm.sit) * (1 - pm.fall);
      const ph = t * 5.2;
      const sw = Math.sin(ph) * 0.34 * walk;
      g.legs[0].rotation.x = sw - 1.32 * pm.sit;
      g.legs[1].rotation.x = -sw - 1.32 * pm.sit;
      g.legs[0].position.y = Math.max(0, Math.sin(ph)) * 0.025 * walk;
      g.legs[1].position.y = Math.max(0, -Math.sin(ph)) * 0.025 * walk;
      g.hips.position.y = 0.30 - pm.sit * 0.115 + Math.abs(Math.sin(ph)) * 0.008 * walk;

      const rb = engine.robots[p.team];
      const dx = rb.x - p.x, dy = rb.y - p.y, len = Math.hypot(dx, dy);

      // ---- the guiding hand ---- it RIDES the robot's handle. The right arm
      // aims at the robot (yaw) and pitches out only as far as the robot's
      // NEAR edge — so the hand sits ON the shell and never pokes through it.
      const holding = len < 1.6 && pm.fall < 0.4 && pm.sit < 0.4;
      pm.grip = pm.grip || 0;
      pm.grip += ((holding ? 1 : 0) - pm.grip) * 0.18;
      g.arms[0].rotation.x = -sw * 0.5;
      const hand = g.arms[1];
      hand.rotation.order = 'YXZ';
      let rel = (-Math.atan2(dy, dx) + Math.PI / 2) - pm.yaw;
      while (rel > Math.PI) rel -= 2 * Math.PI;
      while (rel < -Math.PI) rel += 2 * Math.PI;
      rel = Math.max(-1.1, Math.min(1.1, rel));
      const reach = Math.max(0.06, Math.min(len - 0.22, 0.26));
      const pitch = Math.atan2(reach, 0.34);
      hand.rotation.y = rel * pm.grip;
      hand.rotation.x = (sw * 0.28) * (1 - pm.grip) - pitch * pm.grip;

      pm.link.visible = len < 2.2 && pm.fall < 0.5;
      if (pm.link.visible) {
        pm.link.position.set(ox + (p.x + rb.x) / 2, 0.42, oz + (p.y + rb.y) / 2);
        pm.link.scale.set(1, Math.max(0.05, len), 1);
        pm.link.rotation.set(0, 0, Math.PI / 2);
        pm.link.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -Math.atan2(dy, dx));
        // amber while they are drifting out of reach, calm blue while all is well
        const far = len > 1.1;
        pm.link.material.emissive.setHex(far ? 0xffb03b : 0x8ab6ff);
        pm.link.material.emissiveIntensity = far ? 1.1 : 0.5;
      }
    }

    // the dog: brisker walk cycle, constant happy tail wag, bigger body bob
    const dog = engine.dog, dm = this.dogMesh;
    if (dm && dog) {
      dm.visible = dog.enabled !== false;
      dm.position.set(ox + dog.x, 0, oz + dog.y);
      dm.rotation.y = -dog.heading;
      const t = dog.t, walk = dog.moving ? 1 : 0;
      const shd = this._slopeAt(engine, dog.x, dog.y);
      dm.position.y = 0.075 + (shd ? shd.h : 0) + walk * Math.abs(Math.sin(t * 8.2)) * 0.02;
      for (let i = 0; i < this.dogLegs.length; i++) {
        const phase = (i === 0 || i === 3) ? 0 : Math.PI;        // diagonal pairs
        this.dogLegs[i].rotation.z = walk * Math.sin(t * 8.2 + phase) * 0.55;
      }
      this.dogTail.rotation.y = Math.sin(t * (walk ? 9 : 4.5)) * 0.55;
      this.dogTail.rotation.x = Math.sin(t * 3.1) * 0.1;
    }
  }

  // one POV draw, reusable by the director (full frame or a half)
  _renderPovOf(pose, vp) {
    const cx = Math.cos(pose.h), sz = Math.sin(pose.h);
    this.camera.aspect = vp ? vp.w / vp.h : (this.container.clientWidth / (this.container.clientHeight || 1));
    this.camera.fov = 74;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(pose.x - cx * 0.10, 0.34, pose.z - sz * 0.10);
    this.camera.lookAt(pose.x + cx * 3, 0.22, pose.z + sz * 3);
    if (vp) { this.renderer.setViewport(vp.x, vp.y, vp.w, vp.h); this.renderer.setScissor(vp.x, vp.y, vp.w, vp.h); }
    this.renderer.render(this.scene, this.camera);
  }

  // 🎬 THE DIRECTOR: hard cuts every few seconds between real shots —
  // orbits, robot POVs, a split-screen duel, the leader's chase cam.
  _renderCine() {
    const now = performance.now();
    if (!this._cine || now > this._cine.until) {
      const SHOTS = ['orbit', 'pov-red', 'pov-blue', 'split', 'top', 'chase', 'orbit-low'];
      let pick;
      do { pick = SHOTS[Math.floor(Math.random() * SHOTS.length)]; }
      while (this._cine && pick === this._cine.shot);
      this._cine = { shot: pick, until: now + 3800 + Math.random() * 3200, az: Math.random() * Math.PI * 2 };
    }
    const c = this._cine;
    const el = this.renderer.domElement;
    const Wp = el.width / this.renderer.getPixelRatio(), Hp = el.height / this.renderer.getPixelRatio();
    const poses = this._cinePoses || {};
    const lead = (this._cineScores && this._cineScores.blue > this._cineScores.red) ? 'blue' : 'red';
    const resetVp = () => {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, Wp, Hp);
      this.camera.aspect = Wp / (Hp || 1);
      this.camera.updateProjectionMatrix();
    };
    if (c.shot === 'split' && poses.red && poses.blue) {
      this.renderer.setScissorTest(true);
      this._renderPovOf(poses.red, { x: 0, y: 0, w: Wp / 2 - 1, h: Hp });
      this._renderPovOf(poses.blue, { x: Wp / 2 + 1, y: 0, w: Wp / 2 - 1, h: Hp });
      resetVp();
      return;
    }
    resetVp();
    if ((c.shot === 'pov-red' && poses.red) || (c.shot === 'pov-blue' && poses.blue)) {
      this._renderPovOf(c.shot === 'pov-red' ? poses.red : poses.blue);
      return;
    }
    if (c.shot === 'chase' && poses[lead]) {
      const p = poses[lead];
      const cx = Math.cos(p.h), sz = Math.sin(p.h);
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(p.x - cx * 2.3, 1.7, p.z - sz * 2.3);
      this.camera.lookAt(p.x + cx * 2, 0.2, p.z + sz * 2);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // orbits + top: classic crane shots, drifting slowly
    c.az += 0.0028;
    const cfgS = c.shot === 'top' ? { pol: 0.06, rad: 26, fov: 30 }
      : c.shot === 'orbit-low' ? { pol: 1.15, rad: 17, fov: 40 }
      : { pol: 0.62, rad: 24, fov: 30 };
    this.camera.fov = cfgS.fov;
    this.camera.updateProjectionMatrix();
    const sp = Math.sin(cfgS.pol), cp = Math.cos(cfgS.pol);
    this.camera.position.set(cfgS.rad * sp * Math.cos(c.az), cfgS.rad * cp, cfgS.rad * sp * Math.sin(c.az));
    this.camera.lookAt(0, 0.3, 0);
    this.renderer.render(this.scene, this.camera);
  }

  render() {
    // ---- 🎬 CINEMATIC: the auto-director takes the wheel ----
    if (this.viewMode === 'cine') { this._renderCine(); return; }
    // ---- ROBOT POV: ride team 1's shell, look where it looks ----
    if (this.viewMode === 'pov' && this._povPose) {
      const p = this._povPose;
      const cx = Math.cos(p.h), sz = Math.sin(p.h);
      this.camera.fov += (74 - this.camera.fov) * 0.15;
      this.camera.updateProjectionMatrix();
      this.camera.position.set(p.x - cx * 0.10, 0.34, p.z - sz * 0.10);
      this.camera.lookAt(p.x + cx * 3, 0.22, p.z + sz * 3);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // ---- 360°: the 2.5D framing, slowly circling the house ----
    if (this.viewMode === 'spin') { this.tAz += 0.004; this.az = this.tAz; }
    if (this.anim) {
      this.az += (this.tAz - this.az) * 0.12; this.pol += (this.tPol - this.pol) * 0.12; this.rad += (this.tRad - this.rad) * 0.12;
      this.camera.fov += (this.tFov - this.camera.fov) * 0.12; this.camera.updateProjectionMatrix();
      if (this.viewMode !== 'spin' && Math.abs(this.tAz - this.az) < 0.001 && Math.abs(this.tPol - this.pol) < 0.001 && Math.abs(this.tRad - this.rad) < 0.02 && Math.abs(this.tFov - this.camera.fov) < 0.1) this.anim = false;
    }
    const sp = Math.sin(this.pol), cp = Math.cos(this.pol);
    this.camera.position.set(this.rad * sp * Math.cos(this.az), this.rad * cp, this.rad * sp * Math.sin(this.az));
    this.camera.lookAt(0, 0.3, 0);
    this.renderer.render(this.scene, this.camera);
  }
}

if (typeof window !== 'undefined') window.Renderer3D = Renderer3D;
