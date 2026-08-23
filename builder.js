/* ============================================================
   builder.js  —  the robot builder.

   A team does not get a robot any more, they BUILD one: pick a part
   from the shop, click the spot on the 3D chassis where it should go,
   and it is bolted there. What you bolt on is exactly what your
   Python code can read — no rear sensor, no `backleft`.

   Self-contained: give it a container and it does the rest.

       RobotBuilder.open({
         league,                       // the league definition (robot, kit)
         kits: { red: [...], blue: [...] },
         onDone(kits) { ... },
       });
   ============================================================ */
(function (root) {
  'use strict';

  const P = () => root.RobotParts;
  const $ = (id) => document.getElementById(id);
  const SHELL_R = 0.25;

  const S = {
    open: false, team: 'red', pick: null, sel: null,
    kits: { red: null, blue: null }, league: null, onDone: null,
    scene: null, camera: null, renderer: null, robot: null, ring: null,
    az: 0.9, pol: 1.02, rad: 1.95, radT: 1.95, drag: null, raf: 0,
  };

  /* ---------------- the 3D bench ---------------- */

  function initGL(host) {
    if (S.renderer) return;
    S.scene = new THREE.Scene();
    S.scene.background = null;
    S.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 40);
    S.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // full native resolution — this is the page where you look at your robot
    // from ten centimetres away, so it earns the extra pixels
    S.renderer.setPixelRatio(window.devicePixelRatio || 1);
    S.renderer.outputEncoding = THREE.sRGBEncoding;
    host.appendChild(S.renderer.domElement);
    S.renderer.domElement.style.display = 'block';
    S.renderer.domElement.style.cursor = 'crosshair';

    S.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x20242c, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.2, 3.4, 1.8); S.scene.add(key);
    const fill = new THREE.DirectionalLight(0x8ab6ff, 0.5);
    fill.position.set(-2.5, 1.2, -2.0); S.scene.add(fill);

    // the bench: a lit disc with a degree scale, so an angle is a real place
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.02, 56),
      new THREE.MeshStandardMaterial({ color: 0x171b22, roughness: 0.85 }));
    pad.position.y = -0.012; S.scene.add(pad);
    const flat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide });
    const dial = new THREE.Mesh(new THREE.RingGeometry(0.40, 0.415, 64), flat(0x4d8bff, 0.5));
    dial.rotation.x = -Math.PI / 2; dial.position.y = 0.001; S.scene.add(dial);
    for (let k = 0; k < 12; k++) {                 // a tick every 30°
      const a = k * Math.PI / 6;
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.012, k % 3 === 0 ? 0.07 : 0.038), flat(0x4d8bff, k % 3 === 0 ? 0.8 : 0.35));
      t.rotation.x = -Math.PI / 2; t.rotation.z = -a;
      t.position.set(Math.cos(a) * 0.45, 0.001, -Math.sin(a) * 0.45);
      S.scene.add(t);
    }
    // the nose marker: 0° is straight ahead, and you can see it
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 3), flat(0xffd23b, 0.9));
    nose.rotation.x = -Math.PI / 2; nose.rotation.z = -Math.PI / 2;
    nose.position.set(0.50, 0.002, 0); S.scene.add(nose);

    // the highlight ring that follows the cursor around the shell
    S.ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffd23b, transparent: true, opacity: 0.9, depthTest: false }));
    S.ring.visible = false; S.scene.add(S.ring);

    wireInput(S.renderer.domElement);
  }

  function resize() {
    const host = $('bCanvas');
    if (!host || !S.renderer) return;
    const w = host.clientWidth, h = host.clientHeight || 320;
    S.renderer.setSize(w, h, false);
    S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
  }

  function draw() {
    if (!S.open) return;
    S.raf = requestAnimationFrame(draw);
    // the showroom turn: a slow idle spin so the robot shows all its sides —
    // it pauses the moment you are placing a part or dragging the view
    if (!S.drag && !S.pick) S.az += 0.004;
    S.rad += (S.radT - S.rad) * 0.18;                       // glide, don't jump
    const sp = Math.sin(S.pol), cp = Math.cos(S.pol);
    S.camera.position.set(S.rad * sp * Math.cos(S.az), S.rad * cp + 0.10, S.rad * sp * Math.sin(S.az));
    S.camera.lookAt(0, 0.14, 0);
    S.renderer.render(S.scene, S.camera);
  }

  /* ---------------- placing parts by clicking the robot ---------------- */

  // where on the shell is the cursor? -> { angle (deg), height (0..1) }
  function hitSpot(ev) {
    const el = S.renderer.domElement, r = el.getBoundingClientRect();
    const m = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(m, S.camera);
    const hits = ray.intersectObject(S.robot, true);
    if (!hits.length) return null;
    const p = hits[0].point;
    // the model faces +x and the world z axis is our -y, same as the match
    const angle = Math.atan2(-p.z, p.x) * 180 / Math.PI;
    const height = Math.max(0, Math.min(1, (p.y - 0.06) / 0.20));
    return { angle: Math.round(angle * 2) / 2, height, mesh: hits[0].object };
  }

  function wireInput(el) {
    let moved = 0;
    el.addEventListener('pointerdown', (ev) => {
      S.drag = { x: ev.clientX, y: ev.clientY, az: S.az, pol: S.pol };
      moved = 0;
      el.setPointerCapture(ev.pointerId);
    });
    el.addEventListener('pointermove', (ev) => {
      if (S.drag) {
        const dx = ev.clientX - S.drag.x, dy = ev.clientY - S.drag.y;
        moved += Math.abs(dx) + Math.abs(dy);
        S.az = S.drag.az - dx * 0.008;                      // full 360°, endlessly
        S.pol = Math.max(0.06, Math.min(1.52, S.drag.pol - dy * 0.006));
        return;
      }
      const spot = hitSpot(ev);
      S.ring.visible = !!spot && !!S.pick;
      if (spot && S.pick) {
        const a = spot.angle * Math.PI / 180;
        S.ring.position.set(Math.cos(a) * SHELL_R * 1.02, 0.06 + spot.height * 0.20, -Math.sin(a) * SHELL_R * 1.02);
        S.ring.rotation.set(Math.PI / 2, 0, -a);
        $('bHint').textContent = P().CATALOG[S.pick].name.en + '  →  ' + Math.round(spot.angle) + '°';
      }
    });
    el.addEventListener('pointerup', (ev) => {
      const wasDrag = moved > 6;
      S.drag = null;
      el.releasePointerCapture(ev.pointerId);
      if (wasDrag) return;
      const spot = hitSpot(ev);
      if (!spot) return;
      if (S.pick) {
        const p = S.kits[S.team].add(S.pick, { angle: spot.angle, height: spot.height });
        if (!p) { flash('You already have the most of those you can fit.'); return; }
        S.sel = p.uid;
        if (S.kits[S.team].count(S.pick) >= P().CATALOG[S.pick].max) S.pick = null;
        refresh();
      }
    });
    el.addEventListener('wheel', (ev) => {
      // full zoom, mouse wheel or trackpad: from the whole bench down to a
      // close-up of one sensor. Exponential so every notch feels the same.
      ev.preventDefault();
      S.radT = Math.max(0.45, Math.min(3.4, S.radT * Math.exp(ev.deltaY * 0.0013)));
    }, { passive: false });
  }

  function flash(msg) {
    const h = $('bHint');
    h.textContent = msg;
    h.classList.add('warn');
    setTimeout(() => h.classList.remove('warn'), 1400);
  }

  /* ---------------- the panels ---------------- */

  // The chassis list is whatever the loaded leagues registered (each league
  // brings its own model in leagues/<id>/robot.js) plus the neutral box.
  const SHAPES = () => (HomeObjects.robotShapes ? HomeObjects.robotShapes() : [{ kind: 'box', icon: '📦', label: 'Box' }])
    .map((r) => [r.kind, r.icon, { en: r.label }]);

  // The 3D side alone: rebuild the chassis when team / shape / paint changed,
  // then remount the parts and the selection glow. The colour picker and the
  // angle sliders call THIS while you scrub — the model follows your finger
  // live, and the DOM (including the very input you are holding) stays put.
  function rebuildRobot() {
    const kit = S.kits[S.team];
    const kind = kit.body || (S.league && S.league.robot) || 'vacuum';
    const paint = kit.paint || null;
    if (!S.robot || S.robot.userData.team !== S.team || S.robot.userData.kind !== kind || S.robot.userData.paint !== paint) {
      if (S.robot) S.scene.remove(S.robot);
      const base = S.team === 'red' ? { body: 0xe23b3b, top: 0xff7a7a, accent: 0xff5252 }
        : { body: 0x2f6bff, top: 0x74a3ff, accent: 0x4d8bff };
      let style = base;
      if (paint) {
        const hex = parseInt(paint.replace('#', ''), 16);
        const up = (h, m) => { const r = Math.min(255, ((h >> 16) & 255) * m) | 0, g = Math.min(255, ((h >> 8) & 255) * m) | 0, b = Math.min(255, (h & 255) * m) | 0; return (r << 16) | (g << 8) | b; };
        style = { body: hex, top: up(hex, 1.35), accent: base.accent };
      }
      S.robot = HomeObjects.buildRobotOf(kind, style);
      S.robot.userData.team = S.team;
      S.robot.userData.kind = kind;
      S.robot.userData.paint = paint;
      S.scene.add(S.robot);
    }
    Renderer3D.mountParts(S.robot, S.kits[S.team], { radius: SHELL_R });
    for (const m of S.robot.userData.parts || []) {
      const on = m.userData.part && m.userData.part.uid === S.sel;
      m.traverse((o) => { if (o.material && o.material.emissiveIntensity != null) o.material.emissiveIntensity = on ? 1.6 : (o.material.userData_base || 0.7); });
      m.scale.setScalar(on ? 1.25 : 1);
    }
  }

  function refresh() {
    const kit = S.kits[S.team], C = P().CATALOG;
    const kind = kit.body || (S.league && S.league.robot) || 'vacuum';
    rebuildRobot();

    // the chassis picker — the shape is the team's to choose, the physics
    // circle underneath never changes
    const ch = $('bChassis');
    ch.innerHTML = '';
    for (const [id, icon, name] of SHAPES()) {
      const b = document.createElement('button');
      b.className = 'bshape' + (kind === id ? ' on' : '');
      b.type = 'button';
      b.innerHTML = '<span class="bs-ic">' + icon + '</span>' + name.en +
        (id === ((S.league && S.league.robot) || 'vacuum') ? ' ★' : '');
      b.title = 'Chassis shape (looks only — the collision circle stays the same)';
      b.onclick = () => { kit.body = id; refresh(); };
      ch.appendChild(b);
    }
    // the body PAINT: pick any RGB you like; the team accent ring stays
    const pw = document.createElement('label');
    pw.className = 'bpaint';
    pw.innerHTML = '<span>&#127912; Paint</span>';
    const pc = document.createElement('input');
    pc.type = 'color';
    pc.value = kit.paint || (S.team === 'red' ? '#e23b3b' : '#2f6bff');
    // while the picker is open you scrub back and forth and the 3D robot
    // recolours LIVE — no DOM rebuild, so the picker never closes under you
    pc.oninput = () => { kit.paint = pc.value; rebuildRobot(); };
    pc.onchange = () => { kit.paint = pc.value; refresh(); };
    pw.appendChild(pc);
    const px = document.createElement('button');
    px.type = 'button'; px.textContent = 'reset'; px.className = 'bpaint-x';
    px.onclick = () => { kit.paint = null; refresh(); };
    pw.appendChild(px);
    ch.appendChild(pw);

    // shop
    const shop = $('bShop');
    shop.innerHTML = '';
    for (const id of P().ORDER) {
      const spec = C[id], n = kit.count(id), full = n >= spec.max;
      const b = document.createElement('button');
      b.className = 'bpart' + (S.pick === id ? ' on' : '') + (full ? ' full' : '');
      b.type = 'button';
      b.style.setProperty('--pc', spec.color);
      b.innerHTML =
        '<span class="bp-ic">' + spec.icon + '</span>' +
        '<span class="bp-tx"><b>' + spec.name.en + '</b><i>' + spec.reads.en + '</i></span>' +
        '<span class="bp-n">' + n + '/' + spec.max + '</span>' +
        '<span class="bp-pr">' + spec.price + '</span>';
      b.title = spec.desc.en;
      b.onclick = () => {
        if (full) { flash('That is as many as the chassis takes.'); return; }
        // parts that have only one sensible spot go on straight away
        if (spec.mount === 'ring' || spec.mount === 'top' || spec.mount === 'nose') {
          const p = kit.add(id, { angle: spec.mount === 'nose' ? 0 : (kit.count(id) * 60) });
          if (p) { S.sel = p.uid; S.pick = null; refresh(); }
          return;
        }
        S.pick = S.pick === id ? null : id;
        $('bHint').textContent = S.pick ? 'Now click the robot where it should go.' : 'Pick a part, then click the robot.';
        refresh();
      };
      shop.appendChild(b);
    }

    // fitted list
    const list = $('bList');
    list.innerHTML = '';
    if (!kit.parts.length) list.innerHTML = '<div class="bempty">Nothing fitted yet — this robot is blind.</div>';
    let dn = 0, cn = 0;
    for (const p of kit.parts) {
      const spec = C[p.type];
      const label = p.type === 'dist' ? 'dist' + (++dn) : p.type === 'cliff' ? 'cliff' + (++cn) : spec.reads.en;
      const row = document.createElement('div');
      row.className = 'brow' + (S.sel === p.uid ? ' on' : '');
      row.innerHTML =
        '<span class="br-ic" style="color:' + p.color + '">' + spec.icon + '</span>' +
        '<span class="br-nm">' + label + '</span>';
      // the compass angle, typed straight in: 0 = ahead, + = left, − = right
      const num = document.createElement('input');
      num.type = 'number'; num.min = -180; num.max = 180; num.step = 1;
      num.value = Math.round(p.angle);
      num.className = 'br-nu';
      num.title = 'degrees: 0 = straight ahead, + = to the left';
      num.disabled = spec.mount !== 'rim';
      num.onchange = () => {
        let v = +num.value || 0;
        v = ((v + 180) % 360 + 360) % 360 - 180;
        p.angle = v; S.sel = p.uid; refresh();
      };
      row.appendChild(num);
      const dial = document.createElement('input');
      dial.type = 'range'; dial.min = -180; dial.max = 180; dial.step = 1; dial.value = Math.round(p.angle);
      dial.className = 'br-sl';
      dial.disabled = spec.mount !== 'rim';
      // live while dragging: only the 3D part moves, the slider stays in hand
      dial.oninput = () => { p.angle = +dial.value; num.value = Math.round(p.angle); S.sel = p.uid; rebuildRobot(); };
      dial.onchange = () => refresh();
      row.appendChild(dial);
      const col = document.createElement('input');
      col.type = 'color'; col.value = p.color; col.className = 'br-co';
      col.oninput = () => { p.color = col.value; rebuildRobot(); };
      col.onchange = () => refresh();
      row.appendChild(col);
      const del = document.createElement('button');
      del.className = 'br-x'; del.type = 'button'; del.textContent = '×';
      del.onclick = () => { kit.remove(p); if (S.sel === p.uid) S.sel = null; refresh(); };
      row.appendChild(del);
      row.onmouseenter = () => { S.sel = p.uid; paintSel(); };
      list.appendChild(row);
    }

    // budget
    const cost = kit.cost(), budget = S.budget;
    $('bCost').textContent = cost;
    $('bBudget').textContent = budget;
    const pct = Math.min(100, (cost / budget) * 100);
    $('bBar').style.width = pct + '%';
    $('bBar').style.background = cost > budget ? '#ff5252' : (pct > 80 ? '#ffc857' : '#4fce7a');
    $('bGo').disabled = cost > budget;
    $('bGo').textContent = cost > budget ? 'Over budget by ' + (cost - budget) : 'Use this robot →';

    // which classic names this build gives the Python code
    const slots = kit.classicSlots(), names = P().CLASSIC_NAMES;
    const have = [], miss = [];
    for (const k in slots) (slots[k] ? have : miss).push(names[k]);
    if (!kit.has('compass')) miss.push('heading');
    if (!kit.has('gps')) miss.push('x, y, goto()');
    if (!kit.has('color')) miss.push('color');
    if (!kit.has('bumper')) miss.push('bumper');
    $('bVars').innerHTML =
      '<b>Your code can read:</b> ' + (have.length ? have.join(', ') : '<i>nothing</i>') +
      (kit.rays().length ? ', dist1–dist' + kit.rays().length : '') +
      (kit.count('cliff') ? ', cliff1–cliff' + kit.count('cliff') : '') +
      (kit.has('compass') ? ', heading' : '') + (kit.has('gps') ? ', x, y' : '') +
      (kit.has('gyro') ? ', turnrate' : '') + (kit.has('impact') ? ', impact' : '') +
      (miss.length ? '<br><b class="bmiss">Always -1:</b> ' + miss.join(', ') : '');

    for (const t of ['red', 'blue']) {
      const el = $('bTab' + t);
      el.classList.toggle('on', S.team === t);
      el.querySelector('.bt-cost').textContent = S.kits[t].cost();
    }
  }

  function paintSel() {
    for (const m of (S.robot && S.robot.userData.parts) || []) {
      const on = m.userData.part && m.userData.part.uid === S.sel;
      m.scale.setScalar(on ? 1.25 : 1);
    }
    for (const row of $('bList').children) row.classList.remove('on');
  }

  /* ---------------- open / close ---------------- */

  function open(opts) {
    S.league = opts.league || null;
    S.budget = (S.league && S.league.budget) || 200;
    S.onDone = opts.onDone || null;
    for (const t of ['red', 'blue']) {
      // a NEW robot starts as a bare chassis — nothing bolted on. The team
      // attaches every sensor themselves (or taps "League kit" for the
      // suggested rig). A saved build comes back exactly as it was left.
      S.kits[t] = (opts.kits && opts.kits[t])
        ? P().Loadout.from(opts.kits[t])
        : new (P().Loadout)([]).preset('empty');
    }
    S.team = 'red'; S.pick = null; S.sel = null; S.open = true;
    $('buildPanel').style.display = 'flex';
    initGL($('bCanvas'));
    S.robot = null;
    $('bHint').textContent = 'Drag to turn · scroll to zoom right in · pick a part, then click the robot.';
    refresh(); resize(); draw();
  }

  function close() {
    S.open = false;
    cancelAnimationFrame(S.raf);
    $('buildPanel').style.display = 'none';
  }

  function wirePanel() {
    for (const t of ['red', 'blue']) $('bTab' + t).onclick = () => { S.team = t; S.pick = null; S.sel = null; refresh(); };
    $('bGo').onclick = () => {
      const out = { red: S.kits.red.toJSON(), blue: S.kits.blue.toJSON() };
      close();
      if (S.onDone) S.onDone(out);
    };
    $('bBack').onclick = () => { close(); if (S.onBack) S.onBack(); };
    for (const [id, name] of [['bPreClassic', 'classic'], ['bPreLeague', null], ['bPreEmpty', 'empty']]) {
      $(id).onclick = () => {
        // a preset name, or the league's own `{ parts: [...] }` — either way the
        // chassis shape and the paint the team chose survive the swap
        const want = name || (S.league && S.league.kit) || 'classic';
        const k = S.kits[S.team];
        const fresh = P().Loadout.from(want);
        k.clear();
        for (const p of fresh.parts) k.add(p.type, p);
        S.sel = null; refresh();
      };
    }
    $('bCopy').onclick = () => {
      const from = S.team === 'red' ? 'blue' : 'red';
      S.kits[S.team] = S.kits[from].clone();
      refresh();
    };
    window.addEventListener('resize', resize);
  }

  root.RobotBuilder = { open, close, wirePanel, state: S };
})(typeof self !== 'undefined' ? self : this);
