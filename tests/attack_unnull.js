// node tests/attack_unnull.js - conditional "attack cannot be nullified / damage cannot be reduced" (r42 UN42)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='attack';
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[1]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; f.setSpells=[]; }); };
globalThis.UN=(us,defUnit)=>ABX.attackUnnullifiable({attSide:'plr',defSide:'opp',attUnits:us,defUnit:defUnit||null,link:us.length>1});
globalThis.UR=(us)=>ABX.attackUnreducible('plr',us);
globalThis.OPS_run=(c)=>{ ABX.battleCtx.nullified=false; const r=ABX.OPS.nullifyAttack.run({}, {card:c}); return r; };`);
run(`fresh(); globalThis.a=put('plr','center',4234); globalThis.b=put('plr','left',5159);`); ck("4234 alone", val(`return UN([a])`)); ck("4234 linked", val(`return !UN([a,b])`));
run(`fresh(); globalThis.a=put('plr','center',6245);`); ck("6245 alone: unnull+unreduce", val(`return UN([a])&&UR([a])`));
run(`fresh(); globalThis.a=put('plr','center',5646);`); ck("5646 no Natsuki", val(`return !UN([a])&&!UR([a])`)); const nk = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>/natsuki kimura/i.test(x.name)&&x.type==='Monster'); return c?c.id:0`);
if (nk) { run(`put('plr','left',${nk});`); ck("5646 with Natsuki", val(`return UN([a])&&UR([a])`)); }
run(`fresh(); globalThis.a=put('plr','center',6351); battle.plr.setSpells=[card(1),card(2),card(3)];`); ck("6351 not Dark Burial: no", val(`return !UN([a])`));
const db = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>(x.attrs||[]).some(t=>/darkburial/i.test(t))&&x.type==='Spell'); return c?c.id:0`);
if (db) { run(`battle.plr.setSpells=[card(${db}),card(${db}),card(${db})];`); ck("6351 three Dark Burial set", val(`return UN([a])&&UR([a])`)); }
run(`fresh(); globalThis.a=put('plr','center',6482); battle.plr.drop=new Array(19).fill(1);`); ck("6482 drop 19: no", val(`return !UN([a])`)); run(`battle.plr.drop.push(1);`); ck("6482 drop 20: yes", val(`return UN([a])&&UR([a])`));
run(`fresh(); globalThis.a=put('plr','center',3254,[1,2]);`); ck("3254 two souls: no", val(`return !UN([a])`)); run(`a.soul=[1,2,3];`); ck("3254 three souls: yes", val(`return UN([a])`));
run(`fresh(); globalThis.a=put('plr','center',2453); globalThis.b=put('plr','left',5159);`); ck("2453 link attack", val(`return UN([a,b])&&!UN([a])`));
const md = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.id!==6252&&(x.attrs||[]).some(t=>/medabot/i.test(t))&&x.type==='Monster'); return c?c.id:0`);
if (md) { run(`fresh(); globalThis.a=put('plr','center',6252); globalThis.b=put('plr','left',${md});`); ck("6252 link with Medabot", val(`return UN([a,b])`)); run(`fresh(); globalThis.a=put('plr','center',6252); globalThis.b=put('plr','left',5159);`); ck("6252 link with non-Medabot", val(`return !UN([a,b])`)); }
// soul based
const nd = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).some(t=>/^neodragon$/i.test(t))); return c?c.id:0`);
run(`fresh(); globalThis.a=put('plr','center',${nd},[3065]); globalThis.b=put('plr','left',5159);`); ck("3065 Neodragon alone", val(`return UN([a])&&!UN([a,b])`));
run(`fresh(); globalThis.a=put('plr','center',${nd},[]);`); ck("no 3065: no", val(`return !UN([a])`));
const jk = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>/jackknife/i.test(x.name)&&IMX.get(x)); return c?c.id:0`);
if (jk) { run(`fresh(); globalThis.a=put('plr','center',${jk},[2462]);`); ck("2462 Jackknife impact alone", val(`return UN([a])`)); }
// 3234
const ds = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.id!==3234&&x.type==='Monster'&&(x.attrs||[]).some(t=>/^disaster$/i.test(t))); return c?c.id:0`);
if (ds) { run(`fresh(); put('plr','right',3234); globalThis.a=put('plr','center',${ds}); globalThis.d=put('opp','center',5159);`); ck("3234 Disaster attacks monster", val(`return UN([a],d)`)); ck("3234 attacks fighter: no", val(`return !UN([a],null)`)); }
// 349
run(`fresh(); globalThis.it=mk(349); battle.plr.item=it; ABX.battleCtx={active:true,attSide:'plr',defSide:'opp',nullified:false,link:false,attUnits:[it],defUnit:null};`);
ck("349 vs Shield card", val(`return OPS_run({name:'Hero Shield'}) === false && !ABX.battleCtx.nullified`)); ck("349 vs other card", val(`return OPS_run({name:'Counter'}) === true`));
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
