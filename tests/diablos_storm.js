// node tests/diablos_storm.js - #5578 Diablos Storm: this turn, EDD power can't be reduced by opp effects; when a size 3 «Evil Demonic Dragon» monster of yours attacks,
// destroy up to one card on the opponent's field; if you do, drop 1 of the opponent's gauge.
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 60; i++) { await new Promise(r => setImmediate(r)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}); globalThis.mon=(id)=>mk(CARD_MAP.get(id));
 globalThis.cnt=()=>['left','center','right'].filter(p=>battle.opp.monsters[p]).length;
 globalThis.base=function(att, cast){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null;});
   me.monsters.center=mon(att); op.monsters.center=mon(447); op.monsters.left=mon(571); op.monsters.right=mon(447); me.hand=cast?[5578]:[]; me.gauge=[1,2,3]; op.gauge=[1,2,3,4];
   battle.turn='plr'; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=5; if(cast) battle.castSpellFromHand('plr',0); };
 globalThis.hit=function(){ battle.phase='attack'; battle.initiateAttackWithDefenseCheck('plr',['center'],'center'); };`);
(async () => {
  // size-3 EDD attacks after the cast
  run(`base(5562,true);`); await settle();
  ck("cast does not destroy anything by itself", val(`return cnt()`) === 3 && val(`return battle.opp.gauge.length`) === 4);
  run(`hit();`); await settle();
  // the attacked center card dies in battle (1) and the effect destroys one more (1)
  ck("attack trigger destroys one extra opponent card", val(`return cnt()`) === 1, val(`return cnt()`));
  ck("and drops 1 of the opponent's gauge", val(`return battle.opp.gauge.length`) === 3, val(`return battle.opp.gauge.length`));
  // without the spell: only the battle result
  run(`base(5562,false); hit();`); await settle();
  ck("without the spell only the battle kills the target", val(`return cnt()`) === 2 && val(`return battle.opp.gauge.length`) === 4, val(`return [cnt(), battle.opp.gauge.length]`));
  // a size-3 non-EDD monster does not trigger it
  run(`base(4281,true);`); await settle();
  run(`hit();`); await settle();
  ck("a non-EDD attacker does not trigger it", val(`return cnt()`) === 2 && val(`return battle.opp.gauge.length`) === 4, val(`return [cnt(), battle.opp.gauge.length]`));
  // next turn the effect is over
  run(`base(5562,true);`); await settle();
  run(`battle.turnCount=6; hit();`); await settle();
  ck("next turn it no longer triggers", val(`return cnt()`) === 2 && val(`return battle.opp.gauge.length`) === 4, val(`return [cnt(), battle.opp.gauge.length]`));
  // nothing to destroy -> no gauge drop ("if you do")
  run(`base(5562,true);`); await settle();
  run(`['left','center','right'].forEach(p=>battle.opp.monsters[p]=null); battle.phase='attack'; battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter');`); await settle();
  ck("empty opponent field (nothing to destroy): gauge is NOT dropped (if you do)", val(`return battle.opp.gauge.length`) === 4, val(`return battle.opp.gauge.length`));
  run(`base(5562,false);`);
  ck("#5562 Sloth alone is size 3 (\"another\" size 3 EDD excludes itself)", val(`return getEffectiveCardSize(battle.plr, CARD_MAP.get(5562), battle.plr.monsters.center)`) === 3 && val(`return ABX.core.matchFilter(CARD_MAP.get(5562),{size:{n:3,cmp:'eq'}},{unit:battle.plr.monsters.center,side:'plr'},{f:battle.plr})`));
  run(`battle.plr.monsters.left=mon(5501);`);
  ck("#5562 Sloth with another size 3 EDD is size 0", val(`return getEffectiveCardSize(battle.plr, CARD_MAP.get(5562), battle.plr.monsters.center)`) === 0);
  console.log(`pass ${pass} fail ${fail}`);
})();
