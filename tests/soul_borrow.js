// Soul-ability borrowing: #2562 #2608 #6477 (impact monsters w/o Gemclone), #4436 (size 5 Battleship), #5269 (size<=2 Dangerous Veggies)
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
run(`globalThis.mk=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};["left","center","right"].forEach(z=>{battle.plr.monsters[z]=null;battle.opp.monsters[z]=null});battle.turnCount=6;};
 globalThis.abs=(id)=>ABX.get(CARD_MAP.get(id)).abilities.filter(a=>!["cost","keyword","reminder","rule"].includes(a.kind));
 globalThis.pick=(f)=>[...CARD_MAP.values()].find(f);`);
const im = J(`(()=>{const c=pick(c=>IMX.isImpactMonster(c)&&!/gemclone/i.test(c.name)&&ABX.get(c).abilities.some(a=>a.kind==="triggered"||a.kind==="static")); return c&&c.id})()`);
const gem = J(`(()=>{const c=pick(c=>IMX.isImpactMonster(c)&&/gemclone/i.test(c.name)&&c.id!==2562&&c.id!==2608&&c.id!==6477); return c&&c.id})()`);
const bs = J(`(()=>{const c=pick(c=>c.size===5&&(c.attrs||[]).some(a=>/^battleship$/i.test(a))&&ABX.get(c).abilities.some(a=>a.kind==="triggered"||a.kind==="act")); return c&&c.id})()`);
const dv = J(`(()=>{const c=pick(c=>c.size<=2&&(c.attrs||[]).some(a=>/^dangerous ?veggies$/i.test(a))&&c.id!==5269&&ABX.get(c).abilities.some(a=>a.kind==="triggered"||a.kind==="act"||a.kind==="static")); return c&&c.id})()`);
ck("fixtures found", im && gem && bs && dv, { im, gem, bs, dv });
for (const id of [2562, 2608, 6477]) {
  run(`fresh(); battle.plr.monsters.center=mk(${id},[${im}])`); const withS = J(`abs(${id}).some(a=>a.borrowedFrom===${im})`);
  run(`fresh(); battle.plr.monsters.center=mk(${id},[${gem}])`); const gemS = J(`abs(${id}).some(a=>a.borrowedFrom===${gem})`);
  run(`fresh(); battle.plr.monsters.center=mk(${id},[])`); const noS = J(`abs(${id}).some(a=>a.borrowedFrom)`);
  ck(id + ": borrows non-Gemclone impact monster in soul, not Gemclone", withS && !gemS && !noS, { withS, gemS, noS });
}
run(`fresh(); battle.plr.monsters.center=mk(4436,[${bs}])`); ck("4436 borrows size-5 Battleship", J(`abs(4436).some(a=>a.borrowedFrom===${bs})`));
run(`fresh(); battle.plr.monsters.center=mk(4436,[${im}])`); ck("4436 ignores others", !J(`abs(4436).some(a=>a.borrowedFrom)`));
run(`fresh(); battle.plr.monsters.center=mk(5269,[${dv}])`); ck("5269 borrows Dangerous Veggies size<=2", J(`abs(5269).some(a=>a.borrowedFrom===${dv})`));
run(`battle.plr.monsters.center.abxNullified=battle.turnCount`); ck("nullified -> no borrow", !J(`abs(5269).some(a=>a.borrowedFrom)`));
run(`fresh(); battle.plr.monsters.center=null`); ck("off the field -> no borrow", !J(`abs(5269).some(a=>a.borrowedFrom)`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
