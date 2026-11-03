// node tests/hero_b.js - Hero World batch 2: «Battle Building» "if it entered the field by a «Battle Building» effect" (#4465 #4494 #4503 #4523 #4528 #6418 #6215)
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(id){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   me.gauge=me.deck.splice(0,6); op.gauge=op.deck.splice(0,3); me.hand=[id]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null});
   op.monsters.left=mk(CARD_MAP.get(50)); op.monsters.center=mk(CARD_MAP.get(51)); op.item=mk(CARD_MAP.get(942)); return me; };
 globalThis.fromHand=function(id){ setup(id); battle.completeMonsterCall('plr','center',0,false,false); };
 globalThis.byBB=function(id){ setup(id); ABX.curEffectCard=CARD_MAP.get(4432); battle.completeMonsterCall('plr','center',0,false,true); };
 globalThis.byOther=function(id){ setup(id); ABX.curEffectCard=CARD_MAP.get(1); battle.completeMonsterCall('plr','center',0,false,true); };
 globalThis.oppCards=()=>['left','center','right'].filter(p=>battle.opp.monsters[p]).length+(battle.opp.item?1:0);`);
(async () => {
  // #4465 MST: Then, if it entered by a Battle Building effect, draw a card
  run(`fromHand(4465)`); await settle(); ck("4465 from hand: no draw", val(`return battle.plr.hand.length===0`), val(`return battle.plr.hand`));
  run(`byBB(4465)`); await settle(); ck("4465 by a Battle Building effect: draws a card", val(`return battle.plr.hand.length===1`), val(`return battle.plr.hand`));
  run(`byOther(4465)`); await settle(); ck("4465 by another card's effect: no draw", val(`return battle.plr.hand.length===0`), val(`return battle.plr.hand`));
  // #4523 Simul Lock-on: destroy a monster; then if by a BB effect, destroy a card on the opponent's field
  run(`fromHand(4523)`); await settle(); ck("4523 from hand: destroys one monster only", val(`return oppCards()===2`), val(`return oppCards()`));
  run(`byBB(4523)`); await settle(); ck("4523 by a Battle Building effect: destroys a second card", val(`return oppCards()===1`), val(`return oppCards()`));
  // #4528 Super T-Titan: then, if by a BB effect, top two cards into the gauge
  run(`fromHand(4528)`); await settle(); ck("4528 from hand: no gauge", val(`return battle.plr.gauge.length===4`), val(`return battle.plr.gauge.length`));
  run(`byBB(4528)`); await settle(); ck("4528 by a Battle Building effect: +2 gauge", val(`return battle.plr.gauge.length===8`), val(`return battle.plr.gauge.length`));
  // #4503 I-Borg: gain 2 life; by another BB effect gain 3 more
  run(`fromHand(4503)`); await settle(); ck("4503 from hand: +2 life", val(`return battle.plr.life===12`), val(`return battle.plr.life`));
  run(`byBB(4503)`); await settle(); ck("4503 by a Battle Building effect: +5 life", val(`return battle.plr.life===15`), val(`return battle.plr.life`));
  // #6418 Dynagoya: all BB get power+5000 crit+1; by a BB effect also power+5000 and [Penetrate]
  run(`fromHand(6418); `); await settle(); ck("6418 from hand: +5000 power only", val(`const u=battle.plr.monsters.center; return u.tempPower===5000 && !u.tempPen`), val(`const u=battle.plr.monsters.center; return [u.tempPower,u.tempPen]`));
  run(`byBB(6418)`); await settle(); ck("6418 by a BB effect: +10000 power and Penetrate", val(`const u=battle.plr.monsters.center; return u.tempPower===10000 && !!u.tempPen`), val(`const u=battle.plr.monsters.center; return [u.tempPower,u.tempPen]`));
  // #4494 Big Cy-Bird: draw; by a BB effect also a chosen opposing card cannot stand
  run(`fromHand(4494)`); await settle(); ck("4494 from hand: draws, no stand lock", val(`return battle.plr.hand.length===1 && !['left','center'].some(p=>battle.opp.monsters[p].abxNo&&battle.opp.monsters[p].abxNo.stand)`), val(`return battle.plr.hand`));
  run(`byBB(4494)`); await settle(); ck("4494 by a BB effect: an opposing card cannot stand", val(`return ['left','center'].some(p=>battle.opp.monsters[p].abxNo&&battle.opp.monsters[p].abxNo.stand) || (battle.opp.item.abxNo&&battle.opp.item.abxNo.stand)`));
  // #6215 Paal Academy Combi: +3 life; by a BB/Super Robot effect: deck monster to drop, shuffle, draw
  run(`fromHand(6215)`); await settle(); ck("6215 from hand: +3 life only", val(`return battle.plr.life===13 && battle.plr.hand.length===0`), val(`return [battle.plr.life, battle.plr.hand]`));
  console.log("pass", pass, "fail", fail);
})();
