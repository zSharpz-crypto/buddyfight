// Clock-I/II/III #5958/#5959/#5960 "Horary Domination" through the ABX [Act] path: one implementation (game.js), shared once/turn, godclock state.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const total = () => J(`(function(f){let n=f.hand.length+f.drop.length+f.deck.length+f.gauge.length; ['left','center','right'].forEach(p=>{const m=f.monsters[p]; if(m) n+=1+(m.soul||[]).length;}); return n;})(battle.plr)`);
const quad = (i) => J(`battle.plr.godclock.quadrants[${i}].reversed`);
const act = async (id) => { run(`ABX.useAct('plr', CARD_MAP.get(${id}), null)`); await settle(); };
const can = (id) => J(`ABX.canUseAct('plr', CARD_MAP.get(${id}), ABX.actAbilities(CARD_MAP.get(${id}))[0], null).ok`);
const pickHand = async (i) => { run(`{const a=battle.activeChoice; battle.activeChoice=null; a.onSelect(${i});}`); await settle(); };
const pickFirst = async () => { run(`{const a=battle.activeChoice; if(a){battle.activeChoice=null; a.onSelect(a.firstPayload);}}`); await settle(); };
const setup = () => {
  run(`{battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=false; ABX.fast=true;
   for (const f of [battle.plr,battle.opp]) ['left','center','right'].forEach(p=>f.monsters[p]=null);
   battle.plr.hand=[46,47,48,49]; battle.plr.drop=[]; battle.plr.gauge=[46,46,46,46]; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=5; battle.pendingDefenseContext=null;}`);
};
(async () => {
  await settle();
  // --- Clock-I: player chooses the hand card, flips, top-3 flow ---
  setup(); let c0 = total(); const deck0 = J(`battle.plr.deck.length`), top = J(`battle.plr.deck.slice(0,3)`);
  ck("can use Clock-I initially", can(5958));
  await act(5958); await pickHand(2);   // choose hand[2] = 48
  ck("chosen hand card (48) went to deck bottom, others stayed in hand", J(`battle.plr.deck[battle.plr.deck.length-1]`) === 48 && JSON.stringify(J(`battle.plr.hand`)) === "[46,47,49]", J(`battle.plr.hand`));
  await pickFirst();
  ck("Clock-I flipped, used-this-turn set, reversalCount 1", quad(0) === true && J(`battle.plr.godclock.horaryDominationUsedThisTurn`) === true && J(`battle.plr.godclock.reversalCount`) === 1);
  ck("Clock-I took 1 of top 3 into hand, dropped 2", J(`battle.plr.hand.length`) === 4 && J(`battle.plr.drop.length`) === 2 && J(`battle.plr.hand.includes(${top[0]})`) , J(`battle.plr.hand`));
  ck("Clock-I card count conserved", total() === c0, [total(), c0]);
  ck("deck shrank by 3 after bottom insert (net -2)", J(`battle.plr.deck.length`) === deck0 - 2);
  // --- shared once per turn ---
  ck("Clock-II blocked same turn (shared limit)", can(5959) === false);
  ck("Clock-III blocked same turn", can(5960) === false);
  ck("Clock-I already flipped blocked", can(5958) === false);
  let h = J(`battle.plr.hand.length`); await act(5959); ck("act on Clock-II same turn does nothing", quad(1) === false && J(`battle.plr.hand.length`) === h && J(`battle.activeChoice`) === null);
  // --- next turn works again ---
  run(`{battle.activeSide='opp'; battle.phase='main'; battle.endTurn();}`); await settle();
  run(`{battle.activeSide='plr'; battle.phase='main'; battle.turnCount=7; battle.plr.godclock.horaryDominationUsedThisTurn=false;}`);
  ck("next turn: Clock-II usable again", can(5959) === true);
  // --- Clock-II outside battle: draws 1, flips ---
  setup(); c0 = total(); h = J(`battle.plr.hand.length`);
  await act(5959); await pickHand(0);
  ck("Clock-II flipped, drew 1 (net hand same: -1 +1), state set", quad(1) === true && J(`battle.plr.godclock.horaryDominationUsedThisTurn`) === true && J(`battle.plr.hand.length`) === h && total() === c0);
  // --- Clock-II during defense: ends the battle, no damage ---
  setup(); c0 = total();
  run(`{battle.activeSide='opp'; battle.phase='attack'; battle.opp.monsters.center={card:CARD_MAP.get(46),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
    battle.pendingDefenseContext={attSide:'opp',attackerZones:['center'],targetPos:'fighter',defSide:'plr'}; globalThis.__life=battle.plr.life;}`);
  ck("Clock-II usable on opponent's attack (defense context)", can(5959));
  await act(5959); await pickHand(0);
  ck("Clock-II ended battle: no damage, context cleared, attacker spent", J(`battle.plr.life`) === J(`__life`) && J(`battle.pendingDefenseContext`) === null && quad(1) === true && J(`battle.opp.monsters.center.rested`) === true);
  ck("defense Clock-II card count (+1 draw -1 bottom)", total() === c0);
  // not usable on opponent's non-attack timing
  setup(); run(`{battle.activeSide='opp'; battle.phase='main';}`);
  ck("not usable during opponent's main phase", can(5958) === false);
  setup(); run(`battle.plr.hand=[]`); ck("no hand card: blocked", can(5958) === false);
  // --- Clock-III: calls Time Dragon, pays Call Cost ---
  setup(); run(`battle.plr.drop=[5955]; battle.plr.gauge=[46,46,46];`); c0 = total(); const g0 = J(`battle.plr.gauge.length`);
  ck("Clock-III usable with Time Dragon in drop", can(5960));
  await act(5960); await pickFirst(); await pickHand(1);
  const mon = J(`Object.values(battle.plr.monsters).find(m=>m&&m.card.id===5955)||null`);
  ck("Clock-III called #5955 with gauge Call Cost", !!mon && J(`battle.plr.gauge.length`) < g0 && quad(3) === true && J(`battle.plr.godclock.horaryDominationUsedThisTurn`) === true, mon);
  ck("Clock-III card count conserved", total() === c0, [total(), c0]);
  setup(); run(`battle.plr.drop=[];`); ck("Clock-III with no Time Dragon in drop: blocked", can(5960) === false);
  // --- 3 flipped through the real ABX acts, then opponent's end of turn offers Godclock awaken ---
  setup(); run(`{battle.plr.drop=[5955]; battle.plr.hand=battle.plr.hand.concat([6065]); ABX.hooks.pickCards=(o)=>[0];}`);
  for (const [id, tail] of [[5958, 1], [5959, 0], [5960, 2]]) {
    await act(id); if (id === 5960) await pickFirst(); await pickHand(0); if (id === 5958) await pickFirst();
    run(`battle.plr.godclock.horaryDominationUsedThisTurn=false`);
  }
  ck("all three clocks flipped by ABX acts", quad(0) && quad(1) && quad(3) && J(`battle.plr.godclock.reversalCount`) === 3, J(`battle.plr.godclock.quadrants.map(q=>q.reversed)`));
  run(`{ABX.autoPlay=true; if(!battle.plr.hand.includes(6065)) battle.plr.hand.push(6065); battle.activeSide='opp'; battle.phase='main'; battle.endTurn();}`); await settle();
  ck("opponent end-turn awakens Godclock after real clock flips", J(`battle.plr.godclock.awakened`) === true && J(`battle.plr.item && battle.plr.item.card.id`) === 5961);
  // --- follow-ups: once gate, Eternal Eon, bot Clock-I resume ---
  const canR = (id) => J(`ABX.canUseAct('plr', CARD_MAP.get(${id}), ABX.actAbilities(CARD_MAP.get(${id}))[0], null)`);
  const defense = () => run(`{battle.activeSide='opp'; battle.phase='attack'; battle.opp.monsters.center={card:CARD_MAP.get(46),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}; battle.pendingDefenseContext={attSide:'opp',attackerZones:['center'],targetPos:'fighter',defSide:'plr'};}`);
  for (const id of [5958, 5959, 5960]) {
    setup(); run(`battle.plr.drop=[5955]; battle.plr.gauge=[46,46,46];`);
    await act(id); run(`battle.activeChoice=null`); await settle();   // cancel the popup
    ck("cancel " + id + ": ABX act still usable", canR(id).ok === true, canR(id));
    await act(id); await pickHand(0); if (id !== 5959) await pickFirst();
    ck("used " + id + ": blocked", canR(id).ok === false && J(`battle.plr.godclock.horaryDominationUsedThisTurn`) === true);
    run(`battle.plr.godclock.horaryDominationUsedThisTurn=false`);
    run(`{battle.plr.drop=[5955];battle.plr.callLimitUsed={};['left','center','right'].forEach(p=>battle.plr.monsters[p]=null);battle.plr.gauge=[46,46,46];battle.plr.godclock.quadrants[0].reversed=false;battle.plr.godclock.quadrants[1].reversed=false;battle.plr.godclock.quadrants[3].reversed=false;}`);
    ck("next turn " + id + " usable again", canR(id).ok === true, canR(id));
  }
  setup(); defense(); run(`battle.plr.timeStoppedThisBattle=true`); ck("Eternal Eon (battle): engine blocked", canR(5959).ok === false, canR(5959));
  setup(); defense(); run(`battle.plr.timeStoppedThisTurn=true`); ck("Eternal Eon (turn): engine blocked", canR(5959).ok === false, canR(5959));
  setup(); defense(); ck("defense without time stop: ok", canR(5959).ok === true);
  setup(); defense(); run(`battle.plr.isBot=true`); run(`battle.initiateClockFlipInteractive('plr',0,true)`); await settle();
  ck("bot Clock-I in defense: flipped and pendingDefenseContext cleared", quad(0) === true && J(`battle.pendingDefenseContext`) === null, J(`battle.pendingDefenseContext`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
