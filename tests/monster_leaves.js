// "When a monster leaves your field during your attack phase, draw a card. Once per turn." (#1381 Sneak Judgement)
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 12; i++) { flush(); await wait(15); } };
run(`ABX.fast=true; ABX.autoPlay=true;`);
const setup = (phase, active) => run(`(function(){
  const mon = ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill);
  battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(5957,'O',6065,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; battle.setPrompt=function(){};
  const me=battle.plr; me.hand=[]; ['left','center','right'].forEach(p=>{me.monsters[p]=null;});
  me.monsters.left={card:mon,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
  me.monsters.right={card:mon,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
  me.item={card:CARD_MAP.get(1381),rested:false,attacksLeft:1,soul:[]};
  battle.turn='plr'; battle.activeSide='${active}'; battle.phase='${phase}'; battle.turnCount=6; return 1; })()`);
const kill = async (pos) => { run(`battle.destroyMonster('plr','${pos}')`); await tick(); };
(async () => {
  setup("attack", "plr"); await kill("left");
  ok(J(`battle.plr.hand.length`) === 1, "monster leaves during your attack phase: draw 1");
  await kill("right");
  ok(J(`battle.plr.hand.length`) === 1, "only once per turn");
  setup("main", "plr"); await kill("left");
  ok(J(`battle.plr.hand.length`) === 0, "main phase: no draw");
  setup("attack", "opp"); await kill("left");
  ok(J(`battle.plr.hand.length`) === 0, "opponent's attack phase: no draw");
  console.log(`\npass ${passed} fail ${failed}`); process.exit(failed ? 1 : 0);
})();
