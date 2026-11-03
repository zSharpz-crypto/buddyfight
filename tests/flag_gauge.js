// node tests/flag_gauge.js - opponent-gauge costs/effects, flag flipped face down, cards put under a flag.
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 14; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   me.gauge=me.deck.splice(0,5); op.gauge=op.deck.splice(0,3); me.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  // ---- opponent's gauge as a [Call Cost] ----
  for (const id of [4389, 4412]) {
    run(`{ const me=setup(); me.hand=[${id}]; battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
    ck(id + " call: monster is on the field", val(`return !!battle.plr.monsters.center`), val(`return [battle.plr.hand, battle.plr.monsters.center&&1]`));
    ck(id + " call: paid 1 of the OPPONENT's gauge, not mine", val(`return battle.opp.gauge.length===2 && battle.opp.drop.length===1 && battle.plr.gauge.length===5`), val(`return [battle.opp.gauge.length, battle.opp.drop.length, battle.plr.gauge.length]`));
    run(`{ const me=setup(); battle.opp.gauge=[]; me.hand=[${id}]; battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
    ck(id + " call: cannot be called when the opponent has no gauge", val(`return !battle.plr.monsters.center`), val(`return [battle.plr.monsters.center&&1, battle.plr.hand]`));
  }
  // #4383 Fingers Myriad: Pay 1 opponent's gauge & put the top card of your deck into its soul
  run(`{ const me=setup(); me.hand=[4383]; battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("4383 call: opp gauge paid and a soul added", val(`const u=battle.plr.monsters.center; return !!u && battle.opp.gauge.length===2 && u.soul.length===1`), val(`const u=battle.plr.monsters.center; return [u&&1, battle.opp.gauge.length, u&&u.soul.length]`));
  // #4387 Skygod Jacket [Equip Cost] Pay 1 opponent's gauge & put a Godpunk from drop into soul
  const gp = JSON.parse(run(`JSON.stringify((ALL_CARDS.find(c=>(c.attrs||[]).includes('Godpunk')&&c.type==='Monster')||{}).id||0)`));
  run(`{ const me=setup(); me.hand=[4387]; me.drop=[${gp}]; battle.equipCardFromHand('plr',0); }`); await settle();
  ck("4387 equip: opponent's gauge paid", val(`return battle.opp.gauge.length===2 && !!battle.plr.item`), val(`return [battle.opp.gauge.length, battle.plr.item&&1, Object.keys(battle).filter(k=>/equip/i.test(k)).slice(0,6)]`));
  // ---- #16 Gotcha!: next [Act] gauge payment may use both gauges ----
  const gotcha = val(`return ABX.isExecutable ? ALL_CARDS.some(c=>c.id===16) && ABX.ownsSpell(CARD_MAP.get(16)) : null`);
  ck("16 Gotcha! is executable by the engine", gotcha === true, gotcha);
  // ---- #16 Gotcha!: the next monster [Act] gauge payment may use the opponent's gauge too (#149 Lizardman: Act Pay 1 gauge -> power+3000) ----
  run(`{ const me=setup(); me.gauge=[]; me.monsters.center=mk(CARD_MAP.get(149)); }`);
  ck("149 act NOT usable with an empty gauge (no Gotcha!)", val(`return ABX.canUseAct('plr',CARD_MAP.get(149),ABX.actAbilities(CARD_MAP.get(149))[0],battle.plr.monsters.center).ok===false`));
  run(`{ const me=setup(); me.gauge=[]; me.life=5; me.hand=[16]; me.gauge=me.deck.splice(0,2); battle.castSpellFromHand('plr',0); }`); await settle();
  ck("16 cast: arms the Gotcha! flag", val(`return battle.plr.abxGotcha===battle.turnCount`), val(`return [battle.plr.abxGotcha, battle.turnCount]`));
  run(`{ const me=battle.plr; me.gauge=[]; me.monsters.center=mk(CARD_MAP.get(149)); }`);
  ck("149 act usable with Gotcha! even with an empty gauge", val(`return ABX.canUseAct('plr',CARD_MAP.get(149),ABX.actAbilities(CARD_MAP.get(149))[0],battle.plr.monsters.center).ok===true`));
  run(`ABX.useAct('plr',CARD_MAP.get(149),battle.plr.monsters.center)`); await settle();
  ck("149 act paid from the OPPONENT's gauge (to their drop) and works", val(`const u=battle.plr.monsters.center; return battle.opp.gauge.length===2 && battle.opp.drop.length===1 && u.tempPower===3000`), val(`const u=battle.plr.monsters.center; return [battle.opp.gauge.length, battle.opp.drop.length, u.tempPower]`));
  ck("16 flag is used up after the payment", val(`return !battle.plr.abxGotcha`), val(`return battle.plr.abxGotcha`));
  // ---- dropping the opponent's gauge ----
  run(`{ const me=setup(); me.hand=[769]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("769 Lunatic: a card of the opponent's gauge goes to THEIR drop zone", val(`return battle.opp.gauge.length===2 && battle.opp.drop.length===1`), val(`return [battle.opp.gauge.length, battle.opp.drop.length]`));
  // ---- #3923 World Pandemic: flag flipped face down ----
  run(`{ const me=setup(); me.gauge=me.deck.splice(0,6); me.hand=[3923]; const op=battle.opp; op.monsters.center=mk(CARD_MAP.get(4281)); op.item=mk(CARD_MAP.get(942)); op.hand=[4281]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("3923: opponent's flag is face down", val(`return battle.opp.flagFaceDown===true`), val(`return battle.opp.flagFaceDown`));
  ck("3923: all cards on the opponent's field go to the drop zone", val(`const o=battle.opp; return !o.monsters.center && !o.item && o.drop.includes(4281) && o.drop.includes(942)`), val(`const o=battle.opp; return [!!o.monsters.center, !!o.item, o.drop]`));
  ck("3923: face-down flag -> cards written on that flag cannot be used", val(`const r=evaluateCardConditions(CARD_MAP.get(4281), battle.opp, battle.plr); return r.met===false && /face down/i.test(r.reasons.join(' '))`), val(`return evaluateCardConditions(CARD_MAP.get(4281), battle.opp, battle.plr)`));
  ck("3923: the face-down flag gives no flag ability (core.flagCard is null)", val(`return !ABX.core.flagCard || ABX.core.flagCard(battle.opp)===null`), val(`return typeof ABX.core.flagCard`));
  // ---- cards put under a flag: 15 under the opponent's flag = you win (#4997 Sentence of Curse) ----
  run(`{ const me=setup(); const op=battle.opp; battle.activeSide='opp'; op.flagUnderFaceUp=op.deck.splice(0,14).slice(); op.flagUnder=op.flagUnderFaceUp.slice(); globalThis.__ctx={side:'plr',f:me,e:op,card:CARD_MAP.get(4997),bind:{chosen:[],revealed:[],looked:[]},lastDone:true,log:[]}; }`);
  run(`ABX.OPS.r39SentenceOfCurse4997.run({}, __ctx)`); await settle();
  ck("4997: 15th card under the flag -> the opponent loses (match over, you win)", val(`return battle.matchOver===true && battle.opp.life<=0`), val(`return [battle.matchOver, battle.opp.life, battle.opp.flagUnderFaceUp.length]`));
  run(`{ const me=setup(); const op=battle.opp; battle.activeSide='opp'; op.flagUnderFaceUp=op.deck.splice(0,5).slice(); op.flagUnder=op.flagUnderFaceUp.slice(); globalThis.__ctx={side:'plr',f:me,e:op,card:CARD_MAP.get(4997),bind:{chosen:[],revealed:[],looked:[]},lastDone:true,log:[]}; }`);
  run(`ABX.OPS.r39SentenceOfCurse4997.run({}, __ctx)`); await settle();
  ck("4997: below 15 -> nobody wins yet", val(`return !battle.matchOver && battle.opp.flagUnderFaceUp.length===6`), val(`return [battle.matchOver, battle.opp.flagUnderFaceUp.length]`));
  // ---- #3812 World Linking Key: "At the end of your next turn, you lose the game." ----
  ck("3812 parsed with the delayed loss", val(`return JSON.stringify(ABX.get(CARD_MAP.get(3812)).abilities).includes('loseLater')`));
  run(`{ const me=setup(); globalThis.__c={side:'plr',f:me,e:battle.opp,card:CARD_MAP.get(3812),bind:{chosen:[],revealed:[],looked:[]},lastDone:true,log:[]}; ABX.OPS.loseLater.run({},__c); globalThis.__t0=battle.turnCount; }`);
  run(`battle.turnCount=__t0+1; battle.activeSide='plr'; ABX.fireTurnEvent('turnEnd');`); await settle();
  ck("3812: still playing at the end of the turn BEFORE your next turn", val(`return !battle.matchOver`));
  run(`battle.turnCount=__t0+2; battle.activeSide='plr'; ABX.fireTurnEvent('turnEnd');`); await settle();
  ck("3812: you lose at the end of your next turn", val(`return battle.matchOver===true`), val(`return battle.matchOver`));
  // ---- under-flag requirements on the other Curse cards ----
  run(`{ const me=setup(); me.hand=[5069]; me.gauge=me.deck.splice(0,4); battle.opp.flagUnderFaceUp=[]; }`);
  ck("5069 Scar Bind: cannot be cast without a card under their flag", val(`return evaluateCardConditions(CARD_MAP.get(5069), battle.plr, battle.opp).met===false`), val(`return evaluateCardConditions(CARD_MAP.get(5069), battle.plr, battle.opp)`));
  run(`battle.opp.flagUnderFaceUp=battle.opp.deck.splice(0,1); battle.opp.flagUnder=battle.opp.flagUnderFaceUp.slice();`);
  ck("5069 Scar Bind: castable with a card under their flag", val(`return evaluateCardConditions(CARD_MAP.get(5069), battle.plr, battle.opp).met===true`), val(`return evaluateCardConditions(CARD_MAP.get(5069), battle.plr, battle.opp)`));
  run(`{ const me=setup(); const op=battle.opp; op.flagUnderFaceUp=op.deck.splice(0,8); op.flagUnder=op.flagUnderFaceUp.slice(); op.monsters.center=mk(CARD_MAP.get(4281)); me.hand=[5069]; me.gauge=me.deck.splice(0,4); battle.castSpellFromHand('plr',0); }`); await settle();
  ck("5069 with 8+ under their flag: all their cards are rested", val(`return battle.opp.monsters.center.rested===true`), val(`return battle.opp.monsters.center&&battle.opp.monsters.center.rested`));
  run(`{ const me=setup(); const op=battle.opp; op.flagUnderFaceUp=op.deck.splice(0,8); op.flagUnder=op.flagUnderFaceUp.slice(); me.hand=[5060]; me.gauge=[]; }`);
  ck("5060 Curse Decline: castable for free with 8+ under their flag", val(`return evaluateCardConditions(CARD_MAP.get(5060), battle.plr, battle.opp).met===true`), val(`return evaluateCardConditions(CARD_MAP.get(5060), battle.plr, battle.opp)`));
  run(`{ const me=setup(); const op=battle.opp; op.flagUnderFaceUp=op.deck.splice(0,3); op.flagUnder=op.flagUnderFaceUp.slice(); me.hand=[5060]; me.gauge=[]; }`);
  ck("5060 Curse Decline: not free with fewer than 8 under their flag", val(`return evaluateCardConditions(CARD_MAP.get(5060), battle.plr, battle.opp).met===false`), val(`return evaluateCardConditions(CARD_MAP.get(5060), battle.plr, battle.opp)`));
  // #6363 Curse Count: at the end of your turn, put up to the top two cards of their deck face up under their flag
  run(`{ const me=setup(); const op=battle.opp; op.flagUnderFaceUp=[]; op.flagUnder=[]; me.item=null; me.setSpells=me.setSpells||[]; globalThis.__n0=op.deck.length; }`);
  run(`ABX.putTopOppDeckUnderFlag('plr',2)`);
  ck("putTopOppDeckUnderFlag: 2 cards leave their deck and go under their flag face up", val(`const o=battle.opp; return o.flagUnderFaceUp.length===2 && o.deck.length===__n0-2`), val(`const o=battle.opp; return [o.flagUnderFaceUp.length, o.deck.length, __n0]`));
  console.log("pass", pass, "fail", fail);
})();
