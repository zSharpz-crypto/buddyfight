// node tests/wrong_trigger_c.js - Thunder Mine variants + "would leave" replacements (r42 wave C)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 25; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
  globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
  globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main';
   ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; f.setSpells=[]; }); };
  globalThis.enter=(side,pos,id)=>{ const u=put(side,pos,id); ABX.fireOtherEnter(side,u); return u; };`);
  run(`fresh(); put('plr','center',1324); globalThis.l0=battle.opp.life; enter('opp','left',45);`); await settle();
  ck("1324 monster enters opp left: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',1324); globalThis.l0=battle.opp.life; enter('opp','right',45);`); await settle();
  ck("1324 opp right: nothing", val(`return battle.opp.life===l0`));
  run(`fresh(); put('plr','center',1324); globalThis.l0=battle.opp.life; enter('plr','left',45);`); await settle();
  ck("1324 my own field: nothing", val(`return battle.opp.life===l0`));
  const mv = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&/\\[move\\]/i.test(x.skill||'')&&x.id!==1971); return c?c.id:0`);
  run(`fresh(); put('plr','center',1971); globalThis.l0=battle.opp.life; enter('opp','left',${mv});`); await settle();
  ck("1971 monster with [Move] enters opp field: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',1971); globalThis.l0=battle.opp.life; enter('opp','left',45);`); await settle();
  ck("1971 monster without [Move]: nothing", val(`return battle.opp.life===l0`));
  run(`fresh(); put('plr','center',5714); globalThis.l0=battle.opp.life; battle.abxEffectSide='plr'; enter('opp','left',45); battle.abxEffectSide=null;`); await settle();
  ck("5714 enters by my effect: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',5714); globalThis.l0=battle.opp.life; enter('opp','left',45);`); await settle();
  ck("5714 normal call: nothing", val(`return battle.opp.life===l0`));
  run(`fresh(); put('plr','center',1552); globalThis.l0=battle.opp.life; ABX.fireEquipped('opp',card(4),mk(4));`); await settle();
  ck("1552 opp equips: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',1552); globalThis.l0=battle.opp.life; ABX.fireEquipped('plr',card(4),mk(4));`); await settle();
  ck("1552 I equip: nothing", val(`return battle.opp.life===l0`));
  // 6251 destroyed opp card on my turn: 2 damage
  run(`fresh(); put('plr','center',6251); put('opp','left',45); globalThis.l0=battle.opp.life; battle.destroyMonster('opp','left');`); await settle();
  ck("6251 opp card to drop on my turn: 2 damage", val(`return battle.opp.life===l0-2`), val(`return [battle.opp.life,l0]`));
  // 4132 Armadel (item) saves a 72 Pillars monster; 5954 Gari saves originally size 3 Time Dragon; 4970 set spell saves MAX Dragon
  const pil = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).some(t=>/^pillars$/i.test(t))); return c?c.id:0`);
  run(`fresh(); battle.plr.item=mk(4132); put('plr','left',${pil}); battle.destroyMonster('plr','left');`); await settle();
  ck("4132 72 Pillars would leave: stays, Armadel dropped", val(`return !!battle.plr.monsters.left && !battle.plr.item && battle.plr.drop.includes(4132)`), val(`return [!!battle.plr.monsters.left,!!battle.plr.item,battle.plr.drop]`));
  const td = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&x.size===3&&(x.attrs||[]).some(t=>/^timedragon$/i.test(t))&&x.id!==5954); return c?c.id:0`);
  run(`fresh(); put('plr','center',5954); put('plr','left',${td}); battle.destroyMonster('plr','left');`); await settle();
  ck("5954 size 3 Time Dragon would leave: stays", val(`return !!battle.plr.monsters.left && !battle.plr.monsters.center`), val(`return [!!battle.plr.monsters.left,!!battle.plr.monsters.center]`));
  const mx = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).some(t=>/^maxdragon$/i.test(t))); return c?c.id:0`);
  run(`fresh(); battle.plr.setSpells=[card(4970)]; put('plr','left',${mx}); battle.destroyMonster('plr','left');`); await settle();
  ck("4970 MAX Dragon would leave: stays, spell dropped", val(`return !!battle.plr.monsters.left && battle.plr.setSpells.length===0 && battle.plr.drop.includes(4970)`), val(`return [!!battle.plr.monsters.left,battle.plr.setSpells.length]`));
  run(`fresh(); battle.plr.setSpells=[card(4970)]; put('plr','left',45); battle.destroyMonster('plr','left');`); await settle();
  ck("4970 other monster: destroyed", val(`return !battle.plr.monsters.left && battle.plr.setSpells.length===1`));
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
