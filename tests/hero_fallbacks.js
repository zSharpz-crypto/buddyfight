// Hero World cards that ran on the generic text fallback: each checked against its printed text.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(3337,"T",3338,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; f.gauge=Array(8).fill(46); f.deck=Array(30).fill(46); } battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; battle.turnCount=100+(globalThis.__t=(globalThis.__t||0)+1); };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const cast = async (id, inDrop) => { run(`{ const c=CARD_MAP.get(${id}); ${inDrop ? `battle.plr.drop.push(${id});` : ''} for (const ab of ABX.get(c).abilities.filter(ABX.isSpellBody)) ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'counter'}${inDrop ? `,selfRef:{k:'zone',side:'plr',area:'drop',idx:battle.plr.drop.length-1,id:${id},card:c}` : ''}}); }`); await settle(); };
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
  // #3230 Captain Answer: declares "monster" when automatic. One match -> Double Attack only; both -> destroy all opponent cards
  const act3230 = async () => { run(`{ const ab=ABX.get(CARD_MAP.get(3230)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(3230),ab,battle.plr.monsters.center,{event:{name:'act'},auto:true,preApproved:true}); }`); await settle(); };
  const MON = J(`[...CARD_MAP.values()].find(c=>c.type==='Monster'&&c.id!==3230).id`);
  run(`clear(); battle.plr.monsters.center=mku(3230); battle.opp.monsters.left=mku(46); battle.opp.monsters.center=mku(46); battle.plr.deck[0]=${MON}; battle.opp.deck[0]=1045; globalThis.__u=battle.plr.monsters.center; globalThis.__g=battle.plr.gauge.length;`); await act3230();
  ok(J(`__u.tempDA`) === true && J(`!!battle.opp.monsters.left&&!!battle.opp.monsters.center`) && J(`__g-battle.plr.gauge.length`) === 1, `#3230 only one of the two is a monster: Double Attack, opponent field kept (DA ${J("__u.tempDA")}, opp field kept ${J("!!battle.opp.monsters.left&&!!battle.opp.monsters.center")})`);
  run(`clear(); battle.plr.monsters.center=mku(3230); battle.opp.monsters.left=mku(46); battle.opp.monsters.center=mku(46); battle.plr.deck[0]=${MON}; battle.opp.deck[0]=${MON}; globalThis.__u=battle.plr.monsters.center;`); await act3230();
  ok(J(`__u.tempDA`) === true && J(`!battle.opp.monsters.left&&!battle.opp.monsters.center`), "#3230 both are monsters: Double Attack and the opponent's field is destroyed");
  run(`clear(); battle.plr.monsters.center=mku(3230); battle.opp.monsters.left=mku(46); battle.plr.deck[0]=1045; battle.opp.deck[0]=1045; globalThis.__u=battle.plr.monsters.center;`); await act3230();
  ok(!J(`!!__u.tempDA`) && J(`!!battle.opp.monsters.left`), "#3230 neither is a monster: nothing happens");
  // #3226 F5 Attack: destroy; opponent may call from hand; only then may you pay 1 gauge to return this card
  const f5 = async (oppHand) => { run(`clear(); battle.plr.monsters.left=mku(46); battle.plr.hand=[]; battle.opp.monsters.center=mku(46); battle.opp.hand=${JSON.stringify(oppHand)}; battle.opp.gauge=Array(8).fill(46); globalThis.__g=battle.plr.gauge.length;`); await cast(3226, true); };
  await f5([]);
  ok(J(`!battle.opp.monsters.center`) && !J(`battle.plr.hand.includes(3226)`) && J(`battle.plr.gauge.length-__g`) === 0, `#3226 opponent cannot call: monster destroyed, card NOT returned, no gauge paid (returned ${J("battle.plr.hand.includes(3226)")}, gauge ${J("battle.plr.gauge.length-__g")})`);
  await f5([46]);
  ok(J(`battle.opp.hand.length`) === 0 && J(`battle.plr.hand.includes(3226)`) && J(`__g-battle.plr.gauge.length`) === 1, `#3226 opponent calls a monster: you pay 1 gauge and the card returns (opp hand ${J("battle.opp.hand.length")}, returned ${J("battle.plr.hand.includes(3226)")}, gauge -${J("__g-battle.plr.gauge.length")})`);
  // #2599 Wind Demon, Caymon: hand [Act] only if your buddy is an impact monster
  const act2599 = async (buddy) => { run(`clear(); battle.plr.buddyZone=[{id:${buddy},rested:false,isFaceDown:false}]; battle.plr.hand=[2599]; globalThis.__h=mku(46); __h.soul=[46,46]; battle.opp.monsters.center=__h; globalThis.__s=__h.soul.length;
       { const c=CARD_MAP.get(2599); const ab=ABX.get(c).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',c,ab,null,{event:{name:'act'},auto:true,preApproved:true,selfRef:{k:'zone',side:'plr',area:'hand',idx:0,id:2599,card:c}}); }`); await settle(); };
  await act2599(46);
  ok(J(`__h.soul.length`) === 2 && J(`battle.plr.hand.includes(2599)`), `#2599 buddy is not an impact monster: nothing happens (soul ${J("__h.soul.length")}, still in hand ${J("battle.plr.hand.includes(2599)")})`);
  await act2599(2599);
  ok(J(`__s-__h.soul.length`) === 1 && !J(`battle.plr.hand.includes(2599)`), `#2599 buddy is an impact monster: card discarded, one soul dropped (soul -${J("__s-__h.soul.length")})`);
  console.log("fail", fail); process.exit(fail ? 1 : 0);
})();
