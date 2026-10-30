// #6010 Teylor Luna: "destroy up to one card on your opponent's field. If your flag is Perfected Deity of Eon, The Endruler Dragon, put it on the bottom of the deck INSTEAD."
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const cnt = (s) => J(`(function(f){let n=f.hand.length+f.gauge.length+f.deck.length+f.drop.length;['left','center','right'].forEach(p=>{const m=f.monsters[p];if(m)n+=1+(m.soul||[]).length}); return n})(battle.${s})`);
const setup = (rev, endruler) => run(`{battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
  const mk=(i,soul)=>({card:CARD_MAP.get(i),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
  ['left','center','right'].forEach(p=>{battle.plr.monsters[p]=null;battle.opp.monsters[p]=null;});
  battle.plr.monsters.center=mk(6010); battle.opp.monsters.left=mk(571); battle.opp.monsters.center=mk(572,[46]); battle.opp.monsters.right=mk(571);
  const g=battle.plr.godclock; g.reversalCount=${rev}; [0,1,3].forEach((i,k)=>{ g.quadrants[i].reversed = k<${rev}; });
  ${endruler ? "battle.plr.hand=[]; battle.plr.godclock.quadrants.forEach(q=>q.reversed=true); battle.plr.godclock.reversalCount=4; battle.plr.monsters.left={card:CARD_MAP.get(6065),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}; battle.activeSide='opp'; battle.phase='main'; battle.awakenEndrulerDragon('plr',{fromTrigger:true,pick:{source:'field',pos:'left',card:CARD_MAP.get(6065)}});" : ""}
  battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=5; ABX.hooks.pickCards=null; ABX.autoPlay=false; ABX.hooks.confirm=()=>true; ABX.hooks.pickOption=()=>0;}`);
const attack = async () => { run(`battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter')`); await settle(); run(`battle.pendingDefenseContext&&battle.resolveDefenseChoice(null)`); await settle(); };
const oppField = () => J(`['left','center','right'].filter(p=>battle.opp.monsters[p]).length`);
const pickC = `ABX.hooks.pickCards=(o)=>[o.cards.findIndex(x=>x.card.id===572)]`;
(async () => {
  await settle();
  setup(0, false); await attack(); ck("no Reversal: nothing happens", oppField() === 3, oppField());
  setup(1, false); const c0 = cnt("opp"), d0 = J(`battle.opp.deck.length`), dr0 = J(`battle.opp.drop.length`); run(pickC); await attack();
  ck("Reversal 1, no Endruler: destroyed to drop (field -1, drop +2 w/ soul, deck same)", oppField() === 2 && J(`battle.opp.deck.length`) === d0 && J(`battle.opp.drop.length`) === dr0 + 2 && cnt("opp") === c0, [oppField(), J(`battle.opp.deck.length`), d0]);
  setup(1, true); ck("Endruler awakened (flag item #5961)", J(`battle.plr.godclock.awakened && battle.plr.item.card.id===5961`));
  const c1 = cnt("opp"), d1 = J(`battle.opp.deck.length`), dr1 = J(`battle.opp.drop.length`); run(pickC); await attack();
  ck("Endruler: bottom of opp deck (deck +1, field -1)", oppField() === 2 && J(`battle.opp.deck.length`) === d1 + 1 && J(`battle.opp.deck[battle.opp.deck.length-1]`) === 572, [oppField(), J(`battle.opp.deck.length`), d1]);
  ck("Endruler: soul to drop, not destroyed + count conserved", J(`battle.opp.drop.length`) === dr1 + 1 && J(`battle.opp.drop.includes(46)`) && cnt("opp") === c1, [J(`battle.opp.drop.length`), dr1]);
  setup(1, true); run(`ABX.hooks.pickCards=()=>[]`); await attack(); ck("Endruler: may decline (up to one)", oppField() === 3, oppField());
  setup(1, false); run(`ABX.hooks.pickCards=()=>[]`); await attack(); ck("non-Endruler: may decline", oppField() === 3, oppField());
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
