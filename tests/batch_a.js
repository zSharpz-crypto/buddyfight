// node tests/batch_a.js - first batch of cards that only ran on the generic fallback (r40StructuredExec / r22exec): real behaviour checks.
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
   me.gauge=me.deck.splice(0,6); op.gauge=op.deck.splice(0,3); me.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  // #6558 Gagnar Re:B: return all cards from each player's gauge to their decks and shuffle; if 2+ of the opponent's gauge were returned, put the top 3 of your deck into your gauge
  run(`{ const me=setup(); me.hand=[6558]; globalThis.__d=[battle.plr.deck.length,battle.opp.deck.length]; me.life=10; battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("6558: both gauges went back to the decks, then my top 3 went to my gauge", val(`return battle.opp.gauge.length===0 && battle.opp.deck.length===__d[1]+3 && battle.plr.gauge.length===3`), val(`return [battle.opp.gauge.length, battle.opp.deck.length, __d, battle.plr.gauge.length]`));
  run(`{ const me=setup(); battle.opp.gauge=battle.opp.gauge.slice(0,1); me.hand=[6558]; battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("6558: only 1 opponent gauge returned -> no extra gauge for me", val(`return battle.plr.gauge.length===0 && battle.opp.gauge.length===0`), val(`return [battle.plr.gauge.length, battle.opp.gauge.length]`));
  // #725 Actor Knights High Priest: when you call a Tarot monster other than itself, gain 1 life (once per turn)
  const tarot = 721;
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(725)); me.hand=[${tarot}]; battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("725: calling a Tarot monster gains 1 life (Death costs 1 life to call: 10-1+1)", val(`return battle.plr.life===10`), val(`return battle.plr.life`));
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(725)); me.hand=[${tarot}]; battle.completeMonsterCall('plr','center',0,false,false); me.hand=[${tarot}]; battle.completeMonsterCall('plr','right',0,false,false); }`); await settle();
  ck("725: only once per turn (two calls cost 2, one gain: 10-2+1)", val(`return battle.plr.life===9`), val(`return battle.plr.life`));
  // #329 Cat Shadow, Aoihime: may discard one card; if you do, search a Demon Way spell with [Set]
  run(`{ const me=setup(); me.life=10; me.hand=[329, ALL_CARDS.find(c=>c.type==='Monster'&&!c.skill).id]; me.deck=me.deck.filter(x=>![]);  globalThis.__dw=ALL_CARDS.find(c=>/demon way/i.test(c.name)&&c.type==='Spell'&&/\[Set\]/.test(c.skill)); me.deck.push(__dw.id); battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("329: discarded a card and searched the Demon Way [Set] spell into hand", val(`return battle.plr.hand.includes(__dw.id) && battle.plr.drop.length>=1`), val(`return [battle.plr.hand, battle.plr.drop]`));
  // #1639 An Encounter with a Dragon: "You may cast this card once per turn"
  run(`{ const me=setup(); me.hand=[1639,1639]; me.deck.unshift(...ALL_CARDS.filter(c=>(c.attrs||[]).includes('RagingSpirits')&&c.size===3).slice(0,2).map(c=>c.id)); me.gauge=me.deck.splice(0,6); battle.castSpellFromHand('plr',0); }`); await settle();
  ck("1639: first cast resolves", val(`return battle.plr.drop.includes(1639)`), val(`return [battle.plr.drop, battle.plr.hand]`));
  ck("1639: a second cast in the same turn is refused", val(`const r=evaluateCardConditions(CARD_MAP.get(1639), battle.plr, battle.opp); return r.met===false`), val(`return evaluateCardConditions(CARD_MAP.get(1639), battle.plr, battle.opp)`));
  console.log("pass", pass, "fail", fail);
})();
