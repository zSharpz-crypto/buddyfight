// node tests/drop_gauge.js - put-into-drop-zone triggers: #304 (called from drop), #1003 (hand/field -> drop), #1987 (hand -> drop)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 80; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.setSpells=[]; f.hand=[1]; f.gauge=[46,46,46]; f.drop=[]; }); };`);
(async () => {
  // #1003 field -> drop
  run(`fresh(); put('plr','left',1003); globalThis.og=battle.opp.gauge.length; globalThis.od=battle.opp.drop.length;`);
  run(`battle.destroyMonster('plr','left')`); await settle();
  ck("1003 destroyed from field: opp gauge -1", val(`return battle.opp.gauge.length===og-1&&battle.opp.drop.length===od+1`), val(`return [og,battle.opp.gauge.length,od,battle.opp.drop.length]`));
  // #1003 hand -> drop
  run(`fresh(); battle.plr.drop.push(1003); globalThis.og=battle.opp.gauge.length;`);
  run(`ABX.fireDiscarded('plr',card(1003))`); await settle();
  ck("1003 discarded from hand: opp gauge -1", val(`return battle.opp.gauge.length===og-1`), val(`return [og,battle.opp.gauge.length]`));
  // #1987 hand -> drop: either
  run(`fresh(); battle.plr.drop.push(1987); globalThis.pg=battle.plr.gauge.length; globalThis.og=battle.opp.gauge.length;`);
  run(`ABX.fireDiscarded('plr',card(1987))`); await settle();
  ck("1987 discarded from hand: gauge effect happened", val(`return battle.plr.gauge.length===pg+1||battle.opp.gauge.length===og-1`), val(`return [pg,battle.plr.gauge.length,og,battle.opp.gauge.length]`));
  // #304 called from drop zone by an effect
  run(`fresh(); battle.plr.drop=[304]; battle.plr.deck=[46,46,46]; globalThis.pg=battle.plr.gauge.length; globalThis.nm=card(304).name;
       globalThis.st=ABX.parseSentenceSteps('call up to one "'+nm+'" from your drop zone', {});`);
  run(`ABX.core.runAbility('plr', card(46), {kind:'act', steps: st.steps, conds: [], unparsed: []}, null, {})`); await settle();
  ck("304 called from drop zone: +1 gauge", val(`return battle.plr.gauge.length===pg+1`), val(`return [pg,battle.plr.gauge.length,st.steps.length,Object.values(battle.plr.monsters).map(m=>m&&m.card.id)]`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
