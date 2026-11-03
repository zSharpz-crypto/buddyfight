// node tests/dead_batch2.js - remaining link/attack + draw/hand cards: #3656 #1595 #5285 #5998 #3899
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 60; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id)=>({card:card(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.mon=(f)=>window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&f(c));
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; ['plr','opp'].forEach(sd=>{const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null;f.item2=null;f.life=10;f.setSpells=[];f.hand=[];f.drop=[];}); };
globalThis.ab=(id,k,ev)=>ABX.get(card(id)).abilities.find(a=>a.kind===k&&(!ev||(a.trigger&&a.trigger.event===ev)));
globalThis.go=(id,k,ev,unit,opts)=>ABX.runAbility('plr',card(id),ab(id,k,ev),unit||null,opts||{});`);
(async () => {
  // 3656: other monster enters -> look 3, take a Thunder Empire
  run(`fresh(); globalThis.te=mon(c=>(c.attrs||[]).includes('ThunderEmpire')).id; battle.plr.deck=[1,te,2,3,4]; go(3656,'triggered','otherEnter',mk(3656),{event:{name:'otherEnter',unit:mk(te)}})`); await settle();
  ck("3656: Thunder Empire card from top 3 to hand", val(`return battle.plr.hand.includes(te)&&battle.plr.deck.length===4`), val(`return [battle.plr.hand,battle.plr.deck.length]`));
  // 1595: discard from hand + 1 gauge -> search Duel Sieger
  run(`fresh(); globalThis.ds=window.BUDDYFIGHT_CARDS.find(c=>/duel sieger/i.test(c.name)&&c.id!==1595).id; battle.plr.hand=[1595]; battle.plr.deck=[1,ds,2]; globalThis.g0=battle.plr.gauge.length; go(1595,'act')`); await settle();
  ck("1595: discarded self, paid gauge, fetched Duel Sieger", val(`return battle.plr.hand.length===1&&battle.plr.hand[0]===ds&&battle.plr.drop.includes(1595)&&battle.plr.gauge.length===g0-1`), val(`return [battle.plr.hand,battle.plr.gauge.length,g0]`));
  // 5285
  run(`fresh(); battle.plr.hand=[7]; battle.plr.deck=[21,22,23]; go(5285,'spell')`); await settle();
  ck("5285: drop a hand card, draw 2", val(`return battle.plr.hand.length===2&&battle.plr.drop.length===1`), val(`return [battle.plr.hand,battle.plr.drop]`));
  // 5998
  run(`fresh(); globalThis.e=mk(mon(c=>c.crit>=2).id); battle.opp.monsters.center=e; globalThis.c0=e.tempCrit; battle.plr.godclock=battle.plr.godclock||{}; battle.plr.godclock.reversalCount=2; go(5998,'triggered','enter',mk(5998))`); await settle();
  ck("5998: crit -1 per Reversal (2 -> -2)", val(`return e.tempCrit===c0-2`), val(`return e.tempCrit`));
  // 3899
  run(`fresh(); globalThis.e=mk(mon(c=>c.size===1).id); battle.opp.monsters.left=e; battle.plr.hand=[7,8]; go(3899,'triggered','otherEnter',mk(3899),{event:{name:'otherEnter',unit:mk(1)}})`); await settle();
  ck("3899: discarded 1, destroyed chosen opp card", val(`return !battle.opp.monsters.left&&battle.plr.hand.length===1`), val(`return [!!battle.opp.monsters.left,battle.plr.hand.length]`));
  run(`fresh(); battle.opp.monsters.left=mk(mon(c=>c.size===1).id); battle.plr.hand=[]; go(3899,'triggered','otherEnter',mk(3899),{event:{name:'otherEnter',unit:mk(1)}})`); await settle();
  ck("3899: no hand card -> nothing destroyed", val(`return !!battle.opp.monsters.left`));
  // ---- batch 2 ----
  run(`fresh(); globalThis.u=mk(857); battle.plr.monsters.center=u; globalThis.l0=battle.opp.life; go(857,'triggered','attackDestroys',u,{event:{name:'attackDestroys',destroyedCount:3}})`); await settle();
  ck("857: 3 destroyed -> 3 damage", val(`return battle.opp.life===l0-3`), val(`return [l0,battle.opp.life]`));
  run(`fresh(); globalThis.u=mk(6560); battle.plr.monsters.center=u; battle.opp.monsters.left=mk(mon(c=>c.size===1).id); battle.plr.drop=new Array(19).fill(7); battle.opp.drop=[]; go(6560,'triggered','attack',u)`); await settle();
  ck("6560: 19 cards in drops -> nothing", val(`return !!battle.opp.monsters.left&&u.tempCrit===0`));
  run(`battle.opp.drop=[7]; go(6560,'triggered','attack',u)`); await settle();
  ck("6560: 20 cards -> destroy opp field, crit+3", val(`return !battle.opp.monsters.left&&u.tempCrit===3`), val(`return [!!battle.opp.monsters.left,u.tempCrit]`));
  run(`fresh(); battle.plr.hand=[7]; battle.opp.hand=[]; go(1504,'triggered','enter',mk(1504))`); await settle();
  ck("1504: only I discard -> opp takes 2", val(`return battle.plr.hand.length===0&&battle.opp.life===8&&battle.plr.life===10`), val(`return [battle.plr.hand.length,battle.plr.life,battle.opp.life]`));
  run(`fresh(); battle.plr.hand=[7]; battle.opp.hand=[8]; go(1504,'triggered','enter',mk(1504))`); await settle();
  ck("1504: both discard -> no damage", val(`return battle.opp.life===10&&battle.plr.life===10`));
  run(`fresh(); globalThis.sp=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Spell'&&c.set&&c.world==='Magic World'&&!c.cost); battle.plr.hand=[sp.id]; go(91,'triggered','enter',mk(91))`); await settle();
  ck("91: Magic World Set spell cast from hand for free", val(`return battle.plr.hand.length===0&&battle.plr.setSpells.some(c=>c.id===sp.id)`), val(`return [battle.plr.hand,battle.plr.setSpells.length]`));
  run(`fresh(); battle.opp.hand=[7,8]; go(1959,'triggered','handUp')`); await settle();
  ck("1959: opp discards a hand card", val(`return battle.opp.hand.length===1`));
  run(`fresh(); battle.opp.hand=[7,8]; battle.plr.godclock=battle.plr.godclock||{}; battle.plr.godclock.reversalCount=0; go(5987,'triggered','fieldToHand')`); await settle();
  ck("5987: no Reversal -> nothing", val(`return battle.opp.hand.length===2`));
  run(`battle.plr.godclock.reversalCount=1; battle.opp.deck=[9]; go(5987,'triggered','fieldToHand')`); await settle();
  ck("5987: Reversal -> opp hand card to deck bottom", val(`return battle.opp.hand.length===1&&battle.opp.deck.length===2`), val(`return [battle.opp.hand.length,battle.opp.deck.length]`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
