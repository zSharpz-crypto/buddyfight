// node tests/hero_d.js - Star Dragon conditional effects (#2920 #2381 #2888 #3286 #3334 #1677)
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
  // #2920 enters center -> destroy; enters side -> nothing
  run(`{ const me=setup(); battle.opp.monsters.left=mk(CARD_MAP.get(1054)); me.monsters.center=mk(CARD_MAP.get(2920)); ABX.fireEnter('plr',CARD_MAP.get(2920),me.monsters.center); }`); await settle();
  ck("2920 enters center: opp monster destroyed", val(`return !battle.opp.monsters.left`));
  run(`{ const me=setup(); battle.opp.monsters.left=mk(CARD_MAP.get(1054)); me.monsters.right=mk(CARD_MAP.get(2920)); ABX.fireEnter('plr',CARD_MAP.get(2920),me.monsters.right); }`); await settle();
  ck("2920 enters right: nothing destroyed", val(`return !!battle.opp.monsters.left`));
  // #2381: <=3 drop cards -> gauge (auto) else nothing
  run(`{ const me=setup(); me.drop=[1054]; globalThis.__g=me.gauge.length; ABX.fireEnter('plr',CARD_MAP.get(2381),mk(CARD_MAP.get(2381))); }`); await settle();
  ck("2381: small drop -> +1 gauge after bottoming the drop card", val(`return battle.plr.gauge.length===__g+1`), val(`return [battle.plr.gauge.length,__g,battle.plr.drop]`));
  run(`{ const me=setup(); me.drop=new Array(7).fill(1054); globalThis.__g=me.gauge.length; globalThis.__l=me.life; ABX.fireEnter('plr',CARD_MAP.get(2381),mk(CARD_MAP.get(2381))); }`); await settle();
  ck("2381: big drop (still >3 after bottoming 2) -> no bonus", val(`return battle.plr.gauge.length===__g && battle.plr.life===__l`), val(`return [battle.plr.gauge.length,__g,battle.plr.drop.length]`));
  // #2888: destroy then gauge by size
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1054)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__g=me.gauge.length; globalThis.__sz=CARD_MAP.get(1054).size; ABX.fireSpell('plr',CARD_MAP.get(2888)); }`); await settle();
  ck("2888: destroyed monster's size in cards to gauge", val(`return !battle.opp.monsters.center && battle.plr.gauge.length>=__g+__sz`), val(`return [battle.plr.gauge.length,__g,__sz]`));
  // #3286: leaves in attack phase -> gauge + life, not in main phase
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3286)); battle.phase='attack'; globalThis.__g=me.gauge.length; globalThis.__l=me.life; battle.destroyMonster('plr','center'); }`); await settle();
  ck("3286 leaves during attack phase: +1 gauge, +1 life", val(`return battle.plr.gauge.length===__g+1 && battle.plr.life===__l+1`), val(`return [battle.plr.gauge.length,__g,battle.plr.life,__l]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3286)); battle.phase='main'; globalThis.__g=me.gauge.length; battle.destroyMonster('plr','center'); }`); await settle();
  ck("3286 leaves during main phase: nothing", val(`return battle.plr.gauge.length===__g`));
  console.log(`\npass ${pass} fail ${fail}`);
})();
