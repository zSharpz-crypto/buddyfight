// Godpunk tribe review (attr "Godpunk", Danger World). Every check is verified against the card text.
//   node tests/godpunk.js
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; } battle.plr.gauge=[1,2,3,4,5,6,7,8]; battle.plr.deck=Array(30).fill(46); battle.opp.gauge=[1,2,3,4,5,6]; battle.opp.deck=Array(30).fill(46); battle.matchOver=false; battle.activeSide="plr"; };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const THRASHER = 4385, S1 = 4389, S2 = 4411, S3 = 4383, S0 = 4413, PLAIN1 = 45, PLAIN2 = null;
const place = (pos, id) => run(`battle.plr.monsters.${pos}=mku(${id})`);
const stats = (pos) => J(`getUnitEffectiveCombatStats(battle.plr, battle.plr.monsters.${pos})`);
const castable = (id) => J(`evaluateCardConditions(CARD_MAP.get(${id}), battle.plr, battle.opp).met`);
const spell = async (id) => { run(`{ const c=CARD_MAP.get(${id}); const ab=ABX.get(c).abilities.find(a=>a.kind==='spell'||a.kind==='modal'); ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'cast'}}); }`); await settle(); };
const enter = async (id, pos) => { run(`ABX.fireEnter('plr', CARD_MAP.get(${id}), battle.plr.monsters.${pos})`); await settle(); };
(async () => {
  // ---- Cast rules: "if you have a «Godpunk» on your field" ----
  for (const id of [4386, 4427, 4977, 5769, 4414]) {
    run(`clear(); battle.opp.life=5`);
    ok(castable(id) === false, `#${id} not castable with no Godpunk on the field`);
    run(`clear(); battle.opp.life=5`); place("center", PLAIN1);
    ok(castable(id) === false, `#${id} not castable with only a non-Godpunk monster`);
    run(`clear(); battle.opp.life=5`); place("center", S1);
    ok(castable(id) === true, `#${id} castable with a Godpunk monster on the field`);
  }
  // 4386 / 4427 say «Godpunk» (any card), 4977 / 5769 say «Godpunk» monster. A Godpunk item still counts for 4386, 4427, 4414.
  run(`clear(); battle.opp.life=5; battle.plr.item=mku(4388)`);
  ok(castable(4386) === true, "#4386 a Godpunk item alone satisfies «Godpunk»");
  ok(castable(4977) === false, "#4977 a Godpunk item alone does NOT satisfy «Godpunk» monster");
  run(`clear(); battle.opp.life=6`); place("center", S1);
  ok(castable(4414) === false, "#4414 not castable when opponent life is 6");

  // ---- 4388 Skybad Jacket: all Godpunk monsters +4000 and [Move] (non-Godpunk unchanged) ----
  run(`clear(); battle.plr.item=mku(4388)`); place("left", S1); place("center", PLAIN1);
  const base = J(`CARD_MAP.get(${S1}).power`), basePlain = J(`CARD_MAP.get(${PLAIN1}).power`);
  ok(stats("left").power === base + 4000, `#4388 Godpunk +4000 (${stats("left").power} vs ${base})`);
  const mv = (pos) => J(`canUseMove("plr", battle.plr.monsters.${pos})`);
  ok(mv("left") === true, "#4388 Godpunk gets [Move]");
  ok(stats("center").power === basePlain && mv("center") === false, "#4388 non-Godpunk unchanged (no [Move])");

  // ---- 5102 Almighty Group!: all Godpunk on your field get power+3000 (this turn) ----
  run(`clear()`); place("left", S1); place("center", PLAIN1);
  await spell(5102);
  ok(stats("left").power === base + 3000, `#5102 Godpunk +3000 (${stats("left").power})`);
  ok(stats("center").power === basePlain, "#5102 non-Godpunk unchanged");

  // ---- 6379 Hermes Bat ----
  run(`clear(); battle.plr.item=mku(6379)`); place("left", S1); place("center", S3); place("right", PLAIN1);
  const sz = (pos) => J(`getEffectiveCardSize(battle.plr, battle.plr.monsters.${pos}.card, battle.plr.monsters.${pos})`);
  ok(sz("left") === 0, `#6379 originally size 1 Godpunk -> size 0 (${sz("left")})`);
  ok(sz("center") === 3, `#6379 originally size 3 Godpunk unchanged (${sz("center")})`);
  ok(sz("right") === 1, `#6379 non-Godpunk unchanged (${sz("right")})`);
  run(`clear(); battle.plr.item=mku(6379)`); place("left", S2);
  ok(sz("left") === 0, `#6379 originally size 2 Godpunk -> size 0, never below 0 (${sz("left")})`);
  // can attack even if a Godpunk is on the center (it normally cannot attack with a monster in the center)
  run(`clear(); battle.plr.item=mku(6379)`); place("center", S1);
  ok(J(`!!ABX.canAttackThrough("plr", battle.plr.item, "own")`) === true, "#6379 item can attack with a Godpunk in the center");
  run(`clear(); battle.plr.item=mku(6379)`); place("center", PLAIN1);
  ok(J(`!!ABX.canAttackThrough("plr", battle.plr.item, "own")`) === false, "#6379 item cannot attack through a non-Godpunk center");

  // ---- 4385 Thrasher: draw only with another Godpunk on the field ----
  run(`clear(); battle.plr.hand=[]`); place("center", THRASHER); await enter(THRASHER, "center");
  ok(J(`battle.plr.hand.length`) === 0, "#4385 alone: no draw");
  run(`clear(); battle.plr.hand=[]`); place("left", S1); place("center", THRASHER); await enter(THRASHER, "center");
  ok(J(`battle.plr.hand.length`) === 1, `#4385 with another Godpunk: draws 1 (${J(`battle.plr.hand.length`)})`);
  run(`clear(); battle.plr.hand=[]`); place("left", PLAIN1); place("center", THRASHER); await enter(THRASHER, "center");
  ok(J(`battle.plr.hand.length`) === 0, "#4385 with a non-Godpunk: no draw");

  // ---- 4406 All is Mine!: one Godpunk monster OR item from deck to hand ----
  run(`clear(); battle.plr.hand=[]; battle.plr.deck=[PLAIN=45,${S1},4388,45,4381]`);
  await spell(4406);
  const hand = J(`battle.plr.hand.map(c=>typeof c==='object'?c.id:c)`);
  ok(hand.length === 1 && [S1, 4388, 4381].includes(hand[0]), `#4406 added one Godpunk monster/item (${JSON.stringify(hand)})`);

  // ---- 6378 Strongest Legend Topfist: two Godpunk with different sizes from drop -> called ----
  run(`clear(); battle.plr.drop=[${S1},${S2},${S1},45]; battle.plr.gauge=[1,2,3,4,5,6,7,8]`);
  await spell(6378);
  const called = J(`["left","center","right"].map(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id).filter(Boolean)`);
  ok(called.length === 2 && called.includes(S1) && called.includes(S2), `#6378 called size 1 and size 2 Godpunk (${JSON.stringify(called)})`);
  run(`clear(); battle.plr.drop=[${S1},${S1},45]`);
  await spell(6378);
  ok(J(`["left","center","right"].filter(p=>battle.plr.monsters[p]).length`) <= 1, "#6378 two same-size Godpunk are not both called");

  // ---- 4410 Bonesplitter: return ALL opp gauge to their deck, shuffle, top 2 -> gauge; gain 2 only if any gauge was returned ----
  run(`clear(); battle.opp.gauge=[1,2,3,4,5,6,7,8]; battle.opp.deck=Array(20).fill(47); battle.plr.life=10`); place("center", 4410); await enter(4410, "center");
  ok(J(`[battle.opp.gauge.length, battle.opp.deck.length, battle.plr.life]`).join() === "2,26,12", `#4410 opp had 8 gauge -> 2 gauge / deck 26 / you gain 2 (${J(`[battle.opp.gauge.length, battle.opp.deck.length, battle.plr.life]`)})`);
  run(`clear(); battle.opp.gauge=[]; battle.opp.deck=Array(20).fill(47); battle.plr.life=10`); place("center", 4410); await enter(4410, "center");
  ok(J(`[battle.opp.gauge.length, battle.plr.life]`).join() === "2,10", `#4410 opp had 0 gauge -> 2 gauge, NO life gain (${J(`[battle.opp.gauge.length, battle.plr.life]`)})`);

  // ---- 4414: 2 damage; if the opponent has no gauge, 5 damage INSTEAD ----
  const impact = async () => { run(`{const c=CARD_MAP.get(4414); const ab=ABX.get(c).abilities.find(a=>a.kind==='spell'); ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'cast'}});}`); await settle(); };
  run(`clear(); battle.opp.life=5; battle.opp.gauge=[9,9,9]`); await impact();
  ok(J(`battle.opp.life`) === 3, `#4414 opp has gauge -> exactly 2 damage (life ${J(`battle.opp.life`)})`);
  run(`clear(); battle.opp.life=9; battle.opp.gauge=[]`); await impact();
  ok(J(`battle.opp.life`) === 4, `#4414 opp has no gauge -> exactly 5 damage, not 7 (life ${J(`battle.opp.life`)})`);

  // ---- 4387 / 6379 equip: Godpunk from drop into soul, opp pays 1 gauge, NO extra deck card in the soul ----
  for (const id of [4387, 6379]) {
    run(`clear(); battle.plr.hand=[${id}]; battle.plr.drop=[4385,4389]; globalThis.__og=battle.opp.gauge.length; globalThis.__dk=battle.plr.deck.length`);
    run(`battle.equipCardFromHand('plr',0,'Equip')`); await settle();
    const r = J(`({item:battle.plr.item&&battle.plr.item.card.id, soul:battle.plr.item&&battle.plr.item.soul.map(x=>typeof x==='object'?x.id:x), og:battle.opp.gauge.length-__og, dk:battle.plr.deck.length-__dk})`);
    ok(r.item === id && r.soul.length === 1 && r.soul[0] === 4385, `#${id} equip: soul is only the Godpunk from the drop zone (${JSON.stringify(r.soul)})`);
    ok(r.og === -1, `#${id} equip: opponent pays 1 gauge (${r.og})`);
    ok(r.dk === 0, `#${id} equip: no card taken from your deck (${r.dk})`);
  }

  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
  process.exit(fail ? 1 : 0);
})();
