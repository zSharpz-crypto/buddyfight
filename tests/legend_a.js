// node tests/hero_d.js - Legend World (#357 #2747 #4807 #1964 #2456)
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
  // #357 wipe
  run(`{ const me=setup(); me.hand=[1054,1054]; battle.opp.hand=[1054]; me.monsters.left=mk(CARD_MAP.get(1054)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); ABX.fireSpell('plr',CARD_MAP.get(357)); }`); await settle();
  ck("357: both hands discarded and all monsters destroyed", val(`return battle.plr.hand.length===0 && battle.opp.hand.length===0 && !battle.plr.monsters.left && !battle.opp.monsters.center`), val(`return [battle.plr.hand.length,battle.opp.hand.length,!!battle.plr.monsters.left,!!battle.opp.monsters.center]`));
  // #2747 draw only with Star on left and right
  run(`globalThis.__star=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Star')&&c.size<=1).id`);
  for (const both of [true, false]) {
    run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2747)); me.monsters.left=mk(CARD_MAP.get(__star)); ${both?'me.monsters.right=mk(CARD_MAP.get(__star));':''} me.life=10; globalThis.__h=me.hand.length; ABX.fireTurnEvent('phaseStart','main'); }`); await settle(); /* battle.start also fires its own main-phase event, so the effect may run twice here */
    ck("2747 Star on "+(both?"left+right":"left only")+": "+(both?"draw + life":"nothing"), val(`return ${both?'battle.plr.hand.length>=__h+1 && battle.plr.life>=11':'battle.plr.hand.length===__h && battle.plr.life===10'}`), val(`return [battle.plr.hand.length-__h,battle.plr.life]`));
  }
  // #1964 deck monster to drop
  run(`{ const me=setup(); me.deck=[1054,1054,1054]; globalThis.__d=me.drop.length; ABX.fireEnter('plr',CARD_MAP.get(1964),mk(CARD_MAP.get(1964))); }`); await settle();
  ck("1964: a monster from the deck went to the drop zone", val(`return battle.plr.drop.length===__d+1 && battle.plr.deck.length===2`));
  // #2456 pay 2 life, search Azi Dahaka
  run(`globalThis.__azi=ALL_CARDS.find(c=>c.name==='Great Demonic End Dragon, Azi Dahaka').id`);
  run(`{ const me=setup(); me.deck=[1054,__azi,1054]; me.life=10; ABX.fireEnter('plr',CARD_MAP.get(2456),mk(CARD_MAP.get(2456))); }`); await settle();
  ck("2456: paid 2 life and Azi Dahaka in hand", val(`return battle.plr.life===8 && battle.plr.hand.includes(__azi)`), val(`return [battle.plr.life,battle.plr.hand]`));
  console.log(`\npass ${pass} fail ${fail}`);
})();
