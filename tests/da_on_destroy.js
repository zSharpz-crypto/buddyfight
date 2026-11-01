// #3149 Chained Strikes Warlock, Rabukh: "When this card attacks and destroys your opponent's monster, for this turn,
// this card gets [Double Attack]."  Double Attack = 2 attacks per turn in total. The first attack was already spent,
// so after it destroys a monster the card must have exactly ONE attack left and must be standing (not rested).
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 8; i++) { flush(); await wait(15); } };
const ID = Number(process.argv[2] || 3149);
const setup = (kill) => run(`(function(){ ABX.fast=true; ABX.autoPlay=true;
  battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
  globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  const weak=ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill&&x.defense<=3000);
  const me=battle.plr, op=battle.opp; me.life=10; op.life=10; battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6;
  ['left','center','right'].forEach(p=>{me.monsters[p]=null; op.monsters[p]=null;}); op.item=null; op.item2=null;
  me.monsters.left=mk(CARD_MAP.get(${ID})); me.monsters.left.tempPower=${kill ? 90000 : 0};
  op.monsters.left=mk(weak); op.monsters.left.tempDef=${kill ? 0 : 999999}; op.monsters.center=mk(weak); return 1; })()`);
(async () => {
  setup(true);
  run(`battle.executeAttackResolution('plr',['left'],'left',false)`); await tick();
  ok(J(`!battle.opp.monsters.left`), "the attacked monster was destroyed");
  ok(J(`battle.plr.monsters.left.tempDA === true`), "it got [Double Attack] for this turn");
  ok(J(`battle.plr.monsters.left.attacksLeft`) === 1, "exactly one attack left (2 total), got " + J(`battle.plr.monsters.left.attacksLeft`));
  ok(J(`battle.plr.monsters.left.rested`) === false, "it is standing, so it can attack a second time");

  // the second attack really happens
  run(`battle.executeAttackResolution('plr',['left'],'center',false)`); await tick();
  ok(J(`!battle.opp.monsters.center`), "second attack destroyed the next monster");
  ok(J(`battle.plr.monsters.left.attacksLeft`) <= 0 && J(`battle.plr.monsters.left.rested`) === true, "after two attacks it is rested with 0 left (not 3 attacks)");

  // it does not destroy anything -> no Double Attack
  setup(false);
  run(`battle.executeAttackResolution('plr',['left'],'left',false)`); await tick();
  ok(J(`!!battle.opp.monsters.left && !battle.plr.monsters.left.tempDA && battle.plr.monsters.left.rested === true`), "no kill -> no [Double Attack], stays rested");
  console.log(`\npass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
