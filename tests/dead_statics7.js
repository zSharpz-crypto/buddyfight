// Batch 7: #2693 #3638 #4192 #5690
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
run(`globalThis.mk=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};["left","center","right"].forEach(z=>{battle.plr.monsters[z]=null;battle.opp.monsters[z]=null});battle.plr.item=null;battle.turnCount=6;};`);
// 2693
run(`fresh(); battle.plr.monsters.center=mk(2693,[149])`);
ck("#2693 soul protected from opp effects", J(`ABX.core.isProtected(battle.plr.monsters.center,'plr','souls dropped',{side:'opp'})`) === true && J(`ABX.core.isProtected(battle.plr.monsters.center,'plr','souls dropped',{side:'plr'})`) === false);
// 3638
run(`fresh(); battle.plr.monsters.center=mk(3638); battle.opp.monsters.center=mk(149); battle.opp.monsters.left=mk(149); ABX.syncFrontNullify()`);
ck("#3638 nullifies only the monster in front", J(`battle.opp.monsters.center.abxNullified===battle.turnCount && battle.opp.monsters.left.abxNullified!==battle.turnCount`));
run(`battle.plr.monsters.center=null; ABX.syncFrontNullify()`); ck("#3638 gone -> restored", J(`battle.opp.monsters.center.abxNullified!==battle.turnCount`));
// 4192
const rs3 = J(`[...CARD_MAP.values()].find(c=>c.size===3&&(c.attrs||[]).some(a=>/^ragingspirits$/i.test(a))&&c.id!==4192).id`);
run(`fresh(); battle.plr.monsters.left=mk(4192)`);
ck("#4192 size 3 Raging Spirits lifelink nullified", J(`ABX.lifelinkReduce('plr',CARD_MAP.get(${rs3}))`) >= 99);
run(`battle.plr.monsters.left=null`); ck("#4192 gone -> lifelink intact", J(`ABX.lifelinkReduce('plr',CARD_MAP.get(${rs3}))`) === 0);
// 5690
run(`fresh(); battle.plr.monsters.left=mk(5690)`); const s0 = J(`getEffectiveCardSize(battle.plr,CARD_MAP.get(5690),battle.plr.monsters.left)`);
run(`battle.plr.monsters.right=mk(2693)`); ck("#5690 size -1 with an originally size 3 monster", J(`getEffectiveCardSize(battle.plr,CARD_MAP.get(5690),battle.plr.monsters.left)`) === s0 - 1, s0);
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
