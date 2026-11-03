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
    [5532, /choose and use one of the following two/i, (ab) => ({ kind: "modal", steps: ab.steps, options: clone(ab.options).map(o => { walk(o.steps, x => { if (x.t === "count" && x.np && x.np.filter && x.np.filter.tribes) x.np.filter.distinct = true; }); return o; }) })],
    [6494, /deals damage to your opponent, you may destroy that card/i, () => ({ kind: "rule", steps: [] })],   // handled by the [r42] "To Darkness" outcome hook
    [4788, /attacks and deals damage to your opponent, you may destroy that card/i, () => ({ kind: "rule", steps: [] })],
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
  /* ---- counter-timing cards: #124 Duel Law, #176 Demongodol Ark, #311 Yukishiro, #5741 Siegsabre ---- */
  const XCx = ABX.extraCond = ABX.extraCond || {};
  const attrHas = (c, re) => !!c && (c.attrs || []).some(a => re.test(a));
  XCx.xAttackerAttr = (c, ctx) => { const b = ABX.battleCtx; return !!(b && b.active && (b.attUnits || []).length && (b.attUnits || []).some(u => u && u.card && attrHas(u.card, new RegExp(c.attr, "i")))); };
  XCx.xAttackerWeapon = (c, ctx) => { const b = ABX.battleCtx; return !!(b && b.active && (b.attUnits || []).some(u => u && u.card && u.card.type === "Item" && attrHas(u.card, /^weapon$/i))); };
  XCx.xTargetFighter = (c, ctx) => { const b = ABX.battleCtx; return !!(b && b.active && (b.targetPos ? b.targetPos === "fighter" : !b.defUnit)); };
  ["xAttackerAttr", "xAttackerWeapon", "xTargetFighter"].forEach(t => ABX.COND_OK.add(t));
  // #5741 Messiah Arms, Siegsabre: "[Counter] [Act] When a card with "Dragon" in its attribute attacks you alone, nullify the attack."
  OV42.push([5741, /attacks you alone/i, () => ({ kind: "act", trigger: null, tags: ["counter", "act"], counter: true, conds: [{ t: "xLinkAttack", v: false }, { t: "xAttackerAttr", attr: "dragon" }, { t: "xTargetFighter" }], steps: [{ op: "nullifyAttack", src: "nullify the attack" }] })]);
  // #176 Demongodol Ark: "[Counter] [Act] When your opponent attacks with a Weapon, you may discard 1 card from your hand. If you do, destroy that Weapon."
  OPS.r42WeaponBreak = {
    async run(s, ctx) {
      const f = ctx.f, bc = ABX.battleCtx;
      if (!f.hand.length || !bc) return false;
      const weapons = (bc.attUnits || []).filter(u => u && u.card && u.card.type === "Item" && attrHas(u.card, /^weapon$/i));
      if (!weapons.length) return false;
      let hi = 0;
      if (!ABX.autoPlay && !f.isBot && f.hand.length > 1) {
        const idxs = await ABX.ui.pickCards({ title: `${ctx.card.name} - discard 1 card from your hand`, subtitle: "Then the attacking Weapon is destroyed.", cards: f.hand.map(id => ({ card: core.cardOf(id), badge: "Hand" })), min: 1, max: 1 });
        hi = (idxs && idxs.length) ? idxs[0] : 0;
      }
      f.drop.push(f.hand.splice(hi, 1)[0]);
      const att = F(bc.attSide);
      for (const w of weapons) {
        if (att.item !== w) continue;
        await core.moveRefs([{ k: "item", side: bc.attSide, pos: "item", unit: w, card: w.card, id: w.card.id }], { area: "drop zone", owner: "opp" }, ctx);
      }
      if ((bc.attUnits || []).length === weapons.length) bc.nullified = true;   // its only attacker is gone
      fresh();
      return true;
    }, check: () => true
  };
  OV42.push([176, /attacks with a weapon/i, () => ({ kind: "act", trigger: null, tags: ["counter", "act"], counter: true, conds: [{ t: "xAttackerWeapon" }, { t: "hand", who: "you", n: 1, cmp: "ge" }], steps: [{ op: "r42WeaponBreak" }] })]);
  // #311 Runaway Female Ninja, Yukishiro: "[Counter] [Act] When your opponent cast a spell on his or her main phase, you may put this card into the drop zone, and pay 1 gauge. If you do, nullify the spell."
  OPS.r42YukishiroNullify = {
    async run(s, ctx) {
      const f = ctx.f;
      if (!ctx.unit || f.gauge.length < 1) return false;
      await OPS.moveSelf.run({ op: "moveSelf", to: { area: "drop zone" } }, ctx);
      if (core.posOfUnit(f, ctx.unit) !== null) return false;   // could not leave the field
      f.drop.push(f.gauge.pop());
      return true;
    }, check: () => true
  };
  OV42.push([311, /cast a spell on his or her main phase/i, () => ({ kind: "triggered", tags: ["counter", "act"], trigger: { event: "oppCast", np: { raw: "a spell", qty: { n: 1 }, filter: { types: ["spell"] }, zone: null } }, conds: [{ t: "phase", phase: "main", who: "opp" }, { t: "gauge", who: "you", n: 1, cmp: "ge" }], steps: [{ op: "r42YukishiroNullify" }, { op: "nullifyCast", what: "spell", gate: "ifYouDo" }] })]);
  // #124 Duel Law: "When your opponent Link Attacks your Duel Dragon, he or she may pay 2 gauge. If he or she does not, nullify the attack."
  // Settled when the attack is declared (game.js calls core.attackTax): the attacker pays 2 gauge if they can; otherwise the attack does not go through.
  OV42.push([124, /link attacks your duel dragon/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);
  core.attackTax = function (attSide, units, defSide, targetPos) {
    try {
      const df = F(defSide), af = F(attSide);
      if (!units || units.length < 2) return null;
      const tgt = ["left", "center", "right"].includes(targetPos) ? df.monsters[targetPos] : null;
      if (!tgt || !attrHas(tgt.card, /^duel ?dragon$/i)) return null;
      if (!(df.setSpells || []).some(c => c.id === 124)) return null;
      if (af.gauge.length >= 2) { af.drop.push(af.gauge.pop(), af.gauge.pop()); return { msg: `💰 "Duel Law": ${af.name || "attacker"} paid 2 gauge to link attack your Duel Dragon.` }; }
      return { blocked: true, msg: `✖ "Duel Law": you must pay 2 gauge to link attack a Duel Dragon` };
    } catch (e) { return null; }
  };

  /* ---- "cannot be nullified" / Jackknife soul cards: #2462 Jackarms J Galaxion, #3997 Jackarms J. Arsenal, #3234 Death Dragon Knight, Davide ---- */
  const soulIdOf = (x) => (typeof root.getSoulCardId === "function" ? root.getSoulCardId(x) : x);
  const hasSoulCard = (u, id) => !!u && (u.soul || []).some(x => Number(soulIdOf(x)) === id);
  const isJackknife = (u) => !!(u && u.card && /jackknife/i.test(u.card.name || ""));
  // their second abilities were parsed as on-enter junk; the real effects are the hooks below
  OV42.push([2462, /cannot be nullified/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);
  OV42.push([3234, /cannot be nullified/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);
  OV42.push([3997, /dragoners' armory/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);
  const unnullPrev42 = ABX.attackUnnullifiable;
  ABX.attackUnnullifiable = function (bc) {
    if (unnullPrev42 && unnullPrev42.apply(this, arguments)) return true;
    try {
      const us = (bc && bc.attUnits) || [];
      // #2462: your impact monster with "Jackknife" in its name and this card in its soul attacks alone
      if (us.length === 1 && isJackknife(us[0]) && isImpactC(us[0].card) && hasSoulCard(us[0], 2462)) return true;
      // #3234: a «Disaster» on your field attacks a monster
      if (bc && bc.defUnit && us.some(u => u && u.card && attrHas(u.card, /^disaster$/i))) {
        const f = F(bc.attSide);
        if (core.fieldUnits(f, false).some(x => x.unit.card.id === 3234 && x.unit.abxNullified !== B.turnCount)) return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  };
  // #3997 "Dragoners' Armory": when the attack of a "Jackknife" monster with this card in its soul is nullified, it gets [Double Attack] this turn (once per turn)
  if (typeof B.executeAttackResolution === "function") {
    const earJ = B.executeAttackResolution;
    B.executeAttackResolution = function (attSide, attackerZones, targetPos, attackNullified) {
      const f = this.getFighter(attSide);
      const units = (attackerZones || []).map(z => z === "item" ? f.item : f.monsters[z]).filter(Boolean);
      const r = earJ.apply(this, arguments);
      try {
        if (attackNullified && ABX.enabled !== false) {
          for (const u of units) {
            if (!isJackknife(u) || !hasSoulCard(u, 3997) || u.abxNullified === B.turnCount) continue;
            if (f.armoryUsed === B.turnCount) continue;   // "only activates once per turn"
            f.armoryUsed = B.turnCount;
            u.tempDA = true; ABX.grantAttacks(u, 2);
            if (B.setPrompt) B.setPrompt(`⚔️ "Dragoners' Armory": "${u.card.name}" gets [Double Attack] this turn!`);
            fresh();
          }
        }
      } catch (e) { /* ignore */ }
      return r;
    };
  }

  // Mission Cards (#213 #1169 #1415): Set spells that collect the top card of the deck in their soul, then cash in at N cards.
  const missionDrop = (f, card) => { const i = (f.setSpells || []).indexOf(card); if (i < 0) return false; f.setSpells.splice(i, 1); f.drop.push(card.id); return true; };
  OPS.r42MissionAdd = {
    run(s, ctx) {
      const f = ctx.f, c = ctx.card;
      if (!c || !Array.isArray(c.soul) || !(f.setSpells || []).includes(c) || !f.deck.length) return false;
      c.soul.push(f.deck.shift());   // face down
      fresh();
      if (ABX.watchFighters) ABX.watchFighters();
      return true;
    }, check: () => true
  };
  OPS.r42MissionDone = {
    run(s, ctx) {
      const f = ctx.f, c = ctx.card;
      if (!c || !Array.isArray(c.soul) || c.soul.length < (s.n || 1)) return false;
      const soul = c.soul.splice(0, c.soul.length);
      if (!missionDrop(f, c)) { c.soul.push(...soul); return false; }
      if (s.mode === "hand") f.hand.push(...soul);
      else if (s.mode === "teamwork") { if (soul.length) f.hand.push(soul.shift()); f.gauge.push(...soul); f.life += 1; }
      else f.drop.push(...soul);
      fresh();
      if (s.mode === "aim") return OPS.r40StructuredExec.run({ op: "r40StructuredExec", text: "destroy a card on your opponent's field." }, ctx);
      return true;
    }, check: () => true
  };
  const ADV = { raw: "Adventurer", qty: { n: 1, upTo: false, all: false, any: false, each: false }, ref: null, self: false, filter: { tribes: ["Adventurer"] }, zone: null, excludeSelf: false, topN: null, soulOf: null };
  OV42.push([213, /put the top card of your deck into this card's soul face down/i, () => ({ kind: "triggered", trigger: { event: "otherAttackDestroys", np: ADV }, conds: [], steps: [{ op: "r42MissionAdd" }] })]);
  OV42.push([213, /soul becomes 2 or more/i, () => ({ kind: "triggered", trigger: { event: "soulAtLeast", n: 2, self: true }, conds: [], steps: [{ op: "r42MissionDone", n: 2, mode: "hand" }] })]);
  OV42.push([1169, /link attacks/i, () => ({ kind: "triggered", trigger: { event: "otherLink", np: ADV }, once: "turn", conds: [], steps: [{ op: "r42MissionAdd" }] })]);
  OV42.push([1169, /two or more cards in this card's soul/i, () => ({ kind: "triggered", trigger: { event: "soulAtLeast", n: 2, self: true }, conds: [], steps: [{ op: "r42MissionDone", n: 2, mode: "teamwork" }] })]);
  OV42.push([1415, /when you cast a spell, put the top card/i, () => ({ kind: "triggered", trigger: { event: "youCast", np: { raw: "a spell", qty: { n: 1 }, filter: { types: ["spell"] }, zone: null } }, conds: [], steps: [{ op: "r42MissionAdd" }] })]);
  OV42.push([1415, /three or more cards in this card's soul/i, () => ({ kind: "triggered", trigger: { event: "soulAtLeast", n: 3, self: true }, conds: [], steps: [{ op: "r42MissionDone", n: 3, mode: "aim" }] })]);

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
          u.tempTA = true; ABX.grantAttacks(u, 3);   // 3 attacks in total this turn; stands again if the first attack had already rested it
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
          if (o.also && o.kind === "triggered") o.also.forEach(trg => { const c3 = clone(ab); c3.trigger = trg; extra.push(c3); });   // same effect on another event
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
      if (cands.length > 0 && !ABX.autoPlay) picked = (await core.pick(cands, { qty: { n: 2, upTo: true }, raw: "up to two items with Aqulta Gwaneff in their card names", filter: {} }, ctx, { intent: "help", title: `${ctx.card.name} - equip up to two Aqulta Gwaneff items` }) || []).slice(0, 2);
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

  /* ---- [r42] conditional / unparsed protections (dead r40Static text): #367 #403 #841 #983 #1258 #1271 #1676(items) #2213 #2733 #3046 #3254 #3283 #3619
   *      #4156 #4690 #5158 #6107 #6315 #6360 #6430 #6477 #6482 #6503 #6504 #6509 #6532. One rule per card, evaluated for each source on the protected side. ---- */
  const norm = (a) => lc(a).replace(/[^a-z0-9]/g, "");
  const hasTribe = (c, n) => !!c && (c.attrs || []).some(a => norm(a) === norm(n));
  const posOfU = (fighter, unit) => ["left", "center", "right", "center2"].find(p => fighter.monsters[p] === unit) || null;
  const monsCount = (fighter) => ["left", "center", "right", "center2"].filter(p => fighter.monsters[p]).length;
  const isItemU = (fighter, unit) => ["item", "item2", "item3", "item4"].some(k => fighter[k] === unit);
  const onFieldU = (fighter, unit) => core.fieldUnits(fighter, true).some(x => x.unit === unit);
  const oneOnOne = (fighter) => monsCount(fighter) === 1 && monsCount(F(otherSide(sideOfF(fighter)))) === 1;
  const KD = (k) => k === "destroyed", KRET = (k) => k === "returned" || k === "returned to hand", KR = (k) => k === "rest" || k === "rested", KN = (k) => k === "nullified", KSD = (k) => k === "souls dropped";
  const KLEAVE = (k) => KD(k) || KRET(k) || k === "leave the field" || k === "put to other areas";
  // rule(E, S): E = { f, e, unit, kind, byOpp, byAtk, ctx }, S = { unit, card, host }; returns true when `E.unit` is protected from `E.kind`
  const PROT42 = {
    367: (E, S) => E.byAtk && KD(E.kind) && E.unit === S.unit && posOfU(E.f, S.unit) === "center" && ["left", "center", "right"].some(p => E.f.monsters[p] && E.f.monsters[p] !== S.unit && hasTribe(E.f.monsters[p].card, "Asgard")),
    403: (E, S) => !E.byAtk && KD(E.kind) && E.unit === S.unit && !!(E.ctx && E.ctx.card && E.ctx.card.type === "Spell"),
    841: (E, S) => (KD(E.kind) || KRET(E.kind)) && S.host && E.unit === S.host && hasTribe(S.host.card, "Weapon"),
    983: (E, S) => !E.byAtk && KD(E.kind) && E.unit === S.unit && oneOnOne(E.f),
    1258: (E, S) => E.byAtk && KD(E.kind) && E.unit === S.unit && ["center", "left"].includes(posOfU(E.f, S.unit)) && !!(E.f.monsters.right && hasTribe(E.f.monsters.right.card, "WydarSarkal")),
    1676: (E, S) => E.byOpp && !E.byAtk && KD(E.kind) && isItemU(E.f, E.unit),
    2213: (E, S) => E.byOpp && !E.byAtk && KD(E.kind) && E.unit === S.unit,
    2733: (E, S) => E.byOpp && !E.byAtk && KD(E.kind) && S.host && E.unit === S.host && hasTribe(S.host.card, "DragonChiefEmperor") && !!(E.ctx && E.ctx.card && E.ctx.card.type === "Monster"),
    3046: (E, S) => E.byOpp && ((KSD(E.kind) && E.unit === S.unit) || (KN(E.kind) && onFieldU(E.f, E.unit))),
    3254: (E, S) => E.byOpp && KR(E.kind) && E.unit === S.unit && (S.unit.soul || []).length >= 3,
    3283: (E, S) => E.byOpp && onFieldU(E.f, E.unit) && (KSD(E.kind) || ((KD(E.kind) || KRET(E.kind)) && (hasTribe(E.unit.card, "CrewTrooper") || hasTribe(E.unit.card, "Battleship")))),
    3619: (E, S) => onFieldU(E.f, E.unit) && ((!E.byAtk && KD(E.kind)) || (E.byOpp && (KRET(E.kind) || KSD(E.kind)))),
    4156: (E, S) => !E.byAtk && KD(E.kind) && E.unit === S.unit,
    4690: (E, S) => E.byOpp && !E.byAtk && (((KD(E.kind) || KRET(E.kind)) && E.unit === S.unit) || (KR(E.kind) && hasTribe(E.unit.card, "Bladedancer") && onFieldU(E.f, E.unit))),
    5158: (E, S) => E.unit === S.unit && (KN(E.kind) || (E.byOpp && KSD(E.kind))),
    6107: (E, S) => E.byOpp && S.host && E.unit === S.host && /heathcliff/i.test(S.host.card.name || "") && (KD(E.kind) || KRET(E.kind) || KSD(E.kind)),
    6315: (E, S) => E.byOpp && S.host && E.unit === S.host && /\[g\.boost\]/i.test(S.host.card.skill || "") && KSD(E.kind),
    6360: (E, S) => E.byOpp && !E.byAtk && (E.unit === S.unit || (hasTribe(E.unit.card, "BlackDragon") && E.unit.card.type === "Monster" && onFieldU(E.f, E.unit))) && (KD(E.kind) || KRET(E.kind) || KN(E.kind)) &&
      ["left", "center", "right", "center2"].some(p => E.f.monsters[p] && /spectral strike/i.test(E.f.monsters[p].card.name || "")),
    6430: (E, S) => E.byOpp && !E.byAtk && E.unit === S.unit && KLEAVE(E.kind) && monsCount(E.f) === 1,
    6477: (E, S) => E.unit === S.unit && ((E.byOpp && KN(E.kind)) || (E.byOpp && KSD(E.kind))),
    6482: (E, S) => E.byOpp && !E.byAtk && (KD(E.kind) || KR(E.kind)) && onFieldU(E.f, E.unit) && E.f.drop.length >= 10,
    6503: (E, S) => E.byOpp && !!S.host && hasTribe(S.host.card, "RagingSpirit") && hasTribe(E.unit.card, "RagingSpirit") && onFieldU(E.f, E.unit) && (KR(E.kind) || KN(E.kind) || KSD(E.kind)),
    6504: (E, S) => E.byOpp && E.unit === S.unit && posOfU(E.f, S.unit) === "center" && (KR(E.kind) || KN(E.kind) || KSD(E.kind)),
    6509: (E, S) => KD(E.kind) && E.unit.card.type === "Monster" && onFieldU(E.f, E.unit) && (E.f.hand.length === 0 || F(otherSide(sideOfF(E.f))).hand.length === 0),
    6532: (E, S) => E.byOpp && !E.byAtk && KD(E.kind) && onFieldU(E.f, E.unit) && ((S.unit && posOfU(E.f, S.unit) === "center") || (S.host && hasTribe(S.host.card, "PrismDragon")))
  };
  const prot42 = (unit, side, kind, ctx, byAtk) => {
    if (!unit || !unit.card) return false;
    const f = F(side), e = F(otherSide(side));
    const E = { f, e, unit, kind, byOpp: !!(byAtk || (ctx && ctx.side && ctx.side !== side)), byAtk: !!byAtk || !!(ctx && ctx.byAttack), ctx };
    const srcs = [];
    core.fieldUnits(f, true).forEach(x => { if (!x.unit) return; srcs.push({ unit: x.unit, card: x.unit.card, host: null }); (x.unit.soul || []).forEach(id => { const c = core.cardOf(id); if (c) srcs.push({ unit: null, card: c, host: x.unit }); }); });
    (f.setSpells || []).forEach(c => srcs.push({ unit: null, card: c, host: null }));
    for (const S of srcs) {
      const rule = PROT42[S.card.id]; if (!rule) continue;
      if ((S.unit && S.unit.abxNullified === B.turnCount) || (S.host && S.host.abxNullified === B.turnCount)) { if (S.card.id !== 5158 && S.card.id !== 6477) continue; }
      try { if (rule(E, S)) return true; } catch (e2) { /* ignore */ }
    }
    return false;
  };
  const prevProt43 = core.isProtected;
  core.isProtected = function (unit, side, kind, ctx) {
    if (prevProt43.apply(this, arguments)) return true;
    try { return prot42(unit, side, kind, ctx, false); } catch (e) { return false; }
  };
  // protections that also stop destruction by attacks (#367 #841 #1258 #1271 #3619 #6509 ...)
  if (typeof B.destroyMonster === "function") {
    const dmPrev42 = B.destroyMonster;
    B.destroyMonster = function (side, pos) {
      try {
        const f = this.getFighter(side), u = f && f.monsters[pos];
        if (u && this._destroyByAttack && prot42(u, side, "destroyed", { side: otherSide(side) }, true)) return false;
      } catch (e) { /* ignore */ }
      return dmPrev42.apply(this, arguments);
    };
  }
  // stat parts of the same abilities: #983 (one-on-one +2000/+2000), #6430 (only one monster: +10000, crit +2), #6509 (crit +2), #6532 (all cards +5000/+5000)
  const prevSB4 = ABX.staticBonus;
  ABX.staticBonus = function (fighter, unit) {
    const sb = prevSB4.apply(this, arguments);
    try {
      if (!unit || !unit.card || !sb || unit.abxNullified === B.turnCount) return sb;
      const id = unit.card.id;
      if (id === 983 && oneOnOne(fighter)) { sb.power += 2000; sb.defense += 2000; }
      if (id === 6430 && monsCount(fighter) === 1) { sb.power += 10000; sb.crit += 2; }
      if (id === 6509 && (fighter.hand.length === 0 || F(otherSide(sideOfF(fighter))).hand.length === 0)) sb.crit += 2;
      if (onFieldU(fighter, unit) && core.fieldUnits(fighter, true).some(x => x.unit && x.unit.card.id === 6532 && x.unit.abxNullified !== B.turnCount &&
        (posOfU(fighter, x.unit) === "center" || false))) { sb.power += 5000; sb.defense += 5000; }
    } catch (e) { /* ignore */ }
    return sb;
  };
  // #4156: you cannot be dealt damage by card effects; #6532: by your opponent's card effects
  const prevAD3 = core.applyDamage;
  core.applyDamage = function (side, n, src) {
    try {
      if (src && src.kind === "effect" && n > 0 && !src.unreducible) {
        const f = F(side);
        if (core.fieldUnits(f, true).some(x => x.unit && x.unit.card.id === 4156 && x.unit.abxNullified !== B.turnCount)) return 0;
        if (core.fieldUnits(f, true).some(x => x.unit && x.unit.card.id === 6532 && x.unit.abxNullified !== B.turnCount && posOfU(f, x.unit) === "center") && src.sourceSide && src.sourceSide !== side) return 0;
      }
    } catch (e) { /* ignore */ }
    return prevAD3.apply(this, arguments);
  };

  /* ---- [r42] "attack cannot be nullified / damage cannot be reduced" with conditions: #2453 #2462 #3065 #3234 #3254 #4234 #5646 #6245 #6252 #6351 #6482 (+ #349 vs "Shield" cards) ---- */
  // rule(u, us, side, f) -> { nu: attack can't be nullified, nr: damage can't be reduced } | null; u = attacking unit, us = all attacking units
  const nameOnField = (fighter, re) => core.fieldUnits(fighter, true).some(x => x.unit && re.test(x.unit.card.name || ""));
  const UN42 = {
    2453: (u, us) => us.length > 1 ? { nu: true } : null,
    4234: (u, us) => us.length === 1 ? { nu: true } : null,
    6245: (u, us) => us.length === 1 ? { nu: true, nr: true } : null,
    5646: (u, us, side, f) => us.length === 1 && nameOnField(f, /natsuki kimura/i) ? { nu: true, nr: true } : null,
    6351: (u, us, side, f) => us.length === 1 && (f.setSpells || []).filter(c => c && hasTribe(c, "DarkBurial")).length >= 3 ? { nu: true, nr: true } : null,
    6482: (u, us, side, f) => us.length === 1 && f.drop.length >= 20 ? { nu: true, nr: true } : null,
    3254: (u, us) => us.length === 1 && (u.soul || []).length >= 3 ? { nu: true } : null,
    6252: (u, us) => us.length === 2 && us.some(o => o !== u && hasTribe(o.card, "Medabot")) ? { nu: true } : null
  };
  // cards in the soul of the attacker: 2462 (impact monster "Jackknife"), 3065 («Neodragon»)
  const SOULUN = {
    2462: (u, us) => us.length === 1 && /jackknife/i.test(u.card.name || "") && isImpactC(u.card),
    3065: (u, us) => us.length === 1 && hasTribe(u.card, "Neodragon")
  };
  const unRes = (side, us, bc) => {
    const f = F(side); let nu = false, nr = false;
    for (const u of us) {
      if (!u || !u.card || u.abxNullified === B.turnCount) continue;
      const r = UN42[u.card.id] && UN42[u.card.id](u, us, side, f);
      if (r) { nu = nu || !!r.nu; nr = nr || !!r.nr; }
      (u.soul || []).forEach(id => { if (SOULUN[id] && SOULUN[id](u, us)) nu = true; });
    }
    // #3234: when a «Disaster» on your field attacks a monster, that attack cannot be nullified
    if (bc && bc.defUnit && us.some(u => u && hasTribe(u.card, "Disaster")) && core.fieldUnits(f, true).some(x => x.unit && x.unit.card.id === 3234 && x.unit.abxNullified !== B.turnCount)) nu = true;
    return { nu, nr };
  };
  const prevAU = ABX.attackUnnullifiable;
  ABX.attackUnnullifiable = function (bc) {
    if (prevAU && prevAU.apply(this, arguments)) return true;
    try { return unRes(bc.attSide, bc.attUnits || [], bc).nu; } catch (e) { return false; }
  };
  const prevAR = ABX.attackUnreducible;
  ABX.attackUnreducible = function (attSide, units) {
    if (prevAR && prevAR.apply(this, arguments)) return true;
    try { return unRes(attSide, (units || []).map(x => (x && x.unit) || x).filter(Boolean), ABX.battleCtx).nr; } catch (e) { return false; }
  };
  // #349 Excalibur: if it is the only card attacking, its attack cannot be nullified by a card with "Shield" in its name
  const nullRunPrev = OPS.nullifyAttack.run;
  OPS.nullifyAttack.run = function (s, ctx) {
    try {
      const bc = ABX.battleCtx;
      if (bc && bc.active && (bc.attUnits || []).length === 1 && bc.attUnits[0].card && bc.attUnits[0].card.id === 349 && bc.attUnits[0].abxNullified !== B.turnCount && /shield/i.test((ctx.card && ctx.card.name) || "")) {
        if (B.setPrompt) B.setPrompt("⚠️ That attack cannot be nullified!");
        return false;
      }
    } catch (e) { /* ignore */ }
    return nullRunPrev.apply(this, arguments);
  };

  /* ---- [r42] zone-change events + data-driven trigger table (wrong-trigger cards: text parsed as "enter" or a heuristic text executor) ----
   * Events detected by before/after snapshots around the outermost ability run: deckToDrop, fieldToHand, handDiscard, gaugeUp.
   * Trigger fields: owner ("you"|"opp": whose zone changed), by ("you": caused by my card effect), turn ("you"|"opp"), other (not this card), np (filter of the moved card). */
  Object.assign(ABX.TRIG_OK, { draw: () => true, handUp: () => true, enterFromDrop: () => true, deckToDrop: () => true, fieldToHand: () => true, handDiscard: () => true, gaugeUp: () => true });
  const esc = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const TG = (id, snippet, trigger, effect, opts) => OV42.push([id, new RegExp(esc(snippet), "i"), (ab) => {
    const p2 = ABX.parseSentenceSteps(effect, {});
    if (!p2 || (p2.unparsed && p2.unparsed.length) || !p2.steps.length) return null;
    return { kind: "triggered", trigger, conds: (opts && opts.conds) || [], once: opts && opts.once, steps: ((opts && opts.pre) || []).concat(p2.steps), also: opts && opts.also };
  }]);
  const msDiff = (a, b) => { const m = new Map(); a.forEach(x => m.set(x, (m.get(x) || 0) + 1)); b.forEach(x => m.set(x, (m.get(x) || 0) - 1)); const out = []; m.forEach((v, k) => { for (let j = 0; j < v; j++) out.push(k); }); return out; };
  const inter = (a, b) => { const m = new Map(); b.forEach(x => m.set(x, (m.get(x) || 0) + 1)); const out = []; a.forEach(x => { const v = m.get(x) || 0; if (v > 0) { out.push(x); m.set(x, v - 1); } }); return out; };
  const snapSide = (side) => {
    const f = F(side);
    return { hand: f.hand.slice(), drop: f.drop.slice(), deck: f.deck.slice(), gauge: f.gauge.length,
      field: core.fieldUnits(f, true).filter(x => x.unit).map(x => x.unit.card.id).concat((f.setSpells || []).filter(Boolean).map(c => c.id)) };
  };
  const unitsOf = (data) => (data.units || []).filter(Boolean);
  const anyFieldMatch = (side, filter) => core.fieldUnits(F(side), true).some(x => x.unit && x.unit.abxNullified !== B.turnCount && core.matchFilter(x.unit.card, filter || {}, { unit: x.unit, side }, { f: F(side) }));
  function matchEv(t, src, side, data) {
    const own = t.owner || "you", rel = data.owner ? (data.owner === side ? "you" : "opp") : null;
    if (src.host && !t.hostIn) return false;
    if (!src.host && t.hostIn) return false;
    if (rel && own !== "any" && own !== rel) return false;
    if (t.turn === "you" && B.activeSide !== side) return false;
    if (t.turn === "opp" && B.activeSide === side) return false;
    if (t.by === "you" && data.actor !== side) return false;
    if (t.by === "attack" && !data.byAttack) return false;
    if (t.by === "effect" && data.byAttack) return false;
    if (t.by === "yourEffect" && (data.byAttack || data.actor !== side)) return false;
    if (t.by === "oppEffect" && (data.byAttack || !data.actor || data.actor === side)) return false;
    if (t.pos && data.pos !== t.pos) return false;
    if (t.effect && !data.byEffect) return false;
    if (t.np && !(t.orSelf && unitsOf(data).includes(src.unit)) && !(data.cards || []).some(c => c && core.matchFilter(c, t.np.filter || {}, null, { f: F(side) }))) return false;
    if (t.attacker && !(data.attackers || []).some(u => u && u.card && core.matchFilter(u.card, t.attacker.filter || {}, { unit: u, side }, { f: F(side) }))) return false;
    if (t.link && !data.link) return false;
    if (t.alone && unitsOf(data).length !== 1) return false;
    if (t.selfOnly && !unitsOf(data).includes(src.unit)) return false;
    if (t.selfPos && !(src.unit && F(side).monsters[t.selfPos] === src.unit)) return false;
    if (t.defender === "you" && !(data.defSide === side && data.defUnit)) return false;
    if (t.hostIn && !(src.host && unitsOf(data).includes(src.host) && (!t.hostNp || core.matchFilter(src.host.card, t.hostNp.filter || {}, { unit: src.host, side }, { f: F(side) })))) return false;
    if (t.need && !anyFieldMatch(side, t.need.filter)) return false;
    if (t.needPos && !(F(side).monsters[t.needPos.pos] && core.matchFilter(F(side).monsters[t.needPos.pos].card, t.needPos.filter || {}, null, { f: F(side) }))) return false;
    if (t.minDifferent) { const names = new Set(); core.fieldUnits(F(side), true).forEach(x => { if (x.unit && core.matchFilter(x.unit.card, t.minDifferent.filter, null, { f: F(side) })) names.add(x.unit.card.name); }); if (names.size < t.minDifferent.n) return false; }
    return true;
  }
  async function fire42(ev, data) {
    for (const side of ["plr", "opp"]) {
      await fireNew(side, ev, (t, src) => matchEv(t, src, side, data), fieldSources(side).concat(soulSources(side)));
      if (B.matchOver) return;
    }
  }
  async function zoneEvents(actor, before) {
    const evs = [];
    ["plr", "opp"].forEach(owner => {
      const b = before[owner], a = snapSide(owner);
      const dropGain = msDiff(a.drop, b.drop), d2d = inter(msDiff(b.deck, a.deck), dropGain);
      if (d2d.length) evs.push(["deckToDrop", { owner, actor, cards: d2d.map(core.cardOf) }]);
      const disc = inter(msDiff(b.hand, a.hand), msDiff(dropGain, d2d));
      if (disc.length) evs.push(["handDiscard", { owner, actor, cards: disc.map(core.cardOf) }]);
      const back = inter(msDiff(b.field, a.field), msDiff(a.hand, b.hand));
      if (back.length) evs.push(["fieldToHand", { owner, actor, cards: back.map(core.cardOf) }]);
      if (a.gauge > b.gauge) evs.push(["gaugeUp", { owner, actor, cards: [], gaugeNow: a.gauge }]);
      const drew = inter(msDiff(a.hand, b.hand), msDiff(b.deck, a.deck));
      if (drew.length) evs.push(["draw", { owner, actor, cards: drew.map(core.cardOf) }]);
      if (a.hand.length > b.hand.length) evs.push(["handUp", { owner, actor, cards: [] }]);
      const fromDrop = inter(msDiff(a.field, b.field), msDiff(b.drop, a.drop));
      if (fromDrop.length) evs.push(["enterFromDrop", { owner, actor, cards: fromDrop.map(core.cardOf) }]);
    });
    for (const [ev, data] of evs) { await fire42(ev, data); if (B.matchOver) return; }
  }
  let zdepth = 0;
  const prevRA2 = core.runAbility;
  core.runAbility = async function (side) {
    if (zdepth > 0) return prevRA2.apply(this, arguments);
    zdepth++;
    const before = { plr: snapSide("plr"), opp: snapSide("opp") };
    let r;
    try { r = await prevRA2.apply(this, arguments); } finally { zdepth--; }
    try { await zoneEvents(side, before); } catch (e) { if (ABX.debug) console.error(e); }
    return r;
  };
  // deck -> drop
  TG(2849, "when a card is put from your deck into your drop zone", { event: "deckToDrop", owner: "you", turn: "you" }, "deal 1 damage to your opponent", { once: "turn" });
  TG(2902, "when a card is put from your deck into your drop zone", { event: "deckToDrop", owner: "you", turn: "you" }, "for this turn, this card gets [Double Attack], and deal 1 damage to your opponent", { once: "turn" });
  TG(2960, "when a card is put from your deck into your drop zone", { event: "deckToDrop", owner: "you", turn: "you" }, "for this turn, this card gets power+2000", { once: "turn" });
  TG(3968, "when a card is put from your deck into the drop zone", { event: "deckToDrop", owner: "you" }, "draw a card", { once: "turn" });
  TG(2624, "when you put a card from your opponent's deck", { event: "deckToDrop", owner: "opp", by: "you" }, "deal 1 damage to your opponent", { once: "turn" });
  TG(2659, "when you put a card from your opponent's deck", { event: "deckToDrop", owner: "opp", by: "you" }, "you gain 1 life", { once: "turn" });
  TG(3425, "when a card is put from your opponent's deck", { event: "deckToDrop", owner: "opp", by: "you" }, "put the top two cards of your opponent's deck into his or her drop zone", { once: "turn" });
  TG(5038, "when a card from your opponent's deck is dropped", { event: "deckToDrop", owner: "opp", by: "you" }, "put the top two cards of your deck into your gauge", { once: "turn" });
  TG(3964, "when a card is returned from the drop zone into the deck", { event: "deckToDrop", owner: "you", by: "you" }, "destroy a monster with 3000 defense or less on your opponent's field", { once: "turn" });
  // field -> hand
  TG(1889, "when another card returns to the hand from the field", { event: "fieldToHand", owner: "you" }, "put the top card of your deck into your gauge", { once: "turn" });
  TG(1892, "when another card returns to the hand from the field", { event: "fieldToHand", owner: "you" }, "you gain 1 life", { once: "turn" });
  TG(1916, "whenever a card returns to the hand from the field", { event: "fieldToHand", owner: "you" }, "you gain 1 life", { once: "turn" });
  TG(3251, "when another card on your field returns to your hand", { event: "fieldToHand", owner: "you" }, "you may return this card to your hand");
  TG(3267, "when a card on your field is returned from your field to hand", { event: "fieldToHand", owner: "you" }, "for this turn, a card on your field gets power+1000 and defense+1000");
  TG(4500, "when a «superhero» or «superheroine» on your field is returned to hand", { event: "fieldToHand", owner: "you", np: { filter: { tribes: ["Superhero", "Superheroine"] } } }, "you gain 2 life, and draw a card", { once: "turn" });
  TG(4752, "when cards on your opponent's field are returned to hand by your card effects", { event: "fieldToHand", owner: "opp", by: "you" }, "your opponent chooses and drops a hand card", { once: "turn" });
  // hand discards
  TG(2745, "when a card is discarded from your hand", { event: "handDiscard", owner: "you" }, "you gain 1 life, and for this turn, this card gets critical+1", { once: "turn" });
  TG(3942, "when a card is discarded from your hand", { event: "handDiscard", owner: "you" }, "return up to two cards on your opponent's field to the hand", { once: "turn" });
  // opponent gauge
  TG(1397, "when a card is put into your opponent's gauge", { event: "gaugeUp", owner: "opp" }, "deal 1 damage to your opponent", { once: "turn" });
  TG(5102, "when a card is put into your opponent's gauge by card effects", { event: "gaugeUp", owner: "opp", by: "you", turn: "you" }, "you gain 2 life, and draw a card", { once: "turn" });

  /* ---- [r42] wave B: destroyed / damage taken / attacks (events cardDestroyed, damageTaken, cardAttacks) ---- */
  Object.assign(ABX.TRIG_OK, { cardDestroyed: () => true, damageTaken: () => true, cardAttacks: () => true });
  const prevFOD = ABX.fireOtherDestroyed;
  ABX.fireOtherDestroyed = function (side, card, unit, pos) {
    const r = prevFOD.apply(this, arguments);
    try {
      const data = { owner: side, cards: [card], units: [unit], actor: (unit && unit.abxDestroyedBy) || null, byAttack: !!B._destroyByAttack, attackers: (B._attackersNow || []).slice() };
      ABX.queue(() => fire42("cardDestroyed", data));
    } catch (e) { /* ignore */ }
    return r;
  };
  const prevAD4 = core.applyDamage;
  core.applyDamage = function (side, n, src) {
    const dealt = prevAD4.apply(this, arguments);
    try {
      if (dealt > 0) {
        const byEffect = !!(src && src.kind === "effect");
        const data = { owner: side, cards: [], byEffect, actor: byEffect ? ((src && src.sourceSide) || ABX.curEffectSide || null) : null, amount: dealt };
        ABX.queue(() => fire42("damageTaken", data));
      }
    } catch (e) { /* ignore */ }
    return dealt;
  };
  const prevFA = ABX.fireAttack;
  ABX.fireAttack = function (attSide, units, defSide, targetPos) {
    const r = prevFA.apply(this, arguments);
    try {
      const us = (units || []).map(x => (x && x.unit) || x).filter(Boolean);
      const data = { owner: attSide, units: us, attackers: us, cards: us.map(u => u.card), link: us.length > 1, defSide, defUnit: ["left", "center", "right"].includes(targetPos) ? F(defSide).monsters[targetPos] : null, actor: attSide };
      ABX.queue(() => fire42("cardAttacks", data));
    } catch (e) { /* ignore */ }
    return r;
  };
  OPS.r42DamageOwnCrit = { run(s, ctx) {
    const u = ctx.unit; if (!u) return false;
    const st = root.getUnitEffectiveCombatStats ? root.getUnitEffectiveCombatStats(ctx.f, u) : { crit: u.card.crit || 1 };
    const dealt = core.applyDamage(otherSide(ctx.side), st.crit || 1, { kind: "effect", sourceSide: ctx.side, card: ctx.card });
    try { B.checkWinCondition(); } catch (e) { /* ignore */ }
    return dealt > 0;
  } };
  const NPT = (t) => ({ get filter() { return ABX.parseNP(t).filter; } });
  // destroyed
  TG(213, "when an opponent's monster is destroyed by an attack of your adventurer", { event: "cardDestroyed", owner: "opp", by: "attack", attacker: NPT("an Adventurer") }, "put the top card of your deck into this card's soul");
  TG(215, "when your adventurer is destroyed by an attack", { event: "cardDestroyed", owner: "you", by: "attack", np: NPT("an Adventurer") }, "put up to two Adventurer from your drop zone into your hand. Then, put this card into the drop zone");
  TG(756, "when a monster with", { event: "cardDestroyed", owner: "you", by: "effect", np: NPT('a monster with "Purgatory Knights" in its card name') }, "put the top card of your deck into your gauge");
  TG(1305, "during your turn, when your opponent's monster is destroyed", { event: "cardDestroyed", owner: "opp", turn: "you" }, "deal 1 damage to your opponent", { once: "turn" });
  TG(1420, "when your card destroys your opponent's monster", { event: "cardDestroyed", owner: "opp", by: "you" }, "put the top card of your deck into this card's soul");
  TG(2605, "when a «superhero» on your field destroys a card on your opponent's field", { event: "cardDestroyed", owner: "opp", by: "attack", attacker: NPT("a «Superhero»") }, "deal 1 damage to your opponent", { once: "turn" });
  TG(2951, "during your opponent's turn, when a", { event: "cardDestroyed", owner: "you", turn: "opp", np: NPT("a «Prism Dragon»") }, "you gain 1 life");
  TG(3246, "when a monster on your opponent's field is destroyed by an attack of your black dragon or demon lord", { event: "cardDestroyed", owner: "opp", by: "attack", attacker: NPT("a «Black Dragon» or «Demon Lord»") }, "put a card from your opponent's gauge into the drop zone and deal 1 damage to your opponent", { once: "turn" });
  TG(3688, "when a card on your field is destroyed by your card effects", { event: "cardDestroyed", owner: "you", by: "yourEffect" }, "[Stand] this card", { once: "turn" });
  TG(4045, "when a «duel golem» on your field is destroyed by card effects", { event: "cardDestroyed", owner: "you", by: "effect", np: NPT("a «Duel Golem»") }, "you gain 1 life");
  TG(4197, "when an «evil deity dragon» on your field destroys your opponent's card", { event: "cardDestroyed", owner: "opp", by: "attack", attacker: NPT("an «Evil Deity Dragon»") }, "put the top card of your deck into your gauge, draw a card, and deal 1 damage to your opponent", { once: "turn" });
  TG(4205, "when a card with", { event: "cardDestroyed", owner: "opp", by: "attack", attacker: NPT('a card with "Masked Vantage" in its card name') }, "[Stand] a «Superhero» on your field");
  TG(5314, "when an", { event: "cardDestroyed", owner: "opp", by: "attack", attacker: NPT("an «FBI»") }, "put the top card of your deck into your gauge, you gain 1 life and draw a card", { once: "turn" });
  TG(5625, "when your opponent's character is destroyed", { event: "cardDestroyed", owner: "opp" }, "draw a card", { once: "turn" });
  TG(6112, "when your cards destroy your opponent's characters", { event: "cardDestroyed", owner: "opp", by: "you" }, "you may drop a soul from this card");
  TG(6560, "when your opponent's monster is destroyed", { event: "cardDestroyed", owner: "opp" }, "drop up to the top two cards of your opponent's deck, and deal 1 damage to your opponent");
  // damage dealt / taken
  TG(5634, "when an «idol» on your field deals damage to your opponent", { event: "dealsDamage", np: NPT("an «Idol»") }, "you gain 1 life");
  OV42.push([5652, /when \[nagi hisakawa\] on your field deals damage to your opponent/i, () => ({ kind: "triggered", trigger: { event: "dealsDamage", np: NPT("[Nagi Hisakawa]") }, conds: [], steps: [{ op: "r42DamageOwnCrit" }] })]);
  TG(3839, "when your opponent is dealt damage during their turn", { event: "damageTaken", owner: "opp", turn: "opp" }, "put the top card of your deck into your gauge, and draw a card", { once: "turn" });
  TG(4143, "when your card effects deal damage to your opponent", { event: "damageTaken", owner: "opp", by: "you", effect: true, need: NPT('a monster with "Yamigedo" in its card name') }, "deal 1 damage to your opponent, and draw a card", { once: "turn" });
  TG(6446, "when your opponent takes damage by your card effects", { event: "damageTaken", owner: "opp", by: "you", effect: true }, "you may put the top card of your deck into your gauge");
  // attacks
  TG(1169, "when an adventurer on your field link attacks", { event: "cardAttacks", owner: "you", link: true, np: NPT("an Adventurer") }, "put the top card of your deck face down into this card's soul", { once: "turn" });
  TG(1236, "when a hero on your field link attacks", { event: "cardAttacks", owner: "you", link: true, np: NPT("a Hero") }, "draw a card", { once: "turn" });
  TG(3209, "when a card on your field link attacks", { event: "cardAttacks", owner: "you", link: true }, "you gain 1 life, and deal 1 damage to your opponent", { once: "turn" });
  TG(5672, "when a card on your opponent's field attacks alone", { event: "cardAttacks", owner: "opp", alone: true }, "deal 1 damage to your opponent");
  TG(3484, "when a monster on your field is being attacked", { event: "cardAttacks", owner: "opp", defender: "you" }, "put the top two cards of your deck into the gauge", { once: "turn" });
  TG(2961, "when your opponent attacks and you have a size 3", { event: "cardAttacks", owner: "opp", need: NPT("a size 3 «Raging Spirit»") }, "draw a card", { once: "turn" });
  TG(5412, "when this card on the right attacks", { event: "cardAttacks", owner: "you", selfOnly: true, selfPos: "right", needPos: { pos: "center", filter: { tribes: ["Astrodragon"] } } }, "for this turn, this card gets [Triple Attack]");
  TG(4177, "when a «weapon» with this card is in its soul attacks", { event: "cardAttacks", owner: "you", hostIn: true, hostNp: NPT("a «Weapon»") }, "you gain 1 life, and draw a card", { once: "turn" });
  OV42.push([6270, /when this card or a \[gun-king\]/i, () => ({ kind: "triggered", trigger: { event: "cardAttacks", owner: "you", orSelf: true, np: NPT("a [Gun-King], [First Ace] or [Mayqueen]") }, conds: [], steps: ABX.parseSentenceSteps("deal 1 damage to your opponent", {}).steps })]);

  /* ---- [r42] wave C: Thunder Mine variants (unitEnters / itemEquipped / spellSet events) and "would leave" replacements (#4132 #4970 #5954) ---- */
  Object.assign(ABX.TRIG_OK, { unitEnters: () => true, itemEquipped: () => true, spellSet: () => true });
  if (ABX.fireOtherEnter) {
    const prevFOE = ABX.fireOtherEnter;
    ABX.fireOtherEnter = function (side, unit) {
      const r = prevFOE.apply(this, arguments);
      try {
        if (unit && unit.card) {
          const data = { owner: side, units: [unit], cards: [unit.card], pos: posOfU(F(side), unit), actor: B.abxEffectSide || null };
          ABX.queue(() => fire42("unitEnters", data));
        }
      } catch (e) { /* ignore */ }
      return r;
    };
  }
  const prevFE2 = ABX.fireEquipped;
  if (prevFE2) ABX.fireEquipped = function (side, card, unit) {
    const r = prevFE2.apply(this, arguments);
    try { ABX.queue(() => fire42("itemEquipped", { owner: side, cards: [card], units: [unit], actor: side })); } catch (e) { /* ignore */ }
    return r;
  };
  if (typeof B.resolveCastSpell === "function") {
    const rcs2 = B.resolveCastSpell;
    B.resolveCastSpell = function (side, c, cid) {
      const r = rcs2.apply(this, arguments);
      try { if (c && c.set && (this.getFighter(side).setSpells || []).includes(c)) ABX.queue(() => fire42("spellSet", { owner: side, cards: [c], actor: side })); } catch (e) { /* ignore */ }
      return r;
    };
  }
  TG(1324, "when a monster enters your opponent's field on their left", { event: "unitEnters", owner: "opp", pos: "left" }, "deal 1 damage to your opponent", { once: "turn" });
  TG(1552, "when your opponent equips an item", { event: "itemEquipped", owner: "opp" }, "deal 1 damage to your opponent", { once: "turn" });
  TG(1552, "when your opponent [set] a spell", { event: "spellSet", owner: "opp" }, "deal 1 damage to your opponent", { once: "turn" });
  TG(1971, "when a monster with [move] enters your opponents field", { event: "unitEnters", owner: "opp", np: NPT("a monster with [Move]") }, "deal 1 damage to your opponent", { once: "turn" });
  TG(5714, "when monsters enter your opponent's field by card effects", { event: "unitEnters", owner: "opp", by: "yourEffect" }, "deal 1 damage to your opponent");
  TG(6251, "during your turn, when a card is put from your opponent's field into the drop zone", { event: "cardDestroyed", owner: "opp", turn: "you" }, "deal 2 damage to your opponent");
  OV42.push([4146, /when your opponent takes damage by "thunder mine" effects/i, () => ({ kind: "triggered", trigger: { event: "effDamage", opp: true, name: "Thunder Mine" }, conds: [], once: "turn", steps: ABX.parseSentenceSteps("put the top card of your deck into your gauge, and draw a card", {}).steps })]);
  const SAVE_STEPS = () => [{ op: "moveSelf", to: { area: "drop zone", owner: "you", end: "top" }, src: "put this card into your drop zone", optional: true }, { op: "preventLeave", src: "that card remains on your field", gate: "ifYouDo" }];
  OV42.push([4132, /when a 72 pillars would leave your field/i, () => ({ kind: "triggered", trigger: { event: "wouldLeaveOther", np: ABX.parseNP("a 72 Pillars on your field"), byOpp: false }, conds: [], steps: SAVE_STEPS() })]);
  OV42.push([5954, /when an originally size 3 .time dragon. would leave your field/i, () => ({ kind: "triggered", trigger: { event: "wouldLeaveOther", np: ABX.parseNP("an originally size 3 «Time Dragon» on your field"), byOpp: false }, conds: [], steps: SAVE_STEPS() })]);
  // set spells that save a monster: #4970 Indestructible Domilord
  const SPSAVE = { 4970: (f, unit) => hasTribe(unit.card, "MAXDragon") && unit.card.name !== "Indestructible Domilord" };
  const prevWLS5 = ABX.wouldLeaveSave;
  if (prevWLS5) ABX.wouldLeaveSave = function (side, pos, unit, byAttack) {
    if (prevWLS5.apply(this, arguments)) return true;
    try {
      const f = F(side); if (!unit || !unit.card || !f) return false;
      for (const sp of (f.setSpells || []).slice()) {
        if (!sp || !SPSAVE[sp.id] || !SPSAVE[sp.id](f, unit)) continue;
        const ok = (ABX.autoPlay || side !== "plr" || typeof root.confirm !== "function") ? true : !!root.confirm(`${sp.name}: put it into the drop zone to keep "${unit.card.name}" on the field?`);
        if (!ok) continue;
        f.setSpells.splice(f.setSpells.indexOf(sp), 1); f.drop.push(sp.id);
        if (B.setPrompt) B.setPrompt(`🛡️ "${sp.name}" kept "${unit.card.name}" on the field!`);
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  };

  /* ---- [r42] dead statics batch 2: damage rules, conditional stats, sizes, opponent restrictions, replacements ----
   * Damage: #343 #4971 (pay gauge to reduce), #3186 #5722 #5838 (reductions), #3480 #4859 #5385 (immunities), #5875 (unreducible), #6446 (+1).
   * Stats: #1124 #2040 #2369 #2382 #2755 #3205 #4433 #4508 #4887 #5470 #5507 #5870 #6243 #3945. Sizes: #2218 #2307 #2314 #2443 #3605 #4508 #5310 #5836 #6379.
   * Restrictions: #1436 #2112 #3311 (opp monsters can't return/move), #335 (no link attack), #3945, #5012, #2684, #6260, no-[Counter] #3530 #3946 #5468 #5870 #6243. */
  const fieldHas = (fighter, id) => core.fieldUnits(fighter, true).some(x => x.unit && x.unit.card.id === id && x.unit.abxNullified !== B.turnCount);
  const fieldUnitOf = (fighter, id) => { const x = core.fieldUnits(fighter, true).find(y => y.unit && y.unit.card.id === id && y.unit.abxNullified !== B.turnCount); return x ? x.unit : null; };
  const monsList = (fighter) => ["left", "center", "right", "center2"].map(p => fighter.monsters[p]).filter(Boolean);
  const cardsIn = (ids) => (ids || []).map(id => core.cardOf(typeof id === "object" && id ? (id.id != null ? id.id : id.cardId) : id)).filter(Boolean);
  const origSize = (c) => c.size || 0;
  // ---- damage ----
  const prevAD5 = core.applyDamage;
  core.applyDamage = function (side, n, src) {
    try {
      if (n > 0 && !B.matchOver) {
        const f = F(side), isEff = !!(src && src.kind === "effect"), esrc = isEff ? ((src && src.sourceSide) || ABX.curEffectSide || null) : null;
        const ecard = (src && src.card) || (isEff ? ABX.curEffectCard : null) || null;
        const foe = F(otherSide(side));
        if (isEff && esrc === otherSide(side) && fieldHas(foe, 5875)) { src = Object.assign({}, src, { unreducible: true }); }   // #5875: damage the opponent takes by your cards cannot be reduced
        if (isEff && esrc === otherSide(side) && ecard && hasTribe(ecard, "Excelblade") && fieldHas(foe, 6446)) n += 1;                       // #6446
        const unred = !!(src && src.unreducible);
        const byOppEff = isEff && esrc === otherSide(side);
        if (isEff && fieldUnitOf(f, 3480) && posOfU(f, fieldUnitOf(f, 3480)) === "center") return 0;                           // #3480
        if (byOppEff && ecard && ecard.type === "Monster" && (fieldHas(f, 4859) || fieldHas(f, 5385))) return 0;                // #4859 / #5385
        if (!unred) {
          if (byOppEff && fieldHas(f, 3186)) n -= 1;                                                                           // #3186
          if (isEff) { const dr = fieldUnitOf(f, 5722) || [f.item, f.item2].find(it => it && it.card.id === 5722); if (dr) { const names = new Set(); monsList(f).forEach(u => { if (hasTribe(u.card, "Dragod")) names.add(u.card.name); }); n -= names.size; } }   // #5722
          if (!(src && src.kind === "attack") && [f.item, f.item2].some(it => it && it.card.id === 5838 && it.abxNullified !== B.turnCount)) n -= 1;                  // #5838
          if (n > 0) {
            for (const [id, pay, cut] of [[343, 2, 2], [4971, 1, 5]]) {
              const holder = id === 343 ? [f.item, f.item2].find(it => it && it.card.id === id && it.abxNullified !== B.turnCount) : fieldUnitOf(f, id);
              if (!holder || f.gauge.length < pay) continue;
              const ok = (ABX.autoPlay || side !== "plr" || typeof root.confirm !== "function") ? true : !!root.confirm(`${holder.card.name}: pay ${pay} gauge to reduce the damage by ${cut}?`);
              if (!ok) continue;
              for (let k = 0; k < pay; k++) f.drop.push(f.gauge.pop());
              n -= cut; break;
            }
          }
          if (n <= 0) return 0;
        }
      }
    } catch (e) { /* ignore */ }
    return prevAD5.call(this, side, n, src);
  };
  // ---- stats ----
  const prevSB5 = ABX.staticBonus;
  const stat5 = (fighter, unit, sb) => {
    const id = unit.card.id, side = sideOfF(fighter), foe = F(otherSide(side)), dropCards = fighter.drop.map(core.cardOf).filter(Boolean);
    if (id === 1124) { const sum = (unit.soul || []).map(core.cardOf).filter(c => c && hasTribe(c, "Weapon")).reduce((a, c) => a + (c.crit || 1), 0); sb.crit += sum - (unit.card.crit || 1); if ((unit.soul || []).length >= 3) sb.pen = true; }
    if (id === 2040 && monsList(fighter).some(u => hasTribe(u.card, "Neodragon") && (u.soul || []).length >= 1)) sb.power += 3000;
    if (id === 2369) { const w = equippedItems(fighter).filter(u => hasTribe(u.card, "Weapon")).map(u => u.card.crit || 1); if (w.length) sb.crit += Math.max(...w) - (unit.card.crit || 1); }
    if (id === 2382 && (monsList(fighter).some(u => (u.soul || []).length) || fighter.drop.length === 0)) sb.crit += 1;
    if (id === 2755 && dropCards.every(c => c.type === "Monster" && origSize(c) <= 1)) { sb.power += 3000; sb.defense += 3000; sb.crit += 2; }
    if (id === 4433 && (unit.soul || []).some(sid => { const c = core.cardOf(sid); return c && hasTribe(c, "Weaponry"); })) { sb.power += 3000; sb.defense += 3000; sb.crit += 1; }
    if (id === 4887 && monsCount(fighter) === 1) { sb.power += 2000; sb.defense += 2000; sb.crit += 1; }
    if (id === 5470 && monsCount(fighter) === 1) { sb.power += 8000; sb.crit += 3; }
    if (id === 6243 && fighter.deck.length <= 10) sb.crit += 2;
    if (id === 5870) { const names = new Set((unit.soul || []).map(core.cardOf).filter(c => c && hasTribe(c, "AssistWeapon")).map(c => c.name)); if (names.size >= 4) { sb.pen = true; sb.qa = true; } }
    // sources on the same field that boost others
    const centerU = fighter.monsters.center;
    if (centerU === unit && fieldHas(fighter, 3205) && dropCards.filter(c => hasTribe(c, "Fairy") || hasTribe(c, "DemonLord")).length >= 7) sb.crit += 2;
    if (onFieldU(fighter, unit)) { const k4508 = fieldHas(fighter, 4508) ? equippedItems(fighter).length : 0; if (k4508) sb.power += 2000 * k4508; }
    // opponent-side effects on this unit: #5507 (two+ different Idol: all opponent cards power-5000, crit-2), #3945 (crit-1)
    if (onFieldU(fighter, unit)) {
      const o5507 = fieldUnitOf(foe, 5507);
      if (o5507) { const names = new Set(); monsList(foe).forEach(u => { if (hasTribe(u.card, "Idol")) names.add(u.card.name); }); if (names.size >= 2) { sb.power -= 5000; sb.crit -= 2; } }
      if (fieldUnitOf(foe, 3945) && ["left", "right"].some(p => foe.monsters[p]) && !foe.monsters.center) sb.crit -= 1;
    }
  };
  ABX.staticBonus = function (fighter, unit) {
    const sb = prevSB5.apply(this, arguments);
    try { if (unit && unit.card && sb && unit.abxNullified !== B.turnCount) stat5(fighter, unit, sb); } catch (e) { /* ignore */ }
    return sb;
  };
  // ---- sizes ----
  const prevSD5 = ABX.sizeDelta;
  ABX.sizeDelta = function (fighter, card, unit) {
    let d = prevSD5.apply(this, arguments);
    try {
      if (!card || !unit || unit.abxNullified === B.turnCount || !["left", "center", "right", "center2"].some(p => fighter.monsters[p] === unit)) return d;
      const pos = posOfU(fighter, unit), osz = origSize(card);
      const src = (id) => fieldUnitOf(fighter, id);
      if (hasTribe(card, "SkullWarrior") && osz === 1 && src(2218)) d -= 1;
      if (osz <= 2 && hasTribe(card, "Star") && (pos === "left" || pos === "right") && src(2307) && posOfU(fighter, src(2307)) === "center") d -= osz;
      if (osz <= 2 && hasTribe(card, "Star") && src(2314) === null && fighter.item && false) d += 0;
      if (osz <= 2 && hasTribe(card, "Star") && equippedItems(fighter).some(u => u.card.id === 2314 && u.abxNullified !== B.turnCount) && monsList(fighter).some(u => /zodiac/i.test(u.card.name || ""))) d -= osz;
      if (card.id === 2443 && fighter.buddyId) { const bc = core.cardOf(fighter.buddyId); if (bc && hasTribe(bc, "Star")) d -= 1; }
      if (pos === "center" && (hasTribe(card, "SkullWarrior") || hasTribe(card, "Water")) && ["left", "right"].some(p => fighter.monsters[p] && fighter.monsters[p].card.id === 3605 && fighter.monsters[p].abxNullified !== B.turnCount)) d -= 2;
      if (card.id === 4508 && equippedItems(fighter).length) d -= equippedItems(fighter).length;
      if (card.id === 5310 && pos === "center" && ["left", "right"].some(p => fighter.monsters[p] && (hasTribe(fighter.monsters[p].card, "Police") || /detective/i.test((fighter.monsters[p].card.attrs || []).join(" "))))) d -= 2;
      if (hasTribe(card, "WesternYokai") && card.id !== 5836 && !/backbeard/i.test(card.name || "") && src(5836)) d -= 1;
      if (osz <= 2 && hasTribe(card, "Godpunk") && equippedItems(fighter).some(u => u.card.id === 6379 && u.abxNullified !== B.turnCount)) d -= 2;
    } catch (e) { /* ignore */ }
    return d;
  };
  // ---- restrictions on the opponent ----
  const OPP_NORETURN = [1436, 2112, 3311];
  const prevProt6 = core.isProtected;
  core.isProtected = function (unit, side, kind, ctx) {
    if (prevProt6.apply(this, arguments)) return true;
    try {
      if (!unit || !unit.card) return false;
      const foe = F(otherSide(side));
      if (KRET(kind) && unit.card.type === "Monster" && OPP_NORETURN.some(id => fieldHas(foe, id)) && monsList(F(side)).includes(unit)) return true;     // opponent monsters cannot return to hand
      if (kind === "souls dropped" && false) return false;
      if ((KD(kind) || KRET(kind)) && fieldHas(F(side), 4887) && monsCount(F(side)) === 1 && ctx && ctx.side && ctx.side !== side && onFieldU(F(side), unit)) return true;   // #4887
    } catch (e) { /* ignore */ }
    return false;
  };
  OV42.push([1436, /all monsters on your opponent's field cannot \[move\]/i, () => ({ kind: "static", conds: [], steps: [{ op: "static", kind: "oppNoMove" }] })]);
  OV42.push([2112, /all monsters on your opponent's field cannot \[move\]/i, () => ({ kind: "static", conds: [], steps: [{ op: "static", kind: "oppNoMove" }] })]);
  OV42.push([3311, /all monsters on your opponent's field cannot \[move\]/i, () => ({ kind: "static", conds: [], steps: [{ op: "static", kind: "oppNoMove" }] })]);
  OV42.push([2684, /you may not call monsters to the center/i, () => ({ kind: "static", conds: [], steps: [{ op: "static", kind: "noCallPos", pos: "center" }] })]);
  core.attackBlocked = function (attSide, units, defSide, targetPos) {
    try {
      const df = F(defSide);
      const tgt = ["left", "center", "right"].includes(targetPos) ? df.monsters[targetPos] : null;
      if (tgt && units.length > 1 && tgt.card.id === 335 && tgt.abxNullified !== B.turnCount) return `"${tgt.card.name}" cannot be link attacked`;   // #335
      if ((targetPos === "left" || targetPos === "right") && fieldHas(df, 3945) && ["left", "right"].some(p => df.monsters[p]) && !df.monsters.center) return `"Magnetism Ninja, Magnetic Tojiro" blocks attacks on the left or right`;
      if (units.some(u => u && u.card && u.card.id === 5461) && !core.fieldUnits(F(attSide), true).some(x => x.unit && /kirari moroboshi/i.test(x.unit.card.name || ""))) return `"${units.find(u => u.card.id === 5461).card.name}" cannot attack while [Kirari Moroboshi] is not on your field`;   // #5461
    } catch (e) { /* ignore */ }
    return null;
  };
  core.castBlock = function (fighter, card) {
    try {
      if (card && card.type === "Spell" && fighter && fieldHas(fighter, 1458)) return `"${(core.cardOf(1458) || {}).name || "Cheerful Magician"}" prevents you from casting spells`;   // #1458: while on your field you cannot cast spells
      if (card && card.type === "Impact" && !isImpactC(card) && [B.plr, B.opp].some(fx => fx && fieldHas(fx, 6260))) return `"Babbyblu" prevents casting impacts from the hand`;   // #6260
    } catch (e) { /* ignore */ }
    return null;
  };
  // no-[Counter] battles
  const prevNC2 = ABX.noCounterThisBattle;
  ABX.noCounterThisBattle = function (attSide, units, targetPos) {
    if (prevNC2 && prevNC2.apply(this, arguments)) return true;
    try {
      const f = F(attSide), us = (units || []).map(x => (x && x.unit) || x).filter(Boolean), alone = us.length === 1, u = us[0];
      if (alone && u.abxNullified !== B.turnCount) {
        if ((u.card.id === 3530 || u.card.id === 6243)) return true;
        if (u.card.id === 3946 && monsList(f).filter(m => hasTribe(m.card, "Hero")).length >= 4) return true;
        if (u.card.id === 2359 && (F("plr").drop.length >= 30 || F("opp").drop.length >= 30)) return true;   // #2359: attacking alone, 30+ cards in either drop zone
      }
      if (targetPos === "center" && us.some(m => /yuka nakano/i.test(m.card.name || "")) && fieldHas(f, 5468)) return true;
      if (targetPos !== "fighter" && us.some(m => m.card.id === 5870 && new Set((m.soul || []).map(core.cardOf).filter(c => c && hasTribe(c, "AssistWeapon")).map(c => c.name)).size >= 4)) return true;
    } catch (e) { /* ignore */ }
    return false;
  };
  // #5012: your opponent cannot draw cards by monster effects
  if (OPS.draw && OPS.draw.run) {
    const drawPrev5 = OPS.draw.run;
    OPS.draw.run = function (s, ctx) {
      try { if (ctx && ctx.card && ctx.card.type === "Monster" && fieldHas(F(otherSide(s.who === "opp" ? otherSide(ctx.side) : ctx.side)), 5012) && (s.who === "opp" ? otherSide(ctx.side) : ctx.side) !== ctx.side) return false; } catch (e) { /* ignore */ }
      return drawPrev5.apply(this, arguments);
    };
  }
  // #3945: attacks on the left/right blocked by the opponent's Magnetic Tojiro (the generic attacker-side hook has no defender, so the game.js gate uses core.attackBlocked)
  // replacements ("would leave your field, you may put this card ... that card remains")
  OV42.push([3235, /if another .wydar sarkal. or .disaster. would leave your field/i, () => ({ kind: "triggered", trigger: { event: "wouldLeaveOther", np: ABX.parseNP("a «Wydar Sarkal» or «Disaster» on your field"), byOpp: false }, conds: [], steps: SAVE_STEPS() })]);
  OV42.push([4062, /if a card with .sword of the king. in its card name other than/i, () => ({ kind: "triggered", trigger: { event: "wouldLeaveOther", np: ABX.parseNP('a card with "Sword of the King" in its card name on your field'), byOpp: false }, conds: [], steps: SAVE_STEPS() })]);
  OV42.push([4194, /if a .toilet. would leave your field by your opponent's card effects/i, () => ({ kind: "triggered", trigger: { event: "wouldLeaveOther", np: ABX.parseNP("a «Toilet» on your field"), byOpp: true }, conds: [], steps: SAVE_STEPS() })]);
  OV42.push([5561, /if an originally size 3 .evil demonic dragon. would leave your field/i, () => ({ kind: "triggered", trigger: { event: "wouldLeaveOther", np: ABX.parseNP("an originally size 3 «Evil Demonic Dragon» on your field"), byOpp: false }, conds: [], steps: SAVE_STEPS() })]);

  /* ---- [r42] dead statics batch 3: attack-through (#5612 #6494 #6523 #2118 #5374), nullify [Penetrate] (#2972), unreducible (#6494), #4681, #3076 ---- */
  const prevCAT2 = ABX.canAttackThrough;
  ABX.canAttackThrough = function (side, unit, which) {
    if (prevCAT2 && prevCAT2.apply(this, arguments)) return true;
    try {
      if (which === "own" || !unit || !unit.card) return false;
      const f = F(side);
      if (!(monsList(f).includes(unit) || equippedItems(f).includes(unit))) return false;
      if (fieldHas(f, 6523)) return true;                                                                              // #6523 all cards on your field
      if (hasTribe(unit.card, "SkullWarrior") && fieldHas(f, 6494)) return true;                                       // #6494
      if (hasTribe(unit.card, "Idol") && fieldHas(f, 5612) && core.fieldUnits(f, true).some(x => x.unit && /syoko hoshi/i.test(x.unit.card.name || ""))) return true;   // #5612
      if ((unit.soul || []).includes(2118)) return true;                                                               // #2118 in the soul of a monster
      if (/hello, happy world/i.test((unit.card.attrs || []).join(" ")) || hasTribe(unit.card, "HelloHappyWorld")) {
        if (core.fieldUnits(f, true).some(x => x.unit && x.unit.card.id === 5374 && x.unit.abxNullified !== B.turnCount) ||
          core.fieldUnits(f, true).some(x => x.unit && (x.unit.soul || []).includes(5374))) return true;               // #5374
      }
    } catch (e) { /* ignore */ }
    return false;
  };
  const prevKL = ABX.kwLost;
  ABX.kwLost = function (u, kw) {
    if (prevKL && prevKL.apply(this, arguments)) return true;
    try {
      if (kw === "penetrate" && u) {
        const side = ["plr", "opp"].find(sd => onFieldU(F(sd), u));
        if (side && equippedItems(F(otherSide(side))).some(x => x.card.id === 2972 && x.abxNullified !== B.turnCount)) return true;   // #2972 nullify [Penetrate] of all cards on your opponent's field
      }
    } catch (e) { /* ignore */ }
    return false;
  };
  const prevAR2 = ABX.attackUnreducible;
  ABX.attackUnreducible = function (attSide, units) {
    if (prevAR2 && prevAR2.apply(this, arguments)) return true;
    try {
      const f = F(attSide), us = (units || []).map(x => (x && x.unit) || x).filter(Boolean);
      if (us.length === 1 && hasTribe(us[0].card, "SkullWarrior") && fieldHas(f, 6494)) return true;                   // #6494
    } catch (e) { /* ignore */ }
    return false;
  };
  // #4681: with an «Electrodeity» soul, this card cannot leave the field by your opponent's card effects
  PROT42[4681] = (E, S) => E.byOpp && !E.byAtk && E.unit === S.unit && (KD(E.kind) || KRET(E.kind) || E.kind === "put into the drop zone" || E.kind === "leave the field" || E.kind === "put to other areas") &&
    (S.unit.soul || []).some(sid => { const c = core.cardOf(sid); return c && hasTribe(c, "Electrodeity"); });
  // #3076: during the attack phase, if this card is destroyed and put into the drop zone, return this card to hand
  const prevFOD3 = ABX.fireOtherDestroyed;
  ABX.fireOtherDestroyed = function (side, card, unit, pos) {
    const r = prevFOD3.apply(this, arguments);
    try {
      if (card && card.id === 3076 && B.phase === "attack" && unit && unit.abxNullified !== B.turnCount) {
        ABX.queue(() => {
          const f = F(side), k = f.drop.lastIndexOf(3076);
          if (k >= 0) { f.drop.splice(k, 1); f.hand.push(3076); if (B.setPrompt) B.setPrompt(`↩ "${card.name}" returned to your hand!`); fresh(); }
        });
      }
    } catch (e) { /* ignore */ }
    return r;
  };

  /* ---- [r42] wave D: draw / hand / gauge / enter-by-effect triggers (#3491 #5194 #5840 #5656 #5657 #5771 #6354 #6499) ---- */
  /* ---- wrong-trigger wave E, batch 1: leave-to-drop, phase starts, enter/transform/soul events (tests/wrong_trigger_e.js) ---- */
  const LEAVE_SELF = { event: "leave", self: true };
  TG(1644, "when this card is put from your field or deck into your drop zone", LEAVE_SELF, "put the top card of your deck into your gauge");
  TG(2531, "when this card if put into the drop zone from your field", LEAVE_SELF, "destroy a size 2 or less monster on your opponent's field", { conds: [{ t: "turn", who: "you" }], pre: [{ op: "pay", life: 1, cost: true, src: "pay 1 life" }] });
  TG(2546, "when this card is from the field into your drop zone", LEAVE_SELF, "if you do not have an \"Ozon-Z\" on your field, call this card from your drop zone without paying its [Call Cost]");
  TG(3890, "when this card is put from the field or hand into your drop zone", LEAVE_SELF, "if you have a «Wydar Sarkal» on your field, destroy a spell on your opponent's field", { also: [{ event: "discardedFromHand", self: true }] });
  TG(4275, "when this card is put from the field or hand into the drop zone", LEAVE_SELF, "put the top card of your deck into your gauge. Then, if you have a size 3 or greater monster on your field, draw a card", { once: "turn", also: [{ event: "discardedFromHand", self: true }] });
  TG(2210, "at the beginning of an attack phase", { event: "phaseStart", who: "any", phase: "attack" }, "put a soul from this card into your gauge");
  TG(2427, "at the beginning of each fighter's turn", { event: "turnStart", who: "any" }, "you may call a monster with \"Mummy\" in its card name from your drop zone by paying its [Call Cost]");
  TG(1352, "when your «brave machine» enters the field", { event: "unitEnters", owner: "you", np: NPT("a «Brave Machine»") }, "put the top card of your deck into your gauge", { once: "turn" });
  TG(6422, "when your «galaxy exalt» enters the field", { event: "unitEnters", owner: "you", np: NPT("a «Galaxy Exalt»") }, "put the top two cards of your deck into your gauge, and draw a card", { once: "turn", also: [{ event: "transformInto", nameRe: "galaxy exalt" }] });
  TG(2746, "during your turn, when a «hero» monster enters your field", { event: "unitEnters", owner: "you", turn: "you", np: NPT("a «Hero»") }, "put the top card of your deck into your gauge and put the top card of your deck into your drop zone", { once: "turn", also: [{ event: "itemEquipped", owner: "you", turn: "you", np: NPT("a «Hero»") }] });
  TG(3673, "when a soul is put into your «black dragon»", { event: "soulInto", np: Object.assign(np({ tribes: ["Black Dragon"] }, null, null, "you"), { zone: null, raw: "your «Black Dragon»" }) }, "put the top card of your deck into your gauge, and draw a card", { once: "turn" });

  /* ---- wrong-trigger wave E, batch 2: #3650 #3905 #1144 #2868 + statics #1755 #1674 #403 ---- */
  const XCe = ABX.extraCond = ABX.extraCond || {};
  XCe.xAmbush = (c, ctx) => !!(ctx && ctx.unit && (ctx.unit.calledByAmbush === true || ctx.unit.enteredByAmbush === true));
  XCe.xWeaponWithSoul = (c, ctx) => { const it = ctx.f && ctx.f.item; return !!(it && it.card && attrHas(it.card, /^weapon$/i) && (it.soul || []).length >= 1); };
  ["xAmbush", "xWeaponWithSoul"].forEach(t => ABX.COND_OK.add(t));
  OV42.push([2868, /enters the field by \[ambush\]/i, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [{ t: "xAmbush" }], steps: [{ op: "draw", who: "you", n: 1, src: "draw a card" }] })]);
  TG(3650, "if this card enters the field during your opponent's turn", { event: "enter", self: true }, "you may call a size 3 or less «Chaos» monster from your drop zone to your center without paying its [Call Cost]", { conds: [{ t: "turn", who: "opp" }] });
  TG(3905, "when this attacking card destroys your opponent's monster or deals damage", { event: "attackDestroys", self: true }, "put a card from your opponent's gauge into the drop zone. Then, if there are no cards in your opponent's gauge, deal 2 damage to your opponent", { also: [{ event: "dealsDamage", self: true }] });
  TG(1144, "when this link attacks with another", { event: "link", self: true, with: NPT("another «Superhero»") }, "choose a card in the link attack, and [Stand] it", { once: "turn" });
  // statics that were parsed as on-enter junk
  const boostSelf = (mods) => ({ op: "boost", np: { raw: "this card", qty: { n: 1, upTo: false, all: false, any: false, each: false }, ref: null, self: true, filter: {}, zone: null, excludeSelf: false, topN: null, soulOf: null, selfTail: "" }, mods: Object.assign({ power: 0, defense: 0, critical: 0, kws: [] }, mods), each: null });
  OV42.push([1755, /your life is 6 or more, this card gets critical-1/i, () => ({ kind: "static", trigger: null, conds: [{ t: "life", who: "you", n: 6, cmp: "ge" }], steps: [boostSelf({ critical: -1 })] })]);
  OV42.push([1674, /your life is 5 or less, and you are equipped with a weapon/i, () => ({ kind: "static", trigger: null, conds: [{ t: "life", who: "you", n: 5, cmp: "le" }, { t: "xWeaponWithSoul" }], steps: [boostSelf({ kws: ["double attack"] })] })]);
  OV42.push([2359, /attacking alone, if there are thirty or more cards/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);   // enforced in ABX.noCounterThisBattle
  OV42.push([1458, /you cannot cast spells/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);   // enforced in core.castBlock
  // #403 Death Curse: every monster that attacks this card is destroyed at the end of the turn
  OV42.push([403, /monsters that attack this card is destroyed/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);
  const faMarked = ABX.fireAttack;
  ABX.fireAttack = function (attSide, units, defSide, targetPos) {
    try {
      const df = F(defSide), tgt = ["left", "center", "right"].includes(targetPos) ? df.monsters[targetPos] : null;
      if (tgt && tgt.card && tgt.card.id === 403 && tgt.abxNullified !== B.turnCount) (units || []).forEach(x => { const u = (x && x.unit) || x; if (u && u.card && u.card.type !== "Item") u.abxDoomed = B.turnCount; });
    } catch (e) { /* ignore */ }
    return faMarked.apply(this, arguments);
  };
  const fteDoom = ABX.fireTurnEvent;
  ABX.fireTurnEvent = function (kind) {
    const r = fteDoom.apply(this, arguments);
    if (kind === "turnEnd") {
      const turn = B.turnCount;
      Promise.resolve(r).then(() => {
        ["plr", "opp"].forEach(sd => ["left", "center", "right"].forEach(pos => { const u = F(sd).monsters[pos]; if (u && u.abxDoomed === turn) B.destroyMonster(sd, pos); }));
      }).catch(() => {});
    }
    return r;
  };

  ABX.fire42 = fire42;
  OPS.r42GaugeTo2 = { run(s, ctx) { const e = ctx.e; let n = 0; while (e.gauge.length > 2) { e.drop.push(e.gauge.pop()); n++; } return n > 0; } };
  TG(3491, "when a monster enters your field from the drop zone", { event: "enterFromDrop", owner: "you" }, "draw a card", { once: "turn" });
  TG(5194, "when a \u00abblack organization\u00bb character enters your field by card effects", { event: "unitEnters", owner: "you", by: "yourEffect", np: NPT("a Black Organization character") }, "put the top card of your deck into your gauge, and draw a card", { once: "turn" });
  TG(5840, "when a \u00abyokai\u00bb character enters your field by card effects", { event: "unitEnters", owner: "you", by: "yourEffect", np: NPT("a Yokai character") }, "put the top of your deck into your gauge, and draw a card", { once: "turn" });
  TG(6354, "when a monster enters your opponent's field by your card effects", { event: "unitEnters", owner: "opp", by: "yourEffect" }, "put the top two cards of your deck into your gauge, and deal 1 damage to your opponent");
  TG(5657, "when you draw cards from your effects", { event: "draw", owner: "you", by: "yourEffect" }, "draw a card", { once: "turn" });
  TG(5656, "when your opponent draws cards from their card effects", { event: "draw", owner: "opp", by: "oppEffect", minDifferent: { get filter() { return ABX.parseNP("an Idol card").filter; }, n: 3 } }, "your opponent chooses and drops a hand card");
  TG(5771, "when the number of cards in your opponent's hand increases", { event: "handUp", owner: "opp" }, "your opponent chooses and drops a hand card");
  OV42.push([6499, /when a card is put into your opponent's gauge/i, () => ({ kind: "triggered", trigger: { event: "gaugeUp", owner: "opp" }, steps: [{ op: "r42GaugeTo2" }] })]);

  /* ---- Dragonarms / Neodragon audit (tests/dragonarms_audit.js) ---- */
  const hostOf42 = (ctx) => ctx.soulHost || ((ctx.bind && ctx.bind.chosen) || []).map(r => r.unit).find(Boolean) || null;
  // "put this card from the soul of your «Neodragon» into the drop zone" as an optional cost of the ability
  OPS.r42SoulSelfToDrop = { run(s, ctx) { const h = hostOf42(ctx), id = ctx.card.id; if (!h) return false; const i = (h.soul || []).findIndex(x => Number(soulIdOf(x)) === id); if (i < 0) return false; h.soul.splice(i, 1); ctx.f.drop.push(id); fresh(); return true; }, check: () => true };
  // "put up to one «X» from your drop zone into this card's soul" (only when it entered in one of s.pos)
  OPS.r42DropToSoul = {
    async run(s, ctx) {
      const u = ctx.unit, f = ctx.f; if (!u) return false;
      if (s.pos && !s.pos.includes(core.posOfUnit(f, u))) return false;
      const norm = (x) => lc(x).replace(/\s+/g, "");
      const cands = f.drop.map((id, i) => ({ id, i, c: core.cardOf(id) })).filter(x => x.c && (!s.attr || (x.c.attrs || []).some(a => norm(a) === norm(s.attr))));
      if (!cands.length) return false;
      let pick = cands[0];
      if (!(ABX.autoPlay || f.isBot) && cands.length > 0) {
        const idxs = await ABX.ui.pickCards({ title: `${ctx.card.name} — put into its soul`, subtitle: "Choose up to one, or none.", cards: cands.map(x => ({ card: x.c, badge: "Drop" })), min: 0, max: 1 });
        if (!idxs || !idxs.length) return false;
        pick = cands[idxs[0]];
      }
      f.drop.splice(f.drop.indexOf(pick.id), 1); u.soul = u.soul || []; u.soul.push(pick.id);
      if (ABX.firePutIntoSoul) ABX.firePutIntoSoul(ctx.side, pick.c, u, "drop");
      fresh(); return true;
    }, check: () => true
  };
  OV42.push([1734, /when this card enters on your left/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], steps: [{ op: "r42DropToSoul", pos: ["left"], attr: "Dragonarms" }] })]);
  // #5683 Penero Theus [Counter][Act]: you may drop this card from a Neodragon's soul; if you do, [Rest] the chosen card
  OV42.push([5683, /choose a card on your opponent's field/i, (ab) => {
    const st = clone(ab.steps || []), ch = st.find(x => x.op === "choose"), rs = st.find(x => x.op === "rest");
    if (!ch || !rs) return null;
    delete rs.cond; rs.gate = "ifYouDo";
    return { kind: ab.kind, steps: [ch, { op: "r42SoulSelfToDrop", optional: true }, rs] };
  }]);
  // #1802 Force Liberate: pay 1 gauge -> the Neodragon (host) is not destroyed the next time this turn
  OPS.r42SaveHost = { run(s, ctx) { const h = hostOf42(ctx); if (!h) return false; h.tempIndestructible = true; h.abxSaveOnceTurn = B.turnCount; fresh(); return true; }, check: () => true };
  OV42.push([1802, /force liberate/i, (ab) => {
    const st = clone(ab.steps || []), pay = st.find(x => x.op === "pay");
    if (!pay) return null;
    return { kind: ab.kind, steps: [pay, { op: "r42SaveHost", gate: "ifYouDo" }] };
  }]);
  // #2573 Castnetter: the chosen opposing monster does not [Stand] during your opponent's next stand phase
  OV42.push([2573, /does not \[?stand\]?/i, (ab) => {
    const st = clone(ab.steps || []), i = st.findIndex(x => x.op === "r40StructuredExec");
    if (i < 0) return null;
    st[i] = { op: "restrict", np: { ref: "chosen", qty: { n: 1 }, filter: {}, raw: "chosen" }, kinds: ["stand"], duration: "next", gate: "ifYouDo" };
    return { kind: ab.kind, trigger: ab.trigger, steps: st };
  }]);
  // #3065 Bigger Brave: the «Neodragon» with this card in its soul attacking alone: cannot be nullified; at the end of that battle the card drops
  OV42.push([3065, /at the end of the battle/i, () => ({ kind: "rule", trigger: null, conds: [], steps: [] })]);
  const unnull3065 = ABX.attackUnnullifiable;
  ABX.attackUnnullifiable = function (bc) {
    if (unnull3065 && unnull3065.apply(this, arguments)) return true;
    try { const us = (bc && bc.attUnits) || []; if (us.length === 1 && attrHas(us[0].card, /^neodragon$/i) && hasSoulCard(us[0], 3065)) return true; } catch (e) { /* ignore */ }
    return false;
  };
  const be3065 = ABX.fireBattleEnd;
  ABX.fireBattleEnd = function (attSide, units) {
    try { (units || []).forEach(x => { const u = x && x.unit; if (u && hasSoulCard(u, 3065)) { const i = u.soul.findIndex(e => Number(soulIdOf(e)) === 3065); if (i >= 0) { u.soul.splice(i, 1); F(attSide).drop.push(3065); } } }); } catch (e) { /* ignore */ }
    return be3065.apply(this, arguments);
  };

  /* ---- dead statics batch 4 (tests/dead_statics4.js): #348 #5249 #6230 #6237 #6287 #1158 #3328 #5483 #5507 #5380 ---- */
  const eqIds = (fighter) => equippedItems(fighter).filter(u => u.abxNullified !== B.turnCount).map(u => u.card.id);
  const onFieldId4 = (fighter, id) => core.fieldUnits(fighter, true).some(x => x.unit.card.id === id && x.unit.abxNullified !== B.turnCount);
  const faceDownBuddy = (fighter) => ((fighter.buddyZone || []).filter(e => e && e.isFaceDown).length) + ((fighter.buddyZoneFaceDown || []).length);
  // #348 Rune Staff: you do not have to pay the life in the [Cast Cost] of cards with "Great Spell" in the name
  if (typeof root.parseCardCost === "function") {
    const pcc348 = root.parseCardCost;
    root.parseCardCost = function (costStr, skill, fighter, card) {
      const r = pcc348.apply(this, arguments);
      try { if (r && r.life > 0 && fighter && card && /great spell/i.test(card.name || "") && eqIds(fighter).includes(348)) r.life = 0; } catch (e) { /* ignore */ }
      return r;
    };
  }
  const prevSBb4 = ABX.staticBonus;
  if (prevSBb4) ABX.staticBonus = function (fighter, unit) {
    const sb = prevSBb4.apply(this, arguments);
    try {
      if (!unit || !unit.card || !sb || unit.abxNullified === B.turnCount) return sb;
      // #5249 Ran Mori: [Shinichi Kudo] and [Conan] on your field have infinite power
      if (unit.card.type === "Monster" && /shinichi kudo|conan/i.test(unit.card.name || "") && onFieldId4(fighter, 5249)) sb.power += 1e9;
      // #5507: three or more face-down cards in your buddy zone -> power+5000 defense+5000 critical+1 [Triple Attack]
      if (unit.card.id === 5507 && faceDownBuddy(fighter) >= 3) { sb.power += 5000; sb.defense += 5000; sb.crit += 1; sb.ta = true; }
    } catch (e) { /* ignore */ }
    return sb;
  };
  // #3328 Growls Wand: the damage dealt by the [Lifelink] of your «Demon Lord» is reduced by 1
  ABX.lifelinkReduce = function (side, card) {
    try {
      if (card && attrHas(card, /^demonlord$/i) && eqIds(F(side)).includes(3328)) return 1;
      // #4192 Ricky: nullify the [Lifelink] of your size 3 «Raging Spirits»
      if (card && card.size === 3 && attrHas(card, /^raging ?spirits$/i) && onFieldId4(F(side), 4192)) return 99;
    } catch (e) { /* ignore */ }
    return 0;
  };
  // #5483 Shiki: with a face-down card in your buddy zone, nullify the [Soulguard] of all cards on your opponent's field
  ABX.sgNullifiedByStatic = function (ownerSide) {
    try { const att = F(otherSide(ownerSide)); return !!att && onFieldId4(att, 5483) && faceDownBuddy(att) >= 1; } catch (e) { return false; }
  };
  // #5380 Maya: your «Pastel*Palettes» cannot have their souls dropped by your opponent's card effects
  const prevProt5380 = core.isProtected;
  core.isProtected = function (unit, side, kind, ctx) {
    if (prevProt5380.apply(this, arguments)) return true;
    try {
      if (unit && unit.card && /souls? dropped|drop.*soul/i.test(String(kind || "")) && attrHas(unit.card, /^pastelpalettes$/i) && ctx && ctx.side !== side && onFieldId4(F(side), 5380)) return true;
    } catch (e) { /* ignore */ }
    return false;
  };
  // #6287 / #6237 / #6230 (Medabot "during the battle that this card is attacking ..."): applied when the attack starts, undone when the battle ends
  let battle4 = [];
  const abn4 = ABX.applyBattleNullify;
  ABX.applyBattleNullify = function (attSide, attUnits, defSide, defUnit) {
    if (abn4) abn4.apply(this, arguments);
    try {
      const us = (attUnits || []).filter(u => u && u.card && u.abxNullified !== B.turnCount);
      if (us.some(u => u.card.id === 6287)) core.fieldUnits(F(defSide), true).forEach(x => { if (x.unit.abxNullified !== B.turnCount && !core.isProtected(x.unit, defSide, "nullified", { side: attSide })) { battle4.push({ unit: x.unit, prev: x.unit.abxNullified }); x.unit.abxNullified = B.turnCount; } });
      if (us.some(u => u.card.id === 6237)) { F(defSide).abxNoCallBattle = B.turnCount; battle4.push({ side: defSide }); }
    } catch (e) { /* ignore */ }
  };
  const cbn4 = ABX.clearBattleNullify;
  ABX.clearBattleNullify = function () {
    battle4.forEach(x => { if (x.unit) x.unit.abxNullified = x.prev; else if (x.side) F(x.side).abxNoCallBattle = 0; });
    battle4 = [];
    return cbn4 ? cbn4.apply(this, arguments) : undefined;
  };
  const prevAUr4 = ABX.attackUnreducible;
  ABX.attackUnreducible = function (attSide, units) {
    if (prevAUr4 && prevAUr4.apply(this, arguments)) return true;
    try { const us = (units || []).map(x => (x && x.unit) || x).filter(Boolean); if (us.length === 1 && us[0].card && us[0].card.id === 6230 && us[0].abxNullified !== B.turnCount) return true; } catch (e) { /* ignore */ }
    return false;
  };
  // #1158 Fairy King, Oberon: with 7+ «Hero» and «Fairy» cards in your drop zone, nullify all abilities of your opponent's monsters (it cannot be nullified)
  const sfn1158 = ABX.syncFrontNullify;
  ABX.syncFrontNullify = function () {
    if (sfn1158) sfn1158.apply(this, arguments);
    try {
      ["plr", "opp"].forEach(side => {
        const f = F(side), e = F(otherSide(side));
        const king = core.fieldUnits(f, true).find(x => x.unit.card.id === 1158);
        const on = !!king && (f.drop || []).filter(id => { const c = core.cardOf(id); return c && attrHas(c, /^(hero|fairy)$/i); }).length >= 7;
        core.fieldUnits(e, false).forEach(x => {
          const u = x.unit;
          if (on && !u.abxN1158 && u.abxNullified !== B.turnCount) { u.abxN1158 = { prev: u.abxNullified, turn: B.turnCount }; u.abxNullified = B.turnCount; }
          else if (!on && u.abxN1158) { if (u.abxN1158.turn === B.turnCount) u.abxNullified = u.abxN1158.prev; u.abxN1158 = null; }
          else if (u.abxN1158 && u.abxN1158.turn !== B.turnCount) u.abxN1158 = null;
        });
      });
    } catch (e) { /* ignore */ }
  };

  /* ---- [r42] batch 5: "this card gets all abilities of <cards> in its soul" (#2562 #2608 #6477 #4436 #5269) ---- */
  (function () {
    const SK = new Set(["cost", "keyword", "reminder", "rule"]);
    const isIM = (c) => !!(c && window.IMX && IMX.isImpactMonster(c));
    const RULES = {
      2562: (c) => isIM(c) && !/gemclone/i.test(c.name || ""),
      2608: (c) => isIM(c) && !/gemclone/i.test(c.name || ""),
      6477: (c) => isIM(c) && !/gemclone/i.test(c.name || ""),
      4436: (c) => (c.size || 0) === 5 && (c.attrs || []).some(a => /^battleship$/i.test(a)),
      5269: (c) => (c.size || 0) <= 2 && (c.attrs || []).some(a => /^dangerous ?veggies$/i.test(a))
    };
    const prevGet5 = ABX.get;
    ABX.get = function (card) {
      const r = prevGet5.apply(this, arguments);
      try {
        if (!r || !card || !RULES[card.id] || typeof B === "undefined" || !B.plr || !B.opp) return r;
        const rule = RULES[card.id], extra = [], seen = new Set();
        ["plr", "opp"].forEach(sd => core.fieldUnits(F(sd), true).forEach(x => {
          const u = x.unit; if (!u || u.card !== card || u.abxNullified === B.turnCount) return;
          (u.soul || []).forEach(id => {
            if (seen.has(id)) return; const c = core.cardOf(id);
            if (!c || c.id === card.id || !rule(c)) return; seen.add(id);
            ((prevGet5.call(ABX, c) || {}).abilities || []).forEach(a => { if (!SK.has(a.kind)) extra.push(Object.assign({}, a, { borrowedFrom: c.id })); });
          });
        }));
        return extra.length ? Object.assign({}, r, { abilities: r.abilities.concat(extra) }) : r;
      } catch (e) { return r; }
    };
    if (ABX.resetCaches) ABX.resetCaches();
  })();

  /* ---- [r42] batch 5b: #3869 Sword of Glory with "Shield of Glory, Order Guard" equipped: power+7000, unnullifiable when attacking alone ---- */
  (function () {
    const shieldOn = (f) => !!f && core.fieldUnits(f, true).some(x => x.unit && x.unit.card.id === 3870 && x.unit.abxNullified !== B.turnCount) ||
      (typeof getEquippedItems === "function" && getEquippedItems(f).some(x => x.unit && x.unit.card && x.unit.card.id === 3870));
    const prevSB = ABX.staticBonus;
    if (prevSB) ABX.staticBonus = function (fighter, unit) {
      const sb = prevSB.apply(this, arguments);
      try { if (sb && unit && unit.card && unit.card.id === 3869 && unit.abxNullified !== B.turnCount && shieldOn(fighter)) sb.power += 7000; } catch (e) { /* ignore */ }
      return sb;
    };
    const prevAU = ABX.attackUnnullifiable;
    ABX.attackUnnullifiable = function (bc) {
      if (prevAU && prevAU.apply(this, arguments)) return true;
      try {
        const us = (bc && bc.attUnits) || [];
        return us.length === 1 && us[0] && us[0].card && us[0].card.id === 3869 && us[0].abxNullified !== B.turnCount && shieldOn(F(bc.attSide));
      } catch (e) { return false; }
    };
  })();

  /* ---- [r42] batch 5c: aura "can attack your opponent even if there are monsters in the center":
       #5612 Nono (with a Syoko Hoshi: all Idol), #5649 (That Girl), #6494 (Skull Warrior), #6523 (all cards on your field), #2118 (monster with it in soul) ---- */
  (function () {
    const hasAttr = (c, re) => !!c && (c.attrs || []).some(a => re.test(a));
    const live = (f, id) => core.fieldUnits(f, true).some(x => x.unit && x.unit.card && x.unit.card.id === id && x.unit.abxNullified !== B.turnCount);
    const prevCAT = ABX.canAttackThrough;
    ABX.canAttackThrough = function (side, unit, which) {
      if (prevCAT && prevCAT.apply(this, arguments)) return true;
      try {
        if (which === "own" || !unit || !unit.card) return false;
        const f = F(side), c = unit.card;
        if (hasAttr(c, /^idol$/i) && live(f, 5612) && core.fieldUnits(f, true).some(x => x.unit && /syoko hoshi/i.test(x.unit.card.name || "") && x.unit.abxNullified !== B.turnCount)) return true;
        if (hasAttr(c, /^that ?girl$/i) && live(f, 5649)) return true;
        if (hasAttr(c, /^skull ?warrior$/i) && live(f, 6494)) return true;
        if (live(f, 6523)) return true;
        // #2118 in the soul of the monster
        if ((unit.soul || []).includes(2118) && unit.abxNullified !== B.turnCount) return true;
      } catch (e) { /* ignore */ }
      return false;
    };
  })();

  /* ---- [r42] batch 5d: #5374 Kaoru Seta: on your field or in the soul of a «Hello, Happy World!» on your field -> all «Hello, Happy World!» can attack through ---- */
  (function () {
    const isHHW = (c) => !!c && (c.attrs || []).some(a => /^hello ?happy ?world!?$/i.test(a));
    const prevCAT = ABX.canAttackThrough;
    ABX.canAttackThrough = function (side, unit, which) {
      if (prevCAT && prevCAT.apply(this, arguments)) return true;
      try {
        if (which === "own" || !unit || !isHHW(unit.card)) return false;
        return core.fieldUnits(F(side), true).some(x => x.unit && x.unit.abxNullified !== B.turnCount &&
          (x.unit.card.id === 5374 || (isHHW(x.unit.card) && (x.unit.soul || []).includes(5374))));
      } catch (e) { return false; }
    };
  })();

  /* ---- [r42] batch 5e: would-leave replacements: #5395 Marina (Band, from drop to deck bottom + 1 life), #5695 Miko (item, this card field -> drop),
       #2521 Variable Bit (impact monster with it in soul, soul -> drop) ---- */
  (function () {
    const prevWLS = ABX.wouldLeaveSave;
    ABX.wouldLeaveSave = function (side, pos, unit, byAttack) {
      if (prevWLS && prevWLS.apply(this, arguments)) return true;
      try {
        const f = F(side);
        if (!f || !unit || !unit.card) return false;
        const c = unit.card;
        // #2521: this card is in the soul of an impact monster that would leave the field
        if (window.IMX && IMX.isImpactMonster(c) && (unit.soul || []).includes(2521)) {
          unit.soul.splice(unit.soul.indexOf(2521), 1); f.drop.push(2521); return true;
        }
        // #5395: your «Band» character would leave the field
        if (c.type === "Monster" && (c.attrs || []).some(a => /^band$/i.test(a)) && f.life > 1) {
          const di = (f.drop || []).indexOf(5395);
          if (di >= 0 && c.id !== 5395) { f.drop.splice(di, 1); f.deck.push(5395); f.life -= 1; return true; }
        }
        // #5695: an item would leave your field -> put this card from the field into the drop zone
        if (c.type === "Item") {
          const pu = core.fieldUnits(f, false).find(x => x.unit && x.unit.card.id === 5695 && x.unit.abxNullified !== B.turnCount);
          if (pu) { const pp = (pu.pos || pu.zone); if (pp && f.monsters[pp] === pu.unit) { f.monsters[pp] = null; f.drop.push(5695); (pu.unit.soul || []).forEach(id => f.drop.push(id)); return true; } }
        }
      } catch (e) { /* ignore */ }
      return false;
    };
  })();

  /* ---- [r42] batch 5f: #6494 Yamigitsune "Re:B": a «Skull Warrior» attacking alone -> its damage to the opponent cannot be reduced ---- */
  (function () {
    const prevAUr = ABX.attackUnreducible;
    ABX.attackUnreducible = function (attSide, units) {
      if (prevAUr && prevAUr.apply(this, arguments)) return true;
      try {
        const us = (units || []).map(x => (x && x.unit) || x).filter(Boolean);
        if (us.length !== 1 || !(us[0].card.attrs || []).some(a => /^skull ?warrior$/i.test(a))) return false;
        return core.fieldUnits(F(attSide), true).some(x => x.unit && x.unit.card.id === 6494 && x.unit.abxNullified !== B.turnCount);
      } catch (e) { return false; }
    };
  })();

  /* ---- [r42] batch 6: #6014 Godagito [Spiral DG-Share]: on your center -> gets the [D-Share] keywords of cards in its soul,
       and the size of monsters on your left and right is reduced by 1 ---- */
  (function () {
    const prevSB = ABX.staticBonus;
    if (prevSB) ABX.staticBonus = function (fighter, unit) {
      const out = prevSB.apply(this, arguments);
      try {
        if (!out || !unit || !unit.card || unit.card.id !== 6014 || unit.abxNullified === B.turnCount || !fighter || fighter.monsters.center !== unit) return out;
        (unit.soul || []).forEach(id => {
          const sc = core.cardOf(id);
          if (!sc || !/\[d-share\]/i.test(sc.skill || "")) return;
          if (/\[penetrate\]/i.test(sc.skill)) out.pen = true;
          if (/\[double attack\]/i.test(sc.skill)) out.da = true;
          if (/\[triple attack\]/i.test(sc.skill)) out.ta = true;
          if (/\[counterattack\]/i.test(sc.skill)) out.ca = true;
          if (/\[move\]/i.test(sc.skill)) out.move = true;
        });
      } catch (e) { /* ignore */ }
      return out;
    };
    const prevSD = ABX.sizeDelta;
    ABX.sizeDelta = function (fighter, card, unit) {
      let d = prevSD ? prevSD.apply(this, arguments) : 0;
      try {
        const c = fighter && fighter.monsters && fighter.monsters.center;
        if (unit && c && c.card.id === 6014 && c.abxNullified !== B.turnCount && (fighter.monsters.left === unit || fighter.monsters.right === unit)) d -= 1;
      } catch (e) { /* ignore */ }
      return d;
    };
  })();

  /* ---- [r42] batch 7: #2693 (soul undroppable), #3638 (nullify the monster in front), #5690 (size -1 with an originally size 3 monster) ---- */
  (function () {
    const prevProt = core.isProtected;
    core.isProtected = function (unit, side, kind, ctx) {
      if (prevProt.apply(this, arguments)) return true;
      try {
        if (unit && unit.card && unit.card.id === 2693 && unit.abxNullified !== B.turnCount && /souls? dropped|drop.*soul/i.test(String(kind || "")) && ctx && ctx.side !== side) return true;
      } catch (e) { /* ignore */ }
      return false;
    };
    const prevSFN = ABX.syncFrontNullify;
    ABX.syncFrontNullify = function () {
      if (prevSFN) prevSFN.apply(this, arguments);
      try {
        ["plr", "opp"].forEach(side => {
          const f = F(side), e = F(otherSide(side));
          ["left", "center", "right"].forEach(pos => {
            const u = e.monsters[pos]; if (!u) return;
            const src = f.monsters[pos];
            const on = !!src && src.card.id === 3638 && src.abxNullified !== B.turnCount;
            if (on && !u.abxN3638 && u.abxNullified !== B.turnCount) { u.abxN3638 = { prev: u.abxNullified, turn: B.turnCount }; u.abxNullified = B.turnCount; }
            else if (!on && u.abxN3638) { if (u.abxN3638.turn === B.turnCount) u.abxNullified = u.abxN3638.prev; u.abxN3638 = null; }
            else if (u.abxN3638 && u.abxN3638.turn !== B.turnCount) u.abxN3638 = null;
          });
        });
      } catch (e) { /* ignore */ }
    };
    const prevSD = ABX.sizeDelta;
    ABX.sizeDelta = function (fighter, card, unit) {
      let d = prevSD ? prevSD.apply(this, arguments) : 0;
      try {
        if (card && card.id === 5690 && fighter && core.fieldUnits(fighter, false).some(x => x.unit && x.unit !== unit && x.unit.card.size === 3)) d -= 1;
      } catch (e) { /* ignore */ }
      return d;
    };
  })();

  /* ---- [r42] batch 8: #6494 "To Darkness" and #4788 Magatsu Flames: when a «Skull Warrior» on your field attacks and deals damage to the opponent,
       you may destroy it. 6494: +1 gauge from the deck, +1 life, draw. 4788: drop 1 opponent gauge, 1 damage, the opponent drops a hand card of their choice ---- */
  (function () {
    const isSW = (c) => !!c && (c.attrs || []).some(a => /^skull ?warrior$/i.test(a));
    const prevFAO = ABX.fireAttackOutcome;
    ABX.fireAttackOutcome = function (attSide, units, defSide, outcome) {
      const r = prevFAO ? prevFAO.apply(this, arguments) : undefined;
      try {
        if (!(outcome && outcome.dealtDamage)) return r;
        const atk = (units || []).map(u => u.unit).filter(u => u && isSW(u.card));
        if (!atk.length) return r;
        ABX.queue(async () => {
          const f = F(attSide), e = F(otherSide(attSide));
          for (const srcId of [6494, 4788]) {
            for (const su of core.fieldUnits(f, true).filter(x => x.unit.card.id === srcId && x.unit.abxNullified !== B.turnCount).map(x => x.unit)) {
              for (const u of atk) {
                const pos = ["left", "center", "center2", "right"].find(p => f.monsters[p] === u);
                if (!pos) continue;
                let yes = true;
                if (!(f.isBot || ABX.autoPlay) && ABX.ui && ABX.ui.pickOption) {
                  const i = await ABX.ui.pickOption({ title: `${su.card.name} — ${srcId === 6494 ? "To Darkness" : "Magatsu Flames"}`, subtitle: `Destroy "${u.card.name}"?`, options: ["Destroy it", "No"] });
                  yes = i === 0;
                }
                if (!yes) continue;
                B.destroyMonster(attSide, pos);
                if (Object.values(f.monsters).includes(u)) continue;   // saved: no effect
                if (srcId === 6494) {
                  if (f.deck.length) f.gauge.push(f.deck.shift());
                  f.life += 1;
                  if (f.deck.length) f.hand.push(f.deck.shift());
                } else {
                  if (e.gauge.length) e.drop.push(e.gauge.pop());
                  core.applyDamage(otherSide(attSide), 1, { kind: "effect" });
                  if (OPS.oppDiscard && OPS.oppDiscard.run) await OPS.oppDiscard.run({ n: 1 }, { side: attSide, f, e, card: su.card, unit: su, bind: {}, auto: true });
                }
                fresh();
              }
            }
          }
        });
      } catch (e) { /* ignore */ }
      return r;
    };
  })();

  /* ---- [r42] batch 9: #6058 Galaxy F.DG no-[Rest] part (the stat bullets of #5132 / #6058 already parse as conditional statics), #4982 (souls undroppable), #2465 (opponent locked out during their final phase) ---- */
  (function () {
    const itemsOf = (f) => (typeof getEquippedItems === "function" ? getEquippedItems(f).map(x => x.unit) : [f.item, f.item2].filter(Boolean));
    // #5132 [Galaxy F]: the center already gets its own bonuses; the left / right «Astrodragon» and the «Astrodragon» item get theirs here
    const isAstro = (c) => !!c && (c.attrs || []).some(a => /^astrodragon$/i.test(a));
    const prevSB = ABX.staticBonus;
    if (prevSB) ABX.staticBonus = function (fighter, unit) {
      const out = prevSB.apply(this, arguments);
      try {
        const cen = fighter && fighter.monsters && fighter.monsters.center;
        if (!out || !unit || !unit.card || !cen || cen === unit || cen.card.id !== 5132 || cen.abxNullified === B.turnCount) return out;
        if (unit === fighter.monsters.left && isAstro(unit.card)) out.defense += 10000;
        if (unit === fighter.monsters.right && isAstro(unit.card)) out.crit += 2;
        if (itemsOf(fighter).includes(unit) && itemsOf(fighter).some(it => isAstro(it.card))) out.power += 10000;
      } catch (e) { /* ignore */ }
      return out;
    };
    // #6058: with an item equipped, your cards cannot be [Rest] by the opponent's card effects
    const prevProt = core.isProtected;
    core.isProtected = function (unit, side, kind, ctx) {
      if (prevProt.apply(this, arguments)) return true;
      try {
        const f = F(side);
        if (unit && unit.card && ctx && ctx.side !== side) {
          // #4982: souls in the «Dragonblood Sect» with this card in its soul cannot be dropped by your opponent's card effects
          if (/souls? dropped|drop.*soul/i.test(String(kind || "")) && (unit.soul || []).includes(4982)) return true;
          // #6058 Galaxy F.DG
          if (/rest/i.test(String(kind || "")) && f.monsters && f.monsters.center && f.monsters.center.card.id === 6058 && f.monsters.center.abxNullified !== B.turnCount && itemsOf(f).length) return true;
        }
      } catch (e) { /* ignore */ }
      return false;
    };
    // #2465: while in the soul of a «Zodiac» monster, during the opponent's final phase they cannot use or cast cards from hand, nor use an [Act]
    const lockedBy2465 = (fighter) => {
      try {
        if (!fighter || B.phase !== "final") return false;
        const side = fighter === B.plr ? "plr" : "opp", other = F(otherSide(side));
        if (B.activeSide !== side) return false;
        return core.fieldUnits(other, true).some(x => x.unit.abxNullified !== B.turnCount && (x.unit.soul || []).includes(2465) && /zodiac/i.test(x.unit.card.name || ""));
      } catch (e) { return false; }
    };
    const prevCB = core.castBlock;
    core.castBlock = function (fighter, card) {
      const r = prevCB ? prevCB.apply(this, arguments) : null;
      if (r) return r;
      return lockedBy2465(fighter) ? `"Dragoneraser, Hind Lance" prevents you from using cards from your hand during your final phase` : null;
    };
    const prevCUA = ABX.canUseAct;
    ABX.canUseAct = function (side, card, ab, unit) {
      if (lockedBy2465(F(side))) return { ok: false, reason: "Dragoneraser, Hind Lance: you cannot use [Act]s during your final phase" };
      return prevCUA.apply(this, arguments);
    };
  })();

  /* ---- [r42] batch 10: #6433 White Flame Bloodeye: during your opponent's attack phase, nullify the abilities of all monsters and items on their field ---- */
  (function () {
    const prevSFN = ABX.syncFrontNullify;
    ABX.syncFrontNullify = function () {
      if (prevSFN) prevSFN.apply(this, arguments);
      try {
        ["plr", "opp"].forEach(side => {
          const f = F(side), eSide = otherSide(side), e = F(eSide);
          const src = core.fieldUnits(f, false).find(x => x.unit.card.id === 6433);
          const on = !!src && B.activeSide === eSide && B.phase === "attack";
          core.fieldUnits(e, true).forEach(x => {
            const u = x.unit;
            if (on && !u.abxN6433 && u.abxNullified !== B.turnCount) { u.abxN6433 = { prev: u.abxNullified, turn: B.turnCount }; u.abxNullified = B.turnCount; }
            else if (!on && u.abxN6433) { if (u.abxN6433.turn === B.turnCount) u.abxNullified = u.abxN6433.prev; u.abxN6433 = null; }
            else if (u.abxN6433 && u.abxN6433.turn !== B.turnCount) u.abxN6433 = null;
          });
        });
      } catch (e) { /* ignore */ }
    };
  })();

  /* ---- [r42] batch 10b: #6274 Sonic Stag "Conceal": your «Kuwagata» cannot be destroyed or returned to hand by your opponent's event (spell) effects ---- */
  (function () {
    const prevProt = core.isProtected;
    core.isProtected = function (unit, side, kind, ctx) {
      if (prevProt.apply(this, arguments)) return true;
      try {
        if (unit && unit.card && ctx && ctx.side !== side && ctx.card && ctx.card.type === "Spell" && /destroyed|returned to hand/i.test(String(kind || "")) &&
          (unit.card.attrs || []).some(a => /^kuwagata$/i.test(a)) &&
          core.fieldUnits(F(side), true).some(x => x.unit.card.id === 6274 && x.unit.abxNullified !== B.turnCount)) return true;
      } catch (e) { /* ignore */ }
      return false;
    };
  })();

  /* ---- [r42] batch 11: #5877 Buster Borr: while in the soul of a [Gridman] / [Powered Zenon] that attacks alone, its damage cannot be reduced ---- */
  (function () {
    const prevAUr = ABX.attackUnreducible;
    ABX.attackUnreducible = function (attSide, units) {
      if (prevAUr && prevAUr.apply(this, arguments)) return true;
      try {
        const us = (units || []).map(x => (x && x.unit) || x).filter(Boolean);
        return us.length === 1 && (us[0].soul || []).includes(5877) && us[0].abxNullified !== B.turnCount && /gridman|powered zenon/i.test(us[0].card.name || "");
      } catch (e) { return false; }
    };
  })();

  /* ---- [r42] batch 11b: [D-Share] sharing. Every card with [D-Share] on your field gets the [D] abilities of the other [D-Share] cards on your field
       (each card's own [D] already runs as its own ability). #5041's own [D] [Counter][Act] (pay 2 gauge: [Stand] this card) was parsed as a static. ---- */
  OV42.push([5041, /^\[d\]\s*\[counter\]\s*\[act\]/i, () => {
    const pc = ABX.parseCard({ id: -5041, name: "x", type: "Monster", attrs: [], skill: "[Counter] [Act] You may pay 2 gauge. If you do, [Stand] this card." }).abilities.find(a => a.kind === "act");
    if (!pc) return null;
    return { kind: "act", steps: pc.steps, tags: pc.tags || ["counter", "act"], counter: true, conds: pc.conds || [] };
  }]);
  (function () {
    const hasDS = (c) => !!c && /\[d-share\]/i.test(c.skill || "");
    const prevGet = ABX.get;
    ABX.get = function (card) {
      const r = prevGet.apply(this, arguments);
      try {
        if (!r || !card || !hasDS(card) || typeof B === "undefined" || !B.plr || !B.opp) return r;
        const extra = [], seen = new Set([card.id]);
        ["plr", "opp"].forEach(sd => {
          const us = core.fieldUnits(F(sd), true).map(x => x.unit);
          if (!us.some(u => u.card === card && u.abxNullified !== B.turnCount)) return;
          us.forEach(u => {
            if (!u.card || u.abxNullified === B.turnCount || !hasDS(u.card) || seen.has(u.card.id)) return;
            seen.add(u.card.id);
            ((prevGet.call(ABX, u.card) || {}).abilities || []).forEach(a => {
              if (/^\s*\[d\]/i.test(String(a.raw || "")) && !(a.unparsed && a.unparsed.length)) extra.push(Object.assign({}, a, { sharedFrom: u.card.id }));
            });
          });
        });
        return extra.length ? Object.assign({}, r, { abilities: r.abilities.concat(extra) }) : r;
      } catch (e) { return r; }
    };
    if (ABX.resetCaches) ABX.resetCaches();
  })();
  // shared [D] stat boosts ("this card gets power+2000 ..."): applied to every [D-Share] card on the same field
  (function () {
    const hasDS = (c) => !!c && /\[d-share\]/i.test(c.skill || "");
    const prevSB = ABX.staticBonus;
    if (prevSB) ABX.staticBonus = function (fighter, unit) {
      const out = prevSB.apply(this, arguments);
      try {
        if (!out || !unit || !unit.card || !hasDS(unit.card) || unit.abxNullified === B.turnCount || !fighter) return out;
        const side = B.plr === fighter ? "plr" : B.opp === fighter ? "opp" : null; if (!side) return out;
        const f = F(side), e = F(otherSide(side));
        if (!core.fieldUnits(f, true).some(x => x.unit === unit)) return out;
        const seen = new Set([unit.card.id]);
        core.fieldUnits(f, true).forEach(x => {
          const d = x.unit; if (!d.card || d === unit || seen.has(d.card.id) || d.abxNullified === B.turnCount || !hasDS(d.card)) return; seen.add(d.card.id);
          (ABX.get(d.card).abilities || []).forEach(ab => {
            if (ab.kind !== "static" || !/^\s*\[d\]/i.test(String(ab.raw || "")) || (ab.unparsed && ab.unparsed.length)) return;
            const ctx = { side, f, e, card: unit.card, unit, bind: {} };
            if (!(ab.conds || []).every(c => core.evalCond(c, ctx))) return;
            (ab.steps || []).forEach(st => {
              if (st.op !== "boost" || !st.np || !st.np.self || !st.mods) return;
              if (st.cond && !core.evalCond(st.cond, ctx)) return;
              out.power += st.mods.power || 0; out.defense += st.mods.defense || 0; out.crit += st.mods.critical || 0;
              (st.mods.kws || []).forEach(k => { if (k === "penetrate") out.pen = true; if (k === "double attack") out.da = true; if (k === "triple attack") out.ta = true; if (k === "counterattack") out.ca = true; if (k === "move") out.move = true; });
            });
          });
        });
      } catch (e) { /* ignore */ }
      return out;
    };
  })();

  /* ---- [r42] batch 12: #3874 (the card text is split across lines), #3854 Magni (the two options were never attached to the act) ---- */
  OV42.push([3874, /when you equip this card, you may discard a card from your hand/i, () => {
    const pc = ABX.parseCard({ id: -3874, name: "x", type: "Item", attrs: [], skill: 'When you equip this card, you may discard a card from your hand. If you do, put up to one item with "Sword of the King" in its card name from your deck into your hand, and shuffle your deck.' }).abilities.find(a => a.kind === "triggered");
    return pc ? { kind: "triggered", trigger: pc.trigger, steps: pc.steps, conds: pc.conds || [] } : null;
  }]);
  OPS.r42Magni = {
    async run(s, ctx) {
      const u = ctx && ctx.unit; if (!u) return false;
      let i = 0;
      if (!(ctx.auto || (F(ctx.side) && F(ctx.side).isBot) || ABX.autoPlay) && ABX.ui && ABX.ui.pickOption) i = await ABX.ui.pickOption({ title: `${ctx.card.name} — choose one`, options: ["[Stand] this card", "For this turn, the next time this card would be destroyed, nullify the destruction"] });
      if (i < 0) return false;
      if (i === 0) u.rested = false; else u.abxSaveOnceTurn = B.turnCount;
      fresh(); return true;
    }, check: () => true
  };
  OV42.push([3854, /you may discard a card from your hand\. if you do, choose and use one of the follow/i, (ab) => ({
    kind: "act", tags: ["counter", "act"], counter: true, once: "turn", conds: [],
    steps: (ab.steps || []).filter(x => x.op !== "modalMarker").concat([{ op: "r42Magni", gate: "ifYouDo" }])
  })]);

  /* ---- [r42] batch 13: #5474 Idol With Glasses, Haruna Kamijo: all characters on the field get «Glasses» (count = characters on the field);
       this card gets critical+1 for each «Glasses» on the field; at the start of your attack phase with 3+ different «Idol»: gain 1 life for each ---- */
  const glassesCount = () => {
    let n = 0;
    [B.plr, B.opp].forEach(fx => { if (fx) core.fieldUnits(fx, false).forEach(x => { n++; }); });
    return n;
  };
  const has5474 = () => [B.plr, B.opp].some(fx => fx && core.fieldUnits(fx, false).some(x => x.unit.card.id === 5474 && x.unit.abxNullified !== B.turnCount));
  OV42.push([5474, /gets critical\+1 for each .?glasses/i, () => ({ kind: "rule", steps: [] })]);
  OV42.push([5474, /you gain 1 life for each .?glasses/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], steps: [{ op: "r42GlassesLife" }] })]);
  OPS.r42GlassesLife = {
    run(s, ctx) {
      const f = ctx.f;
      const idols = new Set(core.fieldUnits(f, false).filter(x => (x.unit.card.attrs || []).some(a => /^idol$/i.test(a))).map(x => x.unit.card.name));
      if (idols.size < 3) return false;
      const n = has5474() ? glassesCount() : 0;
      if (n > 0) { f.life += n; fresh(); }
      return n > 0;
    }, check: () => true
  };
  (function () {
    const prevSB = ABX.staticBonus;
    if (prevSB) ABX.staticBonus = function (fighter, unit) {
      const out = prevSB.apply(this, arguments);
      try { if (out && unit && unit.card && unit.card.id === 5474 && unit.abxNullified !== B.turnCount && fighter && core.fieldUnits(fighter, false).some(x => x.unit === unit)) out.crit += glassesCount(); } catch (e) { /* ignore */ }
      return out;
    };
  })();

  /* ---- [r42] batch 14: #2079 Tigarion: gains the critical of all cards you are [Ride] on ---- */
  (function () {
    const prevSB = ABX.staticBonus;
    if (prevSB) ABX.staticBonus = function (fighter, unit) {
      const out = prevSB.apply(this, arguments);
      try {
        if (!out || !unit || !unit.card || unit.card.id !== 2079 || unit.abxNullified === B.turnCount || !fighter) return out;
        const items = typeof getEquippedItems === "function" ? getEquippedItems(fighter).map(x => x.unit) : [fighter.item, fighter.item2].filter(Boolean);
        items.forEach(it => {
          if (it && it.card && it !== unit && String(it.itemMode || "").toLowerCase() === "ride") out.crit += getUnitEffectiveCombatStats(fighter, it).crit;
        });
      } catch (e) { /* ignore */ }
      return out;
    };
  })();

  /* ---- [r42] batch 15: #5171 Here Comes the Event! Garga "SD": [Counter] from the soul of a monster: call this card from the soul (once per turn) ---- */
  OV42.push([5171, /here comes the event/i, () => {
    const pc = ABX.parseCard({ id: -5171, name: "x", type: "Monster", size: 1, attrs: [], skill: "[Counter] [Act] Call this card from the soul of a monster on your field. You may only use this ability once per turn." }).abilities.find(a => a.kind === "act");
    return pc ? { kind: "act", steps: pc.steps, tags: pc.tags || ["counter", "act"], counter: true, once: "turn", conds: pc.conds || [] } : null;
  }]);

  /* ---- [r42] call restrictions written on the card: "cannot enter the field other than by the [Act] of X" / "can only be called by X effects" / "cannot be called" / "can only enter the field if your flag is X" ---- */
  (function () {
    const BT = () => (typeof battle !== "undefined" ? battle : root.battle);
    const prevEcc = root.evaluateCardConditions;
    if (typeof prevEcc !== "function") return;
    const restriction = (card) => {
      const t = String(card && card.skill || "");
      if (/^\s*this card cannot be called\.?\s*$/im.test(t)) return { kind: "never" };
      if (/^\s*this card cannot enter the field other than by\b/im.test(t) || /^\s*this card can only be called by .+ effects?\.?\s*$/im.test(t)) return { kind: "effect" };
      const fm = t.match(/^\s*this card can only enter the field if your flag is "([^"]+)"/im);
      return fm ? { kind: "flag", flag: fm[1] } : null;
    };
    ABX.callRestriction = restriction;
    root.evaluateCardConditions = function (card, fighter, enemy, isAbilityCall) {
      const r = prevEcc.apply(this, arguments);
      try {
        if (r && r.met !== false && card && card.type === "Monster" && fighter) {
          const rs = restriction(card);
          const viaEffect = isAbilityCall || ABX.curEffectCard || (BT() && BT().abxFreeCall);
          let why = null;
          if (rs && rs.kind === "never" && !viaEffect) why = `"${card.name}" cannot be called`;
          else if (rs && rs.kind === "effect" && !viaEffect) why = `"${card.name}" can only enter the field by a card effect`;
          else if (rs && rs.kind === "flag" && String(fighter.world || "").toLowerCase() !== rs.flag.toLowerCase() && String((fighter.flagCard && fighter.flagCard.name) || "").toLowerCase() !== rs.flag.toLowerCase()) why = `"${card.name}" can only enter the field if your flag is "${rs.flag}"`;
          if (why) { const reasons = (r.reasons || []).concat([why]); return Object.assign({}, r, { met: false, reasons, summary: `⚠️ ${reasons[0]}` }); }
        }
      } catch (e) { if (ABX.debug) console.error(e); }
      return r;
    };
  })();

  /* ---- [r42] #5127 Celesphere Decision: remember this turn's attacks per tribe so "[Cast Cost] reduced by 1 for each attack of your «Astrodragon»" can be priced ---- */
  (function () {
    const prevFA = ABX.fireAttack;
    if (typeof prevFA !== "function") return;
    ABX.fireAttack = function (attSide, units) {
      try {
        const f = core.F(attSide), BT = typeof battle !== "undefined" ? battle : root.battle;
        if (f && BT) {
          if (!f.abxTribeAtk || f.abxTribeAtk.turn !== BT.turnCount) f.abxTribeAtk = { turn: BT.turnCount, n: {} };
          const seen = new Set();
          (units || []).forEach(u => { const c = u && u.unit && u.unit.card; (c && c.attrs || []).forEach(a => seen.add(String(a).toLowerCase().replace(/[^a-z0-9]/g, ""))); });
          seen.forEach(k => { f.abxTribeAtk.n[k] = (f.abxTribeAtk.n[k] || 0) + 1; });
        }
      } catch (e) { /* ignore */ }
      return prevFA.apply(this, arguments);
    };
  })();

  /* ---- [r42] [Counter] spells that "return this card to hand" ended in the drop zone ----
   * #4963 Linkdragon Spirit: the generic parse returned the card to hand unconditionally (even when the dropped card has no [D-Share]).
   * #351 Berserk Gard: its text has an unbalanced quote ("Symbel Gard in your drop zone) so the whole return clause was lost. */
  OPS.r42ReturnIfDropped = {
    async run(s, ctx) {
      const hit = (ctx.bind.chosen || []).some(r => r && r.card && new RegExp(s.re, "i").test(r.card.skill || ""));
      if (!hit) return false;
      return !!(await OPS.moveSelf.run({ op: "moveSelf", to: { area: "hand", owner: "you", end: "top" } }, ctx));
    }, check: () => true
  };
  OV42.push([4963, /if the card dropped has \[d-share\], return this card to hand/i, () => ({ kind: "spell", steps: [
    { op: "nullifyAttack" },
    { op: "mill", who: "you", n: 1, to: "drop zone" },
    { op: "r42ReturnIfDropped", re: "\\[d-share\\]" }
  ] })]);
  OV42.push([351, /symbel gard in your drop zone/i, (ab) => {
    const hasSymbel = { t: "has", owner: "any", np: { raw: "\"Symbel Gard\" in your drop zone", qty: { n: 1, upTo: false, all: false, any: false, each: false }, ref: null, self: false, filter: { namesExact: ["symbel gard"] }, zone: { owner: "you", area: "drop zone" }, excludeSelf: false, topN: null, soulOf: null }, n: 1, other: false };
    return { kind: "spell", steps: [
      clone(ab.steps[0]), clone(ab.steps[1]),
      { op: "discard", n: 1, cost: true, src: "discard a card from your hand", optional: true, cond: hasSymbel },
      { op: "pay", gauge: 2, cost: true, src: "pay 2 gauge", cond: hasSymbel },
      { op: "moveSelf", to: { area: "hand", owner: "you", end: "top" }, src: "return this card into your hand", gate: "ifYouDo" }
    ] };
  }]);
  // #1387 Be Glad That You Can be of Use to Me: the "[Cast Cost] put the top card of your deck into your drop zone" part was never paid and the parse returned the card
  // to hand every time. Now: drop the top card; «Darkhero» -> destroy an item on the opponent's field + gain 2 life; otherwise return this card to your hand.
  OPS.r42BeGlad = {
    async run(s, ctx) {
      const f = ctx.f;
      if (!f.deck.length) return false;
      const id = f.deck.shift(); f.drop.push(id);
      const c = core.cardOf(id);
      if (c && (c.attrs || []).some(a => /^darkhero$/i.test(a))) {
        if (s.destroy && OPS.destroy && OPS.destroy.run) await OPS.destroy.run(s.destroy, ctx);
        await OPS.life.run({ op: "life", who: "you", n: 2 }, ctx);
        fresh(); return true;
      }
      const ok = await OPS.moveSelf.run({ op: "moveSelf", to: { area: "hand", owner: "you", end: "top" } }, ctx);
      fresh(); return !!ok;
    }, check: () => true
  };
  OV42.push([1387, /if it is not a .darkhero., return this card to your hand/i, (ab) => {
    const d = clone(ab.steps[0]); delete d.cond;
    return { kind: "spell", steps: [{ op: "r42BeGlad", destroy: d }] };
  }]);

  /* ---- [r42] [Stand] buddy zone mechanics ----
   * The buddy zone is game.js `fighter.buddyZone` = [{id, rested, isFaceDown}] ([Rest] after a buddy call). "[Stand] all «Legend Dragon» in your buddy zone" (#5422 #5424 #5526 #6136)
   * used to set an unused `buddyZoneRested` flag, so the buddy zone cards stayed rested; it also stood every buddy zone card whatever the filter.
   * "put the top card of your deck face down into your buddy zone" (#5340) now adds a face-down card (fighter.buddyZoneFaceDown). */
  ABX.buddyZoneRested = (f) => { try { return getFighterBuddyZoneEntries(f).some(e => !e.isFaceDown && e.rested); } catch (e) { return false; } };
  OPS.standBuddyZone = {
    stand(f, filter, ctx) {
      const has = filter && Object.keys(filter).length;
      const n = standFighterBuddyZone(f, has ? (c) => core.matchFilter(c, filter, null, ctx) : null);
      return n;
    },
    async run(s, ctx) {
      const f = ctx.f;
      if (!f) return false;
      if (s.refill) {
        if (!f.deck.length) return false;
        (f.buddyZoneFaceDown = f.buddyZoneFaceDown || []).push(f.deck.shift());
        fresh(); return true;
      }
      let filter = null;
      if (s.what) { const np = ABX.parseNP("all " + s.what + " on your field"); filter = np && !np.junk ? np.filter : null; }
      getFighterBuddyZoneEntries(f);
      OPS.standBuddyZone.stand(f, filter, ctx);
      fresh(); return true;
    },
    check: () => true
  };
  // #1138 "You may only cast this card if the card in your buddy zone is [Rest]." (enforced in core.castBlock)
  (function () {
    const prevCB = core.castBlock;
    core.castBlock = function (fighter, card) {
      const r = prevCB ? prevCB.apply(this, arguments) : null;
      if (r) return r;
      return card && card.id === 1138 && !ABX.buddyZoneRested(fighter) ? "The card in your buddy zone must be in [Rest] to cast this card." : null;
    };
  })();
  OV42.push([1138, /you may only cast this card if the card in your buddy zone is \[rest\]/i, () => ({ kind: "rule", steps: [] })]);

  /* ---- [r42] "[Call Cost] [Pay N opponent's gauge]" (#4381 #4383 #4387 #4389 #4412 ...) ----
   * The cost line was never read: these cards were called / equipped for free and the opponent's gauge stayed untouched. The N gauge cards go from the OPPONENT's
   * gauge to the OPPONENT's drop zone, and the card cannot be called / equipped / cast when the opponent has fewer than N gauge. */
  (function () {
    const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
    const oppGaugeCost = (card) => {
      const m = /\[(?:call|cast|equip) cost\]([^\n]*)/i.exec((card && card.skill) || "");
      const g = m && /\bpay (\d+|an?|one|two|three|four|five) opponent'?s gauge\b/i.exec(m[1]);
      return g ? (parseInt(g[1], 10) || NUMW[g[1].toLowerCase()] || 1) : 0;
    };
    ABX.oppGaugeCost = oppGaugeCost;
    const heP = ABX.hasExtras, cpeP = ABX.canPayExtras, peP = ABX.payExtras;
    ABX.hasExtras = function (card) { return oppGaugeCost(card) > 0 || heP.apply(this, arguments); };
    ABX.canPayExtras = function (side, card) {
      const n = oppGaugeCost(card);
      if (n > 0 && F(otherSide(side)).gauge.length < n) return false;
      return heP.call(this, card) ? cpeP.apply(this, arguments) : true;
    };
    ABX.payExtras = function (side, card, unit) {
      const n = oppGaugeCost(card);
      if (n > 0) { const e = F(otherSide(side)); for (let k = 0; k < n && e.gauge.length; k++) e.drop.push(e.gauge.pop()); }
      return heP.call(this, card) ? peP.apply(this, arguments) : undefined;
    };
  })();

  /* ---- [r42] #16 Gotcha!: "For this turn, the next time you would pay gauge for a monster's [Act] on your field, you may pay from both your gauge and your opponent's gauge." ----
   * The spell only set up nothing. Now it arms f.abxGotcha for this turn; the next monster [Act] gauge payment takes what your own gauge lacks from the opponent's gauge
   * (their cards go to THEIR drop zone), and the flag is used up. */
  OPS.r42Gotcha = { run(s, ctx) { ctx.f.abxGotcha = B.turnCount; return true; }, check: () => true };
  OV42.push([16, /the next time you would pay gauge for a monster's \[act\]/i, () => ({ kind: "spell", steps: [{ op: "r42Gotcha" }] })]);
  (function () {
    const armed = (f, unit, ab) => f.abxGotcha === B.turnCount && unit && unit.card && unit.card.type === "Monster" && (!ab || ab.kind === "act" || ab.kind === "modal");
    const prevCUA = ABX.canUseAct;
    ABX.canUseAct = function (side, card, ab, unit) {
      const f = F(side), e = F(otherSide(side));
      if (!armed(f, unit, ab) || !e.gauge.length) return prevCUA.apply(this, arguments);
      const own = f.gauge, saved = own.slice();
      f.gauge = own.concat(e.gauge);      // "both your gauge and your opponent's": only for the affordability check
      try { return prevCUA.apply(this, arguments); } finally { f.gauge = saved; }
    };
    const prevPay = OPS.pay.run;
    OPS.pay.run = function (s, ctx) {
      const f = ctx.f, e = ctx.e || F(otherSide(ctx.side));
      if (s && s.gauge && f.gauge.length < s.gauge && armed(f, ctx.unit, ctx.ab) && f.gauge.length + e.gauge.length >= s.gauge) {
        let need = s.gauge - f.gauge.length;
        while (f.gauge.length) f.drop.push(f.gauge.pop());
        while (need-- > 0) e.drop.push(e.gauge.pop());
        f.abxGotcha = null;
        const rest = Object.assign({}, s, { gauge: 0 });
        return (rest.life || rest.restSelf) ? prevPay.call(this, rest, ctx) : true;
      }
      if (s && s.gauge && armed(f, ctx.unit, ctx.ab) && f.gauge.length >= s.gauge) f.abxGotcha = null;   // paid from your own gauge: the "next time" is used up
      return prevPay.apply(this, arguments);
    };
  })();

  /* ---- [r42] cards that count the cards put under the opponent's flag ----
   * #5069 Scar Bind: "You may only cast this card if your opponent has a card under their flag" was not enforced.
   * #5060 Curse Decline: "You may cast this card without paying its [Cast Cost] if your opponent has eight or more cards under their flag" always cost 2 gauge + 1 life. */
  (function () {
    const underOf = (fighter) => (fighter && Array.isArray(fighter.flagUnderFaceUp)) ? fighter.flagUnderFaceUp.length : 0;
    const foeOf = (fighter) => (B.plr === fighter ? B.opp : B.plr);
    const prevCB = core.castBlock;
    core.castBlock = function (fighter, card) {
      const r = prevCB ? prevCB.apply(this, arguments) : null;
      if (r) return r;
      return card && card.id === 5069 && underOf(foeOf(fighter)) < 1 ? "Your opponent has no card under their flag." : null;
    };
    const prevPCC = root.parseCardCost;
    if (typeof prevPCC === "function") {
      root.parseCardCost = function (costStr, skillStr, fighter, cardObj) {
        const c = prevPCC.apply(this, arguments);
        try { if (cardObj && cardObj.id === 5060 && fighter && underOf(foeOf(fighter)) >= 8) return Object.assign({}, c, { gauge: 0, life: 0 }); } catch (e) { /* ignore */ }
        return c;
      };
    }
  })();

  /* ---- [r42] batch A: cards that only ran on the generic fallback ---- */
  // #6558 Demon Lord, Gagnar "Re:B": "return all cards from each player's gauge into their owner's decks, and shuffle them. Then, if two or more of your opponent's gauge
  // were returned, put the top three cards of your deck into your gauge." (the parse shuffled and milled 3 first, in the wrong order, and never returned the gauge)
  OPS.r42GagnarVortex = {
    async run(s, ctx) {
      const f = ctx.f, e = ctx.e, side = ctx.side;
      const back = (x) => { const n = x.gauge.length; x.deck.push(...x.gauge.splice(0)); return n; };
      back(f); const oppN = back(e);
      if (B.shuffleFighterDeck) { B.shuffleFighterDeck(side); B.shuffleFighterDeck(otherSide(side)); }
      if (oppN >= 2) f.gauge.push(...f.deck.splice(0, 3));
      fresh(); return true;
    }, check: () => true
  };
  OV42.push([6558, /return all cards from each player'?s gauge into their owner'?s decks/i, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [], steps: [{ op: "r42GagnarVortex" }] })]);
  // #725 Actor Knights High Priest: "When you call a «Tarot» monster other than 'Actor Knights High Priest', you gain 1 life. (once per turn)" - was read as an enter trigger of itself
  OV42.push([725, /when you call a .tarot. monster other than/i, () => ({ kind: "triggered", trigger: { event: "otherEnter", np: np({ tribes: ["Tarot"], types: ["monster"], notNames: ["actor knights high priest"] }, "field") }, conds: [], once: "turn", steps: [{ op: "life", who: "you", n: 1 }] })]);

  /* ---- [r42] Hero World batch 1: «Battle Poet» discard cards ----
   * "When this card is discarded from hand due to the effect of a card with 'Battle Poet' in its card name" (#2662 #3250) was read as an ENTER trigger (so it fired on the call, not on the discard),
   * and the "You may discard a Battle Poet card. If you do ..." act clauses (#2113 #4663) ran their result BEFORE the discard. */
  (function () {
    const prevFD = ABX.fireDiscarded;
    ABX.fireDiscarded = function (side, card) {
      try { if (card) { const f = F(side); f.discardSrc = f.discardSrc || {}; f.discardSrc[card.id] = (ABX.curEffectCard && ABX.curEffectCard.name) || ""; } } catch (e) { /* ignore */ }
      return prevFD.apply(this, arguments);
    };
    const XCd = ABX.extraCond = ABX.extraCond || {};
    XCd.xDiscardByName = (c, ctx) => String(((ctx.f.discardSrc || {})[ctx.card && ctx.card.id]) || "").toLowerCase().includes(c.name);
    ABX.COND_OK.add("xDiscardByName");
  })();
  const POET_HAND = () => np({ names: ["battle poet"] }, "hand");
  const POET_FIELD = () => { const n = np({ names: ["battle poet"] }, "field"); n.qty.all = true; return n; };
  const DISCARD_POET = () => ({ op: "discard", n: 1, optional: true, np: POET_HAND(), src: "discard a card with \"Battle Poet\" in its card name" });
  OV42.push([2662, /when this card is discarded from hand due to the effect/i, () => ({ kind: "triggered", trigger: { event: "discardedFromHand", self: true }, conds: [{ t: "xDiscardByName", name: "battle poet" }], steps: [{ op: "draw", who: "you", n: 1 }] })]);
  OV42.push([3250, /when this card is discarded from your hand by an effect/i, () => ({ kind: "triggered", trigger: { event: "discardedFromHand", self: true }, conds: [{ t: "xDiscardByName", name: "battle poet" }], steps: [{ op: "mill", who: "you", n: 1, to: "gauge" }, { op: "life", who: "you", n: 1 }] })]);
  OV42.push([2113, /you may discard a card with .battle poet. in its card name/i, () => ({ kind: "act", tags: ["act"], once: "turn", conds: [], steps: [DISCARD_POET(),
    { op: "boost", np: POET_FIELD(), mods: { power: 0, defense: 0, critical: 0, kws: ["double attack"] }, gate: "ifYouDo", src: "for this turn, a card with Battle Poet in its card name on your field gets [Double Attack]" }] })]);
  OV42.push([4663, /you may drop a hand card with .battle poet. in its card name/i, (ab) => ({ kind: "act", tags: ["counter", "act"], conds: [], steps: [{ op: "discard", n: 1, optional: true, np: POET_HAND(), src: "drop a hand card with Battle Poet in its card name" }, clone(ab.steps.find(x => x.op === "stand"))] })]);

  /* ---- [r42] Hero World batch 2: «Battle Building» "if it entered the field by a «Battle Building» effect" ----
   * The bonus half of #4465 #4494 #4503 #4523 #4528 #6215 #6418 ran through the keyword guesser (draw/destroy/gauge happened every time or never). The engine now remembers which card's
   * effect called a monster (battle.completeMonsterCall with isAbilityCall), and the bonus steps are gated on that card's tribe. */
  (function () {
    const prevCMC = B.completeMonsterCall;
    if (typeof prevCMC === "function") {
      B.completeMonsterCall = function (side, pos, handIdx, isBuddy, isAbility) {
        try {
          const f = F(side), cid = f.hand[handIdx];
          f.enterSrc = f.enterSrc || {};
          if (isAbility && cid != null) f.enterSrc[cid] = { card: ABX.curEffectCard || null, turn: B.turnCount }; else if (cid != null) delete f.enterSrc[cid];
        } catch (e) { /* ignore */ }
        return prevCMC.apply(this, arguments);
      };
    }
    const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const XCe = ABX.extraCond = ABX.extraCond || {};
    XCe.xEnteredByTribe = (c, ctx) => {
      const src = (ctx.f.enterSrc || {})[ctx.card && ctx.card.id];
      if (!src || src.turn !== B.turnCount || !src.card || src.card.id === ctx.card.id) return false;
      return (c.tribes || []).some(tb => (src.card.attrs || []).some(a => norm(a) === norm(tb)));
    };
    ABX.COND_OK.add("xEnteredByTribe");
  })();
  OPS.r42NoStandChosen = {
    async run(s, ctx) {
      const cands = core.fieldUnits(otherSide(ctx.side), true).map(r => ({ k: r.pos === "item" || r.pos === "item2" ? "item" : "unit", side: otherSide(ctx.side), pos: r.pos, unit: r.unit, card: r.card, id: r.card.id }));
      if (!cands.length) return false;
      const ch = (await core.pick(cands, { qty: { n: 1 } }, ctx, { intent: "harm", title: `${ctx.card.name} - choose a card: it cannot [Stand] this turn and the next turn` })) || [];
      ch.forEach(r => { r.unit.abxNo = r.unit.abxNo || {}; r.unit.abxNo.stand = true; });   // skips the next stand phase
      fresh(); return ch.length > 0;
    }, check: () => true
  };
  const BBC = { t: "xEnteredByTribe", tribes: ["Battle Building"] };
  const parseS = (t) => { const r = ABX.parseSentenceSteps(t, {}); return (r && r.steps) || []; };
  const withCond = (steps, cond) => steps.map(x => Object.assign({}, x, { cond: clone(cond) }));
  const ENTER = { event: "enter", self: true };
  OV42.push([4465, /if this card entered the field by a .battle building. effect/i, (ab) => ({ kind: "triggered", trigger: ENTER, conds: [], steps: [clone(ab.steps.find(x => x.op === "shield")), ...withCond(parseS("draw a card"), BBC)] })]);
  OV42.push([4494, /if it entered the field by a .battle building. effect/i, (ab) => ({ kind: "triggered", trigger: ENTER, conds: [], steps: [clone(ab.steps.find(x => x.op === "draw")), { op: "r42NoStandChosen", cond: clone(BBC) }] })]);
  OV42.push([4523, /if it entered the field by a .battle building. effect/i, (ab) => ({ kind: "triggered", trigger: ENTER, conds: [], steps: [clone(ab.steps[0]), ...withCond(parseS("destroy a card on your opponent's field"), BBC)] })]);
  OV42.push([4528, /if it entered the field by a .battle building. effect/i, (ab) => ({ kind: "triggered", trigger: ENTER, conds: [], steps: [clone(ab.steps[0]), ...withCond(parseS("put the top two cards of your deck into your gauge"), BBC)] })]);
  OV42.push([4503, /if it entered the field or was \[ride\] by another/i, () => ({ kind: "triggered", trigger: ENTER, also: [{ event: "equipped", self: true }], conds: [], steps: [...parseS("you gain 2 life"), ...withCond(parseS("you gain 3 life"), BBC)] })]);
  OV42.push([6418, /if this card entered the field by the effect of/i, (ab) => ({ kind: "triggered", trigger: ENTER, conds: [], steps: [clone(ab.steps[0]), Object.assign(clone(ab.steps[1]), { cond: clone(BBC) })] })]);
  OV42.push([6215, /if it entered the field or was \[ride\] by another/i, () => ({ kind: "triggered", trigger: ENTER, also: [{ event: "equipped", self: true }], conds: [], steps: [...parseS("you gain 3 life"),
    ...withCond(parseS("put up to one «Battle Building» or «Super Robot» monster from your deck into your drop zone"), { t: "xEnteredByTribe", tribes: ["Battle Building", "Super Robot"] }),
    Object.assign(parseS("draw a card")[0], { gate: "ifYouDo" }), { op: "shuffle", who: "you", cond: { t: "xEnteredByTribe", tribes: ["Battle Building", "Super Robot"] } }] })]);

  /* ---- [r42] Hero World batch 3: element conditions + a few trigger-event mix-ups ---- */
  const DROP_HAS = (tribe) => has({ tribes: [tribe] }, "drop zone");
  // #3219 Mud-Wind Demon Geanemos: only "if you have «Earth» and «Wind» in your drop zone" - the condition was lost, so it returned a card every time
  OV42.push([3219, /if you have .earth. and .wind. in your drop zone/i, () => ({ kind: "triggered", trigger: ENTER, conds: [{ t: "and", list: [DROP_HAS("Earth"), DROP_HAS("Wind")] }], steps: parseS("return a card from your opponent's field to their hand, and you gain 1 life") })]);
  // #3280 Water-Flame Demon Hydropyro: same ("«Fire» and «Water» in your drop zone")
  // #3280: choose an opposing monster, drop one of its souls, then destroy that same monster (dropSoul leaves no "that card" for the destroy step)
  OPS.r42DropSoulDestroy = {
    async run(s, ctx) {
      const e = ctx.e, cands = ["left", "center", "right"].filter(p => e.monsters[p]).map(p => ({ pos: p, unit: e.monsters[p], side: ctx.side === "plr" ? "opp" : "plr" }));
      if (!cands.length) return false;
      const ch = await core.pick(cands.map(c => Object.assign(c, { id: c.unit.card ? c.unit.card.id : c.unit.id, area: "field" })), { qty: { n: 1, upTo: false } }, ctx, { intent: "harm", title: `${ctx.card.name} - choose an opponent's monster` });
      const t = ch && ch[0]; if (!t) return false;
      if ((t.unit.soul || []).length) e.drop.push(t.unit.soul.pop());
      battle.destroyMonster(t.side, t.pos); fresh(); return true;
    }, check: () => true
  };
  OV42.push([3280, /if you have .fire. and .water. in your drop zone/i, (ab) => ({ kind: "triggered", trigger: ENTER, conds: [{ t: "and", list: [DROP_HAS("Fire"), DROP_HAS("Water")] }], steps: [{ op: "r42DropSoulDestroy" }] })]);
  // #3278 Armor Talisman: ELEMENT CONTROL - four independent "if you have «X» in your drop zone" effects
  OV42.push([3278, /if you have .fire. in your drop zone, deal 1 damage/i, () => ({ kind: "spell", tags: ["counter"], once: "turn", conds: [], steps: [
    ...withCond(parseS("deal 1 damage to your opponent"), DROP_HAS("Fire")), ...withCond(parseS("put the top card of your deck into your gauge"), DROP_HAS("Water")),
    ...withCond(parseS("draw a card"), DROP_HAS("Wind")), ...withCond(parseS("you gain 1 life"), DROP_HAS("Earth"))] })]);
  // #1987 Noble of Darkness Killnight: "When this card is put into your drop zone from hand, either put the top card of your deck into your gauge, or put a card from your opponent's gauge into their drop zone"
  OPS.r42Killnight = {
    async run(s, ctx) {
      const f = ctx.f, e = ctx.e;
      let pick = 0;
      if (!(ctx.auto || ABX.autoPlay || f.isBot) && ABX.ui && ABX.ui.pickOption) pick = await ABX.ui.pickOption({ title: `${ctx.card.name} - choose one`, options: [{ label: "Put the top card of your deck into your gauge" }, { label: "Put a card from your opponent's gauge into their drop zone" }] });
      if (pick === 1) { if (!e.gauge.length) return false; e.drop.push(e.gauge.pop()); }
      else { if (!f.deck.length) return false; f.gauge.push(f.deck.shift()); }
      fresh(); return true;
    }, check: () => true
  };
  OV42.push([1987, /when this card is put into your drop zone from hand/i, () => ({ kind: "triggered", trigger: { event: "discardedFromHand", self: true }, conds: [], steps: [{ op: "r42Killnight" }] })]);
  // #2566 Gigadroid Biggest: "When you are [Ride] on this card" (not on every call)
  OV42.push([2566, /when you are \[ride\] on this card/i, () => ({ kind: "triggered", trigger: { event: "equipped", self: true }, conds: [], steps: parseS("put a card from your opponent's gauge into their drop zone") })]);
  // #3282 Megadroid, Larger: put up to two "Droid" monsters from your drop zone on top of your deck
  OV42.push([3282, /put up to two monsters with .droid. in their card names/i, () => ({ kind: "triggered", trigger: ENTER, conds: [], steps: parseS("put up to two monsters with \"Droid\" in their card names from your drop zone on the top of your deck") })]);

  /* ---- [r42] Hero World batch 4: Act chains that drop named field cards, then [Ride] a named card from hand/deck ---- */
  // s: {gauge, need:[names that must be on your field, "@self" = this card], rideId, areas:["hand","deck"], needRide: name you must be riding/equipped on}
  OPS.r42RideChain = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side, field = () => ["left", "center", "right"].map(p => ({ p, u: f.monsters[p] })).filter(x => x.u);
      const found = [];
      for (const n of s.need) {
        if (n === "@self") { const x = field().find(x => x.u === ctx.unit || x.u.card.id === ctx.card.id); if (!x) return false; found.push(x); continue; }
        const x = field().find(x => x.u.card.name === n && !found.includes(x)) || (f.item && f.item.card.name === n && !f.item.isEndrulerFlag ? { item: true, u: f.item } : null);
        if (!x) return false; found.push(x);
      }
      if (s.needRide && !(f.item && f.item.card.name === s.needRide) && !field().some(x => x.u.card.name === s.needRide)) return false;
      const src = ["hand", "deck"].find(a => (s.areas || ["hand", "deck"]).includes(a) && f[a].includes(s.rideId));
      if (!src) return false;
      if (f.gauge.length < (s.gauge || 0)) return false;
      for (let i = 0; i < (s.gauge || 0); i++) f.drop.push(f.gauge.pop());
      found.forEach(x => { if (x.item) { f.drop.push(x.u.card.id); f.item = null; } else { f.drop.push(x.u.card.id); (x.u.soul || []).forEach(sid => f.drop.push(sid.id || sid)); f.monsters[x.p] = null; } });
      f[src].splice(f[src].indexOf(s.rideId), 1); f.hand.push(s.rideId);
      ABX._modeByEffect = true; ABX._modeFree = true;
      let ok; try { ok = battle.equipCardFromHand(side, f.hand.lastIndexOf(s.rideId), "Ride") !== false; } finally { ABX._modeByEffect = false; ABX._modeFree = false; }
      if (src === "deck" && battle.shuffleFighterDeck) battle.shuffleFighterDeck(side);
      fresh(); return ok;
    }, check: () => true
  };
  OV42.push([943, /put a "card serpent"/i, () => ({ kind: "act", steps: [{ op: "r42RideChain", gauge: 4, need: ["Card Serpent", "Card Rhino", "@self"], rideId: 950 }] })]);
  OV42.push([2152, /ultimate card burn.*d-wing/i, () => ({ kind: "act", tags: ["counter"], steps: [{ op: "r42RideChain", gauge: 2, need: ["Ultimate Card Burn", "@self"], rideId: 2107 }] })]);

  // #6217 Kaizerion: "When you [Ride] on this card, put up to four «Brave Machine» with "Deity" in their card names into this card's soul from your deck, and shuffle your deck"
  OPS.r42DeckToSoul = {
    async run(s, ctx) {
      const f = ctx.f, side = ctx.side, unit = ctx.unit || (f.item && f.item.card.id === ctx.card.id ? f.item : null);
      if (!unit) return false;
      const cands = f.deck.map((id, idx) => ({ k: "zone", side, area: "deck", idx, id, card: core.cardOf(id) })).filter(c => c.card && core.matchFilter(c.card, s.filter, null, ctx));
      let n = 0;
      if (cands.length) {
        const ch = await core.pick(cands, { qty: { n: s.n, upTo: true } }, ctx, { intent: "help", min: 0, title: `${ctx.card.name} - put into its soul` });
        (ch || []).forEach(r => { const i = f.deck.indexOf(r.id); if (i >= 0) { f.deck.splice(i, 1); unit.soul = unit.soul || []; unit.soul.push(r.id); n++; } });
      }
      if (s.shuffle && battle.shuffleFighterDeck) battle.shuffleFighterDeck(side);
      fresh(); return n > 0;
    }, check: () => true
  };
  OV42.push([6217, /when you \[ride\] on this card, put up to four/i, () => ({ kind: "triggered", trigger: { event: "equipped", self: true }, conds: [], steps: [{ op: "r42DeckToSoul", n: 4, shuffle: true, filter: { names: ["deity"], tribes: ["Brave Machine"], types: [] } }] })]);

  // #1985 Blue Valor Lord Lancer: "[Counter][Act] If you are not [Transform] into this card, you may pay the [Transform] cost, if you do you may [Transform] into this card from the field"
  OPS.r42TransformFromField = {
    run(s, ctx) {
      const f = ctx.f, side = ctx.side, card = ctx.card;
      if (f.item && f.item.card.id === card.id) return false;                       // already transformed into this card
      const pos = ["left", "center", "right"].find(p => f.monsters[p] && (f.monsters[p] === ctx.unit || f.monsters[p].card.id === card.id));
      if (!pos || !ABX.canModeEquip(side, card, true).ok) return false;
      const u = f.monsters[pos];
      f.monsters[pos] = null; f.hand.push(card.id);
      ABX._modeByEffect = true; ABX._modeFree = false;
      let ok = false; try { ok = battle.equipCardFromHand(side, f.hand.lastIndexOf(card.id), "Transform") !== false; } finally { ABX._modeByEffect = false; }
      const stillHand = f.hand.lastIndexOf(card.id);
      if (!(f.item && f.item.card.id === card.id)) { if (stillHand >= 0) f.hand.splice(stillHand, 1); f.monsters[pos] = u; ok = false; }
      else (u.soul || []).forEach(sid => f.drop.push(sid && sid.id ? sid.id : sid));
      fresh(); return ok;
    }, check: () => true
  };
  OV42.push([1985, /if you are not \[transform\] into this card/i, () => ({ kind: "act", tags: ["counter"], steps: [{ op: "r42TransformFromField" }] })]);
  /* ---- attack-through family (tests/attack_through.js): #3159 turn grant, #5649 "That Girl" static, #6088 Moonlit Black Cats [Set] spell ---- */
  OPS.r42ThroughTurn = { run(s, ctx) { ctx.f.abxThroughTurn = { turn: B.turnCount, tribe: s.tribe }; return true; }, check: () => true };
  OV42.push([3159, /prism dragon.*can attack your opponent even if there is a monster on his or her center/i, (ab) => Object.assign({}, ab, { unparsed: [], steps: [{ op: "r42ThroughTurn", tribe: "PrismDragon" }] })]);
  const prevCAT3 = ABX.canAttackThrough;
  ABX.canAttackThrough = function (side, unit, which) {
    if (prevCAT3 && prevCAT3.apply(this, arguments)) return true;
    try {
      if (which === "own" || !unit || !unit.card) return false;
      const f = F(side), g = f.abxThroughTurn;
      if (g && g.turn === B.turnCount && monsList(f).includes(unit) && hasTribe(unit.card, g.tribe)) return true;                    // #3159
      if (monsList(f).includes(unit) && /that girl/i.test(unit.card.name || "") && fieldHas(f, 5649)) return true;                  // #5649
      if (equippedItems(f).includes(unit) && hasTribe(unit.card, "MoonlitBlackCats") && (f.setSpells || []).some(c => c && c.id === 6088)) return true;   // #6088
    } catch (e) { /* ignore */ }
    return false;
  };
  /* ---- "At the end of the battle that X attacked" family (tests/battle_end_family.js): #2302 #3256 #4543 #5023 #5434 #5556 ---- */
  ABX.attFilterOK = function (t, src, units) {
    const g = t && t.attFilter; if (!g) return true;
    const cid = src && ((src.card && src.card.id) || src.cardId);
    return (units || []).some(x => {
      const u = x && (x.unit || x); if (!u || !u.card) return false;
      if (g.tribes && !g.tribes.some(n => hasTribe(u.card, n))) return false;
      if (g.nameHas && !lc(u.card.name || "").includes(lc(g.nameHas))) return false;
      if (g.soul && !(u === src.unit || u === src.soulHost || (u.soul || []).includes(cid))) return false;
      return true;
    });
  };
  OPS.r42BEAttacker = {
    async run(s, ctx) {
      const f = ctx.f;
      let u;
      if (s.self) u = ctx.unit;
      else u = (B.r42BEUnits || []).map(x => x && (x.unit || x)).find(x => x && ABX.attFilterOK({ attFilter: s.attFilter }, { unit: ctx.unit, soulHost: ctx.soulHost, card: ctx.card }, [{ unit: x }]));
      if (!u) return false;
      if (s.needSoulTribe && !core.fieldUnits(f, true).some(x => x.unit && hasTribe(x.unit.card, s.needSoulTribe) && (x.unit.soul || []).length)) return false;
      if (s.mode === "da") { u.tempDA = true; ABX.grantAttacks(u, 2); return true; }
      if (s.mode === "hand") {
        const pos = ["left", "center", "right", "center2"].find(p => f.monsters[p] === u);
        if (!pos) return false;
        f.monsters[pos] = null; (u.soul || []).forEach(id => f.drop.push(id)); f.hand.push(u.card.id);
        return true;
      }
      return false;
    },
    check: () => true
  };
  [
    [2302, /end of the battle that a monster with "zodiac"/i, { event: "battleEnd", self: false, attFilter: { nameHas: "Zodiac", soul: true } }, [{ op: "r42BEAttacker", mode: "da", attFilter: { nameHas: "Zodiac", soul: true } }]],
    [3256, /end of the battle that a «?superheroine»? on your field attacked/i, { event: "battleEnd", self: false, attFilter: { tribes: ["Superheroine"] } }, [{ op: "r42BEAttacker", mode: "hand", optional: true, attFilter: { tribes: ["Superheroine"] } }]],
    [4543, /end of the battle of that this card attacked/i, { event: "battleEnd", self: true }, [{ op: "r42BEAttacker", mode: "da", self: true, needSoulTribe: "Electrodeity" }]],
    [5023, /end of the battle that this card attacked, put up to one card from the top/i, { event: "battleEnd", self: true }, [{ op: "r40CallTopDeckToken", name: "«Dragod»", power: 6000, defense: 6000, crit: 2, size: 0, attrs: ["Dragod"] }]],
    [5434, /end of the battle that a pastel palettes character/i, { event: "battleEnd", self: false, attFilter: { tribes: ["PastelPalettes"], soul: true } }, [{ op: "damage", who: "opp", n: 1 }]],
    [5556, /end of the battle that the «?adventurer»? or «?dungeon enemy»?/i, { event: "battleEnd", self: false, attFilter: { tribes: ["Adventurer", "DungeonEnemy"], soul: true } }, null]
  ].forEach(([id, re, trigger, steps]) => OV42.push([id, re, () => ({ kind: "triggered", trigger, steps: steps || ABX.parseSentenceSteps("destroy up to one card on your opponent's field", {}).steps })]));
  /* ---- redirect + attack-all family (tests/redirect_family.js): #3841 #5380 passive "change the target of the attacks", #6282 Gatling, #5928 soul Gatling ---- */
  ABX.passiveRedirect = function (defSide, targetPos, units) {
    try {
      if (targetPos === "center") return null;
      const f = F(defSide), c = f.monsters.center;
      if (!c || !c.card) return null;
      if (hasTribe(c.card, "PrismDragon") && (f.setSpells || []).some(x => x && x.id === 3841)) return "center";            // #3841
      if (hasTribe(c.card, "PastelPalettes") && fieldHas(f, 5380)) return "center";                                       // #5380
    } catch (e) { /* ignore */ }
    return null;
  };
  OV42.push([6282, /when this card attacks a character alone, it attacks all characters on your opponent's field instead/i, () => ({ kind: "triggered", trigger: { event: "attack", self: true, alone: true, targetPos: ["left", "center", "right"] }, conds: [], steps: [{ op: "static", kind: "attackAllOpp", includeFighter: false, instead: true }] })]);
  OV42.push([5928, /when this card in the soul of a \[?gridman\]? or \[?powered zenon\]? is attacking a character alone/i, () => ({ kind: "triggered", trigger: { event: "attack", self: true, soulSelf: true, alone: true, hostNames: ["gridman", "powered zenon"], targetPos: ["left", "center", "right"] }, conds: [], steps: [{ op: "static", kind: "attackAllOpp", includeFighter: false, instead: true }] })]);
  /* ---- cost reductions handled inside game.js parseCardCost (tests/gauge_cost.js): #1961 #3920 #4764; marks the text lines as built ---- */
  [[1961, /amount of gauge written on the \[call cost\] is reduced by the number of 72 pillars/i], [3920, /gauge cost written in this card's \[cast cost\] is reduced by 3/i], [4764, /\[call cost\] is reduced by 4 gauge if you have used \[overturn\]/i]]
    .forEach(([id, re]) => OV42.push([id, re, () => ({ kind: "static", steps: [{ op: "static", kind: "r42CostHandled" }], conds: [] })]));
  /* ---- put-into-drop-zone triggers that feed the gauge (tests/drop_gauge.js): #304 #1003 #1987 ---- */
  TG(1003, "when this card is put into your drop zone from your hand or field", LEAVE_SELF, "put a card from your opponent's gauge into the drop zone", { also: [{ event: "discardedFromHand", self: true }] });
  TG(1987, "when this card is put into your drop zone from hand", { event: "discardedFromHand", self: true }, "either put the top card of your deck in your gauge, or put a card from your opponent's gauge into his or her drop zone");
  TG(304, "when this card is called from your drop zone", { event: "enterFromDrop", owner: "you", np: { filter: { namesExact: [String((core.cardOf(304) || {}).name || "?").toLowerCase()] } } }, "put the top card of your deck into your gauge");
  /* ---- gain-life-on-enter cards (tests/enter_life.js): #4066 #4315 #1962; entry-by-effect tracking (unit.abxEnteredByEffect / abxEnteredBy) ---- */
  const prevFE42 = ABX.fireEnter;
  ABX.fireEnter = function (side, card, unit) {
    if (unit && !unit.abxCalledFromHand) { const st = ABX.srcStack || []; unit.abxEnteredByEffect = st.length > 0; unit.abxEnteredBy = st.length ? st[st.length - 1] : null; }
    return prevFE42.apply(this, arguments);
  };
  OPS.r42LifePer = {
    run(s, ctx) {
      const f = ctx.f;
      const n = s.per === "items" ? equippedItems(f).length : core.fieldUnits(f, true).filter(x => x.unit && x.unit.card.type === "Monster" && hasTribe(x.unit.card, s.tribe)).length;
      if (n > 0) f.life += n;
      fresh(); return n > 0;
    }, check: () => true
  };
  OPS.r42Enter1962 = {
    run(s, ctx) {
      if (!(ctx.unit && ctx.unit.abxEnteredByEffect)) return false;
      const f = ctx.f; if (f.deck.length) f.gauge.push(f.deck.shift());
      f.life += 1; fresh(); return true;
    }, check: () => true
  };
  [[4066, /you gain 1 life equal to the number of items you have equipped/i, { op: "r42LifePer", per: "items" }],
   [4315, /you gain 1 life for every .?deity dragon tribe.? monster on your field/i, { op: "r42LifePer", per: "tribe", tribe: "DeityDragonTribe" }],
   [1962, /when this card enters the field due to an effect/i, { op: "r42Enter1962" }]]
    .forEach(([id, re, step]) => OV42.push([id, re, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [], steps: [step] })]));
  /* ---- "put into the drop zone from a soul" (tests/soul_drop.js): #4188 #5317 ---- */
  TG(4188, "when this card is put into the drop zone from the soul", { event: "soulToDrop", self: true }, "put the top card of your deck into your gauge, you gain 1 life, and draw a card", { conds: [{ t: "turn", who: "opp" }] });
  TG(5317, "when this card is put into your drop zone from soul", { event: "soulToDrop", self: true }, "put the top card of your deck into your gauge, you gain 1 life, and draw a card", { conds: [{ t: "turn", who: "opp" }] });
  /* ---- soul protections vs the opponent's effects (tests/soul_protect.js): #2276 #2693 #2889 #4058 #4185 #5167 ---- */
  const prevProt44 = core.isProtected;
  core.isProtected = function (unit, side, kind, ctx) {
    if (prevProt44.apply(this, arguments)) return true;
    try {
      if (!unit || !unit.card) return false;
      if (!(!ctx || !ctx.side || ctx.side !== side)) return false;   // only the opponent's effects
      const has = (id) => (unit.soul || []).some(e => soulIdOf(e) === id);
      if (kind === "souls dropped") {
        if (unit.card.id === 2693) return true;                                     // #2693 "The soul of this card cannot be put to the drop zone by effects from your opponent's cards"
        if (has(5167) && hasTribe(unit.card, "PrismDragon")) return true;           // #5167 souls in the «Prism Dragon» with this card in its soul
        if (has(4185) && hasTribe(unit.card, "Computer")) return true;              // #4185 its souls cannot be put into the drop zone
      }
      if (kind === "destroyed" && has(4185) && hasTribe(unit.card, "Computer")) return true;   // #4185 that card cannot be destroyed
      if (kind === "nullified" && has(4058) && hasTribe(unit.card, "Plague")) return true;     // #4058 abilities of that card cannot be nullified
    } catch (e) { /* ignore */ }
    return false;
  };
  // single protected soul cards: the opponent's "drop a soul" skips them (#2889 Prism Dragon host, #2276 Dragon Chief Emperor host, #4058 Plague host)
  const SOUL_KEEP = { 2889: "PrismDragon", 2276: "DragonChiefEmperor", 4058: "Plague" };
  const prevDropSoulRun = OPS.dropSoul.run;
  OPS.dropSoul.run = async function (s, ctx) {
    const stash = [];
    try {
      core.fieldUnits(F(otherSide(ctx.side)), true).forEach(x => {
        const u = x.unit; if (!u || !Array.isArray(u.soul)) return;
        const keep = [];
        u.soul = u.soul.filter(e => { const id = soulIdOf(e); if (SOUL_KEEP[id] && hasTribe(u.card, SOUL_KEEP[id])) { keep.push(e); return false; } return true; });
        if (keep.length) stash.push([u, keep]);
      });
    } catch (e) { /* ignore */ }
    try { return await prevDropSoulRun.apply(this, arguments); } finally { stash.forEach(([u, keep]) => { u.soul = keep.concat(u.soul); }); }
  };
  [[2276, /if this card is in the soul of a .?dragon chief emperor/i], [2693, /the soul of this card cannot be put to the drop zone by effects from your opponent/i],
   [2889, /the card in the soul of a .?prism dragon.? monster cannot be put into your drop zone/i], [4058, /if this card is in the soul of a .?plague/i],
   [4185, /if this card is in the soul of a .?computer/i], [5167, /souls in the .?prism dragon.? with this card in its soul cannot be dropped/i]]
    .forEach(([id, re]) => OV42.push([id, re, () => ({ kind: "static", steps: [{ op: "static", kind: "r42CostHandled" }], conds: [] })]));
  /* ---- call + attack restrictions (tests/call_attack_block.js): #276 #5856 attack blocks, #1530 #6237 call blocks ---- */
  const setHas = (fx, id) => !!fx && (fx.setSpells || []).some(c => c && c.id === id);
  const prevAB2 = core.attackBlocked;
  core.attackBlocked = function (attSide, units, defSide, targetPos) {
    const r = prevAB2 ? prevAB2.apply(this, arguments) : null;
    if (r) return r;
    try {
      if (targetPos === "left" || targetPos === "right") {
        if ([B.plr, B.opp].some(fx => setHas(fx, 276))) return `"Final Showdown on the Great Gojo Bridge": monsters on the left and right cannot be attacked`;   // #276
        if (setHas(F(defSide), 5856)) return `"Memories of Only Us Two": your opponent's cards cannot attack characters on the left and right`;   // #5856
      }
    } catch (e) { /* ignore */ }
    return null;
  };
  ABX.callBlockExtra = function (side, card, pos) {
    try {
      if (!card || card.type !== "Monster") return null;
      if (pos === "center" && [B.plr, B.opp].some(fx => setHas(fx, 1530))) return `"No Matter Where, Dragon Rules Supreme": nobody can call monsters to the center`;   // #1530
      const bt = B.r42Battle;
      if (bt && bt.turn === B.turnCount && bt.attSide !== side && (bt.units || []).some(u => u && u.card && u.card.id === 6237 && u.abxNullified !== B.turnCount && F(bt.attSide).monsters && Object.values(F(bt.attSide).monsters).includes(u))) return `"Robo-Emperor": you cannot call characters during this battle`;   // #6237
    } catch (e) { /* ignore */ }
    return null;
  };
  [[276, /monsters on the left and right cannot be attacked by both players/i], [1530, /you and your opponent cannot call monsters to the center/i],
   [5856, /all cards on your opponent's field cannot attack characters on your left and right/i], [6237, /during the battle that this card is attacking, your opponent cannot call characters/i]]
    .forEach(([id, re]) => OV42.push([id, re, () => ({ kind: "static", steps: [{ op: "static", kind: "r42CostHandled" }], conds: [] })]));

  /* deck-building "total of up to N A and B combined" rule: enforced in game.js deckComboGroup (deck editor + auto-fill) */
  [2929, 2936, 3500, 3501, 3502, 3503, 3504].forEach(id =>
    OV42.push([id, /you can only put a total of up to/i, () => ({ kind: "static", steps: [{ op: "static", kind: "r42CostHandled" }], conds: [] })]));

  /* draw/hand family: #774 opp discards, #2638 / #6357 [Set] draw, #2638 leave -> opp discards */
  {
    const OPP_DISCARD = "Your opponent chooses a card from their hand and discards it.";
    const stepsOf = (txt) => { const p2 = ABX.parseSentenceSteps(txt, {}); return p2 && !(p2.unparsed && p2.unparsed.length) ? p2.steps : null; };
    OV42.push([774, /your opponent discards one card/i, () => { const st = stepsOf(OPP_DISCARD); return st && { kind: "spell", steps: st }; }]);
    OV42.push([2638, /when this card is \[set\] and if you have/i, () => { const st = stepsOf("Draw a card."); return st && { kind: "triggered", trigger: { event: "enter", self: true }, conds: [has({ tribes: ["Black Dragon"] }, "drop zone")], steps: st }; }]);
    OV42.push([2638, /put into the drop zone from the field, your opponent/i, () => { const st = stepsOf(OPP_DISCARD); return st && { kind: "triggered", trigger: { event: "leave", self: true }, conds: [], steps: st }; }]);
    OV42.push([6357, /another .{0,3}dark burial.{0,3} is on your field, draw/i, () => { const st = stepsOf("Draw a card."); return st && { kind: "triggered", trigger: { event: "enter", self: true }, conds: [Object.assign(has({ tribes: ["Dark Burial"] }, "field"), { n: 2 })], steps: st }; }]);
  }

  /* #2953 Obstruct: this turn and the next, neither player can draw cards due to their own card effects */
  OPS.r42NoDraw = { run() { const Bt = typeof battle !== "undefined" ? battle : window.battle; Bt.r42NoDrawUntil = (Bt.turnCount || 0) + 1; return true; } };
  OV42.push([2953, /neither player can draw/i, () => ({ kind: "spell", steps: [{ op: "r42NoDraw" }] })]);
  if (OPS.draw && OPS.draw.run && !OPS.draw.r42Wrapped) {
    const drawRun = OPS.draw.run;
    OPS.draw.run = function (s, ctx) {
      const Bt = typeof battle !== "undefined" ? battle : window.battle;
      if (Bt && Bt.r42NoDrawUntil != null && (Bt.turnCount || 0) <= Bt.r42NoDrawUntil) return false;
      return drawRun.apply(this, arguments);
    };
    OPS.draw.r42Wrapped = true;
  }

  /* #3942 discard -> bounce up to two opposing cards (once per turn); #2772 enter -> up to one card from either drop zone to the deck bottom */
  {
    const st = (txt) => { const p2 = ABX.parseSentenceSteps(txt, {}); return p2 && !(p2.unparsed && p2.unparsed.length) ? p2.steps : null; };
    TG(3942, "when a card is discarded from your hand", { event: "handDiscard", owner: "you" }, "Return up to two cards on your opponent's field to their owner's hand.", { once: "turn" });
    OPS.r42DropToDeckBottom = {
      async run(s, ctx) {
        const base = ABX.parseSentenceSteps("Put up to one card in your drop zone on the bottom of your deck.", {}).steps[0].np;
        const mk = (o) => Object.assign(clone(base), { zone: Object.assign({}, base.zone, { owner: o }) });
        const cands = core.refsFor(mk("you"), ctx).concat(core.refsFor(mk("opp"), ctx));
        if (!cands.length) return false;
        const one = Object.assign(clone(base), { parts: null });
        const refs = await core.pick(cands, one, ctx, { intent: "help", title: ctx.card.name + " \u2014 choose", subtitle: "Put up to one card from a drop zone on the bottom of its owner's deck" });
        let did = false;
        (refs || []).slice(0, 1).forEach(r => { const f = F(r.side); const i = f.drop.indexOf(r.id); if (i >= 0) { f.deck.push(f.drop.splice(i, 1)[0]); did = true; } });
        return did;
      }
    };
    OV42.push([2772, /when this card enters the field, put up to one card/i, () => ({ kind: "triggered", trigger: { event: "enter", self: true }, conds: [], steps: [{ op: "r42DropToDeckBottom" }] })]);
  }

  TG(2536, "when this card is put into your drop zone from your field or hand", LEAVE_SELF, "Put the top two cards of your deck into your drop zone and put the top card of your deck into your gauge.", { also: [{ event: "discardedFromHand", self: true }] });

  /* link/attack family: #2637 mill opp on kill, #870 crit from items, #1154 nullify Penetrate, #2783 Spectral Strike, #2554 destroy */
  {
    const stOf = (txt) => { const p2 = ABX.parseSentenceSteps(txt, {}); return p2 && !(p2.unparsed && p2.unparsed.length) ? p2.steps : null; };
    OPS.r42ItemCritBoost = {
      run(s, ctx) {
        const items = [F("plr").item, F("plr").item2, F("opp").item, F("opp").item2].filter(Boolean);
        const n = items.reduce((a, u) => a + (Number(u.card && u.card.crit) || 0), 0);
        if (ctx.unit && n) ctx.unit.tempCrit = (ctx.unit.tempCrit || 0) + n;
        fresh();
        return n > 0;
      }
    };
    OPS.r42NullPenOpp = {
      run(s, ctx) {
        const es = otherSide(ctx.side);
        core.fieldUnits(F(es), true).forEach(r => { if (r.unit) { r.unit.abxNoKw = r.unit.abxNoKw || {}; r.unit.abxNoKw.penetrate = B.turnCount; } });
        fresh();
        return true;
      }
    };
    OPS.r42SpectralStrike = {
      async run(s, ctx) {
        for (const sd of [ctx.side, otherSide(ctx.side)]) {
          const f = F(sd);
          if (!f.deck.length) continue;
          const id = f.deck.shift();
          f.drop.push(id);
          const c = core.cardOf(id);
          if (c && c.type === "Monster") core.applyDamage(sd, 2, { kind: "effect", sourceCard: ctx.card });
          else f.life += 2;
        }
        fresh();
        return true;
      }
    };
    const eqHas = (n) => has({ names: [n], namesExact: [n] }, "field");
    TG(2553, "when this card link attacks with another", { event: "link", self: true, with: NPT("another «Knight»") }, "Deal 1 damage to your opponent!", { conds: [eqHas("thunder beast spear, bestia")] });
    TG(2554, "when this card link attacks with another", { event: "link", self: true, with: NPT("another «Knight»") }, "Destroy a monster or item on your opponent's field.", { conds: [eqHas("wind scaled spear, eskamal")] });
    const keepTrig = (steps) => (ab) => steps && { kind: "triggered", trigger: ab.trigger, conds: ab.conds || [], steps };
    OV42.push([2637, /put the top two cards of your opponent's deck/i, keepTrig(stOf("Put the top two cards of your opponent's deck into their drop zone."))]);
    OV42.push([870, /increase the critical of this card by the sum/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: ab.conds || [], steps: [{ op: "r42ItemCritBoost" }] })]);
    OV42.push([1154, /nullify the \[penetrate\] of all cards/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: ab.conds || [], steps: [{ op: "r42NullPenOpp" }] })]);
    OV42.push([2783, /all fighters put the top card/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: ab.conds || [], steps: [{ op: "r42SpectralStrike" }] })]);
  }

  /* #2683 discard up to two, draw that many (once per turn); #3609 Izmain trade */
  {
    OPS.r42DiscardDraw = {
      async run(s, ctx) {
        const np = ABX.parseSentenceSteps("Put up to two cards in your hand into your drop zone.", {}).steps[0].np;
        const cands = core.refsFor(np, ctx);
        if (!cands.length) return false;
        const refs = (await core.pick(cands, np, ctx, { intent: "help", title: ctx.card.name + " \u2014 discard up to two", subtitle: "Discard up to two cards, then draw that many" })) || [];
        const f = ctx.f; let n = 0;
        for (const r of refs) { const i = f.hand.indexOf(r.id); if (i >= 0) { f.drop.push(f.hand.splice(i, 1)[0]); n++; if (ABX.fireDiscarded) ABX.fireDiscarded(ctx.side, core.cardOf(r.id)); } }
        if (n) await OPS.draw.run({ op: "draw", n }, ctx);
        fresh();
        return n > 0;
      }
    };
    OV42.push([2683, /you may discard up to two cards/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: ab.conds || [], once: "turn", steps: [{ op: "r42DiscardDraw" }] })]);
    OPS.r42IzmainTrade = {
      async run(s, ctx) {
        const units = ((ctx.event && ctx.event.attUnits) || (ABX.battleCtx && ABX.battleCtx.attUnits) || []).filter(Boolean);
        if (!units.length || !ctx.unit) return false;
        const es = otherSide(ctx.side);
        const refs = units.map(u => { const pos = core.posOfUnit(F(es), u); return pos ? { k: (pos.startsWith("item")) ? "item" : "unit", side: es, pos, unit: u, card: u.card, id: u.card.id } : null; }).filter(Boolean);
        const chosen = refs.length > 1 ? await core.pick(refs, { qty: { n: 1 } }, ctx, { intent: "harm", title: ctx.card.name + " \u2014 choose an attacking card" }) : refs;
        if (!chosen || !chosen.length) return false;
        const ok = await OPS.moveSelf.run({ op: "moveSelf", to: { area: "drop zone", owner: "you", end: "top" } }, ctx);
        if (!ok) return false;
        [ctx.side, es].forEach(sd => { const f = F(sd); if (f.deck.length) f.drop.push(f.deck.shift()); });
        ctx.bind = ctx.bind || {}; ctx.bind.chosen = chosen;
        await OPS.destroy.run({ op: "destroy", np: { qty: { n: 1 }, ref: "chosen", self: false, filter: {}, zone: null } }, ctx);
        fresh();
        return true;
      }
    };
    OV42.push([3609, /choose one of the attacking cards/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: ab.conds || [], optional: true, steps: [{ op: "r42IzmainTrade" }] })]);
  }

  /* remaining link/attack + draw/hand families, batch 1: #3656 #1595 #5285 #5998 #3899 #209 */
  {
    const stOf = (txt) => { const p2 = ABX.parseSentenceSteps(txt, {}); return p2 && !(p2.unparsed && p2.unparsed.length) ? p2.steps : null; };
    const trig2 = (ab, extra) => Object.assign({ kind: "triggered", trigger: ab.trigger, conds: ab.conds || [] }, extra);
    // #3656 BFF Sensor
    OV42.push([3656, /bff sensor|your other monster enters/i, () => { const st = stOf("Look at the top three cards of your deck, put up to one Thunder Empire from among them into your hand, and put the rest on the bottom of your deck."); return st && { kind: "triggered", trigger: { event: "otherEnter", np: ABX.parseNP("other monster") }, conds: [], once: "turn", steps: st }; }]);
    // #1595 [Act] discard this card from hand + 1 gauge: search a "Duel Sieger" card
    OPS.r42DiscardSelfSearch = {
      async run(s, ctx) {
        const f = ctx.f, i = f.hand.indexOf(ctx.card.id);
        if (i < 0 || f.gauge.length < 1) return false;
        f.drop.push(f.gauge.pop());
        f.drop.push(f.hand.splice(i, 1)[0]);
        if (ABX.fireDiscarded) ABX.fireDiscarded(ctx.side, ctx.card);
        const st = stOf("Search your deck for one card with Duel Sieger in its card name, put it into your hand, and shuffle your deck.");
        for (const x of st) await OPS[x.op].run(x, ctx);
        fresh();
        return true;
      }
    };
    OV42.push([1595, /you may discard this card from your hand and pay 1 gauge/i, () => ({ kind: "act", tags: ["act"], conds: [], from: "hand", steps: [{ op: "r42DiscardSelfSearch" }] })]);
    // #5285 Ai Haibara's Day: drop a hand card as cost, draw two, once per turn
    OPS.r42DropHandCost = { async run(s, ctx) { const f = ctx.f; if (!f.hand.length) return false; const np = ABX.parseSentenceSteps("Put a card in your hand into your drop zone.", {}).steps[0].np; const refs = await core.pick(core.refsFor(np, ctx), np, ctx, { intent: "help", title: ctx.card.name + " \u2014 drop a hand card (cost)" }); const r = refs && refs[0]; if (!r) return false; const i = f.hand.indexOf(r.id); if (i < 0) return false; f.drop.push(f.hand.splice(i, 1)[0]); if (ABX.fireDiscarded) ABX.fireDiscarded(ctx.side, core.cardOf(r.id)); return true; } };
    OV42.push([5285, /draw two cards/i, () => ({ kind: "spell", once: "turn", conds: [], steps: [{ op: "r42DropHandCost" }].concat(stOf("Draw two cards.")) })]);
    // #5998 crit reduced per Reversal
    OV42.push([5998, /critical of a card on your opponent's field is reduced/i, (ab) => { const st = stOf("For this turn, a card on your opponent's field gets critical-1."); if (!st) return null; st[0].each = { perReversal: true }; return trig2(ab, { steps: st }); }]);
    // #3899 Asmodai: when a 72 Pillars / Thunder Empire monster enters your field, choose an opp card, may discard a hand card; if you do destroy it
    OPS.r42AsmodaiKill = {
      async run(s, ctx) {
        const f = ctx.f;
        const cnp = ABX.parseSentenceSteps("Destroy a card on your opponent's field.", {}).steps[0].np;
        const cands = core.refsFor(cnp, ctx);
        if (!cands.length || !f.hand.length) return false;
        const ch = await core.pick(cands, cnp, ctx, { intent: "harm", title: ctx.card.name + " \u2014 choose a card" });
        if (!ch || !ch.length) return false;
        const hnp = ABX.parseSentenceSteps("Put up to one card in your hand into your drop zone.", {}).steps[0].np;
        const hr = await core.pick(core.refsFor(hnp, ctx), hnp, ctx, { intent: "help", title: ctx.card.name + " \u2014 you may discard a card" });
        const r = hr && hr[0]; if (!r) return false;
        const i = f.hand.indexOf(r.id); if (i < 0) return false;
        f.drop.push(f.hand.splice(i, 1)[0]); if (ABX.fireDiscarded) ABX.fireDiscarded(ctx.side, core.cardOf(r.id));
        ctx.bind = ctx.bind || {}; ctx.bind.chosen = ch;
        await OPS.destroy.run({ op: "destroy", np: { qty: { n: 1 }, ref: "chosen", self: false, filter: {}, zone: null } }, ctx);
        fresh();
        return true;
      }
    };
    OV42.push([3899, /when .{0,3}72 pillars.{0,3} or .{0,3}thunder empire/i, () => ({ kind: "triggered", trigger: { event: "otherEnter", np: ABX.parseNP("«Pillars» or «Thunder Empire» monster") }, conds: [], steps: [{ op: "r42AsmodaiKill" }] })]);
    OV42.push([1595, /also regarded as/i, () => ({ kind: "rule", steps: [] })]);
    OV42.push([5285, /\[cast cost\]/i, () => ({ kind: "static", steps: [{ op: "static", kind: "r42CostHandled" }], conds: [] })]);
    // #209: cast timing line is covered by the free-counter window
    OV42.push([209, /you may cast this during an attack/i, () => ({ kind: "static", steps: [{ op: "static", kind: "r42CostHandled" }], conds: [] })]);
  }

  /* batch 2: #857 #6560 #1504 #91 #1959 #5987 #5536 */
  {
    const stOf = (txt) => { const p2 = ABX.parseSentenceSteps(txt, {}); return p2 && !(p2.unparsed && p2.unparsed.length) ? p2.steps : null; };
    const MARK = () => ({ kind: "static", steps: [{ op: "static", kind: "r42CostHandled" }], conds: [] });
    // #857 Remote Punishment: damage = number of monsters destroyed by this attack
    OPS.r42RemotePunish = { run(s, ctx) { const n = (ctx.event && ctx.event.destroyedCount) || 1; core.applyDamage(otherSide(ctx.side), n, { kind: "effect", sourceCard: ctx.card }); fresh(); return true; } };
    OV42.push([857, /remote punishment/i, () => ({ kind: "triggered", trigger: { event: "attackDestroys", self: true }, conds: [], steps: [{ op: "r42RemotePunish" }] })]);
    // #6560: attack with 20+ cards in both drop zones
    OPS.r42DaredevilBoom = {
      async run(s, ctx) {
        if (F("plr").drop.length + F("opp").drop.length < 20) return false;
        for (const x of stOf("Destroy all cards on your opponent's field, and for this turn, this card gets critical+3.")) await OPS[x.op].run(x, ctx);
        return true;
      }
    };
    OV42.push([6560, /twenty or more cards/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], steps: [{ op: "r42DaredevilBoom" }] })]);
    // #1504 It Takes Two to Clap (once per turn)
    OPS.r42TakesTwo = {
      async run(s, ctx) {
        const did = {};
        for (const sd of [ctx.side, otherSide(ctx.side)]) {
          const f = F(sd); if (!f.hand.length) continue;
          const cands = f.hand.map((id, idx) => ({ k: "zone", side: sd, area: "hand", idx, id, card: core.cardOf(id) }));
          const ch = await core.pick(cands, { qty: { n: 1, upTo: true } }, ctx, { chooserSide: sd, intent: "cost", title: ctx.card.name + " \u2014 you may discard a card" });
          const r = ch && ch[0]; if (!r) continue;
          const i = f.hand.indexOf(r.id); if (i < 0) continue;
          f.drop.push(f.hand.splice(i, 1)[0]); did[sd] = true; if (ABX.fireDiscarded) ABX.fireDiscarded(sd, core.cardOf(r.id));
        }
        const sds = [ctx.side, otherSide(ctx.side)];
        if (did[sds[0]] !== did[sds[1]] || (!did[sds[0]] && !did[sds[1]])) sds.forEach(sd => { if (!did[sd]) core.applyDamage(sd, 2, { kind: "effect", sourceCard: ctx.card }); });
        fresh();
        return true;
      }
    };
    OV42.push([1504, /you and your opponent may discard a card/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], once: "turn", steps: [{ op: "r42TakesTwo" }] })]);
    // #91 Cabal Preparations
    OPS.r42CabalPrep = {
      async run(s, ctx) {
        const f = ctx.f;
        const cands = f.hand.map((id, idx) => ({ k: "zone", side: ctx.side, area: "hand", idx, id, card: core.cardOf(id) })).filter(x => x.card && x.card.type === "Spell" && x.card.set && ((x.card.worlds || []).includes("Magic World") || x.card.world === "Magic World"));
        if (!cands.length) return false;
        const ch = await core.pick(cands, { qty: { n: 1, upTo: true }, raw: "a Magic World spell with Set" }, ctx, { intent: "help", title: ctx.card.name + " \u2014 you may cast a spell" });
        if (!ch || !ch.length) return false;
        ctx.bind = ctx.bind || {}; ctx.bind.chosen = [Object.assign({}, ch[0], { area: "hand" })];
        return OPS.castFrom.run({ op: "castFrom", ref: "chosen", pay: false }, ctx);
      }
    };
    OV42.push([91, /cabal preparations/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], steps: [{ op: "r42CabalPrep" }] })]);
    // #1959 BAR King Solomon
    TG(1959, "when the number of cards in your opponent's hand increases", { event: "handUp", owner: "opp" }, "your opponent chooses and drops a hand card", { once: "turn" });
    // #5987 Time Scout, Khan
    OPS.r42KhanPunish = {
      async run(s, ctx) {
        const f = ctx.f, e = ctx.e;
        if (!(((f.godclock && f.godclock.reversalCount) || 0) > 0) || !e.hand.length) return false;
        const cands = e.hand.map((id, idx) => ({ k: "zone", side: otherSide(ctx.side), area: "hand", idx, id, card: core.cardOf(id) }));
        const ch = await core.pick(cands, { qty: { n: 1 } }, ctx, { chooserSide: otherSide(ctx.side), intent: "cost", title: "Choose a hand card to put on the bottom of your deck" });
        const r = ch && ch[0]; if (!r) return false;
        const i = e.hand.indexOf(r.id); if (i < 0) return false;
        e.deck.push(e.hand.splice(i, 1)[0]); fresh(); return true;
      }
    };
    OV42.push([5987, /returned to hand or deck by your card effects/i, () => ({ kind: "triggered", trigger: { event: "fieldToHand", owner: "opp" }, conds: [], once: "turn", steps: [{ op: "r42KhanPunish" }] })]);
    // #5536 Liim: returned at the final phase by ABX.fireTurnEvent (engine special case)
    OV42.push([5536, /at the start of the final phase of a turn that this card is dropped from your hand/i, MARK]);
  }

  /* batch 3: #6213 #6223 #6216 #2129 #5368(enter part) #5702 */
  {
    const stOf = (txt) => { const p2 = ABX.parseSentenceSteps(txt, {}); return p2 && !(p2.unparsed && p2.unparsed.length) ? p2.steps : null; };
    const attrHas = (c, re) => (c.attrs || []).some(a => re.test(String(a).replace(/\s+/g, "").toLowerCase()));
    // #6213 Primary Addition (once per turn)
    OPS.r42PrimaryAddition = {
      async run(s, ctx) {
        const f = ctx.f;
        const cands = f.hand.map((id, idx) => ({ k: "zone", side: ctx.side, area: "hand", idx, id, card: core.cardOf(id) })).filter(x => x.card && (attrHas(x.card, /^quartetfive$/) || attrHas(x.card, /^superwarrior$/)));
        if (!cands.length) return false;
        const ch = await core.pick(cands, { qty: { n: 1, upTo: true }, raw: "a Quartet Five or Super Warrior" }, ctx, { intent: "cost", title: ctx.card.name + " \u2014 you may drop a card" });
        const r = ch && ch[0]; if (!r) return false;
        const i = f.hand.indexOf(r.id); if (i < 0) return false;
        f.drop.push(f.hand.splice(i, 1)[0]); if (ABX.fireDiscarded) ABX.fireDiscarded(ctx.side, core.cardOf(r.id));
        for (const x of stOf("Put the top two cards of your deck into your gauge, and draw two cards.")) await OPS[x.op].run(x, ctx);
        fresh();
        return true;
      }
    };
    OV42.push([6213, /you may drop a .{0,3}quartet five/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], once: "turn", steps: [{ op: "r42PrimaryAddition" }] })]);
    // #6223 look at top five, take one Gaigrander (non-impact) or a size 3 impact monster; rest to the bottom
    OPS.r42GaigranderLook = {
      async run(s, ctx) {
        const f = ctx.f, n = Math.min(5, f.deck.length);
        if (!n) return false;
        const top = f.deck.splice(0, n);
        const cands = top.map((id, idx) => ({ k: "zone", side: ctx.side, area: "looked", idx, id, card: core.cardOf(id) })).filter(x => x.card && ((/gaigrander/i.test(x.card.name) && x.card.type !== "Impact") || (x.card.type === "Impact" && x.card.size === 3)));
        let took = null;
        if (cands.length) { const ch = await core.pick(cands, { qty: { n: 1, upTo: true }, raw: "a card" }, ctx, { intent: "help", title: ctx.card.name + " \u2014 take up to one card" }); took = ch && ch[0]; }
        if (took) { const i = top.indexOf(took.id); if (i >= 0) f.hand.push(top.splice(i, 1)[0]); }
        f.deck.push(...top);
        fresh();
        return !!took;
      }
    };
    OV42.push([6223, /look at the top five cards/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], steps: [{ op: "r42GaigranderLook" }] })]);
    // #6216 [Ride] from hand as a Counter [Act]
    OV42.push([6216, /\[ride\] into this card from your hand/i, () => ({ kind: "act", tags: ["counter", "act"], conds: [], steps: [{ op: "transformSelf" }] })]);
    // #2129 when destroyed: [Transform]/[Ride] from hand for free
    OV42.push([2129, /when this card is destroyed, you may \[transform\]/i, () => ({ kind: "triggered", trigger: { event: "leave", self: true }, conds: [], steps: [{ op: "transformFrom", areas: ["hand"], free: true, np: { filter: {} } }] })]);
    // #5368 Formation Clear: Astrodragon enters -> top deck to gauge, +1 life (once per turn)
    OV42.push([5368, /when an .{0,3}astrodragon.{0,3} monster enters your field/i, () => { const st = stOf("Put the top card of your deck into your gauge, and you gain 1 life."); return st && { kind: "triggered", trigger: { event: "otherEnter", np: ABX.parseNP("«Astrodragon» monster") }, conds: [], once: "turn", steps: st }; }]);
    // #5702 Miserea: Set an impact in your final phase -> another attack phase (once per turn)
    OV42.push([5702, /during your final phase, when you .{0,3}set.{0,3} an impact/i, () => ({ kind: "triggered", trigger: { event: "youCast", np: ABX.parseNP("impact") }, conds: [{ t: "phase", phase: "final", who: "you" }], once: "turn", steps: [{ op: "extraPhase", what: "attack" }] })]);
  }

  /* batch 4: #3103 Vivid Move, #3104 Eternal Guardian Dragon, Aettir */
  {
    const stOf = (txt) => { const p2 = ABX.parseSentenceSteps(txt, {}); return p2 && !(p2.unparsed && p2.unparsed.length) ? p2.steps : null; };
    const askOpt = async (ctx, title, labels) => {
      if (!ctx.auto && !ctx.f.isBot && !ABX.autoPlay && ABX.ui && ABX.ui.pickOption) return ABX.ui.pickOption({ title, options: labels.map(l => ({ label: l })) });
      return 0;
    };
    OPS.r42VividMove = {
      async run(s, ctx) {
        const toHand = stOf("Return a \u00abCosmo Dragoon\u00bb on your field to your hand.");
        const toTop = stOf("Put a \u00abCosmo Dragoon\u00bb on your field on the top of your deck.");
        const has = core.refsFor(toHand[0].np, ctx).length > 0;
        if (!has) return false;
        const i = await askOpt(ctx, ctx.card.name + " \u2014 choose", ["Return a \u00abCosmo Dragoon\u00bb to your hand", "Put it on the top of your deck"]);
        const st = i === 1 ? toTop : toHand;
        for (const x of st) await OPS[x.op].run(x, ctx);
        fresh();
        return true;
      }
    };
    OV42.push([3103, /return a .{0,3}cosmo dragoon.{0,3} from your field/i, () => ({ kind: "spell", steps: [{ op: "r42VividMove" }] })]);
    OPS.r42AettirSwap = {
      async run(s, ctx) {
        const units = ((ctx.event && ctx.event.attUnits) || (ABX.battleCtx && ABX.battleCtx.attUnits) || []).filter(Boolean);
        if (!units.length || !ctx.unit) return false;
        const es = otherSide(ctx.side);
        const refs = units.map(u => { const pos = core.posOfUnit(F(es), u); return pos ? { k: pos.startsWith("item") ? "item" : "unit", side: es, pos, unit: u, card: u.card, id: u.card.id } : null; }).filter(Boolean);
        if (!refs.length) return false;
        const ch = refs.length > 1 ? await core.pick(refs, { qty: { n: 1 } }, ctx, { intent: "harm", title: ctx.card.name + " \u2014 choose an attacking monster" }) : refs;
        if (!ch || !ch.length) return false;
        const i = await askOpt(ctx, ctx.card.name + " \u2014 return this card and the attacker to hand?", ["Yes", "No"]);
        if (i === 1) return false;
        const mv = { op: "moveSelf", to: { area: "hand", owner: "owner" } };
        if (!(await OPS.moveSelf.run(mv, ctx))) return false;
        await core.moveRefs(ch, { area: "hand", owner: "owner" }, ctx);
        fresh();
        return true;
      }
    };
    OV42.push([3104, /you may return this card from your field/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], steps: [{ op: "r42AettirSwap" }] })]);
  }

  /* Secret Sword soul-casts when attacked: #291 (power 5000+ attacker), #292 (link attack), #296 (opponent's Weapon) */
  {
    const attackersOf = (ctx) => ((ctx.event && ctx.event.attUnits) || (ABX.battleCtx && ABX.battleCtx.attUnits) || []).filter(Boolean);
    const mkGuard = (name, test) => {
      OPS[name] = { async run(s, ctx) { const us = attackersOf(ctx); if (!us.length || !test(us, ctx)) return false; return OPS.castSelfFromSoul.run({ op: "castSelfFromSoul", pay: true }, ctx); } };
    };
    mkGuard("r42SSPower5000", (us, ctx) => us.length === 1 && getUnitEffectiveCombatStats(ctx.e, us[0]).power >= 5000 && core.posOfUnit(ctx.e, us[0]) && !String(core.posOfUnit(ctx.e, us[0])).startsWith("item"));
    mkGuard("r42SSLink", (us) => us.length > 1);
    mkGuard("r42SSWeapon", (us, ctx) => us.some(u => String(core.posOfUnit(ctx.e, u) || "").startsWith("item")));
    const SS = (id, re, op) => OV42.push([id, re, (ab) => ({ kind: "triggered", trigger: { event: "oppAttack" }, conds: [], optional: true, steps: [{ op }] })]);
    SS(291, /you are being attacked by a monster with power 5000/i, "r42SSPower5000");
    SS(292, /you are being link attacked/i, "r42SSLink");
    SS(296, /you are being attacked by an opponent's weapon/i, "r42SSWeapon");
  }

  /* #1351 Long-range Cannon: the card you are [Ride] on can attack through the center this turn */
  OPS.r42RideThrough = { run(s, ctx) { ctx.f.abxRideThrough = B.turnCount; return true; }, check: () => true };
  OV42.push([1351, /a card you are .{0,3}ride.{0,3} on can attack/i, () => ({ kind: "spell", steps: [{ op: "r42RideThrough" }] })]);
  OV42.push([1351, /you may only cast this card if you are .{0,3}ride/i, () => ({ kind: "rule", steps: [] })]);
  {
    const prevCAT4 = ABX.canAttackThrough;
    ABX.canAttackThrough = function (side, unit, which) {
      if (prevCAT4 && prevCAT4.apply(this, arguments)) return true;
      try {
        if (which === "own" || !unit || !unit.card) return false;
        const f = F(side);
        return f.abxRideThrough === B.turnCount && (f.item === unit || f.item2 === unit) && /\[ride\]/i.test(String(unit.card.skill || ""));
      } catch (e) { return false; }
    };
  }

  /* #3242 Jester Dark Fox, #5436 Red Mesh: end-of-battle effects */
  {
    const oppFieldNP = () => ABX.parseSentenceSteps("Destroy a monster on your opponent's field.", {}).steps[0].np;
    const myFieldNP = () => ABX.parseSentenceSteps("Destroy a monster on your field.", {}).steps[0].np;
    const destroyRef = async (ctx, ref) => { ctx.bind = ctx.bind || {}; ctx.bind.chosen = [ref]; return OPS.destroy.run({ op: "destroy", np: { qty: { n: 1 }, ref: "chosen", self: false, filter: {}, zone: null } }, ctx); };
    OPS.r42JesterFox = {
      async run(s, ctx) {
        const oc = core.refsFor(oppFieldNP(), ctx).filter(r => r.unit), mc = core.refsFor(myFieldNP(), ctx).filter(r => r.unit);
        if (!oc.length || !mc.length) return false;
        const ch = await core.pick(oc, { qty: { n: 1 } }, ctx, { intent: "harm", title: ctx.card.name + " \u2014 choose an opponent's monster" });
        const target = ch && ch[0]; if (!target) return false;
        const mine = await core.pick(mc, { qty: { n: 1 } }, ctx, { intent: "cost", title: ctx.card.name + " \u2014 destroy a monster on your field" });
        const m = mine && mine[0]; if (!m) return false;
        await destroyRef(ctx, m);
        if (core.fieldUnits(ctx.f, true).some(x => x.unit === m.unit)) return false;   // it was not destroyed
        const es = otherSide(ctx.side), ef = F(es);
        if (target.unit.soul && target.unit.soul.length) { const sid = target.unit.soul.shift(); ef.drop.push(typeof getSoulCardId === "function" ? getSoulCardId(sid) : sid); }
        await destroyRef(ctx, target);
        fresh();
        return true;
      }
    };
    OV42.push([3242, /adventurer.{0,6}or.{0,6}skull warrior.{0,40}attacked/i, () => ({ kind: "triggered", trigger: { event: "battleEnd", self: false, attFilter: { tribes: ["Adventurer", "SkullWarrior"] } }, conds: [], optional: true, steps: [{ op: "r42JesterFox" }] })]);
    OPS.r42RedMesh = {
      async run(s, ctx) {
        const oc = core.refsFor(oppFieldNP(), ctx).filter(r => r.unit);
        if (!oc.length) return false;
        const ch = await core.pick(oc, { qty: { n: 1 } }, ctx, { intent: "harm", title: ctx.card.name + " \u2014 choose an opponent's character" });
        const t = ch && ch[0]; if (!t) return false;
        let ret = false;
        if (!ctx.auto && !ctx.f.isBot && !ABX.autoPlay && ABX.ui && ABX.ui.pickOption) ret = (await ABX.ui.pickOption({ title: ctx.card.name + " \u2014 destroy or return to hand?", options: [{ label: "Destroy it" }, { label: "Return it to hand" }] })) === 1;
        if (ret) await core.moveRefs([t], { area: "hand", owner: "owner" }, ctx); else await destroyRef(ctx, t);
        fresh();
        return true;
      }
    };
    OV42.push([5436, /at the end of the battle that an afterglow character/i, () => ({ kind: "triggered", trigger: { event: "battleEnd", self: false, attFilter: { tribes: ["Afterglow"], soul: true } }, conds: [], steps: [{ op: "r42RedMesh" }] })]);
  }

  /* #3664 Thunderbolt Fighting Dragon, Demongodol: when the opponent's card attacks, the attack's target becomes this card */
  OV42.push([3664, /charge the target of the attack to this card/i, (ab) => ({ kind: "triggered", trigger: ab.trigger, conds: [], steps: [{ op: "redirectAttack", toSelf: true }] })]);

  /* #1546 Mission Card "Earn Experience Points!": an item of yours attacks -> top deck card face down into this card's soul */
  OPS.r42MissionSoul = {
    run(s, ctx) {
      const f = ctx.f; if (!f.deck.length) return false;
      const host = (f.setSpells || []).find(c => c && c.id === ctx.card.id) || ctx.card;
      if (!Array.isArray(host.soul)) host.soul = [];
      const id = f.deck.shift();
      host.soul.push(typeof createSoulEntry === "function" ? createSoulEntry(id, true) : id);
      fresh();
      return true;
    }
  };
  OV42.push([1546, /when an item on your field attacks/i, () => ({ kind: "triggered", trigger: { event: "otherAttack", np: ABX.parseNP("item") }, conds: [], steps: [{ op: "r42MissionSoul" }] })]);

  /* #2014 GIGA Armorknight Cerberus, "A"!: end of its attack -> stand your Weapon, put this card + a drop card into that Weapon's soul;
     (the 'cannot be destroyed / attacks in final phase' static line already exists) */
  OPS.r42CerberusSoul = {
    async run(s, ctx) {
      const f = ctx.f, u = ctx.unit; if (!u) return false;
      const wp = [f.item, f.item2].find(x => x && x.card && x.card.type === "Item" && !x.isEndrulerFlag);
      if (!wp) return false;
      wp.rested = false;
      const pos = ["left", "center", "right", "center2"].find(p => f.monsters[p] === u);
      if (pos) { f.monsters[pos] = null; (u.soul || []).forEach(id => f.drop.push(typeof getSoulCardId === "function" ? getSoulCardId(id) : id)); }
      if (!Array.isArray(wp.soul)) wp.soul = [];
      wp.soul.push(ctx.card.id);
      if (f.drop.length) {
        const np = ABX.parseSentenceSteps("Put a card in your drop zone into the soul of your Weapon.", {}).steps[0].np;
        const refs = await core.pick(core.refsFor(np.zone ? np : np, ctx), np, ctx, { intent: "help", title: ctx.card.name + " \u2014 choose a drop zone card" });
        const r = refs && refs[0]; if (r) { const i = f.drop.indexOf(r.id); if (i >= 0) wp.soul.push(f.drop.splice(i, 1)[0]); }
      }
      fresh();
      return true;
    }
  };
  OV42.push([2014, /at the end of the attack of this card/i, () => ({ kind: "triggered", trigger: { event: "battleEnd", self: true }, conds: [], optional: true, steps: [{ op: "r42CerberusSoul" }] })]);
})(typeof window !== "undefined" ? window : globalThis);
