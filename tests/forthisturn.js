// node tests/forthisturn.js - "If you do, for this turn ..." family: #3 #312 #4196 #1515 #2478 #3968
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 24; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3; battle.matchOver=false;
   me.gauge=me.deck.splice(0,8); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=20; me.item=null; me.setSpells=[];
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); window.abxNoPenTurn=0; return me; };
 globalThis.abOf=(id,op)=>ABX.parseCard(CARD_MAP.get(id)).abilities.find(a=>(a.steps||[]).some(x=>x.op===op));
 globalThis.size3=ALL_CARDS.find(c=>c.type==='Monster'&&c.size===3).id; globalThis.monId=1054;`);
(async () => {
  const dm = val(`const c=ALL_CARDS.find(c=>c.type==='Monster'&&!c.skill&&c.power>0&&c.defense>0&&c.crit>0&&c.size<=1); return [c.id,c.power,c.defense,c.crit]`);
  // #312: discard a card; add its power/defense/critical
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(312)); me.hand=[${dm[0]}]; ABX.runAbility('plr',CARD_MAP.get(312),abOf(312,'r42TurnBoost'),me.monsters.center,{auto:true}); }`); await settle();
  ck("312: discarded card's power/defense/critical added to this card", val(`const u=battle.plr.monsters.center; return u.tempPower===${dm[1]} && u.tempDef===${dm[2]} && u.tempCrit===${dm[3]} && battle.plr.hand.length===0 && battle.plr.drop.includes(${dm[0]})`), val(`const u=battle.plr.monsters.center; return [u.tempPower,u.tempDef,u.tempCrit,battle.plr.hand,battle.plr.drop,${JSON.stringify(dm)}]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(4196)); me.hand=[${dm[0]}]; ABX.runAbility('plr',CARD_MAP.get(4196),abOf(4196,'r42TurnBoost'),me.monsters.center,{auto:true}); }`); await settle();
  ck("4196: same effect", val(`const u=battle.plr.monsters.center; return u.tempPower===${dm[1]} && u.tempCrit===${dm[3]}`), val(`const u=battle.plr.monsters.center; return [u.tempPower,u.tempCrit]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(312)); ABX.runAbility('plr',CARD_MAP.get(312),abOf(312,'r42TurnBoost'),me.monsters.center,{auto:true}); }`); await settle();
  ck("312 with an empty hand: nothing", val(`return battle.plr.monsters.center.tempPower===0`), 0);
  // #3: put one of your monsters from the field into the drop zone, add its critical
  run(`{ const me=setup(); me.item=mk(CARD_MAP.get(3)); me.monsters.left=mk(CARD_MAP.get(${dm[0]})); ABX.runAbility('plr',CARD_MAP.get(3),abOf(3,'r42TurnBoost'),me.item,{auto:true}); }`); await settle();
  ck("3: monster dropped, its critical added to the item", val(`return !battle.plr.monsters.left && battle.plr.item.tempCrit>=${dm[3]} && battle.plr.drop.includes(${dm[0]})`), val(`return [!!battle.plr.monsters.left, battle.plr.item.tempCrit, battle.plr.drop]`));
  // #1515: size 3 monster on field -> discard this card + pay 1 life -> lifelink nullified this turn
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(size3)); me.hand=[1515]; ABX.runAbility('plr',CARD_MAP.get(1515),abOf(1515,'r42TurnNullify'),null,{auto:true,selfRef:{area:'hand',idx:0,id:1515}}); }`); await settle();
  ck("1515: life paid, card discarded, Lifelink nullified for all of my cards", val(`return battle.plr.life===9 && battle.plr.drop.includes(1515) && ABX.lifelinkReduce('plr',CARD_MAP.get(size3))>=99`), val(`return [battle.plr.life, battle.plr.drop, ABX.lifelinkReduce('plr',CARD_MAP.get(size3))]`));
  ck("1515: the nullify ends next turn", val(`battle.turnCount=4; return ABX.lifelinkReduce('plr',CARD_MAP.get(size3))<99`), 0);
  run(`{ const me=setup(); me.hand=[1515]; ABX.runAbility('plr',CARD_MAP.get(1515),abOf(1515,'r42TurnNullify'),null,{auto:true,selfRef:{area:'hand',idx:0,id:1515}}); }`); await settle();
  ck("1515 without a size 3 monster: nothing", val(`return battle.plr.life===10 && battle.plr.hand.includes(1515)`), 0);
  // #2478: put this item into the drop zone -> all [Penetrate] nullified this turn
  const pen = val(`const c=ALL_CARDS.find(c=>c.type==='Monster'&&/\\[penetrate\\]/i.test(c.skill||'')); return c&&c.id`);
  run(`{ const me=setup(); me.item=mk(CARD_MAP.get(2478)); me.monsters.center=mk(CARD_MAP.get(${pen})); globalThis.__before=getUnitEffectiveCombatStats(me,me.monsters.center).pen; ABX.runAbility('plr',CARD_MAP.get(2478),abOf(2478,'r42TurnNullify'),me.item,{auto:true}); }`); await settle();
  ck("2478: item dropped and Penetrate nullified this turn", val(`return !battle.plr.item && battle.plr.drop.includes(2478) && __before===true && getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.center).pen===false`), val(`return [!!battle.plr.item, __before, getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.center).pen]`));
  // #3968: Set spell dropped -> Lifelink of size 3 monsters nullified (others unaffected)
  run(`{ const me=setup(); const sp=Object.assign({},CARD_MAP.get(3968)); me.setSpells=[sp]; ABX.runAbility('plr',sp,abOf(3968,'r42TurnNullify'),null,{auto:true}); }`); await settle();
  ck("3968: Set spell dropped; only size 3 lose Lifelink", val(`return battle.plr.setSpells.length===0 && ABX.lifelinkReduce('plr',CARD_MAP.get(size3))>=99 && ABX.lifelinkReduce('plr',CARD_MAP.get(monId))<99`), val(`return [battle.plr.setSpells.length, ABX.lifelinkReduce('plr',CARD_MAP.get(size3))]`));
  // #3218: chosen Adventurer can attack through a center monster this turn
  const adv = val(`return ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Adventurer')).id`);
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3218)); me.monsters.left=mk(CARD_MAP.get(${adv})); me.monsters.right=mk(CARD_MAP.get(1054)); globalThis.__g=me.gauge.length; ABX.runAbility('plr',CARD_MAP.get(3218),abOf(3218,'r42ThroughUnit'),me.monsters.center,{auto:true}); }`); await settle();
  ck("3218: Adventurer can attack through, 1 gauge paid, others cannot", val(`const me=battle.plr; return ABX.canAttackThrough('plr',me.monsters.left,'opp')===true && me.gauge.length===__g-1 && !ABX.canAttackThrough('plr',me.monsters.right,'opp')`), val(`return [ABX.canAttackThrough('plr',battle.plr.monsters.left,'opp'), battle.plr.gauge.length, __g]`));
  console.log("pass", pass, "fail", fail);
})();
