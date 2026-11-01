// Overgod "0" [Act] "Eternal Eon": stops the opponent and ALL their cards' abilities this turn (not just [Counter])
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log("FAIL", n, JSON.stringify(x ?? "")); };
run(`battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; ABX.autoPlay=true; ABX.fast=true;
 const mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 const p=battle.plr,o=battle.opp; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=8;
 o.monsters.center=mk(CARD_MAP.get(149)); o.gauge=Array(3).fill(46); o.monsters.left=mk(CARD_MAP.get(5706)); o.monsters.right=null; o.callLimitUsed={};
 p.godclock.overgodActive=true; p.hand=[6202,46,46]; p.gauge=Array(6).fill(46); globalThis.__oc=ABX.core.abilitiesOf(CARD_MAP.get(149),a=>a.kind==="act")[0];`);
ck("before: opp act usable", J(`ABX.canUseAct('opp',CARD_MAP.get(149),__oc,battle.opp.monsters.center).ok`) === true);
run(`battle.activateOvergodEternalEon('plr')`);
ck("opp monsters' abilities nullified this turn", J(`battle.opp.monsters.center.abxNullified===battle.turnCount && battle.opp.monsters.left.abxNullified===battle.turnCount`));
ck("opp act not usable", J(`ABX.canUseAct('opp',CARD_MAP.get(149),__oc,battle.opp.monsters.center)`).ok === false);
ck("opp still cannot counter", J(`battle.opp.timeStoppedThisTurn`) === true);
ck("own abilities unaffected", J(`battle.plr.abxTimeStop!==battle.turnCount`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
