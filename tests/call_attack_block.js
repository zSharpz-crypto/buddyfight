// node tests/call_attack_block.js - #276 #5856 (attacks on left/right blocked), #1530 (no call to center), #6237 (opp cannot call during its battle)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
env.run(`globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.setSpells=[]; f.hand=[1]; }); battle.r42Battle=null; };
globalThis.AB=(att,def,pos)=>ABX.core.attackBlocked(att,[mk(46)],def,pos);
globalThis.mcard=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&c.id!==6237);`);
// #276: both players
run(`fresh()`); ck("276 absent: left attack ok", val(`return !AB('opp','plr','left')`));
run(`battle.plr.setSpells.push(card(276))`);
ck("276 on my side: attacks on my left blocked", val(`return !!AB('opp','plr','left')`)); ck("276: right blocked", val(`return !!AB('opp','plr','right')`));
ck("276: center and fighter still attackable", val(`return !AB('opp','plr','center')&&!AB('opp','plr','fighter')`));
ck("276: also protects the OPPONENT's left (both players)", val(`return !!AB('plr','opp','left')`));
// #5856: only the owner's side
run(`fresh(); battle.plr.setSpells.push(card(5856))`);
ck("5856: attacks on my left/right blocked", val(`return !!AB('opp','plr','left')&&!!AB('opp','plr','right')`));
ck("5856: my attacks on the opponent are fine", val(`return !AB('plr','opp','left')`));
ck("5856: center still attackable", val(`return !AB('opp','plr','center')`));
// #1530
run(`fresh()`); ck("1530 absent: center call ok", val(`return !ABX.callBlock('plr',mcard,'center')`));
run(`battle.opp.setSpells.push(card(1530))`);
ck("1530 (opp's set spell): my center call blocked", val(`return !!ABX.callBlock('plr',mcard,'center')`)); ck("1530: own center call blocked too", val(`return !!ABX.callBlock('opp',mcard,'center')`));
ck("1530: left call ok", val(`return !ABX.callBlock('plr',mcard,'left')`));
// #6237
run(`fresh(); globalThis.r=mk(6237); battle.opp.monsters.left=r; battle.r42Battle={attSide:'opp',units:[r],turn:battle.turnCount};`);
ck("6237 attacking: the defender cannot call", val(`return !!ABX.callBlock('plr',mcard,'left')`));
ck("6237: attacker's own side can call", val(`return !ABX.callBlock('opp',mcard,'right')`));
run(`battle.r42Battle=null`); ck("6237 battle over: calls allowed", val(`return !ABX.callBlock('plr',mcard,'left')`));
run(`battle.r42Battle={attSide:'opp',units:[r],turn:battle.turnCount+1}`); ck("6237 stale flag ignored", val(`return !ABX.callBlock('plr',mcard,'left')`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
