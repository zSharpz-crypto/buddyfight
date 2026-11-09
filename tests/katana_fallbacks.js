// Katana World cards that ran on the generic text fallback: each checked against its printed text.
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

  // #1615 Hidden Secret Sword, "Cloud Billow": top two cards to the gauge; may return a Secret Sword / Lethal Formation card from the drop zone to the deck
  run(`clear(); battle.plr.drop=[290]; globalThis.__g=battle.plr.gauge.length; globalThis.__dk=battle.plr.deck.length;`); await cast(1615);
  ok(J(`battle.plr.gauge.length-__g`) === 2 && J(`battle.plr.drop.length`) === 0 && J(`battle.plr.deck.includes(290)`) && J(`battle.plr.deck.length-__dk`) === -1, `#1615 +2 gauge and #290 returned to the deck (gauge +${J("battle.plr.gauge.length-__g")}, drop ${J("battle.plr.drop.length")}, deck ${J("battle.plr.deck.length-__dk")})`);
  run(`clear(); battle.plr.drop=[46]; globalThis.__g=battle.plr.gauge.length;`); await cast(1615);
  ok(J(`battle.plr.gauge.length-__g`) === 2 && J(`battle.plr.drop.length`) === 1, "#1615 nothing eligible in the drop zone: only the gauge part happens");
  // #330 Cyber Onmyoji, Seimei: [Act] pay 2 gauge; a hand card goes face down onto YOUR field as a size 1 / 6000 / 6000 / crit 2 monster
  run(`clear(); battle.plr.monsters.center=mku(330); battle.plr.hand=[46,1045]; globalThis.__g=battle.plr.gauge.length;
       { const c=CARD_MAP.get(330); const ab=ABX.get(c).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',c,ab,battle.plr.monsters.center,{event:{name:'act'},auto:true,preApproved:true}); }`); await settle();
  const fd = J(`["left","right","center2"].map(p=>battle.plr.monsters[p]).filter(Boolean).map(u=>[u.card.power,u.card.defense,u.card.crit,u.card.size])`);
  ok(J(`__g-battle.plr.gauge.length`) === 2 && J(`battle.plr.hand.length`) === 1 && fd.length === 1 && fd[0].join() === "6000,6000,2,1", `#330 pays 2 gauge, one hand card becomes a 6000/6000/2 size 1 monster (gauge -${J("__g-battle.plr.gauge.length")}, hand ${J("battle.plr.hand.length")}, new ${JSON.stringify(fd)})`);
  // #1266 One-Eyed Ninja, Refu: opponent reveals hand; choose a card -> bottom of their deck; then they draw two cards
  run(`clear(); battle.plr.monsters.center=mku(1266); battle.opp.hand=[46,46,1045]; globalThis.__oh=battle.opp.hand.length; globalThis.__od=battle.opp.deck.length;`); await enter(1266, "center");
  ok(J(`battle.opp.hand.length-__oh`) === 1 && J(`battle.opp.deck.length-__od`) === -1, `#1266 opp hand 3 -> 4 (one to the deck bottom, draws 2), deck 30 -> 29 (hand ${J("battle.opp.hand.length")}, deck ${J("battle.opp.deck.length")})`);
  console.log("fail", fail); process.exit(fail ? 1 : 0);
})();
