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
  console.log("pass", pass, "fail", fail);
})();
