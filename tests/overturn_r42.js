// #5161 El Quixote [Overturn] (drop a Knight from hand, equip up to two Knight items from deck, shuffle) and #3902 Jackknife [Overturn] (nullify a card the opponent used).
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 4; i++) { flush(); await wait(10); } };
(async () => {
  run(`(function(){ABX.fast=true;ABX.autoPlay=true;
    battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
    globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
    const me=battle.plr; me.gauge=me.deck.splice(0,5); me.life=10; battle.turn='plr'; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=4;
    me.monsters.center=mk(CARD_MAP.get(5161)); me.item=null; me.item2=null;
    globalThis.__knightItems=ALL_CARDS.filter(c=>c.type==='Item'&&(c.attrs||[]).includes('Knight')).slice(0,3).map(c=>c.id);
    globalThis.__knightHand=ALL_CARDS.find(c=>(c.attrs||[]).includes('Knight')&&c.type==='Monster'&&c.id!==5161).id;
    me.hand=[__knightHand]; me.deck=__knightItems.concat(me.deck.slice(0,10)); return 1;})()`);
  const ab = J(`ABX.actAbilities(CARD_MAP.get(5161)).filter(a=>(a.tags||[]).includes('kw:overturn')).length`);
  ok(ab === 1, "#5161 Overturn is an [Act] ability");
  run(`ABX.useAct('plr',CARD_MAP.get(5161),battle.plr.monsters.center)`); await tick();
  ok(J(`battle.plr.hand.length`) === 0 && J(`battle.plr.drop.includes(__knightHand)`), "dropped the Knight from hand");
  ok(J(`!!battle.plr.item && !!battle.plr.item2`), "equipped two Knight items from the deck");
  ok(J(`!!battle.plr.overturnUsed`), "counts as having used [Overturn]");
  // second use is blocked (once per game)
  run(`battle.plr.hand=[__knightHand]`);
  ok(J(`ABX.canUseAct('plr',CARD_MAP.get(5161),ABX.actAbilities(CARD_MAP.get(5161)).find(a=>(a.tags||[]).includes('kw:overturn')),battle.plr.monsters.center).ok`) === false, "only once per game");

  // #3902 Jackknife: opponent casts a spell on their turn -> nullified by paying a soul
  run(`(function(){ const me=battle.plr, op=battle.opp; me.item=null; me.item2=null;
    const jk=mk(CARD_MAP.get(3902)); jk.soul=[ALL_CARDS.find(c=>c.type==='Spell').id]; me.monsters.center=jk; me.gauge=me.deck.splice(0,5);
    battle.activeSide='opp'; battle.turn='opp'; battle.phase='main'; battle.turnCount=5; return 1; })()`);
  const opts = J(`(function(){ const sp=ALL_CARDS.find(c=>c.type==='Spell'&&!ABX.castUnnullifiable(c,'opp')); return ABX.responseOptions ? ABX.responseOptions('plr', sp, 'spell').map(o=>o.label) : 'noapi'; })()`);
  ok(Array.isArray(opts) && opts.some(l => /Shining Dragoner|Jackknife/i.test(l)), "#3902 is offered when the opponent casts a spell: " + JSON.stringify(opts));
  // actually use it: the soul goes to the drop zone and the cast is nullified
  run(`(function(){ globalThis.__sp=ALL_CARDS.find(c=>c.type==='Spell'&&!ABX.castUnnullifiable(c,'opp')); ABX.castCtx={active:true,side:'opp',kind:'spell',card:__sp,nullified:false};
    globalThis.__o=ABX.responseOptions('plr',__sp,'spell')[0]; globalThis.__soulBefore=battle.plr.monsters.center.soul.length; return 1; })()`);
  await run(`__o.run()`); await tick();
  ok(J(`ABX.castCtx.nullified`) === true, "#3902 nullified the card the opponent used");
  ok(J(`battle.plr.monsters.center.soul.length`) === J(`__soulBefore`) - 1, "paid one soul into the drop zone");
  ok(J(`ABX.responseOptions('plr',__sp,'spell').length`) === 0, "not offered a second time (once per game)");

  // ---- timing windows: #3843, #4163, #3595, #3822, and #3629's cost ----
  const reset = `(function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
    const me=battle.plr, op=battle.opp; me.gauge=me.deck.splice(0,5); me.life=10; me.hand=me.deck.splice(0,3); battle.turn='plr'; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=6;
    globalThis.__mon=ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill); return 1; })()`;
  // #3843 Athora: only offered while the opponent attacks
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.center=mk(CARD_MAP.get(3843)); op.monsters.center=mk(__mon); battle.turn='opp'; battle.activeSide='opp'; battle.phase='attack'; return 1; })()`);
  const free = J(`ABX.freeFieldCounterOptions('plr').map(o=>o.card.id)`);
  ok(!free.includes(3843), "#3843 is NOT usable on the opponent's turn outside an attack");
  const att = J(`ABX.fieldCounterOptions('plr',{attackerZones:['center'],targetPos:'center'}).map(o=>o.card.id)`);
  ok(att.includes(3843), "#3843 is offered when the opponent's card attacks");
  run(`globalThis.__o=ABX.fieldCounterOptions('plr',{attackerZones:['center'],targetPos:'center'}).find(o=>o.card.id===3843)`);
  const h0 = J(`battle.plr.hand.length`);
  await run(`__o.run()`); await tick();
  ok(J(`battle.plr.hand.length`) === h0 - 1, "#3843 discarded a hand card");
  ok(J(`getUnitEffectiveCombatStats(battle.opp, battle.opp.monsters.center).power`) <= 0 || J(`battle.opp.monsters.center.tempPower`) <= -10000, "opponent's cards got power-10000");

  // #4163 Drum Bunker: optional payment when it link attacks
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; ABX.autoPlay=true; me.monsters.left=mk(__mon); me.monsters.center=mk(CARD_MAP.get(4163)); op.monsters.center=mk(__mon); return 1; })()`);
  const g0 = J(`battle.plr.gauge.length`);
  run(`ABX.fireAttack('plr',[{zone:'left',unit:battle.plr.monsters.left},{zone:'center',unit:battle.plr.monsters.center}],'opp','center')`); await tick();
  ok(J(`battle.plr.gauge.length`) === g0 - 1, "#4163 paid 1 gauge on link attack");
  ok(J(`battle.plr.monsters.center.abxNoCounter && battle.plr.monsters.center.abxNoCounter.mode`) === "link" && J(`battle.plr.monsters.center.tempPower`) > 1e6, "#4163 opponent cannot [Counter], power infinite");
  run(`ABX.fireBattleEnd('plr',[{unit:battle.plr.monsters.center}])`); await tick();
  ok(J(`battle.plr.monsters.center.tempPower`) < 1e6, "#4163 boost ends with the battle");
  // not offered when attacking alone
  run(reset);
  run(`(function(){ const me=battle.plr; me.monsters.center=mk(CARD_MAP.get(4163)); battle.opp.monsters.center=mk(__mon); return 1; })()`);
  const g1 = J(`battle.plr.gauge.length`);
  run(`ABX.fireAttack('plr',[{zone:'center',unit:battle.plr.monsters.center}],'opp','center')`); await tick();
  ok(J(`battle.plr.gauge.length`) === g1, "#4163 does nothing when attacking alone");

  // #3595 Overkill: monsters that would be destroyed stay
  run(reset);
  run(`(function(){ const me=battle.plr; ABX.autoPlay=true; me.monsters.center=mk(CARD_MAP.get(3595)); me.monsters.left=mk(__mon); return 1; })()`);
  const g2 = J(`battle.plr.gauge.length`);
  run(`battle.destroyMonster('plr','left')`); await tick();
  ok(J(`!!battle.plr.monsters.left`) && J(`battle.plr.gauge.length`) === g2 - 1, "#3595 saved the monster for 1 gauge");
  run(`battle.destroyMonster('plr','left')`); await tick();
  ok(J(`!!battle.plr.monsters.left`) && J(`battle.plr.gauge.length`) === g2 - 1, "#3595 that monster cannot be destroyed again this turn (no extra cost)");

  // #3822: a nullified link attack goes through for 1 gauge
  run(reset);
  run(`(function(){ const me=battle.plr; ABX.autoPlay=true; me.monsters.left=mk(__mon); me.monsters.center=mk(CARD_MAP.get(3822)); battle.opp.monsters.center=mk(__mon); return 1; })()`);
  const g3 = J(`battle.plr.gauge.length`);
  run(`battle.executeAttackResolution('plr',['left','center'],'center',true)`); await tick();
  ok(J(`battle.plr.gauge.length`) === g3 - 1 && J(`!!battle.plr.monsters.center.abxUnnull`), "#3822 paid 1 gauge and the link attack cannot be nullified");
  ok(J(`ABX.actAbilities(CARD_MAP.get(3822)).filter(a=>(a.tags||[]).includes('kw:overturn')).every(a=>!ABX.canUseAct('plr',CARD_MAP.get(3822),a,battle.plr.monsters.center).ok)`), "#3822 is not a free-standing act any more");

  // #3629 charges its printed gauge cost
  run(reset);
  run(`(function(){ const me=battle.plr; ABX.autoPlay=true; battle.phase='attack'; me.monsters.center=mk(CARD_MAP.get(3629)); const te=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Thunder Empire')); me.monsters.left=mk(te); me.monsters.left.rested=true; me.monsters.center.rested=true; return 1; })()`);
  const g4 = J(`battle.plr.gauge.length`);
  run(`ABX.useAct('plr',CARD_MAP.get(3629),battle.plr.monsters.center)`); await tick();
  ok(J(`battle.plr.gauge.length`) === g4 - 1, "#3629 paid its 1 gauge activation cost");
  console.log(`\npass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
