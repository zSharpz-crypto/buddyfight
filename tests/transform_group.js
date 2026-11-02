// node tests/transform_group.js - [Transform] group: protections, impact-only calls, no-Counter, Perfect Crime, transformInto
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 10; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
  globalThis.put=function(side,pos,id,soul){ const u={card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0}; battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.tr=function(side,id,soul){ const u={card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0,isTransformed:true}; battle.getFighter(side).item=u; return u; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main';
    ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; }); };
  globalThis.prot=(u,k,by)=>ABX.core.isProtected(u,'plr',k,{side:by||'opp'});`);
  for (const id of [2513, 3257, 6561]) {
    run(`fresh(); globalThis.u=tr('plr',${id});`);
    ck(id + " transformed: not destroyed", val(`return prot(u,'destroyed')`)); ck(id + " transformed: not returned", val(`return prot(u,'returned to hand')`));
  }
  run(`fresh(); globalThis.u=tr('plr',6561);`); ck("6561 no rest", val(`return prot(u,'rest')`)); ck("6561 no nullify", val(`return prot(u,'nullified')`));
  const gem = val(`const w=window.BUDDYFIGHT_CARDS.find(c=>/gemclone/i.test(c.name)&&c.id!==3257&&c.id!==6208&&IMX.get(c)); return w?w.id:0`);
  if (gem) { run(`fresh(); tr('plr',3257); globalThis.g=put('plr','left',${gem});`); ck("3257: Gemclone impact monster protected from opp", val(`return prot(g,'destroyed')`)); ck("3257: not from own effect", val(`return !prot(g,'destroyed','plr')`)); }
  else ck("gemclone impact monster exists", false);
  // 6226: all transformed cards protected from opp effects
  run(`fresh(); globalThis.u=tr('plr',6226);`); ck("6226 protected", val(`return prot(u,'destroyed') && prot(u,'nullified') && !prot(u,'destroyed','plr')`));
  // 4527
  run(`fresh(); globalThis.u=tr('plr',4527);`); ck("4527 no rest by opp", val(`return prot(u,'rest')`)); ck("4527 penetrate", val(`return !!getUnitEffectiveCombatStats(battle.plr,u).pen`));
  // call restriction
  run(`fresh(); tr('plr',2513);`);
  ck("2513: non-impact monster call blocked", val(`return !!ABX.core.transformCallBlock(battle.plr, card(5159))`));
  ck("2513: multi impact call", val(`return ABX.core.impactMultiCall(battle.plr)`));
  run(`fresh();`); ck("no transform: no restriction", val(`return !ABX.core.transformCallBlock(battle.plr, card(5159)) && !ABX.core.impactMultiCall(battle.plr)`));
  // no-Counter
  const sh = val(`const w=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/^superhero$/i.test(a))); return w?w.id:0`);
  if (sh) {
    run(`fresh(); tr('plr',4224); globalThis.a=put('plr','center',${sh});`);
    ck("4224: superhero attack, no counter", val(`return ABX.noCounterThisBattle('plr',[a],'center')`)); ck("4224: attack fighter no effect", val(`return !ABX.noCounterThisBattle('plr',[a],'fighter')`));
    run(`fresh(); tr('plr',6208); globalThis.a=put('plr','center',${sh});`); ck("6208: superhero no counter", val(`return ABX.noCounterThisBattle('plr',[a],'center')`));
    run(`fresh(); globalThis.a=put('plr','center',${sh});`); ck("no transform: counter allowed", val(`return !ABX.noCounterThisBattle('plr',[a],'center')`));
  }
  // 4496
  run(`fresh(); globalThis.gx=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/galaxyexalt/i.test(a))&&parseCardCost(c.cost,c.skill,battle.plr,c).gauge>1); globalThis.g0=parseCardCost(gx.cost,gx.skill,battle.plr,gx).gauge; globalThis.k=put('plr','left',4496); globalThis.gu=put('plr','center',gx.id,[100]);`);
  ck("4496: Galaxy Exalt call cost -1", val(`return parseCardCost(gx.cost,gx.skill,battle.plr,gx).gauge===g0-1`));
  ck("4496: Galaxy Exalt souls not droppable by opp", val(`return ABX.core.isProtected(gu,'plr','souls dropped',{side:'opp'})`));
  // 5199 Perfect Crime
  run(`fresh(); globalThis.u=tr('plr',5199,[1,2,3,4,5]); ABX.core.scanSouls();`); await settle(); ck("5199 five souls: no win", val(`return !battle.matchOver`));
  run(`u.soul.push(6); ABX.core.scanSouls();`); await settle(); ck("5199 six souls: win", val(`return !!battle.matchOver`));
  // 2160 transformInto -> top card to gauge; Caardian bonus
  const caard = val(`const w=window.BUDDYFIGHT_CARDS.find(c=>c.tr&&/caardian/i.test(c.name)); return w?w.id:0`);
  if (caard) {
    run(`fresh(); battle.plr.setSpells=[card(2160)]; globalThis.u=tr('plr',${caard}); globalThis.g0=battle.plr.gauge.length; ABX.fireEquipped('plr',card(${caard}),u);`); await settle();
    ck("2160 transform into Caardian: +1 gauge", val(`return battle.plr.gauge.length===g0+1`), val(`return [battle.plr.gauge.length,g0]`));
    ck("2160 Caardian: pen", val(`return !!getUnitEffectiveCombatStats(battle.plr,u).pen`));
    run(`fresh(); battle.plr.setSpells=[card(4499)]; globalThis.u=tr('plr',${caard}); globalThis.l0=battle.plr.life; ABX.fireEquipped('plr',card(${caard}),u);`); await settle();
    ck("4499 transform into Caardian: +1 life, pen", val(`return battle.plr.life===l0+1 && !!getUnitEffectiveCombatStats(battle.plr,u).pen`), val(`return [battle.plr.life,l0]`));
  } else ck("caardian transform card exists", false);
    // 6226: [Impact Transform] twice per turn (once otherwise)
  const itm = val(`const w=window.BUDDYFIGHT_CARDS.find(c=>IMX.get(c)&&IMX.get(c).impactTransform&&c.id!==6226); return w?w.id:0`);
  if (itm) {
    run(`fresh(); battle.phase='final'; battle.turnCount=6; battle.plr.gauge=Array(8).fill(46); globalThis.u=tr('plr',6226); battle.plr.impactTransformCount=1; battle.plr.impactTransformedThisTurn=true;`);
    ck("6226: second Impact Transform allowed", !val(`return battle.imTransformInfo('plr',card(${itm})).reasons.includes('Once per turn')`));
    run(`battle.plr.impactTransformCount=2;`); ck("6226: third blocked", val(`return battle.imTransformInfo('plr',card(${itm})).reasons.includes('Once per turn')`));
    run(`fresh(); battle.phase='final'; battle.turnCount=6; battle.plr.gauge=Array(8).fill(46); globalThis.u=tr('plr',4527); battle.plr.impactTransformCount=1;`);
    ck("other transform: second blocked", val(`return battle.imTransformInfo('plr',card(${itm})).reasons.includes('Once per turn')`));
  }
  // 6208: attacks and destroys -> [Stand]
  run(`fresh(); battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6; globalThis.u=tr('plr',6208); globalThis.v=put('opp','center',149); u.rested=true; battle.executeAttackResolution('plr',['item'],'center');`);
  await settle(); await settle();
  ck("6208: destroys a monster -> stands", val(`return !battle.opp.monsters.center && u.rested===false`));
console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
