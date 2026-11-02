// Batch 9: #5132 #6058 Galaxy F, #4982, #2465
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
run(`globalThis.mk=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};["left","center","right"].forEach(z=>{battle.plr.monsters[z]=null;battle.opp.monsters[z]=null});battle.plr.item=null;battle.plr.item2=null;battle.turnCount=6;};
 globalThis.sb=(u)=>ABX.staticBonus(battle.plr,u);`);
const astro = J(`[...CARD_MAP.values()].find(c=>c.type==="Monster"&&(c.attrs||[]).some(a=>/^astrodragon$/i.test(a))&&c.id!==5132&&c.id!==6058).id`);
// #5132 / #6058 stat bullets already work (parsed as conditional statics): lock in the exact single-count values
run(`fresh(); battle.plr.monsters.center=mk(5132); battle.plr.monsters.left=mk(${astro}); battle.plr.monsters.right=mk(${astro})`);
ck("#5132: center def+10000 / crit+2, left def+10000, right crit+2 (single count)", J(`(()=>{const c=sb(battle.plr.monsters.center),l=sb(battle.plr.monsters.left),r=sb(battle.plr.monsters.right);return c.defense===10000&&c.crit===2&&l.defense===10000&&l.crit===0&&r.crit===2&&r.defense===0})()`));
run(`fresh(); battle.plr.monsters.center=mk(6058); battle.plr.monsters.left=mk(149); battle.plr.monsters.right=mk(149)`);
ck("#6058: with monsters left+right -> CA, Pen, power/def +10000 (single count)", J(`(()=>{const l=sb(battle.plr.monsters.left);return l.ca&&l.pen&&l.power===10000&&l.defense===10000})()`));
run(`battle.plr.item=mk(${J(`[...CARD_MAP.values()].find(c=>c.type==="Item").id`)})`);
ck("#6058: item equipped -> cards cannot be rested by opp effects", J(`ABX.core.isProtected(battle.plr.monsters.left,'plr','rest',{side:'opp'})`) === true && J(`ABX.core.isProtected(battle.plr.monsters.left,'plr','rest',{side:'plr'})`) === false);
run(`battle.plr.item=null`); ck("#6058: no item -> no rest protection", J(`!ABX.core.isProtected(battle.plr.monsters.left,'plr','rest',{side:'opp'})`));
// 4982
run(`fresh(); battle.plr.monsters.left=mk(149,[4982])`);
ck("#4982: soul undroppable by opp effects only", J(`ABX.core.isProtected(battle.plr.monsters.left,'plr','souls dropped',{side:'opp'})`) === true && J(`ABX.core.isProtected(battle.plr.monsters.left,'plr','souls dropped',{side:'plr'})`) === false);
// 2465
run(`fresh(); battle.opp.monsters.center=mk(149,[2465]); battle.opp.monsters.center.card=Object.assign({},CARD_MAP.get(149),{name:"Zodiac Test"}); battle.activeSide='plr'; battle.phase='final'`);
ck("#2465: opp's final phase -> hand card blocked", J(`evaluateCardConditions(CARD_MAP.get(149),battle.plr,battle.opp).met`) === false);
ck("#2465: [Act] blocked", J(`ABX.canUseAct('plr',CARD_MAP.get(149),{},null).ok`) === false);
run(`battle.phase='main'`); ck("#2465: other phases -> not blocked by it", J(`evaluateCardConditions(CARD_MAP.get(149),battle.plr,battle.opp).reasons.every(r=>!/Dragoneraser/.test(r))`));
// #6433: during the opponent's attack phase, nullify all opp monsters and items
run(`fresh(); battle.plr.monsters.center=mk(6433); battle.opp.monsters.center=mk(149); battle.opp.item=mk(${J(`[...CARD_MAP.values()].find(c=>c.type==="Item").id`)}); battle.activeSide='opp'; battle.phase='attack'; ABX.syncFrontNullify()`);
ck("#6433: opp attack phase -> opp monster and item nullified", J(`battle.opp.monsters.center.abxNullified===battle.turnCount && battle.opp.item.abxNullified===battle.turnCount && battle.plr.monsters.center.abxNullified!==battle.turnCount`));
run(`battle.activeSide='plr'; battle.phase='attack'; ABX.syncFrontNullify()`); ck("#6433: own attack phase -> restored", J(`battle.opp.monsters.center.abxNullified!==battle.turnCount && battle.opp.item.abxNullified!==battle.turnCount`));
// #6274: Kuwagata protected from opponent's spell (event) effects only
const kw = J(`[...CARD_MAP.values()].find(c=>c.type==="Monster"&&(c.attrs||[]).some(a=>/^kuwagata$/i.test(a))&&c.id!==6274).id`);
run(`fresh(); battle.plr.monsters.center=mk(6274); battle.plr.monsters.left=mk(${kw})`);
const spell = J(`[...CARD_MAP.values()].find(c=>c.type==="Spell").id`);
ck("#6274: protected from opp spell destroy/return", J(`ABX.core.isProtected(battle.plr.monsters.left,'plr','destroyed',{side:'opp',card:CARD_MAP.get(${spell})}) && ABX.core.isProtected(battle.plr.monsters.left,'plr','returned to hand',{side:'opp',card:CARD_MAP.get(${spell})})`));
ck("#6274: not from opp monster effects", J(`!ABX.core.isProtected(battle.plr.monsters.left,'plr','destroyed',{side:'opp',card:CARD_MAP.get(149)})`));
run(`battle.plr.monsters.center=null`); ck("#6274: gone -> no protection", J(`!ABX.core.isProtected(battle.plr.monsters.left,'plr','destroyed',{side:'opp',card:CARD_MAP.get(${spell})})`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
