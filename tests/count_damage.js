// node tests/count_damage.js - "deal damage equal to ..." family: #869 #1360 #1672 #1762 #3749 #4267 #4600
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 24; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3; battle.matchOver=false;
   me.gauge=me.deck.splice(0,8); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=20; me.item=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };
 globalThis.byName=(re,type)=>ALL_CARDS.filter(c=>re.test(c.name)&&(!type||c.type===type));
 globalThis.spellId=ALL_CARDS.find(c=>c.type==='Spell').id;`);
(async () => {
  // #1360: 2 + souls of the ridden card (3 souls) = 5, unreducible
  run(`{ const me=setup(); me.item=mk(CARD_MAP.get(1054)); me.item.soul=[spellId,spellId,spellId]; me.hand=[1360]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("1360: 2 damage + 3 soul cards = 5", val(`return battle.opp.life===15`), val(`return battle.opp.life`));
  // #1672: 2 + up to three soul cards moved to drop = 5
  run(`{ const me=setup(); me.life=4; me.monsters.center=mk(CARD_MAP.get(1054)); me.monsters.center.soul=[spellId,spellId,spellId,spellId]; me.hand=[1672]; battle.castSpellFromHand('plr',0); }`); await settle();
  ck("1672: drops 3 soul cards and deals 2+3 = 5", val(`return battle.opp.life===15 && battle.plr.monsters.center.soul.length===1 && battle.plr.drop.filter(i=>i===spellId).length===3`), val(`return [battle.opp.life, battle.plr.monsters.center.soul.length, battle.plr.drop.length]`));
  // #1762: destroy all Black Dragon monsters, damage = total crit
  const bd = JSON.parse(run(`JSON.stringify(ALL_CARDS.filter(c=>c.type==='Monster'&&(c.attrs||[]).includes('BlackDragon')).slice(0,2).map(c=>[c.id,c.crit]))`));
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(${bd[0][0]})); me.monsters.right=mk(CARD_MAP.get(${bd[1][0]})); me.monsters.center=mk(CARD_MAP.get(1054)); me.hand=[1762]; globalThis.__crit=ABX.core && 0; battle.castSpellFromHand('plr',0); }`); await settle();
  const exp = bd.reduce((a, x) => a + (x[1] == null ? 1 : x[1]), 0);
  ck("1762: both Black Dragons destroyed, damage = total critical (" + exp + ")", val(`return !battle.plr.monsters.left && !battle.plr.monsters.right && !!battle.plr.monsters.center && battle.opp.life===${20 - exp}`), val(`return [battle.opp.life, !!battle.plr.monsters.left, !!battle.plr.monsters.right]`));
  // #3749: 2 + times the opponent attacked this turn (3)
  run(`{ const me=setup(); battle.activeSide='opp'; const ts=ABX.core.turnStats(battle.opp); ts.attacks=3; me.hand=[3749]; const op=battle.opp; ABX.runAbility('plr',CARD_MAP.get(3749),ABX.parseCard(CARD_MAP.get(3749)).abilities.find(a=>(a.steps||[]).some(x=>x.op==='r42CountDamage')),null,{auto:true}); }`); await settle();
  ck("3749: 2 + 3 attacks = 5 damage", val(`return battle.opp.life===15`), val(`return battle.opp.life`));
  // #4267: 2 + monsters my cards destroyed this turn
  run(`{ const me=setup(); battle.opp.monsters.left=mk(CARD_MAP.get(1054)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); battle.destroyMonster('opp','left'); battle.destroyMonster('opp','center'); globalThis.__ab=ABX.parseCard(CARD_MAP.get(4267)).abilities.find(a=>(a.steps||[]).some(x=>x.op==='r42CountDamage')); ABX.runAbility('plr',CARD_MAP.get(4267),__ab,null,{auto:true}); }`); await settle();
  ck("4267: 2 + 2 destroyed = 4 damage", val(`return battle.opp.life===16`), val(`return battle.opp.life`));
  // #4600 counter: nullify + damage = total crit of attackers
  run(`{ const me=setup(); const a=mk(CARD_MAP.get(1054)); a.tempCrit=2; battle.opp.monsters.center=a; ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',nullified:false,link:false,attUnits:[a],defUnit:null}; globalThis.__ab=ABX.parseCard(CARD_MAP.get(4600)).abilities.find(a=>(a.steps||[]).some(x=>x.op==='r42CountDamage')); ABX.runAbility('plr',CARD_MAP.get(4600),__ab,null,{auto:true}); }`); await settle();
  ck("4600: attack nullified and damage equals the attacker's critical (card crit + 2)", val(`return ABX.battleCtx.nullified===true && battle.opp.life===20-(((CARD_MAP.get(1054).crit==null)?1:CARD_MAP.get(1054).crit)+2)`), val(`return [ABX.battleCtx&&ABX.battleCtx.nullified, battle.opp.life]`));
  // #869: destroy a Purgatory Knights monster, nullify, damage = its critical
  const pk = JSON.parse(run(`JSON.stringify(ALL_CARDS.filter(c=>c.type==='Monster'&&/Purgatory Knights/.test(c.name)).slice(0,1).map(c=>[c.id,c.crit]))`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(${pk[0][0]})); const a=mk(CARD_MAP.get(1054)); battle.opp.monsters.center=a; ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',nullified:false,link:false,attUnits:[a],defUnit:null}; globalThis.__ab=ABX.parseCard(CARD_MAP.get(869)).abilities.find(a=>(a.steps||[]).some(x=>x.op==='r42CountDamage')); ABX.runAbility('plr',CARD_MAP.get(869),__ab,null,{auto:true}); }`); await settle();
  const pc = pk[0][1] == null ? 1 : pk[0][1];
  ck("869: Knight destroyed, attack nullified, damage = its critical (" + pc + ")", val(`return !battle.plr.monsters.center && ABX.battleCtx.nullified===true && battle.opp.life===${20 - pc}`), val(`return [!!battle.plr.monsters.center, ABX.battleCtx&&ABX.battleCtx.nullified, battle.opp.life]`));
  console.log("pass", pass, "fail", fail);
})();
