// node tests/hero_d.js - Hero World batch 5: generic [Transform]/[Ride] from hand / drop (#2129 #4972 #6413)
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
  // #2129: when destroyed -> free [Ride]/[Transform] from hand
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2129)); me.hand=[1042]; battle.destroyMonster('plr','center'); }`); await settle();
  ck("2129 destroyed: rides Martian UFO Takosuke from hand for free", val(`return battle.plr.item&&battle.plr.item.card.id===1042`), val(`return [battle.plr.item&&battle.plr.item.card.id, battle.plr.hand]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2129)); me.hand=[]; battle.destroyMonster('plr','center'); }`); await settle();
  ck("2129 destroyed with nothing to ride: no item", val(`return !battle.plr.item`));
  // #4972 Cosmo Change!: 2 deck -> gauge, then [Transform] as Galaxy Exalt from drop paying cost
  run(`{ const me=setup(); me.drop=[4434]; globalThis.__d=me.deck.length; globalThis.__g=me.gauge.length; ABX.fireSpell('plr',CARD_MAP.get(4972)); }`); await settle();
  ck("4972: transformed into Cosmoman from drop", val(`return battle.plr.item&&battle.plr.item.card.id===4434 && !battle.plr.drop.includes(4434)`), val(`return [battle.plr.item&&battle.plr.item.card.id, battle.plr.drop]`));
  ck("4972: milled 2, paid 2 (gauge +2 -2)", val(`return battle.plr.gauge.length===__g && battle.plr.deck.length<=__d-2`), val(`return [battle.plr.gauge.length,__g,battle.plr.deck.length,__d]`));
  run(`{ const me=setup(); me.drop=[1054]; ABX.fireSpell('plr',CARD_MAP.get(4972)); }`); await settle();
  ck("4972 with no Galaxy Exalt in drop: no transform", val(`return !battle.plr.item`));
  // #6300 / #6302: counters with "if you are [Impact Transform] into a card"
  const impItem = `me.item={card:CARD_MAP.get(__imp),rested:false,attacksLeft:1,soul:[],isTransformed:true}`;
  run(`globalThis.__imp=ALL_CARDS.find(c=>IMX.isImpactMonster(c)).id;`);
  run(`{ const me=setup(); ${impItem}; globalThis.__g=me.gauge.length; globalThis.__l=me.life; globalThis.__h=me.hand.length; ABX.fireSpell('plr',CARD_MAP.get(6300)); }`); await settle();
  ck("6300 impact transformed: gauge+1, life+1, draw 1", val(`const p=battle.plr; return p.gauge.length===__g+1 && p.life===__l+1 && p.hand.length===__h+1`), val(`const p=battle.plr; return [p.gauge.length-__g,p.life-__l,p.hand.length-__h]`));
  run(`{ const me=setup(); globalThis.__g=me.gauge.length; globalThis.__l=me.life; globalThis.__h=me.hand.length; ABX.fireSpell('plr',CARD_MAP.get(6300)); }`); await settle();
  ck("6300 not impact transformed: no bonus", val(`const p=battle.plr; return p.gauge.length===__g && p.life===__l && p.hand.length===__h`), val(`const p=battle.plr; return [p.gauge.length-__g,p.life-__l,p.hand.length-__h]`));
  // #2642 The Third Guy: enters while transformed into a Gaigrander card -> draw
  run(`{ const me=setup(); me.item={card:CARD_MAP.get(6223)||ALL_CARDS.find(c=>/gaigrander/i.test(c.name)),rested:false,attacksLeft:1,soul:[],isTransformed:true}; globalThis.__h=me.hand.length; ABX.fireEnter&&ABX.fireEnter('plr',CARD_MAP.get(2642),mk(CARD_MAP.get(2642))); }`); await settle();
  ck("2642 with Gaigrander transform: draws", val(`return battle.plr.hand.length===__h+1`), val(`return [battle.plr.hand.length,__h]`));
  run(`{ const me=setup(); globalThis.__h=me.hand.length; ABX.fireEnter&&ABX.fireEnter('plr',CARD_MAP.get(2642),mk(CARD_MAP.get(2642))); }`); await settle();
  ck("2642 without transform: no draw", val(`return battle.plr.hand.length===__h`));
  console.log(`\npass ${pass} fail ${fail}`);
})();
