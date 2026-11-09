// Star Dragon World cards that ran on the generic text fallback: each checked against its printed text.
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
  // #4868 Victory Equation: [Stand] all Astrodragon on your field; draw only if you stood three or more
  const ASTRO = 4331;
  for (const [rested, draw] of [[3, 1], [2, 0]]) {
    run(`clear(); battle.plr.monsters.left=mku(${ASTRO}); battle.plr.monsters.center=mku(${ASTRO}); battle.plr.monsters.right=mku(${ASTRO});
         ["left","center","right"].forEach((p,i)=>{ battle.plr.monsters[p].rested = i < ${rested}; }); globalThis.__h=battle.plr.hand.length;`); await cast(4868);
    ok(J(`["left","center","right"].every(p=>!battle.plr.monsters[p].rested)`) && J(`battle.plr.hand.length-__h`) === draw, `#4868 stood ${rested}: all standing, drew ${J("battle.plr.hand.length-__h")} (expected ${draw})`);
  }
  // #2588 Neo Braver, Ars Grande: reveal top card; a non-monster goes back on top or bottom of the deck (it must not be lost)
  run(`clear(); battle.plr.monsters.center=mku(2588); battle.plr.deck[0]=1045; globalThis.__dk=battle.plr.deck.length; globalThis.__h=battle.plr.hand.length; globalThis.__g=battle.plr.gauge.length; globalThis.__d=battle.plr.drop.length;`); await enter(2588, "center");
  ok(J(`battle.plr.deck.length`) === J(`__dk`) && J(`battle.plr.deck.includes(1045)`) && J(`battle.plr.hand.length-__h`) === 0 && J(`battle.plr.gauge.length-__g`) === 0 && J(`battle.plr.drop.length-__d`) === 0,
     `#2588 revealed spell stays in the deck (deck ${J("battle.plr.deck.length")}/${J("__dk")}, hand +${J("battle.plr.hand.length-__h")}, gauge +${J("battle.plr.gauge.length-__g")}, drop +${J("battle.plr.drop.length-__d")})`);
  run(`clear(); battle.plr.monsters.center=mku(2588); battle.plr.deck[0]=46; globalThis.__dk=battle.plr.deck.length;`); await enter(2588, "center");
  ok(J(`["left","right","center2"].some(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id===46)`) && J(`__dk-battle.plr.deck.length`) === 1, `#2588 revealed monster can be called (deck -${J("__dk-battle.plr.deck.length")}, called ${J(`["left","right","center2"].some(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id===46)`)})`);
  console.log("fail", fail); process.exit(fail ? 1 : 0);
})();
