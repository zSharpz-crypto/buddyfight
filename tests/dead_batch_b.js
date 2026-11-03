// node tests/dead_batch_b.js - Batch B: #4154 #3639 #5914 (call cost) #2342 #2451 #3525 #3644 #3648 #3662 #5433
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 80; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id)=>({card:card(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; ['plr','opp'].forEach(sd=>{const f=battle[sd]; f.setSpells=f.setSpells||[];}); battle.activeSide='plr'; };
globalThis.ab=(id,k,ev)=>ABX.get(card(id)).abilities.filter(a=>!['cost','keyword','reminder','rule'].includes(a.kind)).find(a=>a.kind===k&&(!ev||(a.trigger&&a.trigger.event===ev)));
globalThis.go=(id,k,ev,unit,opts)=>ABX.core.runAbility('plr',card(id),ab(id,k,ev),unit||null,opts||{});`);
(async () => {
  run(`fresh()`);
  const g0 = val(`const c=card(4154); return parseCardCost(c.cost,c.skill,battle.plr,c).gauge`);
  run(`battle.plr.overturnUsed=true`);
  ck("4154: -3 gauge after Overturn", val(`const c=card(4154); return parseCardCost(c.cost,c.skill,battle.plr,c).gauge`) === Math.max(0, g0 - 3), g0);
  run(`fresh(); globalThis.bd=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('BlackDragon')&&c.id!==3639&&parseCardCost(c.cost,c.skill,battle.plr,c).gauge>0)`);
  const b0 = val(`return parseCardCost(bd.cost,bd.skill,battle.plr,bd).gauge`);
  run(`battle.plr.monsters.left=mk(3639)`);
  ck("3639: Black Dragon call -1 gauge", val(`return parseCardCost(bd.cost,bd.skill,battle.plr,bd).gauge`) === b0 - 1);
  run(`fresh(); globalThis.kj=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Kaiju')&&parseCardCost(c.cost,c.skill,battle.plr,c).gauge>0)`);
  const k0 = val(`return parseCardCost(kj.cost,kj.skill,battle.plr,kj).gauge`);
  run(`battle.plr.setSpells=[card(5914)]`);
  ck("5914: Kaiju call -1 gauge", val(`return parseCardCost(kj.cost,kj.skill,battle.plr,kj).gauge`) === k0 - 1);

  run(`fresh(); go(2342,'spell')`); await settle();
  ck("2342: next damage reduced by 3", val(`return ABX.core.applyDamage('plr',5,{kind:'effect'})`) === 2 || val(`return battle.plr.life`) === 8, val(`return battle.plr.life`));
  run(`fresh(); globalThis.g1=battle.plr.gauge.length; go(2451,'spell')`); await settle();
  ck("2451: +1 gauge and next damage 0", val(`const d=ABX.core.applyDamage('plr',4,{kind:'effect'}); return battle.plr.gauge.length===g1+1&&battle.plr.life===10`), val(`return [battle.plr.gauge.length-g1,battle.plr.life]`));
  run(`fresh(); battle.plr.life=2; go(3525,'spell')`); await settle();
  ck("3525: life that would become 0 becomes 2", val(`ABX.core.applyDamage('plr',5,{kind:'attack'}); return battle.plr.life`) === 2, val(`return battle.plr.life`));

  run(`fresh(); battle.plr.setSpells=[window.BUDDYFIGHT_CARDS.find(c=>c.type==='Spell'&&(c.attrs||[]).includes('BlackDragon'))]; battle.plr.life=5; globalThis.g2=battle.plr.gauge.length; battle.plr.monsters.left=mk(3644); go(3644,'triggered','turnEnd')`); await settle();
  ck("3644: +2 gauge, +2 life with Black Dragon Set", val(`return battle.plr.gauge.length===g2+2&&battle.plr.life===7`), val(`return [battle.plr.gauge.length-g2,battle.plr.life]`));
  run(`fresh(); battle.plr.life=5; battle.plr.monsters.left=mk(3644); go(3644,'triggered','turnEnd')`); await settle();
  ck("3644: nothing without Black Dragon Set", val(`return battle.plr.life===5`));

  run(`fresh(); globalThis.u=mk(3648); battle.plr.monsters.center=u; globalThis.g3=battle.plr.gauge.length; go(3648,'triggered','attack',u)`); await settle();
  ck("3648: gauge = number of worlds on field (>=1)", val(`return battle.plr.gauge.length>=g3+1`), val(`return battle.plr.gauge.length-g3`));

  run(`fresh(); globalThis.u2=mk(3662); battle.plr.monsters.center=u2; battle.plr.life=4; go(3662,'triggered','attackDestroys',u2)`); await settle();
  ck("3662: gain life = critical", val(`return battle.plr.life===4+(getUnitEffectiveCombatStats(battle.plr,u2).crit)`), val(`return battle.plr.life`));

  ck("5433: battleEnd trigger parsed (+2 life)", val(`const a=ab(5433,'triggered','battleEnd'); return !!a&&JSON.stringify(a.steps).includes('life')&&!!a.trigger.attFilter`));
  run(`fresh(); battle.plr.life=10; ABX.autoPlay=false; ABX.ui=ABX.ui||{}; globalThis.__po=ABX.ui.pickOption; ABX.ui.pickOption=async()=>3; globalThis.it=mk(21); battle.plr.item={card:card(2368),rested:false,soul:[],tempCrit:0}; go(2368,'act',null,battle.plr.item)`); await settle();
  ck("2368: pay 3 life -> +3 critical", val(`return battle.plr.life===7&&battle.plr.item.tempCrit===3`), val(`return [battle.plr.life,battle.plr.item.tempCrit]`));
  run(`ABX.ui.pickOption=__po; ABX.autoPlay=true`);
  run(`fresh(); globalThis.u3=mk(3289); battle.plr.monsters.center=u3; battle.plr.drop=[21,22]; go(3289,'triggered','phaseStart',u3)`); await settle();
  ck("3289: drop card goes into soul (auto)", val(`return u3.soul.length===1&&battle.plr.drop.length===1`), val(`return [u3.soul,battle.plr.drop]`));
  run(`fresh(); globalThis.sp=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Spell'&&ABX.get(c).abilities.some(a=>a.kind==='spell'&&JSON.stringify(a.steps).includes('"draw"')&&!JSON.stringify(a.steps).includes('r40'))); battle.plr.deck=[sp.id,21,22]; battle.plr.hand=[]; go(80,'triggered','enter')`); await settle();
  ck("80: revealed spell is cast free (goes to drop)", val(`return battle.plr.drop.includes(sp.id)&&battle.plr.hand.length>0`), val(`return [sp&&sp.id,battle.plr.drop,battle.plr.deck.length]`));
  run(`fresh(); globalThis.mn=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster').id; battle.plr.deck=[mn,21]; go(80,'triggered','enter')`); await settle();
  ck("80: non-spell goes to bottom", val(`return battle.plr.deck[battle.plr.deck.length-1]===mn`));
  run(`fresh(); globalThis.ld=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Item'&&(c.attrs||[]).includes('LegendDragon')); battle.plr.deck=[21,ld.id,22]; battle.plr.hand=[]; globalThis.k=mk(5533); battle.plr.monsters.center=k; go(5533,'triggered','enter',k)`); await settle();
  ck("5533: Legend Dragon item to hand", val(`return battle.plr.hand.includes(ld.id)`), val(`return [ld&&ld.id,battle.plr.hand]`));
  run(`fresh(); globalThis.k2=mk(1974); battle.plr.monsters.left=k2; go(1974,'triggered','oppCast',k2)`); await settle();
  ck("1974: 1 damage to opponent", val(`return battle.opp.life===9`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
