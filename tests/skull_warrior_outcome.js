// #6494 "To Darkness" and #4788 Magatsu Flames: Skull Warrior deals damage -> may destroy it for an effect
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async (n = 40) => { for (let i = 0; i < n; i++) { env.flush(); await new Promise(r => setTimeout(r, 3)); } };
run(`globalThis.mk=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=(srcId)=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};battle.showCutin=function(){};ABX.autoPlay=true;ABX.fast=true;
  const p=battle.plr,e=battle.opp;["left","center","right"].forEach(z=>{p.monsters[z]=null;e.monsters[z]=null});p.item=null;battle.turnCount=6;battle.activeSide='plr';battle.phase='attack';
  p.monsters.center=mk(srcId);p.monsters.left=mk(globalThis.SW);e.life=10;e.hand=[149,149];e.gauge=[46,46,46];e.drop=[];p.life=8;p.hand=[];p.gauge=[46];};`);
(async () => {
const SW = J(`[...CARD_MAP.values()].find(c=>c.type==="Monster"&&(c.attrs||[]).some(a=>/^skullwarrior$/i.test(a))&&c.id!==6494&&c.id!==4788&&c.power>0).id`);
run(`globalThis.SW=${SW}`);
// 6494
run(`fresh(6494); globalThis.h0=battle.plr.hand.length; globalThis.g0=battle.plr.gauge.length; battle.executeAttackResolution('plr',['left'],'fighter');`); await settle();
ck("#6494: opponent took damage", J(`battle.opp.life`) < 10, J(`battle.opp.life`));
ck("#6494: Skull Warrior destroyed", J(`!battle.plr.monsters.left`));
ck("#6494: +1 gauge, +1 life, drew 1 (life 9 = 8+1)", J(`battle.plr.gauge.length===g0+1 && battle.plr.life===9 && battle.plr.hand.length===h0+1`), J(`[battle.plr.gauge.length,g0,battle.plr.life,battle.plr.hand.length,h0]`));
// 4788
run(`fresh(4788); globalThis.og=battle.opp.gauge.length; battle.executeAttackResolution('plr',['left'],'fighter');`); await settle();
ck("#4788: attacker destroyed", J(`!battle.plr.monsters.left`));
ck("#4788: opp gauge -1, hand -1", J(`battle.opp.gauge.length===og-1 && battle.opp.hand.length===1`), J(`[battle.opp.gauge.length,og,battle.opp.hand.length]`));
// no source: attacker survives
run(`fresh(149); battle.executeAttackResolution('plr',['left'],'fighter');`); await settle();
ck("no source card: Skull Warrior survives", J(`!!battle.plr.monsters.left`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
