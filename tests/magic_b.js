// node tests/magic_b.js - Magic World (#2719 #4187)
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
 globalThis.__pil=ALL_CARDS.find(c=>(c.attrs||[]).includes('Pillars')&&c.id!==2719).id; globalThis.__wiz=ALL_CARDS.find(c=>(c.attrs||[]).includes('Wizard')&&c.type==='Monster'&&c.id!==4187).id;`);
(async () => {
  // #2719 two 72 Pillars discarded, then opponent's field returned to hand
  for (const two of [true, false]) {
    run(`{ const me=setup(), op=battle.opp; me.hand=${two ? "[__pil,__pil]" : "[__pil,1054]"}; op.monsters.center=mk(CARD_MAP.get(1054)); op.hand=[]; const u=mk(CARD_MAP.get(2719)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(2719)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(2719),ab,u,{event:{name:'act'}}); }`); await settle();
    ck("2719 " + (two ? "two Pillars: opp field returned" : "one Pillar: nothing"), val(two ? `return battle.plr.hand.length===0 && !battle.opp.monsters.center && battle.opp.hand.length===1` : `return battle.plr.hand.length===2 && !!battle.opp.monsters.center`), val(`return [battle.plr.hand.length,!!battle.opp.monsters.center,battle.opp.hand.length]`));
  }
  // #4187 two Wizards discarded, then destroy all opp cards
  for (const two of [true, false]) {
    run(`{ const me=setup(), op=battle.opp; me.hand=${two ? "[__wiz,__wiz]" : "[__wiz,1054]"}; op.monsters.center=mk(CARD_MAP.get(1054)); const u=mk(CARD_MAP.get(4187)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(4187)).abilities.filter(a=>a.kind==='act')[0]; ABX.runAbility('plr',CARD_MAP.get(4187),ab,u,{event:{name:'act'}}); }`); await settle();
    ck("4187 " + (two ? "two Wizards: opp field destroyed" : "one Wizard: nothing"), val(two ? `return battle.plr.drop.filter(x=>x===__wiz).length===2 && !battle.plr.hand.includes(__wiz) && !battle.opp.monsters.center` : `return battle.plr.hand.includes(__wiz) && !!battle.opp.monsters.center`), val(`return [battle.plr.hand.length,!!battle.opp.monsters.center]`));
  }
  console.log("\npass " + pass + " fail " + fail);
})();
