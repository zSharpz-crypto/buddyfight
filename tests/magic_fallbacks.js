// Magic World cards that ran on the generic text fallback: each checked against its printed text.
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
  // #39 Asmodai Eternal Rolling Back-drop!: reveal top 5; damage = 1 + number of "Asmodai" cards; revealed go to the bottom
  run(`clear(); battle.plr.deck=[46,64,78,46,64].concat(Array(10).fill(46)).slice(0,5).concat(Array(10).fill(1045)); globalThis.__l=battle.opp.life; globalThis.__dk=battle.plr.deck.length;`);
  run(`{ const c=CARD_MAP.get(39); const ab=ABX.get(c).abilities.find(a=>a.kind==='spell'); ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'impact'}}); }`); await settle();
  ok(J(`__l-battle.opp.life`) === 6 && J(`battle.plr.deck.length`) === J(`__dk`) && J(`battle.plr.deck[0]`) === 1045, `#39 five Asmodai revealed -> 6 damage, deck order kept length (dmg ${J("__l-battle.opp.life")}, top ${J("battle.plr.deck[0]")})`);
  run(`clear(); battle.plr.deck=Array(15).fill(1045); globalThis.__l=battle.opp.life;`);
  run(`{ const c=CARD_MAP.get(39); const ab=ABX.get(c).abilities.find(a=>a.kind==='spell'); ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'impact'}}); }`); await settle();
  ok(J(`__l-battle.opp.life`) === 1, `#39 no Asmodai -> 1 damage (${J("__l-battle.opp.life")})`);
  // #99 Champion Wrestler Asmodai: discard N from hand -> destroy N opp cards
  run(`clear(); battle.plr.monsters.center=mku(99); battle.plr.hand=[46,46,1045]; battle.opp.monsters.left=mku(46); battle.opp.monsters.right=mku(46); battle.opp.monsters.center=mku(46);`); await enter(99, "center");
  const dd = J(`[battle.plr.hand.length, battle.plr.drop.length, ["left","center","right","center2"].filter(p=>battle.opp.monsters[p]).length]`);
  ok(dd[1] === 3 - dd[0] && 3 - dd[2] === dd[1], `#99 destroyed count equals discarded count (hand ${dd[0]}, drop ${dd[1]}, opp left ${dd[2]})`);
  // #1492 Spirit Orb: rest -> 1 damage, 2 if soul >= 2, once per turn
  for (const [soul, dmg] of [[[], 1], [[46, 46], 2]]) {
    run(`clear(); battle.plr.monsters.center=mku(1492); battle.plr.monsters.center.soul=${JSON.stringify(soul)}.map(i=>CARD_MAP.get(i)); globalThis.__l=battle.opp.life;
      { const c=CARD_MAP.get(1492); const ab=ABX.get(c).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',c,ab,battle.plr.monsters.center,{event:{name:'act'},auto:true,preApproved:true}); }`); await settle();
    ok(J(`__l-battle.opp.life`) === dmg && J(`battle.plr.monsters.center.rested`) === true, `#1492 soul ${soul.length} -> ${dmg} damage and rests (${J("__l-battle.opp.life")})`);
  }
  // #5018 on enter: bounce 1 opp card; by G.EVO bounce all + gain life
  run(`clear(); battle.plr.monsters.center=mku(5018); battle.opp.monsters.left=mku(46); battle.opp.monsters.right=mku(46); battle.opp.hand=[];`); await enter(5018, "center");
  ok(J(`battle.opp.hand.length`) === 1, `#5018 normal entry returns exactly one opp card (${J("battle.opp.hand.length")})`);
  // #4953: three spells from drop to deck bottom -> all size<=3 opp monsters moved to separate areas
  console.log("fail", fail); process.exit(fail ? 1 : 0);
})();
