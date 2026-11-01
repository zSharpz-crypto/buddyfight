// node tests/dragonarms.js - Dragonarms soul abilities on a «Neodragon» host (Crossnize family)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 10; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true;
  globalThis.card=function(id){ return window.BUDDYFIGHT_CARDS.find(c=>c.id===id); };
  globalThis.put=function(side,pos,id,soul){ const u={card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0}; battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.setup=function(soulId, o){ o=o||{}; battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3;
    ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; });
    globalThis.host=put('plr', o.pos||'center', 1097, soulId?[soulId]:[]); if(o.oppItem) battle.opp.item={card:card(4),rested:false,attacksLeft:1,soul:[]}; };
  globalThis.stats=function(){ return getUnitEffectiveCombatStats(battle.plr, host); };`);
  const st = () => JSON.parse(val(`const s=stats(); return JSON.stringify({power:s.power,defense:s.defense,crit:s.crit,pen:!!s.pen,da:!!s.da})`));
  const base = (run(`setup(null)`), st());
  // statics
  run(`setup(1098)`); ck("1098 soul: host gets Penetrate", st().pen === true && !base.pen, st());
  run(`setup(1192)`); ck("1192 soul: power+2000 crit+1", st().power === base.power + 2000 && st().crit === base.crit + 1, [st(), base]);
  run(`setup(1207)`); ck("1207 soul: defense+2000", st().defense === base.defense + 2000, [st(), base]);
  run(`setup(1099)`); ck("1099 soul: host gets [Move]", val(`return !!canUseMove('plr', host)`) === true, null);
  run(`setup(null)`); ck("no soul: no Move baseline", val(`return !canUseMove('plr', host)`) === true, null);
  // attack triggers (host attacks the opponent's fighter, no monsters)
  run(`setup(1667); globalThis.l0=battle.opp.life; battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter');`); await settle();
  ck("1667 Edge Shoot: 1 extra damage on attack", val(`return battle.opp.life <= l0 - 1 - (card(1097).crit||1) + 0`) , val(`return [l0,battle.opp.life]`));
  run(`setup(1242,{oppItem:true}); battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter');`); await settle();
  ck("1242 Winchisker: destroys opponent item on damage", val(`return !battle.opp.item`), val(`return !!battle.opp.item`));
  run(`setup(null,{oppItem:true}); battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter');`); await settle();
  ck("1242 control (no soul): item survives", val(`return !!battle.opp.item`));
  run(`setup(1680); put('opp','left',5159); battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter');`); await settle();
  ck("1680 Sonic Blast: pays 1 gauge, destroys a card", val(`return battle.plr.gauge.length===5 && !battle.opp.monsters.left`), val(`return [battle.plr.gauge.length, !!battle.opp.monsters.left]`));
  // 1308: attacks and destroys a monster -> 1 damage
  run(`setup(1308); put('opp','center',5159); globalThis.l0=battle.opp.life; battle.initiateAttackWithDefenseCheck('plr',['center'],'center');`); await settle();
  ck("1308 Labyrinthus: destroys monster -> 1 damage", val(`return !battle.opp.monsters.center && battle.opp.life===l0-1`), val(`return [!!battle.opp.monsters.center,l0,battle.opp.life]`));
  // 1631 Act: pay 2 gauge, destroy a monster
  run(`setup(1631); put('opp','left',5159); globalThis.u=ABX.get(card(1631)).abilities.find(a=>a.kind==='act'); `);
  ck("1631 has an Act ability", val(`return !!u`));
  // 1774: host attacks and deals damage -> top card to gauge OR gain 1 life
  run(`setup(1774); globalThis.g0=battle.plr.gauge.length; globalThis.p0=battle.plr.life; battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter');`); await settle();
  ck("1774 Reconnaissance: +1 gauge or +1 life after damage", val(`return battle.plr.gauge.length===g0+1 || battle.plr.life===p0+1`), val(`return [g0,battle.plr.gauge.length,p0,battle.plr.life]`));
  run(`setup(null); globalThis.g0=battle.plr.gauge.length; globalThis.p0=battle.plr.life; battle.initiateAttackWithDefenseCheck('plr',['center'],'fighter');`); await settle();
  ck("1774 control (no soul): nothing", val(`return battle.plr.gauge.length===g0 && battle.plr.life===p0`));
  // 2470 Debrisweeper: opponent cannot call monsters from their drop zone while it is in a Neodragon's soul
  run(`setup(2470); battle.opp.drop=[5159]; globalThis.r1=null; ABX.placeFromZone('opp','drop',5159,{pos:'left'}).then(x=>{globalThis.r1=x||'blocked'});`); await settle();
  ck("2470 blocks opponent drop-zone call", val(`return !battle.opp.monsters.left && battle.opp.drop.includes(5159)`), val(`return [!!battle.opp.monsters.left, r1]`));
  run(`setup(null); battle.opp.drop=[5159]; ABX.placeFromZone('opp','drop',5159,{pos:'left'});`); await settle();
  ck("2470 control: no soul -> opponent can call from drop", val(`return !!battle.opp.monsters.left`), val(`return [!!battle.opp.monsters.left]`));
  run(`setup(2470); battle.plr.drop=[5159]; ABX.placeFromZone('plr','drop',5159,{pos:'left'});`); await settle();
  ck("2470 does not stop its own controller", val(`return !!battle.plr.monsters.left`));
  // 2303 Pisca Pisca: put into the soul of a size 3 Neodragon -> top card to gauge
  run(`setup(null); globalThis.g0=battle.plr.gauge.length; globalThis.big=put('plr','left',1101); const c=card(2303); ABX.firePutIntoSoul('plr', c, big, 'field');`); await settle();
  ck("2303 size 3 Neodragon: +1 gauge", val(`return battle.plr.gauge.length===g0+1`), val(`return [g0,battle.plr.gauge.length]`));
  run(`setup(null); globalThis.g0=battle.plr.gauge.length; globalThis.small=put('plr','left',1097); ABX.firePutIntoSoul('plr', card(2303), small, 'field');`); await settle();
  ck("2303 size 1 Neodragon: no gauge", val(`return battle.plr.gauge.length===g0`), val(`return [g0,battle.plr.gauge.length]`));
  console.log("pass", pass, "fail", fail);
})();
