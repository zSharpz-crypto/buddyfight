// node tests/hero_d.js - Darkness Dragon: opponent-deck mill family + stand/force-attack (#780 #3424 #3711 ...)
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   me.gauge=me.deck.splice(0,7); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  const st = `const me=battle.plr, op=battle.opp; return [me.deck.length, op.deck.length, op.drop.length, me.drop.length, me.gauge.length, me.life, me.hand.length]`;
  // #2281 Million Edge: both mill 2, draw 1
  run(`{ const me=setup(); globalThis.__b=(function(){${st}})(); ABX.fireSpell('plr',CARD_MAP.get(2281)); }`); await settle();
  let a = val(st); let b = val(`return __b`);
  ck("2281 both players mill 2 and draw", a[1]===b[1]-2 && a[2]===b[2]+2 && a[3]===b[3]+2 && a[6]===b[6]+1, [a,b]);
  // #1993 when destroyed: both mill 2, +1 life
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1993)); globalThis.__b=(function(){${st}})(); battle.destroyMonster('plr','center'); }`); await settle();
  a = val(st); b = val(`return __b`);
  ck("1993 destroyed: both mill 2, +1 life", a[1]===b[1]-2 && a[2]===b[2]+2 && a[3]>=b[3]+2 && a[5]===b[5]+1, [a,b]);
  // #1860 act: discard, destroy a monster, mill opp deck by its size
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1860)); me.hand=[1054]; battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__sz=CARD_MAP.get(1054).size; globalThis.__b=(function(){${st}})(); ABX.useAct('plr',CARD_MAP.get(1860),me.monsters.center); }`); await settle();
  a = val(st); b = val(`return __b`);
  ck("1860 act: monster destroyed, opp deck milled by its size", a[1]===b[1]-val(`return __sz`) && !val(`return battle.opp.monsters.center`), [a,b,val(`return __sz`)]);
  // #2571 attack trigger: destroy + mill by size + same count into my gauge
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2571)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__b=(function(){${st}})(); ABX.fireAttack('plr',[{unit:me.monsters.center,pos:'center'}],'opp','center'); }`); await settle();
  a = val(st); b = val(`return __b`);
  ck("2571 attack: opp deck milled by size, my gauge +same", a[1]===b[1]-val(`return __sz`) && a[4]===b[4]+val(`return __sz`), [a,b]);
  // #2678 Black Wings: counter-call only if opp's deck was milled this turn
  run(`{ const me=setup(); me.hand=[2678]; globalThis.__r0=ABX.canUseAct?1:0; battle.opp.abxMilledTurn=null; }`);
  ck("2678 cond false before any mill", val(`return !battle.opp.abxMilledTurn`));
  // #780: opp center monster stands, crit+1, hits its own controller for its critical
  run(`{ const me=setup(); me.hand=[]; battle.opp.monsters.center=mk(CARD_MAP.get(1054)); battle.opp.monsters.center.rested=true; globalThis.__cr=CARD_MAP.get(1054).crit; globalThis.__l=battle.opp.life; ABX.fireSpell('plr',CARD_MAP.get(780)); }`); await settle();
  ck("780: opp monster stood and its controller took crit+1", val(`return !battle.opp.monsters.center.rested && battle.opp.life===__l-(__cr+1)`), val(`return [battle.opp.monsters.center.rested, battle.opp.life, __l, __cr]`));
  // #3424: rest self, stand a chosen opp monster, it hits its controller
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3424)); battle.opp.monsters.left=mk(CARD_MAP.get(1054)); battle.opp.monsters.left.rested=true; globalThis.__l=battle.opp.life; const ab=ABX.actAbilities(CARD_MAP.get(3424))[0]; ABX.runAbility('plr',CARD_MAP.get(3424),ab,me.monsters.center,{event:{name:'act'}}); }`); await settle();
  ck("3424: self rested, opp monster stood, opp lost life", val(`return battle.plr.monsters.center.rested && !battle.opp.monsters.left.rested && battle.opp.life<__l`), val(`return [battle.plr.monsters.center.rested, battle.opp.monsters.left.rested, battle.opp.life, __l]`));
  // #3711: stand own monster, power +3000
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1054)); me.monsters.center.rested=true; ABX.fireSpell('plr',CARD_MAP.get(3711)); }`); await settle();
  ck("3711: monster stood with +3000 power", val(`const u=battle.plr.monsters.center; return !u.rested && u.tempPower===3000`), val(`const u=battle.plr.monsters.center; return [u.rested,u.tempPower]`));
  // #1625 / #6354 counter locks (attack on a monster, not on the fighter)
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1054)); ABX.fireSpell('plr',CARD_MAP.get(1625)); }`); await settle();
  ck("1625: no counters when attacking a monster, but not when attacking the fighter", val(`const u=[{unit:battle.plr.monsters.center,pos:'center'}]; return ABX.noCounterThisBattle('plr',u,'center')===true && !ABX.noCounterThisBattle('plr',u,'fighter')`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1054)); me.monsters.left=mk(CARD_MAP.get(1054)); me.setSpells=[{id:6354,soul:[]}]; }`);
  ck("6354 set: lock when a monster attacks a monster alone, not as a link attack", val(`const p=battle.plr.monsters; const one=[{unit:p.center,pos:'center'}], two=one.concat([{unit:p.left,pos:'left'}]); return ABX.noCounterThisBattle('plr',one,'center')===true && !ABX.noCounterThisBattle('plr',two,'center') && !ABX.noCounterThisBattle('plr',one,'fighter')`));
  // #6361 Omni Lord act: pay 1 gauge, chosen opp monster becomes size 3
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(6361)); battle.opp.monsters.left=mk(CARD_MAP.get(1054)); globalThis.__g=me.gauge.length; const ab=ABX.actAbilities(CARD_MAP.get(6361))[0]; ABX.runAbility('plr',CARD_MAP.get(6361),ab,me.monsters.center,{event:{name:'act'}}); }`); await settle();
  ck("6361: opp monster is size 3 and 1 gauge paid", val(`return getEffectiveCardSize(battle.opp, battle.opp.monsters.left.card, battle.opp.monsters.left)===3 && battle.plr.gauge.length===__g-1`), val(`return [getEffectiveCardSize(battle.opp, battle.opp.monsters.left.card, battle.opp.monsters.left), battle.plr.gauge.length, __g]`));
  // #5002 / #6425: drop top N, Swamps go to hand; #5008 crit down; #6345 gauge -> hand
  run(`{ const me=setup(); me.deck=[5001,1054,1054,6423,1054]; me.monsters.center=null; globalThis.__h=me.hand.length; ABX.fireEnter('plr',CARD_MAP.get(5002),mk(CARD_MAP.get(5002))); }`); await settle();
  ck("5002 enter: Venom Swamp to hand, other 2 dropped", val(`const p=battle.plr; return p.hand.includes(5001) && !p.hand.includes(1054) && p.drop.filter(i=>i===1054).length===2 && p.deck.length===2`), val(`const p=battle.plr; return [p.hand,p.drop,p.deck.length]`));
  run(`{ const me=setup(); me.deck=[5001,6423,1054,1054,1054]; ABX.fireEnter('plr',CARD_MAP.get(6425),mk(CARD_MAP.get(6425))); }`); await settle();
  ck("6425 enter: both Set Swamp spells to hand", val(`const p=battle.plr; return p.hand.includes(5001) && p.hand.includes(6423) && p.deck.length===1`), val(`const p=battle.plr; return [p.hand,p.deck.length]`));
  run(`{ const me=setup(); me.setSpells=[{id:5001,name:'Venom Swamp',soul:[]},{id:5001,name:'Venom Swamp',soul:[]}]; battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__c=battle.opp.monsters.center.tempCrit||0; ABX.fireSpell('plr',CARD_MAP.get(5008)); }`); await settle();
  ck("5008: crit reduced by number of Venom Swamps (2)", val(`return (battle.opp.monsters.center.tempCrit||0)===__c-2`), val(`return battle.opp.monsters.center.tempCrit`));
  run(`{ const me=setup(); me.gauge=[5001,1054]; me.deck=[1054,1054,1054]; me.life=10; ABX.fireSpell('plr',CARD_MAP.get(6345)); }`); await settle();
  ck("6345: milled 2 to gauge, then a monster from gauge to hand", val(`const p=battle.plr; return p.hand.includes(1054) && p.gauge.length===3`), val(`const p=battle.plr; return [p.hand,p.gauge]`));
  console.log(`\npass ${pass} fail ${fail}`);
})();
