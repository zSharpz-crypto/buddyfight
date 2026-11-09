// node tests/hero_d.js - Katana Electrodeity soul-gated effects (#4460 #4995 #5950) + spell-name lock (#6382 #6162)
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
  run(`globalThis.__el=ALL_CARDS.find(c=>c.type==='Item'&&(c.attrs||[]).includes('Electrodeity')).id; globalThis.__em=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Electrodeity')&&c.size<=1).id;
    globalThis.__item=(soul)=>({card:CARD_MAP.get(__el),rested:false,attacksLeft:1,soul:soul?[1054]:[]});`);
  for (const soul of [true, false]) {
    run(`{ const me=setup(); me.item=__item(${soul}); me.life=10; globalThis.__g=me.gauge.length; battle.opp.monsters.center=mk(CARD_MAP.get(1054)); ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',redirectTo:null,nullified:false,attUnits:[battle.opp.monsters.center]}; ABX.fireSpell('plr',CARD_MAP.get(4995)); }`); await settle();
    ck("4995 item "+(soul?"with":"without")+" soul: gauge/life bonus "+(soul?"yes":"no"), val(`return battle.plr.life===${soul?11:10} && battle.plr.gauge.length===__g+${soul?1:0}`), val(`return [battle.plr.life,battle.plr.gauge.length-__g]`));
    run(`ABX.battleCtx=null`);
  }
  run(`{ const me=setup(); me.item=__item(true); me.monsters.center=mk(CARD_MAP.get(__em)); globalThis.__p=me.monsters.center.tempPower||0; globalThis.__c=me.monsters.center.tempCrit||0; ABX.fireEnter('plr',CARD_MAP.get(4460),mk(CARD_MAP.get(4460))); }`); await settle();
  ck("4460 item with soul: power +3000 and crit +1", val(`const u=battle.plr.monsters.center; return (u.tempPower||0)===__p+3000 && (u.tempCrit||0)===__c+1`), val(`const u=battle.plr.monsters.center; return [u.tempPower,u.tempCrit]`));
  run(`{ const me=setup(); me.item=__item(false); me.monsters.center=mk(CARD_MAP.get(__em)); globalThis.__c=me.monsters.center.tempCrit||0; ABX.fireEnter('plr',CARD_MAP.get(4460),mk(CARD_MAP.get(4460))); }`); await settle();
  ck("4460 item without soul: power only, no crit", val(`const u=battle.plr.monsters.center; return (u.tempPower||0)===3000 && (u.tempCrit||0)===__c`), val(`const u=battle.plr.monsters.center; return [u.tempPower,u.tempCrit]`));
  // #6382 / #6162: nullify the cast spell and lock its name for the turn
  for (const [id, rev, locked] of [[6382, 0, true], [6162, 4, true], [6162, 1, false]]) {
    run(`{ const me=setup(); me.item=__item(true); me.godclock={reversalCount:${rev}}; battle.opp.hand=[]; const cc=ABX.castCtx={active:true,side:'opp',card:CARD_MAP.get(1604),kind:'spell',nullified:false}; globalThis.__cc=cc; ABX.fireSpell('plr',CARD_MAP.get(${id})); }`); await settle();
    ck(id+" rev "+rev+": spell nullified, name lock "+(locked?"on":"off"), val(`const r=evaluateCardConditions(CARD_MAP.get(1604), battle.opp, battle.plr); return __cc.nullified===true && (r.met===false && /cannot be cast this turn/.test(JSON.stringify(r.reasons)))===${locked}`), val(`return [__cc.nullified, evaluateCardConditions(CARD_MAP.get(1604), battle.opp, battle.plr).reasons]`));
    run(`ABX.castCtx=null`);
  }
  console.log(`\npass ${pass} fail ${fail}`);
})();
