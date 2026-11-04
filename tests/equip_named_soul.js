// #5736 Messiah Arms, Siegblade: [Equip Cost] put a "Projection Shell, "Sigurd"" and a "Heroical Armor, "Gram"" from your field into its soul & pay 2 gauge.
//   node tests/equip_named_soul.js
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; } battle.plr.gauge=[1,2,3,4,5,6,7,8]; battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; battle.turnCount++; };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const SIGURD = 5734, GRAM = 5735, SIEG = 5736;
const equip = async () => { run(`battle.plr.hand=[${SIEG}]; globalThis.__g=battle.plr.gauge.length`); run(`battle.equipCardFromHand('plr',0,'Equip')`); await settle();
  return J(`({item:battle.plr.item&&battle.plr.item.card.id, soul:battle.plr.item?battle.plr.item.soul.map(x=>typeof x==='object'?x.id:x):null, gauge:battle.plr.gauge.length-__g, hand:battle.plr.hand.length, drop:battle.plr.drop.slice(), left:battle.plr.monsters.left&&battle.plr.monsters.left.card.id})`); };
(async () => {
  run(`clear(); battle.plr.monsters.left=mku(${SIGURD}); battle.plr.item=mku(${GRAM})`);
  let r = await equip();
  ok(r.item === SIEG && r.soul.length === 2 && r.soul.includes(SIGURD) && r.soul.includes(GRAM), `both on the field: equipped with Sigurd and Gram in its soul (${JSON.stringify(r.soul)})`);
  ok(r.gauge === -2 && r.left === null && !r.drop.includes(GRAM) && !r.drop.includes(SIGURD), `pays 2 gauge, Sigurd left the field, Gram not in the drop zone (gauge ${r.gauge}, drop ${r.drop})`);
  run(`clear(); battle.plr.monsters.left=mku(${SIGURD})`); r = await equip();
  ok(r.item === null && r.hand === 1 && r.gauge === 0, "only Sigurd: cannot equip, nothing paid");
  run(`clear(); battle.plr.item=mku(${GRAM})`); r = await equip();
  ok(r.item === GRAM && r.hand === 1 && r.gauge === 0, "only Gram: cannot equip, Gram stays");
  run(`clear()`); r = await equip();
  ok(r.item === null && r.hand === 1 && r.gauge === 0, "nothing on the field: cannot equip");
  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
})();
