// node tests/collab_b.js - Conan #5201, Medabots #6259 #6268
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
  run(`{ const me=setup(), op=battle.opp; op.deck=[1,2,3,4,5]; const u=mk(CARD_MAP.get(5201)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(5201)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(5201),ab,u,{event:{name:'act'}}); }`); await settle();
  ck("5201: opponent deck unchanged in size, nothing lost or duplicated", val(`const d=battle.opp.deck; return d.length===5 && [...d].sort().join()==='1,2,3,4,5'`), val(`return battle.opp.deck`));
  run(`{ const me=setup(); me.hand=[]; me.deck=[1054,6247,1054,1054,1054,1054,1054,1054]; const u=mk(CARD_MAP.get(6259)); me.monsters.center=u; ABX.fireEnter('plr',CARD_MAP.get(6259),u); }`); await settle();
  ck("6259: Hardness Ten to hand, other five to bottom, deck size kept minus one", val(`const p=battle.plr; return p.hand.join()==='6247' && p.deck.length===7 && p.deck[0]===1054 && p.deck.indexOf(6247)<0`), val(`const p=battle.plr; return [p.hand,p.deck]`));
  for (const five of [true, false]) {
    run(`{ const me=setup(); me.deck=[90,91,92]; me.hand=[]; me.drop=${five ? "[1054,1054,6247,6265,6231,6259,1054]" : "[1054,1054,6247,1054]"}; const u=mk(CARD_MAP.get(6268)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(6268)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(6268),ab,u,{event:{name:'act'}}); }`); await settle();
    ck("6268 " + (five ? "five different names returned, draw 1" : "two different names returned, no draw"), val(five ? `const p=battle.plr; return p.hand.length===1 && p.drop.length===2 && p.deck.length===3+5-1` : `const p=battle.plr; return p.hand.length===0 && p.drop.length===2 && p.deck.length===3+2`), val(`const p=battle.plr; return [p.hand.length,p.drop,p.deck.length]`));
  }
  console.log("\npass " + pass + " fail " + fail);
})();
