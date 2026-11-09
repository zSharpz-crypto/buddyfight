// node tests/bandori_a.js - BanG Dream (#5495)
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
   me.gauge=me.deck.splice(0,7); op.gauge=op.deck.splice(0,5); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  for (const ok of [false, true]) {
    run(`{ const me=setup(); me.hand=[5495]; me.monsters.left=mk(CARD_MAP.get(5381)); ${ok ? "me.monsters.center=mk(CARD_MAP.get(5382)); me.monsters.right=mk(CARD_MAP.get(5392));" : ""} globalThis.__r=evaluateCardConditions(CARD_MAP.get(5495),me,battle.opp); }`);
    const r = val(`return __r`);
    ck("5495 cast gate " + (ok ? "Afterglow total size 3: allowed" : "total size 1: blocked"), ok ? r.met === true : r.met === false, r);
  }
  console.log("\npass " + pass + " fail " + fail);
})();
