// node tests/sao_a.js - SAO (#6085 #6079)
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
  for (const where of ["deck", "drop"]) {
    run(`{ const me=setup(); me.deck=[1054,${where === "deck" ? "6104," : ""}1054]; me.drop=${where === "drop" ? "[6104]" : "[]"}; me.hand=[]; const u=mk(CARD_MAP.get(6085)); me.monsters.center=u; ABX.fireEnter('plr',CARD_MAP.get(6085),u); }`); await settle();
    ck("6085 Pina found in " + where, val(`return battle.plr.hand.filter(x=>x===6104).length===1 && !battle.plr.drop.includes(6104) && !battle.plr.deck.includes(6104)`), val(`return [battle.plr.hand,battle.plr.drop,battle.plr.deck]`));
  }
  run(`{ const me=setup(), op=battle.opp; me.drop=[1,2,3]; op.drop=[4,5]; me.life=3; op.life=7; me.deck=[8]; op.deck=[9]; const u=mk(CARD_MAP.get(1054)); u.soul=[11,12]; op.monsters.center=u; ABX.fireSpell('plr',CARD_MAP.get(6079),{free:true}); }`); await settle();
  ck("6079: drops emptied into decks, souls included, both life 10", val(`const p=battle.plr,o=battle.opp; return p.drop.length===0 && o.drop.length===0 && p.life===10 && o.life===10 && p.deck.length===4 && o.deck.length===5`), val(`const p=battle.plr,o=battle.opp; return [p.drop.length,o.drop.length,p.life,o.life,p.deck.length,o.deck.length,o.monsters.center&&o.monsters.center.soul.length]`));
  // #6088 Set spell lets Moonlit Black Cats items attack past a center character
  run(`globalThis.__mi=ALL_CARDS.find(c=>c.type==='Item'&&(c.attrs||[]).includes('MoonlitBlackCats'))`);
  for (const set of [false, true]) {
    run(`{ const me=setup(); me.setSpells=${set ? "[CARD_MAP.get(6088)]" : "[]"}; globalThis.__ca=ABX.canAttackThrough('plr',{card:(__mi||{card:CARD_MAP.get(6076)}).card||__mi},'own'); }`);
    ck("6088 " + (set ? "Set: item may attack past center" : "not Set: no"), val(`return __ca===${set}`), val(`return [__ca,!!__mi]`));
  }
  // #6080 link attack: soul dropped from an opposing card, opponent discards one card (once)
  run(`{ const me=setup(), op=battle.opp; op.hand=[1054,1054]; const u=mk(CARD_MAP.get(1054)); u.soul=[11]; op.monsters.center=u; const a=mk(CARD_MAP.get(6080)); me.monsters.left=a; const ab=ABX.get(CARD_MAP.get(6080)).abilities.find(x=>x.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(6080),ab,a,{event:{name:'link'}}); }`); await settle();
  ck("6080: one soul dropped, opponent discards exactly one", val(`const o=battle.opp; return o.monsters.center.soul.length===0 && o.hand.length===1 && o.drop.length===2`), val(`const o=battle.opp; return [o.monsters.center.soul.length,o.hand.length,o.drop.length]`));
  console.log("\npass " + pass + " fail " + fail);
})();
