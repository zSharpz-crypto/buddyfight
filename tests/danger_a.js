// node tests/danger_a.js - Danger World (#3660 #2386 #1708 #5351)
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
  // #3660 draw 1 + gauge per Duel Golem monster
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(3594)); me.monsters.right=mk(CARD_MAP.get(3594)); me.deck=[1,2,3,4,5,6]; me.gauge=[]; me.hand=[]; ABX.fireSpell('plr',CARD_MAP.get(3660),{free:true}); }`); await settle();
  ck("3660: draw 1, gauge +2 (two Duel Golems)", val(`const p=battle.plr; return p.hand.length===1 && p.gauge.length===2 && p.deck.length===3`), val(`const p=battle.plr; return [p.hand,p.gauge.length,p.deck.length]`));
  // #2386 search deck, else drop zone
  run(`globalThis.__gv=ALL_CARDS.find(c=>c.name==='Gate of Verdict, -Judgment-').id`);
  for (const where of ["deck", "drop"]) {
    run(`{ const me=setup(); me.deck=[1054,${where === "deck" ? "__gv," : ""}1054]; me.drop=${where === "drop" ? "[__gv]" : "[]"}; me.hand=[]; const u=mk(CARD_MAP.get(2386)); me.monsters.center=u; ABX.fireEnter('plr',CARD_MAP.get(2386),u); }`); await settle();
    ck("2386 found in " + where, val(`return battle.plr.hand.includes(__gv) && !battle.plr.drop.includes(__gv) && !battle.plr.deck.includes(__gv)`), val(`return [battle.plr.hand,battle.plr.drop,battle.plr.deck]`));
  }
  // #1708 top to gauge, reveal 3, Demon Slay to hand, rest drop
  run(`{ const me=setup(); me.gauge=[]; me.hand=[]; me.deck=[1054,1054,109,1054,1054]; ABX.fireSpell('plr',CARD_MAP.get(1708),{free:true}); }`); await settle();
  ck("1708: gauge +1, Demon Slay to hand, other two revealed dropped", val(`const p=battle.plr; return p.gauge.length===1 && p.hand.join()==='109' && p.drop.length===2 && p.deck.length===1`), val(`const p=battle.plr; return [p.gauge.length,p.hand,p.drop,p.deck.length]`));
  // #5351 needs 3 different world names in drop
  for (const ok of [false, true]) {
    run(`{ const me=setup(); const ws=[...new Set(ALL_CARDS.map(c=>c.world).filter(Boolean))]; const pick=(w)=>ALL_CARDS.find(c=>c.world===w).id; me.drop=${ok ? "[pick(ws[0]),pick(ws[1]),pick(ws[2])]" : "[pick(ws[0]),pick(ws[0])]"}; const u=mk(CARD_MAP.get(5351)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(5351)).abilities.find(a=>a.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(5351),ab,u,{event:{name:'attack'}}); }`); await settle();
    ck("5351 " + (ok ? "3 worlds: +8000 power" : "1 world: nothing"), val(`return battle.plr.monsters.center.tempPower===${ok ? 8000 : 0}`), val(`return [battle.plr.monsters.center.tempPower]`));
  }
  // #4204 Counter Act: only after a Duel Golem was destroyed this turn
  for (const hit of [false, true]) {
    run(`{ const me=setup(); me.hand=[4204]; me.gauge=me.deck.splice(0,6); ${hit ? "me.abxDestroyedTurn={3594:battle.turnCount};" : ""} globalThis.__r=ABX.canUseHandAct('plr',0,ABX.get(CARD_MAP.get(4204)).abilities.find(a=>a.kind==='act')).ok; if(__r) ABX.runHandUse('plr',0,ABX.get(CARD_MAP.get(4204)).abilities.find(a=>a.kind==='act')); }`); await settle();
    ck("4204 " + (hit ? "Golem destroyed: called" : "no Golem destroyed: blocked"), val(hit ? `return __r===true && !!Object.values(battle.plr.monsters).find(u=>u&&u.card.id===4204)` : `return __r===false`), val(`return [__r,Object.values(battle.plr.monsters).map(u=>u&&u.card.id)]`));
  }
  // #129 gain 4, minus Invigorating Breath in drop
  run(`globalThis.__ib=ALL_CARDS.find(c=>c.name==='Invigorating Breath').id`);
  for (const k of [0, 1]) {
    run(`{ const me=setup(); me.life=5; me.drop=${k ? "[__ib]" : "[]"}; ABX.fireSpell('plr',CARD_MAP.get(129),{free:true}); }`); await settle();
    ck("129 with " + k + " Invigorating Breath in drop: +" + (4 - k), val(`return battle.plr.life===${9 - k}`), val(`return [battle.plr.life]`));
  }
  // #115 monster gets a Weapon's power and Counterattack
  run(`{ const me=setup(); me.item=mk(CARD_MAP.get(199)); me.monsters.center=mk(CARD_MAP.get(1054)); ABX.fireSpell('plr',CARD_MAP.get(115),{free:true}); }`); await settle();
  ck("115: power +Weapon power and Counterattack", val(`const u=battle.plr.monsters.center, w=Number(CARD_MAP.get(199).power)||0; return w>0 && u.tempPower===w && u.tempCA===true`), val(`const u=battle.plr.monsters.center; return [u.tempPower,u.tempCA,CARD_MAP.get(199).power]`));
  console.log("\npass " + pass + " fail " + fail);
})();
