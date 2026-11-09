// node tests/hero_d.js - Katana end-of-turn / attack spells (#338 #3700 #272)
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
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(338)); globalThis.__g=me.gauge.length; const ab=ABX.actAbilities(CARD_MAP.get(338))[0]; ABX.runAbility('plr',CARD_MAP.get(338),ab,me.monsters.center,{event:{name:'act'}}); }`); await settle();
  ck("338 act: survives, +3000 power, 1 gauge paid", val(`const u=battle.plr.monsters.center; return !!u && (u.tempPower||0)>=3000 && battle.plr.gauge.length===__g-1`), val(`const u=battle.plr.monsters.center; return [!!u, u&&u.tempPower, battle.plr.gauge.length,__g]`));
  run(`ABX.fireTurnEvent('turnEnd')`); await settle();
  ck("338 destroyed at end of turn", val(`return !battle.plr.monsters.center`));
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(1054)); me.monsters.center=mk(CARD_MAP.get(3700)); me.monsters.left.card=me.monsters.left.card; battle.opp.monsters.center=mk(CARD_MAP.get(1054)); ABX.fireEnter('plr',CARD_MAP.get(3700),me.monsters.center); }`); await settle();
  ck("3700 without another Skull Warrior/Thunder Empire: nothing destroyed", val(`return !!battle.opp.monsters.center`));
  run(`globalThis.__sw=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('SkullWarrior')).id`);
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(__sw)); me.monsters.center=mk(CARD_MAP.get(3700)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__g=me.gauge.length; globalThis.__sz=CARD_MAP.get(1054).size; ABX.fireEnter('plr',CARD_MAP.get(3700),me.monsters.center); }`); await settle();
  ck("3700 with a Skull Warrior: opp monster destroyed, gauge by size", val(`return !battle.opp.monsters.center && battle.plr.gauge.length===__g+__sz`), val(`return [!!battle.opp.monsters.center,battle.plr.gauge.length,__g,__sz]`));
  for (const link of [false, true]) {
    run(`{ const me=setup(); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',redirectTo:null,nullified:false,link:${link},attUnits:[battle.opp.monsters.center]}; ABX.fireSpell('plr',CARD_MAP.get(272)); }`); await settle();
    ck("272 "+(link?"link":"single")+" attack: "+(link?"not nullified":"nullified + small attacker destroyed"), val(`return ABX.battleCtx.nullified===${!link} && (!battle.opp.monsters.center)===${!link}`), val(`return [ABX.battleCtx.nullified,!!battle.opp.monsters.center]`));
    run(`ABX.battleCtx=null`);
  }
  console.log(`\npass ${pass} fail ${fail}`);
})();
