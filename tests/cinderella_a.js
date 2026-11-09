// node tests/cinderella_a.js - Cinderella Girls (#5655 #5640)
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
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };
 globalThis.__chiyo=ALL_CARDS.find(c=>/Chiyo Shirayuki/.test(c.name)&&c.type==='Monster'&&c.id!==5655).id;`);
(async () => {
  for (const chiyo of [false, true]) {
    run(`{ const me=setup(), op=battle.opp; me.deck=[1,2,3]; me.life=10; op.life=10; globalThis.__og=op.gauge.length; globalThis.__mg=me.gauge.length; const u=mk(CARD_MAP.get(5655)); me.monsters.center=u; ${chiyo ? "me.monsters.left=mk(CARD_MAP.get(__chiyo));" : ""} const ab=ABX.get(CARD_MAP.get(5655)).abilities.find(a=>a.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(5655),ab,u,{event:{name:'attack'}}); }`); await settle();
    ck("5655 " + (chiyo ? "with Chiyo: 1 dmg, +1 life, opp gauge -1, my gauge +1" : "no Chiyo: 1 dmg, +1 life only"), val(`return battle.opp.life===9 && battle.plr.life===11 && battle.opp.gauge.length===__og-${chiyo ? 1 : 0} && battle.plr.gauge.length===__mg+${chiyo ? 1 : 0}`), val(`return [battle.opp.life,battle.plr.life,battle.opp.gauge.length-__og,battle.plr.gauge.length-__mg]`));
  }
  for (const soul of [true, false]) {
    run(`{ const me=setup(); const u=mk(CARD_MAP.get(5640)); u.rested=true; u.soul=${soul ? "[1054]" : "[]"}; me.monsters.center=u; const ab=ABX.get(CARD_MAP.get(5640)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(5640),ab,u,{event:{name:'act'}}); }`); await settle();
    ck("5640 " + (soul ? "has a soul: dropped and stood" : "no soul: stays rested"), val(`const u=battle.plr.monsters.center; return u.rested===${!soul} && u.soul.length===0`), val(`const u=battle.plr.monsters.center; return [u.rested,u.soul.length]`));
  }
  console.log("\npass " + pass + " fail " + fail);
})();
