// Unbuilt-class batch: call restrictions, "& 1 life" costs, conditional "pay another", soul-from-zone cost variants.
const { createEnv } = require("./headless.js");
const { run } = createEnv();
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m); } };
run(`battle.start('bot', generateFlagDeck(447,'A',1,true), generateFlagDeck(447,'B',2,true));`);
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
// call restrictions: blocked from hand, allowed via effect
[950, 2107, 2108, 2136, 2569, 2601, 2641, 3183, 3826, 4971, 5870, 5872, 5873, 4873, 4885].forEach(id => {
  const a = J(`evaluateCardConditions(CARD_MAP.get(${id}),battle.plr,battle.opp).met`), b = J(`evaluateCardConditions(CARD_MAP.get(${id}),battle.plr,battle.opp,true).met`);
  ok(a === false, id + " blocked from hand");
  if (![4971, 5870, 5872, 5873].includes(id)) ok(b !== false || id === 4873 || id === 4885, id + " allowed by effect");
});
ok(J(`evaluateCardConditions(CARD_MAP.get(2790),battle.plr,battle.opp).met`) === false, "2790 needs Dragon Drei");
run(`battle.plr.world="Dragon Drei"`);
ok(J(`evaluateCardConditions(CARD_MAP.get(2790),battle.plr,battle.opp).met`) !== false, "2790 with Drei");
// life in costs
[127, 1869, 4711, 4926].forEach(id => ok(J(`parseCardCost(CARD_MAP.get(${id}).cost,CARD_MAP.get(${id}).skill,battle.plr,CARD_MAP.get(${id})).life`) >= 1, id + " pays life"));
// conditional pay another
ok(J(`parseCardCost(CARD_MAP.get(211).cost,CARD_MAP.get(211).skill,battle.plr,CARD_MAP.get(211)).gauge`) === 7, "211 pays 7 without Demon Lord");
ok(J(`parseCardCost(CARD_MAP.get(454).cost,CARD_MAP.get(454).skill,battle.plr,CARD_MAP.get(454)).life`) === 2, "454 pays 2 life without Drum");
// soul-from-zone cost variants are now real extra costs
[2300, 2690, 4158, 4805, 5846, 2691, 835, 604, 660, 650, 665, 1221, 1492].forEach(id => ok(J(`ABX.hasExtras(CARD_MAP.get(${id}))`) === true, id + " has soul extra cost"));
console.log("pass", pass, "fail", fail);
// ---- round 2: field/all/return/drop-hand cost parts ----
[1121, 3175, 1197, 2466, 4762].forEach(id => ok(J(`ABX.hasExtras(CARD_MAP.get(${id}))`) === true, id + " has extra cost"));
ok(J(`parseCardCost(CARD_MAP.get(4962).cost,CARD_MAP.get(4962).skill,battle.plr,CARD_MAP.get(4962)).gauge`) === 2, "4962 pays 2 gauge");
// 2466: needs three Dragonarms in drop; pays by returning them to the deck
const dacIds = J(`ALL_CARDS.filter(c=>(c.attrs||[]).some(a=>/dragonarms/i.test(a))).slice(0,3).map(c=>c.id)`);
run(`battle.plr.drop=[]; `); ok(J(`ABX.canPayExtras('plr',CARD_MAP.get(2466),-1)`) === false, "2466 cannot pay with empty drop");
run(`battle.plr.drop=${JSON.stringify(dacIds)}; globalThis.__d0=battle.plr.deck.length;`);
ok(J(`ABX.canPayExtras('plr',CARD_MAP.get(2466),-1)`) === true, "2466 can pay with 3 Dragonarms");
(async () => {
  await run(`ABX.payExtras('plr',CARD_MAP.get(2466),null)`);
  ok(J(`battle.plr.drop.length`) === 0 && J(`battle.plr.deck.length - __d0`) === 3, "2466 returned 3 to deck");
  // 4762: drop whole hand
  run(`battle.plr.hand=[${dacIds.join(",")}]; battle.plr.drop=[]`);
  await run(`ABX.payExtras('plr',CARD_MAP.get(4762),null)`);
  ok(J(`battle.plr.hand.length`) === 0 && J(`battle.plr.drop.length`) === 3, "4762 dropped hand");
  console.log("pass", pass, "fail", fail);
})();
(async () => {
  const pd = J(`ALL_CARDS.find(c=>c.type==="Monster"&&(c.attrs||[]).some(a=>/prismdragon/i.test(a))).id`);
  run(`(function(){const f=battle.plr; f.monsters.left=null;f.monsters.center=null;f.monsters.right=null; f.monsters.left={card:CARD_MAP.get(${pd}),soul:[]};})()`);
  const has = J(`!!battle.plr.monsters.left`);
  if (has) {
    run(`globalThis.__u={card:CARD_MAP.get(3175),soul:[]}`);
    await run(`ABX.payExtras('plr',CARD_MAP.get(3175),__u)`);
    ok(J(`__u.soul.length`) === 1 && !J(`battle.plr.monsters.left`), "3175 put Prism Dragon from field into soul");
  } else ok(false, "fixture");
  console.log("pass", pass, "fail", fail);
})();
