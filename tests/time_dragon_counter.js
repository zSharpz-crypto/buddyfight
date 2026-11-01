// «Time Dragon» [Counter] spells (Godclock flag): cast conditions and the whole [Cast Cost] must be enforced when used as a defense.
//  - "You may only cast ... if a «Time Dragon» is on your field" (#6029 #6048 #6224) and "only when your opponent casts a spell" (#6162)
//  - [Pay 1 life] (#6003 #6004), [Drop a soul from a monster on your field] (#5951 #6168), [Put a hand card on the bottom of your deck] (#6190)
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 12; i++) { flush(); await wait(15); } };
run(`ABX.fast=true; ABX.autoPlay=true;`);
// opts: td ('center'|'left'|null), soul, rev, hand (array), life
const setup = (o) => run(`(function(){ const o=${JSON.stringify(o)};
  const mon = ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill);
  battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(5957,'O',6065,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; battle.setPrompt=function(){};
  const me=battle.opp; me.gauge=me.deck.splice(0,8); me.life=o.life||10; me.hand=o.hand.slice(); me.drop=me.deck.splice(0,6);
  me.godclock=me.godclock||{}; me.godclock.reversalCount=o.rev||0; me.godclock.awakened=(o.rev||0)>=3;
  ['left','center','right'].forEach(p=>me.monsters[p]=null);
  if (o.td) me.monsters[o.td]={card:CARD_MAP.get(6065),rested:false,attacksLeft:1,soul:o.soul?[46]:[],tempPower:0,tempDef:0,tempCrit:0};
  const att=battle.plr; att.life=10; ['left','center','right'].forEach(p=>att.monsters[p]=null); att.monsters.center={card:mon,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
  battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6; return 1; })()`);
const offered = (id) => J(`battle.getAvailableDefenseCards('opp',false,'fighter',[battle.plr.monsters.center]).some(x=>x.handIdx===0)`);
const use = async () => { run(`battle.applyDefensiveCounterCard('opp',0,'plr',['center'],'fighter')`); await tick(); };
(async () => {
  // cast conditions
  for (const id of [6029, 6048, 6224]) {
    setup({ hand: [id, 46], td: null, rev: 1 }); ok(!offered(id), `#${id} not offered without a «Time Dragon» on your field`);
    setup({ hand: [id, 46], td: "left", rev: 1 }); ok(offered(id), `#${id} offered with a «Time Dragon» on the left`);
  }
  setup({ hand: [6162, 46], td: "center", rev: 4 }); ok(!offered(6162), "#6162 Kronos Reverse is not an attack counter (only when the opponent casts a spell)");
  const r = await run(`(async()=>{ battle.activeSide='plr'; battle.phase='main'; return await ABX.castWindow('plr', CARD_MAP.get(8), 'spell'); })()`); await tick();
  ok(J(`!battle.opp.hand.includes(6162)`) && r === true, "#6162 still nullifies the opponent's spell in the spell window");
  // [Pay 1 life]: compare with a counter that costs no life (same attack damage)
  setup({ hand: [6047, 46], td: "center" }); await use(); const lifeCtl = J(`battle.opp.life`);
  setup({ hand: [6003, 46], td: "center" }); await use();
  ok(J(`battle.opp.life`) === lifeCtl - 1, `#6003 pays its 1 life (life ${J(`battle.opp.life`)} vs ${lifeCtl} without a life cost)`);
  setup({ hand: [6003, 46], td: "center", life: 1 }); ok(!offered(6003), "#6003 cannot be cast with 1 life");
  // [Drop a soul from a monster on your field]
  setup({ hand: [5951, 46], td: "center", soul: false }); ok(!offered(5951), "#5951 not offered when no monster has a soul");
  setup({ hand: [5951, 46], td: "center", soul: true, rev: 1 }); ok(offered(5951), "#5951 offered when a monster has a soul");
  const hand0 = J(`battle.opp.hand.length`); await use();
  ok(J(`battle.opp.monsters.center.soul.length`) === 0 && J(`battle.opp.hand.length`) === hand0 - 1, "#5951 dropped the soul (not a hand card)");
  setup({ hand: [6168, 46], td: "center", soul: true, rev: 1 }); await use();
  ok(J(`battle.opp.monsters.center.soul.length`) === 0, "#6168 dropped the soul");
  // [Put a hand card on the bottom of your deck]
  setup({ hand: [6190], td: "center", rev: 1 }); ok(!offered(6190), "#6190 not offered with no other hand card");
  setup({ hand: [6190, 6205], td: "center", rev: 1 }); ok(offered(6190), "#6190 offered with another hand card");
  const dc0 = J(`battle.opp.drop.filter(x=>x===6205).length`); await use();
  ok(J(`battle.opp.deck[battle.opp.deck.length-1]`) === 6205 && J(`!battle.opp.hand.includes(6205)`) && J(`battle.opp.drop.filter(x=>x===6205).length`) === dc0, "#6190 put the hand card on the bottom of the deck");
  console.log(`\npass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
