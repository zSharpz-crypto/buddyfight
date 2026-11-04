// Godpunk tribe review part 2: call costs, attack-outcome ("Plunder") abilities, counters, Set spell. Checked against the card text.
//   node tests/godpunk2.js
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; f.maxSize=99; f.callLimitUsed={}; } battle.plr.gauge=[1,2,3,4,5,6,7,8]; battle.plr.deck=Array.from({length:30},(_,i)=>3000+i); battle.opp.gauge=[1,2,3,4,5,6]; battle.opp.deck=Array(30).fill(47); battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; battle.turnCount++; };`);
const settle = async () => { for (let i = 0; i < 50; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const callFromHand = async (id) => { run(`battle.plr.hand=[${id}]`); run(`battle.completeMonsterCall('plr','center',0,false)`); await settle(); };
const outcome = async (id, oc) => { run(`globalThis.__u=battle.plr.monsters.center`); run(`ABX.fireAttackOutcome('plr',[{unit:__u}],'opp',${JSON.stringify(oc)})`); await settle(); };
const onField = () => J(`battle.plr.monsters.center&&battle.plr.monsters.center.card.id`);
(async () => {
  // ---- [Call Cost]s ----
  run(`clear(); battle.opp.monsters.left=mku(45); globalThis.__og=battle.opp.gauge.length; globalThis.__ol=battle.opp.life; globalThis.__od=battle.opp.drop.length`);
  await callFromHand(4381);
  ok(onField() === 4381, "#4381 is called");
  ok(J(`!battle.opp.monsters.left && battle.opp.drop.filter(id=>id===45).length===1`), "#4381 a card from the opponent's field goes to their drop zone");
  ok(J(`battle.opp.gauge.length`) === J(`__og`) - 1, `#4381 opponent pays 1 gauge (${J(`battle.opp.gauge.length - __og`)})`);
  ok(J(`battle.opp.life`) === J(`__ol`) - 1, `#4381 opponent pays 1 life (${J(`battle.opp.life - __ol`)})`);

  run(`clear(); globalThis.__og=battle.opp.gauge.length; globalThis.__dk=battle.plr.deck.length`);
  await callFromHand(4383);
  const s83 = J(`battle.plr.monsters.center&&battle.plr.monsters.center.soul.map(x=>typeof x==='object'?x.id:x)`);
  ok(onField() === 4383 && s83.length === 1 && s83[0] === 3000, `#4383 called with exactly 1 soul = top of your deck (${JSON.stringify(s83)})`);
  ok(J(`battle.opp.gauge.length`) === J(`__og`) - 1, "#4383 opponent pays 1 gauge");

  run(`clear(); globalThis.__og=battle.opp.gauge.length`);
  await callFromHand(5771);
  const s71 = J(`battle.plr.monsters.center&&battle.plr.monsters.center.soul.length`);
  ok(onField() === 5771 && s71 === 1, `#5771 called with exactly 1 soul (${s71})`);
  ok(J(`battle.opp.gauge.length`) === J(`__og`) - 2, `#5771 opponent pays 2 gauge (${J(`battle.opp.gauge.length - __og`)})`);
  run(`clear(); battle.opp.gauge=[1]`);
  run(`battle.plr.hand=[5771]`);
  ok(J(`evaluateCardConditions(CARD_MAP.get(5771), battle.plr, battle.opp).met`) === false || J(`!ABX.canPayExtras || ABX.canPayExtras('plr', CARD_MAP.get(5771))`) === false, "#5771 cannot be called when the opponent has only 1 gauge");

  run(`clear(); battle.plr.monsters.left=mku(45); battle.opp.monsters.left=mku(45); battle.opp.monsters.right=mku(45)`);
  await callFromHand(6380);
  const others = J(`["left","right"].filter(p=>battle.plr.monsters[p]).length + ["left","center","right"].filter(p=>battle.opp.monsters[p]).length`);
  ok(onField() === 6380 && others === 1, `#6380 puts exactly two cards in total from the two fields into the drop zone (3 -> ${others} left)`);

  // #6380 may take cards from EITHER field: 1 of yours + 1 of theirs is enough; 2 of yours is enough; 1 card in total is not
  for (const [mine, theirs, canCall] of [[1, 1, true], [2, 0, true], [0, 2, true], [1, 0, false], [0, 1, false]]) {
    run(`clear(); ["left","center"].slice(0,${mine}).forEach(p=>battle.plr.monsters[p]=mku(45)); ["left","center"].slice(0,${theirs}).forEach(p=>battle.opp.monsters[p]=mku(45)); battle.plr.hand=[6380]`);
    run(`battle.completeMonsterCall('plr','right',0,false)`); await settle();
    const called = J(`!!battle.plr.monsters.right && battle.plr.monsters.right.card.id===6380`);
    const left = J(`["left","center"].filter(p=>battle.plr.monsters[p]).length + ["left","center"].filter(p=>battle.opp.monsters[p]).length`);
    ok(called === canCall && (!canCall || left === mine + theirs - 2), `#6380 with ${mine} of your cards and ${theirs} of theirs -> ${canCall ? "called, two dropped" : "refused"} (called ${called}, field cards left ${left})`);
  }

  // ---- "Plunder": When this card attacks and destroys monsters or deals damage ----
  const plr = (id) => run(`clear(); battle.plr.monsters.center=mku(${id}); battle.plr.hand=[]; battle.plr.deck=Array.from({length:30},(_,i)=>3000+i)`);
  plr(4408); await outcome(4408, { destroyedMonster: true });
  ok(J(`battle.plr.life`) === 11, `#4408 destroyed a monster -> gain 1 life (${J(`battle.plr.life`)})`);
  plr(4408); await outcome(4408, { dealtDamage: true });
  ok(J(`battle.plr.life`) === 11, `#4408 dealt damage -> gain 1 life (${J(`battle.plr.life`)})`);
  plr(4408); await outcome(4408, {});
  ok(J(`battle.plr.life`) === 10, "#4408 neither destroyed nor dealt damage -> nothing");

  plr(4407); run(`globalThis.__og=battle.opp.gauge.length`); await outcome(4407, { dealtDamage: true });
  ok(J(`__og - battle.opp.gauge.length`) === 1, "#4407 drops 1 of the opponent's gauge");

  plr(4413); run(`battle.opp.hand=[46,46]; globalThis.__og=battle.opp.gauge.length`); await outcome(4413, { dealtDamage: true });
  ok(J(`__og - battle.opp.gauge.length`) === 1 && J(`battle.opp.hand.length`) === 2, `#4413 opponent has gauge -> drops 1 gauge, NO hand drop (hand ${J(`battle.opp.hand.length`)})`);
  plr(4413); run(`battle.opp.hand=[46,46]; battle.opp.gauge=[]`); await outcome(4413, { dealtDamage: true });
  ok(J(`battle.opp.hand.length`) === 1, `#4413 opponent has no gauge ("If not") -> they drop a hand card (hand ${J(`battle.opp.hand.length`)})`);

  plr(4381); run(`battle.opp.life=10`); await outcome(4381, { dealtDamage: true });
  ok(J(`battle.opp.life`) === 8 && J(`battle.plr.life`) === 12, `#4381 Plunder: 2 damage and +2 life (opp ${J(`battle.opp.life`)}, you ${J(`battle.plr.life`)})`);

  plr(6380); run(`battle.opp.hand=[46,46]; globalThis.__og=battle.opp.gauge.length; globalThis.__h=battle.plr.hand.length`); await outcome(6380, { dealtDamage: true });
  ok(J(`battle.opp.hand.length`) === 1 && J(`battle.opp.gauge.length - __og`) === 1, `#6380 Plunder: opponent puts 1 hand card into gauge (hand ${J(`battle.opp.hand.length`)}, gauge +${J(`battle.opp.gauge.length - __og`)})`);
  ok(J(`battle.plr.hand.length - __h`) === 1, `#6380 Plunder: you draw exactly 1 card (${J(`battle.plr.hand.length - __h`)})`);
  plr(6380); run(`battle.opp.hand=[]; globalThis.__h=battle.plr.hand.length`); await outcome(6380, { dealtDamage: true });
  ok(J(`battle.plr.hand.length - __h`) === 0, `#6380 Plunder with an empty opponent hand ("If put"): no draw (${J(`battle.plr.hand.length - __h`)})`);

  // ---- #5771: when the number of cards in the opponent's hand increases (by an ability), they drop a hand card. Once per turn; not during the opponent's start phase ----
  const oppDraw = async () => { run(`{const c=CARD_MAP.get(45); const ab={kind:"spell",tags:[],conds:[],steps:[{op:"draw",who:"opp",n:1}],raw:"x",cleaned:"x",idx:0,cardId:45}; ABX.core.runAbility('plr',c,ab,null,{auto:true,preApproved:true,event:{name:"cast"}});}`); await settle(); };
  run(`clear(); battle.plr.monsters.center=mku(5771); battle.opp.hand=[46,46]; battle.opp.deck=Array(30).fill(46); battle.activeSide='plr'; battle.phase='main'`);
  await oppDraw();
  ok(J(`battle.opp.hand.length`) === 2, `#5771 opponent's hand grows 2 -> 3, they drop 1 (hand ${J(`battle.opp.hand.length`)})`);
  await oppDraw();
  ok(J(`battle.opp.hand.length`) === 3, `#5771 only once per turn: the second increase is kept (hand ${J(`battle.opp.hand.length`)})`);
  run(`clear(); battle.plr.monsters.center=mku(5771); battle.opp.hand=[46,46]; battle.opp.deck=Array(30).fill(46); battle.activeSide='opp'; battle.phase='start'`);
  await oppDraw();
  ok(J(`battle.opp.hand.length`) === 3, `#5771 during the opponent's start phase nothing is dropped (hand ${J(`battle.opp.hand.length`)})`);

  // ---- [Counter] spells ----
  const counter = async (id, extra) => {
    run(`globalThis.__att=mku(45); battle.opp.monsters.center=__att; globalThis.__r=null`);
    run(`ABX.runCounter('plr', CARD_MAP.get(${id}), Object.assign({attSide:'opp', attackerZones:['center'], targetPos:'fighter'}, ${JSON.stringify(extra || {})})).then(r=>{globalThis.__r=r})`); await settle();
    return J(`__r`);
  };
  run(`clear(); battle.plr.monsters.center=mku(4385); battle.opp.life=10; battle.plr.life=10`);
  let r = await counter(4409);
  ok(r && r.nullified === true && J(`battle.opp.life`) === 9 && J(`battle.plr.life`) === 11, `#4409 Invincible Knuckle: nullify, 1 damage, +1 life (nullified ${r && r.nullified}, opp ${J(`battle.opp.life`)}, you ${J(`battle.plr.life`)})`);
  run(`clear(); battle.plr.item=mku(4388); battle.plr.life=10`);
  r = await counter(5101);
  ok(r && r.nullified === true && J(`battle.plr.life`) === 13, `#5101 with a Weapon equipped: nullify and +3 life (you ${J(`battle.plr.life`)})`);
  run(`clear(); battle.plr.life=10`);
  r = await counter(5101);
  ok(r && r.nullified === true && J(`battle.plr.life`) === 10, `#5101 without a Weapon: nullify, no life (you ${J(`battle.plr.life`)})`);

  // #4409 may only be cast during an attack on the opponent's turn: not castable in your own main phase
  const opt = (id, info) => J(`ABX.counterSpellOption('plr', CARD_MAP.get(${id}), ${JSON.stringify(info)})`);
  const atk = { attSide: "opp", attackerZones: ["center"], targetPos: "fighter" };
  run(`clear(); battle.opp.monsters.center=mku(45); battle.plr.monsters.center=mku(4385)`);
  ok(opt(4409, atk) && opt(4409, atk).nullifies === true, "#4409 offered while defending with a Godpunk on your field");
  ok(J(`ABX.freeCounterOption('plr', CARD_MAP.get(4409))`) === false, "#4409 NOT offered outside an attack (spell-response window, opponent's turn)");
  run(`clear(); battle.opp.monsters.center=mku(45); battle.plr.monsters.center=mku(45)`);
  ok(opt(4409, atk) === null, "#4409 NOT offered during an attack without a Godpunk on your field");
  run(`clear(); battle.opp.monsters.center=mku(45)`);
  ok(opt(4409, atk) === null, "#4409 NOT offered with an empty field");

  // option-2 helper: keep only the wanted option so the (auto) modal runs it
  const modalOpt = async (id, n, side) => {
    run(`{ const c=CARD_MAP.get(${id}); const ab=ABX.get(c).abilities.find(a=>a.kind==='modal'); globalThis.__all=ab.options; ab.options=[ab.options[${n}]]; globalThis.__ab=ab; }`);
    try { run(`ABX.runAbility('plr',CARD_MAP.get(${id}),__ab,null,{preApproved:true,auto:true,event:{name:'cast'}})`); await settle(); }
    finally { run(`__ab.options=__all`); }
  };
  // #4384 option 2: drop all souls from ONE monster on the opponent's field
  run(`clear(); battle.opp.monsters.left=mku(45); battle.opp.monsters.left.soul=[46,47,48]; battle.opp.monsters.right=mku(45); battle.opp.monsters.right.soul=[46,47]; globalThis.__od=battle.opp.drop.length`);
  await modalOpt(4384, 1);
  const souls = J(`[battle.opp.monsters.left.soul.length, battle.opp.monsters.right.soul.length]`);
  ok(souls.reduce((a, b) => a + b, 0) === 2 || souls.reduce((a, b) => a + b, 0) === 3, `#4384 option 2: all souls dropped from exactly one monster (souls left ${souls})`);
  ok(J(`battle.opp.drop.length - __od`) === (5 - souls.reduce((a, b) => a + b, 0)), `#4384 option 2: dropped souls go to the opponent's drop zone (+${J(`battle.opp.drop.length - __od`)})`);
  ok(J(`!!battle.opp.monsters.left && !!battle.opp.monsters.right`), "#4384 option 2: no monster is destroyed");

  // #4382 option 2: drop 1 opponent gauge, put the top two cards of your deck into your gauge
  run(`clear(); globalThis.__og=battle.opp.gauge.length; globalThis.__pg=battle.plr.gauge.length; globalThis.__pd=battle.plr.deck.length; globalThis.__od=battle.opp.drop.length`);
  await modalOpt(4382, 1);
  ok(J(`battle.opp.gauge.length - __og`) === -1 && J(`battle.opp.drop.length - __od`) === 1, "#4382 option 2: opponent loses exactly 1 gauge, it goes to their drop zone");
  ok(J(`battle.plr.gauge.length - __pg`) === 2 && J(`battle.plr.deck.length - __pd`) === -2 && J(`battle.plr.gauge.slice(-2).join()`) === "3000,3001" , `#4382 option 2: top two deck cards into your gauge (gauge +${J(`battle.plr.gauge.length - __pg`)}, deck ${J(`battle.plr.deck.length - __pd`)}, new ${J(`battle.plr.gauge.slice(-2)`)})`);
  run(`clear(); battle.opp.gauge=[]; globalThis.__pg=battle.plr.gauge.length`);
  await modalOpt(4382, 1);
  ok(J(`battle.plr.gauge.length - __pg`) === 2, "#4382 option 2: opponent has no gauge -> you still put 2 cards into your gauge");

  // #4382 "only set one"
  run(`clear(); battle.plr.setSpells=[CARD_MAP.get(4382)]`);
  ok(J(`evaluateCardConditions(CARD_MAP.get(4382), battle.plr, battle.opp).met`) === false, "#4382 cannot set a second copy while one is already set");
  run(`clear()`);
  ok(J(`evaluateCardConditions(CARD_MAP.get(4382), battle.plr, battle.opp).met`) === true, "#4382 can be set when none is set");

  // #4384 [Cast Cost]: destroy a Godpunk on your field + pay 1 gauge
  run(`clear(); battle.plr.monsters.left=mku(45)`);
  ok(J(`evaluateCardConditions(CARD_MAP.get(4384), battle.plr, battle.opp).met`) === false || J(`ABX.canPayExtras ? ABX.canPayExtras('plr', CARD_MAP.get(4384)) : false`) === false, "#4384 cannot be cast with no Godpunk to destroy");
  run(`clear(); battle.plr.monsters.left=mku(4385); battle.plr.gauge=[1,2,3]`);
  ok(J(`evaluateCardConditions(CARD_MAP.get(4384), battle.plr, battle.opp).met`) === true, "#4384 castable with a Godpunk and gauge");

  // #4384 Junk Wheels [Counter] modal, option 1: destroy up to two opponent monsters, draw if any destroyed
  run(`clear(); battle.opp.monsters.left=mku(45); battle.opp.monsters.right=mku(45); battle.opp.monsters.center=mku(45); globalThis.__h=battle.plr.hand.length`);
  r = await counter(4384);
  const left = J(`["left","center","right"].filter(p=>battle.opp.monsters[p]).length`);
  ok(left === 1 && J(`battle.plr.hand.length - __h`) === 1, `#4384 option 1: destroys exactly two of three monsters and you draw 1 (left ${left}, drew ${J(`battle.plr.hand.length - __h`)})`);

  // ---- #4382 Members Only Club: at the start of the opponent's main phase, choose one of two ----
  run(`clear(); battle.plr.setSpells=[CARD_MAP.get(4382)]; battle.opp.hand=[46,46]; globalThis.__h=battle.plr.hand.length; battle.plr.deck=Array.from({length:30},(_,i)=>3000+i)`);
  run(`ABX.fireTurnEvent('phaseStart','main','opp')`); await settle();
  ok(J(`battle.opp.hand.length`) === 1 && J(`battle.plr.hand.length - __h`) === 1, `#4382 option 1: opponent drops a hand card and you draw 1 (opp hand ${J(`battle.opp.hand.length`)}, you +${J(`battle.plr.hand.length - __h`)})`);

  // ---- #6378 Topfist: each called Godpunk pays its own [Call Cost] ----
  const spell6378 = async () => { run(`{ const c=CARD_MAP.get(6378); const ab=ABX.get(c).abilities.find(a=>a.kind==='spell'); ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'cast'}}); }`); await settle(); };
  const calledIds = () => J(`["left","center","right"].map(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id).filter(Boolean).sort()`);
  run(`clear(); battle.plr.drop=[4389,4383,45]; globalThis.__og=battle.opp.gauge.length; globalThis.__dk=battle.plr.deck.length`);
  await spell6378();
  ok(calledIds().join() === "4383,4389", `#6378 calls size 1 + size 3 Godpunk (${calledIds()})`);
  ok(J(`battle.opp.gauge.length - __og`) === -2, `#6378 both [Call Cost]s paid: opponent pays 1 + 1 gauge (${J(`battle.opp.gauge.length - __og`)})`);
  ok(J(`battle.plr.monsters.${J(`["left","center","right"].find(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id===4383)`)}.soul.length`) === 1 && J(`battle.plr.deck.length - __dk`) === -1, "#6378 Zapuranos puts the top card of your deck into its soul");
  run(`clear(); battle.plr.drop=[4389,4383]; battle.opp.gauge=[1]`);
  await spell6378();
  ok(calledIds().length <= 1 && J(`battle.opp.gauge.length`) >= 0, `#6378 opponent has only 1 gauge: cannot pay both call costs (called ${calledIds()}, opp gauge ${J(`battle.opp.gauge.length`)})`);
  run(`clear(); battle.plr.drop=[4389,4381]; battle.opp.monsters.left=mku(45); globalThis.__og=battle.opp.gauge.length; globalThis.__ol=battle.opp.life`);
  await spell6378();
  ok(calledIds().join() === "4381,4389" && J(`!battle.opp.monsters.left`) && J(`battle.opp.life - __ol`) === -1 && J(`battle.opp.gauge.length - __og`) === -2, `#6378 Brawlzeus + Gothiris: opp field card dropped, opp pays 1 life and 2 gauge in total (called ${calledIds()}, life ${J(`battle.opp.life - __ol`)}, gauge ${J(`battle.opp.gauge.length - __og`)})`);

  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
  process.exit(fail ? 1 : 0);
})();
