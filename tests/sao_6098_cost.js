// #6098 Starburst Stream: [Cast Cost] Pay 16 gauge, reduced by the number of times your cards attacked this turn
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(3337,"T",3338,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){};`);
for (const n of [0, 3, 5]) {
  run(`ABX.core.turnStats(battle.plr).attacks=${n}`);
  const g = J(`parseCardCost(CARD_MAP.get(6098).cost, CARD_MAP.get(6098).skill, battle.plr, CARD_MAP.get(6098)).gauge`);
  ok(g === 16 - n, `#6098 after ${n} attacks costs ${16 - n} gauge (got ${g})`);
}
console.log("fail", fail); process.exit(fail ? 1 : 0);
