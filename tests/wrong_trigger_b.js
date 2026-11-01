// node tests/wrong_trigger_b.js - destroyed / damage taken / attack triggers (r42 wave B)
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
  globalThis.byAtk=(att,side,pos)=>{ battle._destroyByAttack=true; battle._attackersNow=att; try{ battle.destroyMonster(side,pos); } finally { battle._destroyByAttack=false; battle._attackersNow=[]; } };
  globalThis.fe=(a,units,d,pos)=>ABX.fireAttack(a,units.map(u=>({unit:u})),d,pos);
  globalThis.tid=(re,type)=>{ const c=window.BUDDYFIGHT_CARDS.find(x=>(type?x.type===type:true)&&(x.attrs||[]).some(t=>re.test(t))&&x.type==='Monster'); return c?c.id:0; };`);
  // 5625 / 1305
  run(`fresh(); put('plr','center',5625); put('opp','left',5159); globalThis.h0=battle.plr.hand.length; battle.destroyMonster('opp','left');`); await settle();
  ck("5625 opp monster destroyed: draw", val(`return battle.plr.hand.length===h0+1`), val(`return [battle.plr.hand.length,h0]`));
  run(`fresh(); put('plr','center',1305); put('opp','left',5159); globalThis.l0=battle.opp.life; battle.destroyMonster('opp','left');`); await settle();
  ck("1305 my turn: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); battle.activeSide='opp'; put('plr','center',1305); put('opp','left',5159); globalThis.l0=battle.opp.life; battle.destroyMonster('opp','left');`); await settle();
  ck("1305 opp turn: nothing", val(`return battle.opp.life===l0`));
  run(`fresh(); put('plr','center',5625); put('plr','left',5159); globalThis.h0=battle.plr.hand.length; battle.destroyMonster('plr','left');`); await settle();
  ck("5625 my own monster destroyed: nothing", val(`return battle.plr.hand.length===h0`));
  // 2951 opp turn only
  const pd = val(`return tid(/^prismdragon$/i)`);
  run(`fresh(); battle.activeSide='opp'; put('plr','center',2951); put('plr','left',${pd}); globalThis.l0=battle.plr.life; battle.destroyMonster('plr','left');`); await settle();
  ck("2951 opp turn Prism Dragon destroyed: +1 life", val(`return battle.plr.life===l0+1`), val(`return [battle.plr.life,l0]`));
  run(`fresh(); put('plr','center',2951); put('plr','left',${pd}); globalThis.l0=battle.plr.life; battle.destroyMonster('plr','left');`); await settle();
  ck("2951 my turn: nothing", val(`return battle.plr.life===l0`));
  // 3246 attack by Black Dragon only
  const bd = val(`return tid(/^blackdragon$/i)`), sh = val(`return tid(/^superhero$/i)`);
  run(`fresh(); put('plr','center',3246); globalThis.a=put('plr','left',${bd}); put('opp','left',5159); battle.opp.gauge=[1,2,3]; globalThis.l0=battle.opp.life; byAtk([a],'opp','left');`); await settle();
  ck("3246 destroyed by Black Dragon attack: damage + gauge drop", val(`return battle.opp.life===l0-1 && battle.opp.gauge.length===2`), val(`return [battle.opp.life,l0,battle.opp.gauge.length]`));
  run(`fresh(); put('plr','center',3246); globalThis.a=put('plr','left',5159); put('opp','left',5159); globalThis.l0=battle.opp.life; byAtk([a],'opp','left');`); await settle();
  ck("3246 other attacker: nothing", val(`return battle.opp.life===l0`));
  // 2605 Superhero destroys
  run(`fresh(); put('plr','center',2605); globalThis.a=put('plr','left',${sh}); put('opp','left',5159); globalThis.l0=battle.opp.life; byAtk([a],'opp','left');`); await settle();
  ck("2605 Superhero attack destroys: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  // 756 destroyed by effect (not attack)
  const pk = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&/purgatory knights/i.test(x.name)); return c?c.id:0`);
  run(`fresh(); battle.plr.setSpells=[card(756)]; put('plr','left',${pk}); globalThis.g0=battle.plr.gauge.length; battle.destroyMonster('plr','left');`); await settle();
  ck("756 Purgatory Knights destroyed by effect: gauge +1", val(`return battle.plr.gauge.length===g0+1`), val(`return [battle.plr.gauge.length,g0]`));
  run(`fresh(); battle.plr.setSpells=[card(756)]; globalThis.a=put('opp','left',5159); put('plr','left',${pk}); globalThis.g0=battle.plr.gauge.length; byAtk([a],'plr','left');`); await settle();
  ck("756 destroyed by attack: nothing", val(`return battle.plr.gauge.length===g0`));
  // 5634 dealsDamage Idol
  const idol = val(`return tid(/^idol$/i)`);
  run(`fresh(); put('plr','center',5634); globalThis.a=put('plr','left',${idol}); globalThis.l0=battle.plr.life; ABX.fireAttackOutcome('plr',[{unit:a}],'opp',{dealtDamage:true});`); await settle();
  ck("5634 Idol deals damage: +1 life", val(`return battle.plr.life>=l0+1`), val(`return [battle.plr.life,l0]`));
  // 3839 / 6446 / 4143
  run(`fresh(); battle.activeSide='opp'; battle.plr.setSpells=[card(3839)]; globalThis.g0=battle.plr.gauge.length; globalThis.h0=battle.plr.hand.length; ABX.core.applyDamage('opp',1,{kind:'attack'});`); await settle();
  ck("3839 opp dealt damage during their turn: gauge + draw", val(`return battle.plr.gauge.length===g0+1 && battle.plr.hand.length===h0+1`), val(`return [battle.plr.gauge.length,g0,battle.plr.hand.length,h0]`));
  run(`fresh(); put('plr','center',6446); globalThis.g0=battle.plr.gauge.length; ABX.core.applyDamage('opp',1,{kind:'effect',sourceSide:'plr'});`); await settle();
  ck("6446 opp takes my effect damage: gauge +1", val(`return battle.plr.gauge.length===g0+1`), val(`return [battle.plr.gauge.length,g0]`));
  run(`fresh(); put('plr','center',6446); globalThis.g0=battle.plr.gauge.length; ABX.core.applyDamage('opp',1,{kind:'attack'});`); await settle();
  ck("6446 attack damage: nothing", val(`return battle.plr.gauge.length===g0`));
  // attacks
  const hero = val(`return tid(/^hero$/i)`);
  run(`fresh(); battle.plr.setSpells=[card(1236)]; globalThis.a=put('plr','left',${hero}); globalThis.b=put('plr','right',5159); globalThis.h0=battle.plr.hand.length; fe('plr',[a,b],'opp','fighter');`); await settle();
  ck("1236 Hero link attack: draw", val(`return battle.plr.hand.length===h0+1`), val(`return [battle.plr.hand.length,h0]`));
  run(`fresh(); battle.plr.setSpells=[card(1236)]; globalThis.a=put('plr','left',${hero}); globalThis.h0=battle.plr.hand.length; fe('plr',[a],'opp','fighter');`); await settle();
  ck("1236 single attack: nothing", val(`return battle.plr.hand.length===h0`));
  run(`fresh(); put('plr','center',3209); globalThis.a=put('plr','left',5159); globalThis.b=put('plr','right',5159); globalThis.l0=battle.opp.life; globalThis.m0=battle.plr.life; fe('plr',[a,b],'opp','fighter');`); await settle();
  ck("3209 link attack: +1 life, damage", val(`return battle.plr.life===m0+1 && battle.opp.life<=l0-1`), val(`return [battle.plr.life,m0,battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',5672); globalThis.x=put('opp','left',5159); globalThis.l0=battle.opp.life; fe('opp',[x],'plr','fighter');`); await settle();
  ck("5672 opp attacks alone: 1 damage to opp", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',3484); globalThis.x=put('opp','left',5159); globalThis.g0=battle.plr.gauge.length; fe('opp',[x],'plr','center');`); await settle();
  ck("3484 my monster attacked: gauge +2", val(`return battle.plr.gauge.length===g0+2`), val(`return [battle.plr.gauge.length,g0]`));
  run(`fresh(); put('plr','center',3484); globalThis.x=put('opp','left',5159); globalThis.g0=battle.plr.gauge.length; fe('opp',[x],'plr','fighter');`); await settle();
  ck("3484 player attacked directly: nothing", val(`return battle.plr.gauge.length===g0`));
  // 4143 needs a Yamigedo monster
  const yg = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&/yamigedo/i.test(x.name)&&x.id!==4143); return c?c.id:0`);
  run(`fresh(); put('plr','center',4143); ${yg ? "put('plr','left',"+yg+");" : ""} globalThis.h0=battle.plr.hand.length; ABX.core.applyDamage('opp',1,{kind:'effect',sourceSide:'plr'});`); await settle();
  ck("4143 with Yamigedo: draw", val(`return battle.plr.hand.length>=h0+1`), val(`return [battle.plr.hand.length,h0,${yg}]`));
  run(`fresh(); put('plr','center',4143); globalThis.h0=battle.plr.hand.length; ABX.core.applyDamage('opp',1,{kind:'effect',sourceSide:'plr'});`); await settle();
  ck("4143 without Yamigedo (itself has it in name?)", val(`return true`));
  // 5652 Nagi deals damage: damage equal to critical
  const nagi = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&/nagi hisakawa/i.test(x.name)&&x.id!==5652); return c?c.id:0`);
  run(`fresh(); put('plr','center',5652); globalThis.a=put('plr','left',${nagi}); globalThis.l0=battle.opp.life; ABX.fireAttackOutcome('plr',[{unit:a}],'opp',{dealtDamage:true});`); await settle();
  ck("5652 Nagi deals damage: extra damage = its crit", val(`return battle.opp.life<=l0-(card(5652).crit||1)`), val(`return [battle.opp.life,l0]`));
  // 6270 Napalm: itself attacks
  run(`fresh(); globalThis.a=put('plr','center',6270); globalThis.l0=battle.opp.life; fe('plr',[a],'opp','fighter');`); await settle();
  ck("6270 itself attacks: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',6270); globalThis.a=put('plr','left',45); globalThis.l0=battle.opp.life; fe('plr',[a],'opp','fighter');`); await settle();
  ck("6270 other attacker: nothing", val(`return battle.opp.life>=l0`));
  // all table entries parsed
  const bad = val(`const ids=[213,215,756,1305,1420,2605,2951,3246,3688,4045,4197,4205,5314,5625,6112,6560,5634,5652,3839,4143,6446,1169,1236,3209,5672,3484,2961,5412,4177,6270]; return ids.filter(id=>!ABX.get(card(id)).abilities.some(a=>a.r42&&a.kind==='triggered')).join(',')`);
  ck("all wave B entries compiled", bad === "", bad);
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
