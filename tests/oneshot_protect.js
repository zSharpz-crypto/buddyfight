// node tests/oneshot_protect.js - cast spells that say "(for this turn) ... cannot be destroyed / returned / [Rest] ..." must protect for the turn (they used to do nothing once the spell went to the drop zone).
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 40; i++) { await new Promise(r => setImmediate(r)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}); globalThis.mon=(id)=>mk(CARD_MAP.get(id));
 globalThis.base=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr; ['left','center','right'].forEach(p=>me.monsters[p]=null); me.gauge=me.deck.splice(0,5); battle.turn='plr'; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=5; return me; };
 globalThis.prot=(pos,kind,bySide)=>ABX.core.isProtected(battle.plr.monsters[pos],'plr',kind,{side:bySide||'opp'});
 globalThis.cast=(id)=>ABX.fireSpell('plr',CARD_MAP.get(id));`);
(async () => {
  // #5428 Party at CiRCLE!: all characters on your field cannot be destroyed (any source)
  run(`{ const me=base(); me.monsters.center=mon(4281); me.monsters.left=mon(4282); }`);
  ck("5428 before: not protected", !val(`return prot('center','destroyed')`));
  run(`cast(5428)`); await settle();
  ck("5428 all monsters cannot be destroyed (opp effect)", val(`return prot('center','destroyed')&&prot('left','destroyed')`));
  ck("5428 also vs own effects", val(`return prot('center','destroyed','plr')`));
  run(`battle.turnCount=6;`);
  ck("5428 over next turn", !val(`return prot('center','destroyed')`));
  // #3976 Parasite Yggdrasil: size 3 monsters, by opp effects only
  run(`{ const me=base(); me.monsters.center=mon(5501); me.monsters.left=mon(4281); }`);
  run(`cast(3976)`); await settle();
  ck("3976 size 3 monster protected from opp effects", val(`return prot('center','destroyed')`));
  ck("3976 not from own effects (by opponent only)", !val(`return prot('center','destroyed','plr')`));
  ck("3976 size 1 monster not protected", !val(`return prot('left','destroyed')`));
  // #482 Dragonic Force Field: monsters on your left and right
  run(`{ const me=base(); me.monsters.center=mon(4281); me.monsters.left=mon(4282); me.monsters.right=mon(4281); }`);
  run(`cast(482)`); await settle();
  ck("482 left and right protected, center not", val(`return prot('left','destroyed')&&prot('right','destroyed')&&!prot('center','destroyed')`), val(`return [prot('left','destroyed'),prot('right','destroyed'),prot('center','destroyed')]`));
  // #5768 Sweet Happy Time: cannot be [Rest] by opp effects
  run(`{ const me=base(); me.monsters.center=mon(4281); }`);
  run(`ABX.autoPlay=false; ABX.hooks.pickOption=()=>1; cast(5768)`); await settle(); run(`ABX.hooks.pickOption=null; ABX.autoPlay=true;`);
  ck("5768 option 2: monsters cannot be [Rest] by opp effects", val(`return prot('center','rest')`));
  ck("5768 option 2 does not protect from own effects", !val(`return prot('center','rest','plr')`));
  console.log(`pass ${pass} fail ${fail}`);
})();
