// node tests/asterism_effect.js - #3191 Asterism Effect: needs a «Prism Dragon» on your field, [Counter], cost = discard two cards,
// option 1: all your monsters cannot be destroyed this turn; option 2: you cannot lose until the start of the opponent's next turn.
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 40; i++) { await new Promise(r => setImmediate(r)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.mon=(id)=>mk(CARD_MAP.get(id));
 globalThis.filler=()=>ALL_CARDS.filter(x=>x.type==='Monster'&&!x.skill).slice(0,3).map(x=>x.id);
 globalThis.base=function(o){ o=o||{}; battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; globalThis.__res=null;
   const me=battle.opp; me.gauge=me.deck.splice(0,6); me.life=o.life==null?10:o.life; me.drop=[]; const f=filler();
   me.hand=[3191].concat(o.fill==null?[f[0],f[1]]:f.slice(0,o.fill)); ['left','center','right'].forEach(p=>me.monsters[p]=null);
   me.monsters.center=mon(4281); if(o.prism!==false) me.monsters.left=mon(2796);
   const a=battle.plr; ['left','center','right'].forEach(p=>a.monsters[p]=null); a.monsters.center=mon(4281); battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=5;
   battle.executeAttackResolution=function(x,z,t,n){ globalThis.__res=n; }; return me; };
 globalThis.offered=()=>battle.getAvailableDefenseCards('opp',false,'fighter',[battle.plr.monsters.center]).some(o=>o.card&&o.card.id===3191&&!o.fieldKey);
 globalThis.defend=function(){ const me=battle.opp; battle.applyDefensiveCounterCard('opp', me.hand.indexOf(3191), 'plr', ['center'], 'fighter'); };`);
(async () => {
  run(`base();`);
  ck("offered with a Prism Dragon and two other hand cards", val(`return offered()`));
  run(`base({prism:false});`);
  ck("NOT offered without a Prism Dragon", !val(`return offered()`));
  run(`base({fill:1});`);
  ck("NOT offered with only one other hand card (cost: discard two)", !val(`return offered()`));
  // option 1
  run(`ABX.hooks.pickOption=()=>0; base(); defend();`); await settle();
  ck("opt1: cost paid - hand empty, 2 dropped + spell in drop", val(`return [battle.opp.hand.length, battle.opp.drop.length]`).join() === "0,3", val(`return [battle.opp.hand.length, battle.opp.drop]`));
  ck("opt1: my monster is protected from destroy (by opp effect)", val(`return ABX.core.isProtected(battle.opp.monsters.center,'opp','destroyed',{side:'plr'})`));
  ck("opt1: also protected from my own destroy effects", val(`return ABX.core.isProtected(battle.opp.monsters.center,'opp','destroyed',{side:'opp'})`));
  run(`battle.turnCount=6;`);
  ck("opt1: protection is gone next turn", !val(`return ABX.core.isProtected(battle.opp.monsters.center,'opp','destroyed',{side:'plr'})`));
  // option 2 (autoPlay off so the chosen option comes from the pick hook; bots/auto sides always take option 1)
  run(`ABX.autoPlay=false; ABX.hooks.pickOption=()=>1; base(); defend();`); await settle();
  ck("opt2: abxNoLose set for opp", val(`return !!battle.opp.abxNoLose`), val(`return battle.opp.abxNoLose||null`));
  run(`battle.matchOver=false; battle.opp.life=0; battle.plr.life=10; battle.checkWinCondition();`);
  ck("opt2: life 0 does not end the match", val(`return !battle.matchOver`), val(`return [battle.matchOver, battle.opp.life]`));
  run(`battle.matchOver=false; battle.opp.life=5; battle.opp.deck=[]; battle.checkWinCondition();`);
  ck("opt2: empty deck does not lose the match", val(`return !battle.matchOver`), val(`return [battle.matchOver, battle.opp.deck.length]`));
  ck("opt2: deck stays empty (no leftover filler card)", val(`return battle.opp.deck.length`) === 0);
  run(`battle.startTurn('plr');`);
  ck("protection ends when the opponent's next turn begins", val(`return !battle.opp.abxNoLose`));
  run(`battle.matchOver=false; battle.opp.deck=[]; battle.checkWinCondition();`);
  ck("after it ends an empty deck loses again", val(`return battle.matchOver`));
  run(`ABX.autoPlay=true;`);
  run(`ABX.hooks.pickOption=null;`);
  console.log(`pass ${pass} fail ${fail}`);
})();
