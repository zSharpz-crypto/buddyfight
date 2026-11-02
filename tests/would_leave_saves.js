// Would-leave replacements: #5395 (Band), #5695 (item), #2521 (impact monster soul)
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
run(`globalThis.mk=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};const p=battle.plr;["left","center","right"].forEach(z=>{p.monsters[z]=null});p.item=null;p.item2=null;p.drop=[];p.life=8;battle.turnCount=6;};`);
const band = J(`[...CARD_MAP.values()].find(c=>c.type==="Monster"&&(c.attrs||[]).some(a=>/^band$/i.test(a))&&c.id!==5395).id`);
const im = J(`[...CARD_MAP.values()].find(c=>IMX.isImpactMonster(c)&&c.id!==2521).id`);
const item = J(`[...CARD_MAP.values()].find(c=>c.type==="Item"&&c.id!==5695).id`);
// 5395
run(`fresh(); battle.plr.monsters.left=mk(${band}); battle.plr.drop=[5395]; globalThis.d0=battle.plr.deck.length`);
ck("#5395: Band would leave -> saved", J(`ABX.wouldLeaveSave('plr','left',battle.plr.monsters.left,false)`) === true);
ck("#5395: card from drop to deck, 1 life paid", J(`battle.plr.drop.length===0 && battle.plr.deck.length===d0+1 && battle.plr.life===7`));
run(`fresh(); battle.plr.monsters.left=mk(${band}); battle.plr.drop=[]`); ck("#5395: not in drop -> no save", J(`!ABX.wouldLeaveSave('plr','left',battle.plr.monsters.left,false)`));
// 5695
run(`fresh(); battle.plr.item=mk(${item}); battle.plr.monsters.center=mk(5695)`);
ck("#5695: item would leave -> saved", J(`ABX.wouldLeaveSave('plr','item',battle.plr.item,false)`) === true);
ck("#5695: Miko goes field -> drop", J(`!battle.plr.monsters.center && battle.plr.drop.includes(5695)`));
run(`fresh(); battle.plr.item=mk(${item})`); ck("#5695: not on field -> no save", J(`!ABX.wouldLeaveSave('plr','item',battle.plr.item,false)`));
// 2521
run(`fresh(); battle.plr.monsters.center=mk(${im},[2521])`);
ck("#2521: impact monster with it in soul -> saved", J(`ABX.wouldLeaveSave('plr','center',battle.plr.monsters.center,false)`) === true);
ck("#2521: soul -> drop", J(`battle.plr.monsters.center.soul.length===0 && battle.plr.drop.includes(2521)`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
