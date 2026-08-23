/* ============================================================
   robot-battery.js  —  a battery pack and its charging station.

   A real cordless robot is the same device in every competition:
   it holds a charge, it runs flat, and it has a base it can drive
   onto to refill. So the model lives here once, and any league that
   wants a battery just makes a pack:

       this.pack = new RobotBattery.Pack(world, { drive: 100 / 60 });
       this.dock = this.pack.dock;              // random, fair, reachable
       …
       preStep(dt)  { this.pack.update(dt); }
       speedMul(rb) { return this.pack.speedMul(rb); }

   Numbers are per second and in percent, so they read like the rules
   the students are given:  drive = 100/60  means "a full charge is
   sixty seconds of full-throttle driving".
   ============================================================ */
(function (root) {
  'use strict';

  const DEFAULTS = {
    drive: 100 / 60,   // %/s at full throttle
    idlePart: 0.25,    // standing still costs this fraction of driving
    charge: 25,        // %/s while parked on the station
    limp: 0.25,        // speed multiplier once the battery is empty
    dockR: 0.32,       // the station's radius (m)
    minFromStart: 2,   // keep it this far from every starting corner (m)
    fixed: null,       // {x, y}: a permanent home for the station (like a real
                       // dock against the wall) instead of a fresh random spot
  };

  class Pack {
    constructor(world, opts) {
      this.world = world;
      this.cfg = Object.assign({}, DEFAULTS, opts || {});
      this.dock = this.place();
      for (const k of world.teams) world.robots[k].battery = 100;
    }

    // The station's home: a FIXED spot when the league gave it one (and the
    // floor there is really open), otherwise a fresh fair random spot.
    place() {
      const f = this.cfg.fixed;
      if (f && this.world.circleFree(f.x, f.y, this.world.cfg.robotRadius + 0.06)) {
        return { x: f.x, y: f.y, r: this.cfg.dockR };
      }
      const s = this.world.fairSpot({
        clear: this.world.cfg.robotRadius + 0.06,
        minFrom: this.cfg.minFromStart,
      });
      return { x: s.x, y: s.y, r: this.cfg.dockR };
    }

    onDock(rb) {
      return Math.hypot(rb.x - this.dock.x, rb.y - this.dock.y) <= this.dock.r;
    }

    // Charge on the pad, otherwise drain by how hard the robot is working.
    // `extra(rb)` lets a league add its own drain (shoving, a heavy load, …).
    update(dt, extra) {
      for (const k of this.world.teams) {
        const rb = this.world.robots[k];
        if (rb.battery == null) continue;
        if (this.onDock(rb)) {
          rb.battery = Math.min(100, rb.battery + this.cfg.charge * dt);
          continue;
        }
        const idle = this.cfg.drive * this.cfg.idlePart;
        const effort = (Math.abs(rb.left) + Math.abs(rb.right)) / 2;      // 0..1
        const add = extra ? extra(rb) : 0;
        rb.battery = Math.max(0, rb.battery - (idle + (this.cfg.drive - idle) * effort + add) * dt);
      }
    }

    // A flat battery does not kill the robot — it limps, so a team can always
    // crawl back to the station, but it loses a lot of working time.
    speedMul(rb) { return (rb.battery != null && rb.battery <= 0) ? this.cfg.limp : 1; }

    // True while the robot is legitimately taking on charge: the referee's
    // "not moving for 10 s" watchdog must leave it alone. It stops being true
    // the moment the battery is full, so camping on the pad is never a tactic.
    charging(rb) {
      return rb.battery != null && rb.battery < 100 &&
        Math.hypot(rb.x - this.dock.x, rb.y - this.dock.y) <= this.dock.r + rb.r;
    }

    // for the scoreboard
    chargingFlags() {
      const out = {};
      for (const k of this.world.teams) out[k] = this.onDock(this.world.robots[k]);
      return out;
    }
  }

  const api = { Pack, DEFAULTS };
  root.RobotBattery = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
