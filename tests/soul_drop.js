// node tests/soul_drop.js - "put into the drop zone from a soul" (#4188 #5317) and "discarded by a Battle Poet effect" (#3250)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 80; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.setSpells=[]; f.hand=[1]; f.life=5; f.drop=[]; f.gauge=[46,46]; }); ABX.srcStack=[];
 globalThis.snap=()=>({l:battle.plr.life,g:battle.plr.gauge.length,h:battle.plr.hand.length}); };`);
(async () => {
  for (const id of [4188, 5317]) {
    run(`fresh(); battle.activeSide='opp'; battle.plr.monsters.left=mk(46,[${id}]); battle.plr.deck=[46,46,46]; globalThis.s0=snap();`);
    run(`battle.destroyMonster('plr','left')`); await settle();
    ck(`${id} soul dropped on opp turn (destroy): +1 life +1 gauge +1 card`, val(`const s=snap(); return s.l===s0.l+1&&s.g===s0.g+1&&s.h===s0.h+1`), val(`return [s0,snap()]`));
    run(`fresh(); battle.activeSide='plr'; battle.plr.monsters.left=mk(46,[${id}]); battle.plr.deck=[46,46,46]; globalThis.s0=snap();`);
    run(`battle.destroyMonster('plr','left')`); await settle();
    ck(`${id} on own turn: nothing`, val(`return snap().l===s0.l`));
  }
  // by an opponent's effect (ability run): triggers exactly once
  run(`fresh(); battle.activeSide='opp'; battle.plr.monsters.left=mk(46,[4188]); battle.plr.deck=[46,46,46]; globalThis.s0=snap(); globalThis.st=ABX.parseSentenceSteps("destroy a monster on your opponent's field",{});`);
  run(`ABX.core.runAbility('opp', card(46), {kind:'act', steps: st.steps, conds: [], unparsed: []}, null, {})`); await settle();
  ck("4188 via opponent effect: exactly once", val(`return snap().l===s0.l+1`), val(`return [s0,snap(),!!battle.plr.monsters.left]`));
  // #3250
  run(`fresh(); battle.plr.drop.push(3250); battle.plr.deck=[46,46]; globalThis.s0=snap(); ABX.srcStack=[{id:1,name:'Battle Poet, Test'}];`);
  run(`ABX.fireDiscarded('plr',card(3250))`); await settle();
  ck("3250 discarded by a Battle Poet effect: +1 life +1 gauge", val(`const s=snap(); return s.l===s0.l+1&&s.g===s0.g+1`), val(`return [s0,snap()]`));
  run(`fresh(); battle.plr.drop.push(3250); battle.plr.deck=[46,46]; globalThis.s0=snap(); ABX.srcStack=[{id:1,name:'Other Card'}];`);
  run(`ABX.fireDiscarded('plr',card(3250))`); await settle();
  ck("3250 discarded by another card: nothing", val(`return snap().l===s0.l`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
