// Audit of 11 Dragonarms/Neodragon soul cards that had never been checked against their text
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async (n = 30) => { for (let i = 0; i < n; i++) { env.flush(); await new Promise(r => setTimeout(r, 3)); } };
run(`globalThis.mkU=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=(soul,o)=>{ o=o||{}; battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.showCutin=function(){}; ABX.autoPlay=true; ABX.fast=true;
  const p=battle.plr,e=battle.opp; ["left","center","right"].forEach(z=>{p.monsters[z]=null;e.monsters[z]=null}); p.item=null;e.item=null; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=8;
  p.hand=o.hand||[]; p.drop=o.drop||[]; p.gauge=Array(o.gauge==null?6:o.gauge).fill(46); p.life=10; e.life=10; e.drop=[]; e.hand=[]; e.gauge=Array(6).fill(46);
  globalThis.host=mkU(o.host||1097, soul); p.monsters.center=host; globalThis.__soulId=soul[0]; };
 globalThis.runAct=async(id,i)=>{ const card=CARD_MAP.get(id); const ab=ABX.core.abilitiesOf(card,a=>a.kind==="act")[i||0]; await ABX.core.runAbility('plr',card,ab,null,{soulHost:host,hostArea:'soul',event:{name:'act'},auto:true,selfRef:{k:'soul',side:'plr',unit:host,idx:host.soul.indexOf(id),id,card}}); };
 globalThis.runCounter=async(id)=>{ battle.opp.monsters.left=battle.opp.monsters.left||mkU(149,[]); const info={attackerZones:['left'],targetPos:'fighter'}; const o=ABX.fieldCounterOptions('plr',info).find(x=>x.card.id===id); globalThis.__opt=!!o; if(!o) return null; globalThis.__res=await ABX.useFieldCounter('plr',o.key,info); };`);
