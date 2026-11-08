// node tests/delayed_watch.js - "For this turn, when that monster is destroyed / attacks" spells: #1440 #2016 #2977
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(id){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   me.gauge=me.deck.splice(0,6); op.gauge=op.deck.splice(0,3); me.hand=[id]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null; me.item=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); op.monsters.center=mk(CARD_MAP.get(1054)); me.monsters.center=mk(CARD_MAP.get(1054)); return me; };`);
(async () => {
  run(`{ const me=setup(1440); globalThis.__h=me.hand.length; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("1440 cast: nothing drawn yet", val(`return battle.plr.hand.length===__h-1 && battle.plr.life===10`), val(`return [battle.plr.hand.length,__h,battle.plr.life]`));
  run(`battle.destroyMonster('opp','center')`); await settle();
  ck("1440: when that monster is destroyed, draw a card and gain 1 life", val(`return battle.plr.hand.length===__h && battle.plr.life===11`), val(`return [battle.plr.hand.length,__h,battle.plr.life]`));
  run(`{ const me=setup(1440); globalThis.__h=me.hand.length; battle.castSpellFromHand('plr',0); }`); await settle(); run(`battle.turnCount=4; battle.destroyMonster('opp','center')`); await settle();
  ck("1440: no effect on a later turn", val(`return battle.plr.hand.length===__h-1`), val(`return [battle.plr.hand.length,__h]`));
  run(`{ const me=setup(2016); globalThis.__g=me.gauge.length; battle.castSpellFromHand('plr',0); }`); await settle(); run(`battle.destroyMonster('opp','center')`); await settle();
  ck("2016: destroyed -> gauge +1 and draw", val(`return battle.plr.gauge.length===__g+1 && battle.plr.hand.length===1`), val(`return [battle.plr.gauge.length,__g,battle.plr.hand.length]`));
  // #2977 Hero World spell: chosen own monster attacks this turn -> destroy a size 1 or less opposing monster, +1 gauge
  run(`{ const me=setup(2977); op=battle.opp; op.monsters.left=mk(CARD_MAP.get(1054)); globalThis.__g=me.gauge.length; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("2977 cast: nothing destroyed yet", val(`return !!battle.opp.monsters.left && !!battle.opp.monsters.center`), val(`return 0`));
  run(`{ ABX.fireAttack('plr',[{unit:battle.plr.monsters.center,pos:'center'}],'opp','center'); }`); await settle();
  ck("2977: when the chosen monster attacks, a size 1 opposing monster is destroyed and gauge +1", val(`return ['left','center','right'].filter(p=>battle.opp.monsters[p]).length===1 && battle.plr.gauge.length===__g+1`), val(`return [['left','center','right'].filter(p=>battle.opp.monsters[p]).length, battle.plr.gauge.length, __g]`));
  // ---- part 2 ----
  const pk = val(`return ALL_CARDS.find(c=>c.type==='Monster'&&/Purgatory Knights/.test(c.name)).id`);
  // #2233: next time the chosen Purgatory Knights would be destroyed -> back to hand, top deck card to gauge (only once)
  run(`{ const me=setup(2233); me.monsters.left=mk(CARD_MAP.get(${pk})); globalThis.__g=me.gauge.length; battle.castSpellFromHand('plr',0); }`); await settle();
  run(`battle.destroyMonster('plr','left')`); await settle();
  ck("2233: destroyed -> returns to hand and gauge +1", val(`return !battle.plr.monsters.left && battle.plr.hand.includes(${pk}) && battle.plr.gauge.length===__g+1 && !battle.plr.drop.includes(${pk})`), val(`return [!!battle.plr.monsters.left, battle.plr.hand, battle.plr.gauge.length, __g, battle.plr.drop]`));
  // #2598: remains on the field the next time the opponent destroys it; own effects don't count
  run(`{ const me=setup(2598); me.monsters.center=null; me.monsters.left=mk(CARD_MAP.get(1054)); battle.activeSide='opp'; battle.turn='opp'; battle.castSpellFromHand('plr',0); }`); await settle();
  run(`battle.destroyMonster('plr','left')`); await settle();
  ck("2598: opponent's destruction -> it remains on the field", val(`return !!battle.plr.monsters.left`), val(`return [!!battle.plr.monsters.left, battle.plr.drop]`));
  run(`battle.destroyMonster('plr','left')`); await settle();
  ck("2598: only the next time (second destruction works)", val(`return !battle.plr.monsters.left`), 0);
  // #5865: damage by card effects reduced to 0, 1 damage back per damage reduced (once)
  run(`{ const me=setup(5865); me.monsters.center=mk(CARD_MAP.get(5865)); ABX.runAbility('plr',CARD_MAP.get(5865),ABX.parseCard(CARD_MAP.get(5865)).abilities.find(a=>(a.steps||[]).some(x=>x.op==='r42DmgShield')),me.monsters.center,{auto:true}); }`); await settle();
  run(`ABX.core.applyDamage('plr',3,{kind:'effect'})`); await settle();
  ck("5865: 3 effect damage -> I take 0, opponent takes 3", val(`return battle.plr.life===10 && battle.opp.life===7`), val(`return [battle.plr.life, battle.opp.life]`));
  run(`ABX.core.applyDamage('plr',2,{kind:'effect'})`); await settle();
  ck("5865: only the next time (second damage lands)", val(`return battle.plr.life===8`), val(`return battle.plr.life`));
  // #1426: chosen monster attacks a monster -> a soul card goes to the drop zone, then the attacked monster is destroyed
  run(`{ const me=setup(1426); me.monsters.center=mk(CARD_MAP.get(1054)); const t=mk(CARD_MAP.get(1054)); t.soul=[1054]; battle.opp.monsters.center=t; battle.castSpellFromHand('plr',0); }`); await settle();
  run(`ABX.fireAttack('plr',[{unit:battle.plr.monsters.center,pos:'center'}],'opp','center')`); await settle();
  ck("1426: attacked monster loses a soul to the drop zone and is destroyed", val(`return !battle.opp.monsters.center && battle.opp.drop.filter(i=>i===1054).length>=2`), val(`return [!!battle.opp.monsters.center, battle.opp.drop]`));
  console.log("pass", pass, "fail", fail);
})();
