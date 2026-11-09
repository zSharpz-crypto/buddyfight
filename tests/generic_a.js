// node tests/generic_a.js - Generic world (#695 #6206)
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
  // #695 auto-play keeps the top card on top
  run(`{ const me=setup(); me.deck=[1,2,3]; const ab=ABX.get(CARD_MAP.get(695)).abilities.find(a=>a.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(695),ab,null,{event:{name:'equipped'}}); }`); await settle();
  ck("695: deck unchanged in auto-play, no double handling", val(`return battle.plr.deck.join()==='1,2,3'`), val(`return battle.plr.deck`));
  // #6206 reset: everything shuffled, draw 6, 2 to gauge, life 10
  run(`{ const me=setup(); me.life=2; me.deck=[1,2,3,4,5,6,7,8,9,10]; me.hand=[11,12]; me.gauge=[13,14]; me.drop=[15]; globalThis.__tot=me.deck.length+me.hand.length+me.gauge.length+me.drop.length; ABX.fireSpell('plr',CARD_MAP.get(6206),{free:true}); }`); await settle();
  ck("6206: 6 in hand, 2 in gauge, life 10, no cards lost", val(`const p=battle.plr; return p.hand.length===6 && p.gauge.length===2 && p.life===10 && p.drop.length===0 && p.deck.length+8===__tot`), val(`const p=battle.plr; return [p.hand.length,p.gauge.length,p.life,p.drop.length,p.deck.length,__tot]`));
  // #1886 discard BDR (else pay 2 life) -> top two to gauge
  for (const hasBdr of [true, false]) {
    run(`{ const me=setup(); me.gauge=[]; me.deck=[1,2,3]; me.life=10; me.hand=${hasBdr ? "[1087]" : "[1054]"}; ABX.fireEnter('plr',CARD_MAP.get(1886),mk(CARD_MAP.get(1886))); }`); await settle();
    ck("1886 " + (hasBdr ? "discards BDR, no life paid" : "pays 2 life"), val(`const p=battle.plr; return p.gauge.length===2 && p.life===${hasBdr ? 10 : 8} && p.hand.length===${hasBdr ? 0 : 1}`), val(`const p=battle.plr; return [p.gauge.length,p.life,p.hand]`));
  }
  // #1086 discard -> next damage reduced by 2 (4 for BDR)
  for (const bdr of [false, true]) {
    run(`{ const me=setup(); me.hand=[${bdr ? 1087 : 1054}]; battle.turn='opp'; battle.activeSide='opp'; const ab=ABX.get(CARD_MAP.get(1086)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(1086),ab,null,{event:{name:'act'}}); }`); await settle();
    ck("1086 " + (bdr ? "BDR discarded: reduce 4" : "other discarded: reduce 2"), val(`const S=battle.plr.abxState||battle.plr.abx||null; const all=JSON.stringify(battle.plr); return battle.plr.hand.length===0 && all.indexOf('"reduceBy":${bdr ? 4 : 2}')>=0`), val(`return [battle.plr.hand.length]`));
  }
  // #2790 discard two size 3+ monsters + 2 gauge -> +5 life
  run(`globalThis.__big=ALL_CARDS.find(c=>c.type==='Monster'&&Number(c.size)>=3).id`);
  run(`{ const me=setup(); me.hand=[__big,__big]; me.life=10; const u=mk(CARD_MAP.get(2790)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(2790)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(2790),ab,u,{event:{name:'act'}}); }`); await settle();
  ck("2790: two big monsters + 2 gauge -> +5 life", val(`const p=battle.plr; return p.life===15 && p.hand.length===0 && p.gauge.length===5`), val(`const p=battle.plr; return [p.life,p.hand.length,p.gauge.length]`));
  console.log("\npass " + pass + " fail " + fail);
})();
