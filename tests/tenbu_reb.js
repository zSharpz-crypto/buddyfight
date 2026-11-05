// #6462 Fifth Omni Dragon Lord, Tenbu "Re:B": enter / take damage -> choose any number of cards WITH POWER on the opponent's field;
// if their total power is 50000 or less, destroy them all. (Bug: the 50000 limit was never checked.) Size -3 while a "Drum" monster is on your field.
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const run = (c) => env.run('{' + c + '\n}');
  const settle = async () => { for (let i = 0; i < 80; i++) { await new Promise(r => setImmediate(r)); env.flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.alert=function(m){ globalThis.__alert=m; }; globalThis.__n=920000;
  globalThis.mkc=function(type,extra){ const id=++__n; const c=Object.assign({id,name:'B'+id,type,skill:'',cost:'',attrs:[],worlds:[],world:'Dragon World',img:'',size:1,power:5000,defense:5000,crit:1},extra||{}); CARD_MAP.set(id,c); return c; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3; battle.pendingAction=null; };
  globalThis.mku=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  // opponent field with the given powers (left, center, right); player has an empty field and Tenbu in hand
  globalThis.board=function(pows, human){ fresh(); const f=battle.plr, e=battle.opp; ['left','center','right'].forEach(p=>{f.monsters[p]=null;e.monsters[p]=null;}); e.item=null; f.item=null;
    ['left','center','right'].forEach((p,i)=>{ if(pows[i]!=null) e.monsters[p]=mku(mkc('Monster',{power:pows[i],size:1})); }); f.gauge=[1,2,3,4,5]; f.hand=[6462]; globalThis.__ui=[];
    ABX.autoPlay=!human; ABX.ui.pickCards=async function(o){ __ui.push(o.cards.map(c=>c.card.id)); return globalThis.__choose ? globalThis.__choose(o) : o.cards.map((c,i)=>i); };
    ABX.ui.pickOption=async function(){ return 0; }; ABX.ui.confirm=async function(){ return true; }; };
  globalThis.callTenbu=function(){ battle.startMonsterCall('plr',0,false); battle.onZoneClick('plr','center'); };
  globalThis.oppCount=()=>['left','center','right'].filter(p=>battle.opp.monsters[p]).length;`);
  const oppCount = () => run(`oppCount()`);

  run(`board([20000,20000,20000], false); callTenbu();`); await settle();
  ck("auto/bot: total 60000 > 50000 -> keeps a subset of 40000 (2 destroyed, 1 left)", oppCount() === 1 && run(`!!battle.plr.monsters.center`), oppCount());
  run(`board([20000,20000,10000], false); callTenbu();`); await settle();
  ck("boundary: total exactly 50000 -> all 3 destroyed", oppCount() === 0, oppCount());
  run(`board([30000,30000], true); globalThis.__choose=null; callTenbu();`); await settle();
  ck("human chooses all, total 60000 -> NOTHING is destroyed", oppCount() === 2, oppCount());
  run(`board([30000,30000,30000], true); globalThis.__choose=function(o){ return [0,1]; }; callTenbu();`); await settle();
  ck("human chooses two (60000)... over the limit -> nothing destroyed", oppCount() === 3, oppCount());
  run(`board([20000,20000,30000], true); globalThis.__choose=function(o){ return [0,1]; }; callTenbu();`); await settle();
  ck("human chooses two (40000) -> those two destroyed, the third stays", oppCount() === 1, oppCount());
  // cards with power only: an opponent item with no power is not offered
  run(`board([10000], true); globalThis.__choose=null; battle.opp.item=mku(CARD_MAP.get(4565)||mkc('Item',{power:null})); battle.opp.item.card=mkc('Item',{power:null,name:'Plain Item'}); globalThis.__plain=battle.opp.item.card.id; callTenbu();`); await settle();
  ck("an item without power is not a valid choice", !run(`JSON.stringify(__ui)`).includes(String(run(`__plain`))), run(`JSON.stringify(__ui)`));
  // "when you take damage": same ability
  run(`board([20000,20000,20000], false); const f=battle.plr; f.monsters.center=mku(CARD_MAP.get(6462)); f.hand=[]; f.life=8; battle.activeSide='opp'; ABX.fireSpell('opp', mkc('Spell',{name:'Zap',skill:'Deal 2 damage to your opponent.'}));`); await settle();
  ck("when you take damage: it triggers (bot picks 40000 worth)", oppCount() === 1 && run(`battle.plr.life`) === 6, [oppCount(), run(`battle.plr.life`)]);
  // size reduced by 3 while a "Drum" monster is on your field
  run(`board([], false); const f=battle.plr; f.monsters.center=mku(CARD_MAP.get(6462)); f.monsters.left=mku(mkc('Monster',{name:'Test Drum',size:1})); globalThis.__sz=battle.getCurrentSizeUsed(f);`);
  ck("size 3 -> 0 with a Drum monster on the field (total used = 1)", run(`__sz`) === 1, run(`__sz`));
  run(`board([], false); const f=battle.plr; f.monsters.center=mku(CARD_MAP.get(6462)); f.monsters.left=mku(mkc('Monster',{name:'Other',size:1})); globalThis.__sz=battle.getCurrentSizeUsed(f);`);
  ck("without a Drum monster it stays size 3 (total 4)", run(`__sz`) === 4, run(`__sz`));
  // call cost
  run(`board([], false); battle.plr.gauge=[1,2,3,4,5]; globalThis.__top=battle.plr.deck[0]; callTenbu();`); await settle();
  ck("call cost: 2 gauge + top card into its soul", run(`battle.plr.gauge.length===3 && battle.plr.monsters.center && battle.plr.monsters.center.soul[0]===__top`), run(`JSON.stringify([battle.plr.gauge.length, battle.plr.monsters.center && battle.plr.monsters.center.soul, __top])`));
  // the big one: "destroy all chosen cards" used to hit EVERY card on both fields (also your own monster and item)
  run(`board([10000,10000], false); const f=battle.plr; f.monsters.left=mku(mkc('Monster',{name:'My Mon',power:3000,size:0})); f.monsters.right=mku(mkc('Monster',{name:'My Mon 2',power:3000,size:0})); f.item=mku(mkc('Item',{name:'My Item',power:2000})); callTenbu();`); await settle();
  ck("your own monsters and item are NOT destroyed", run(`!!battle.plr.monsters.left && !!battle.plr.monsters.right && !!battle.plr.item`), run(`JSON.stringify([!!battle.plr.monsters.left, !!battle.plr.monsters.right, !!battle.plr.item])`));
  ck("...and the opponent's chosen cards are", oppCount() === 0, oppCount());
  // #2968 Unruly Tenbu: same family, limit 15000, enter only
  run(`board([10000,10000], false); battle.plr.hand=[2968]; callTenbu();`); await settle();
  ck("#2968: total 20000 > 15000 -> keeps a 10000 subset (1 destroyed, 1 left)", oppCount() === 1, oppCount());
  run(`board([5000,10000], false); battle.plr.hand=[2968]; callTenbu();`); await settle();
  ck("#2968: total exactly 15000 -> both destroyed", oppCount() === 0, oppCount());
  run(`board([10000,10000], true); globalThis.__choose=null; battle.plr.hand=[2968]; callTenbu();`); await settle();
  ck("#2968: human chooses both (20000 > 15000) -> nothing destroyed", oppCount() === 2, oppCount());
  ck("keywords [Double Attack] [Soulguard] are on the card", run(`!!CARD_MAP.get(6462).da && !!CARD_MAP.get(6462).sg`));
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
