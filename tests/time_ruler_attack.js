// Time Ruler Dragon "When this card attacks" bottom-deck effects fire exactly once (#5955, #5956, #6010) and honor "up to one".
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const cnt = (s) => J(`(function(f){let n=f.hand.length+f.gauge.length+f.deck.length+f.drop.length;['left','center','right'].forEach(p=>{const m=f.monsters[p];if(m)n+=1+(m.soul||[]).length}); return n})(battle.${s})`);
const setup = (id) => run(`{battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
  const mk=(i)=>({card:CARD_MAP.get(i),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  ['left','center','right'].forEach(p=>{battle.plr.monsters[p]=null;battle.opp.monsters[p]=null;});
  battle.plr.monsters.center=mk(${id}); battle.opp.monsters.left=mk(571); battle.opp.monsters.center=mk(1445); battle.opp.monsters.right=mk(571);
  battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=5; ABX.hooks.pickCards=null; ABX.autoPlay=false; ABX.hooks.confirm=()=>true; ABX.hooks.pickOption=()=>0;}`);
const attack = async () => { run(`battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter')`); await settle(); run(`battle.pendingDefenseContext&&battle.resolveDefenseChoice(null)`); await settle(); };
const oppField = () => J(`['left','center','right'].filter(p=>battle.opp.monsters[p]).length`);
(async () => {
  await settle();
  for (const id of [5955, 5956]) {
    setup(id); const c0 = cnt("opp"), d0 = J(`battle.opp.deck.length`), h0 = J(`battle.opp.hand.length`);
    run(`ABX.hooks.pickCards=(o)=>[o.cards.findIndex(x=>x.card.id===1445)]`);
    await attack();
    ck(`#${id} exactly one opp monster bottom-decked`, oppField() === 2, oppField());
    ck(`#${id} player chose the monster (#1445 gone)`, J(`!battle.opp.monsters.center`));
    ck(`#${id} deck +1, hand same, count conserved`, J(`battle.opp.deck.length`) === d0 + 1 && J(`battle.opp.hand.length`) === h0 && cnt("opp") === c0, [J(`battle.opp.deck.length`), d0]);
    ck(`#${id} card is on bottom of deck`, J(`battle.opp.deck[battle.opp.deck.length-1]`) === 1445);
    setup(id); run(`ABX.hooks.pickCards=()=>[]`); await attack();
    ck(`#${id} may decline ("up to one")`, oppField() === 3, oppField());
  }
  // #6010: effect only with flag [Reversal]; without it, nothing is removed by the "put on bottom" clause
  setup(6010); await attack();
  ck("#6010 no Reversal: no opp monster removed", oppField() === 3, oppField());
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
