// node tests/dungeon_a.js - Dungeon World (#235 #256 #1134 #248 #4065)
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
  // #235: monster -> that player takes 1; non-monster -> gains 1
  run(`{ const me=setup(), op=battle.opp; me.deck=[105,1054]; op.deck=[207,1054]; ABX.fireLeave&&0; const u=mk(CARD_MAP.get(235)); const ab=ABX.get(CARD_MAP.get(235)).abilities.find(a=>a.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(235),ab,u,{event:{name:'leave'}}); }`); await settle();
  ck("235: monster top -> 1 damage, spell top -> +1 life", val(`return battle.plr.life===9 && battle.opp.life===11 && battle.plr.drop.length===1 && battle.opp.drop.length===1`), val(`return [battle.plr.life,battle.opp.life]`));
  // #256 / #1134: two Dungeon Enemy discarded, then opposing monster destroyed
  for (const id of [256, 1134]) for (const two of [true, false]) {
    run(`{ const me=setup(), op=battle.opp; me.hand=${two ? "[105,105]" : "[105,1054]"}; op.monsters.center=mk(CARD_MAP.get(1054)); const u=mk(CARD_MAP.get(${id})); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(${id})).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(${id}),ab,u,{event:{name:'act'}}); }`); await settle();
    ck(id + (two ? " two Dungeon Enemy: discard and destroy" : " only one: nothing happens"), val(two ? `return battle.plr.hand.length===0 && !battle.opp.monsters.center` : `return battle.plr.hand.length===2 && !!battle.opp.monsters.center`), val(`return [battle.plr.hand.length,!!battle.opp.monsters.center]`));
  }
  // #248: pair to deck bottom, then top card to gauge and draw
  run(`{ const me=setup(); me.drop=[199,105]; me.deck=[41,42,43]; me.hand=[]; me.gauge=[]; const u=mk(CARD_MAP.get(248)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(248)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(248),ab,u,{event:{name:'act'}}); }`); await settle();
  ck("248: pair under deck, +1 gauge, draw 1", val(`const p=battle.plr; return p.drop.length===0 && p.gauge.length===1 && p.hand.length===1 && p.deck.length===3 && p.deck.slice(-2).join()==='199,105'`), val(`const p=battle.plr; return [p.drop,p.gauge,p.hand,p.deck]`));
  // #4065: gauge = number of equipped items
  run(`{ const me=setup(); me.gauge=[]; me.deck=[51,52,53,54]; me.item=mk(CARD_MAP.get(199)); ABX.fireSpell('plr',CARD_MAP.get(4065),{free:true}); }`); await settle();
  ck("4065: one equipped item -> +1 gauge", val(`return battle.plr.gauge.length===1`), val(`return [battle.plr.gauge.length]`));
  console.log("\npass " + pass + " fail " + fail);
})();
