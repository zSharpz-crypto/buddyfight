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
  console.log("\npass " + pass + " fail " + fail);
})();
