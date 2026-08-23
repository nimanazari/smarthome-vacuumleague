/* ============================================================
   robot-parts.js  —  the parts catalogue and a robot's loadout.

   A robot is not a fixed machine any more: a team BUILDS it. Every
   sensor is a part with a price, and every part is bolted to a spot
   the team chooses (an angle around the shell, or the top / the
   underside). What the Python code can see follows directly from
   what the team actually bought and where they put it:

       no sensor pointing backwards  ->  backleft / backright are -1
       no compass                    ->  heading is -1
       no GPS                        ->  x and y are -1, goto() is dead

   Standalone: it only needs sensors.js for the ray maths, and it has
   no idea a league or a renderer exists.

       const kit = new RobotParts.Loadout();     // the classic rig
       kit.add('dist', { angle: 45 });           // one more, 45° to the left
       kit.cost();                               // credits spent
       world.readKit(robot);                     // -> every reading
   ============================================================ */
(function (root) {
  'use strict';

  const D2R = Math.PI / 180;

  /* ---------------- the catalogue ---------------- */
  // angle: degrees around the shell, 0 = straight ahead, + = left (CCW)
  const CATALOG = {
    dist: {
      id: 'dist', price: 10, max: 12, mount: 'rim', icon: '📡', color: '#4d8bff',
      name: { en: 'Distance sensor', fa: 'سنسور فاصله' },
      desc: {
        en: 'Measures how far the nearest thing is along the direction it points, up to 200 cm.',
        fa: 'فاصله‌ی نزدیک‌ترین چیز در جهتی که به آن نگاه می‌کند را تا ۲۰۰ سانتی‌متر می‌سنجد.',
      },
      reads: { en: 'dist1 … distN, and front / frontleft / … when one points that way', fa: 'dist1 تا distN و نام‌های front / frontleft / … وقتی سنسوری آن سمت باشد' },
    },
    cliff: {
      id: 'cliff', price: 8, max: 8, mount: 'rim', icon: '⬇️', color: '#ff8a4c',
      name: { en: 'Edge sensor', fa: 'سنسور لبه' },
      desc: {
        en: 'Looks straight down just outside the shell. Reads 1 when there is no floor under it — the edge of the arena.',
        fa: 'مستقیم به پایین و بیرون بدنه نگاه می‌کند. وقتی زیرش کفی نباشد ۱ می‌شود — لبه‌ی میدان.',
      },
      reads: { en: 'cliff1 … cliffN', fa: 'cliff1 تا cliffN' },
    },
    bumper: {
      id: 'bumper', price: 5, max: 1, mount: 'ring', icon: '⭕', color: '#ffd23b',
      name: { en: 'Bumper ring', fa: 'حلقه‌ی ضربه‌گیر' },
      desc: {
        en: 'The ring around the shell. Reads 1 the moment you touch anything at all.',
        fa: 'حلقه‌ی دور بدنه. لحظه‌ای که به چیزی بخوری ۱ می‌شود.',
      },
      reads: { en: 'bumper', fa: 'bumper' },
    },
    color: {
      id: 'color', price: 8, max: 1, mount: 'nose', icon: '🎨', color: '#b07ae8',
      name: { en: 'Colour sensor', fa: 'سنسور رنگ' },
      desc: {
        en: 'Points down at the floor just ahead of the nose and names the colour it sees.',
        fa: 'به کف جلوی دماغه نگاه می‌کند و رنگی که می‌بیند را می‌گوید.',
      },
      reads: { en: 'color', fa: 'color' },
    },
    compass: {
      id: 'compass', price: 6, max: 1, mount: 'top', icon: '🧭', color: '#2fd08a',
      name: { en: 'Compass', fa: 'قطب‌نما' },
      desc: {
        en: 'Which way you are facing, 0–359°. Without it heading is -1 and angleto() is useless.',
        fa: 'جهتی که رو به آن هستی، ۰ تا ۳۵۹ درجه. بدون آن heading برابر −۱ است و angleto() بی‌فایده.',
      },
      reads: { en: 'heading', fa: 'heading' },
    },
    gyro: {
      id: 'gyro', price: 7, max: 1, mount: 'top', icon: '🌀', color: '#4fc3f7',
      name: { en: 'Gyro', fa: 'ژیروسکوپ' },
      desc: {
        en: 'How fast you are turning right now, in degrees per second (+ = turning left).',
        fa: 'سرعت چرخش فعلی، درجه بر ثانیه (مثبت = چرخش به چپ).',
      },
      reads: { en: 'turnrate', fa: 'turnrate' },
    },
    gps: {
      id: 'gps', price: 12, max: 1, mount: 'top', icon: '📍', color: '#ff5c8a',
      name: { en: 'Position sensor', fa: 'سنسور موقعیت' },
      desc: {
        en: 'Where you are on the map, in cm. goto(), distto() and angleto() all need it.',
        fa: 'موقعیت تو روی نقشه به سانتی‌متر. goto() و distto() و angleto() همه به آن نیاز دارند.',
      },
      reads: { en: 'x, y', fa: 'x و y' },
    },
    impact: {
      id: 'impact', price: 9, max: 1, mount: 'ring', icon: '💥', color: '#ff5252',
      name: { en: 'Impact sensor', fa: 'سنسور برخورد' },
      desc: {
        en: 'Tells a hit from a scrape: 1 while another ROBOT is leaning on you, and which side.',
        fa: 'ضربه را از مالش تشخیص می‌دهد: تا وقتی ربات دیگری به تو فشار می‌آورد ۱ است و سمتش را می‌گوید.',
      },
      reads: { en: 'impact, impactangle', fa: 'impact و impactangle' },
    },
    encoder: {
      id: 'encoder', price: 6, max: 1, mount: 'top', icon: '⚙️', color: '#9aa5ff',
      name: { en: 'Wheel encoder', fa: 'انکودر چرخ' },
      desc: {
        en: 'Counts every centimetre the wheels have rolled since the start — real sumo robots navigate the ring with it.',
        fa: 'هر سانتی‌متری که چرخ‌ها چرخیده‌اند را می‌شمارد — سومو‌های واقعی با همین در رینگ جهت‌یابی می‌کنند.',
      },
      reads: { en: 'odometer', fa: 'odometer' },
    },
    load: {
      id: 'load', price: 7, max: 1, mount: 'top', icon: '🔋', color: '#ffa94d',
      name: { en: 'Motor load sensor', fa: 'سنسور جریان موتور' },
      desc: {
        en: 'How hard the motors are straining, 0–100. Wheels spinning but not moving = you are locked in a shoving match.',
        fa: 'فشار روی موتورها، ۰ تا ۱۰۰. چرخ می‌چرخد ولی جلو نمی‌روی = وسط یک کشتی هل‌دادنی گیر کرده‌ای.',
      },
      reads: { en: 'motorload', fa: 'motorload' },
    },
    heat: {
      id: 'heat', price: 9, max: 1, mount: 'nose', icon: '🔥', color: '#ff5c3b',
      name: { en: 'Flame sensor', fa: 'سنسور شعله' },
      desc: {
        en: 'Feels the nearest fire: which way it is (relative to your nose) and how far. The heart of the firefighter league.',
        fa: 'نزدیک‌ترین آتش را حس می‌کند: کدام سمت است (نسبت به دماغه) و چقدر دور. قلب لیگ آتش‌نشان.',
      },
      reads: { en: 'heatdir, heatdist', fa: 'heatdir و heatdist' },
    },
    camera: {
      id: 'camera', price: 14, max: 1, mount: 'rim', icon: '📷', color: '#8ab6ff',
      name: { en: 'Camera', fa: 'دوربین' },
      desc: {
        en: 'Names what it is looking at: a person, the rival, the cat, the dog or just furniture — and how far.',
        fa: 'می‌گوید روبه‌رویش چیست: آدم، حریف، گربه، سگ یا فقط مبلمان — و چقدر فاصله دارد.',
      },
      reads: { en: 'camsee, camdist', fa: 'camsee و camdist' },
    },
    handle: {
      id: 'handle', price: 7, max: 1, mount: 'top', icon: '🤝', color: '#6cd4a8',
      name: { en: 'Guide handle', fa: 'دسته‌ی هدایت' },
      desc: {
        en: 'The instrumented grip the person holds. Without it the robot has no idea where they are or that they fell.',
        fa: 'دسته‌ای که فرد می‌گیرد و سنسور دارد. بدون آن ربات نمی‌داند فرد کجاست یا زمین خورده.',
      },
      reads: { en: 'personback, persondown, personx, persony', fa: 'personback و persondown و personx/persony' },
    },
  };

  const ORDER = ['dist', 'cliff', 'bumper', 'color', 'camera', 'compass', 'gyro', 'gps', 'impact', 'encoder', 'load', 'heat', 'handle'];

  // the seven classic directions, in degrees, so a loadout can rebuild the
  // familiar front / frontleft / … names
  const CLASSIC = {
    fc: 0, fl: 25.8, fr: -25.8, l: 90, r: -90, bl: 145.6, br: -145.6,
  };
  const CLASSIC_NAMES = { fc: 'front', fl: 'frontleft', fr: 'frontright', l: 'left', r: 'right', bl: 'backleft', br: 'backright' };
  const SLOT_TOLERANCE = 22;   // degrees: a sensor this close counts as covering a classic slot

  let uid = 1;

  class Loadout {
    constructor(parts) {
      this.parts = [];
      this.body = null;                // chassis shape; null = the league's default
      this.paint = null;               // '#rrggbb' body colour; null = the team colour
      if (parts) for (const p of parts) this.add(p.type, p);
      else this.preset('classic');
    }

    add(type, opts) {
      const spec = CATALOG[type];
      if (!spec) return null;
      if (this.count(type) >= spec.max) return null;
      opts = opts || {};
      const p = {
        uid: uid++,
        type,
        angle: opts.angle != null ? +opts.angle : 0,     // degrees, 0 = ahead, + = left
        height: opts.height != null ? +opts.height : 0.5, // 0 = bottom of the shell, 1 = top
        color: opts.color || spec.color,
      };
      this.parts.push(p);
      return p;
    }

    remove(uidOrPart) {
      const id = typeof uidOrPart === 'object' ? uidOrPart.uid : uidOrPart;
      const i = this.parts.map((p) => p.uid).indexOf(id);
      if (i >= 0) this.parts.splice(i, 1);
      return i >= 0;
    }

    clear() { this.parts.length = 0; return this; }
    count(type) { return this.parts.filter((p) => p.type === type).length; }
    has(type) { return this.count(type) > 0; }
    of(type) { return this.parts.filter((p) => p.type === type); }
    cost() { return this.parts.reduce((s, p) => s + (CATALOG[p.type] ? CATALOG[p.type].price : 0), 0); }

    // the distance sensors, in the order the Python code sees them (dist1, dist2 …)
    rays() { return this.of('dist'); }

    // which classic name, if any, this loadout covers — used so the old
    // examples keep working when the team keeps the stock rig
    classicSlots() {
      const out = {};
      const rays = this.rays();
      for (const key in CLASSIC) {
        let best = null, bestD = SLOT_TOLERANCE;
        for (const p of rays) {
          // wrap-safe |difference| in degrees, -180..180
          const d = Math.abs((((p.angle - CLASSIC[key] + 180) % 360) + 360) % 360 - 180);
          if (d < bestD) { bestD = d; best = p; }
        }
        out[key] = best;                                  // null = the team has no sensor there
      }
      return out;
    }

    preset(name) {
      this.clear();
      if (name === 'empty') return this;
      if (name === 'guide') {
        // eyes forward to steer, a strong look BACKWARD (the person walks behind
        // you), and the instrumented handle they hold on to
        for (const a of [0, 25.8, -25.8, 90, -90, 145.6, -145.6, 180]) this.add('dist', { angle: a });
        this.add('bumper'); this.add('color'); this.add('compass'); this.add('gps'); this.add('handle'); this.add('camera', { angle: 0 });
        return this;
      }
      if (name === 'sumo') {
        // the real mini-sumo rig: opponent rangefinders all round, edge sensors
        // at every corner, IMU, and the two that win shoving matches — the
        // wheel encoder and the motor-load sensor
        for (const a of [0, 25.8, -25.8, 90, -90, 145.6, -145.6]) this.add('dist', { angle: a });
        for (const a of [0, 90, -90, 180]) this.add('cliff', { angle: a });
        this.add('bumper'); this.add('impact'); this.add('gyro'); this.add('compass'); this.add('gps');
        this.add('encoder'); this.add('load'); this.add('camera', { angle: 0 });
        return this;
      }
      if (name === 'energy') {
        // the switch-runner: eyes forward to weave between furniture, and the
        // position sensor to race from appliance to appliance
        for (const a of [0, 25.8, -25.8, 90, -90]) this.add('dist', { angle: a });
        this.add('bumper'); this.add('compass'); this.add('gps');
        return this;
      }
      if (name === 'fire') {
        // the firefighter: eyes forward, the flame sensor on the nose, and a
        // position sensor to navigate the house between fires
        for (const a of [0, 25.8, -25.8, 90, -90]) this.add('dist', { angle: a });
        this.add('bumper'); this.add('compass'); this.add('gps'); this.add('heat');
        return this;
      }
      // 'classic' — exactly the rig every robot used to be born with
      for (const key of ['fc', 'fl', 'fr', 'l', 'r', 'bl', 'br']) this.add('dist', { angle: CLASSIC[key] });
      this.add('bumper'); this.add('color'); this.add('compass'); this.add('gps');
      return this;
    }

    toJSON() {
      return {
        body: this.body || null,
        paint: this.paint || null,
        parts: this.parts.map((p) => ({ type: p.type, angle: p.angle, height: p.height, color: p.color })),
      };
    }
    clone() { return Loadout.from(this.toJSON()); }

    static from(data) {
      if (!data) return new Loadout();
      if (data instanceof Loadout) return data;
      // old saves were a bare array of parts; new ones carry the chassis too
      if (Array.isArray(data)) { const l = new Loadout([]); for (const p of data) l.add(p.type, p); return l; }
      if (data.parts) {
        const l = new Loadout([]);
        for (const p of data.parts) l.add(p.type, p);
        l.body = data.body || null;
        l.paint = data.paint || null;
        return l;
      }
      if (typeof data === 'string') return new Loadout([]).preset(data);
      return new Loadout();
    }
  }

  const api = { CATALOG, ORDER, CLASSIC, CLASSIC_NAMES, SLOT_TOLERANCE, Loadout, D2R };
  root.RobotParts = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
