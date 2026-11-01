// node tests/wrong_trigger_d.js - wave D: draw / hand / gauge / enter-by-effect triggers (r42)
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
   ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[1]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; f.deck=[10,11,12,13,14,15,16,17]; }); };
  globalThis.fire=(ev,data)=>ABX.fire42 ? ABX.fire42(ev,data) : null;`);
  const f42 = (ev, d) => run(`ABX.queue(()=>ABX.fire42(${JSON.stringify(ev)}, Object.assign(${JSON.stringify(d)}, {cards:[card(4)]})));`);
  const enter = (side, pos, id, eff) => run(`${eff ? "battle.abxEffectSide='" + eff + "';" : ""} const u=put('${side}','${pos}',${id}); ABX.fireOtherEnter('${side}',u); battle.abxEffectSide=null;`);
  // 3491 enter from drop: draw once per turn
  run(`fresh(); put('plr','center',3491); globalThis.h0=battle.plr.hand.length;`); f42("enterFromDrop", { owner: "plr", actor: "plr" }); await settle();
  ck("3491 monster from drop: draw", val(`return battle.plr.hand.length===h0+1`), val(`return [battle.plr.hand.length,h0]`));
  f42("enterFromDrop", { owner: "plr", actor: "plr" }); await settle();
  ck("3491 only once per turn", val(`return battle.plr.hand.length===h0+1`));
  run(`fresh(); put('plr','center',3491); globalThis.h0=battle.plr.hand.length;`); f42("enterFromDrop", { owner: "opp", actor: "opp" }); await settle();
  ck("3491 opponent's drop-enter ignored", val(`return battle.plr.hand.length===h0`));
  // 5194/5840 by card effects only
  const bo = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).some(t=>/^blackorganization$/i.test(t))&&x.id!==5194); return c?c.id:0`);
  run(`fresh(); put('plr','center',5194); globalThis.h0=battle.plr.hand.length; globalThis.g0=battle.plr.gauge.length;`); enter("plr", "left", bo, "plr"); await settle();
  ck("5194 Black Organization enters by my effect: gauge+1, draw", val(`return battle.plr.hand.length===h0+1&&battle.plr.gauge.length===g0+1`), val(`return [battle.plr.hand.length,h0,battle.plr.gauge.length,g0]`));
  run(`fresh(); put('plr','center',5194); globalThis.h0=battle.plr.hand.length;`); enter("plr", "left", bo, null); await settle();
  ck("5194 normal call: nothing", val(`return battle.plr.hand.length===h0`));
  run(`fresh(); put('plr','center',5194); globalThis.h0=battle.plr.hand.length;`); enter("plr", "left", 45, "plr"); await settle();
  ck("5194 non-Black-Org by effect: nothing", val(`return battle.plr.hand.length===h0`));
  const yk = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).some(t=>/^yokai$/i.test(t))&&x.id!==5840); return c?c.id:0`);
  run(`fresh(); put('plr','center',5840); globalThis.h0=battle.plr.hand.length;`); enter("plr", "left", yk, "plr"); await settle();
  ck("5840 Yokai enters by my effect: draw", val(`return battle.plr.hand.length===h0+1`), val(`return [battle.plr.hand.length,h0]`));
  // 6354 monster enters opp field by my effect
  run(`fresh(); put('plr','center',6354); globalThis.l0=battle.opp.life; globalThis.g0=battle.plr.gauge.length;`); enter("opp", "left", 45, "plr"); await settle();
  ck("6354 monster enters opp field by my effect: gauge+2, 1 damage", val(`return battle.opp.life===l0-1&&battle.plr.gauge.length===g0+2`), val(`return [battle.opp.life,l0,battle.plr.gauge.length,g0]`));
  run(`fresh(); put('plr','center',6354); globalThis.l0=battle.opp.life;`); enter("opp", "left", 45, null); await settle();
  ck("6354 normal call: nothing", val(`return battle.opp.life===l0`));
  // 5657 draw from my effects -> draw one more (once per turn)
  run(`fresh(); put('plr','center',5657); globalThis.h0=battle.plr.hand.length;`); f42("draw", { owner: "plr", actor: "plr" }); await settle();
  ck("5657 I draw by effect: draw 1 more", val(`return battle.plr.hand.length===h0+1`), val(`return [battle.plr.hand.length,h0]`));
  run(`fresh(); put('plr','center',5657); globalThis.h0=battle.plr.hand.length;`); f42("draw", { owner: "opp", actor: "opp" }); await settle();
  ck("5657 opponent draw: nothing", val(`return battle.plr.hand.length===h0`));
  // 5771 opp hand increases -> opp drops a hand card
  run(`fresh(); put('plr','center',5771); battle.opp.hand=[1,2,3]; globalThis.d0=battle.opp.drop.length;`); f42("handUp", { owner: "opp", actor: "plr" }); await settle();
  ck("5771 opp hand increases: opp drops 1", val(`return battle.opp.hand.length===2&&battle.opp.drop.length===d0+1`), val(`return [battle.opp.hand,battle.opp.drop]`));
  run(`fresh(); put('plr','center',5771); battle.plr.hand=[1,2,3];`); f42("handUp", { owner: "plr", actor: "plr" }); await settle();
  ck("5771 my hand increases: nothing", val(`return battle.plr.hand.length===3&&battle.opp.hand.length===1`));
  // 5656 opp draws by their effect with 3 different Idol on my field
  const idols = val(`return JSON.stringify(window.BUDDYFIGHT_CARDS.filter(x=>x.type==='Monster'&&(x.attrs||[]).some(t=>/^idol$/i.test(t))&&x.id!==5656).slice(0,3).map(x=>x.id))`);
  const idl = JSON.parse(idols);
  if (idl.length === 3) {
    run(`fresh(); put('plr','center',5656); put('plr','left',${idl[0]}); battle.opp.hand=[1,2,3];`); f42("draw", { owner: "opp", actor: "opp" }); await settle();
    ck("5656 only 2 different Idol: nothing", val(`return battle.opp.hand.length===3`), val(`return battle.opp.hand`));
    run(`fresh(); put('plr','center',5656); put('plr','left',${idl[0]}); put('plr','right',${idl[1]}); battle.opp.hand=[1,2,3];`); f42("draw", { owner: "opp", actor: "opp" }); await settle();
    ck("5656 three different Idol: opp drops 1", val(`return battle.opp.hand.length===2`), val(`return battle.opp.hand`));
  }
  // 6499 gauge into opp gauge: drop down to 2
  run(`fresh(); put('plr','center',6499); battle.opp.gauge=[1,2,3,4,5]; globalThis.d0=battle.opp.drop.length;`); f42("gaugeUp", { owner: "opp", actor: "plr" }); await settle();
  ck("6499 opp gauge 5 -> 2", val(`return battle.opp.gauge.length===2&&battle.opp.drop.length===d0+3`), val(`return [battle.opp.gauge.length,battle.opp.drop.length]`));
  run(`fresh(); put('plr','center',6499); battle.plr.gauge=[1,2,3,4,5];`); f42("gaugeUp", { owner: "plr", actor: "plr" }); await settle();
  ck("6499 my own gauge unaffected", val(`return battle.plr.gauge.length===5`));
  console.log("pass", pass, "fail", fail);
  process.exit(fail ? 1 : 0);
})();
