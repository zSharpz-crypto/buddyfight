// Opus review claims (docs/BUGS.md): #3441 Soul Reset, #3737 Gravity Rest, #4019 Arabone, #3850-#3852 Mini Geargod
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 8; i++) { flush(); await wait(12); } };
const reset = `(function(){ ABX.fast=true; ABX.autoPlay=true; battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
  globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  globalThis.weak=ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill&&x.defense<=3000);
  const me=battle.plr, op=battle.opp; me.gauge=me.deck.splice(0,6); me.life=10; me.hand=me.deck.splice(0,3); op.life=10; battle.turn='plr'; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=6; return 1; })()`;
(async () => {
  // #3441: souls of ONE card go to the drop zone, then draw 1 if any was put
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.left=mk(weak); me.monsters.center=mk(weak); me.monsters.right=mk(weak);
    const a=mk(weak), b=mk(weak); a.soul=[ALL_CARDS[10].id,ALL_CARDS[11].id,ALL_CARDS[12].id]; b.soul=[ALL_CARDS[20].id,ALL_CARDS[21].id]; op.monsters.left=a; op.monsters.center=b; op.drop=[]; me.hand=[3441]; globalThis.__h=me.hand.length; globalThis.__dk=me.deck.length; return 1; })()`);
  run(`ABX.fireSpell('plr', CARD_MAP.get(3441))`); await tick();
  const left = J(`(battle.opp.monsters.left.soul.length) + ',' + (battle.opp.monsters.center.soul.length)`);
  ok(left === "0,2" || left === "3,0", "only ONE card loses its souls (left,center = " + left + ")");
  ok(J(`battle.plr.deck.length`) === J(`__dk`) - 1, "drew a card because souls were put");
  // castable only with 3+ monsters
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.left=mk(weak); me.monsters.center=mk(weak); op.monsters.center=mk(weak); op.monsters.center.soul=[ALL_CARDS[10].id]; return 1; })()`);
  ok(J(`evaluateCardConditions(CARD_MAP.get(3441), battle.plr, battle.opp).met`) === false, "#3441 cannot be cast with only 2 monsters on your field");

  // #3737 Gravity Rest: "that monster" (the one that entered) is rested
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.center=mk(CARD_MAP.get(3737)); me.hand=[weak.id,weak.id]; globalThis.__g0=me.gauge.length; return 1; })()`);
  run(`(function(){ const op=battle.opp; op.monsters.left=mk(weak); op.monsters.center=mk(weak); const entered=mk(weak); op.monsters.right=entered; globalThis.__entered=entered;
    ABX.fireOtherEnter('opp', entered); return 1; })()`);
  await tick();
  ok(J(`__entered.rested`) === true && J(`!battle.opp.monsters.left.rested && !battle.opp.monsters.center.rested`), "#3737 rested exactly the monster that entered");
  ok(J(`battle.plr.gauge.length`) === J(`__g0`) - 1 && J(`battle.plr.hand.length`) === 1, "#3737 paid 1 gauge and discarded 1 card");

  // #4019 Arabone: nullify the abilities of a card and destroy THAT card, only during the opponent's attack phase
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.center=mk(CARD_MAP.get(4019)); op.monsters.left=mk(weak); op.monsters.center=mk(weak); globalThis.__l=op.monsters.left; globalThis.__c=op.monsters.center;
    battle.turn='opp'; battle.activeSide='opp'; battle.phase='attack'; return 1; })()`);
  const ab = J(`ABX.actAbilities(CARD_MAP.get(4019)).filter(a=>(a.tags||[]).includes('kw:overkill')).length`);
  ok(ab === 1, "#4019 Overkill is an [Act]");
  run(`ABX.useAct('plr',CARD_MAP.get(4019),battle.plr.monsters.center)`); await tick();
  ok(J(`(!!battle.opp.monsters.left) !== (!!battle.opp.monsters.center)`), "exactly one opponent card was destroyed");
  ok(J(`battle.plr.gauge.length`) === 5 && J(`battle.plr.hand.length`) === 2, "paid 1 gauge and discarded a card");
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.center=mk(CARD_MAP.get(4019)); op.monsters.center=mk(weak); return 1; })()`);
  ok(J(`ABX.canUseAct('plr',CARD_MAP.get(4019),ABX.actAbilities(CARD_MAP.get(4019)).find(a=>(a.tags||[]).includes('kw:overkill')),battle.plr.monsters.center).ok`) === false, "#4019 not usable on your own turn");

  // #3850 / #3852: pay 1 gauge + drop self => destroy the chosen card; no payment => nothing
  for (const [id, kind] of [[3850, "set"], [3852, "item"]]) {
    run(reset);
    run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.center=mk(CARD_MAP.get(${id})); op.monsters.left=mk(weak);
      ${kind === "item" ? "op.item=mk(ALL_CARDS.find(x=>x.type==='Item'));" : "op.setSpells=[ALL_CARDS.find(x=>x.type==='Spell'&&(x.skill||'').includes('[Set]'))];"} return 1; })()`);
    run(`ABX.useAct('plr',CARD_MAP.get(${id}),battle.plr.monsters.center)`); await tick();
    const gone = kind === "item" ? J(`!battle.opp.item`) : J(`battle.opp.setSpells.length===0`);
    ok(gone && J(`!battle.plr.monsters.center`) && J(`battle.plr.drop.includes(${id})`), `#${id} dropped itself and destroyed the chosen ${kind} card`);
    ok(J(`!!battle.opp.monsters.left`), `#${id} did not touch the opponent's monster`);
  }
  // #3851 Mini Geargod Blue: when the opponent's monsters attack, pay 1 gauge + drop itself -> destroy the attacking monster
  run(reset);
  run(`(function(){ const me=battle.plr, op=battle.opp; me.monsters.left=mk(CARD_MAP.get(3851)); op.monsters.center=mk(weak); battle.turn='opp'; battle.activeSide='opp'; battle.phase='attack'; globalThis.__att=op.monsters.center; return 1; })()`);
  run(`battle.executeAttackResolution('opp',['center'],'center',false)`); await tick();
  ok(J(`!battle.opp.monsters.center`) && J(`!battle.plr.monsters.left`) && J(`battle.plr.drop.includes(3851)`) && J(`battle.plr.gauge.length`) === 5, "#3851 destroyed the attacking monster for 1 gauge and itself");
  // #4114: size reduced by 3 with another originally-size-3 Skull Warrior OR Hundred Demons on your field
  const sk = J(`ALL_CARDS.find(c=>c.type==='Monster'&&c.size===3&&(c.attrs||[]).includes('SkullWarrior')&&!(c.attrs||[]).includes('HundredDemons')).id`);
  const hd = J(`ALL_CARDS.find(c=>c.type==='Monster'&&c.size===3&&(c.attrs||[]).includes('HundredDemons')&&!(c.attrs||[]).includes('SkullWarrior')&&c.id!==4114).id`);
  for (const [label, other] of [["none", null], ["a Skull Warrior", sk], ["a Hundred Demons", hd]]) {
    run(reset);
    run(`(function(){ const me=battle.plr; me.monsters.center=mk(CARD_MAP.get(4114)); ${other ? `me.monsters.left=mk(CARD_MAP.get(${other}));` : ""} return 1; })()`);
    const size = J(`getEffectiveCardSize(battle.plr, CARD_MAP.get(4114), battle.plr.monsters.center)`);
    ok(other ? size === 0 : size === 3, `#4114 with ${label} on the field: size ${size}`);
  }
  // #1448 Burn Nova: called from the hand only when your life would become 0 on the opponent's turn
  run(reset);
  run(`(function(){ const me=battle.plr; me.hand=[1448]; me.life=2; return 1; })()`);
  ok(J(`evaluateCardConditions(CARD_MAP.get(1448), battle.plr, battle.opp).met`) === false, "#1448 cannot be called from the hand in the main phase");
  run(`battle.turn='opp'; battle.activeSide='opp'; battle.phase='attack'; battle.plr.life=0; battle.checkWinCondition();`); await tick();
  ok(J(`battle.plr.life`) === 1 && !J(`battle.matchOver`) && J(`battle.plr.gauge.length`) === 3 && J(`battle.plr.hand.length`) === 0, "#1448 saved you: life 1, 3 gauge paid, called from hand");
  ok(J(`!!battle.plr.monsters.center || !!battle.plr.monsters.right || !!battle.plr.monsters.left`), "#1448 is on the field");
  // on your own turn it does nothing
  run(reset);
  run(`(function(){ const me=battle.plr; me.hand=[1448]; me.life=0; return 1; })()`);
  run(`battle.checkWinCondition();`); await tick();
  ok(J(`battle.matchOver`) === true, "on your own turn your life reaching 0 still loses");
  console.log(`\npass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
