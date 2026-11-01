// node tests/cond_protections.js - conditional protections that were dead text (r42 PROT42)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='opp'; battle.phase='main';
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[1]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; }); };
globalThis.P=(u,k,by)=>ABX.core.isProtected(u,'plr',k,{side:by||'opp'});
globalThis.atkDestroy=(pos)=>{ battle._destroyByAttack=true; try{ battle.destroyMonster('plr',pos); } finally { battle._destroyByAttack=false; } };`);
const T = (n, code) => ck(n, val(code), val("return 0"));
// 367: attack-proof only on center with another Asgard
run(`fresh(); globalThis.u=put('plr','center',367); put('plr','left',6509);`); run(`atkDestroy('center')`); ck("367 center + Asgard: survives attack", val(`return !!battle.plr.monsters.center`));
run(`fresh(); put('plr','center',367);`); run(`atkDestroy('center')`); ck("367 alone: destroyed by attack", val(`return !battle.plr.monsters.center`));
// 1258: Wydar Sarkal on right
run(`fresh(); put('plr','center',1258); put('plr','right',1271);`); run(`atkDestroy('center')`); ck("1258 with Wydar on right: survives", val(`return !!battle.plr.monsters.center`));
run(`fresh(); put('plr','center',1258);`); run(`atkDestroy('center')`); ck("1258 without: destroyed", val(`return !battle.plr.monsters.center`));
// 403: spells only
run(`fresh(); globalThis.u=put('plr','center',403);`);
ck("403 vs spell effect", val(`return ABX.core.isProtected(u,'plr','destroyed',{side:'opp',card:{type:'Spell'}})`)); ck("403 vs monster effect", val(`return !ABX.core.isProtected(u,'plr','destroyed',{side:'opp',card:{type:'Monster'}})`));
// 841: in soul of weapon
run(`fresh(); const w=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Item'&&(c.attrs||[]).some(a=>/^weapon$/i.test(a))); battle.plr.item=mk(w.id,[841]); globalThis.u=battle.plr.item;`);
ck("841 weapon w/ soul: no destroy/return", val(`return P(u,'destroyed')&&P(u,'returned to hand')`));
// 983
run(`fresh(); globalThis.u=put('plr','center',983); put('opp','center',6509);`); ck("983 one-on-one: protected + stats", val(`const s=getUnitEffectiveCombatStats(battle.plr,u); return P(u,'destroyed') && s.power===(card(983).power||0)+2000`));
run(`put('opp','left',6509);`); ck("983 not one-on-one: not protected", val(`return !P(u,'destroyed')`));
// 1676 items / 2213 / 4690 / 4156 / 5158 / 6477 / 6504
run(`fresh(); put('plr','left',1676); battle.plr.item=mk(4); globalThis.it=battle.plr.item;`); ck("1676 items protected from opp effects", val(`return P(it,'destroyed')`));
run(`fresh(); globalThis.u=mk(2213); battle.plr.item=u;`); ck("2213 opp effects only", val(`return P(u,'destroyed') && !ABX.core.isProtected(u,'plr','destroyed',{side:'plr'})`));
run(`fresh(); globalThis.u=mk(4690); battle.plr.item=u; globalThis.bd=put('plr','left',5159);`);
ck("4690 self destroy/return", val(`return P(u,'destroyed')&&P(u,'returned to hand')`));
const bld = val(`const c=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/bladedancer/i.test(a))); return c?c.id:0`);
if (bld) { run(`put('plr','right',${bld}); globalThis.b=battle.plr.monsters.right;`); ck("4690 bladedancer no rest", val(`return P(b,'rest')`)); }
run(`fresh(); globalThis.u=put('plr','center',4156);`); ck("4156 no effect destroy", val(`return ABX.core.isProtected(u,'plr','destroyed',{side:'plr'})`));
run(`ABX.core.applyDamage('plr',3,{kind:'effect',sourceSide:'plr'});`); ck("4156 no effect damage", val(`return battle.plr.life===10`), val(`return battle.plr.life`));
run(`fresh(); globalThis.u=put('plr','center',5158,[1,2]);`); ck("5158 no nullify / soul drop", val(`return P(u,'nullified')&&P(u,'souls dropped')`));
run(`fresh(); globalThis.u=put('plr','center',6504,[1]);`); ck("6504 center: no rest/nullify/soul drop", val(`return P(u,'rest')&&P(u,'nullified')&&P(u,'souls dropped')`));
run(`fresh(); globalThis.u=put('plr','left',6504,[1]);`); ck("6504 not center: unprotected", val(`return !P(u,'rest')`));
// 3254: 3+ souls
run(`fresh(); globalThis.u=put('plr','center',3254,[1,2,3]);`); ck("3254 three souls: no rest", val(`return P(u,'rest')`)); run(`u.soul=[1];`); ck("3254 one soul: rest ok", val(`return !P(u,'rest')`));
// 3046 / 3283 / 3619
run(`fresh(); globalThis.u=put('plr','center',3046,[1]); globalThis.v=put('plr','left',5159,[2]);`); ck("3046 all nullify protected, soul drop self", val(`return P(v,'nullified')&&P(u,'souls dropped')`));
run(`fresh(); put('plr','center',3283); globalThis.v=put('plr','left',3283);`); ck("3283 souls not dropped on field", val(`return P(v,'souls dropped')&&P(v,'destroyed')`));
run(`fresh(); put('plr','center',3619); globalThis.v=put('plr','left',5159,[1]);`); ck("3619 field cards protected", val(`return P(v,'destroyed')&&P(v,'returned to hand')&&P(v,'souls dropped')`));
// 6107 / 6315 / 6503 / 6360 / 6430 / 6482 / 6509 / 6532
run(`fresh(); const h=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&/heathcliff/i.test(c.name)&&c.id!==6107); globalThis.u=put('plr','center',h?h.id:5159,[6107]);`); ck("6107 host Heathcliff protected", val(`return P(u,'destroyed')&&P(u,'souls dropped')`));
run(`fresh(); put('plr','center',6360); globalThis.u=null;`);
run(`fresh(); globalThis.it=mk(6360); battle.plr.item=it; const sp=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&/spectral strike/i.test(c.name)); globalThis.spid=sp?sp.id:0; if(spid) put('plr','left',spid);`);
ck("6360 w/ Spectral Strike monster", val(`return spid===0 || (P(it,'destroyed')&&P(it,'nullified'))`), val(`return spid`)); run(`battle.plr.monsters.left=null;`); ck("6360 without: unprotected", val(`return !P(it,'destroyed')`));
run(`fresh(); globalThis.it=mk(6430); battle.plr.item=it; put('plr','center',5159);`); ck("6430 one monster: protected + power", val(`return P(it,'destroyed') && getUnitEffectiveCombatStats(battle.plr,it).power>=card(6430).power+10000`));
run(`put('plr','left',5159);`); ck("6430 two monsters: unprotected", val(`return !P(it,'destroyed')`));
run(`fresh(); put('plr','center',6482); globalThis.v=battle.plr.monsters.center; battle.plr.drop=new Array(10).fill(1);`); ck("6482 drop>=10: protected", val(`return P(v,'destroyed')&&P(v,'rest')`)); run(`battle.plr.drop=[1];`); ck("6482 drop<10: not", val(`return !P(v,'destroyed')`));
run(`fresh(); globalThis.v=put('plr','center',5159); put('plr','left',6509); battle.plr.hand=[]; `); run(`atkDestroy('center')`); ck("6509 empty hand: monsters can't be destroyed (even by attack)", val(`return !!battle.plr.monsters.center`));
run(`fresh(); globalThis.k=put('plr','center',6532); globalThis.v=put('plr','left',5159);`); ck("6532 center: all cards protected + stats", val(`return P(v,'destroyed') && getUnitEffectiveCombatStats(battle.plr,v).power>=card(5159).power+5000`));
run(`ABX.core.applyDamage('plr',3,{kind:'effect',sourceSide:'opp'});`); ck("6532 no opp effect damage", val(`return battle.plr.life===10`), val(`return battle.plr.life`));
run(`fresh(); globalThis.k=put('plr','left',6532); globalThis.v=put('plr','right',5159);`); ck("6532 not center: unprotected", val(`return !P(v,'destroyed')`));
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
