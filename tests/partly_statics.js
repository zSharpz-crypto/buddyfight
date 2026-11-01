// node tests/partly_statics.js - continuous statics that were dead text: size reductions / crit bonus from souls / center-only protections
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 10; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
  globalThis.put=function(side,pos,id,soul){ const u={card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0}; battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3;
    ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; }); };
  globalThis.size=function(u){ return getEffectiveCardSize(battle.plr, u.card, u); };`);
  // 3831: monsters on your center -> size 1 less
  run(`fresh(); globalThis.u=put('plr','left',3831);`); ck("3831 no center: size 1", val(`return size(u)===1`), val(`return size(u)`));
  run(`put('plr','center',5159);`); ck("3831 monster in center: size 0", val(`return size(u)===0`), val(`return size(u)`));
  // 1970: -1 size per card in souls of your field cards
  run(`fresh(); globalThis.u=put('plr','left',1970); put('plr','center',5159,[100,101]);`); ck("1970 two souls on field: size 3-2", val(`return size(u)===1`), val(`return size(u)`));
  // 1641: three or more cards in souls -> crit+2
  run(`fresh(); put('plr','center',5159,[100,101,102]); battle.plr.item={card:card(1641),rested:false,attacksLeft:1,soul:[],itemMode:'equip'};`);
  ck("1641 three souls: crit +2", val(`const s=getUnitEffectiveCombatStats(battle.plr,battle.plr.item); return s.crit===(card(1641).crit||1)+2`), val(`return [getUnitEffectiveCombatStats(battle.plr,battle.plr.item).crit, card(1641).crit]`));
  run(`fresh(); put('plr','center',5159,[100]); battle.plr.item={card:card(1641),rested:false,attacksLeft:1,soul:[],itemMode:'equip'};`);
  ck("1641 one soul: no bonus", val(`const s=getUnitEffectiveCombatStats(battle.plr,battle.plr.item); return s.crit===(card(1641).crit||1)`));
  // 2808: on center cannot be destroyed by card effects during opp's turn (battle destruction still works)
  const eff = (side, pos) => `(async()=>{ const ab={kind:'spell',steps:[{op:'destroy',np:{raw:'a monster',qty:{n:1,upTo:false,all:false,any:false,each:false},ref:null,self:false,filter:{types:['monster']},zone:{owner:'opp',area:'field'},excludeSelf:false,topN:null,soulOf:null}}]}; await ABX.runAbility('${side}', card(5159), ab, null, {preApproved:true}); })()`;
  run(`fresh(); put('plr','center',2808); battle.activeSide='opp'; ${eff('opp')}`); await settle();
  ck("2808 center, opp turn: survives effect destroy", val(`return !!battle.plr.monsters.center`));
  run(`fresh(); put('plr','left',2808); battle.activeSide='opp'; ${eff('opp')}`); await settle();
  ck("2808 not on center: destroyed", val(`return !battle.plr.monsters.left`));
  run(`fresh(); put('plr','center',2808); battle.activeSide='plr'; ${eff('plr').replace("owner:'opp'","owner:'you'")}`); await settle();
  ck("2808 center, own turn: can be destroyed by effect", val(`return !battle.plr.monsters.center`));
  // 2196: on center, no damage from opponent's card effects
  run(`fresh(); put('plr','center',2196); battle.activeSide='opp'; ABX.core.applyDamage('plr',3,{kind:'effect',sourceSide:'opp'});`); await settle();
  ck("2196 center: no effect damage", val(`return battle.plr.life===10`), val(`return battle.plr.life`));
  run(`fresh(); put('plr','left',2196); battle.activeSide='opp'; ABX.core.applyDamage('plr',3,{kind:'effect',sourceSide:'opp'});`); await settle();
  ck("2196 not on center: takes effect damage", val(`return battle.plr.life===7`), val(`return battle.plr.life`));
  // 2711 in the soul of a Weapon: crit+1 per soul, Penetrate with 3+ souls
  const wp = val(`const w=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/^weapon$/i.test(a))); return w?w.id:0`);
  if (wp) {
    run(`fresh(); globalThis.w=put('plr','left',${wp},[2711,100]);`);
    ck("2711 2 souls: crit +2, no pen", val(`const s=getUnitEffectiveCombatStats(battle.plr,w); return s.crit===(card(${wp}).crit||1)+2 && (!s.pen || !!card(${wp}).pen)`), val(`return JSON.stringify(getUnitEffectiveCombatStats(battle.plr,w))`));
    run(`w.soul=[2711,100,101];`);
    ck("2711 3 souls: Penetrate", val(`return !!getUnitEffectiveCombatStats(battle.plr,w).pen`));
  }
  // 1676: no damage from opponent's effects
  run(`fresh(); put('plr','left',1676); battle.activeSide='opp'; ABX.core.applyDamage('plr',3,{kind:'effect',sourceSide:'opp'});`);
  ck("1676 on field: no effect damage from opponent", val(`return battle.plr.life===10`), val(`return battle.plr.life`));
  run(`fresh(); put('plr','left',1676); ABX.core.applyDamage('plr',3,{kind:'attack'});`);
  ck("1676 still takes attack damage", val(`return battle.plr.life===7`), val(`return battle.plr.life`));
  // item-equipped statics
  run(`fresh(); globalThis.y=put('plr','left',3404); battle.plr.item={card:card(349),rested:false,attacksLeft:1,soul:[],itemMode:'equip'};`);
  ck("3404 with a Sword of the King equipped: crit+2", val(`return getUnitEffectiveCombatStats(battle.plr,y).crit===(card(3404).crit||1)+2`), val(`return getUnitEffectiveCombatStats(battle.plr,y).crit`));
  run(`fresh(); globalThis.y=put('plr','left',3404);`);
  ck("3404 without: no bonus", val(`return getUnitEffectiveCombatStats(battle.plr,y).crit===(card(3404).crit||1)`));
  run(`fresh(); globalThis.y=put('plr','left',3400); battle.plr.item={card:card(349),rested:false,attacksLeft:1,soul:[],itemMode:'equip'};`);
  ck("3400 crit equals the equipped Sword of the King's (349 = 3)", val(`return getUnitEffectiveCombatStats(battle.plr,y).crit===3`), val(`return getUnitEffectiveCombatStats(battle.plr,y).crit`));
  const kai = val(`const k=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Kaiju')&&c.size>=2); return k?k.id:0`);
  if (kai) {
    run(`fresh(); put('plr','center',5879); globalThis.k=put('plr','left',${kai});`);
    ck("5879 no item equipped: Kaiju size -4 (min 0)", val(`return size(k)===0`), val(`return size(k)`));
    run(`battle.plr.item={card:card(349),rested:false,attacksLeft:1,soul:[],itemMode:'equip'};`);
    ck("5879 with an item equipped: normal size", val(`return size(k)===card(${kai}).size`), val(`return size(k)`));
  }
  console.log("pass", pass, "fail", fail);
})();
