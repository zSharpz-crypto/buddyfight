// node tests/redirect_family.js - passive attack redirect (#3841 #5380) and "attacks all instead" (#6282 #5928)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 60; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.setSpells=[]; f.hand=[1]; }); };
globalThis.mon=(re)=>window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>re.test(a))&&![5380,6282,5928].includes(c.id));`);
(async () => {
  // #3841
  run(`fresh(); put('plr','center',mon(/^prismdragon$/i).id); put('plr','left',46);`);
  ck("3841 absent: no redirect", val(`return ABX.passiveRedirect('plr','left',[])===null`));
  run(`battle.plr.setSpells.push(card(3841))`);
  ck("3841 set: left attack -> center", val(`return ABX.passiveRedirect('plr','left',[])==='center'`));
  ck("3841 set: fighter attack -> center", val(`return ABX.passiveRedirect('plr','fighter',[])==='center'`));
  ck("3841 set: center attack stays", val(`return ABX.passiveRedirect('plr','center',[])===null`));
  run(`battle.plr.monsters.center=mk(46)`); ck("3841 center not Prism Dragon: no redirect", val(`return ABX.passiveRedirect('plr','left',[])===null`));
  // #5380
  run(`fresh(); put('plr','center',mon(/^pastelpalettes$/i).id); put('plr','right',5380);`);
  ck("5380 on field: right attack -> center", val(`return ABX.passiveRedirect('plr','right',[])==='center'`));
  run(`fresh(); put('plr','center',mon(/^pastelpalettes$/i).id); put('plr','right',46);`);
  ck("5380 absent: no redirect", val(`return ABX.passiveRedirect('plr','right',[])===null`));
  // #6282 Gatling: attacks a character alone -> attack all
  run(`fresh(); globalThis.g=put('plr','left',6282); put('opp','center',46); put('opp','right',46);`);
  run(`ABX.fireAttack('plr',[{unit:g}],'opp','center')`); await settle();
  ck("6282 alone: attack-all flag", val(`return g.abxAttackAllOpp===battle.turnCount`));
  // #5928 soul version
  run(`fresh(); globalThis.gm=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&/gridman|powered zenon/i.test(c.name)&&c.id!==5928); globalThis.h=put('plr','left',gm.id,[5928]); put('opp','center',46); put('opp','right',46);`);
  run(`ABX.fireAttack('plr',[{unit:h}],'opp','center')`); await settle();
  ck("5928 soul in Gridman/Zenon: attack-all flag", val(`return h.abxAttackAllOpp===battle.turnCount`), val(`return [gm&&gm.name,h.abxAttackAllOpp]`));
  run(`fresh(); globalThis.h=put('plr','left',46,[5928]); put('opp','center',46);`);
  run(`ABX.fireAttack('plr',[{unit:h}],'opp','center')`); await settle();
  ck("5928 soul in other monster: no flag", val(`return h.abxAttackAllOpp!==battle.turnCount`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
