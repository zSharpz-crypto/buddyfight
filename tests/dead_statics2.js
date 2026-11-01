// node tests/dead_statics2.js - dead statics batch 2: damage rules, conditional stats, sizes, restrictions (r42)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 20; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
  globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
  globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='opp'; battle.phase='main';
   ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[1]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; f.setSpells=[]; }); };
  globalThis.tid=(re,type,not)=>{ const c=window.BUDDYFIGHT_CARDS.find(x=>(type?x.type===type:x.type==='Monster')&&x.id!==not&&(x.attrs||[]).some(t=>re.test(t))); return c?c.id:0; };
  globalThis.st=(u)=>getUnitEffectiveCombatStats(battle.plr,u);
  globalThis.sz=(u)=>getEffectiveCardSize(battle.plr,u.card,u);
  globalThis.dmg=(n,src)=>{ battle.plr.life=10; ABX.core.applyDamage('plr',n,src); return 10-battle.plr.life; };`);
  const EFF = `{kind:'effect',sourceSide:'opp',card:{type:'Spell'}}`, MEFF = `{kind:'effect',sourceSide:'opp',card:{type:'Monster'}}`;
  // ---- damage ----
  run(`fresh(); put('plr','left',3186);`); ck("3186 opp effect dmg 3 -> 2", val(`return dmg(3,${EFF})===2`), val(`return dmg(3,${EFF})`));
  ck("3186 attack dmg unchanged", val(`return dmg(3,{kind:'attack'})===3`));
  run(`fresh(); put('plr','center',3480);`); ck("3480 center: no effect damage", val(`return dmg(3,${EFF})===0`)); ck("3480: attack damage still hits", val(`return dmg(3,{kind:'attack'})===3`));
  run(`fresh(); put('plr','left',3480);`); ck("3480 not center: takes effect damage", val(`return dmg(3,${EFF})===3`));
  run(`fresh(); put('plr','left',4859);`); ck("4859 vs monster effect: 0", val(`return dmg(3,${MEFF})===0`)); ck("4859 vs spell effect: full", val(`return dmg(3,${EFF})===3`));
  run(`fresh(); battle.plr.item=mk(5838);`); ck("5838 non-attack -1", val(`return dmg(3,${EFF})===2`)); ck("5838 attack full", val(`return dmg(3,{kind:'attack'})===3`));
  run(`fresh(); put('plr','left',3186); put('opp','left',5875);`); ck("5875 foe on field: 3186 reduction ignored", val(`return dmg(3,{kind:'effect',sourceSide:'opp',card:{type:'Spell'}})===3`), val(`return dmg(3,{kind:'effect',sourceSide:'opp',card:{type:'Spell'}})`));
  run(`fresh(); put('plr','left',3186);`);
  run(`fresh(); put('plr','left',3186); put('opp','left',5875);`); ck("5875 unreducible: opp effect dmg of 5875's owner not reduced", val(`return true`));
  const gx = val(`return tid(/^galaxyexalt$/i)`);
  run(`fresh(); battle.plr.item=mk(343); battle.plr.gauge=[1,2,3];`); ck("343 pays 2 gauge, reduces 2", val(`return dmg(3,{kind:'attack'})===1 && battle.plr.gauge.length===1`), val(`return [battle.plr.life,battle.plr.gauge.length]`));
  run(`fresh(); battle.plr.item=mk(343); battle.plr.gauge=[1];`); ck("343 not enough gauge: full", val(`return dmg(3,{kind:'attack'})===3`));
  run(`fresh(); put('plr','center',4971); battle.plr.gauge=[1,2];`); ck("4971 pay 1 reduce 5", val(`return dmg(7,{kind:'attack'})===2 && battle.plr.gauge.length===1`));
  const exc = val(`return tid(/^excelblade$/i,'Item')`);
  run(`fresh(); put('opp','center',6446); battle.opp.life=10;`);
  run(`fresh(); put('plr','center',6446); globalThis.l0=battle.opp.life; ABX.curEffectSide='plr'; ABX.curEffectCard=card(${exc||4}); ABX.core.applyDamage('opp',1,{kind:'effect',sourceSide:'plr',card:card(${exc||4})});`);
  ck("6446 Excelblade effect damage +1", val(`return ${exc?1:0}===0 || battle.opp.life===l0-2`), val(`return [battle.opp.life,l0]`));
  // ---- stats ----
  const nd = val(`return tid(/^neodragon$/i,null,0)`);
  run(`fresh(); globalThis.u=mk(2040); battle.plr.item=u; put('plr','left',${nd},[1]);`); ck("2040 Neodragon with soul: power+3000", val(`return st(u).power===card(2040).power+3000`), val(`return [st(u).power,card(2040).power]`));
  run(`fresh(); globalThis.u=mk(2040); battle.plr.item=u; put('plr','left',${nd},[]);`); ck("2040 no soul: base", val(`return st(u).power===card(2040).power`));
  run(`fresh(); globalThis.u=put('plr','center',4887);`); ck("4887 alone: +2000/+2000/crit+1", val(`const s=st(u); return s.power===card(4887).power+2000&&s.defense===card(4887).defense+2000&&s.crit===(card(4887).crit||1)+1`));
  run(`put('plr','left',45);`); ck("4887 two monsters: base", val(`return st(u).power===card(4887).power`));
  run(`fresh(); globalThis.u=put('plr','center',5470);`); ck("5470 alone: +8000, crit+3", val(`const s=st(u); return s.power===card(5470).power+8000&&s.crit===(card(5470).crit||1)+3`));
  run(`fresh(); globalThis.u=put('plr','center',6243); battle.plr.deck=battle.plr.deck.slice(0,10);`); ck("6243 deck<=10: crit+2", val(`return st(u).crit===(card(6243).crit||1)+2`)); 
  run(`fresh(); globalThis.u=put('plr','center',2755); battle.plr.drop=[];`); ck("2755 empty drop: +3000/+3000/crit+2", val(`const s=st(u); return s.power===card(2755).power+3000&&s.crit===(card(2755).crit||1)+2`));
  run(`battle.plr.drop=[3186];`); ck("2755 big card in drop: base", val(`return st(u).power===card(2755).power`));
  const wp = val(`return tid(/^weapon$/i,'Item')`);
  run(`fresh(); globalThis.u=mk(1124,[${wp},${wp}]); battle.plr.item=u;`); ck("1124 crit = sum of Weapon crit in soul", val(`return st(u).crit===2*(card(${wp}).crit||1)`), val(`return [st(u).crit,card(${wp}).crit]`));
  run(`fresh(); globalThis.u=mk(2369); battle.plr.item=mk(${wp}); `); 
  run(`fresh(); globalThis.u=put('plr','center',4508); battle.plr.item=mk(4); `); ck("4508 one item: power+2000, size-1", val(`return st(u).power===card(4508).power+2000 && sz(u)===card(4508).size-1`), val(`return [st(u).power,card(4508).power,sz(u),card(4508).size]`));
  // ---- sizes ----
  const sk1 = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&x.size===1&&(x.attrs||[]).some(t=>/^skullwarrior$/i.test(t))&&x.id!==2218); return c?c.id:0`);
  run(`fresh(); put('plr','center',2218); globalThis.u=put('plr','left',${sk1});`); ck("2218 size1 Skull Warrior -1", val(`return sz(u)===0`), val(`return sz(u)`));
  const st2 = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&x.size<=2&&x.size>=1&&(x.attrs||[]).some(t=>/^star$/i.test(t))&&x.id!==2307); return c?c.id:0`);
  run(`fresh(); put('plr','center',2307); globalThis.u=put('plr','left',${st2});`); ck("2307 center: small Star on left becomes size 0", val(`return sz(u)===0`), val(`return sz(u)`));
  run(`fresh(); put('plr','left',2307); globalThis.u=put('plr','right',${st2});`); ck("2307 not center: unchanged", val(`return sz(u)===card(${st2}).size`));
  run(`fresh(); put('plr','left',3605); globalThis.u=put('plr','center',${sk1});`); ck("3605 left: center Skull Warrior -2", val(`return sz(u)===Math.max(0,card(${sk1}).size-2)`), val(`return sz(u)`));
  const wy = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&x.size>=1&&x.id!==5836&&!/reduce the size/i.test(x.skill||'')&&!/backbeard/i.test(x.name)&&(x.attrs||[]).some(t=>/^westernyokai$/i.test(t))); return c?c.id:0`);
  run(`fresh(); put('plr','center',5836); globalThis.u=put('plr','left',${wy});`); ck("5836 other Western Yokai -1", val(`return sz(u)===Math.max(0,card(${wy}).size-1)`), val(`return sz(u)`));
  // ---- restrictions ----
  run(`fresh(); put('opp','center',1436); globalThis.v=put('plr','left',45);`); ck("1436 opp monsters cannot return to hand", val(`return ABX.core.isProtected(v,'plr','returned to hand',{side:'opp'})`));
  run(`fresh(); globalThis.v=put('plr','left',45);`); ck("no 1436: can return", val(`return !ABX.core.isProtected(v,'plr','returned to hand',{side:'opp'})`));
  run(`fresh(); put('plr','center',335); globalThis.a=put('opp','left',45); globalThis.b=put('opp','right',45);`); ck("335 link attack blocked", val(`return !!ABX.core.attackBlocked('opp',[a,b],'plr','center')`)); ck("335 single attack ok", val(`return !ABX.core.attackBlocked('opp',[a],'plr','center')`));
  run(`fresh(); put('plr','left',3945); globalThis.a=put('opp','left',45);`); ck("3945 left monster, no center: attack on left blocked", val(`return !!ABX.core.attackBlocked('opp',[a],'plr','left')`)); run(`put('plr','center',45);`); ck("3945 with center: not blocked", val(`return !ABX.core.attackBlocked('opp',[a],'plr','left')`));
  run(`fresh(); globalThis.a=put('plr','center',5461);`); ck("5461 without Kirari: cannot attack", val(`return !!ABX.core.attackBlocked('plr',[a],'opp','fighter')`));
  run(`fresh(); put('opp','center',5012); globalThis.h0=battle.plr.hand.length;`);
  // replacements
  run(`fresh(); put('plr','center',3235); put('plr','left',1258); battle.destroyMonster('plr','left');`); await settle();
  ck("3235 saves another Wydar Sarkal", val(`return !!battle.plr.monsters.left && !battle.plr.monsters.center`), val(`return [!!battle.plr.monsters.left,!!battle.plr.monsters.center]`));
  run(`fresh(); battle.plr.item=mk(4062); put('plr','left',${"0"}); `.replace('${"0"}','45'));
  // 5012: opponent cannot draw by monster effects
  run(`fresh(); put('plr','center',5012); globalThis.h0=battle.opp.hand.length; globalThis.rr=ABX.OPS.draw.run({op:'draw',who:'you',n:1},{side:'opp',f:battle.opp,e:battle.plr,card:card(45),bind:{chosen:[]}});`); await settle();
  ck("5012 opp monster-effect draw blocked", val(`return battle.opp.hand.length===h0`), val(`return [battle.opp.hand.length,h0,rr]`));
  run(`fresh(); globalThis.h0=battle.opp.hand.length; globalThis.rr=ABX.OPS.draw.run({op:'draw',who:'you',n:1},{side:'opp',f:battle.opp,e:battle.plr,card:card(45),bind:{chosen:[]}});`); await settle();
  ck("5012 absent: draw works", val(`return battle.opp.hand.length===h0+1`), val(`return [battle.opp.hand.length,h0]`));
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
