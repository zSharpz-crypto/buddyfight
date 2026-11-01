// #3923 Ultimate Great Spell, World Pandemic!: flip the opponent's flag face down (cards written on it unusable, field to the drop zone); Godclock / Overgod flags are immune
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log("FAIL", n, JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 20; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const setup = (oppFlag) => run(`{battle.start('hotseat', generateFlagDeck(447,'T',571,false), generateFlagDeck(${oppFlag},'O',6065,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[46],tempPower:0,tempDef:0,tempCrit:0});
 const p=battle.plr,o=battle.opp; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=8; o.monsters.center=mk(CARD_MAP.get(149)); o.monsters.left=mk(CARD_MAP.get(149)); o.drop=[]; globalThis.__dl=o.drop.length;
 globalThis.__ab=ABX.core.abilitiesOf(CARD_MAP.get(3923),a=>a.kind==="spell")[0];
 globalThis.__ctx={side:'plr',f:p,e:o,card:CARD_MAP.get(3923),unit:null,bind:{chosen:[],revealed:[],looked:[]},auto:true,log:[],lastDone:true};}`);
(async () => {
  await settle(); setup(447);
  ck("3923 parsed to the face-down op", J(`__ab.steps[0].op`) === "r42FlagFaceDown", J(`__ab.steps`));
  run(`globalThis.__tc=[...CARD_MAP.values()].find(c=>c.type==='Monster'&&c.size===1&&checkCardLegalityForFlag(c,CARD_MAP.get(447),false).allowed&&evaluateCardConditions(c,battle.opp,battle.plr).met!==false)`);
  const legalBefore = J(`evaluateCardConditions(__tc,battle.opp,battle.plr).met`);
  run(`ABX.OPS.r42FlagFaceDown.run(__ab.steps[0],__ctx)`);
  ck("opp flag face down", J(`battle.opp.flagFaceDown`) === true);
  ck("opp field went to the drop zone (cards + souls)", J(`!battle.opp.monsters.center&&!battle.opp.monsters.left&&battle.opp.drop.length`) >= 4, J(`battle.opp.drop`));
  ck("cards of that flag cannot be used any more", legalBefore === true && J(`evaluateCardConditions(__tc,battle.opp,battle.plr).met`) === false, [legalBefore]);
  ck("flagIs no longer matches", J(`ABX.core.evalCond({t:'flagIs',names:['the chaos','dragon world','magic world']},{side:'opp',f:battle.opp,e:battle.plr,bind:{}})`) === false);
  // Godclock flag is immune
  setup(5957); run(`ABX.OPS.r42FlagFaceDown.run(__ab.steps[0],__ctx)`);
  ck("Godclock #5957 flag cannot be flipped face down", J(`!battle.opp.flagFaceDown && !!battle.opp.monsters.center`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
