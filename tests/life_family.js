// node tests/life_family.js - life-total family: #36 #199 #285 #2424 #5385 #5573
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(side){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide=side||'plr'; battle.turn=battle.activeSide; battle.phase='main'; battle.turnCount=3; battle.matchOver=false;
   me.gauge=me.deck.splice(0,6); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; me.item=null; me.setSpells=[];
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };
 globalThis.spellId=ALL_CARDS.find(c=>c.type==='Spell').id; globalThis.monId=1054;`);
(async () => {
  run(`{ const me=setup('opp'); me.life=1; me.item=mk(CARD_MAP.get(199)); me.deck.unshift(spellId); ABX.core.applyDamage('plr',3,{kind:'effect'}); battle.checkWinCondition(); }`); await settle();
  ck("199: top card is a spell -> life 3, item dropped, top card discarded", val(`return battle.plr.life===3 && !battle.plr.item && battle.plr.drop.includes(199) && battle.plr.drop.includes(spellId) && !battle.matchOver`), val(`return [battle.plr.life, battle.plr.drop, battle.matchOver]`));
  run(`{ const me=setup('opp'); me.life=1; me.item=mk(CARD_MAP.get(199)); me.deck.unshift(monId); ABX.core.applyDamage('plr',3,{kind:'effect'}); battle.checkWinCondition(); }`); await settle();
  ck("199: top card is not a spell -> you still lose", val(`return battle.plr.life<=0 && battle.matchOver`), val(`return [battle.plr.life, battle.matchOver]`));
  run(`{ const me=setup('opp'); const sp=mk(CARD_MAP.get(36)); sp.id=36; sp.soul=[spellId,monId]; me.setSpells=[sp]; me.life=0; const h=me.hand.length; battle.checkWinCondition(); }`); await settle();
  ck("36: a spell in its soul -> life 2, draw a card, spell destroyed", val(`return battle.plr.life===2 && battle.plr.hand.length===1 && battle.plr.setSpells.length===0 && !battle.matchOver`), val(`return [battle.plr.life, battle.plr.hand.length, battle.plr.setSpells.length, battle.matchOver]`));
  run(`{ const me=setup('opp'); const sp=mk(CARD_MAP.get(36)); sp.id=36; sp.soul=[monId,monId]; me.setSpells=[sp]; me.life=0; battle.checkWinCondition(); }`); await settle();
  ck("36: no spell in its soul -> you lose", val(`return battle.matchOver`), 0);
  run(`{ const me=setup(); battle.opp.life=2; me.hand=[285]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("285: lethal damage leaves the opponent on 1", val(`return battle.opp.life===1 && !battle.matchOver`), val(`return [battle.opp.life, battle.matchOver]`));
  run(`{ const me=setup(); battle.opp.life=8; me.hand=[285]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("285: non-lethal damage is a normal 2", val(`return battle.opp.life===6`), val(`return battle.opp.life`));
  run(`{ const me=setup(); me.life=5; battle.opp.life=11; me.hand=[2424]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("2424: opponent ahead by 4+ after +2 -> gain 6 more", val(`return battle.plr.life===13`), val(`return battle.plr.life`));
  run(`{ const me=setup(); me.life=8; battle.opp.life=11; me.hand=[2424]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("2424: not far enough ahead -> only +2", val(`return battle.plr.life===10`), val(`return battle.plr.life`));
  // #5573 attack trigger: destroy a monster; at 6 life or less drop its souls too
  run(`{ const me=setup(); me.life=5; me.monsters.center=mk(CARD_MAP.get(5573)); const t=mk(CARD_MAP.get(monId)); t.soul=[spellId,spellId]; battle.opp.monsters.center=t; ABX.fireAttack('plr',[{unit:me.monsters.center,pos:'center'}],'opp','center'); }`); await settle();
  ck("5573 at life 5: target destroyed and its souls dropped", val(`return !battle.opp.monsters.center && battle.opp.drop.filter(i=>i===spellId).length>=2`), val(`return [!!battle.opp.monsters.center, battle.opp.drop]`));
  run(`{ const me=setup(); me.life=10; me.monsters.center=mk(CARD_MAP.get(5573)); battle.opp.monsters.center=mk(CARD_MAP.get(monId)); ABX.fireAttack('plr',[{unit:me.monsters.center,pos:'center'}],'opp','center'); }`); await settle();
  ck("5573 at life 10: target still destroyed", val(`return !battle.opp.monsters.center`), 0);
  // #5385 win the fight at 22+ life (trigger body)
  const wins = (life) => { run(`{ const me=setup(); me.life=${life}; me.monsters.center=mk(CARD_MAP.get(5385)); globalThis.__ab=ABX.parseCard(CARD_MAP.get(5385)).abilities.find(a=>(a.steps||[]).some(x=>x.op==='r42WinIfLife')); ABX.runAbility('plr',CARD_MAP.get(5385),__ab,me.monsters.center,{auto:true}); }`); };
  wins(25); await settle();
  ck("5385 at life 25: you win", val(`return battle.matchOver===true || !!battle.winner || battle.opp.life<=0`), val(`return [battle.matchOver,battle.winner,battle.opp.life]`));
  wins(15); await settle();
  ck("5385 at life 15: no win", val(`return !battle.matchOver && battle.opp.life>0`), val(`return [battle.matchOver,battle.opp.life]`));
  console.log("pass", pass, "fail", fail);
})();
