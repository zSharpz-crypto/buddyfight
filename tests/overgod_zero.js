// #6202 Overgod "0" hand [Act]: blocked before Endruler awakening, works after, card counts conserved.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const total = () => J(`(function(f){let n=f.hand.length+f.drop.length+f.deck.length+f.gauge.length; ['left','center','right'].forEach(p=>{const m=f.monsters[p]; if(m) n+=1+(m.soul||[]).length;}); return n;})(battle.plr)`);
const act = () => run(`ABX.runHandUse('plr', battle.plr.hand.indexOf(6202), ABX.handUseActs(CARD_MAP.get(6202))[0], ()=>{})`);
(async () => {
  await settle();
  run(`{battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true; battle.plr.hand.push(6202); battle.activeSide='plr'; battle.phase='main';}`);
  await settle();
  ck("ABX hand-use act is the Reversal act (op r40OvergodZero)", J(`ABX.handUseActs(CARD_MAP.get(6202)).length===1 && ABX.handUseActs(CARD_MAP.get(6202))[0].steps[0].op==='r40OvergodZero'`));
  let c0 = total(), flag0 = J(`battle.plr.flagId`);
  act(); await settle();
  ck("blocked before awakening", !J(`!!battle.plr.godclock.overgodActive`) && J(`battle.plr.hand.includes(6202)`) && J(`battle.plr.flagId`) === flag0 && total() === c0);
  run(`{const g=battle.plr.godclock; g.awakened=true; g.reversalCount=4; battle.plr.flagId=5961;}`);
  const hand0 = J(`battle.plr.hand.filter(x=>x===6202).length`);
  act(); await settle();
  ck("works after awakening: on flags, crit 12", J(`battle.plr.flagId===6202 && battle.plr.godclock.overgodActive===true && battle.plr.item.card.crit===12 && battle.plr.item.isOvergodZero===true`));
  ck("left hand, no duplicate", J(`battle.plr.hand.filter(x=>x===6202).length`) === hand0 - 1 && !J(`battle.plr.drop.includes(6202)`));
  // card counts: hand card moves onto flags (-1 from counted zones)
  ck("card counts conserved (-1 to flag)", total() === c0 - 1, [total(), c0]);
  run(`battle.plr.hand.push(6202)`); const c1 = total();
  act(); await settle();
  ck("second use blocked once active", J(`battle.plr.hand.includes(6202)`) && total() === c1);
  run(`battle.plr.hand.push(6202)`); const c2 = total(), rc2 = J(`battle.plr.godclock.reversalCount`), n2 = J(`battle.plr.hand.filter(x=>x===6202).length`);
  run(`battle.activateOvergodZeroFromHand('plr', battle.plr.hand.indexOf(6202))`); run(`battle.activateOvergodZeroFromHand('plr', battle.plr.hand.indexOf(6202))`);
  ck("direct call while active: no consume, reversalCount same", total() === c2 && J(`battle.plr.godclock.reversalCount`) === rc2 && J(`battle.plr.hand.filter(x=>x===6202).length`) === n2);
  ck("canUseHandAct not ok while active", J(`ABX.canUseHandAct('plr', battle.plr.hand.indexOf(6202), ABX.handUseActs(CARD_MAP.get(6202))[0]).ok`) === false);
  run(`{const g=battle.plr.godclock; g.overgodActive=false; g.awakened=false;}`);
  ck("canUseHandAct not ok before awakening", J(`ABX.canUseHandAct('plr', battle.plr.hand.indexOf(6202), ABX.handUseActs(CARD_MAP.get(6202))[0]).ok`) === false);
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
