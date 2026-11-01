// "When your flag [Reversal]" triggers (Godclock): #6050 Condrol, #6063 Radra Pando, #6141 Omega "Preverse"
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 12; i++) { flush(); await wait(15); } };
run(`ABX.fast=true; ABX.autoPlay=true;`);
const setup = (id, oppMon) => run(`(function(){
  const mon = ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill);
  battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(5957,'O',6065,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; battle.setPrompt=function(){};
  const me=battle.plr, op=battle.opp; me.gauge=me.deck.splice(0,5); me.life=10; me.hand=[]; me.drop=[];
  ['left','center','right'].forEach(p=>{me.monsters[p]=null; op.monsters[p]=null;});
  me.monsters.center={card:CARD_MAP.get(${id}),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
  ${oppMon ? `op.monsters.center={card:mon,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};` : ``}
  op.hand=[]; op.life=10; battle.turn='plr'; battle.activeSide='plr'; battle.turnCount=6; return 1; })()`);
(async () => {
  setup(6050, true);
  ok(J(`battle.plr.life`) === 10, "#6050 no life on enter-only setup");
  run(`battle.triggerOnFlagReversalFieldAbilities('plr')`); await tick();
  ok(J(`battle.opp.hand.length`) === 1 && J(`battle.plr.life`) === 12, "#6050 on Reversal returns opp card and gains 2");
  setup(6050, false); run(`battle.triggerOnFlagReversalFieldAbilities('plr')`); await tick();
  ok(J(`battle.plr.life`) === 10, "#6050 no target -> no life");
  setup(6063, true); run(`battle.triggerOnFlagReversalFieldAbilities('plr')`); await tick();
  ok(J(`!battle.opp.monsters.center`) && J(`battle.opp.life`) === 8, "#6063 destroys and deals 2 damage");
  setup(6063, false); run(`battle.triggerOnFlagReversalFieldAbilities('plr')`); await tick();
  ok(J(`battle.opp.life`) === 10, "#6063 no destroy -> no damage");
  setup(6141, false);
  const g = J(`battle.plr.gauge.length`), d = J(`battle.plr.deck.length`), dr = J(`battle.plr.drop.length`);
  run(`battle.triggerOnFlagReversalFieldAbilities('plr')`); await tick();
  ok(J(`battle.plr.gauge.length`) === g + 1 && J(`battle.plr.hand.length`) === 1 && J(`battle.plr.drop.length`) === dr + 1 && J(`battle.plr.deck.length`) === d - 3, "#6141 Preverse: gauge+1, hand+1, drop rest");
  run(`battle.triggerOnFlagReversalFieldAbilities('plr')`); await tick();
  ok(J(`battle.plr.hand.length`) === 1, "#6141 once per turn");
  console.log(`\npass ${passed} fail ${failed}`); process.exit(failed ? 1 : 0);
})();
