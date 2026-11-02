// [D-Share] sharing between cards on the same field + #5041's [D] [Counter][Act]
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
run(`globalThis.mk=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};["left","center","right"].forEach(z=>{battle.plr.monsters[z]=null;battle.opp.monsters[z]=null});battle.plr.item=null;battle.turnCount=6;};
 globalThis.sh=(id)=>ABX.get(CARD_MAP.get(id)).abilities.filter(a=>a.sharedFrom).map(a=>a.sharedFrom);`);
// 4318 has [D] "When this card attacks ... Double Attack"; 4322 has [D] "During your turn power+2000"
run(`fresh(); battle.plr.monsters.left=mk(4318); battle.plr.monsters.center=mk(4322)`);
ck("4318 gets 4322's [D]; 4322 gets 4318's [D]", J(`sh(4318).includes(4322) && sh(4322).includes(4318)`), J(`[sh(4318),sh(4322)]`));
run(`battle.plr.monsters.center=null`); ck("alone: nothing shared", J(`sh(4318).length===0`));
run(`fresh(); battle.plr.monsters.left=mk(4318); battle.opp.monsters.center=mk(4322)`); ck("other side's card does not share", J(`sh(4318).length===0 || !sh(4318).includes(4322)`));
run(`fresh(); battle.plr.monsters.left=mk(4318); battle.plr.monsters.center=mk(4322); battle.plr.monsters.center.abxNullified=battle.turnCount`); ck("nullified source does not share", J(`!sh(4318).includes(4322)`));
// 5041 [D] act parses as a real counter act
const a5041 = J(`ABX.get(CARD_MAP.get(5041)).abilities.filter(a=>a.kind==="act").map(a=>a.steps.map(s=>s.op).join("+"))`);
ck("#5041 [D] is an [Act] (pay + stand)", a5041.length === 1 && /pay/.test(a5041[0]) && /stand/.test(a5041[0]), a5041);
// a shared Act: another D-Share card on the field gets 5041's act
run(`fresh(); battle.plr.monsters.left=mk(4318); battle.plr.monsters.center=mk(5041)`);
ck("#5041's [D] Act is shared to 4318", J(`ABX.get(CARD_MAP.get(4318)).abilities.some(a=>a.kind==="act"&&a.sharedFrom===5041)`));
// functional: 4322's [D] "During your turn, this card gets power+2000" applies to 4318 while 4322 is on the field
run(`fresh(); battle.activeSide='plr'; battle.phase='main'; battle.plr.monsters.left=mk(4318)`); const p0 = J(`getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.left).power`);
run(`battle.plr.monsters.center=mk(4322)`); const p1 = J(`getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.left).power`);
ck("shared [D] power+2000 applies (my turn)", p1 === p0 + 2000, [p0, p1]);
run(`battle.activeSide='opp'`); ck("not on the opponent's turn", J(`getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.left).power`) === p0);
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
