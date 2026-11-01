// #1445 Second Omni Demon Lord, Asmodai: "If this card would leave the field, you may discard two cards and pay 1 gauge. If you do, prevent it" - also vs "put at the bottom of the deck"
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log("FAIL", n, JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 20; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
run(`battle.start('hotseat', generateFlagDeck(447,'T',571,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});`);
async function t(dest, label) {
  run(`{const p=battle.plr,o=battle.opp; battle.activeSide='opp'; battle.phase='main'; battle.turnCount+=2; p.monsters.center=mk(CARD_MAP.get(1445)); p.hand=[46,46,46]; p.gauge=Array(3).fill(46); p.deck=Array(10).fill(46); p.drop=[];
   globalThis.__r=null; const ctx={side:'opp',f:o,e:p,card:CARD_MAP.get(46),unit:null,bind:{chosen:[],revealed:[],looked:[]},auto:true,log:[],lastDone:true};
   const ref={k:'unit',side:'plr',pos:'center',unit:p.monsters.center,card:CARD_MAP.get(1445),id:1445};
   ABX.core.moveRefs([ref],${JSON.stringify(dest)},ctx).then(x=>{__r=x;});}`);
  await settle();
  ck("#1445 stays on the field (" + label + ")", J(`battle.plr.monsters.center&&battle.plr.monsters.center.card.id===1445`), J(`[!!battle.plr.monsters.center, battle.plr.hand.length, battle.plr.gauge.length]`));
  ck("#1445 paid: 2 cards discarded + 1 gauge (" + label + ")", J(`battle.plr.hand.length===1&&battle.plr.gauge.length===2`), J(`[battle.plr.hand.length, battle.plr.gauge.length]`));
}
(async () => {
  await settle();
  await t({ area: "deck", pos: "bottom", owner: "opp" }, "bottom of deck");
  await t({ area: "hand", owner: "opp" }, "return to hand");
  run(`{const p=battle.plr; battle.activeSide='opp'; p.monsters.center=mk(CARD_MAP.get(1445)); p.hand=[46]; p.gauge=Array(3).fill(46); p.deck=Array(10).fill(46);
   const ctx={side:'opp',f:battle.opp,e:p,card:CARD_MAP.get(46),unit:null,bind:{chosen:[],revealed:[],looked:[]},auto:true,log:[],lastDone:true};
   ABX.core.moveRefs([{k:'unit',side:'plr',pos:'center',unit:p.monsters.center,card:CARD_MAP.get(1445),id:1445}],{area:'deck',pos:'bottom',owner:'opp'},ctx);}`); await settle();
  ck("cannot pay (1 card in hand): it leaves", J(`!battle.plr.monsters.center`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