(async () => {
  await settle();
  // #1687 Devotion Wall (counter act): pay 1 gauge, soul -> drop, nullify the attack. Jackknife host: cost reduced by 1
  run(`setup([1687]); battle.activeSide='opp'; battle.phase='attack'; runCounter(1687)`); await settle();
  ck("#1687 offered; paid 1 gauge, left the soul, nullified the attack", J(`battle.plr.gauge.length===5 && !host.soul.includes(1687) && battle.plr.drop.includes(1687) && __res.nullified`), J(`[__opt,battle.plr.gauge.length,host.soul,battle.plr.drop,globalThis.__res]`));
  // #1734 Jupiter Two: enters on the LEFT -> a Dragonarms from the drop zone into its soul
  run(`setup([],{drop:[1687,46]}); battle.plr.monsters.center=null; globalThis.j=mkU(1734,[]); battle.plr.monsters.left=j; ABX.fireEnter('plr',CARD_MAP.get(1734),j)`); await settle();
  ck("#1734 on the left: Dragonarms from drop into its soul", J(`j.soul.includes(1687) && !battle.plr.drop.includes(1687)`), J(`[j.soul,battle.plr.drop]`));
  run(`setup([],{drop:[1687,46]}); battle.plr.monsters.center=null; globalThis.j=mkU(1734,[]); battle.plr.monsters.right=j; ABX.fireEnter('plr',CARD_MAP.get(1734),j)`); await settle();
  ck("#1734 on the right: drop untouched", J(`battle.plr.drop.includes(1687)`), J(`[j.soul,battle.plr.drop]`));
  // #1802 Force Liberate: pay 1 gauge -> the Neodragon is not destroyed the next time this turn
  run(`setup([1802]); runCounter(1802)`); await settle();
  ck("#1802 Force Liberate paid 1 gauge and armed the save", J(`battle.plr.gauge.length===5`) && J(`(()=>{ battle.destroyMonster('plr','center'); return !!battle.plr.monsters.center })()`), J(`[battle.plr.gauge.length,!!battle.plr.monsters.center]`));
  // #2029 Four Quasar: enters left/right -> a drop card into its soul
  run(`setup([],{drop:[46,47]}); battle.plr.monsters.center=null; globalThis.q=mkU(2029,[]); battle.plr.monsters.left=q; ABX.fireEnter('plr',CARD_MAP.get(2029),q)`); await settle();
  ck("#2029 on the left: a drop card into its soul", J(`q.soul.length===1`), J(`q.soul`));
  run(`setup([],{drop:[46,47]}); globalThis.q=mkU(2029,[]); battle.plr.monsters.center=q; ABX.fireEnter('plr',CARD_MAP.get(2029),q)`); await settle();
  ck("#2029 in the center: nothing", J(`q.soul.length===0`), J(`q.soul`));
  // #2072 static +2000 on the Neodragon host; Act: Jackknife host -> drop a host soul, then a drop card into the host's soul
  run(`setup([2072]);`); ck("#2072 host gets power+2000", J(`getUnitEffectiveCombatStats(battle.plr,host).power`) === J(`CARD_MAP.get(1097).power+2000`));
  const jk = J(`[...CARD_MAP.values()].find(c=>c.type==='Monster'&&/Jackknife/.test(c.name)&&(c.attrs||[]).some(a=>/neodragon/i.test(a))).id`);
  run(`setup([2072,1687],{host:${jk},drop:[46]}); runAct(2072)`); await settle();
  ck("#2072 Wuft Wulff: a soul dropped, a drop card put into the host", J(`host.soul.includes(2072)`) && J(`host.soul.length===2 || host.soul.length===1`), J(`[host.soul,battle.plr.drop]`));
  // #2302 Zodiac host attacked -> Double Attack at battle end (smoke: the trigger is executable)
  ck("#2302 battleEnd trigger executable", J(`ABX.core.abilitiesOf(CARD_MAP.get(2302),a=>a.trigger&&a.trigger.event==='battleEnd').every(a=>ABX.isExecutable(a))`));
  // #2465 static: opponent cannot use/cast from hand in the final phase
  ck("#2465 static parsed", J(`ABX.core.abilitiesOf(CARD_MAP.get(2465),a=>a.kind==='static').length>0`));
  // #2573 Castnetter: crossnized into a Neodragon: pay 1 gauge -> chosen opp monster does not stand next stand phase
  run(`setup([]); battle.opp.monsters.left=mkU(149,[]); battle.opp.monsters.left.rested=true; battle.plr.monsters.left=mkU(2573,[]); battle.completeCrossnize('plr','left','center');`); await settle(60);
  ck("#2573 Castnetter: 1 gauge paid and the opp monster is marked no-stand", J(`battle.plr.gauge.length===5`) && J(`battle.opp.monsters.left.abxNo&&battle.opp.monsters.left.abxNo.stand===true`), J(`[battle.plr.gauge.length,Object.keys(battle.opp.monsters.left)]`));
  // #3065 Bigger Brave: alone attack cannot be nullified; after battle drops itself
  run(`setup([3065,46],{host:${J('[...CARD_MAP.values()].find(c=>c.type===\'Monster\'&&(c.attrs||[]).some(a=>/neodragon/i.test(a))).id')}});`); ck("#3065 host alone: unnullifiable; two attackers: not", J(`ABX.attackUnnullifiable({attSide:'plr',defSide:'opp',attUnits:[host]})`) === true && J(`ABX.attackUnnullifiable({attSide:'plr',defSide:'opp',attUnits:[host,mkU(149,[])]})`) === false);
  run(`ABX.fireBattleEnd('plr',[{unit:host,zone:'center'}])`); await settle(); ck("#3065 drops itself at the end of the battle", J(`!host.soul.includes(3065) && battle.plr.drop.includes(3065)`), J(`[host.soul,battle.plr.drop]`));
  // #3110 Giant Fragment: +1000 power; act: pay 1 gauge -> Penetrate; 4 copies -> Quadruple Attack
  run(`setup([3110])`); ck("#3110 host power+1000", J(`getUnitEffectiveCombatStats(battle.plr,host).power`) === J(`CARD_MAP.get(1097).power+1000`));
  run(`setup([3110]); runAct(3110)`); await settle();
  ck("#3110 act: 1 gauge, host gets Penetrate", J(`battle.plr.gauge.length===5 && !!getUnitEffectiveCombatStats(battle.plr,host).pen`), J(`[battle.plr.gauge.length,getUnitEffectiveCombatStats(battle.plr,host).pen]`));
  run(`setup([3110,3110,3110,3110]); runAct(3110)`); await settle();
  ck("#3110 four copies: Quadruple Attack", J(`!!getUnitEffectiveCombatStats(battle.plr,host).qa`), J(`getUnitEffectiveCombatStats(battle.plr,host)`));
  // #5683 Penero Theus: into a Jackknife's soul: top card to gauge + 1 life; act: drop it from a Neodragon's soul -> rest the chosen
  run(`setup([],{host:${jk}}); globalThis.g0=battle.plr.gauge.length; ABX.firePutIntoSoul('plr',CARD_MAP.get(5683),host,'hand')`); await settle();
  ck("#5683 into a Jackknife soul: +1 gauge, +1 life", J(`battle.plr.gauge.length===g0+1 && battle.plr.life===11`), J(`[g0,battle.plr.gauge.length,battle.plr.life]`));
  run(`setup([5683]); battle.opp.monsters.left=mkU(149,[]); battle.activeSide='opp'; runCounter(5683)`); await settle();
  ck("#5683 Act: dropped from the soul, chosen card rested", J(`!host.soul.includes(5683) && battle.opp.monsters.left.rested===true`), J(`[host.soul,battle.opp.monsters.left.rested]`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
