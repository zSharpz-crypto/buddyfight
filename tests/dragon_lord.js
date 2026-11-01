// «Dragon Lord» tribe cards: #2895 Felestas (enter: total of 8+ «Dragon Lord»/«Fairy» in drop -> 3 damage),
// #3312 (put two «Demon Lord» or «Dragon Lord» from drop on bottom of deck, then [Stand]), #417 (search size 3 «Dragon Lord»).
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 10; i++) { flush(); await wait(15); } };
const setup = () => run(`(function(){ ABX.fast=true; ABX.autoPlay=true;
  battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
  globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  const me=battle.plr, op=battle.opp; me.life=10; op.life=10; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=6;
  ['left','center','right'].forEach(p=>{me.monsters[p]=null; op.monsters[p]=null;}); me.drop=[];
  globalThis.DL=ALL_CARDS.filter(c=>(c.attrs||[]).some(a=>/^dragonlord$/i.test(a))&&c.type==='Monster').map(c=>c.id);
  globalThis.NON=ALL_CARDS.find(c=>c.type==='Monster'&&!(c.attrs||[]).some(a=>/dragonlord|fairy/i.test(a))).id; return DL.length; })()`);
(async () => {
  // #2895
  setup();
  run(`battle.plr.drop=DL.slice(0,7).concat([NON]); battle.plr.monsters.left=mk(CARD_MAP.get(2895)); ABX.fireEnter('plr', CARD_MAP.get(2895), battle.plr.monsters.left)`); await tick();
  ok(J(`battle.opp.life`) === 10, "#2895 with only 7 Dragon Lord/Fairy in drop: no damage (life " + J(`battle.opp.life`) + ")");
  setup();
  run(`battle.plr.drop=DL.slice(0,8); battle.plr.monsters.left=mk(CARD_MAP.get(2895)); ABX.fireEnter('plr', CARD_MAP.get(2895), battle.plr.monsters.left)`); await tick();
  ok(J(`battle.opp.life`) === 7, "#2895 with 8 in drop: exactly 3 damage, not 6 (life " + J(`battle.opp.life`) + ")");
  setup();
  run(`battle.plr.drop=DL.slice(0,4).concat(ALL_CARDS.filter(c=>(c.attrs||[]).some(a=>/fairy/i.test(a))).slice(0,4).map(c=>c.id)); battle.plr.monsters.left=mk(CARD_MAP.get(2895)); ABX.fireEnter('plr', CARD_MAP.get(2895), battle.plr.monsters.left)`); await tick();
  ok(J(`battle.opp.life`) === 7, "#2895 4 Dragon Lord + 4 Fairy count together (total 8): 3 damage (life " + J(`battle.opp.life`) + ")");
  console.log(`\npass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
