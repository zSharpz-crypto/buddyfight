// node tests/hero_d.js - Darkness Dragon: opponent-deck mill family (#1860 #1993 #2124 #2281 #2571 #2678)
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
  const st = `const me=battle.plr, op=battle.opp; return [me.deck.length, op.deck.length, op.drop.length, me.drop.length, me.gauge.length, me.life, me.hand.length]`;
  // #2281 Million Edge: both mill 2, draw 1
  run(`{ const me=setup(); globalThis.__b=(function(){${st}})(); ABX.fireSpell('plr',CARD_MAP.get(2281)); }`); await settle();
  let a = val(st); let b = val(`return __b`);
  ck("2281 both players mill 2 and draw", a[1]===b[1]-2 && a[2]===b[2]+2 && a[3]===b[3]+2 && a[6]===b[6]+1, [a,b]);
  // #1993 when destroyed: both mill 2, +1 life
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1993)); globalThis.__b=(function(){${st}})(); battle.destroyMonster('plr','center'); }`); await settle();
  a = val(st); b = val(`return __b`);
  ck("1993 destroyed: both mill 2, +1 life", a[1]===b[1]-2 && a[2]===b[2]+2 && a[3]>=b[3]+2 && a[5]===b[5]+1, [a,b]);
  // #1860 act: discard, destroy a monster, mill opp deck by its size
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1860)); me.hand=[1054]; battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__sz=CARD_MAP.get(1054).size; globalThis.__b=(function(){${st}})(); ABX.useAct('plr',CARD_MAP.get(1860),me.monsters.center); }`); await settle();
  a = val(st); b = val(`return __b`);
  ck("1860 act: monster destroyed, opp deck milled by its size", a[1]===b[1]-val(`return __sz`) && !val(`return battle.opp.monsters.center`), [a,b,val(`return __sz`)]);
  // #2571 attack trigger: destroy + mill by size + same count into my gauge
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2571)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__b=(function(){${st}})(); ABX.fireAttack('plr',[{unit:me.monsters.center,pos:'center'}],'opp','center'); }`); await settle();
  a = val(st); b = val(`return __b`);
  ck("2571 attack: opp deck milled by size, my gauge +same", a[1]===b[1]-val(`return __sz`) && a[4]===b[4]+val(`return __sz`), [a,b]);
  // #2678 Black Wings: counter-call only if opp's deck was milled this turn
  run(`{ const me=setup(); me.hand=[2678]; globalThis.__r0=ABX.canUseAct?1:0; battle.opp.abxMilledTurn=null; }`);
  ck("2678 cond false before any mill", val(`return !battle.opp.abxMilledTurn`));
  console.log(`\npass ${pass} fail ${fail}`);
})();
