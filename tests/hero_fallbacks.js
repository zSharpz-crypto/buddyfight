// Hero World cards that ran on the generic text fallback: each checked against its printed text.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(3337,"T",3338,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; f.gauge=Array(8).fill(46); f.deck=Array(30).fill(46); } battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; battle.turnCount=100+(globalThis.__t=(globalThis.__t||0)+1); };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const cast = async (id) => { run(`{ const c=CARD_MAP.get(${id}); for (const ab of ABX.get(c).abilities.filter(ABX.isSpellBody)) ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'counter'}}); }`); await settle(); };
const enter = async (id, pos) => { run(`ABX.fireEnter('plr', CARD_MAP.get(${id}), battle.plr.monsters.${pos})`); await settle(); };
(async () => {
  // #1057 Reckless Bravery: power+5000 and [Penetrate] this turn, then the monster goes to the gauge at end of turn
  run(`clear(); battle.plr.monsters.center=mku(46); globalThis.__u=battle.plr.monsters.center; globalThis.__g=battle.plr.gauge.length; globalThis.__p0=getUnitEffectiveCombatStats(battle.plr,__u);`); await cast(1057);
  ok(J(`getUnitEffectiveCombatStats(battle.plr,__u).power-__p0.power`) === 5000 && J(`getUnitEffectiveCombatStats(battle.plr,__u).pen`) === true, `#1057 power+5000 and Penetrate (power +${J("getUnitEffectiveCombatStats(battle.plr,__u).power-__p0.power")}, pen ${J("getUnitEffectiveCombatStats(battle.plr,__u).pen")})`);
  ok(J(`battle.plr.monsters.center===__u`), "#1057 the monster stays on the field until the end of turn");
  run(`ABX.fireTurnEvent('turnEnd')`); await settle();
  ok(J(`!battle.plr.monsters.center`) && J(`battle.plr.gauge.length-__g`) === 1, `#1057 end of turn: monster -> gauge (field empty ${J("!battle.plr.monsters.center")}, gauge +${J("battle.plr.gauge.length-__g")})`);
  // #3260 Schwarz: entering on your own turn destroys the chosen opponent monster
  run(`clear(); battle.plr.monsters.center=mku(3260); battle.opp.monsters.center=mku(46);`); await enter(3260, "center");
  ok(J(`!battle.opp.monsters.center`), "#3260 enters on own turn: opponent's monster destroyed");
  // #6220 Hyper Energy: up to one "Hyper Energy" from deck or drop into hand (no draw without Ride/Station)
  run(`clear(); battle.plr.deck[5]=1045; globalThis.__h=battle.plr.hand.length;`); await cast(6220);
  ok(J(`battle.plr.hand.length-__h`) === 1 && J(`battle.plr.hand.includes(1045)`), `#6220 Hyper Energy to hand, no extra draw (hand +${J("battle.plr.hand.length-__h")})`);
  // #5942 Time Soldier, Spigar: look at 3, one into hand, the rest dropped
  run(`clear(); battle.plr.monsters.center=mku(5942); globalThis.__h=battle.plr.hand.length; globalThis.__d=battle.plr.drop.length; globalThis.__dk=battle.plr.deck.length;`); await enter(5942, "center");
  ok(J(`battle.plr.hand.length-__h`) === 1 && J(`battle.plr.drop.length-__d`) === 2 && J(`__dk-battle.plr.deck.length`) === 3, `#5942 hand +${J("battle.plr.hand.length-__h")}, drop +${J("battle.plr.drop.length-__d")}, deck -${J("__dk-battle.plr.deck.length")} (expected 1, 2, 3)`);
  // #3268 Quinq Lada: chosen Battleship gets [Penetrate]; crit+1 only if this card did NOT enter from the hand
  run(`clear(); battle.plr.monsters.left=mku(3233); battle.plr.monsters.center=mku(3268); globalThis.__b=battle.plr.monsters.left;`); await enter(3268, "center");
  ok(J(`getUnitEffectiveCombatStats(battle.plr,__b).pen`) === true, "#3268 chosen Battleship gets Penetrate");
  console.log("fail", fail); process.exit(fail ? 1 : 0);
})();
