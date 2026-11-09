// node tests/ancient_a.js - Ancient World (#1513 #3502 #4141)
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
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };
 globalThis.__aw=ALL_CARDS.find(c=>c.type==='Monster'&&c.world==='Ancient World').id;`);
(async () => {
  for (const id of [1513, 3502]) {
    run(`{ const me=setup(); me.deck=[1054,__aw,__aw,__aw,1054]; me.gauge=[]; ABX.fireSpell('plr',CARD_MAP.get(${id}),{free:true}); }`); await settle();
    ck(id + ": two Ancient World monsters dropped, top card to gauge", val(`const p=battle.plr; return p.drop.filter(x=>x===__aw).length===2 && p.gauge.length===1 && p.deck.length===2`), val(`const p=battle.plr; return [p.drop,p.gauge.length,p.deck.length]`));
  }
  for (const life of [5, 6]) {
    run(`{ const me=setup(); me.life=${life}; me.hand=[4141]; me.gauge=me.deck.splice(0,5); const ab=ABX.get(CARD_MAP.get(4141)).abilities.find(a=>a.kind==='act'); battle.turn='opp'; battle.activeSide='opp'; ABX.runHandUse('plr',0,ab); }`); await settle();
    ck("4141 called at life " + life + ": " + (life <= 5 ? "+3 life" : "no life"), val(`const p=battle.plr; return !!Object.values(p.monsters).find(u=>u&&u.card.id===4141) && p.life===${life <= 5 ? life + 3 : life}`), val(`const p=battle.plr; return [p.life,Object.values(p.monsters).map(u=>u&&u.card.id)]`));
  }
  // #4969 look at center-size cards, one to hand, rest to bottom
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(__aw)); globalThis.__sz=Number(CARD_MAP.get(__aw).size)||0; me.deck=[21,22,23,24,25,26,27,28]; me.hand=[]; globalThis.__dl=me.deck.length; ABX.fireSpell('plr',CARD_MAP.get(4969),{free:true}); }`); await settle();
  ck("4969: one card to hand, rest of the looked cards to the bottom", val(`const p=battle.plr; return __sz>0 && p.hand.length===1 && p.deck.length===__dl-1 && p.deck[0]===(p.hand[0]===21?22:21)`), val(`const p=battle.plr; return [__sz,p.hand,p.deck]`));
  // #2348 Lifelink nullified for the turn
  run(`{ const me=setup(); ABX.fireSpell('plr',CARD_MAP.get(2348),{free:true}); }`); await settle();
  ck("2348: Lifelink of your monsters nullified this turn", val(`return ABX.lifelinkOff('plr',CARD_MAP.get(__aw))===true`));
  // #2785 top card to drop: Dragon monster -> hand, else +1 life
  run(`globalThis.__dm=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/dragon/i.test(a))).id`);
  for (const dragon of [true, false]) {
    run(`{ const me=setup(); me.deck=[${dragon?'__dm':'1054'},1054,1054]; me.life=10; me.hand=[]; ABX.fireEnter('plr',CARD_MAP.get(2785),mk(CARD_MAP.get(2785))); }`); await settle();
    ck("2785 top is " + (dragon ? "Dragon monster -> hand" : "other -> +1 life"), val(dragon ? `return battle.plr.hand[0]===__dm && battle.plr.life===10 && !battle.plr.drop.includes(__dm)` : `return battle.plr.life===11 && battle.plr.hand.length===0 && battle.plr.drop.length===1`), val(`return [battle.plr.life,battle.plr.hand,battle.plr.drop]`));
  }
  // #4891 gauge + life + draw 2 (+1 when the cost card is size 4+)
  for (const big of [true, false]) {
    run(`{ const me=setup(); me.deck=[31,32,33,34,35,36]; me.gauge=me.deck.splice(0,0); me.life=10; me.hand=[]; me.abxCostDropped=${big?'ALL_CARDS.find(c=>Number(c.size)>=4).id':'1054'}; ABX.fireSpell('plr',CARD_MAP.get(4891),{free:true}); }`); await settle();
    ck("4891 cost card " + (big ? "size 4+: draws 3" : "small: draws 2"), val(`return battle.plr.life===11 && battle.plr.hand.length===${big ? 3 : 2}`), val(`return [battle.plr.life,battle.plr.hand.length]`));
  }
  // #2115 discard Dragon Chief Emperor: defense +10000 (one discard only)
  run(`globalThis.__dce=2116`);
  run(`{ const me=setup(); const u=mk(CARD_MAP.get(2115)); me.monsters.center=u; me.hand=[__dce,__dce]; const ab=ABX.get(CARD_MAP.get(2115)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(2115),ab,u,{event:{name:'act'}}); }`); await settle();
  ck("2115: exactly one card discarded and defense +10000", val(`const p=battle.plr; return p.hand.length===1 && p.monsters.center.tempDef===10000`), val(`const p=battle.plr; return [p.hand.length,p.monsters.center.tempDef]`));
  // #2234 discard Wild Dragon + pay 1 life: save once
  run(`globalThis.__wd=420`);
  run(`{ const me=setup(); const u=mk(CARD_MAP.get(2234)); me.monsters.center=u; me.hand=[__wd]; me.life=10; const ab=ABX.get(CARD_MAP.get(2234)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(2234),ab,u,{event:{name:'act'}}); }`); await settle();
  ck("2234: Wild Dragon discarded and 1 life paid", val(`const p=battle.plr; return p.hand.length===0 && p.life===9`), val(`const p=battle.plr; return [p.hand.length,p.life,typeof __wd]`));
  // #6013 Advent-style call: hand dropped, field monsters cannot be destroyed by attacks this turn
  run(`{ const me=setup(); me.hand=[6013,1054,1054]; me.gauge=me.deck.splice(0,5); me.monsters.left=mk(CARD_MAP.get(1054)); const ab=ABX.get(CARD_MAP.get(6013)).abilities.find(a=>a.kind==='act'); battle.turn='opp'; battle.activeSide='opp'; ABX.runHandUse('plr',0,ab); }`); await settle();
  ck("6013: called, hand dropped, monsters protected from attack destruction", val(`const p=battle.plr; return p.hand.length===0 && !!Object.values(p.monsters).find(u=>u&&u.card.id===6013) && Object.values(p.monsters).filter(u=>u).every(u=>u.abxNoAttackDestroy===battle.turnCount)`), val(`const p=battle.plr; return [p.hand.length,Object.values(p.monsters).map(u=>u&&u.card.id),Object.values(p.monsters).map(u=>u&&u.abxNoAttackDestroy),battle.turnCount]`));
  console.log("\npass " + pass + " fail " + fail);
})();
