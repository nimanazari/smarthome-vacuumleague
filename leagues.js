/* ============================================================
   leagues.js  —  the league registry.

   The simulator itself (physics.js) knows nothing about rules. A
   league is a small object that says who it is for, what its match
   settings are, and how to build a rule-set on top of a World.

   Adding a league is ONE new file plus ONE script tag:

     Leagues.register({
       id: 'guard-u19',
       code: 'U19', group: 'guard',
       name:  { en: 'Home Guard', fa: 'نگهبان خانه' },
       ...
       create(world, cfg) { return new GuardMode(world, cfg); }
     });

   Nothing else in the project has to change: the picker screen, the
   engine and the scoreboard all read this registry.

   A rule-set ("mode") only has to answer these, all optional:
     scores      { red, blue }              live score, read by the UI
     overtime    [10, 5, 5]                 extra seconds while it is a draw
     speedMul(robot) -> 1                   slow a robot down this tick
     preStep(dt)                            before the bodies move
     postStep(dt)                           after the bodies moved
     info(robot, other) -> {}               extra values for the robot code
     hud() -> {}                            extra values for the scoreboard
   ============================================================ */
(function (root) {
  'use strict';

  const defs = {};
  const order = [];
  const groupDefs = {};
  const groupOrder = [];

  const Leagues = {
    // A group is one competition (the vacuum league, sumo, …); its divisions are
    // the age brackets inside it. The picker screen is built from this.
    registerGroup(def) {
      if (!def || !def.id) throw new Error('a league group needs an id');
      if (!groupDefs[def.id]) groupOrder.push(def.id);
      groupDefs[def.id] = def;
      return def;
    },
    getGroup(id) { return groupDefs[id] || null; },
    // every group that has at least one ready division, with those divisions
    groups() {
      return groupOrder
        .map((id) => Object.assign({}, groupDefs[id], { divisions: this.group(id).filter((d) => d.ready !== false) }))
        .filter((g) => g.divisions.length);
    },

    register(def) {
      if (!def || !def.id) throw new Error('a league needs an id');
      if (!defs[def.id]) order.push(def.id);
      defs[def.id] = def;
      return def;
    },
    get(id) { return defs[id] || null; },
    has(id) { return !!defs[id]; },
    all() { return order.map((k) => defs[k]); },
    ready() { return this.all().filter((d) => d.ready !== false); },
    // every league of one family, in registration order (fs -> u14 -> u19)
    group(name) { return this.all().filter((d) => d.group === name); },
    // id of the league to open with when nothing is remembered
    first() { const r = this.ready(); return r.length ? r[0].id : (order[0] || null); },
    // the division of `groupId` that matches the age bracket of `likeId`
    sameCode(groupId, likeId) {
      const like = this.get(likeId);
      const list = this.group(groupId).filter((d) => d.ready !== false);
      if (!list.length) return null;
      const hit = like && list.filter((d) => d.code === like.code)[0];
      return (hit || list[0]).id;
    },
    // build the rule-set: the league's own rules, with the caller's on top
    create(id, world, overrides) {
      const d = this.get(id);
      if (!d) throw new Error('unknown league: ' + id);
      return d.create(world, { rules: Object.assign({}, d.rules, overrides) }, d);
    },
    // merge a league's own match defaults under the caller's overrides
    settings(id, cfg) {
      const d = this.get(id);
      return Object.assign({}, d ? d.defaults : null, cfg || null);
    },
  };

  root.Leagues = Leagues;
  if (typeof module !== 'undefined' && module.exports) module.exports = Leagues;
})(typeof self !== 'undefined' ? self : this);
