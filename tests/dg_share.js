// #6014 Godagito [Spiral DG-Share]
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
run(`globalThis.mk=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};["left","center","right"].forEach(z=>{battle.plr.monsters[z]=null});battle.plr.item=null;battle.turnCount=6;};`);
// a D-Share card with Double Attack / Move to inherit (6014 has Penetrate+TA itself)
const ds = J(`[...CARD_MAP.values()].find(c=>/\\[d-share\\]/i.test(c.skill||"")&&c.id!==6014&&/\\[double attack\\]/i.test(c.skill)).id`);
const dsSkill = J(`CARD_MAP.get(${ds}).skill`);
const kw = "da";
run(`fresh(); battle.plr.monsters.left=mk(6014,[${ds}])`);
ck("not on center: no inherited keyword", J(`!getUnitEffectiveCombatStats(battle.plr,battle.plr.monsters.left).${kw}`) || J(`!ABX.staticBonus(battle.plr,battle.plr.monsters.left).${kw}`));
run(`fresh(); battle.plr.monsters.center=mk(6014,[${ds}])`);
ck("on center: inherits [D-Share] keyword " + kw, J(`!!ABX.staticBonus(battle.plr,battle.plr.monsters.center).${kw}`));
const big = J(`[...CARD_MAP.values()].find(c=>c.type==="Monster"&&c.size===3&&!c.skill.includes("size")).id`);
run(`fresh(); battle.plr.monsters.left=mk(${big}); battle.plr.monsters.right=mk(${big})`); const s0 = J(`getEffectiveCardSize(battle.plr,battle.plr.monsters.left.card,battle.plr.monsters.left)`);
run(`battle.plr.monsters.center=mk(6014)`);
ck("left/right size -1 with it on center", J(`getEffectiveCardSize(battle.plr,battle.plr.monsters.left.card,battle.plr.monsters.left)`) === s0 - 1 && J(`getEffectiveCardSize(battle.plr,battle.plr.monsters.right.card,battle.plr.monsters.right)`) === s0 - 1, s0);
run(`battle.plr.monsters.center.abxNullified=battle.turnCount`); ck("nullified: no size reduction", J(`getEffectiveCardSize(battle.plr,battle.plr.monsters.left.card,battle.plr.monsters.left)`) === s0);
run(`battle.plr.monsters.center.abxNullified=0; battle.plr.monsters.center=null; battle.plr.monsters.left=mk(6014)`); ck("on left, not center: no effect on others", J(`getEffectiveCardSize(battle.plr,battle.plr.monsters.right.card,battle.plr.monsters.right)`) === s0);
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
