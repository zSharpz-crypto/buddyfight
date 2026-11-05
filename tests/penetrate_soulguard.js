// [Penetrate] still deals its damage to the opponent when the center monster survives the attack through [Soulguard] (the attack was not nullified).
//   node tests/penetrate_soulguard.js
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true; battle.animateAttackStrike=function(a,b,c,d,e,cb){ if(cb) cb(); }; battle.animateCardFlight=function(a,b,c,d,e,cb){ if(cb) cb(); };
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; f.maxSize=99; } battle.plr.gauge=[1,2,3]; battle.opp.gauge=[1,2,3]; battle.matchOver=false; battle.activeSide="opp"; battle.phase="attack"; battle.turnCount++; };`);
const PEN = 4288;   // Gung Gardra: Power 15000, Critical 2, [Penetrate]
const CRIT = J(`CARD_MAP.get(${PEN}).crit`);
// resolve one attack of PEN (opp) on plr's monster at `pos`; the defender may have [Soulguard] (tempSG) and N soul cards
const attack = (pos, { sg, soul, def, pen = true }) => {
  run(`clear(); battle.plr.life=10; battle.plr.monsters.${pos}=mku(45); { const d=battle.plr.monsters.${pos}; d.tempSG=${!!sg}; d.soul=${JSON.stringify(Array(soul).fill(46))}; ${def != null ? `d.tempDef=${def};` : ""} }
    battle.opp.monsters.left=mku(${PEN}); globalThis.__pen=${pen}`);
  run(`globalThis.__units=[{zone:"left",unit:battle.opp.monsters.left}]; globalThis.__r=battle.resolveMonsterVsMonster("opp",__units,"plr","${pos}",15000,${CRIT},__pen)`);
  return J(`({life:battle.plr.life, still:!!battle.plr.monsters.${pos}, soul:battle.plr.monsters.${pos}?battle.plr.monsters.${pos}.soul.length:null, destroyed:__r})`);
};
let r = attack("center", { sg: true, soul: 2 });
ok(r.still === true && r.soul === 1, `Soulguard saves the center monster (soul 2 -> ${r.soul})`);
ok(r.life === 10 - CRIT, `...and Penetrate still deals ${CRIT} damage to the player (life ${r.life})`);
r = attack("center", { sg: false, soul: 0 });
ok(r.still === false && r.life === 10 - CRIT, `no Soulguard: destroyed + Penetrate damage as before (life ${r.life})`);
r = attack("center", { sg: true, soul: 0 });
ok(r.still === false && r.life === 10 - CRIT, `Soulguard with no soul left: destroyed + Penetrate damage (life ${r.life})`);
r = attack("center", { sg: true, soul: 2, pen: false });
ok(r.still === true && r.life === 10, `Soulguard, attacker WITHOUT Penetrate: no damage (life ${r.life})`);
r = attack("center", { sg: true, soul: 2, def: 99999 });
ok(r.still === true && r.soul === 2 && r.life === 10, `defense higher than the power: Soulguard not used, no Penetrate damage (soul ${r.soul}, life ${r.life})`);
r = attack("left", { sg: true, soul: 2 });
ok(r.still === true && r.life === 10, `Soulguard monster on the LEFT: Penetrate only works on the center, no damage (life ${r.life})`);
// whole attack through the game flow (declare, defense window, strike, outcome)
(async () => {
  const settle = async () => { for (let i = 0; i < 60; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
  run(`clear(); battle.plr.life=10; battle.plr.monsters.center=mku(45); { const d=battle.plr.monsters.center; d.tempSG=true; d.soul=[46,46]; } battle.opp.monsters.left=mku(${PEN}); globalThis.__oc=null; { const o=ABX.fireAttackOutcome; ABX.fireAttackOutcome=function(a,u,d,oc){ globalThis.__oc=oc; return o.apply(this,arguments); }; }`);
  run(`battle.initiateAttackWithDefenseCheck('opp',['left'],'center')`); await settle();
  const f = J(`({life:battle.plr.life, still:!!battle.plr.monsters.center, soul:battle.plr.monsters.center&&battle.plr.monsters.center.soul.length, oc:__oc})`);
  ok(f.still && f.soul === 1 && f.life === 10 - CRIT, `full attack flow: Soulguard used, monster stays, player takes ${CRIT} Penetrate damage (life ${f.life}, soul ${f.soul})`);
  ok(f.oc && f.oc.destroyedMonster === false && f.oc.dealtDamage === true, `attack outcome: monster not destroyed, damage dealt (${JSON.stringify(f.oc)})`);
  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
})();
