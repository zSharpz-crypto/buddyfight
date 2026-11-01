/* ==================== ABX — round 42: Legend Dragon tribe review fixes ====================
 * Per-card overrides found by tests/legend_dragon.js (same OV mechanism as r38/r40). Loaded after abilities_r41.js.
 * Wave 1: #6138 independent Fire/Water/Thunder conditions, #5527 attack trigger, #5418/#5737 gated [Triple Attack].
 * Wave 2: "for each card in your buddy zone" counts (#5544 #5516 #5742 #5524 #5543 #5718 #5720), #5516 buddy monsters,
 *         #5538 Sector Collapse (turn-long attack trigger), #5757 dropped-from-hand trigger, #6140 whole drop zone to deck,
 *         #5422 Dragod+Legend Dragon filter, #5419 "Dragod and King", #5515/#5534 Dragod AND King, #5421 left+right Dragod,
 *         #5429 size reduction on left/right, "different Dragod" counts (#5532 #5748 #5759).
 */
(function (root) {
  "use strict";
  const ABX = root.ABX;
  if (!ABX || !ABX.core) return;
  const core = ABX.core, OPS = ABX.OPS, F = core.F, otherSide = core.otherSide;
  const lc = (s) => String(s || "").toLowerCase();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const np = (filter, area, pos, owner) => {
    const zone = { owner: owner || "you", area: area || "field" }; if (pos) zone.pos = pos;
    return { qty: { n: 1, upTo: false, all: false, any: false, each: false }, ref: null, self: false, filter, zone, excludeSelf: false, topN: null, soulOf: null };
  };
  const has = (filter, area, pos) => ({ t: "has", owner: "you", np: np(filter, area, pos), n: 1, other: false });
  const walk = (o, fn) => { if (Array.isArray(o)) o.forEach(x => walk(x, fn)); else if (o && typeof o === "object") { fn(o); Object.values(o).forEach(v => walk(v, fn)); } };
  const DRAGOD_BUDDIES = np({ tribes: ["Dragod"] }, "buddy zone");
  const ANY_BUDDY_CARD = np({}, "buddy zone");

  const buddyCallRow = (name) => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [{ t: "enterByBuddyCall" }], steps: [{ op: "r42BuddyCall", name }] });

  let _exactNames = null;
  const exactNameSet = () => _exactNames || (_exactNames = new Set((typeof ALL_CARDS !== "undefined" ? ALL_CARDS : (root.ALL_CARDS || [])).map(c => String(c.name || "").toLowerCase())));
  const OVER_SELF_PAY = new Set([6512, 4115]);   // their ops already pay the printed cost
  const OV42 = [
    /* ---- catalog check: #2920 Vermolt only triggers when it enters the CENTER ---- */
    [2920, /when this card enters your center/i, (ab) => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [{ t: "selfPos", pos: "center" }], steps: clone(ab.steps || []) })],
    /* ---- Dimension Dragon review ---- */
    // #4633 Zorune: the looked cards go back on top (any order) and ONLY then, if a DD was dropped, a card is drawn
    [4633, /look at the top three cards of your deck/i, (ab) => {
      const st = clone(ab.steps || []);
      const dis = st.find(x => x.op === "discard"), mv = st.find(x => x.op === "move"), dr = st.find(x => x.op === "draw");
      if (!dis || !mv || !dr) return null;
      st[st.indexOf(mv)] = { op: "r42LookBack", gate: "ifYouDo", src: mv.src };
      dr.gate = "ifYouDo";
      return { kind: "act", steps: st, once: "turn" };
    }],
    // #6394 Gazley: "you may pay 1 gauge, and [Rest] this card. If you do" - both costs, so an unpaid gauge skips the rest
    [6394, /choose up to two/i, (ab) => {
      const st = clone(ab.steps || []), rs = st.find(x => x.op === "restSelf");
      if (!rs) return null;
      rs.gate = "ifYouDo";
      return { kind: "act", steps: st };
    }],
    // #6563 Buddy Sky Day: attack-phase start, in the soul of your buddy: destroy up to one opposing card; Lost World -> put it into the drop zone instead (one choice, not two steps)
    [6563, /at the start of each player's attack phase/i, (ab) => {
      const st = clone(ab.steps || []);
      const de = st.find(x => x.op === "destroy"), mv = st.find(x => x.op === "move");
      if (!de || !mv) return null;
      delete de.cond; delete de.gate; delete mv.instead;
      mv.np = clone(de.np);
      return { kind: "triggered", trigger: ab.trigger, conds: [{ t: "xInSoulOfBuddy" }], steps: [{ op: "r42RanmaResolve", destroy: de, move: mv }] };
    }],
    // #5706 Ranma: the drop-instead-of-destroy and the destroy are one "if you do" result (a failed cond of one must not cancel the other)
    [5706, /choose a card on your opponent's field/i, (ab) => {
      const st = clone(ab.steps || []);
      const ch = st.find(x => x.op === "choose"), di = st.find(x => x.op === "discard"), de = st.find(x => x.op === "destroy"), mv = st.find(x => x.op === "move");
      if (!ch || !di || !de || !mv) return null;
      delete de.cond; delete de.gate; delete mv.cond; delete mv.instead;
      return { kind: "act", steps: [ch, di, { op: "r42RanmaResolve", gate: "ifYouDo", destroy: de, move: mv }] };
    }],
    // #4667 Odio: the 2 life is part of the "if you do" cost; the chosen card is shuffled out of the way, then put on top of the deck
    [4667, /put another/i, (ab) => {
      const st = clone(ab.steps || []);
      const mv = st[0], pay = st.find(x => x.op === "pay"), ch = st.find(x => x.op === "choose");
      if (!mv || !pay || !ch || mv.op !== "move") return null;
      pay.gate = "ifYouDo"; ch.gate = "ifYouDo";
      return { kind: "act", steps: [mv, pay, ch, { op: "r42OdioFetch", gate: "ifYouDo" }] };
    }],
    // #5118 D. Aura Burst, option 2: a turn-long "cannot be destroyed" on the left/right DD monsters (the parsed static was a no-op inside a spell)
    [5118, /choose and use one of the following two/i, (ab) => {
      const opts = clone(ab.options || []);
      const o2 = opts[1];
      if (!o2 || !o2.steps || !o2.steps[0] || o2.steps[0].op !== "static") return null;
      const old = o2.steps[0];
      o2.steps = [{ op: "restrict", kinds: ["destroyed"], src: old.src, np: Object.assign(np({ tribes: ["Dimension Dragon"], types: ["monster"] }, "field", ["left", "right"]), { qty: { n: 99, upTo: false, all: true, any: false, each: false } }) }];
      return { kind: "modal", steps: ab.steps, options: opts };
    }],
    // #4626 Ire: "put the rest on the top or bottom of your deck" - the r26 rewrite made it bottom only; the player chooses (auto / bots: bottom)
    [4626, /put the rest on the (?:top or )?bottom of your deck/i, (ab) => {
      const st = clone(ab.steps || []), lp = st.find(x => x.op === "lookPick");
      if (!lp) return null;
      lp.rest.topOrBottom = true;
      return { kind: ab.kind, steps: st, trigger: ab.trigger, conds: ab.conds };
    }],
    // #6458 Deily: "If your flag is Lost World, choose and use three times instead" = repeat the modal choice, not a leftover step
    [6458, /choose and use one of the following three/i, () => ({ kind: "modal", steps: [], once: "turn", repeatLW: 3 })],

    // #6010 Teylor Luna: "destroy up to one card ... If your flag is Endruler, put up to one card on the bottom of the deck instead"
    [6010, /endruler dragon.{0,40}put up to one card/i, (ab, card) => {
      const d = (ab.steps || []).find(x => x.op === "destroy");
      const pb = ABX.parseAbilityLine("When this card attacks, put up to one card from your opponent's field on the bottom of your opponent's deck", card);
      const mv = pb && (pb.steps || []).find(x => x.op === "move");
      if (!d || !mv) return null;
      const endr = { t: "flagIs", names: ["perfected deity of eon, the endruler dragon"] };
      const rev = d.cond || { t: "reversal", n: 1, cmp: "ge" };
      d.cond = { t: "and", list: [rev, { t: "not", c: endr }] };
      mv.cond = { t: "and", list: [rev, endr] };
      return { kind: ab.kind, steps: [d, mv], trigger: ab.trigger, conds: ab.conds };
    }],

    /* ---- wave 1 ---- */
    [6138, /if a «?fire»? is on your field/i, () => ({
      kind: "spell", once: "turn", steps: [
        { op: "damage", who: "opp", n: 2, cond: has({ tribes: ["Fire"] }) },
        { op: "life", who: "you", n: 2, cond: has({ tribes: ["Water"] }) },
        { op: "draw", who: "you", n: 2, cond: has({ tribes: ["Thunder"] }) }
      ]
    })],
    [5527, /if this card is in the center, when a «?legend dragon»? monster/i, () => ({
      kind: "triggered",
      trigger: { event: "otherAttack", np: np({ tribes: ["Legend Dragon"], types: ["monster"] }) },
      conds: [{ t: "selfPos", pos: "center" }],
      steps: [{ op: "damage", who: "opp", n: 1 }]
    })],
    [5418, /at the start of your attack phase/i, (ab) => ({
      kind: "triggered", trigger: ab.trigger || { event: "phaseStart", who: "you", phase: "attack" }, conds: [],
      steps: [Object.assign({}, (ab.steps || []).find(s => s.op === "boost"), { cond: has({ exactNames: ["ice deity, freeza horus"] }) })]
    })],
    [5737, /when this card attacks, if you buddy called/i, () => ({
      kind: "triggered", trigger: { event: "attack", self: true }, once: "turn", conds: [{ t: "buddyCalledEver" }],
      steps: [{ op: "boost", np: { self: true, selfTail: "" }, mods: { power: 0, defense: 0, critical: 0, kws: ["triple attack"] } }]
    })],

    /* ---- wave 3: Double / Triple Buddy chains (Thunder -> Ice -> Flame, Legendary set, One Wing set) ---- */
    [5717, /you may buddy call/i, () => buddyCallRow("Ice Deity, Freeza Horus")],
    [5419, /you may buddy call/i, () => buddyCallRow("Flame Deity, Magma Horus")],
    [5418, /by the effect of/i, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [{ t: "calledByCard", id: 5419 }],
      steps: [{ op: "destroy", np: Object.assign(np({}, "field", null, "opp"), { qty: { n: 2, upTo: true, all: false, any: false, each: false } }) }, { op: "draw", who: "you", n: 2 }] })],
    [5717, /cannot \[?stand\]?/i, () => ({ kind: "static", steps: [{ op: "restrict", np: np({}, "field", null, "opp"), kinds: ["stand"], byEffect: true }] })],
    [5717, /cannot be destroyed/i, (ab) => { const st = clone(ab.steps); const pr = st.find(x => x.kind === "protect"); if (pr) pr.np.filter = { exactNames: ["flame deity, magma horus", "ice deity, freeza horus"] }; return { kind: "static", steps: st }; }],
    [5749, /you may buddy call/i, () => buddyCallRow("Legendary Ice Deity, Freeza Horus")],
    [5517, /you may buddy call/i, () => buddyCallRow("Legendary Flame Deity, Magma Horus")],
    [5523, /by the effect of/i, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [{ t: "calledByCard", id: 5517 }], steps: [{ op: "r42DestroyAllDamage", scope: "monsters" }] })],
    [5511, /you may buddy call/i, () => buddyCallRow("One Wing of the King, Magma Horus")],
    [5513, /by the effect of/i, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [{ t: "calledByCard", id: 5511 }], steps: [{ op: "r42DestroyAllDamage", scope: "spellsItems" }] })],

    /* ---- wave 2: buddy zone counts ---- */
    [5544, /for each card in your buddy zone/i, (ab) => { const st = clone(ab.steps); st[0].each = clone(ANY_BUDDY_CARD); return { kind: "static", steps: st }; }],
    [5516, /size reduced by 1 for each «?dragod»? in your buddy zone/i, (ab) => { const st = clone(ab.steps); st[0].each = clone(DRAGOD_BUDDIES); return { kind: "static", steps: st }; }],
    [5742, /size reduced by 1 for each «?dragod»? in your buddy zone/i, (ab) => { const st = clone(ab.steps); st[0].each = clone(DRAGOD_BUDDIES); return { kind: "static", steps: st }; }],
    [5516, /this card and all of your buddy monsters/i, (ab) => {
      const self = clone(ab.steps[0]); const buddies = clone(ab.steps[0]);
      buddies.np = np({ buddy: true, types: ["monster"] }); buddies.np.excludeSelf = true;
      return { kind: "static", steps: [self, buddies] };
    }],
    [5524, /gain 1 life for each card in your buddy zone/i, (ab) => { const st = clone(ab.steps); const l = st.find(s => s.op === "life"); if (l) l.n = { each: clone(ANY_BUDDY_CARD), per: 1 }; return { kind: "spell", steps: st }; }],
    [5543, /reduce the size of this card on the field by 1 for each card on your left or right/i, (ab) => { const st = clone(ab.steps); st[0].each = np({}, "field", ["left", "right"]); return { kind: "static", steps: st }; }],
    [5543, /choose monsters on your opponent's field up to the number of cards in your buddy zone/i, (ab) => {
      const st = clone(ab.steps); const ch = st.find(s => s.op === "choose");
      ch.np = np({ types: ["monster"] }, "field", null, "opp"); ch.qtyEach = clone(ANY_BUDDY_CARD);
      return { kind: ab.kind, steps: st };
    }],
    [5429, /size reduced by 1 for each monster on your left and right/i, (ab) => { const st = clone(ab.steps); st[0].each = np({ types: ["monster"] }, "field", ["left", "right"]); return { kind: "static", steps: st }; }],
    [5718, /choose and use one of the following two/i, (ab) => ({ kind: "modal", steps: ab.steps, options: clone(ab.options).map(o => { const ch = o.steps[0]; ch.np = np({ types: ["monster"] }, "field", null, "opp"); ch.qtyEach = clone(DRAGOD_BUDDIES); return o; }) })],
    [5720, /choose and use one of the following two/i, (ab) => ({ kind: "modal", steps: ab.steps, options: clone(ab.options).map((o, i) => { const ch = o.steps[0]; ch.np = np({}, "field", null, i === 0 ? "you" : "opp"); ch.qtyEach = clone(DRAGOD_BUDDIES); return o; }) })],

    /* ---- wave 2: single-card fixes ---- */
    [5538, /for this turn, the critical of all/i, (ab) => ({ kind: "spell", steps: [clone(ab.steps[0]), { op: "r42SectorCollapse" }] })],
    /* ---- #5767 / #6066 Gargantua Slash Wyvern: the [G.BOOST-Will-] "for this turn ..." clause is checked when it resolves, then pays out later ---- */
    [5767, /at the end of the battles/i, (ab) => ({ kind: "triggered", steps: [clone(ab.steps[0]), clone(ab.steps[1]), { op: "r42WyvernWill", when: "battleEnd", life: 1, dmg: 1 }] })],
    [6066, /when a monster on your field attacks/i, (ab) => ({ kind: "triggered", steps: [clone(ab.steps[0]), clone(ab.steps[1]), { op: "r42WyvernWill", when: "attack", life: 2, dmg: 0, monsterOnly: true }] })],
    [5757, /put into the drop zone from your hand or the field/i, () => ({
      kind: "triggered", trigger: { event: "leave", self: true }, conds: [has({ tribes: ["Legend Dragon"] })],
      steps: [{ op: "destroy", np: np({ types: ["spell", "item"] }, "field", null, "opp") }]
    })],
    [6140, /put a «?legend dragon»? from your drop zone into your hand/i, () => ({
      kind: "spell", once: "game", steps: [
        { op: "move", np: np({ tribes: ["Legend Dragon"], types: ["monster"] }, "drop zone"), to: { area: "hand", owner: "you", end: "top" } },
        { op: "move", np: Object.assign(np({}, "drop zone"), { qty: { n: 99, upTo: false, all: true, any: false, each: false } }), to: { area: "deck", owner: "you", end: "top" } },
        { op: "shuffle", who: "you" }
      ]
    })],
    [5422, /put up to two monsters with both/i, () => null],   // handled below (filter patch on the existing step)
    /* #941 Dragon Throne: your items on the field cannot be returned to hand nor destroyed (field size 4 is handled by the maxSize accessor in game.js) */
    [941, /items on your field cannot be returned to hand/i, () => ({ kind: "static", steps: [{ op: "static", kind: "protect", kinds: ["destroyed", "returned to hand"], self: true, np: np({ types: ["item"] }, "field") }] })],
    [5419, /all dragod and king on your field cannot be destroyed/i, (ab) => { const st = clone(ab.steps); st[0].np.filter = { tribes: ["Dragod", "King"] }; return { kind: "static", steps: st }; }],
    [5515, /you may only cast this card if your opponent's life is 4 or less/i, () => ({ kind: "rule", action: "cast", steps: [], conds: [{ t: "and", list: [{ t: "life", who: "opp", n: 4, cmp: "le" }, has({ tribes: ["Dragod"] }), has({ tribes: ["King"] })] }] })],
    [5534, /you may only cast this card if a «?dragod»? and «?king»? are on your field/i, () => ({ kind: "rule", action: "cast", steps: [], conds: [{ t: "and", list: [has({ tribes: ["Dragod"] }), has({ tribes: ["King"] })] }] })],
    [5421, /counter\]?\s*nullify the attack/i, () => ({
      kind: "spell", steps: [
        { op: "nullifyAttack" },
        { op: "discard", n: 1, cost: true, optional: true, cond: { t: "and", list: [has({ tribes: ["Dragod"] }, "field", ["left"]), has({ tribes: ["Dragod"] }, "field", ["right"])] } },
        { op: "moveSelf", to: { area: "hand", owner: "you", end: "top" }, gate: "ifYouDo" }
      ]
    })],
    /* "different" Dragod counts */
    [5748, /two or more «?dragod»? with different card names/i, () => null],
    [5759, /two or more different «?dragod»?/i, () => null],
    [5532, /choose and use one of the following two/i, (ab) => ({ kind: "modal", steps: ab.steps, options: clone(ab.options).map(o => { walk(o.steps, x => { if (x.t === "count" && x.np && x.np.filter && x.np.filter.tribes) x.np.filter.distinct = true; }); return o; }) })]
  ];

  /* ---- ops ---- */
  const B = typeof battle !== "undefined" ? battle : root.battle;
  const fresh = () => { try { B.renderBattle && B.renderBattle(); } catch (e) { /* ignore */ } };
  // "you may buddy call <exact card name> from your hand without paying its [Call Cost]": a REAL buddy call (buddy gift +1 life, buddy zone entry rested)
  // and the called unit remembers which card called it (for "enters the field by the effect of <card>").
  OPS.r42BuddyCall = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side, want = lc(s.name);
      const hi0 = f.hand.findIndex(id => {
        const c = core.cardOf(id);
        return c && lc(c.name) === want && c.type === "Monster" && !(typeof canFighterBuddyCallCard === "function" && !canFighterBuddyCallCard(f, id));
      });
      if (hi0 < 0) return false;
      const card = core.cardOf(f.hand[hi0]);
      // Which zones can it legally go to? The TOTAL size on the field may not exceed the limit once it lands (a monster it replaces goes to the drop zone first).
      const max = f.maxSize || 3, sizeOf = (c, u) => (typeof getEffectiveCardSize === "function" ? getEffectiveCardSize(f, c, u) : (c.size || 0));
      const used = B.getCurrentSizeUsed(f), sz = sizeOf(card);
      const zones = [];
      ["left", "center", "right"].forEach(p => {
        const m = f.monsters[p];
        if (m && m.oppressedBy && m.oppressedBy !== side) return;   // an Oppressed Area controlled by the opponent
        if (used - (m ? sizeOf(m.card, m) : 0) + sz > max) return;
        zones.push({ pos: p, replaces: m || null });
      });
      if (f.monsters.center && !f.monsters.center2 && typeof canPlaceSecondCenter === "function" && canPlaceSecondCenter(f, card) && used + sz <= max) zones.push({ pos: "center2", replaces: null });
      if (!zones.length) return false;
      let pick;
      const auto = ctx.auto || f.isBot || ABX.autoPlay === true || ABX.remoteAutoSide === side;
      if (auto) {
        pick = ["left", "right", "center", "center2"].map(p => zones.find(z => z.pos === p && !z.replaces)).find(Boolean);   // never overwrites one of its own monsters on its own
        if (!pick) return false;
      } else {
        const label = (z) => (z.pos === "center2" ? "Second center" : z.pos[0].toUpperCase() + z.pos.slice(1)) + (z.replaces ? ` — replaces ${z.replaces.card.name} (it goes to the drop zone)` : " — open");
        const i = await ABX.ui.pickOption({ title: `${ctx.card.name} — buddy call`, subtitle: `You may buddy call "${card.name}" from your hand without paying its [Call Cost]. Choose a zone, or don't call.`, options: zones.map(z => ({ label: label(z) })).concat([{ label: "Don't call" }]) });
        if (!(i >= 0 && i < zones.length)) return false;
        pick = zones[i];
      }
      f.abxPendingCallBy = { by: ctx.card.id, target: card.id };
      B.completeMonsterCall(side, pick.pos, f.hand.indexOf(card.id), true, true);
      const u = f.monsters[pick.pos];
      if (!u || u.card.id !== card.id) { delete f.abxPendingCallBy; return false; }
      ctx.calledPos = pick.pos;
      fresh();
      return true;
    },
    check: () => true
  };
  // "destroy all monsters (or all spells and items) on your opponent's field, and deal 1 damage to your opponent for each card destroyed"
  OPS.r42DestroyAllDamage = {
    async run(s, ctx) {
      const flt = s.scope === "monsters" ? { types: ["monster"] } : { types: ["spell", "item"] };
      const step = { op: "destroy", np: Object.assign(np(flt, "field", null, "opp"), { qty: { n: 99, upTo: false, all: true, any: false, each: false } }) };
      await OPS.destroy.run(step, ctx);
      const n = ctx.lastCount || 0;
      if (n > 0) core.applyDamage(otherSide(ctx.side), n, { kind: "effect" });
      fresh();
      return n > 0;
    },
    check: () => true
  };
  // Static "cards cannot [Stand] by card effects" (#5717 Thunder Deity): any card effect that would [Stand] a locked card leaves it rested.
  function standLocked(unit, unitSide) {
    for (const srcSide of ["plr", "opp"]) {
      const sf = F(srcSide);
      for (const src of core.fieldUnits(sf, true)) {
        if (!src.unit || !src.unit.card || src.unit.abxNullified === B.turnCount) continue;
        for (const ab of (ABX.get(src.unit.card).abilities || [])) {
          if (ab.kind !== "static") continue;
          for (const st of (ab.steps || [])) {
            if (st.op !== "restrict" || !(st.kinds || []).includes("stand") || !st.np || !st.np.zone || !st.np.zone.owner) continue;
            if ((st.np.zone.owner === "opp" ? otherSide(srcSide) : srcSide) !== unitSide) continue;
            if (st.cond && !core.evalCond(st.cond, { side: srcSide, f: sf, e: F(otherSide(srcSide)), unit: src.unit, card: src.unit.card, bind: { chosen: [], revealed: [], looked: [] }, hostArea: "field" })) continue;
            if (core.matchFilter(unit.card, st.np.filter || {}, { unit, side: unitSide }, { f: F(unitSide) })) return true;
          }
        }
      }
    }
    return false;
  }
  core.standLocked = standLocked;
  // the unit that lands from r42BuddyCall remembers its caller before its [enter] abilities fire
  if (B && typeof B.afterMonsterCallLanded === "function") {
    const prevLanded = B.afterMonsterCallLanded;
    B.afterMonsterCallLanded = function (side, c, unit) {
      try {
        const f = this.getFighter(side), p = f && f.abxPendingCallBy;
        if (p && unit && c && p.target === c.id) { unit.abxCalledBy = p.by; delete f.abxPendingCallBy; }
      } catch (e) { /* ignore */ }
      return prevLanded.apply(this, arguments);
    };
  }


  // Zorune: the looked-at cards go back on top of the deck (any order = the order they were in), BEFORE the following draw
  OPS.r42LookBack = { run(s, ctx) { const l = (ctx.bind.looked || []).filter(x => x && x.pending); for (let i = l.length - 1; i >= 0; i--) { F(l[i].side).deck.unshift(l[i].id); l[i].pending = false; } return true; }, check: () => true };

  // #3923 Ultimate Great Spell, World Pandemic!: "Flip your opponent's flag face down. (cards written on that flag cannot be used, and all cards on that field are put into the drop zone)"
  OV42.push([3923, /flip your opponent's flag face down/i, () => ({ kind: "spell", steps: [{ op: "r42FlagFaceDown" }] })]);
  OPS.r42FlagFaceDown = {
    run(s, ctx) {
      const e = ctx.e;
      // "your flags cannot be flipped face down by your opponent's card effects": Godclock #5957 (and its Endruler flag) and Overgod "0" #6202
      if (!e || e.flagFaceDown || Number(e.flagId) === 5957 || (e.godclock && (e.godclock.awakened || e.godclock.overgodActive)) || (e.item && e.item.isEndrulerFlag)) { ABX.say && ABX.say(`🛡️ ${e && e.name || "The opponent"}'s flag cannot be flipped face down!`); return false; }
      e.flagFaceDown = true;
      ["left", "center", "center2", "right"].forEach(p => { const u = e.monsters[p]; if (u) { e.drop.push(u.card.id, ...(u.soul || [])); e.monsters[p] = null; } });
      if (e.item) { e.drop.push(e.item.card.id, ...(e.item.soul || [])); e.item = null; }
      ABX.say && ABX.say(`🂠 ${e.name || "The opponent"}'s flag is flipped face down! Their field goes to the drop zone.`);
      fresh(); return true;
    },
    check: () => true
  };

  // Ranma: Lost World -> put the chosen card into the drop zone instead of destroying it
  OPS.r42RanmaResolve = { run(s, ctx) { return core.evalCond({ t: "flagIs", names: ["lost world"] }, ctx) ? OPS.move.run(s.move, ctx) : OPS.destroy.run(s.destroy, ctx); }, check: () => true };
  // Odio: the chosen deck card goes into the drop zone, the deck is shuffled, then that card is put on top of the deck
  OPS.r42OdioFetch = {
    async run(s, ctx) {
      const r = (ctx.bind.chosen || []).find(x => x && x.id != null && x.area === "deck");
      if (!r) return false;
      const f = F(r.side || ctx.side), i = f.deck.indexOf(r.id);
      if (i < 0) return false;
      f.deck.splice(i, 1);
      f.drop.push(r.id);
      await OPS.shuffle.run({ op: "shuffle", who: "you" }, ctx);
      const j = f.drop.lastIndexOf(r.id);
      if (j >= 0) f.drop.splice(j, 1);
      f.deck.unshift(r.id);
      return true;
    }, check: () => true
  };

  // #4669 D. Scapegoat: "[Cast Cost] Destroy any number of «Dimension Dragon» monsters on your field" (0 is allowed);
  // "You gain 1 life and draw a card for each card destroyed by this card's [Cast Cost]"
  const isScapegoat = (card) => !!card && card.id === 4669;
  const ddOnField = (side) => core.fieldUnits(F(side), false).filter(x => x.unit && x.unit.card && core.matchFilter(x.unit.card, { tribes: ["Dimension Dragon"], types: ["monster"] }, { unit: x.unit, side }, { f: F(side) }));
  [["hasExtras", () => true], ["canPayExtras", () => true]].forEach(([n, fn]) => { const p = ABX[n]; ABX[n] = function (side, card) { return isScapegoat(card) ? fn() : p.apply(this, arguments); }; });
  const prevPay42 = ABX.payExtras;
  ABX.payExtras = function (side, card) { return isScapegoat(card) ? undefined : prevPay42.apply(this, arguments); };   // the cost is paid when the spell resolves (r42ScapegoatGain)
  OPS.r42ScapegoatGain = {
    async run(s, ctx) {
      const side = ctx.side, f = ctx.f, cands = ddOnField(side);
      if (!cands.length || f.isBot) return false;
      let picks = cands;
      if (!ABX.autoPlay) {
        const idxs = await ABX.ui.pickCards({ title: `${ctx.card.name} — destroy any number of «Dimension Dragon» monsters (cost)`, subtitle: "Pick 0 or more.", cards: cands.map(x => ({ card: x.unit.card, badge: "" })), min: 0, max: cands.length });
        picks = (idxs || []).map(i => cands[i]).filter(Boolean);
      }
      let n = 0;
      for (const x of picks) { if (f.monsters[x.pos] === x.unit && B.destroyMonster(side, x.pos) !== false) n++; }
      if (!n) return false;
      await OPS.life.run({ op: "life", who: "you", n }, ctx);
      await OPS.draw.run({ op: "draw", who: "you", n }, ctx);
      return true;
    }, check: () => true
  };
  OV42.push([4669, /you gain 1 life and draw a card/i, () => ({ kind: "spell", steps: [{ op: "r42ScapegoatGain" }], once: "turn" })]);

  // #6526 Azi Dahaka "Re:B" (Dragon Ein): when destroyed it goes into the soul of up to one spell on your field (prefers "Dragon Throne" #941),
  // then equips #2020 Aqulta Gwaneff from hand/deck (same equip logic as #867).
  OPS.r42AziRebDestroy = {
    async run(s, ctx) {
      const f = ctx.f, sid = ctx.card && ctx.card.id;
      const hosts = f.setSpells || [];
      const host = hosts.find(c => c.id === 941) || hosts[0];
      const di = f.drop.lastIndexOf(sid);
      if (host && di >= 0) { f.drop.splice(di, 1); (host.soul = host.soul || []).push(sid); }
      if (OPS.r40AziDahakaDestroy867) await OPS.r40AziDahakaDestroy867.run(s, ctx);
      fresh();
      return true;
    }, check: () => true
  };
  // #99 Champion Wrestler Asmodai: "you may discard as many cards as you like from your hand. If you do, destroy cards on your opponent's field equal to the number discarded."
  // The parse kept only the discard; the "if you do, destroy" half was lost.
  OV42.push([99, /discard as many cards as you like from your hand/i, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [], steps: [
    { op: "r40StructuredExec", text: "you may discard as many cards as you like from your hand." },
    { op: "destroy", gate: "ifYouDo", np: Object.assign(np({ types: [] }, "field", null, "opp"), { qty: { n: 1, upTo: true, all: false, any: false, each: false, fromLast: true } }) }
  ] })]);
  // #6141 Omega "Preverse": when your flag [Reversal], look at top 3; one -> gauge, one -> hand; drop the rest or put them into a field monster's soul. Once per turn.
  OPS.r42Preverse = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side;
      const top = f.deck.splice(0, 3);   // top of deck = index 0
      if (!top.length) return false;
      const nm = id => (B.getCardById ? (B.getCardById(id) || {}).name : "") || ("#" + id);
      const pick = async (title, ids) => {
        if (!ids.length) return -1;
        if (ABX.autoPlay || f.isBot || ids.length === 1) return 0;
        const i = await ABX.ui.pickCards({ title, subtitle: "Choose 1.", cards: ids.map(id => ({ card: { id, name: nm(id) }, badge: "" })), min: 1, max: 1 });
        return (i && i.length) ? i[0] : 0;
      };
      let rest = top.slice();
      let i = await pick(`${ctx.card.name} — put one into your gauge`, rest);
      if (i >= 0) { (f.gauge = f.gauge || []).push(rest.splice(i, 1)[0]); }
      i = await pick(`${ctx.card.name} — put one into your hand`, rest);
      if (i >= 0) { f.hand.push(rest.splice(i, 1)[0]); }
      const hosts = Object.values(f.monsters || {}).filter(Boolean);
      if (rest.length && hosts.length && !ABX.autoPlay && !f.isBot) {
        const j = await ABX.ui.pickOption({ title: `${ctx.card.name} — the rest`, subtitle: "Drop them, or put them into the soul of a monster on your field.", options: ["Drop", "Put into soul"] });
        if (j === 1) { const h = hosts[0]; for (const id of rest) (h.soul = h.soul || []).push(id); rest = []; }
      }
      for (const id of rest) f.drop.push(id);
      fresh();
      return true;
    }, check: () => true
  };
  OV42.push([6141, /look at the top three cards/i, () => ({ kind: "triggered", trigger: { event: "flagReversal" }, once: "turn", conds: [], steps: [{ op: "r42Preverse" }] })]);
  OV42.push([6526, /when this card is destroyed, put this card into the soul/i, () => ({ kind: "triggered", trigger: { event: "leave", self: true, destroyedOnly: true }, conds: [], steps: [{ op: "r42AziRebDestroy" }] })]);
  // #3902 Shining Dragoner, Jackknife [Overturn]: "[Put a soul from this card into the drop zone if your opponent would use a card other than from effects during their turn]
  // Nullify the card your opponent used!!" - was a dead static. Now a response-window ability (same window as other "when your opponent casts" nullifiers).
  OV42.push([3902, /\[overturn\]/i, () => ({ kind: "triggered", tags: ["kw:overturn"], trigger: { event: "oppCast" }, once: "game", conds: [], steps: [
    { op: "r42SoulToDrop", cost: true, cond: { t: "selfSoul", n: 1, cmp: "ge" } }, { op: "nullifyCast", what: "any" }] })]);
  OPS.r42SoulToDrop = {
    run(s, ctx) {
      const u = ctx.unit; if (!u || !(u.soul || []).length) return false;
      const sid = u.soul.pop();
      ctx.f.drop.push(typeof root.getSoulCardId === "function" ? root.getSoulCardId(sid) : sid);
      ctx.f.overturnUsed = true;
      return true;
    },
    check: () => true
  };
  // #5161 Thunder Sky's Holy Knight, El Quixote [Overturn]: "[During your turn, drop a Knight from your hand] Equip up to two Knight items from your deck without paying their
  // [Equip Cost], and shuffle your deck!!" - was a dead static.
  OV42.push([5161, /\[overturn\]/i, () => ({ kind: "act", tags: ["kw:overturn"], trigger: null, once: "game", conds: [{ t: "turn", who: "you" }], steps: [{ op: "r42ElQuixote" }] })]);
  OPS.r42ElQuixote = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side;
      const isKnight = (c) => !!c && (c.attrs || []).some(a => /^knight$/i.test(a));
      const hand = f.hand.map((id, i) => ({ k: "zone", side, area: "hand", idx: i, id, card: core.cardOf(id) })).filter(x => isKnight(x.card));
      if (!hand.length) return false;
      const ch = await core.pick(hand, { qty: { n: 1 }, raw: "a Knight from your hand", filter: {} }, ctx, { intent: "help", title: `${ctx.card.name} - drop a Knight from your hand` });
      const r = ch && ch[0]; if (!r) return false;
      const hi = f.hand.indexOf(r.id); if (hi < 0) return false;
      f.drop.push(f.hand.splice(hi, 1)[0]);
      ctx.f.overturnUsed = true;
      const items = f.deck.map((id, i) => ({ k: "zone", side, area: "deck", idx: i, id, card: core.cardOf(id) })).filter(x => x.card && x.card.type === "Item" && isKnight(x.card));
      if (items.length && ABX.equipFrom) {
        const picked = await core.pick(items, { qty: { n: 2, upTo: true }, raw: "up to two Knight items from your deck", filter: {} }, ctx, { intent: "help", title: `${ctx.card.name} - equip up to two Knight items from your deck` });
        f.abxItemCap = 2;
        try { for (const x of (picked || []).slice(0, 2)) ABX.equipFrom(side, "deck", x.id, false); } finally { delete f.abxItemCap; }
      }
      if (B.shuffleFighterDeck) B.shuffleFighterDeck(side);
      fresh();
      return true;
    },
    check: () => true
  };
  /* ---- [Overturn]/[Overkill] timing windows ---- */
  // #3843 Golden Crystal Dragon, Athora: "[Discard a card from your hand when your opponent's cards would attack]" -> only in the defense window (a [Counter]-style act)
  OV42.push([3843, /\[overturn\]/i, (ab) => ({ kind: "act", tags: ["kw:overturn", "counter"], trigger: null, once: "game", conds: [{ t: "underAttack" }], steps: clone(ab.steps || []) })]);
  // #4163 Drum Bunker Dragon: "[Pay 1 gauge when this card would link attack with you]" -> optional trigger when this card link attacks
  OV42.push([4163, /\[overturn\]/i, () => ({ kind: "triggered", tags: ["kw:overturn"], trigger: { event: "link", self: true }, once: "game", conds: [], steps: [
    { op: "pay", gauge: 1, optional: true, cost: true }, { op: "r42DrumBunker", gate: "ifYouDo" }] })]);
  OPS.r42DrumBunker = {
    run(s, ctx) {
      const u = ctx.unit; if (!u) return false;
      u.abxNoCounter = { turn: B.turnCount, mode: "link" };
      u.abxBattleBoost = { power: 99999999, crit: 2 };   // "for this battle": removed again when the battle ends
      u.tempPower = (u.tempPower || 0) + 99999999; u.tempCrit = (u.tempCrit || 0) + 2;
      ctx.f.overturnUsed = true; fresh(); return true;
    },
    check: () => true
  };
  {
    const prevBE = ABX.fireBattleEnd;
    ABX.fireBattleEnd = function (attSide, units) {
      try { (units || []).forEach(x => { const u = x && (x.unit || x); if (u && u.abxBattleBoost) { u.tempPower = (u.tempPower || 0) - u.abxBattleBoost.power; u.tempCrit = (u.tempCrit || 0) - u.abxBattleBoost.crit; u.abxBattleBoost = null; } }); } catch (e) { /* ignore */ }
      return prevBE.apply(this, arguments);
    };
  }
  // #3595 Shuten Demonic Deity, Kid Ibuki: "[Overkill] [Pay 1 gauge when monsters on your field would be destroyed] Choose a monster on your field, and for this turn that card cannot be destroyed"
  // -> same replacement window as the other "would be destroyed" saves (wouldLeaveOther for the other monsters, wouldLeave for itself).
  OV42.push([3595, /\[overkill\]/i, () => ({ kind: "triggered", tags: ["kw:overkill"], trigger: { event: "wouldLeaveOther", np: np({ types: ["monster"] }) }, once: "game", conds: [], steps: [
    { op: "pay", gauge: 1, optional: true, cost: true }, { op: "preventLeave", gate: "ifYouDo" }] })]);
  {
    const prevWLS = ABX.wouldLeaveSave;
    ABX.wouldLeaveSave = function (side, pos, unit, byAttack) {
      if (unit && unit.abxNoDestroyTurn === B.turnCount) return true;       // #3595: "for this turn, that card cannot be destroyed"
      const f = F(side);
      const src = f && core.fieldUnits(f, true).find(x => x.unit && x.unit.card && x.unit.card.id === 3595 && x.unit.abxNullified !== B.turnCount);
      const ab = src && core.abilitiesOf(src.unit.card, a => a.r42 && a.trigger && a.trigger.event === "wouldLeaveOther")[0];
      const before = !!(ab && core.onceUsed(f, src.unit.card, ab, src.unit));
      let r = prevWLS.apply(this, arguments);
      // the monster being destroyed IS the Overkill card: it has no "other monster" to save it, so offer the same save for itself
      if (!r && ab && src.unit === unit && !before && f.gauge.length >= 1) {
        const auto = ABX.autoPlay || f.isBot;
        let yes = auto; if (!auto) { try { yes = typeof root.confirm === "function" ? !!root.confirm(`${unit.card.name}: pay 1 gauge so it cannot be destroyed this turn?`) : true; } catch (e) { yes = true; } }
        if (yes) { f.drop.push(f.gauge.pop()); core.markOnce(f, unit.card, ab, unit); r = true; ABX.say && ABX.say(`🛡️ "${unit.card.name}" cannot be destroyed this turn!`); }
      }
      if (r && ab && !before && core.onceUsed(f, src.unit.card, ab, src.unit)) { unit.abxNoDestroyTurn = B.turnCount; f.overturnUsed = true; }
      return r;
    };
  }
  // #3822 Knight of Overturn, El Quixote: "[Pay 1 gauge when a link attack of this card is nullified] For this turn, link attacks of this card cannot be nullified."
  // -> when a link attack of this card is about to be nullified, offer it; the attack then goes through.
  OV42.push([3822, /\[overturn\]/i, (ab) => ({ kind: "act", tags: ["kw:overturn"], trigger: null, once: "game", conds: [{ t: "phase", phase: "__only_when_link_nullified__" }], steps: clone(ab.steps || []) })]);
  if (typeof B.executeAttackResolution === "function" && !B.__r42Overturn3822) {
    B.__r42Overturn3822 = true;
    const prevEAR = B.executeAttackResolution;
    B.executeAttackResolution = function (attSide, attackerZones, targetPos, attackNullified) {
      try {
        if (attackNullified === true && Array.isArray(attackerZones) && attackerZones.length > 1) {
          const f = F(attSide);
          const hit = attackerZones.map(z => (z === "item" ? f.item : f.monsters[z])).find(u => u && u.card && u.card.id === 3822 && u.abxNullified !== B.turnCount);
          const ab = hit && core.abilitiesOf(hit.card, a => (a.tags || []).includes("kw:overturn") && a.kind === "act")[0];
          if (ab && !core.onceUsed(f, hit.card, ab, hit) && f.gauge.length >= 1) {
            const auto = ABX.autoPlay || f.isBot;
            let yes = auto; if (!auto) { try { yes = typeof root.confirm === "function" ? !!root.confirm(`${hit.card.name}: pay 1 gauge so this link attack cannot be nullified?`) : true; } catch (e) { yes = true; } }
            if (yes) {
              f.drop.push(f.gauge.pop()); core.markOnce(f, hit.card, ab, hit);
              hit.abxUnnull = { turn: B.turnCount, cond: "link" }; f.overturnUsed = true;
              ABX.say && ABX.say(`🛡️ "${hit.card.name}": this link attack cannot be nullified!`);
              attackNullified = false;
            }
          }
        }
      } catch (e) { /* fall through to the normal resolution */ }
      return prevEAR.call(this, attSide, attackerZones, targetPos, attackNullified);
    };
  }
  // #1448 Fourth Omni Fire Lord, Burn Nova: "[Call Cost] [When your life would become 0 during your opponent's turn, pay 3 gauge, your life becomes 1, and for this turn, you cannot be dealt damage]"
  // It is called from the hand at that moment only (like the "on destroyed" call costs), not in the main phase.
  {
    const tciPrev1448 = ABX.timingCallInfo;
    ABX.timingCallInfo = (card) => (card && card.id === 1448) ? { world: "life would become 0", lifeTiming: true, msg: `"${card.name}" can only be called when your life would become 0 during your opponent's turn (it is offered to you then).` } : tciPrev1448(card);
    const lzPrev = ABX.lifeZeroSave;
    ABX.lifeZeroSave = function (side) {
      const r = lzPrev.apply(this, arguments); if (r) return r;
      try {
        const f = F(side), card = core.cardOf(1448);
        if (!f || !card || f.life > 0 || B.matchOver || B.activeSide === side) return false;       // only during your opponent's turn
        const hi = f.hand.indexOf(1448), pos = ["center", "left", "right"].find(p => !f.monsters[p]);
        if (hi < 0 || f.gauge.length < 3 || !pos || (typeof getEffectiveCardSize === "function" && B.getCurrentSizeUsed && B.getCurrentSizeUsed(f) + getEffectiveCardSize(f, card) > (f.maxSize || 3))) return false;
        const auto = ABX.autoPlay || f.isBot;
        let yes = auto; if (!auto) { try { yes = typeof root.confirm === "function" ? !!root.confirm(`${card.name}: your life would become 0. Pay 3 gauge and call it? (your life becomes 1 and you cannot be dealt damage this turn)`) : true; } catch (e) { yes = true; } }
        if (!yes) return false;
        for (let i = 0; i < 3; i++) f.drop.push(f.gauge.pop());
        f.hand.splice(hi, 1);
        const unit = { card, rested: false, attacksLeft: card.atk_max || 1, soul: [], tempPower: 0, tempDef: 0, tempCrit: 0 };
        f.monsters[pos] = unit;
        f.life = 1;
        if (OPS.shield && OPS.shield.run) OPS.shield.run({ op: "shield", mode: "turn", toZero: true }, { side, f, e: F(otherSide(side)), card, unit, bind: { chosen: [] } });
        if (ABX.fireEnter) ABX.fireEnter(side, card, unit);
        fresh();
        return true;
      } catch (e) { if (ABX.debug) console.error(e); return false; }
    };
  }
  // #1541 Darkness Final Mission Card "World End" ([Set] impact): "When your Demon Lord on your field attacks, put the top card of your deck face down into this card's soul."
  // It used to parse as a one-shot on cast; now it is an attack trigger of the set card (fires from the set zone, see ABX.fireAttack otherAttack).
  // #6356 Last Symphony -Epilogue- ([Set] impact): "At the start of each player's turn, if your opponent's life is 4 or more, and three or more different «Dark Burial» are [Set] on your field,
  // your opponent's life becomes 3". The generic parse set the life to 3 on the life check alone; the three-different-Dark-Burial check was lost.
  OPS.r42LastSymphony = {
    run(s, ctx) {
      const f = ctx.f, e = ctx.e || F(otherSide(ctx.side));
      if (e.life < 4) return false;
      const names = new Set((f.setSpells || []).filter(c => c && (c.attrs || []).some(a => lc(a).replace(/\s+/g, "") === "darkburial")).map(c => lc(c.name)));
      if (names.size < 3) return false;
      e.life = 3;
      if (B.renderBattle) B.renderBattle();
      return true;
    }, check: () => true
  };
  OV42.push([6356, /at the start of each player's turn, if your opponent's life is 4 or more/i, (ab) => ({ kind: "triggered", trigger: clone(ab.trigger), conds: [], steps: [{ op: "r42LastSymphony" }] })]);
  // #297 Super Lethal Formation ([Set] impact): "All Ninja on your field gets power+1000 and defense+1000" lasts while it is set; it parsed as a one-shot spell effect (temp boost on cast only).
  // #3619 Abygale [Overturn]: an [Act] (main phase, pay 1 gauge, once per game). At the start of the opponent's NEXT turn it ends
  // at once, and the user's cards cannot attack during their following turn.
  OV42.push([3619, /\[overturn\]|end the turn/i, () => ({ kind: "act", trigger: null, once: "game", conds: [{ t: "phase", phase: "main", who: "you" }], steps: [{ op: "pay", gauge: 1, cost: true }, { op: "r42AbygaleArm" }] })]);
  OPS.r42AbygaleArm = { run(s, ctx) { ctx.f.abxAbygale = 1; ctx.f.overturnUsed = true; return true; }, check: () => true };
  {
    const prevTE = ABX.fireTurnEvent;
    ABX.fireTurnEvent = function (kind) {
      try {
        if (kind === "turnStart" && !B.matchOver) {
          ["plr", "opp"].forEach(side => {
            const f = F(side);
            if (f.abxAbygale === 1 && B.activeSide !== side) {   // the opponent's turn begins: end it
              f.abxAbygale = 2;
              OPS.endPhase.run({ phase: "final" }, { side, f, e: F(side === "plr" ? "opp" : "plr"), bind: {}, log: [] });
            } else if (f.abxAbygale === 2 && B.activeSide === side) { f.abxAbygale = 0; f.abxNoAttackTurn = B.turnCount; }   // the user's next turn
          });
        }
      } catch (e) { /* ignore */ }
      return prevTE.apply(this, arguments);
    };
    const lockedOut = (side) => { const f = F(side); return !!f && f.abxNoAttackTurn === B.turnCount && B.activeSide === side; };
    ABX.attackBanned = lockedOut;
    const prevLock = B.isFirstRoundAttackLocked;
    B.isFirstRoundAttackLocked = function () { return lockedOut(this.activeSide) || prevLock.apply(this, arguments); };
    const prevExec = B.executeAttackResolution;
    B.executeAttackResolution = function (attSide) { if (lockedOut(attSide)) return; return prevExec.apply(this, arguments); };
  }
  // Aqulta Gwaneff counters: #942 only against a single (non-link) attack, #4175 only while being link attacked
  OV42.push([942, /attacks you alone/i, () => ({ kind: "act", tags: ["counter", "act"], counter: true, conds: [{ t: "xLinkAttack", v: false }], steps: [{ op: "nullifyAttack", src: "nullify the attack" }] })]);
  OV42.push([4175, /being link attacked/i, () => ({ kind: "act", tags: ["counter", "act"], counter: true, conds: [{ t: "xLinkAttack", v: true }], steps: [{ op: "discard", n: 1, cost: true, src: "discard a hand card" }, { op: "pay", life: 1, cost: true, src: "pay 1 life" }, { op: "nullifyAttack", src: "nullify the attack", gate: "ifYouDo" }] })]);
  // #1094 Twin Demon Dragon, Zahhak: the quoted names are EXACT names ("... Azi Dahaka \"Re:B\"" is a different card)
  OV42.push([1094, /demonic demise dragon, azi dahaka/i, (ab) => { const steps = clone(ab.steps || []); walk(steps, x => { if (x.filter && x.filter.names) { x.filter.namesExact = x.filter.names; delete x.filter.names; } }); return { kind: "triggered", trigger: clone(ab.trigger), conds: [], steps }; }]);
  // #3824 Overturn Ice Emperor, Miserea: was a dead static. [Overturn] [Pay 2 gauge during your main phase] (the cost is added by the generic Overturn pass)
  OV42.push([3824, /\[overturn\]/i, () => ({ kind: "act", tags: ["kw:overturn"], trigger: null, once: "game", conds: [{ t: "phase", phase: "main", who: "you" }], steps: [{ op: "r42Miserea" }] })]);
  OPS.r42Miserea = {
    run(s, ctx) {
      const self = ctx.unit;
      ["plr", "opp"].forEach(sd => {
        const pf = F(sd);
        // nullify all abilities of cards on the field
        core.fieldUnits(pf, true).forEach(x => { if (x.unit) x.unit.abxNullified = B.turnCount; });
        // return all other cards from hand, gauge, drop zone and field to the deck
        ["left", "center", "right"].forEach(p => { const u = pf.monsters[p]; if (u && u !== self) { pf.deck.push(u.card.id, ...(u.soul || []).map(e => (e && e.id != null) ? e.id : e)); pf.monsters[p] = null; } });
        ["item", "item2"].forEach(k => { const u = pf[k]; if (u && u !== self) { pf.deck.push(u.card.id, ...(u.soul || []).map(e => (e && e.id != null) ? e.id : e)); pf[k] = null; } });
        (pf.setSpells || []).splice(0).forEach(c => pf.deck.push(c.id, ...(c.soul || []).map(e => (e && e.id != null) ? e.id : e)));
        pf.deck.push(...pf.hand.splice(0), ...pf.gauge.splice(0), ...pf.drop.splice(0));
        for (let k = pf.deck.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [pf.deck[k], pf.deck[r]] = [pf.deck[r], pf.deck[k]]; }
        pf.hand.push(...pf.deck.splice(0, 6));
        pf.gauge.push(...pf.deck.splice(0, 2));
      });
      if (B.renderBattle) B.renderBattle();
      return true;
    },
    check: () => true
  };
  OV42.push([297, /all ninja on your field gets power\+1000/i, (ab) => ({ kind: "static", steps: clone(ab.steps || []) })]);
  // #4243 Tempest Thunder Knights Formation! ([Set] impact): "The size of all monsters with 'Thunder Knights' in their card names on your field is reduced by 1" is continuous while set;
  // as a "spell" ability it parsed to a one-shot becomeSizeZero that never applied.
  OV42.push([4243, /the size of all monsters with .thunder knights/i, (ab) => { const st = (ab.steps || []).find(x => x.np); return st ? { kind: "static", steps: [{ op: "static", kind: "sizeModOthers", np: clone(st.np), delta: -1, origSize: null, origLe: true, src: st.src }] } : null; }]);
  // #6414 Finish Effect: MIRRORS SPACE ([Set] impact): "[Counter] [Act] ... call a «Super Warrior» monster from this card's soul by paying its [Call Cost]." The «Super Warrior» monsters are
  // Impact Monsters, which the generic call op (type "Monster" only) never offered; they are called through the impact-monster engine (B.imCallFromZone), paying their gauge / life.
  OPS.r42MirrorsCall = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side, host = ctx.soulHost || ctx.card;
      if (!(root.IMX && B.imCallInfo && B.imCallFromZone) || !host || !Array.isArray(host.soul)) return false;
      const sw = (c) => c && (c.attrs || []).some(a => lc(a).replace(/\s+/g, "") === "superwarrior");
      const cands = [];
      host.soul.forEach((e, si) => {
        const id = typeof root.getSoulCardId === "function" ? root.getSoulCardId(e) : e, c = core.cardOf(id);
        if (!sw(c) || !IMX.isImpactMonster(c)) return;
        const info = B.imCallInfo(side, c, { byEffect: true, ignorePhase: true }), d = info && info.data;
        if (!info || !info.ok || !d || (d.call.parts || []).length) return;
        if (!MONSTER_POSITIONS.some(p => !f.monsters[p]) || B.getCurrentSizeUsed(f) + getEffectiveCardSize(f, c) > (f.maxSize || 3)) return;
        cands.push({ k: "soul", side, host, idx: si, id, card: c, d, unit: null });
      });
      if (!cands.length) return false;
      const ch = await core.pick(cands, { qty: { n: 1 }, raw: "a «Super Warrior» monster from this card's soul", filter: {} }, ctx, { intent: "help", title: `${ctx.card.name} - call a Super Warrior from its soul` });
      const r = ch && ch[0]; if (!r) return false;
      const d = r.d || (cands.find(x => x.card === r.card) || {}).d; if (!d) return false;
      const si = host.soul.findIndex(e => (typeof root.getSoulCardId === "function" ? root.getSoulCardId(e) : e) === r.id);
      if (si < 0) return false;
      const entry = host.soul.splice(si, 1)[0];
      f.hand.push(r.id);
      for (let g = 0; g < d.call.gauge; g++) f.drop.push(f.gauge.pop());
      if (d.call.life > 0) f.life = Math.max(1, f.life - d.call.life);
      const ok = !!B.imCallFromZone(side, "hand", f.hand.lastIndexOf(r.id), {}, null);
      if (!ok) { const hi = f.hand.lastIndexOf(r.id); if (hi >= 0) f.hand.splice(hi, 1); host.soul.splice(si, 0, entry); }
      return ok;
    }, check: () => true
  };
  OV42.push([6414, /call a .super warrior. monster from this card's soul/i, (ab) => Object.assign(clone(ab), { steps: [{ op: "r42MirrorsCall" }] })]);
  // #1152 New-Era Great Spell, The Creation ([Set] impact): "When you draw by the effect of a card, put the top card of your deck into your gauge, and you gain 1 life. Once per turn."
  // It used to parse as a one-shot on cast. "effectDraw" fires from OPS.draw (a draw by a card effect, not the draw phase).
  Object.assign(ABX.TRIG_OK, { effectDraw: () => true });
  if (OPS.draw && OPS.draw.run && !OPS.draw.__r42Fire) {
    const origDraw = OPS.draw.run;
    OPS.draw.run = function (s, ctx) {
      const r = origDraw.apply(this, arguments);
      try { const side = ctx.side && (s && s.who === "opp" ? otherSide(ctx.side) : ctx.side); if (r && side) ABX.queue(() => core.fireTriggers((t, src, sd) => t.event === "effectDraw" && sd === side, { name: "effectDraw" })); } catch (e) { /* ignore */ }
      return r;
    };
    OPS.draw.__r42Fire = true;
  }
  OV42.push([1152, /when you draw by the effect of a card/i, () => ({ kind: "triggered", trigger: { event: "effectDraw" }, once: "turn", conds: [], steps: [{ op: "mill", who: "you", n: 1, to: "gauge", src: "put the top card of your deck into your gauge" }, { op: "life", who: "you", n: 1, src: "you gain 1 life" }] })]);
  OV42.push([1541, /when your demon lord on your field attacks/i, () => ({ kind: "triggered", trigger: { event: "otherAttack", np: np({ tribes: ["Demon Lord"] }) }, conds: [], steps: [{ op: "mill", who: "you", n: 1, to: "soul", host: "self", faceDown: true, src: "put the top card of your deck face down into this card's soul" }] })]);

  // #6526 in the soul of "Dragon Throne": when an item on your field attacks ALONE it attacks all opp monsters + opp, and gets power+10000 and [Triple Attack] this turn.
  // (Soul cards of set spells are not trigger sources in the engine, so this is applied from a fireAttack hook.)
  const origFireAttackReb = ABX.fireAttack;
  ABX.fireAttack = function (attSide, units) {
    try {
      const f = B[attSide];
      const u = units && units.length === 1 && units[0] && units[0].unit;
      if (f && u && u === f.item && u.abxRebTurn !== B.turnCount) {
        const throne = (f.setSpells || []).find(c => c.id === 941 && (c.soul || []).some(x => Number(x && typeof x === "object" ? x.id : x) === 6526));
        if (throne) {
          u.abxRebTurn = B.turnCount;
          u.abxAttackAllOpp = B.turnCount; u.abxAttackAllFighter = true;
          u.tempPower = (u.tempPower || 0) + 10000;
          if (!u.tempTA) { u.tempTA = true; u.attacksLeft = (u.attacksLeft || 0) + 2; }
        }
      }
    } catch (e) { /* ignore */ }
    return origFireAttackReb.apply(this, arguments);
  };

  // #5767 / #6066: "if another <<Deity Dragon Tribe>> is on your field, for this turn, ..." -> checked now, pays out on each attack / end of battle
  OPS.r42WyvernWill = {
    run(s, ctx) {
      const f = ctx.f || F(ctx.side);
      const flt = s.monsterOnly ? { tribes: ["Deity Dragon Tribe"], types: ["monster"] } : { tribes: ["Deity Dragon Tribe"] };
      const other = core.fieldUnits(f, false).some(r => r.unit !== ctx.unit && r.card && (ctx.unit || r.card.id !== (ctx.card && ctx.card.id)) && core.matchFilter(r.card, flt, { unit: r.unit, side: ctx.side }, { f }));
      if (other) { f.abxWyvernWill = { turn: battle.turnCount, when: s.when, life: s.life, dmg: s.dmg }; }
      return true;
    }, check: () => true
  };
  const wyvernPay = (side, units, perUnit) => {
    const f = F(side), w = f && f.abxWyvernWill;
    if (!w || w.turn !== battle.turnCount) return null;
    const n = perUnit ? Math.max(1, (units || []).filter(u => u && u.unit && u.unit.card && u.unit.card.type === "Monster").length) : 1;
    const card = core.cardOf(5767), steps = [];
    if (w.life) steps.push({ op: "life", who: "you", n: w.life * n });
    if (w.dmg) steps.push({ op: "damage", who: "opp", n: w.dmg * n });
    return steps.length ? { card, ab: { kind: "spell", steps } } : null;
  };
  const prevAttackW = ABX.fireAttack;
  ABX.fireAttack = function (attSide, units, defSide, targetPos) {
    const r = prevAttackW.apply(this, arguments);
    try {
      const w = F(attSide) && F(attSide).abxWyvernWill;
      const p = w && w.when === "attack" && wyvernPay(attSide, units, true);
      if (p) return ABX.queue(async () => { await r; await ABX.runAbility(attSide, p.card, p.ab, null, { preApproved: true }); });
    } catch (e) { /* ignore */ }
    return r;
  };
  const prevBattleEndW = ABX.fireBattleEnd;
  ABX.fireBattleEnd = function (attSide, units) {
    const r = prevBattleEndW.apply(this, arguments);
    try {
      const w = F(attSide) && F(attSide).abxWyvernWill;
      const p = w && w.when === "battleEnd" && wyvernPay(attSide, units, false);
      if (p) return ABX.queue(async () => { await r; await ABX.runAbility(attSide, p.card, p.ab, null, { preApproved: true }); });
    } catch (e) { /* ignore */ }
    return r;
  };

  // #5538: remember that Sector Collapse is active this turn (the attack hook below applies it)
  OPS.r42SectorCollapse = { run(s, ctx) { ctx.f.abxSectorCollapse = battle.turnCount; return true; }, check: () => true };

  const prev = ABX.parseCard;
  /* catalog check: "unaffected by / not affected by the effects of \"<Name>\"" (#402 #405 #2068 vs Gleipnir).
   * A restriction coming from that named card is undone for the immune unit. */
  const immuneTo = (unit, srcName) => {
    if (!unit || !unit.card || !srcName) return false;
    const m = String(unit.card.skill || "").match(/(?:unaffected by|not affected by) the effects? of "([^"]+)"/i);
    return !!m && lc(m[1]) === lc(srcName);
  };
  if (OPS.restrict && !OPS.restrict._r42Immune) {
    const prevRun = OPS.restrict.run;
    OPS.restrict.run = async function (s, ctx) {
      const units = ["plr", "opp"].flatMap(sd => core.fieldUnits(F(sd), true)).map(x => x.unit).filter(u => immuneTo(u, ctx && ctx.card && ctx.card.name));
      const before = units.map(u => [u, JSON.stringify(u.abxNo || null), u.tempIndestructible]);
      const r = await prevRun.call(this, s, ctx);
      before.forEach(([u, no, ti]) => { u.abxNo = JSON.parse(no) || undefined; if (u.abxNo === undefined) delete u.abxNo; u.tempIndestructible = ti; });
      return r;
    };
    OPS.restrict._r42Immune = true;
  }
  ABX.immuneTo = immuneTo;

  ABX.parseCard = function (card) {
    const r = prev.apply(this, arguments);
    try {
      if (!card || !r || !Array.isArray(r.abilities)) return r;
      // A bare quoted name ("Dragon Throne") means that exact card name, not "contains" (that is `with "X" in its card name`).
      // The parser stores both as filter.names (substring): make the bare ones exact when such a card exists.
      if (/"/.test(card.skill || "")) {
        const exact = exactNameSet();
        r.abilities.forEach(ab => walk(ab.steps, x => {
          const f = x && x.filter;
          if (!f || !Array.isArray(f.names) || !f.names.length || f.namesExact) return;
          if (/\bin (?:its|their) (?:card )?names?\b|\bwith (?:the )?name\b/i.test(String(x.raw || ""))) return;
          const ex = f.names.filter(n => exact.has(n));
          if (!ex.length) return;
          const rest = f.names.filter(n => !exact.has(n));
          f.namesExact = ex; if (rest.length) f.names = rest; else delete f.names;
        }));
      }
      if (!OV42.some(o => o[0] === card.id) && ![5422, 5748, 5759, 4114].includes(card.id) && !/\[(?:overturn|overkill|overthrow)\]\s*\[/i.test(card.skill || "")) return r;
      const extra = [];
      r.abilities.forEach(ab => {
        const raw = String(ab.cleaned || ab.raw || "");
        const full = String(ab.raw || "");
        // plain filter patches: only the filter of the existing steps changes
        // #4114: "originally size 3 «Skull Warrior» or «Hundred Demons» monster": the OR was glued into ONE token and never matched
        if (card.id === 4114 && Array.isArray(ab.steps)) walk(ab.steps, x => { if (x.filter && Array.isArray(x.filter.tokens) && x.filter.tokens.some(t => /skull warrior hundred demons/i.test(t))) { delete x.filter.tokens; x.filter.tribes = ["Skull Warrior", "Hundred Demons"]; } });
        if (card.id === 5422 && Array.isArray(ab.steps)) walk(ab.steps, x => { if (x.filter && x.filter.uniqueBy === "cardName") { x.filter.tribesAll = ["Dragod", "Legend Dragon"]; } });
        if ((card.id === 5748 || card.id === 5759) && Array.isArray(ab.steps)) walk(ab.steps, x => { if (x.t === "count" && x.np && x.np.filter && x.np.filter.tribes && x.np.filter.tribes.includes("Dragod")) x.np.filter.distinct = true; if (x.filter && x.filter.uniqueBy && x.filter.tribes) { x.filter.distinct = true; } });
        for (const [id, re, build] of OV42) {
          if (card.id !== id || !(re.test(raw) || re.test(full) || re.test(lc(raw)))) continue;
          const o = build(ab);
          if (!o) continue;
          ab.kind = o.kind; ab.steps = o.steps; ab.unparsed = []; ab.parsed = true; ab.r42 = true;
          if (o.options) ab.options = o.options;
          if (o.action) ab.action = o.action;
          if (o.once) ab.once = o.once;
          if (o.tags) ab.tags = o.tags;
          if (o.repeatLW) ab.repeatLW = o.repeatLW;
          if (o.trigger) ab.trigger = o.trigger; else if (o.trigger === null) delete ab.trigger;
          if (o.conds !== undefined) ab.conds = o.conds;
          // #5757: the same effect also happens when it is dropped from the hand
          if (card.id === 5757 && o.kind === "triggered") { const c2 = clone(ab); c2.trigger = { event: "discardedFromHand", self: true }; extra.push(c2); }
          break;
        }
        // [Overturn] / [Overkill] / [Overthrow] [<activation cost / timing>]: the printed cost must be paid when the ability is used
        if (ab.kind === "act" && Array.isArray(ab.steps) && (ab.tags || []).some(t => /(?:^|:)(overturn|overkill|overthrow)/.test(t)) && !OVER_SELF_PAY.has(card.id)) {
          const br = /\[(?:overturn|overkill|overthrow)\]\s*\[([^\]]*)\]/i.exec(full);
          if (br && !(ab.steps[0] && ab.steps[0].cost)) {
            const txt = br[1], costs = [];
            let m;
            if ((m = /pay (\d+) gauge/i.exec(txt))) costs.push({ op: "pay", gauge: +m[1], cost: true, src: "pay " + m[1] + " gauge" });
            if ((m = /pay (\d+) life/i.exec(txt))) costs.push({ op: "pay", life: +m[1], cost: true, src: "pay " + m[1] + " life" });
            if (!/life would become/i.test(txt) && /(?:discard|drop) (?:a|one) (?:card|hand card)(?: from your hand)?|(?:discard|drop) a hand card/i.test(txt)) costs.push({ op: "discard", n: 1, cost: true, src: "discard a hand card" });
            if (costs.length) ab.steps = costs.concat(ab.steps);
          }
        }
      });
      extra.forEach(x => r.abilities.push(x));
    } catch (e) { /* keep the parsed card as is */ }
    return r;
  };

  // #5538 Sector Collapse: for this turn, when a size 1 or less Legend Dragon monster on your field attacks, destroy up to one card on the opponent's field; if you do, 1 damage
  const prevAttack = ABX.fireAttack;
  ABX.fireAttack = function (attSide, units, defSide, targetPos) {
    const r = prevAttack.apply(this, arguments);
    try {
      const f = F(attSide);
      if (f && f.abxSectorCollapse === battle.turnCount && (units || []).some(u => u && u.unit && core.matchFilter(u.unit.card, { tribes: ["Legend Dragon"], types: ["monster"], size: { n: 1, cmp: "le" } }, { unit: u.unit, side: attSide }, { f }))) {
        const card = core.cardOf(5538);
        const ab = { kind: "spell", steps: [{ op: "destroy", np: Object.assign(np({}, "field", null, "opp"), { qty: { n: 1, upTo: true, all: false, any: false, each: false } }) }, { op: "damage", who: "opp", n: 1, gate: "ifYouDo" }] };
        return ABX.queue(async () => { await r; await ABX.runAbility(attSide, card, ab, null, { preApproved: true }); });
      }
    } catch (e) { /* ignore */ }
    return r;
  };

  /* ==================== Stand lock coverage ==================== */
  // Ruling note: no official Q&A on Voltic Ra vs. Double Attack was found. Q1192 (Gojinmaru) calls the keyword's re-stand a "[Stand]", so a "cannot [Stand]"
  // lock stops [Double/Triple/Quadruple Attack] here. Set ABX.standLockStopsMultiAttack = false to allow them again.
  ABX.standLockStopsMultiAttack = true;
  const lockSrcCache = new Map();
  const isLockSrc = (card) => {
    if (!lockSrcCache.has(card.id)) lockSrcCache.set(card.id, (ABX.get(card).abilities || []).some(ab => ab.kind === "static" && (ab.steps || []).some(st => st.op === "restrict" && (st.kinds || []).includes("stand") && st.np && st.np.zone && st.np.zone.owner)));
    return lockSrcCache.get(card.id);
  };
  const anyLockSource = () => ["plr", "opp"].some(sd => core.fieldUnits(F(sd), true).some(x => x.unit && x.unit.card && isLockSrc(x.unit.card)));
  const lockedRested = () => {
    const out = [];
    ["plr", "opp"].forEach(sd => core.fieldUnits(F(sd), true).forEach(x => { if (x.unit.rested && standLocked(x.unit, sd)) out.push({ u: x.unit, attacksLeft: x.unit.attacksLeft }); }));
    return out;
  };
  // Every ability step (OPS.stand and the older round files that set rested=false directly) leaves a locked, rested card rested.
  const guardOp = (op) => {
    if (!op || typeof op.run !== "function" || op._r42Guard) return op;
    const orig = op.run;
    op.run = function () {
      if (!anyLockSource()) return orig.apply(this, arguments);
      const snap = lockedRested();
      if (!snap.length) return orig.apply(this, arguments);
      const restore = () => snap.forEach(x => { if (!x.u.rested) { x.u.rested = true; x.u.attacksLeft = x.attacksLeft; } });
      const r = orig.apply(this, arguments);
      if (r && typeof r.then === "function") return r.then(v => { restore(); return v; }, e => { restore(); throw e; });
      restore();
      return r;
    };
    op._r42Guard = true;
    return op;
  };
  core.guardStandLock = guardOp;
  Object.keys(OPS).forEach(name => guardOp(OPS[name]));
  // A card stood by an ability can attack again: a unit that attacked out (attacksLeft 0, rested) must get its attacks back when an effect stands it
  // (e.g. #2371 / #6521 Great Demonic End Dragon's [Counter][Act] [Stand] this card).
  const maxAttacks = (side, u) => {
    try { const eff = getUnitEffectiveCombatStats(F(side), u); return eff.qa ? 4 : eff.ta ? 3 : eff.da ? 2 : (u.card.atk_max || 1); } catch (e) { return u.card.atk_max || 1; }
  };
  const restandOp = (op) => {
    if (!op || typeof op.run !== "function" || op._r42Restand) return op;
    const orig = op.run;
    op.run = function () {
      const snap = [];
      ["plr", "opp"].forEach(sd => core.fieldUnits(F(sd), true).forEach(x => { if (x.unit && x.unit.rested && !(x.unit.attacksLeft > 0)) snap.push({ u: x.unit, sd }); }));
      if (!snap.length) return orig.apply(this, arguments);
      const fix = () => snap.forEach(x => { if (!x.u.rested && !(x.u.attacksLeft > 0)) x.u.attacksLeft = maxAttacks(x.sd, x.u); });
      const r = orig.apply(this, arguments);
      if (r && typeof r.then === "function") return r.then(v => { fix(); return v; }, e => { fix(); throw e; });
      fix();
      return r;
    };
    op._r42Restand = true;
    return op;
  };
  core.restandOp = restandOp;
  Object.keys(OPS).forEach(name => restandOp(OPS[name]));
  // [Double / Triple / Quadruple Attack] stand the card again after its attack: a locked card stays rested after its first attack.
  const prevBattleEnd = ABX.fireBattleEnd;
  ABX.fireBattleEnd = function (attSide, units) {
    try {
      if (ABX.standLockStopsMultiAttack) (units || []).forEach(x => { const u = x && x.unit; if (u && u.attacksLeft > 0 && standLocked(u, attSide)) { u.attacksLeft = 0; u.rested = true; } });
    } catch (e) { /* ignore */ }
    return prevBattleEnd.apply(this, arguments);
  };
  // [r42] "This card cannot attack the left or right" (#1220 / #3115 Armordeity): a continuous static the engine parsed (noAttackPos) but never enforced.
  // true = this unit may not attack a monster on targetPos (its own static, not nullified, conditions met).
  core.noAttackPosBlocked = function (unit, targetPos) {
    if (!unit || !unit.card || (targetPos !== "left" && targetPos !== "right") || unit.abxNullified === B.turnCount) return false;
    const side = ["plr", "opp"].find(sd => core.fieldUnits(F(sd), true).some(x => x.unit === unit));
    if (!side) return false;
    for (const ab of ABX.get(unit.card).abilities) {
      if (ab.kind !== "static" || (ab.unparsed && ab.unparsed.length)) continue;
      for (const st of ab.steps || []) {
        if (!(st.op === "static" && st.kind === "noAttackPos") || !(st.pos || []).includes(targetPos)) continue;
        const ctx = { side, f: F(side), e: F(otherSide(side)), card: unit.card, unit, bind: { chosen: [] } };
        if ((ab.conds || []).every(c => ABX.condExecutable(c) && core.evalCond(c, ctx))) return true;
      }
    }
    return false;
  };
  // [r42] #4174 Mark of Transgression "SYS": "When this card is destroyed, you may pay 1 life. If you do, equip up to a total of two items with 'Aqulta Gwaneff' in their card names
  // from your hand and deck. If you looked in your deck, shuffle it." The generic parse paid the life but never equipped.
  OPS.r42TransgressionEquip = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side;
      if (!(f.life > 1)) return false;
      if (OPS.pay && OPS.pay.run) { const ok = await OPS.pay.run({ op: "pay", life: 1, optional: true, cost: true }, ctx); if (!ok) return false; } else f.life -= 1;
      const isG = (c) => !!c && c.type === "Item" && /aqulta gwaneff/i.test(c.name || "");
      const cands = [];
      f.hand.forEach((id, i) => { const c = core.cardOf(id); if (isG(c)) cands.push({ k: "zone", side, area: "hand", idx: i, id, card: c }); });
      f.deck.forEach((id, i) => { const c = core.cardOf(id); if (isG(c)) cands.push({ k: "zone", side, area: "deck", idx: i, id, card: c }); });
      let picked = cands.slice(0, 2);
      if (cands.length > 2 && !ABX.autoPlay) picked = (await core.pick(cands, { qty: { n: 2, upTo: true }, raw: "up to two items with Aqulta Gwaneff in their card names", filter: {} }, ctx, { intent: "help", title: `${ctx.card.name} - equip up to two Aqulta Gwaneff items` }) || []).slice(0, 2);
      if (picked.length === 2 && picked[0].id === picked[1].id && picked[0].area === picked[1].area && picked[0].idx === picked[1].idx) picked = picked.slice(0, 1);
      const fromDeck = picked.some(x => x.area === "deck");
      f.abxItemCap = 2;
      try { for (const x of picked) if (ABX.equipFrom) ABX.equipFrom(side, x.area, x.id, false); } finally { delete f.abxItemCap; }
      if ((fromDeck || f.deck.length) && B.shuffleFighterDeck) B.shuffleFighterDeck(side);
      fresh();
      return picked.length > 0;
    },
    check: () => true
  };
  OV42.push([4174, /when this card is destroyed, you may pay 1 life/i, () => ({ kind: "triggered", trigger: { event: "leave", self: true, destroyedOnly: true }, conds: [], steps: [{ op: "r42TransgressionEquip" }] })]);
  // [r42] #4153 Mark of Atonement "SYS": "When this card is destroyed, draw a card. Then, if your flag is 'Dragon Zwei', put up to one 'Dragon Drei' from your hand or deck on top of your flag,
  // and shuffle your deck. If you do, you gain 5 life!" The generic parse gained the 5 life whether or not a Drei was found and never put it on the flag.
  OPS.r42AtonementDrei = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side;
      if (OPS.draw && OPS.draw.run) await OPS.draw.run({ op: "draw", who: "you", n: 1 }, ctx);
      const fl = core.cardOf(f.flagId);
      if (!fl || fl.name !== "Dragon Zwei") return true;
      let area = "hand", idx = f.hand.findIndex(id => id === 2789);
      if (idx < 0) { area = "deck"; idx = f.deck.findIndex(id => id === 2789); }
      if (B.shuffleFighterDeck) B.shuffleFighterDeck(side);
      if (idx < 0) { return true; }
      const arr = f[area]; const at = arr.indexOf(2789); if (at < 0) return true;
      arr.splice(at, 1);
      f.flagId = 2789; f.flagCard = core.cardOf(2789); f.maxSize = 3;
      await OPS.life.run({ op: "life", who: "you", n: 5 }, ctx);
      fresh();
      return true;
    },
    check: () => true
  };
  OV42.push([4153, /put up to one .dragon drei. from your hand or deck/i, () => ({ kind: "triggered", trigger: { event: "leave", self: true, destroyedOnly: true }, conds: [], steps: [{ op: "r42AtonementDrei" }] })]);
  // [r42] «Dragonarms» soul triggers that read "When your «Neodragon» with this card in its soul attacks and deals damage / destroys a monster" (#1242 #1308 #1774):
  // they were parsed as dead statics / "enter" triggers / triggers of the soul card itself, so they never fired. New host events, fired from the attack outcome.
  const NEO = () => Object.assign(np({ tribes: ["Neodragon"] }, null, null, "you"), { raw: "your «Neodragon»", zone: null });
  OV42.push([1242, /when that .neodragon. deals damage to your opponent, destroy an item/i, () => ({ kind: "triggered", trigger: { event: "hostDealsDamage", np: NEO() }, conds: [], steps: [
    { op: "destroy", np: Object.assign(np({ types: ["item"] }, "field", null, "opp"), { raw: "an item on your opponent's field" }), src: "destroy an item on your opponent's field" }] })]);
  OV42.push([1308, /attacks and destroys your opponent's monster, deal 1 damage/i, () => ({ kind: "triggered", trigger: { event: "hostDestroys", np: NEO() }, conds: [], steps: [{ op: "damage", who: "opp", n: 1, src: "deal 1 damage to your opponent" }] })]);
  OV42.push([1774, /attacks and deals damage to your opponent, put the top card of your deck into your gauge, or you gain 1 life/i, () => ({ kind: "triggered", trigger: { event: "hostDealsDamage", np: NEO() }, conds: [], steps: [{ op: "r42GaugeOrLife" }] })]);
  OPS.r42GaugeOrLife = {
    async run(s, ctx) {
      const f = ctx.f; let gauge = true;
      if (!ABX.autoPlay && f.deck.length && core.askChoice) { try { gauge = (await core.askChoice(ctx, `${ctx.card.name}`, ["Put the top card of your deck into your gauge", "Gain 1 life"])) === 0; } catch (e) { gauge = true; } }
      if (gauge && f.deck.length) f.gauge.push(f.deck.shift());
      else await OPS.life.run({ op: "life", who: "you", n: 1 }, ctx);
      fresh(); return true;
    }, check: () => true
  };
  const ofo = ABX.fireAttackOutcome;
  ABX.fireAttackOutcome = function (attSide, units, defSide, outcome) {
    const p = ofo.apply(this, arguments);
    ABX.queue(async () => {
      const f = F(attSide);
      const evs = []; if (outcome && outcome.dealtDamage) evs.push("hostDealsDamage"); if (outcome && outcome.destroyedMonster) evs.push("hostDestroys");
      if (!evs.length) return;
      for (const x of units || []) {
        const host = x && x.unit; if (!host || !(host.soul || []).length) continue;
        for (const id of host.soul.slice()) {
          const c = core.cardOf(id); if (!c) continue;
          for (const ab of core.abilitiesOf(c, a => a.kind === "triggered" && a.trigger && evs.includes(a.trigger.event) && ABX.isExecutable(a))) {
            if (ab.trigger.np && !core.matchFilter(host.card, ab.trigger.np.filter || {}, { unit: host, side: attSide }, { f })) continue;
            if (host.abxNullified === B.turnCount || core.onceUsed(f, c, ab, host)) continue;
            const idx = host.soul.indexOf(id); if (idx < 0) continue;
            const selfRef = { k: "soul", side: attSide, unit: host, idx, id, card: c };
            const probe = { side: attSide, f, e: F(otherSide(attSide)), card: c, unit: null, ab, soulHost: host, hostArea: "soul", selfRef, bind: { chosen: [{ k: "unit", side: attSide, unit: host, card: host.card, id: host.card.id }], revealed: [], looked: [] }, lastDone: true, auto: true, log: [] };
            if (!(ab.conds || []).every(cd => core.evalCond(cd, probe))) continue;
            core.markOnce(f, c, ab, host);
            await core.runAbility(attSide, c, ab, null, { event: { name: "attack" }, hostArea: "soul", soulHost: host, selfRef });
            if (B.matchOver) return;
          }
        }
      }
    }).catch(() => {});
    return p;
  };
  // [r42] #2470 Dragonarms, Debrisweeper: "If this card is in the soul of your «Neodragon», your opponent cannot call monsters from his or her drop zone." (was a dead static)
  OV42.push([2470, /your opponent cannot call monsters from his or her drop zone/i, () => ({ kind: "static", steps: [{ op: "static", kind: "r31", tag: "r42NoOppDropCall" }] })]);
  const dropCallLocked = (side) => {
    try {
      const foe = F(otherSide(side));
      return core.fieldUnits(foe, true).some(x => x.unit && x.unit.abxNullified !== B.turnCount && (x.unit.soul || []).some(id => id === 2470) && core.matchFilter(x.unit.card, { tribes: ["Neodragon"] }, { unit: x.unit, side: otherSide(side) }, { f: foe }));
    } catch (e) { return false; }
  };
  core.dropCallLocked = dropCallLocked;
  if (ABX.placeFromZone) {
    const pfz42 = ABX.placeFromZone;
    ABX.placeFromZone = function (side, area, id, opts) {
      const c = core.cardOf(id);
      if (area === "drop" && c && c.type === "Monster" && dropCallLocked(side)) return Promise.resolve(null);
      return pfz42.apply(this, arguments);
    };
  }
  // [r42] #2303 Meteorarms, Pisca Pisca: "When you put this card from the field, deck, or drop zone into the soul of a size 3 «Neodragon», put the top card of your deck into your gauge." (was an "enter" trigger)
  OV42.push([2303, /into the soul of a size 3/i, () => ({ kind: "triggered", trigger: { event: "putIntoSoul", self: true, fromAreas: ["field", "deck", "drop zone"], hostNp: Object.assign(np({ tribes: ["Neodragon"], size: { n: 3, cmp: "eq" } }, null, null, "you"), { zone: null, raw: "a size 3 «Neodragon»" }) }, conds: [], steps: [{ op: "mill", who: "you", n: 1, to: "gauge", src: "put the top card of your deck into your gauge" }] })]);
  /* ---- [r42] dead continuous statics (parsed as r40Static text): #3831 #1970 #3151 #5939 (size), #1641 #2711 (stats from souls), #2808 (center protection), #2196 #1676 (no effect damage) ---- */
  const sideOfF = (fighter) => B.plr === fighter ? "plr" : B.opp === fighter ? "opp" : null;
  const fieldSoulCount = (fighter) => {
    let n = 0;
    ["left", "center", "right", "center2"].forEach(p => { const u = fighter.monsters && fighter.monsters[p]; if (u && Array.isArray(u.soul)) n += u.soul.length; });
    ["item", "item2"].forEach(k => { const u = fighter[k]; if (u && Array.isArray(u.soul)) n += u.soul.length; });
    return n;
  };
  const centerIs = (fighter, id) => { const c = fighter.monsters && fighter.monsters.center; return !!c && c.card.id === id && c.abxNullified !== B.turnCount; };
  const prevSizeDelta = ABX.sizeDelta;
  ABX.sizeDelta = function (fighter, card, unit) {
    let d = prevSizeDelta.apply(this, arguments);
    try {
      if (!card || !fighter || !sideOfF(fighter)) return d;
      if (unit && unit.abxNullified === B.turnCount) return d;
      const onField = !!unit && ["left", "center", "right", "center2"].some(p => fighter.monsters[p] === unit);
      if (card.id === 3831 && onField && fighter.monsters.center) d -= 1;   // "If you have monsters on your center, the size of this card on the field is reduced by 1"
      if (card.id === 1970 && onField) d -= fieldSoulCount(fighter);        // "For each card in the souls of cards on your field, the size of this card on your field is reduced by 1"
      if (onField && (fighter.monsters.left === unit || fighter.monsters.right === unit)) {
        if (centerIs(fighter, 3151) && (card.attrs || []).some(a => /^disaster$/i.test(a))) d -= 1;   // #3151: the size of the «Disaster» on your left and right is reduced by 1
        if (centerIs(fighter, 5939) && card.size === 3) d -= 3;                                         // #5939: all originally size 3 monsters on your left and right are reduced by 3
      }
    } catch (e) { /* ignore */ }
    return d;
  };
  if (ABX.staticBonus) {
    const prevSB = ABX.staticBonus;
    ABX.staticBonus = function (fighter, unit) {
      const sb = prevSB.apply(this, arguments);
      try {
        if (!unit || !unit.card || !sb || unit.abxNullified === B.turnCount) return sb;
        if (unit.card.id === 1641 && fieldSoulCount(fighter) >= 3) sb.crit += 2;   // "If three or more cards are in the souls of cards on your field, this card gets critical+2!"
        if (unit.card.type === "Monster" || unit.card.type === "Item") {
          const n = (unit.soul || []).filter(id => id === 2711).length;   // #2711 Cerberus "A" in the soul of a «Weapon»: critical+1 per card in its soul, [Penetrate] with three or more souls
          if (n && (unit.card.attrs || []).some(a => /^weapon$/i.test(a))) { sb.crit += (unit.soul || []).length; if ((unit.soul || []).length >= 3) sb.pen = true; }
        }
      } catch (e) { /* ignore */ }
      return sb;
    };
  }
  // #2808 Athora: "If this card is on your center, this card cannot be destroyed by card effects during your opponent's turn."
  OV42.push([2808, /if this card is on your center, this card cannot be destroyed by card effects during your opponent's turn/i, () => ({ kind: "static", conds: [{ t: "selfPos", pos: "center" }, { t: "turn", who: "opp" }], steps: [{ op: "static", kind: "protect", kinds: ["destroyed"], self: true, byOpp: true }] })]);
  // #2196 (while on your center) / #1676: "you cannot be dealt damage by effects from your opponent's cards"
  const noEffDmg = (fighter) => {
    const side = sideOfF(fighter); if (!side) return false;
    if (centerIs(fighter, 2196)) return true;
    return core.fieldUnits(fighter, true).some(x => x.unit && x.unit.card.id === 1676 && x.unit.abxNullified !== B.turnCount);
  };
  const prevApplyDamage = core.applyDamage;
  core.applyDamage = function (side, n, src) {
    try {
      if (src && src.kind === "effect" && n > 0 && !src.unreducible) {
        const f = F(side);
        const own = src.sourceSide ? src.sourceSide === side : (src.card ? [f.hand, f.drop, f.gauge].some(a => a.includes(src.card.id)) || core.fieldUnits(f, true).some(x => x.unit && (x.unit.card.id === src.card.id || (x.unit.soul || []).includes(src.card.id))) : B.activeSide === side);
        if (!own && noEffDmg(f)) return 0;
      }
    } catch (e) { /* ignore */ }
    return prevApplyDamage.apply(this, arguments);
  };
  /* ---- [r42] new trigger events: soulInto ("When a soul is put into ...") and restedByEffect ("When a card on your opponent's field is [Rest] by your card effects") ---- */
  Object.assign(ABX.TRIG_OK, { soulInto: () => true, restedByEffect: () => true });
  const soulSnap = new WeakMap();
  let soulScanning = false;
  const fieldSources = (side) => {
    const f = F(side), out = [];
    core.fieldUnits(f, true).forEach(x => { if (x.unit) out.push({ card: x.unit.card, unit: x.unit, host: null }); });
    (f.setSpells || []).forEach(c => out.push({ card: c, unit: null, host: null }));
    return out;
  };
  const soulSources = (side) => {
    const out = [];
    core.fieldUnits(F(side), true).forEach(x => { if (x.unit) (x.unit.soul || []).forEach((id, idx) => { const c = core.cardOf(id); if (c) out.push({ card: c, unit: null, host: x.unit, idx, id }); }); });
    return out;
  };
  // run the abilities with trigger.event === ev on the given sources; `test(t, src)` decides whether the trigger matches
  async function fireNew(side, ev, test, srcs) {
    const f = F(side);
    for (const src of srcs) {
      for (const ab of core.abilitiesOf(src.card, a => a.kind === "triggered" && a.trigger && a.trigger.event === ev && ABX.isExecutable(a))) {
        if ((src.unit && src.unit.abxNullified === B.turnCount) || (src.host && src.host.abxNullified === B.turnCount)) continue;
        if (!test(ab.trigger, src)) continue;
        const holder = src.unit || src.host;
        if (core.onceUsed(f, src.card, ab, holder)) continue;
        const selfRef = src.host ? { k: "soul", side, unit: src.host, idx: Math.max(0, src.host.soul.indexOf(src.id)), id: src.id, card: src.card } : null;
        const probe = { side, f, e: F(otherSide(side)), card: src.card, unit: src.unit || null, ab, soulHost: src.host || null, hostArea: src.host ? "soul" : "field", selfRef, bind: { chosen: src.host ? [{ k: "unit", side, unit: src.host, card: src.host.card, id: src.host.card.id }] : [], revealed: [], looked: [] }, lastDone: true, auto: true, log: [] };
        if (!(ab.conds || []).every(c => core.evalCond(c, probe))) continue;
        core.markOnce(f, src.card, ab, holder);
        await core.runAbility(side, src.card, ab, src.unit || null, { event: { name: ev }, hostArea: src.host ? "soul" : "field", soulHost: src.host || null, selfRef });
        if (B.matchOver) return;
      }
    }
  }
  const hostOK = (t, host, side, f) => (!t.np || core.matchFilter(host.card, t.np.filter || {}, { unit: host, side }, { f })) && (!t.hostKw || lc(host.card.skill || "").includes("[" + t.hostKw + "]"));
  async function scanSouls() {
    if (soulScanning) return;
    soulScanning = true;
    try {
      const added = [];
      ["plr", "opp"].forEach(side => core.fieldUnits(F(side), true).forEach(x => {
        const u = x.unit; if (!u) return;
        const n = (u.soul || []).length, prev = soulSnap.get(u);
        soulSnap.set(u, n);
        if (prev !== undefined && n > prev) added.push({ side, unit: u });
      }));
      for (const a of added) {
        const f = F(a.side);
        await fireNew(a.side, "soulInto", (t, src) => (t.self ? src.unit === a.unit : true) && hostOK(t, a.unit, a.side, f), fieldSources(a.side));
      }
    } catch (e) { /* ignore */ } finally { soulScanning = false; }
  }
  core.scanSouls = scanSouls;
  const prevRunAbility = core.runAbility;
  core.runAbility = async function () {
    if (!soulScanning) await scanSouls();
    const r = await prevRunAbility.apply(this, arguments);
    if (!soulScanning) await scanSouls();
    return r;
  };
  if (ABX.firePutIntoSoul) {
    const pis = ABX.firePutIntoSoul;
    ABX.firePutIntoSoul = function () { const p = pis.apply(this, arguments); ABX.queue(() => scanSouls()); return p; };
  }
  // "[Rest] by card effects": hooked on the [Rest] op (attacking rests the attacker as a rule, not an effect)
  if (OPS.rest && OPS.rest.run && !OPS.rest._r42) {
    const restRun = OPS.rest.run;
    OPS.rest.run = async function (s, ctx) {
      const before = [];
      ["plr", "opp"].forEach(sd => core.fieldUnits(F(sd), true).forEach(x => { if (x.unit && !x.unit.rested) before.push({ sd, unit: x.unit }); }));
      const r = await restRun.apply(this, arguments);
      try {
        const rested = before.filter(b => b.unit.rested);
        for (const b of rested) {
          const side = ctx.side, f = F(side);
          const srcs = fieldSources(side).concat(soulSources(side));
          await fireNew(side, "restedByEffect", (t, src) => {
            if (t.targetOpp !== undefined && (t.targetOpp ? b.sd === side : b.sd !== side)) return false;
            if (t.np && !core.matchFilter(b.unit.card, t.np.filter || {}, { unit: b.unit, side: b.sd }, { f: F(b.sd) })) return false;
            if (t.hostNp && src.host && !core.matchFilter(src.host.card, t.hostNp.filter || {}, { unit: src.host, side }, { f })) return false;
            return true;
          }, srcs);
        }
      } catch (e) { /* ignore */ }
      return r;
    };
    OPS.rest._r42 = true;
  }
  const NEO2 = () => Object.assign(np({ tribes: ["Neodragon"] }, null, null, "you"), { zone: null, raw: "your «Neodragon»" });
  OV42.push([4481, /when a soul is put into this card, you gain 1 life/i, () => ({ kind: "triggered", trigger: { event: "soulInto", self: true }, conds: [], steps: [{ op: "life", who: "you", n: 1, src: "you gain 1 life" }] })]);
  OV42.push([5558, /when a soul is put into this card, draw two cards/i, () => ({ kind: "triggered", trigger: { event: "soulInto", self: true }, once: "turn", conds: [], steps: [{ op: "draw", who: "you", n: 2, src: "draw two cards" }] })]);
  OV42.push([3996, /when a soul goes into your .neodragon., draw a card/i, () => ({ kind: "triggered", trigger: { event: "soulInto", np: NEO2() }, once: "turn", conds: [], steps: [{ op: "draw", who: "you", n: 1, src: "draw a card" }] })]);
  OV42.push([5203, /when a soul is put into your \[criminal\], you gain 2 life and draw a card/i, () => ({ kind: "triggered", trigger: { event: "soulInto", np: Object.assign(np({ tribes: ["Criminal"] }, null, null, "you"), { zone: null, raw: "your [Criminal]" }) }, once: "turn", conds: [], steps: [{ op: "life", who: "you", n: 2 }, { op: "draw", who: "you", n: 1 }] })]);
  OV42.push([6022, /when a soul is put into your originally size 3 .time dragon., draw two cards/i, () => ({ kind: "triggered", trigger: { event: "soulInto", np: Object.assign(np({ tribes: ["Time Dragon"], size: { n: 3, cmp: "eq" } }, null, null, "you"), { zone: null, raw: "your originally size 3 «Time Dragon»" }) }, once: "turn", conds: [], steps: [{ op: "draw", who: "you", n: 2 }] })]);
  OV42.push([6299, /when a soul is put into your .super robot., put the top card of your deck into your gauge, and draw a card/i, () => ({ kind: "triggered", trigger: { event: "soulInto", np: Object.assign(np({ tribes: ["Super Robot"] }, null, null, "you"), { zone: null, raw: "your «Super Robot»" }) }, once: "turn", conds: [], steps: [{ op: "mill", who: "you", n: 1, to: "gauge" }, { op: "draw", who: "you", n: 1 }] })]);
  OV42.push([6431, /when a soul is put into your card with \[d-share\], draw a card/i, () => ({ kind: "triggered", trigger: { event: "soulInto", hostKw: "d-share" }, once: "turn", conds: [], steps: [{ op: "draw", who: "you", n: 1 }] })]);
  OV42.push([5605, /when a soul is put into your .neodragon., look at the top three cards/i, () => ({ kind: "triggered", trigger: { event: "soulInto", np: NEO2() }, once: "turn", conds: [], steps: [{ op: "r42MiracleVision" }] })]);
  OPS.r42MiracleVision = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side;
      const top = f.deck.splice(0, 3); if (!top.length) return false;
      let gaugeId = top[0], handId = top.length > 1 ? top[1] : null;
      if (!ABX.autoPlay && top.length > 1) {
        const cands = top.map((id, i) => ({ k: "zone", side, area: "deck", idx: i, id, card: core.cardOf(id) }));
        const g = await core.pick(cands, { qty: { n: 1 }, raw: "one from among them into your gauge", filter: {} }, ctx, { intent: "help", title: `${ctx.card.name} - put one into your gauge` });
        if (g && g[0]) gaugeId = g[0].id;
        const rest = cands.filter(c => c.id !== gaugeId || c.idx !== g[0].idx);
        const h = await core.pick(rest, { qty: { n: 1 }, raw: "one from among them into your hand", filter: {} }, ctx, { intent: "help", title: `${ctx.card.name} - put one into your hand` });
        handId = h && h[0] ? h[0].id : rest[0].id;
      }
      const left = top.slice(); left.splice(left.indexOf(gaugeId), 1); f.gauge.push(gaugeId);
      if (handId != null) { const i = left.indexOf(handId); if (i >= 0) { left.splice(i, 1); f.hand.push(handId); } }
      f.drop.push(...left);   // "drop the rest or put it into the soul of a monster": the soul option is not offered yet
      fresh(); return true;
    }, check: () => true
  };
  OV42.push([2773, /when a card on your opponent's field is \[rest\] by the effects of your cards, if this card is in the soul/i, () => ({ kind: "triggered", trigger: { event: "restedByEffect", targetOpp: true, hostNp: Object.assign(np({ names: ["zodiac"] }, null, null, "you"), { zone: null, raw: 'a monster with "Zodiac" in its card name' }) }, once: "turn", conds: [], steps: [{ op: "draw", who: "you", n: 1 }] })]);
  OV42.push([2775, /when a card on your opponent's field is \[rest\] by an effect from your card, you may pay 1 life/i, () => ({ kind: "triggered", trigger: { event: "restedByEffect", targetOpp: true }, conds: [], steps: [
    { op: "pay", life: 1, cost: true, optional: true, src: "pay 1 life" },
    { op: "destroy", np: Object.assign(np({ types: ["item", "spell"] }, "field", null, "opp"), { raw: "an item or spell on your opponent's field" }), gate: "ifYouDo", src: "destroy an item or spell on your opponent's field" }] })]);
  OV42.push([4193, /when a card on your opponent's field is \[rest\] by card effects, if this card is in the soul of a .neodragon./i, () => ({ kind: "triggered", trigger: { event: "restedByEffect", targetOpp: true, hostNp: NEO2() }, once: "turn", conds: [], steps: [{ op: "mill", who: "you", n: 1, to: "gauge" }, { op: "damage", who: "opp", n: 1 }] })]);
  OV42.push([5471, /when a character or item on your opponent's field is \[rest\] by your card effects, deal 1 damage/i, () => ({ kind: "triggered", trigger: { event: "restedByEffect", targetOpp: true, np: Object.assign(np({ types: ["monster", "item"] }, null, null, "opp"), { zone: null, raw: "a character or item on your opponent's field" }) }, conds: [], steps: [{ op: "damage", who: "opp", n: 1, src: "deal 1 damage to your opponent" }] })]);
  /* ---- [r42] statics tied to equipped items: #3404 #3400 (Sword of the King equipped), #5879 (no item equipped), #5345 (Thunder Sword equipped) ---- */
  const equippedItems = (fighter) => ["item", "item2", "item3", "item4"].map(k => fighter[k]).filter(u => u && u.card);
  const kingSwords = (fighter) => equippedItems(fighter).filter(u => /sword of the king/i.test(u.card.name || ""));
  const ktenos = (fighter) => equippedItems(fighter).some(u => /thunder sword,\s*kt[ei]nos edge/i.test(u.card.name || "") && u.abxNullified !== B.turnCount);
  const prevSB2 = ABX.staticBonus;
  if (prevSB2) ABX.staticBonus = function (fighter, unit) {
    const sb = prevSB2.apply(this, arguments);
    try {
      if (!unit || !unit.card || !sb || unit.abxNullified === B.turnCount) return sb;
      if (unit.card.id === 3404 && kingSwords(fighter).length) sb.crit += 2;
      if (unit.card.id === 3400) { const sw = kingSwords(fighter); if (sw.length) sb.crit += Math.max(...sw.map(u => u.card.crit || 0)) - (unit.card.crit || 1); }
      // #5345: with "Thunder Sword, Ktenos Edge" equipped, all items on your field get power+10000 and [Double Attack]
      if (unit.card.type === "Item" && ktenos(fighter) && equippedItems(fighter).some(u => u.card.id === 5345 && u.abxNullified !== B.turnCount) && equippedItems(fighter).includes(unit)) { sb.power += 10000; sb.da = true; }
    } catch (e) { /* ignore */ }
    return sb;
  };
  const prevSizeDelta2 = ABX.sizeDelta;
  ABX.sizeDelta = function (fighter, card, unit) {
    let d = prevSizeDelta2.apply(this, arguments);
    try {
      if (card && unit && (card.attrs || []).some(a => /^kaiju$/i.test(a)) && !equippedItems(fighter).length && unit.abxNullified !== B.turnCount &&
        ["left", "center", "right", "center2"].some(p => fighter.monsters[p] === unit) &&
        core.fieldUnits(fighter, true).some(x => x.unit && x.unit.card.id === 5879 && x.unit.abxNullified !== B.turnCount)) d -= 4;   // #5879 Alexis Kerib: "If you do not have an item equipped, all «Kaiju» characters' size on your field is reduced by 4"
    } catch (e) { /* ignore */ }
    return d;
  };
  // #5345 Tempest Shield, Draco Guard: with "Thunder Sword, Ktenos Edge" equipped, damage you take other than by your card effects is reduced by 2
  const prevApplyDamage2 = core.applyDamage;
  core.applyDamage = function (side, n, src) {
    try {
      const f = F(side);
      if (n > 0 && !(src && (src.unreducible || src.kind === "effect")) && ktenos(f) && equippedItems(f).some(u => u.card.id === 5345 && u.abxNullified !== B.turnCount)) n = Math.max(0, n - 2);
    } catch (e) { /* ignore */ }
    return prevApplyDamage2.call(this, side, n, src);
  };

  /* ---- [r42] [Transform] group: #2513 #3257 #6561 #6226 #4527 (protections), impact-only calls, #4224 #6208 (no [Counter]),
   *      #5199 (win with 6 souls), #2160 #4499 ("when you [Transform] into a Caardian card"), #4496 ---- */
  const trUnits = (fighter) => equippedItems(fighter).filter(u => (u.card.tr || u.isTransformed) && u.abxNullified !== B.turnCount);
  const trIs = (fighter, id) => trUnits(fighter).find(u => u.card.id === id);
  const onField = (fighter, id) => core.fieldUnits(fighter, true).some(x => x.unit && x.unit.card.id === id && x.unit.abxNullified !== B.turnCount) || (fighter.setSpells || []).some(c => c && c.id === id);
  const isImpactC = (c) => { try { return !!(c && core.matchFilter(c, { types: ["impactMonster"] }, null, {})); } catch (e) { return false; } };
  const IMPACT_FREE = [2513, 3257, 6561];
  core.impactMultiCall = (fighter) => IMPACT_FREE.some(id => trIs(fighter, id));
  core.transformCallBlock = (fighter, card) => {
    if (!card || card.type !== "Monster" || isImpactC(card)) return null;
    const u = IMPACT_FREE.map(id => trIs(fighter, id)).find(Boolean);
    return u ? `"${u.card.name}": you cannot call monsters other than impact monsters` : null;
  };
  const isGalaxy = (c) => (c.attrs || []).some(a => /^galaxy ?exalt$/i.test(a));
  const prevProt42 = core.isProtected;
  core.isProtected = function (unit, side, kind, ctx) {
    if (prevProt42.apply(this, arguments)) return true;
    try {
      if (!unit || !unit.card) return false;
      const f = F(side), byOpp = !ctx || !ctx.side || ctx.side !== side;
      const D = ["destroyed", "returned", "returned to hand"].includes(kind), R = kind === "rest" || kind === "rested", N = kind === "nullified";
      if (kind === "souls dropped" && byOpp && isGalaxy(unit.card) && core.fieldUnits(f, true).some(x => x.unit && x.unit.card.id === 4496 && x.unit.abxNullified !== B.turnCount)) return true;   // #4496
      if (!D && !R && !N) return false;
      const me = trUnits(f).includes(unit);
      if (me && IMPACT_FREE.includes(unit.card.id) && D) return true;                       // cannot be destroyed, nor returned to hand
      if (me && unit.card.id === 6561 && (R || (N && byOpp))) return true;
      if (me && unit.card.id === 4527 && R && byOpp) return true;
      if (me && byOpp && (D || N) && trIs(f, 6226)) return true;                              // #6226: all cards you transformed into
      if (byOpp && D && /gemclone/i.test(unit.card.name || "") && isImpactC(unit.card) && trIs(f, 3257) &&
        core.fieldUnits(f, true).some(x => x.unit === unit)) return true;                    // #3257: Gemclone impact monsters
    } catch (e) { /* ignore */ }
    return false;
  };
  const prevNC = ABX.noCounterThisBattle;
  ABX.noCounterThisBattle = function (attSide, units, targetPos) {
    if (prevNC && prevNC.apply(this, arguments)) return true;
    try {
      if (targetPos === "fighter") return false;
      const f = F(attSide), us = (units || []).map(x => (x && x.unit) || x).filter(Boolean);
      const sh = us.some(u => (u.card.attrs || []).some(a => /^super ?hero$/i.test(a)));
      const sw = us.some(u => (u.card.attrs || []).some(a => /^super ?warrior$/i.test(a)));
      if (sh && trIs(f, 4224)) return true;
      if ((sh || sw) && (trIs(f, 6208) || core.fieldUnits(f, true).some(x => x.unit && /gemclone/i.test(x.unit.card.name || "") && x.unit.abxNullified !== B.turnCount))) return true;
    } catch (e) { /* ignore */ }
    return false;
  };
  // #4496: the gauge cost in the [Call Cost] and [Transform] cost of your «Galaxy Exalt» is reduced by 1
  if (typeof root.parseCardCost === "function") {
    const pccPrev = root.parseCardCost;
    root.parseCardCost = function (costStr, skill, fighter, card) {
      const r = pccPrev.apply(this, arguments);
      try {
        if (r && fighter && card && r.gauge > 0 && isGalaxy(card) && (card.type === "Monster" || card.tr) &&
          core.fieldUnits(fighter, true).some(x => x.unit && x.unit.card.id === 4496 && x.unit.abxNullified !== B.turnCount)) return Object.assign({}, r, { gauge: r.gauge - 1 });
      } catch (e) { /* ignore */ }
      return r;
    };
  }
  // #5199 Perfect Crime: six or more souls in the card you transformed into -> you win
  const crimeCheck = () => {
    if (B.matchOver) return;
    ["plr", "opp"].forEach(side => { const u = trIs(F(side), 5199); if (u && (u.soul || []).length >= 6 && !B.matchOver) OPS.winGame.run({}, { side, card: u.card }); });
  };
  const prevScan = core.scanSouls;
  core.scanSouls = async function () { const r = await prevScan.apply(this, arguments); try { crimeCheck(); } catch (e) { /* ignore */ } return r; };
  // "when you [Transform] into ..." : fire event transformInto from the equip path
  Object.assign(ABX.TRIG_OK, { transformInto: 1 });
  const prevFE = ABX.fireEquipped;
  if (prevFE) ABX.fireEquipped = function (side, card, unit) {
    const p = prevFE.apply(this, arguments);
    try { if (card && card.tr) ABX.queue(() => fireNew(side, "transformInto", (t, src) => !t.nameRe || new RegExp(t.nameRe, "i").test(card.name || ""), fieldSources(side).concat([{ card, unit, host: null }]).filter((x, i, a) => a.findIndex(y => y.card === x.card && y.unit === x.unit) === i))); } catch (e) { /* ignore */ }
    return p;
  };
  OV42.push([2160, /when you \[transform\] into a card with .caardian/i, () => ({ kind: "triggered", trigger: { event: "transformInto", nameRe: "caardian" }, once: true, steps: [{ op: "r42TopToGauge" }] })]);
  OPS.r42TopToGauge = { run(s, ctx) { const f = ctx.f; if (!f.deck.length) return false; f.gauge.push(f.deck.shift()); return true; } };
  OV42.push([4499, /when you \[transform\] into a card with .caardian/i, () => ({ kind: "triggered", trigger: { event: "transformInto", nameRe: "caardian" }, steps: [{ op: "r42Caardian4499" }] })]);
  OPS.r42Caardian4499 = { run(s, ctx) { const f = ctx.f; if (f.deck.length) { f.r42Soul4499 = (f.r42Soul4499 || 0) + 1; f.deck.shift(); } f.life = (f.life || 0) + 1; return true; } };
  const prevSB3 = ABX.staticBonus;
  ABX.staticBonus = function (fighter, unit) {
    const sb = prevSB3.apply(this, arguments);
    try {
      if (!unit || !unit.card || !sb || unit.abxNullified === B.turnCount) return sb;
      const isTr = trUnits(fighter).includes(unit);
      if (isTr && unit.card.id === 4527) sb.pen = true;
      if (isTr && /caardian/i.test(unit.card.name || "") && onField(fighter, 2160)) { sb.power += 1000; sb.pen = true; }
      if (/caardian/i.test(unit.card.name || "") && onField(fighter, 4499) && core.fieldUnits(fighter, true).some(x => x.unit === unit)) { const n = fighter.r42Soul4499 || 0; sb.pen = true; sb.power += 2000 * n; sb.defense += 2000 * n; sb.crit += n; }
    } catch (e) { /* ignore */ }
    return sb;
  };
})(typeof window !== "undefined" ? window : globalThis);
