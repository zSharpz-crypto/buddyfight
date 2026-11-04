// "Look at your opponent's hand" (#335 Phantom Ninja, Kashinkoji "Clairvoyance" and other cards): a human player must be shown the opponent's actual hand cards (it was only a one-line prompt).
//   node tests/look_opp_hand.js
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=false; ABX.fast=false;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.shown=[]; ABX.hooks.pickCards=(o)=>{ globalThis.shown.push({title:o.title,ids:(o.cards||[]).map(x=>x.card&&x.card.id),min:o.min,max:o.max}); return []; };
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; f.isBot=false; } battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; battle.turnCount++; globalThis.shown.length=0; };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const enter = async (side) => { run(`battle.${side}.monsters.center=mku(335); ABX.fireEnter('${side}', CARD_MAP.get(335), battle.${side}.monsters.center)`); await settle(); return J(`globalThis.shown.slice()`); };
(async () => {
  run(`clear(); battle.opp.hand=[45,4388,12]`);
  let s = await enter("plr");
  ok(s.length === 1 && s[0].ids.join() === "45,4388,12" && s[0].max === 0, `human: shown the opponent's 3 hand cards, view only (${JSON.stringify(s)})`);
  ok(J(`battle.opp.hand.join()`) === "45,4388,12", "opponent's hand is unchanged");
  run(`clear(); battle.opp.hand=[]`); s = await enter("plr");
  ok(s.length === 0, "empty opponent hand: no popup");
  run(`clear(); battle.plr.hand=[45,4388]; battle.opp.isBot=true; battle.plr.isBot=false`); s = await enter("opp");
  ok(s.length === 0, "the bot's own look does not open a popup for the human");
  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
})();
