// node tests/field_soul_cost.js - [Call Cost] "Put monster(s) from your field into this card's soul": paid BEFORE the size limit is enforced, counts all/one or more/up to N
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3; battle.matchOver=false;
   me.gauge=me.deck.splice(0,9); me.hand=[]; me.drop=[]; me.item=null; ['left','center','right'].forEach(p=>{me.monsters[p]=null;battle.opp.monsters[p]=null}); return me; };
 globalThis.callFrom=(id)=>{ const me=battle.plr; me.hand=[id]; battle.completeMonsterCall('plr','center',0,false,false); };`);
const field = (n) => `me.monsters.left=mk(CARD_MAP.get(1054));` + (n > 1 ? `me.monsters.right=mk(CARD_MAP.get(1054));` : "");
(async () => {
  // size 3 call over a size 1 monster: the monster must go into the soul, not the drop zone
  run(`{ const me=setup(); ${field(1)} callFrom(2586); }`); await settle();
  ck("2586 (a monster, size 3 card): monster is in the soul, not in the drop zone", val(`const u=battle.plr.monsters.center; return u&&u.card.id===2586 && u.soul.includes(1054) && !battle.plr.drop.includes(1054) && !battle.plr.monsters.left`), val(`return [battle.plr.monsters.center&&battle.plr.monsters.center.soul, battle.plr.drop, !!battle.plr.monsters.left]`));
  run(`{ const me=setup(); ${field(1)} callFrom(2924); }`); await settle();
  ck("2924 (pay first, then put a monster): same", val(`const u=battle.plr.monsters.center; return u&&u.soul.includes(1054) && !battle.plr.drop.includes(1054)`), val(`return [battle.plr.monsters.center&&battle.plr.monsters.center.soul, battle.plr.drop]`));
  run(`{ const me=setup(); ${field(1)} callFrom(3135); }`); await settle();
  ck("3135 (size 2): still works", val(`const u=battle.plr.monsters.center; return u&&u.soul.includes(1054) && !battle.plr.drop.includes(1054)`), 0);
  // one or more: both monsters may go (auto-play takes all it can), at least one
  run(`{ const me=setup(); ${field(2)} callFrom(4018); }`); await settle();
  ck("4018 (one or more): the monsters are in the soul", val(`const u=battle.plr.monsters.center; return u&&u.soul.filter(i=>i===1054).length>=1 && battle.plr.drop.filter(i=>i===1054).length===0`), val(`return [battle.plr.monsters.center&&battle.plr.monsters.center.soul, battle.plr.drop]`));
  // up to three
  run(`{ const me=setup(); ${field(2)} callFrom(3861); }`); await settle();
  ck("3861 (up to three): both monsters in the soul", val(`const u=battle.plr.monsters.center; return u&&u.soul.filter(i=>i===1054).length===2 && battle.plr.drop.filter(i=>i===1054).length===0`), val(`return [battle.plr.monsters.center&&battle.plr.monsters.center.soul, battle.plr.drop]`));
  // no monster to pay with: cannot be called
  run(`{ const me=setup(); callFrom(2586); }`); await settle();
  ck("2586 with no monster on the field: not called", val(`return !battle.plr.monsters.center && battle.plr.hand.includes(2586)`), 0);
  // all «X»: only matching monsters are taken, the others stay or are dropped by the size limit
  const q5 = JSON.parse(run(`JSON.stringify(ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('QuartetFive')&&c.size===1).id)`));
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(${q5})); me.monsters.right=mk(CARD_MAP.get(${q5})); callFrom(1041); }`); await settle();
  ck("1041 (all Quartet Five): both go into the soul", val(`const u=battle.plr.monsters.center; return u&&u.card.id===1041 && u.soul.filter(i=>i===${q5}).length===2`), val(`return [battle.plr.monsters.center&&battle.plr.monsters.center.soul, battle.plr.drop]`));
  console.log("pass", pass, "fail", fail);
})();
