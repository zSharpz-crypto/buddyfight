// #867 Demonic Demise Dragon, Azi Dahaka: "When this card attacks, it attacks all of your opponent's monsters and your opponent instead.
// When this card deals damage to your opponent, destroy all items on your opponent's field."
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 8; i++) { flush(); await wait(15); } };
const setup = (oppItems, oppMonsters) => run(`(function(){ ABX.fast=true; ABX.autoPlay=true;
  battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
  globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  const weak=ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill&&x.defense<=3000);
  const me=battle.plr, op=battle.opp; me.life=10; op.life=10; battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6;
  me.monsters.center=mk(CARD_MAP.get(867)); me.monsters.center.tempPower=90000;
  ${oppMonsters ? "op.monsters.left=mk(weak); op.monsters.center=mk(weak); op.monsters.right=mk(weak);" : "op.monsters.center=mk(weak);"}
  ${oppItems ? "op.item=mk(ALL_CARDS.find(x=>x.type==='Item'));" : "op.item=null;"} op.item2=null; op.life=10; return 1; })()`);
(async () => {
  setup(true, true);
  run(`battle.executeAttackResolution('plr',['center'],'center',false)`); await tick();
  ok(J(`!battle.opp.monsters.left && !battle.opp.monsters.center && !battle.opp.monsters.right`), "attacks all opponent's monsters (all three destroyed)");
  ok(J(`battle.opp.life`) < 10, "and the opponent takes damage too (life " + J(`battle.opp.life`) + ")");
  ok(J(`!battle.opp.item`), "items destroyed when it deals damage");

  // attack nullified: no sweep, items stay
  setup(true, true);
  run(`battle.executeAttackResolution('plr',['center'],'center',true)`); await tick();
  ok(J(`!!battle.opp.item && !!battle.opp.monsters.left`), "a nullified attack destroys nothing (items stay)");

  // no damage to the opponent -> items stay (damage reduced to 0)
  setup(true, false);
  run(`battle.opp.tempDamageReduce=99; battle.executeAttackResolution('plr',['center'],'center',false)`); await tick();
  ok(J(`battle.opp.life`) === 10 && J(`!!battle.opp.item`), "no damage dealt -> items are not destroyed");
  console.log(`\npass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
