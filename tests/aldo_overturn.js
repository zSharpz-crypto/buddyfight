// node tests/aldo_overturn.js - #3747 Heavenly Crystal Dragon, Aldo Athora [Overturn]: offered when the opponent's cards would attack; pay 1 gauge + drop a hand card;
// this turn: cannot be destroyed, opponent's cards attack alone, the attack's target becomes this card and the opponent takes 1 damage.
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 40; i++) { await new Promise(r => setImmediate(r)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.mon=(id)=>mk(CARD_MAP.get(id));
 globalThis.base=function(o){ o=o||{}; battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.opp; me.gauge=me.deck.splice(0,o.gauge==null?3:o.gauge); me.life=10; me.drop=[]; me.hand=o.hand===0?[]:[ALL_CARDS.find(x=>x.type==='Monster'&&!x.skill).id];
   ['left','center','right'].forEach(p=>me.monsters[p]=null); me.monsters.center=mon(3747); me.monsters.left=mon(4281);
   const a=battle.plr; a.life=10; ['left','center','right'].forEach(p=>a.monsters[p]=null); a.monsters.center=mon(4281); a.monsters.left=mon(4282); a.monsters.right=mon(4281);
   battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=5; globalThis.__info={attackerZones:['center'],targetPos:'left',attUnits:[a.monsters.center]}; return me; };
 globalThis.offer=()=>ABX.fieldCounterOptions('opp',__info).find(o=>o.card.id===3747);`);
(async () => {
  run(`base();`);
  ck("Overturn is offered when the opponent's card attacks", val(`return !!offer()`));
  ck("NOT offered outside an attack (free window)", !val(`return ABX.freeFieldCounterOptions('opp').some(o=>o.card.id===3747)`));
  run(`base({hand:0});`);
  ck("NOT offered without a hand card to drop", !val(`return !!offer()`));
  run(`base({gauge:0});`);
  ck("NOT offered without 1 gauge", !val(`return !!offer()`));
  // use it
  run(`base(); globalThis.__k=offer().key; globalThis.__p0=battle.plr.life; globalThis.__g0=battle.opp.gauge.length; globalThis.__h0=battle.opp.hand.length; ABX.useFieldCounter('opp',__k,__info).then(r=>{globalThis.__r=r;});`); await settle();
  ck("the target is changed to Aldo Athora (center)", val(`return __r && __r.targetPos`) === "center", val(`return __r`));
  ck("cost paid: 1 gauge and 1 hand card", val(`return [__g0-battle.opp.gauge.length, __h0-battle.opp.hand.length]`).join() === "1,1", val(`return [battle.opp.gauge.length, battle.opp.hand.length]`));
  ck("the attacking player takes 1 damage", val(`return __p0-battle.plr.life`) === 1, val(`return battle.plr.life`));
  ck("Aldo Athora cannot be destroyed this turn (by anything)", val(`return ABX.core.isProtected(battle.opp.monsters.center,'opp','destroyed',{side:'plr'})&&ABX.core.isProtected(battle.opp.monsters.center,'opp','destroyed',{side:'opp'})`));
  ck("only once per game", !val(`return !!offer()`));
  // later attacks this turn (Overturn already active from above)
  run(`globalThis.__ex=null; battle.executeAttackResolution=function(a,z,t,n){ globalThis.__ex={z:z,t:t}; };
       globalThis.__p1=battle.plr.life; battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack';
       battle.initiateAttackWithDefenseCheck('plr',['left','right'],'left');`); await settle();
  ck("later link attack is cut down to attacking alone", val(`return __ex&&__ex.z.length`) === 1, val(`return __ex`));
  ck("later attack is redirected to Aldo Athora", val(`return __ex&&__ex.t`) === "center", val(`return __ex`));
  ck("later attack also costs the attacker 1 damage", val(`return __p1-battle.plr.life`) === 1, val(`return battle.plr.life`));
  run(`battle.linkAttackers=['left']; battle.toggleLinkAttackerZone('plr','right');`);
  ck("cannot add a second card to a link attack", val(`return battle.linkAttackers.join()`) === "left", val(`return battle.linkAttackers`));
  run(`battle.turnCount=6; battle.linkAttackers=[]; globalThis.__ex=null; globalThis.__p2=battle.plr.life; battle.initiateAttackWithDefenseCheck('plr',['left','right'],'left');`); await settle();
  ck("next turn: no redirect, no damage, link allowed", val(`return __ex&&__ex.t`) === "left" && val(`return __ex.z.length`) === 2 && val(`return __p2-battle.plr.life`) === 0, val(`return [__ex, __p2, battle.plr.life]`));
  // #5677 Sunlight Aldo Athora [Overturn] (act, opponent's turn): all «Prism Dragon» cannot be destroyed / leave the field by the opponent's effects, defense+1000000
  run(`battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr; me.gauge=me.deck.splice(0,3); me.hand=[ALL_CARDS.find(x=>x.type==='Monster'&&!x.skill).id]; ['left','center','right'].forEach(p=>me.monsters[p]=null);
   me.monsters.center=mon(5677); me.monsters.left=mon(2797); me.monsters.right=mon(4281); battle.turn='opp'; battle.activeSide='opp'; battle.phase='main'; battle.turnCount=6;`);
  const P = (u, k) => val(`return ABX.core.isProtected(battle.plr.monsters.${u},'plr','${k}',{side:'opp'})`);
  ck("5677 before use: Prism Dragon is not protected", !P('left', 'destroyed'));
  run(`ABX.useAct('plr',CARD_MAP.get(5677),battle.plr.monsters.center);`); await settle();
  ck("5677 dropped a hand card", val(`return battle.plr.hand.length`) === 0);
  ck("5677 Prism Dragon cannot be destroyed by opp effects", P('left', 'destroyed'));
  ck("5677 Prism Dragon cannot leave the field by opp effects", P('left', 'leave the field'));
  ck("5677 a non-Prism monster is not protected", !P('right', 'destroyed'));
  ck("5677 Prism Dragon got defense+1000000", val(`return getUnitEffectiveCombatStats(battle.plr, battle.plr.monsters.left).defense`) >= 1000000);
  run(`battle.turnCount=7;`);
  ck("5677 protection ends with the turn", !P('left', 'destroyed'));
  console.log(`pass ${pass} fail ${fail}`);
})();
