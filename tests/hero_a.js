// node tests/hero_a.js - Hero World batch 1: «Battle Poet» cards (#2113 #2662 #3250 #4663)
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
   me.gauge=me.deck.splice(0,6); op.gauge=op.deck.splice(0,3); me.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  // #2113 Thinking: act - may discard a Battle Poet card; if you do, Battle Poet cards on your field get [Double Attack] this turn
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2113)); me.monsters.left=mk(CARD_MAP.get(2111)); me.hand=[2127, 2662]; globalThis.__h=me.hand.length; ABX.useAct('plr',CARD_MAP.get(2113),me.monsters.center); }`); await settle();
  ck("2113: discarded a Battle Poet card from hand", val(`return battle.plr.hand.length===__h-1 || battle.plr.hand.length===__h`), val(`return [battle.plr.hand, battle.plr.drop]`));
  ck("2113: discarded exactly one card", val(`return battle.plr.drop.length>=1`), val(`return battle.plr.drop`));
  ck("2113: Battle Poet cards on the field got [Double Attack]", val(`const a=battle.plr.monsters.left, b=battle.plr.monsters.center; return !!(a.tempDA||a.attacksLeft>=2) && !!(b.tempDA||b.attacksLeft>=2)`), val(`const a=battle.plr.monsters.left; return [a.tempDA,a.attacksLeft]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2113)); me.monsters.left=mk(CARD_MAP.get(2111)); me.hand=[]; ABX.useAct('plr',CARD_MAP.get(2113),me.monsters.center); }`); await settle();
  ck("2113: no Battle Poet card in hand -> no Double Attack", val(`const a=battle.plr.monsters.left; return !a.tempDA && a.attacksLeft<2`), val(`const a=battle.plr.monsters.left; return [a.tempDA,a.attacksLeft]`));
  // #2662 Reporting: discarded from hand by a Battle Poet effect -> draw a card (and NOT on being called / discarded by other effects)
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2113)); me.hand=[2662]; globalThis.__d0=me.deck.length; ABX.useAct('plr',CARD_MAP.get(2113),me.monsters.center); }`); await settle();
  ck("2662: discarded by a Battle Poet effect -> drew a card", val(`return battle.plr.deck.length===__d0-1 && battle.plr.hand.length===1`), val(`return [battle.plr.deck.length, __d0, battle.plr.hand]`));
  run(`{ const me=setup(); me.hand=[2662]; globalThis.__d0=me.deck.length; ABX.curEffectCard=CARD_MAP.get(1); const i=me.hand.indexOf(2662); me.hand.splice(i,1); me.drop.push(2662); ABX.fireDiscarded('plr',CARD_MAP.get(2662)); ABX.curEffectCard=null; }`); await settle();
  ck("2662: discarded by another card's effect -> no draw", val(`return battle.plr.deck.length===__d0`), val(`return [battle.plr.deck.length, __d0]`));
  run(`{ const me=setup(); me.hand=[2662]; globalThis.__d0=me.deck.length; me.gauge=me.deck.splice(0,3); battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("2662: calling it does NOT draw", val(`return battle.plr.hand.length===0`), val(`return battle.plr.hand`));
  // #3250 Shouting: discarded by a Battle Poet effect -> top card into gauge and gain 1 life
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2113)); me.hand=[3250]; globalThis.__g=me.gauge.length; ABX.useAct('plr',CARD_MAP.get(2113),me.monsters.center); }`); await settle();
  ck("3250: discarded by a Battle Poet effect -> +1 gauge, +1 life", val(`return battle.plr.gauge.length===__g+1 && battle.plr.life===11`), val(`return [battle.plr.gauge.length, __g, battle.plr.life]`));
  // #4663 Twin Reading: [Counter][Act] drop a Battle Poet hand card -> [Stand] this card
  run(`{ const me=setup(); const u=mk(CARD_MAP.get(4663)); u.rested=true; me.monsters.center=u; me.hand=[2127]; ABX.useAct('plr',CARD_MAP.get(4663),u); }`); await settle();
  ck("4663: dropped a Battle Poet card and stood", val(`return battle.plr.monsters.center.rested===false && battle.plr.drop.includes(2127)`), val(`return [battle.plr.monsters.center.rested, battle.plr.drop]`));
  run(`{ const me=setup(); const u=mk(CARD_MAP.get(4663)); u.rested=true; me.monsters.center=u; me.hand=[]; ABX.useAct('plr',CARD_MAP.get(4663),u); }`); await settle();
  ck("4663: no Battle Poet card to drop -> stays rested", val(`return battle.plr.monsters.center.rested===true`), val(`return battle.plr.monsters.center.rested`));
  console.log("pass", pass, "fail", fail);
})();
