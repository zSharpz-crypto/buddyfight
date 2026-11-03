// node tests/attack_through.js - "can attack even if there is a monster in the center": #3159 #5649 #6088
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.put=function(side,pos,id){ const u=mk(id); battle.getFighter(side).monsters[pos]=u; return u; };
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.setSpells=[]; delete f.abxThroughTurn; }); };
globalThis.CAT=(u)=>ABX.canAttackThrough('plr',u,'opp');
globalThis.byAttr=(re,type)=>window.BUDDYFIGHT_CARDS.find(c=>c.type===type&&(c.attrs||[]).some(a=>re.test(a)));`);
// #3159
run(`fresh(); globalThis.pd=byAttr(/prismdragon/i,'Monster'); globalThis.u=put('plr','left',pd.id); put('opp','center',46);`);
ck("3159 parsed to r42ThroughTurn", val(`return JSON.stringify(ABX.get(card(3159))).includes('r42ThroughTurn')`));
ck("3159 before: cannot attack through", val(`return !CAT(u)`));
run(`ABX.OPS.r42ThroughTurn.run({tribe:'PrismDragon'},{f:battle.plr})`);
ck("3159 after: Prism Dragon can", val(`return CAT(u)`));
run(`globalThis.o=put('plr','right',46)`); ck("3159 non-Prism monster cannot", val(`return !CAT(o)`));
// #5649
run(`fresh(); globalThis.tg=put('plr','left',46); tg.card=Object.assign({},tg.card,{name:'That Girl'}); put('opp','center',46);`);
ck("5649 absent: That Girl cannot", val(`return !CAT(tg)`));
run(`put('plr','right',5649)`); ck("5649 on field: That Girl can", val(`return CAT(tg)`));
// #6088
const mc = env.run(`(byAttr(/blackcats/i,'Item')||{}).id||0`);
if (mc) {
  run(`fresh(); battle.plr.item=mk(${mc}); put('opp','center',46);`);
  ck("6088 absent: Black Cats item cannot", val(`return !CAT(battle.plr.item)`));
  run(`battle.plr.setSpells.push(card(6088))`); ck("6088 set: Black Cats item can", val(`return CAT(battle.plr.item)`));
} else ck("6088 skipped (no Moonlit Black Cats item found)", true);
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
