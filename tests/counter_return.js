// node tests/counter_return.js - [Counter] spells that say "return this card to (your) hand" must end in the HAND, not the drop zone.
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.mon=(id)=>mk(CARD_MAP.get(id));
 globalThis.base=function(id){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; globalThis.__res=null;
   const me=battle.opp; me.gauge=me.deck.splice(0,6); me.life=10; me.hand=[id,ALL_CARDS.find(x=>x.type==='Monster'&&!x.skill).id]; me.drop=[]; me.monsters.center=mon(4281);
   const a=battle.plr; a.monsters.center=mon(4281); battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack';
   battle.executeAttackResolution=function(x,z,t,n){ globalThis.__res=n; }; return me; };
 globalThis.where=(id)=>{ const me=battle.opp; return me.hand.includes(id)?'hand':me.drop.includes(id)?'drop':'other'; };
 globalThis.defend=function(id,tp){ const me=battle.opp; battle.applyDefensiveCounterCard('opp', me.hand.indexOf(id), 'plr', ['center'], tp||'fighter'); };`);
(async () => {
  // #5421 Retainer Shield: nullify; Dragod on left+right -> drop a hand card -> return to hand
  run(`{ base(5421); const me=battle.opp; me.monsters.left=mon(4281); me.monsters.right=mon(4282); defend(5421); }`); await settle();
  ck("5421 Dragod left+right: returns to hand", val(`return where(5421)`) === "hand", val(`return where(5421)`));
  run(`{ base(5421); const me=battle.opp; me.monsters.left=null; me.monsters.right=null; defend(5421); }`); await settle();
  ck("5421 no Dragod left+right: stays in drop", val(`return where(5421)`) === "drop", val(`return where(5421)`));
  // #4963 Linkdragon Spirit: nullify, drop top card; [D-Share] -> return to hand
  run(`{ base(4963); const me=battle.opp; me.deck.unshift(4317); defend(4963); }`); await settle();
  ck("4963 top card has [D-Share]: returns to hand", val(`return where(4963)`) === "hand", val(`return [where(4963), battle.opp.drop]`));
  run(`{ base(4963); const me=battle.opp; me.deck.unshift(ALL_CARDS.find(x=>x.type==='Monster'&&!x.skill).id); defend(4963); }`); await settle();
  ck("4963 top card without [D-Share]: stays in drop", val(`return where(4963)`) === "drop", val(`return where(4963)`));
  // #351 Berserk Gard: Symbel Gard in drop -> may discard + pay 2 gauge -> return to hand
  run(`{ base(351); const me=battle.opp; me.drop=[364]; defend(351); }`); await settle();
  ck("351 Symbel Gard in drop: returns to hand", val(`return where(351)`) === "hand", val(`return where(351)`));
  // #352 Breathen Gard: Berserk Gard in drop -> may drop a hand card + pay 2 gauge -> return to hand
  run(`{ base(352); const me=battle.opp; me.drop=[351]; defend(352); }`); await settle();
  ck("352 Berserk Gard in drop: returns to hand", val(`return where(352)`) === "hand", val(`return where(352)`));
  // #5290 Stretchy Suspenders: destroy a character; Detective on field -> drop a hand card -> return to hand
  run(`{ base(5290); const me=battle.opp; me.monsters.left=mon(5182); defend(5290); }`); await settle();
  ck("5290 Detective on field: returns to hand", val(`return where(5290)`) === "hand", val(`return where(5290)`));
  // #351 still buffs the monster in battle (power+2000 / defense+2000 / [Counterattack]) and stays in the drop zone without a Symbel Gard
  run(`{ base(351); defend(351,'center'); }`); await settle();
  ck("351 no Symbel Gard in drop: stays in drop", val(`return where(351)`) === "drop", val(`return where(351)`));
  ck("351 buffs the defender", val(`const u=battle.opp.monsters.center; return u.tempPower===2000 && u.tempDef===2000 && !!u.tempCA`), val(`const u=battle.opp.monsters.center; return [u.tempPower,u.tempDef,u.tempCA]`));
  // #1387 (normal spell): returns to hand only when the dropped card is NOT a Darkhero
  const dh = JSON.parse(run(`JSON.stringify(ALL_CARDS.find(x=>(x.attrs||[]).includes('Darkhero')&&x.type==='Monster').id)`)), nd = JSON.parse(run(`JSON.stringify(ALL_CARDS.find(x=>x.type==='Monster'&&!(x.attrs||[]).includes('Darkhero')&&!x.skill).id)`));
  for (const [id, want] of [[nd, "hand"], [dh, "drop"]]) {
    run(`{ base(1387); const me=battle.opp; battle.plr.item=mk(CARD_MAP.get(942)); me.deck.unshift(${id}); battle.activeSide='opp'; battle.turn='opp'; battle.phase='main'; battle.castSpellFromHand('opp', me.hand.indexOf(1387)); }`); await settle();
    ck("1387 dropped card " + (want === "hand" ? "is not" : "is") + " a Darkhero: " + want, val(`return where(1387)`) === want, val(`return [where(1387), battle.opp.drop]`));
    if (want === "drop") ck("1387 Darkhero: gains 2 life and destroys the opponent's item", val(`return battle.opp.life===12 && !battle.plr.item`), val(`return [battle.opp.life, !!battle.plr.item]`));
  }
  console.log("pass", pass, "fail", fail);
})();
