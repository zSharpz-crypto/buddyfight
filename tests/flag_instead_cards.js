// "If your flag is X ..." cards: #5969 Lebla Maurice (Magic World), #5706 Ranma / #6563 Buddy Sky Day (Lost World)
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log("FAIL", n, JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 25; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const setup = (flag) => run(`{battle.start('hotseat', generateFlagDeck(${flag},'T',571,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}); battle.activeSide='plr'; battle.phase='main'; battle.turnCount=8; battle.plr.hand=[]; }`);
(async () => {
  await settle();
  // #5969: only with the Magic World flag
  setup(1); run(`battle.plr.buddyId=5969`);
  const nonThief = J(`[...CARD_MAP.values()].find(c=>c.type==='Monster'&&!(c.attrs||[]).includes('DragoPhantomThief')&&checkCardLegalityForFlag(c,CARD_MAP.get(1),false).allowed&&c.size===1).id`);
  run(`globalThis.__nt=CARD_MAP.get(${nonThief}); globalThis.__dt=CARD_MAP.get(5971);`);
  ck("#5969 + Magic World: non-Thief monster cannot be called", J(`evaluateCardConditions(__nt,battle.plr,battle.opp).met`) === false);
  ck("#5969 + Magic World: Thief monster can", J(`evaluateCardConditions(__dt,battle.plr,battle.opp).met`) !== false || J(`!evaluateCardConditions(__dt,battle.plr,battle.opp).reasons?.some?.(r=>/Sky Castle/.test(r))`));
  setup(447); run(`battle.plr.buddyId=5969`);
  const ok447 = J(`[...CARD_MAP.values()].find(c=>c.type==='Monster'&&c.size===1&&checkCardLegalityForFlag(c,CARD_MAP.get(447),false).allowed&&!evaluateCardConditions(c,battle.plr,battle.opp).reasons?.length).id`);
  ck("#5969 with another flag: no call restriction", ok447 > 0);
  // #6563: attack phase start, in the buddy's soul: Lost World -> into the drop zone (not destroyed)
  const lw = J(`[...CARD_MAP.values()].find(c=>c.type==='Flag'&&/^lost world/i.test(c.name)).id`);
  for (const [flag, expectDestroyed] of [[lw, false], [447, true]]) {
    setup(flag);
    run(`{const p=battle.plr,o=battle.opp; p.monsters.center=mk(CARD_MAP.get(46)); p.buddyId=p.monsters.center.card.id; p.monsters.center.soul=[6563]; o.monsters.center=mk(CARD_MAP.get(149)); o.drop=[]; o.deck=o.deck.slice(0,20);
      globalThis.__ab=ABX.core.abilitiesOf(CARD_MAP.get(6563),a=>a.trigger&&a.trigger.event==='phaseStart')[0]; battle.phase='attack'; ABX.fireTurnEvent('phaseStart','attack','plr'); }`);
    await settle();
    ck("#6563 flag " + flag + ": enemy card left the field", J(`!battle.opp.monsters.center`), J(`battle.opp.monsters.center&&1`));
    ck("#6563 flag " + flag + (expectDestroyed ? ": destroyed (drop)" : ": put into the drop zone"), J(`battle.opp.drop.includes(149)`));
  }
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
