// Dead statics batch 4: #348 #5249 #6230 #6237 #6287 #1158 #3328 #5483 #5507 #5380
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async (n = 30) => { for (let i = 0; i < n; i++) { env.flush(); await new Promise(r => setTimeout(r, 3)); } };
run(`globalThis.mkU=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=()=>{ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.showCutin=function(){}; ABX.autoPlay=true; ABX.fast=true;
  const p=battle.plr,e=battle.opp; ["left","center","right"].forEach(z=>{p.monsters[z]=null;e.monsters[z]=null}); p.item=null;e.item=null; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=8; p.hand=[];p.drop=[];e.drop=[]; p.gauge=Array(6).fill(46); p.life=10;e.life=10; };`);
(async () => {
  await settle();
  // #348 Rune Staff
  run(`setup(); battle.plr.item=mkU(348)`);
  ck("#348: Great Spell life cost is 0 with Rune Staff", J(`parseCardCost(CARD_MAP.get(18).cost,CARD_MAP.get(18).skill,battle.plr,CARD_MAP.get(18)).life`) === 0);
  run(`battle.plr.item=null`); ck("#348: without it the life is paid", J(`parseCardCost(CARD_MAP.get(18).cost,CARD_MAP.get(18).skill,battle.plr,CARD_MAP.get(18)).life`) === 1);
  // #5249 infinite power
  run(`setup(); battle.plr.monsters.left=mkU(5249); battle.plr.monsters.center=mkU(5185);`);
  ck("#5249: Shinichi Kudo has infinite power", J(`getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.center).power`) >= 1e9);
  run(`battle.plr.monsters.left=null`); ck("#5249: gone -> normal power", J(`getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.center).power`) < 1e6);
  // #3328 Lifelink -1
  run(`setup(); battle.plr.item=mkU(3328); battle.plr.monsters.center=mkU(255); battle.plr.life=10; battle.destroyMonster('plr','center')`); await settle(5);
  ck("#3328: Demon Lord Lifelink 2 deals 1", J(`battle.plr.life`) === 9, J(`battle.plr.life`));
  run(`setup(); battle.plr.monsters.center=mkU(255); battle.plr.life=10; battle.destroyMonster('plr','center')`); await settle(5);
  ck("#3328 control: no wand -> 2", J(`battle.plr.life`) === 8, J(`battle.plr.life`));
  // #1158 Fairy King
  const hf = J(`[...CARD_MAP.values()].filter(c=>(c.attrs||[]).some(a=>/^(hero|fairy)$/i.test(a))).slice(0,7).map(c=>c.id)`);
  run(`setup(); battle.plr.monsters.center=mkU(1158); battle.opp.monsters.center=mkU(149); battle.plr.drop=${JSON.stringify(hf)}; ABX.syncFrontNullify();`);
  ck("#1158: 7 Hero/Fairy in drop -> opp monsters nullified", J(`battle.opp.monsters.center.abxNullified===battle.turnCount && battle.plr.monsters.center.abxNullified!==battle.turnCount`));
  run(`battle.plr.drop=battle.plr.drop.slice(0,6); ABX.syncFrontNullify();`);
  ck("#1158: 6 -> restored", J(`battle.opp.monsters.center.abxNullified!==battle.turnCount`));
  // #5483 / #5507 face-down buddy zone
  run(`setup(); battle.plr.monsters.center=mkU(5483); battle.plr.buddyZoneFaceDown=[46]; battle.opp.monsters.center=mkU(149,[46,46]); battle.opp.monsters.center.card=Object.assign({},CARD_MAP.get(149),{sg:true}); battle.activeSide='plr'; battle._destroyByAttack=false; battle.destroyMonster('opp','center')`); await settle(5);
  ck("#5483: face-down buddy card -> opp Soulguard nullified (monster destroyed, souls kept out)", J(`!battle.opp.monsters.center`), J(`battle.opp.monsters.center&&1`));
  run(`setup(); battle.plr.monsters.center=mkU(5507); battle.plr.buddyZoneFaceDown=[46,46,46];`);
  const st = J(`getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.center)`);
  run(`battle.plr.buddyZoneFaceDown=[];`); const st0 = J(`getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.center)`);
  ck("#5507: 3 face-down -> +5000/+5000/+1 crit/Triple Attack", st.power === st0.power + 5000 && st.defense === st0.defense + 5000 && st.crit === st0.crit + 1 && !!st.ta && !st0.ta, [st, st0]);
  // #5380 souls cannot be dropped by opponent effects
  run(`setup(); battle.plr.monsters.center=mkU(5380); battle.plr.monsters.left=mkU(5379,[46]); `);
  ck("#5380: Pastel*Palettes souls protected from the opponent's effects", J(`ABX.core.isProtected(battle.plr.monsters.left,'plr','souls dropped',{side:'opp'})`) === true && J(`ABX.core.isProtected(battle.plr.monsters.left,'plr','souls dropped',{side:'plr'})`) === false);
  // #6287 nullify all opp abilities during the battle; restored after
  run(`setup(); battle.plr.monsters.center=mkU(6287); battle.opp.monsters.center=mkU(149); battle.opp.monsters.left=mkU(149); ABX.applyBattleNullify('plr',[battle.plr.monsters.center],'opp',battle.opp.monsters.center);`);
  ck("#6287: all opp cards nullified during the battle", J(`battle.opp.monsters.center.abxNullified===battle.turnCount && battle.opp.monsters.left.abxNullified===battle.turnCount`));
  run(`ABX.clearBattleNullify()`); ck("#6287: restored after the battle", J(`battle.opp.monsters.center.abxNullified!==battle.turnCount && battle.opp.monsters.left.abxNullified!==battle.turnCount`));
  // #6237 opponent cannot call during that battle
  run(`setup(); battle.plr.monsters.center=mkU(6237); battle.opp.hand=[149]; ABX.applyBattleNullify('plr',[battle.plr.monsters.center],'opp',null);`);
  ck("#6237: opp cannot call during the battle", J(`evaluateCardConditions(CARD_MAP.get(149),battle.opp,battle.plr).met`) === false);
  run(`ABX.clearBattleNullify()`); ck("#6237: can call again afterwards", J(`evaluateCardConditions(CARD_MAP.get(149),battle.opp,battle.plr).reasons.every(r=>!/Robo-Emperor/.test(r))`));
  // #6230 alone: damage cannot be reduced
  run(`setup(); battle.plr.monsters.center=mkU(6230);`);
  ck("#6230: alone attack is unreducible", J(`ABX.attackUnreducible('plr',[{unit:battle.plr.monsters.center}])`) === true && J(`ABX.attackUnreducible('plr',[{unit:battle.plr.monsters.center},{unit:mkU(149)}])`) === false);
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
