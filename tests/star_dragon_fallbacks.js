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
  // #3857 Prismatic Bless: look at as many cards as your opponent attacked this turn; one to gauge, up to two to hand, the rest to the bottom of the deck; +1 life
  for (const [atk, g, h, bot] of [[4, 1, 2, 1], [1, 1, 0, 0], [0, 0, 0, 0]]) {
    run(`clear(); ABX.core.turnStats(battle.opp).attacks=${atk}; globalThis.__g=battle.plr.gauge.length; globalThis.__h=battle.plr.hand.length; globalThis.__l=battle.plr.life; globalThis.__dk=battle.plr.deck.length;`); await cast(3857);
    const r = J(`[battle.plr.gauge.length-__g, battle.plr.hand.length-__h, battle.plr.deck.length-__dk, battle.plr.life-__l]`);
    ok(r[0] === g && r[1] === h && r[3] === 1 && r[2] === -(g + h), `#3857 opponent attacked ${atk}x: gauge+${g} hand+${h} (got gauge ${r[0]}, hand ${r[1]}, deck ${r[2]}, life ${r[3]})`);
  }
  // #3913 Prism Pillar: the gauge card + life only if a card on the opponent's field was [Stand] by a card effect this turn
  run(`clear(); globalThis.__g=battle.plr.gauge.length; globalThis.__l=battle.plr.life;`); await cast(3913);
  ok(J(`battle.plr.gauge.length-__g`) === 0 && J(`battle.plr.life-__l`) === 0, `#3913 nothing was stood by an effect: no gauge, no life (gauge +${J("battle.plr.gauge.length-__g")}, life +${J("battle.plr.life-__l")})`);
  // ... and with a [Stand] effect on an opponent's card this turn it does
  run(`clear(); globalThis.__u=mku(46); __u.rested=true; battle.opp.monsters.center=__u;
       ABX.OPS.stand.run({np:{ref:'chosen',qty:{n:1}}},{side:'plr',f:battle.plr,e:battle.opp,card:CARD_MAP.get(46),bind:{chosen:[{k:'unit',side:'opp',unit:__u,card:__u.card}]}}); globalThis.__g=battle.plr.gauge.length; globalThis.__l=battle.plr.life;`); await settle(); await cast(3913);
  ok(J(`!__u.rested`) && J(`battle.plr.gauge.length-__g`) === 1 && J(`battle.plr.life-__l`) === 1, `#3913 an opponent's card was stood by an effect: +1 gauge, +1 life (stood ${J("!__u.rested")}, gauge +${J("battle.plr.gauge.length-__g")}, life +${J("battle.plr.life-__l")})`);
  // #2331 Lua Nova (real cast from hand): the effect depends on the world of the card discarded for its Cast Cost
  const lua = async (disc) => { run(`clear(); battle.plr.hand=[2331,${disc}]; battle.opp.monsters.center=mku(46); globalThis.__g=battle.plr.gauge.length; globalThis.__l=battle.plr.life; globalThis.__dk=battle.plr.deck.length; battle.castSpellFromHand('plr',0);`); await settle(); };
  const eff = () => J(`[battle.plr.life-__l, __dk-battle.plr.deck.length, battle.plr.gauge.length-__g, !!battle.opp.monsters.center]`);
  await lua(350);   // Legend World: +1 life and draw a card
  let r = eff(); ok(r[0] === 1 && r[1] === 1 && r[3] === true, `#2331 Legend World card discarded: +1 life, draw 1, nothing destroyed (life +${r[0]}, deck -${r[1]}, opp monster kept ${r[3]})`);
  await lua(1096);  // Star Dragon World: top card to gauge, destroy a size 2 or less monster (cast cost gauge is 0)
  r = eff(); ok(r[0] === 0 && r[2] === 1 && r[3] === false, `#2331 Star Dragon World card discarded: +1 gauge, opponent's monster destroyed, no life (life +${r[0]}, gauge +${r[2]}, opp monster kept ${r[3]})`);
  await lua(446);   // neither world: nothing
  r = eff(); ok(r[0] === 0 && r[1] === 0 && r[3] === true, `#2331 other world discarded: nothing happens (life +${r[0]}, deck -${r[1]}, opp monster kept ${r[3]})`);
  console.log("fail", fail); process.exit(fail ? 1 : 0);
})();
