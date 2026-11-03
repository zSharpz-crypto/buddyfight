// node tests/hero_c.js - Hero World batch 3: element conditions #3219 #3278 #3280, #1987 Killnight, #2566 Biggest, #3282 Larger
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.el=(t)=>ALL_CARDS.find(c=>(c.attrs||[]).includes(t)&&c.type==='Monster'&&!c.skill).id;
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   me.gauge=me.deck.splice(0,4); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); op.monsters.left=mk(CARD_MAP.get(50)); op.monsters.center=mk(CARD_MAP.get(51)); return me; };
 globalThis.enterImpact=function(id){ const me=battle.plr; me.monsters.center=mk(CARD_MAP.get(id)); ABX.fireEnter('plr',CARD_MAP.get(id),me.monsters.center); };`);
(async () => {
  run(`{ const me=setup(); me.drop=[el('Earth'),el('Wind')]; enterImpact(3219); }`); await settle();
  ck("3219 Earth+Wind in drop: returns an opposing card to hand and gains 1 life", val(`return battle.opp.hand.length===1 && battle.plr.life===11`), val(`return [battle.opp.hand.length, battle.plr.life]`));
  run(`{ const me=setup(); me.drop=[el('Earth')]; enterImpact(3219); }`); await settle();
  ck("3219 only Earth in drop: nothing", val(`return battle.opp.hand.length===0 && battle.plr.life===10`), val(`return [battle.opp.hand.length, battle.plr.life]`));
  run(`{ const me=setup(); me.drop=[el('Fire'),el('Water')]; battle.opp.monsters.center.soul=[60]; enterImpact(3280); }`); await settle();
  ck("3280 Fire+Water in drop: opposing monster destroyed", val(`return ['left','center'].filter(p=>battle.opp.monsters[p]).length===1`), val(`return ['left','center'].filter(p=>battle.opp.monsters[p]).length`));
  run(`{ const me=setup(); me.drop=[el('Fire')]; enterImpact(3280); }`); await settle();
  ck("3280 only Fire in drop: nothing destroyed", val(`return ['left','center'].filter(p=>battle.opp.monsters[p]).length===2`), val(`return ['left','center'].filter(p=>battle.opp.monsters[p]).length`));
  // #3278 four independent element effects
  run(`{ const me=setup(); me.drop=[el('Fire'),el('Water'),el('Wind'),el('Earth')]; me.hand=[3278]; globalThis.__p=[battle.opp.life, me.gauge.length, me.deck.length]; ABX.OPS.r42Killnight && 0; const c=CARD_MAP.get(3278); battle.opp.monsters.left=null; me.monsters.center=mk(CARD_MAP.get(51)); me.hand=[]; me.drop.push(3278); ABX.runCounter('plr',c,{attSide:'opp',attackerZones:['center'],targetPos:'fighter'}); }`); await settle();
  ck("3278 all four elements: 1 damage, +1 gauge, draw, +1 life", val(`return battle.opp.life===9 && battle.plr.gauge.length===__p[1]+1 && battle.plr.hand.length===1 && battle.plr.life===11`), val(`return [battle.opp.life, battle.plr.gauge.length, battle.plr.hand.length, battle.plr.life]`));
  run(`{ const me=setup(); me.drop=[el('Fire')]; globalThis.__p=[me.gauge.length]; const c=CARD_MAP.get(3278); me.drop.push(3278); ABX.runCounter('plr',c,{attSide:'opp',attackerZones:['center'],targetPos:'fighter'}); }`); await settle();
  ck("3278 only Fire: 1 damage and nothing else", val(`return battle.opp.life===9 && battle.plr.gauge.length===__p[0] && battle.plr.hand.length===0 && battle.plr.life===10`), val(`return [battle.opp.life, battle.plr.gauge.length, battle.plr.hand.length, battle.plr.life]`));
  // #1987 Killnight discarded from hand
  run(`{ const me=setup(); me.hand=[1987]; globalThis.__g=me.gauge.length; me.hand.splice(0,1); me.drop.push(1987); ABX.fireDiscarded('plr',CARD_MAP.get(1987)); }`); await settle();
  ck("1987 discarded from hand: top card into gauge (auto pick)", val(`return battle.plr.gauge.length===__g+1`), val(`return [battle.plr.gauge.length, __g]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1987)); globalThis.__g=me.gauge.length; battle.destroyMonster('plr','center'); }`); await settle();
  ck("1987 destroyed on the field: NOT the discard effect", val(`return battle.plr.gauge.length===__g && battle.opp.gauge.length===3`), val(`return [battle.plr.gauge.length, battle.opp.gauge.length]`));
  // #2566 Biggest: not on a normal call
  run(`{ const me=setup(); me.hand=[2566]; me.gauge=me.deck.splice(0,4); battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("2566 normal call: opponent's gauge untouched", val(`return battle.opp.gauge.length===3 && battle.opp.drop.length===0`), val(`return [battle.opp.gauge.length, battle.opp.drop.length]`));
  // #3282 Larger: two Droid monsters from drop to the top of the deck
  const droid = JSON.parse(run(`JSON.stringify(ALL_CARDS.filter(c=>/droid/i.test(c.name)&&c.type==='Monster'&&c.id!==3282).slice(0,2).map(c=>c.id))`));
  run(`{ const me=setup(); me.drop=[${droid[0]},${droid[1]}]; me.hand=[3282]; battle.completeMonsterCall('plr','center',0,false,false); }`); await settle();
  ck("3282 enter: both Droid monsters go from the drop zone to the top of the deck", val(`const d=battle.plr.deck; return battle.plr.drop.length===0 && d.slice(0,2).includes(${droid[0]}) && d.slice(0,2).includes(${droid[1]})`), val(`return [battle.plr.drop, battle.plr.deck.slice(0,3)]`));
  console.log("pass", pass, "fail", fail);
})();
