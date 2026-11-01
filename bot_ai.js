/* ==================== Bot AI ("Rival") ====================
 * A planner for the computer opponent. It never cheats (it only reads the same board the player sees):
 *   - botPlanAttack(bot): looks at every group of standing attackers (a LINK ATTACK adds their Power and Critical) against every legal target
 *     (any monster, or the fighter when the center is open), and picks the best: lethal first, then the biggest kill that its Power can break,
 *     a link attack to break through a monster with more Defense than one attacker's Power, Penetrate/center kills that open the fighter, and
 *     damage. It avoids attacks that cannot destroy anything and attacks into [Counterattack] monsters that would kill its attacker.
 *   - botSmartCalls(bot): fills the field with the strongest affordable monsters (the sturdiest one in the center).
 *   - botUseAbilities(bot): uses [Act] abilities of its monsters / item and casts useful non-[Counter] spells from its hand.
 * Loaded after game.js and all ability files.
 */
(function (root) {
  "use strict";
  if (typeof battle === "undefined" || !battle) return;
  const B = battle;
  const ZONES = ["left", "center", "center2", "right"];
  const FOE_ZONES = ["left", "center", "right"];
  const num = (x, d) => (typeof x === "number" && isFinite(x) ? x : d);
  const lc = (s) => String(s || "").toLowerCase();

  // rough worth of a card, used to compare what we kill / risk
  function cardValue(card) {
    if (!card) return 0;
    const s = lc(card.skill);
    let v = num(card.power, 0) / 1000 + num(card.defense, 0) / 2000 + num(card.crit, 1) * 2 + num(card.size, 0) * 0.5;
    if (card.pen) v += 2; if (card.da) v += 3; if (card.ta) v += 5; if (card.qa) v += 7;
    if (card.sg) v += 2; if (card.ca) v += 2; if (card.sd) v += 2;
    if (/\[act\]|when this card|\[auto\]|\[counter\]/.test(s)) v += 1.5;
    return v;
  }

  function standingAttackers(bot, foe) {
    const out = [];
    ZONES.forEach(p => {
      const u = bot.monsters[p];
      if (u && !u.rested && u.attacksLeft > 0 && !(root.ABX && ABX.core && ABX.core.isRestricted && ABX.core.isRestricted(u, "attack"))) out.push(p);
    });
    const it = bot.item;
    if (it && !it.rested && it.attacksLeft > 0 && !(root.ABX && ABX.core && ABX.core.isRestricted && ABX.core.isRestricted(it, "attack")) &&
        (!bot.monsters.center || it.isEndrulerFlag || lc(it.card && it.card.skill).includes("even if you have a monster in the center")) &&
        num(getUnitEffectiveCombatStats(bot, it).power, 0) > 0) out.push("item");
    return out;
  }

  function groupStats(bot, zones) {
    let power = 0, crit = 0, pen = false, shadow = true;
    zones.forEach(z => {
      const u = unitAt(bot, z), e = getUnitEffectiveCombatStats(bot, u);
      power += e.power; crit += e.crit; if (e.pen) pen = true;
      if (zones.length > 1 && lc(u.card.skill).includes("link attacks")) { power += 2000; if (lc(u.card.skill).includes("[penetrate]")) pen = true; }
      if (!(u.card.sd || (root.ABX && ABX.canAttackThrough && ABX.canAttackThrough("opp", u, "plr")))) shadow = false;
    });
    return { power, crit, pen, shadow };
  }

  // every non-empty subset of the ready attackers (at most 5 -> 31)
  function subsets(arr) {
    const out = [];
    for (let m = 1; m < (1 << arr.length); m++) out.push(arr.filter((_, i) => m & (1 << i)));
    return out;
  }

  B.botPlanAttack = function (bot, side) {
    side = side || "opp";
    const foeSide = side === "opp" ? "plr" : "opp";
    const foe = this.getFighter(foeSide);
    if (!bot || !foe || this.matchOver) return null;
    if (this.isFirstRoundAttackLocked && this.isFirstRoundAttackLocked()) return null;
    const ready = standingAttackers(bot, foe);
    if (!ready.length) return null;
    const stats = {}; ready.forEach(z => { stats[z] = groupStats(bot, [z]); });
    let best = null;
    for (const group of subsets(ready)) {
      if (group.length > 1 && group.some(z => z === "item") && bot.monsters.center && !bot.item.isEndrulerFlag && !lc(bot.item.card.skill).includes("even if you have a monster in the center")) continue;
      const g = group.length === 1 ? stats[group[0]] : groupStats(bot, group);
      const rest = ready.filter(z => !group.includes(z));
      const restCrit = rest.reduce((s, z) => s + stats[z].crit, 0);
      const usageCost = group.length * 0.5;
      const consider = (target, gain, why) => {
        const score = gain - usageCost;
        if (!best || score > best.score) best = { zones: group, target, score, why, power: g.power, crit: g.crit };
      };
      // ---- the fighter
      if (!foe.monsters.center || g.shadow) {
        const lethal = g.crit >= foe.life;
        const dmg = Math.min(g.crit, foe.life);
        consider("fighter", lethal ? 10000 : dmg * 3 + (foe.life - dmg <= restCrit ? 4 : 0) + (foe.life <= 4 ? dmg : 0), lethal ? "lethal" : "damage");
      }
      // ---- each monster
      FOE_ZONES.forEach(pos => {
        const d = foe.monsters[pos];
        if (!d) return;
        const ds = getUnitEffectiveCombatStats(foe, d);
        const val = cardValue(d.card);
        if (g.power >= ds.defense) {
          if (d.tempIndestructible) { consider(pos, -2, "indestructible"); return; }
          let gain = val + 2;
          if (pos === "center") {
            gain += 1;   // opens the fighter for everybody else
            if (restCrit > 0) { gain += Math.min(restCrit, foe.life) * 1.5; if (restCrit >= foe.life) gain += 300; }
          }
          if (g.pen && pos === "center") { gain += g.crit * 3; if (g.crit >= foe.life) gain += 10000; }
          consider(pos, gain, "kill");
        } else {
          // cannot break it: only a pointless attack, and into [Counterattack] it loses the attacker
          let loss = 0;
          if (d.card.ca || d.tempCA) group.forEach(z => { if (z !== "item" && ds.power >= getUnitEffectiveCombatStats(bot, unitAt(bot, z)).defense) loss += cardValue(unitAt(bot, z).card) + 2; });
          consider(pos, -1 - loss, "fail");
        }
      });
    }
    return best && best.score > 0 ? best : null;
  };

  /* ---------- main phase: calls ---------- */
  B.botSmartCalls = function (bot) {
    const used = (c) => this.getCurrentSizeUsed(bot) + getEffectiveCardSize(bot, c);
    const afford = (c) => {
      if (!c || c.type !== "Monster") return false;
      if (isYamigedoHalfId(c.id) && !fighterHasBothYamigedoHalvesInHand(bot)) return false;
      if (parseCardCost(c.cost, c.skill, bot, c).gauge > bot.gauge.length) return false;
      if (used(c) > (bot.maxSize || 3)) return false;
      const ev = typeof evaluateCardConditions === "function" ? evaluateCardConditions(c, bot, this.getEnemy("opp")) : { met: true };
      return ev.met !== false;
    };
    let guard = 6;
    while (guard-- > 0) {
      const free = ["center", "left", "right"].filter(z => !bot.monsters[z]);
      if (!free.length) break;
      const cands = bot.hand.map((id, i) => ({ id, i, c: CARD_MAP.get(id) })).filter(x => afford(x.c));
      if (!cands.length) break;
      // the strongest card we can pay for (value per gauge keeps some gauge for abilities)
      cands.sort((a, b) => cardValue(b.c) - cardValue(a.c));
      const pick = cands[0];
      // sturdiest card guards the center; others go to the sides
      const zone = free.includes("center") && (!bot.monsters.left && !bot.monsters.right ? true : num(pick.c.defense, 0) >= 5000) ? "center" : free.find(z => z !== "center") || free[0];
      const before = bot.hand.length;
      this.completeMonsterCall("opp", zone, pick.i, false);
      if (bot.hand.length >= before && !bot.monsters[zone]) break;   // the call was refused: stop trying
    }
  };

  /* ---------- main phase: [Act]s and spells ---------- */
  const BAD_ACT = /pay \d+ life|put (?:a|an|one|all) (?:monster|card)s? on your field into the drop zone|destroy (?:a|an|one|all) (?:monster|card)s? on your field|your opponent (?:draws|gains)|deal \d+ damage to you\b/i;
  const GOOD = /damage to your opponent|destroy|draw|gauge|power\s*\+|gets power|critical|stand|return|rest|opponent's/i;
  function usableActs(bot, side) {
    const out = [];
    if (!root.ABX || !ABX.actAbilities) return out;
    ZONES.concat(["item"]).forEach(p => {
      const u = p === "item" ? bot.item : bot.monsters[p];
      if (!u || !u.card || u.isEndrulerFlag) return;
      ABX.actAbilities(u.card).forEach(ab => {
        const raw = String(ab.raw || u.card.skill || "");
        if (BAD_ACT.test(raw) || !GOOD.test(raw)) return;
        if (/\[counter\]/i.test(raw)) return;
        if (ABX.canUseAct(side, u.card, ab, u).ok) out.push({ u, card: u.card });
      });
    });
    return out;
  }

  B.botUseAbilities = async function (bot) {
    const side = "opp";
    if (!root.ABX || !ABX.useAct) return;
    let guard = 6;
    while (guard-- > 0 && !this.matchOver && this.activeSide === side) {
      const acts = usableActs(bot, side);
      if (!acts.length) break;
      const a = acts[0];
      const gaugeBefore = bot.gauge.length, handBefore = bot.hand.length, restedBefore = !!a.u.rested, usedBefore = !!a.u.actUsed;
      try { await ABX.useAct(side, a.card, a.u, null); } catch (e) { break; }
      // no visible effect and the ability is still "usable" -> stop (prevents loops on abilities that did nothing)
      if (bot.gauge.length === gaugeBefore && bot.hand.length === handBefore && !!a.u.rested === restedBefore && !!a.u.actUsed === usedBefore && usableActs(bot, side).some(x => x.u === a.u)) break;
    }
    // useful spells: main-phase only ([Counter] spells are for the other side's turn), never when it would cost life
    guard = 3;
    while (guard-- > 0 && !this.matchOver && this.activeSide === side) {
      let cast = false;
      for (let i = 0; i < bot.hand.length; i++) {
        const c = CARD_MAP.get(bot.hand[i]);
        if (!c || c.type !== "Spell") continue;
        const raw = String(c.skill || "");
        if (/\[counter\]/i.test(raw) || BAD_ACT.test(raw) || !GOOD.test(raw)) continue;
        const cost = parseCardCost(c.cost, c.skill, bot, c);
        if (cost.life > 0 || cost.gauge > bot.gauge.length || cost.gauge > bot.gauge.length - 1 && bot.hand.some(id => { const m = CARD_MAP.get(id); return m && m.type === "Monster" && parseCardCost(m.cost, m.skill, bot, m).gauge <= bot.gauge.length; })) continue;
        const ev = evaluateCardConditions(c, bot, this.getEnemy(side));
        if (!ev.met) continue;
        if (root.ABX && ABX.canPayExtras && !ABX.canPayExtras(side, c, i)) continue;
        this.castSpellFromHand(side, i);
        await new Promise(r => setTimeout(r, 900));
        cast = true; break;
      }
      if (!cast) break;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
