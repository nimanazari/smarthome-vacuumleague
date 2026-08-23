/* ============================================================
   RobotSensors — standalone 2-D robot sensing + navigation kit.
   ZERO dependencies: works in any browser page and in Node.

   World convention (same as the match engine):
     origin (0,0) = BOTTOM-LEFT corner, x to the right, y up,
     heading in radians CCW (0 = +x, PI/2 = +y). Metres.

   Use it in ANY project:

     <script src="sensors.js"></script>
     const world = { segments: [{x1:0,y1:0,x2:10,y2:0}, ...],
                     circles:  [{x:5, y:5, r:0.3}, ...] };
     const pose = { x: 2, y: 3, heading: 0.4, r: 0.24 };
     const d = RobotSensors.distances(pose, world, { maxRange: 2 });
     // -> { fl, fc, fr, l, r, bl, br }  distances in metres

     const out = RobotSensors.nav.driveTo(pose, 8, 8);
     // -> { left, right, arrived }  wheel throttle in -1..1 that steers
     //    the robot straight along the A->B line (the hypotenuse)

   API
     RobotSensors.ANGLES                          the 7 stock sensor directions
     RobotSensors.raySegment(ox,oy,dx,dy,seg)     distance to a wall segment (Infinity if missed)
     RobotSensors.rayCircle(ox,oy,dx,dy,cx,cy,r)  distance to a circle
     RobotSensors.rayDist(x,y,ang,maxD,segments)  nearest wall along one angle
     RobotSensors.distances(pose, world, opts)    the full sensor rig
         opts: { maxRange = 2, angles = ANGLES }  (pick any subset you want)
     RobotSensors.nav.dist(ax,ay,bx,by)           straight-line distance
     RobotSensors.nav.bearing(ax,ay,bx,by)        direction A->B, radians CCW
     RobotSensors.nav.angleErr(heading, bearing)  shortest signed error, -PI..PI
     RobotSensors.nav.driveTo(pose, tx, ty, opts) differential-drive step
         opts: { stopDist = 0.12, max = 1, faceFirst = 0.5, gain = 2.2 }

   In a bundler / Node:  const RobotSensors = require('./sensors.js');
   ============================================================ */
(function (root) {
  'use strict';

  // sensor angle offsets relative to the robot heading (radians)
  // front-left / front / front-right, left, right, back-left, back-right
  const ANGLES = {
    fl: +0.45, fc: 0.0, fr: -0.45,
    l: +Math.PI / 2, r: -Math.PI / 2,
    bl: Math.PI - 0.6, br: Math.PI + 0.6,
  };

  // distance from (ox,oy) along (dx,dy) to segment {x1,y1,x2,y2}; Infinity if missed
  function raySegment(ox, oy, dx, dy, s) {
    const Ex = s.x2 - s.x1, Ey = s.y2 - s.y1;
    const det = Ex * dy - dx * Ey;
    if (Math.abs(det) < 1e-9) return Infinity;
    const Fx = s.x1 - ox, Fy = s.y1 - oy;
    const t = (-Fx * Ey + Ex * Fy) / det;
    const u = (dx * Fy - Fx * dy) / det;
    if (t >= 0 && u >= 0 && u <= 1) return t;
    return Infinity;
  }

  // distance from (ox,oy) along (dx,dy) to circle (cx,cy,r); Infinity if missed
  function rayCircle(ox, oy, dx, dy, cx, cy, r) {
    const mx = ox - cx, my = oy - cy;
    const b = mx * dx + my * dy;
    const c = mx * mx + my * my - r * r;
    if (c > 0 && b > 0) return Infinity;
    const disc = b * b - c;
    if (disc < 0) return Infinity;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : 0;
  }

  // nearest wall along one absolute angle (no circles) — quick look-ahead
  function rayDist(x, y, ang, maxD, segments) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let best = maxD;
    for (let i = 0; i < segments.length; i++) {
      const t = raySegment(x, y, dx, dy, segments[i]);
      if (t < best) best = t;
    }
    return best;
  }

  // the full sensor rig: cast every requested direction against the world.
  // pose {x, y, heading, r} — rays start ON the robot's rim, like real sensors.
  function distances(pose, world, opts) {
    opts = opts || {};
    const angles = opts.angles || ANGLES;
    const maxRange = opts.maxRange != null ? opts.maxRange : 2.0;
    const segs = (world && world.segments) || [];
    const circles = (world && world.circles) || [];
    const rr = pose.r || 0;
    const out = {};
    for (const key in angles) {
      const ang = pose.heading + angles[key];
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const ox = pose.x + rr * dx, oy = pose.y + rr * dy;
      let best = maxRange;
      for (let i = 0; i < segs.length; i++) {
        const t = raySegment(ox, oy, dx, dy, segs[i]);
        if (t < best) best = t;
      }
      for (let i = 0; i < circles.length; i++) {
        const t = rayCircle(ox, oy, dx, dy, circles[i].x, circles[i].y, circles[i].r);
        if (t < best) best = t;
      }
      out[key] = best;
    }
    return out;
  }

  /* ---------- navigation: position sensor + A -> B driving ---------- */
  const nav = {
    dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },

    // direction from A to B, radians CCW, 0 = +x
    bearing(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },

    // shortest signed difference bearing - heading, wrapped to -PI..PI
    angleErr(heading, bearing) {
      let e = bearing - heading;
      while (e > Math.PI) e -= 2 * Math.PI;
      while (e < -Math.PI) e += 2 * Math.PI;
      return e;
    },

    // One differential-drive step toward (tx,ty): rotate in place while the
    // target is far off-heading, then drive the straight line (the hypotenuse)
    // with a proportional curve. Returns wheel throttles in -1..1.
    driveTo(pose, tx, ty, opts) {
      opts = opts || {};
      const stopDist = opts.stopDist != null ? opts.stopDist : 0.12;
      const max = opts.max != null ? opts.max : 1;
      const faceFirst = opts.faceFirst != null ? opts.faceFirst : 0.5;
      const gain = opts.gain != null ? opts.gain : 2.2;

      const d = nav.dist(pose.x, pose.y, tx, ty);
      if (d <= stopDist) return { left: 0, right: 0, arrived: true };

      const clamp1 = (v) => Math.max(-1, Math.min(1, v));
      const err = nav.angleErr(pose.heading, nav.bearing(pose.x, pose.y, tx, ty));
      if (Math.abs(err) > faceFirst) {
        const s = err > 0 ? 1 : -1;              // err > 0 -> target is CCW (left)
        // mostly rotate — but with a whisper of forward drive. A PURE in-place
        // spin can be held forever by a body leaning on the shell (the contact
        // counter-torques it and the heading never converges); the tiny creep
        // keeps the geometry changing, so the spin always resolves.
        const creep = 0.10 * max;
        return { left: clamp1(creep - 0.72 * s * max), right: clamp1(creep + 0.72 * s * max), arrived: false };
      }
      const turn = Math.max(-0.6, Math.min(0.6, gain * err));
      const fwd = max * (d < 0.5 ? Math.max(0.45, d / 0.5) : 1);   // ease in near the goal
      return { left: clamp1(fwd - turn * max), right: clamp1(fwd + turn * max), arrived: false };
    },
  };

  const api = { ANGLES, raySegment, rayCircle, rayDist, distances, nav };
  root.RobotSensors = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
