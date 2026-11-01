// node tests/wrong_trigger_d.js - wave D: draw / hand / gauge / enter-by-effect triggers (r42)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 25; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
  globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
  globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main';
   ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[1]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; f.deck=[10,11,12,13,14,15,16,17]; }); };
  globalThis.fire=(ev,data)=>ABX.fire42 ? ABX.fire42(ev,data) : null;`);
  const f42 = (ev, d) => run(`ABX.queue(()=>ABX.fire42(${JSON.stringify(ev)}, Object.assign(${JSON.stringify(d)}, {cards:[card(4)]})));`);
  const enterU = (side, pos, id) => run(`const u=put('${side}','${pos}',${id}); ABX.fireOtherEnter('${side}',u);`);
  const wipe = () => run(`fresh();`);
  // 1644: leaves field -> top card to gauge
  wipe(); run(`put('plr','center',1644); globalThis.g0=battle.plr.gauge.length;`); run(`battle.destroyMonster('plr','center')`); await settle();
  ck("1644 destroyed: +1 gauge", val(`return battle.plr.gauge.length===g0+1`), val(`return [battle.plr.gauge.length,g0]`));
  // 2531: during your turn, pay 1 life, destroy size<=2 opp monster
  wipe(); run(`put('plr','center',2531); put('opp','center',45); globalThis.l0=battle.plr.life;`); run(`battle.destroyMonster('plr','center')`); await settle();
  ck("2531 my turn: pay 1 life, destroy opp monster", val(`return battle.plr.life===l0-1&&!battle.opp.monsters.center`), val(`return [battle.plr.life,l0,!!battle.opp.monsters.center]`));
  wipe(); run(`put('plr','center',2531); put('opp','center',45); battle.activeSide='opp'; globalThis.l0=battle.plr.life;`); run(`battle.destroyMonster('plr','center')`); await settle();
  ck("2531 opponent's turn: nothing", val(`return battle.plr.life===l0&&!!battle.opp.monsters.center`));
  // 2546 Ozon-Z: comes back from drop when no other Ozon-Z on the field
  wipe(); run(`put('plr','center',2546);`); run(`battle.destroyMonster('plr','center')`); await settle();
  ck("2546 destroyed: called back", val(`return ['left','center','right'].some(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id===2546)`), val(`return [battle.plr.drop,Object.keys(battle.plr.monsters).map(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id)]`));
  // 3890 / 4275: from field or from hand
  wipe(); run(`put('plr','center',4275); globalThis.g0=battle.plr.gauge.length;`); run(`battle.destroyMonster('plr','center')`); await settle();
  ck("4275 from field: +1 gauge", val(`return battle.plr.gauge.length===g0+1`), val(`return [battle.plr.gauge.length,g0]`));
  wipe(); run(`battle.plr.hand=[4275,1]; globalThis.g0=battle.plr.gauge.length; battle.plr.hand.splice(0,1); battle.plr.drop.push(4275); ABX.fireDiscarded('plr', card(4275));`); await settle();
  ck("4275 discarded from hand: +1 gauge", val(`return battle.plr.gauge.length===g0+1`), val(`return [battle.plr.gauge.length,g0]`));
  wipe(); run(`put('plr','center',3890); put('plr','left',373); put('opp','center',45);`); run(`battle.destroyMonster('plr','center')`); await settle();
  ck("3890 without Wydar Sarkal: nothing", val(`return !!battle.opp.monsters.center`));
  // 2210: beginning of an attack phase, put a soul into the gauge
  wipe(); run(`battle.plr.setSpells=[Object.assign({},card(2210),{soul:[46,47]})]; globalThis.g0=battle.plr.gauge.length;`); run(`ABX.fireTurnEvent('phaseStart','attack')`); await settle();
  ck("2210 attack phase start: soul to gauge", val(`return battle.plr.gauge.length===g0+1&&battle.plr.setSpells[0].soul.length===1`), val(`return [battle.plr.gauge.length,g0]`));
  // 2427: beginning of each fighter's turn, call a Mummy from the drop zone
  wipe(); run(`put('plr','center',2427); battle.plr.drop=[2437];`); run(`ABX.fireTurnEvent('turnStart')`); await settle();
  ck("2427 turn start: calls a Mummy from drop", val(`return ['left','right'].some(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id===2437)`), val(`return [battle.plr.drop,Object.keys(battle.plr.monsters).map(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id)]`));
  // 6422 Galaxy Exalt enters / 2746 Hero enters or is equipped
  wipe(); run(`put('plr','center',6422); globalThis.g0=battle.plr.gauge.length; globalThis.h0=battle.plr.hand.length;`); enterU("plr", "left", 4431); await settle();
  ck("6422 Galaxy Exalt enters: +2 gauge, draw", val(`return battle.plr.gauge.length===g0+2&&battle.plr.hand.length===h0+1`), val(`return [battle.plr.gauge.length,g0,battle.plr.hand.length,h0]`));
  wipe(); run(`put('plr','center',2746); globalThis.g0=battle.plr.gauge.length; globalThis.d0=battle.plr.drop.length;`); enterU("plr", "left", 373); await settle();
  ck("2746 Hero enters on my turn: +1 gauge, +1 drop", val(`return battle.plr.gauge.length===g0+1&&battle.plr.drop.length===d0+1`), val(`return [battle.plr.gauge.length,g0,battle.plr.drop.length,d0]`));
  wipe(); run(`put('plr','center',2746); battle.activeSide='opp'; globalThis.g0=battle.plr.gauge.length;`); enterU("plr", "left", 373); await settle();
  ck("2746 opponent's turn: nothing", val(`return battle.plr.gauge.length===g0`));
  // 1352 Brave Machine enters: +1 gauge once per turn; non-Brave Machine: nothing
  wipe(); run(`put('plr','center',1352); globalThis.g0=battle.plr.gauge.length;`); enterU("plr", "left", 943); await settle();
  ck("1352 Brave Machine enters: +1 gauge", val(`return battle.plr.gauge.length===g0+1`), val(`return [battle.plr.gauge.length,g0]`));
  wipe(); run(`put('plr','center',1352); globalThis.g0=battle.plr.gauge.length;`); enterU("plr", "left", 45); await settle();
  ck("1352 other monster enters: nothing", val(`return battle.plr.gauge.length===g0`));
  // 3673 soul into Black Dragon: gauge + draw
  wipe(); run(`put('plr','center',3673); put('plr','left',535); globalThis.g0=battle.plr.gauge.length; globalThis.h0=battle.plr.hand.length;`); run(`ABX.queue(()=>ABX.fire42('soulInto',{owner:'plr',actor:'plr',units:[battle.plr.monsters.left],cards:[card(535)]}))`); await settle();
  ck("3673 soul into Black Dragon: gauge+1 and draw", val(`return battle.plr.gauge.length===g0+1&&battle.plr.hand.length===h0+1`), val(`return [battle.plr.gauge.length,g0,battle.plr.hand.length,h0]`));
  // ---- batch 2 ----
  // 2868 enters by [Ambush]: draw; normal call: nothing
  wipe(); run(`put('plr','center',2868); globalThis.h0=battle.plr.hand.length; battle.plr.monsters.center.enteredByAmbush=true; ABX.fireOtherEnter && 0;`);
  run(`ABX.queue(()=>ABX.fire42 && 0)`);
  // 3650: enters during opponent's turn -> call a size<=3 Chaos monster from drop
  const chaos = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&x.size<=3&&(x.attrs||[]).some(t=>/^chaos$/i.test(t))&&!x.skill); return c?c.id:0`);
  if (chaos) {
    wipe(); run(`battle.activeSide='opp'; battle.plr.drop=[${chaos}]; const u=put('plr','center',3650); ABX.fireEnter('plr',card(3650),u);`); await settle();
    ck("3650 enters on opponent's turn: calls a Chaos monster", val(`return Object.keys(battle.plr.monsters).some(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id===${chaos})`), val(`return [battle.plr.drop,Object.keys(battle.plr.monsters).map(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id)]`));
    wipe(); run(`battle.activeSide='plr'; battle.plr.drop=[${chaos}]; const u=put('plr','center',3650); ABX.fireEnter('plr',card(3650),u);`); await settle();
    ck("3650 enters on my turn: nothing", val(`return battle.plr.drop.includes(${chaos})`));
  }
  // 3905: destroys a monster by attack -> opp gauge card to drop; empty gauge -> 2 damage
  wipe(); run(`put('plr','center',3905); battle.opp.gauge=[1,2]; globalThis.d0=battle.opp.drop.length;`); run(`ABX.fireAttackOutcome('plr',[{unit:battle.plr.monsters.center,pos:'center'}],'opp',{destroyedMonster:true})`); await settle();
  ck("3905 destroys by attack: opp gauge 2 -> 1, no damage", val(`return battle.opp.gauge.length===1&&battle.opp.life===10`), val(`return [battle.opp.gauge.length,battle.opp.life]`));
  wipe(); run(`put('plr','center',3905); battle.opp.gauge=[1];`); run(`ABX.fireAttackOutcome('plr',[{unit:battle.plr.monsters.center,pos:'center'}],'opp',{destroyedMonster:true})`); await settle();
  ck("3905 last gauge card: 2 damage", val(`return battle.opp.gauge.length===0&&battle.opp.life===8`), val(`return [battle.opp.gauge.length,battle.opp.life]`));
  // 1755: life 6+ -> critical-1 (static)
  wipe(); run(`put('plr','center',1755); battle.plr.life=7;`);
  const crit7 = val(`return getUnitEffectiveCombatStats(battle.plr, battle.plr.monsters.center).crit`);
  run(`battle.plr.life=5;`);
  const crit5 = val(`return getUnitEffectiveCombatStats(battle.plr, battle.plr.monsters.center).crit`);
  ck("1755 life 6+: critical 1 lower than at life 5", crit7 === crit5 - 1, [crit7, crit5]);
  // 2359: alone + 30 cards in a drop zone -> opponent cannot [Counter]
  wipe(); run(`put('plr','center',2359); battle.opp.drop=new Array(30).fill(1);`);
  ck("2359 alone, 30+ drop: no Counter", val(`return !!ABX.noCounterThisBattle('plr',[{unit:battle.plr.monsters.center}],'fighter')`));
  run(`battle.opp.drop=new Array(5).fill(1); battle.plr.drop=[];`);
  ck("2359 small drops: Counter allowed", val(`return !ABX.noCounterThisBattle('plr',[{unit:battle.plr.monsters.center}],'fighter')`));
  // 1458: cannot cast spells while on the field
  wipe(); run(`put('plr','center',1458);`);
  ck("1458 on field: cannot cast spells", val(`return !!ABX.core.castBlock(battle.plr, window.BUDDYFIGHT_CARDS.find(c=>c.type==='Spell'))`));
  wipe();
  ck("1458 not on field: can cast", val(`return !ABX.core.castBlock(battle.plr, window.BUDDYFIGHT_CARDS.find(c=>c.type==='Spell'))`));
  // 403: attackers are destroyed at the end of turn
  wipe(); run(`put('opp','center',403); put('plr','center',45); ABX.fireAttack('plr',[{unit:battle.plr.monsters.center,pos:'center'}],'opp','center');`); await settle();
  run(`ABX.fireTurnEvent('turnEnd')`); await settle();
  ck("403 attacker destroyed at end of turn", val(`return !battle.plr.monsters.center`), val(`return !!battle.plr.monsters.center`));
  console.log("pass", pass, "fail", fail);
  process.exit(fail ? 1 : 0);
})();
