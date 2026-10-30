// Godclock #5957 [Reversal] into the Endruler Dragon: only at the end of the OPPONENT's turn, optional, owner picks the Time Ruler.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const count = () => J(`(function(f){let n=f.hand.length+f.drop.length+f.deck.length+f.gauge.length; ['left','center','right'].forEach(p=>{const m=f.monsters[p]; if(m) n+=1+(m.soul||[]).length;}); return n;})(battle.plr)`);
const setup = (revN, hand, field) => {
  run(`{battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true; ABX.hooks.pickCards=(o)=>[0];
   const g=battle.plr.godclock; [0,1,3].forEach((i,k)=>{ g.quadrants[i].reversed = k<${revN}; }); g.reversalCount=${revN};
   battle.plr.hand=battle.plr.hand.filter(id=>!(CARD_MAP.get(id).name||'').toLowerCase().includes('time ruler')); ['left','center','right'].forEach(p=>battle.plr.monsters[p]=null);
   battle.plr.deck=battle.plr.deck.filter(id=>id!==6065);   // the shuffled deck is full of 6065: a turn-start draw of one made 'hand copy over field' flaky (~7%)
   ${hand ? "battle.plr.hand.push(6065);" : ""}
   ${field ? "battle.plr.monsters.center={card:CARD_MAP.get(6065),rested:false,attacksLeft:1,soul:[46],tempPower:0,tempDef:0,tempCrit:0};" : ""}
   battle.activeSide='opp'; battle.phase='main';}`);
};
(async () => {
  await settle();
  setup(3, true, false); let c0 = count();
  run(`battle.endTurn()`); await settle();
  ck("hotseat opp endTurn flips (Time Ruler in hand)", J(`battle.plr.godclock.awakened && battle.plr.item.card.id===5961`));
  ck("hand Time Ruler went to drop", J(`battle.plr.drop.includes(6065)`));
  ck("card counts conserved", count() === c0, [count(), c0]);

  setup(3, false, true); c0 = count();
  run(`battle.endTurn()`); await settle();
  ck("flips with Time Ruler on field", J(`battle.plr.godclock.awakened`));
  ck("field Time Ruler + soul in drop, field empty", J(`battle.plr.drop.includes(6065) && battle.plr.drop.includes(46) && !battle.plr.monsters.center`));
  ck("card counts conserved (field)", count() === c0, [count(), c0]);

  setup(2, true, false); run(`battle.endTurn()`); await settle();
  ck("no flip with <3 reversed", !J(`battle.plr.godclock.awakened`));
  setup(3, false, false); run(`battle.endTurn()`); await settle();
  ck("no flip without Time Ruler", !J(`battle.plr.godclock.awakened`));

  setup(3, true, false); run(`battle.activeSide='plr'; battle.awakenEndrulerDragon('plr'); battle.endTurn();`); await settle();
  ck("not flippable on own turn (direct call + own endTurn)", !J(`battle.plr.godclock.awakened`));

  setup(3, true, false); c0 = count(); run(`ABX.hooks.pickCards=()=>[]`);
  run(`battle.endTurn()`); await settle();
  ck("decline leaves Godclock unflipped, hand intact", !J(`battle.plr.godclock.awakened && 1`) && J(`battle.plr.hand.includes(6065)`) && count() === c0);
  ck("decline still ends the turn", J(`battle.activeSide`) === "plr", J(`battle.activeSide`));

  setup(3, true, true); run(`ABX.hooks.pickCards=(o)=>[o.cards.findIndex(x=>x.badge==='Hand')]`);
  run(`battle.endTurn()`); await settle();
  ck("owner can choose hand copy over field", J(`battle.plr.godclock.awakened && !!battle.plr.monsters.center && !battle.plr.hand.includes(6065)`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
