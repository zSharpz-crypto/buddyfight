// Cast rules with several tribes / [Set]: #1745 ("«A» and a «B»"), #6344 ("«A» or «B»"), #3352 ("«X» [Set]").
//   node tests/godpunk3.js
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){};
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clr=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.setSpells=[]; f.hand=[]; f.life=10; } battle.plr.gauge=[1,2,3,4,5,6,7,8]; battle.phase="main"; battle.activeSide="plr"; };`);
const castable = (id) => J(`evaluateCardConditions(CARD_MAP.get(${id}), battle.plr, battle.opp).met`);
const put = (pos, id) => run(`battle.plr.monsters.${pos}=mku(${id})`);
const ARMOR = 528, KNIGHT = 550, NEO = 1097, HERO = 944, PLAIN = 45;
// #1745 needs an «Armordragon» AND a «Dragon Knight»
run(`clr()`); ok(castable(1745) === false, "#1745 not castable with an empty field");
run(`clr()`); put("left", ARMOR); ok(castable(1745) === false, "#1745 not castable with only an Armordragon");
run(`clr()`); put("left", KNIGHT); ok(castable(1745) === false, "#1745 not castable with only a Dragon Knight");
run(`clr()`); put("left", ARMOR); put("right", KNIGHT); ok(castable(1745) === true, "#1745 castable with both");
// #6344 needs a «Neodragon» OR «Superhero»
run(`clr()`); ok(castable(6344) === false, "#6344 not castable with an empty field");
run(`clr()`); put("left", PLAIN); ok(castable(6344) === false, "#6344 not castable with an unrelated monster");
run(`clr()`); put("left", HERO); ok(castable(6344) === true, "#6344 castable with only a Superhero");
run(`clr()`); put("left", NEO); ok(castable(6344) === true, "#6344 castable with only a Neodragon");
// #3352 needs a «Black Dragon» [Set] (a Set spell on your field, not a monster)
run(`clr()`); ok(castable(3352) === false, "#3352 not castable with nothing");
run(`clr()`); put("left", 535); ok(castable(3352) === false, "#3352 not castable with only a Black Dragon monster (not a [Set])");
run(`clr()`); run(`battle.plr.setSpells=[CARD_MAP.get(2210)]`); ok(castable(3352) === true, "#3352 castable with a Black Dragon [Set] spell");
run(`clr()`); run(`battle.plr.setSpells=[CARD_MAP.get(4382)]`); ok(castable(3352) === false, "#3352 not castable with a non-Black Dragon [Set]");
// regression: "two or more «X» monsters ... and an «X» item" (#4380) still goes through the old count check
run(`clr()`); ok(castable(4380) === false, "#4380 not castable with an empty field (old two-or-more check kept)");
console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
