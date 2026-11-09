// node tests/hero_d.js - Hero World batch 5: generic [Transform]/[Ride] from hand / drop (#2129 #4972 #6413)
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   me.gauge=me.deck.splice(0,7); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  // #2129: when destroyed -> free [Ride]/[Transform] from hand
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2129)); me.hand=[1042]; battle.destroyMonster('plr','center'); }`); await settle();
  ck("2129 destroyed: rides Martian UFO Takosuke from hand for free", val(`return battle.plr.item&&battle.plr.item.card.id===1042`), val(`return [battle.plr.item&&battle.plr.item.card.id, battle.plr.hand]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2129)); me.hand=[]; battle.destroyMonster('plr','center'); }`); await settle();
  ck("2129 destroyed with nothing to ride: no item", val(`return !battle.plr.item`));
  // #4972 Cosmo Change!: 2 deck -> gauge, then [Transform] as Galaxy Exalt from drop paying cost
  run(`{ const me=setup(); me.drop=[4434]; globalThis.__d=me.deck.length; globalThis.__g=me.gauge.length; ABX.fireSpell('plr',CARD_MAP.get(4972)); }`); await settle();
  ck("4972: transformed into Cosmoman from drop", val(`return battle.plr.item&&battle.plr.item.card.id===4434 && !battle.plr.drop.includes(4434)`), val(`return [battle.plr.item&&battle.plr.item.card.id, battle.plr.drop]`));
  ck("4972: milled 2, paid 2 (gauge +2 -2)", val(`return battle.plr.gauge.length===__g && battle.plr.deck.length<=__d-2`), val(`return [battle.plr.gauge.length,__g,battle.plr.deck.length,__d]`));
  run(`{ const me=setup(); me.drop=[1054]; ABX.fireSpell('plr',CARD_MAP.get(4972)); }`); await settle();
  ck("4972 with no Galaxy Exalt in drop: no transform", val(`return !battle.plr.item`));
  // #6300 / #6302: counters with "if you are [Impact Transform] into a card"
  const impItem = `me.item={card:CARD_MAP.get(__imp),rested:false,attacksLeft:1,soul:[],isTransformed:true}`;
  run(`globalThis.__imp=ALL_CARDS.find(c=>IMX.isImpactMonster(c)).id;`);
  run(`{ const me=setup(); ${impItem}; globalThis.__g=me.gauge.length; globalThis.__l=me.life; globalThis.__h=me.hand.length; ABX.fireSpell('plr',CARD_MAP.get(6300)); }`); await settle();
  ck("6300 impact transformed: gauge+1, life+1, draw 1", val(`const p=battle.plr; return p.gauge.length===__g+1 && p.life===__l+1 && p.hand.length===__h+1`), val(`const p=battle.plr; return [p.gauge.length-__g,p.life-__l,p.hand.length-__h]`));
  run(`{ const me=setup(); globalThis.__g=me.gauge.length; globalThis.__l=me.life; globalThis.__h=me.hand.length; ABX.fireSpell('plr',CARD_MAP.get(6300)); }`); await settle();
  ck("6300 not impact transformed: no bonus", val(`const p=battle.plr; return p.gauge.length===__g && p.life===__l && p.hand.length===__h`), val(`const p=battle.plr; return [p.gauge.length-__g,p.life-__l,p.hand.length-__h]`));
  // #2642 The Third Guy: enters while transformed into a Gaigrander card -> draw
  run(`{ const me=setup(); me.item={card:CARD_MAP.get(6223)||ALL_CARDS.find(c=>/gaigrander/i.test(c.name)),rested:false,attacksLeft:1,soul:[],isTransformed:true}; globalThis.__h=me.hand.length; ABX.fireEnter&&ABX.fireEnter('plr',CARD_MAP.get(2642),mk(CARD_MAP.get(2642))); }`); await settle();
  ck("2642 with Gaigrander transform: draws", val(`return battle.plr.hand.length===__h+1`), val(`return [battle.plr.hand.length,__h]`));
  run(`{ const me=setup(); globalThis.__h=me.hand.length; ABX.fireEnter&&ABX.fireEnter('plr',CARD_MAP.get(2642),mk(CARD_MAP.get(2642))); }`); await settle();
  ck("2642 without transform: no draw", val(`return battle.plr.hand.length===__h`));
  // #4525 drop a Battle Building monster, add a Battle Building [Set] spell, shuffle
  run(`globalThis.__bbm=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('BattleBuilding')).id`);
  run(`{ const me=setup(); me.deck=[1054,__bbm,4432,1054]; me.hand=[]; me.drop=[]; ABX.fireSpell('plr',CARD_MAP.get(4525),{free:true}); }`); await settle();
  ck("4525: BB monster dropped, BB Set spell in hand", val(`const p=battle.plr; return p.drop.includes(__bbm) && p.hand.includes(4432) && p.deck.length===2`), val(`const p=battle.plr; return [p.drop,p.hand,p.deck.length]`));
  // #1628 top card to gauge (auto-play keeps the next card on top)
  run(`{ const me=setup(); me.gauge=[]; me.deck=[1,2,3]; ABX.fireSpell('plr',CARD_MAP.get(1628),{free:true}); }`); await settle();
  ck("1628: one card to gauge, next stays on top", val(`const p=battle.plr; return p.gauge.length===1 && p.deck.join()==='2,3'`), val(`const p=battle.plr; return [p.gauge,p.deck]`));
  // #3216 discard Caardian + 1 gauge -> draw two
  run(`globalThis.__caar=ALL_CARDS.find(c=>/caardian/i.test(c.name)&&c.id!==3216).id`);
  run(`{ const me=setup(); me.hand=[__caar]; me.deck=[1,2,3]; me.gauge=[5,6]; const ab=ABX.get(CARD_MAP.get(3216)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(3216),ab,null,{event:{name:'act'}}); }`); await settle();
  ck("3216: Caardian discarded, gauge paid, drew two", val(`const p=battle.plr; return p.hand.length===2 && p.gauge.length===1 && p.drop.includes(__caar)`), val(`const p=battle.plr; return [p.hand,p.gauge,p.drop]`));
  // #2001 opp top card: monster -> Double Attack
  run(`{ const me=setup(), op=battle.opp; op.deck=[105,1054]; op.drop=[]; const u=mk(CARD_MAP.get(2001)); me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(2001)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(2001),ab,u,{event:{name:'act'}}); }`); await settle();
  ck("2001: opp top monster milled -> Double Attack", val(`return battle.opp.drop.length===1 && battle.plr.monsters.center.tempDA===true`), val(`return [battle.opp.drop.length,battle.plr.monsters.center.tempDA]`));
  // #6295 look three: one to gauge, one to hand, rest dropped (auto)
  run(`{ const me=setup(); me.gauge=[]; me.hand=[]; me.drop=[]; me.deck=[1,2,3,4]; ABX.fireSpell('plr',CARD_MAP.get(6295),{free:true}); }`); await settle();
  ck("6295: 1 gauge, 1 hand, 1 dropped, deck 1 left", val(`const p=battle.plr; return p.gauge.length===1 && p.hand.length===1 && p.drop.length===1 && p.deck.length===1`), val(`const p=battle.plr; return [p.gauge,p.hand,p.drop,p.deck]`));
  // #6306 item soul bonus: 1 soul -> 2 gauge + 2 life, no draw; 3 souls -> also draw
  for (const souls of [0, 1, 3]) {
    run(`{ const me=setup(); me.gauge=[]; me.hand=[]; me.life=10; me.deck=[1,2,3,4,5]; me.item=mk(CARD_MAP.get(199)); me.item.soul=new Array(${souls}).fill(1054); ABX.fireSpell('plr',CARD_MAP.get(6306),{free:true}); }`); await settle();
    ck("6306 item with " + souls + " souls", val(souls === 0 ? `const p=battle.plr; return p.gauge.length===0 && p.life===10` : `const p=battle.plr; return p.gauge.length===2 && p.life===12 && p.hand.length===${souls >= 3 ? 1 : 0}`), val(`const p=battle.plr; return [p.gauge.length,p.life,p.hand.length]`));
  }
  // #3287 Computer monster destroyed this turn -> one back from drop
  run(`globalThis.__comp=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/^computer$/i.test(a))).id`);
  for (const hit of [true, false]) {
    run(`{ const me=setup(); me.hand=[]; me.drop=[__comp]; ${hit ? "me.abxDestroyedTurn={[__comp]:battle.turnCount};" : ""} ABX.fireSpell('plr',CARD_MAP.get(3287),{free:true}); }`); await settle();
    ck("3287 " + (hit ? "Computer destroyed: returned" : "none destroyed: stays"), val(hit ? `return battle.plr.hand.includes(__comp) && battle.plr.drop.length===0` : `return battle.plr.hand.length===0 && battle.plr.drop.length===1`), val(`return [battle.plr.hand,battle.plr.drop]`));
  }
  console.log(`\npass ${pass} fail ${fail}`);
})();
