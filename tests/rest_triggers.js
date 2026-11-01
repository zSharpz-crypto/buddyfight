// "becomes [Rest]" triggers: #320 Yamigarasu / #321 Yoichi (monster in front), #5461 Anzu Futaba (this card)
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 12; i++) { flush(); await wait(15); } };
run(`ABX.fast=true; ABX.autoPlay=true;`);
const setup = (id) => { run(`(function(){
  const mon = ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill);
  battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(5957,'O',6065,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; battle.setPrompt=function(){};
  const me=battle.plr, op=battle.opp; ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null;});
  const mk=(c)=>({card:c,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  me.monsters.center=mk(CARD_MAP.get(${id})); op.monsters.center=mk(mon); op.monsters.left=mk(mon);
  me.life=10; op.life=10; op.hand=[mon.id,mon.id]; battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6; ABX.watchFighters(); return 1; })()`); };
(async () => {
  for (const id of [320, 321]) {
    setup(id); await tick();
    ok(J(`battle.opp.life`) === 10, `#${id} no damage on enter`);
    run(`battle.opp.monsters.left.rested=true; ABX.watchFighters()`); await tick();
    ok(J(`battle.opp.life`) === 10, `#${id} monster NOT in front rests: no damage`);
    run(`battle.opp.monsters.center.rested=true; ABX.watchFighters()`); await tick();
    ok(J(`battle.opp.life`) === 9, `#${id} monster in front rests: 1 damage`);
    run(`ABX.watchFighters()`); await tick();
    ok(J(`battle.opp.life`) === 9, `#${id} no repeat while it stays rested`);
  }
  setup(5461); await tick();
  ok(J(`battle.opp.life`) === 10 && J(`battle.opp.hand.length`) === 2, "#5461 nothing on enter");
  run(`battle.plr.monsters.center.rested=true; ABX.watchFighters()`); await tick();
  ok(J(`battle.opp.life`) === 9 && J(`battle.opp.hand.length`) === 1, "#5461 resting: 1 damage and opponent drops a hand card");
  console.log(`\npass ${passed} fail ${failed}`); process.exit(failed ? 1 : 0);
})();
