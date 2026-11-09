// node tests/ancient_a.js - Ancient World (#1513 #3502 #4141)
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
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };
 globalThis.__aw=ALL_CARDS.find(c=>c.type==='Monster'&&c.world==='Ancient World').id;`);
(async () => {
  for (const id of [1513, 3502]) {
    run(`{ const me=setup(); me.deck=[1054,__aw,__aw,__aw,1054]; me.gauge=[]; ABX.fireSpell('plr',CARD_MAP.get(${id}),{free:true}); }`); await settle();
    ck(id + ": two Ancient World monsters dropped, top card to gauge", val(`const p=battle.plr; return p.drop.filter(x=>x===__aw).length===2 && p.gauge.length===1 && p.deck.length===2`), val(`const p=battle.plr; return [p.drop,p.gauge.length,p.deck.length]`));
  }
  for (const life of [5, 6]) {
    run(`{ const me=setup(); me.life=${life}; me.hand=[4141]; me.gauge=me.deck.splice(0,5); const ab=ABX.get(CARD_MAP.get(4141)).abilities.find(a=>a.kind==='act'); battle.turn='opp'; battle.activeSide='opp'; ABX.runHandUse('plr',0,ab); }`); await settle();
    ck("4141 called at life " + life + ": " + (life <= 5 ? "+3 life" : "no life"), val(`const p=battle.plr; return !!Object.values(p.monsters).find(u=>u&&u.card.id===4141) && p.life===${life <= 5 ? life + 3 : life}`), val(`const p=battle.plr; return [p.life,Object.values(p.monsters).map(u=>u&&u.card.id)]`));
  }
  console.log("\npass " + pass + " fail " + fail);
})();
