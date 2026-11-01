// node tests/soul_rest_events.js - "When a soul is put into your X" (soulInto) and "When a card on your opponent's field is [Rest] by your card effects" (restedByEffect)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 12; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
  globalThis.put=function(side,pos,id,soul){ const u={card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0}; battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3;
    ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; f.setSpells=[]; }); };
  globalThis.addSoul=async function(u,n){ await ABX.core.scanSouls(); for(let i=0;i<(n||1);i++) u.soul.push(100+i); await ABX.core.scanSouls(); };`);
  const soulTest = async (name, srcId, hostId, check, opts = {}) => {
    run(`fresh(); globalThis.src=put('plr','left',${srcId}); globalThis.host=${opts.self ? "src" : `put('plr','center',${hostId})`}; globalThis.h0=battle.plr.hand.length; globalThis.g0=battle.plr.gauge.length; globalThis.d0=battle.plr.drop.length; globalThis.l0=battle.plr.life;`);
    await env.run(`addSoul(host,${opts.n || 1})`); await settle();
    ck(name, val(check), val(`return [h0,battle.plr.hand.length,g0,battle.plr.gauge.length,l0,battle.plr.life,d0,battle.plr.drop.length]`));
  };
  await soulTest("4481 soul into this card: +1 life", 4481, 0, `return battle.plr.life===l0+1`, { self: true });
  await soulTest("5558 soul into this card: draw 2", 5558, 0, `return battle.plr.hand.length===h0+2`, { self: true });
  await soulTest("5558 once per turn (2 souls: still 2 cards)", 5558, 0, `return battle.plr.hand.length===h0+2`, { self: true, n: 2 });
  await soulTest("3996 soul into Neodragon: draw 1", 3996, 1097, `return battle.plr.hand.length===h0+1`);
  await soulTest("3996 non-Neodragon host: nothing", 3996, 5159, `return battle.plr.hand.length===h0`);
  await soulTest("6022 size 3 Time Dragon: draw 2", 6022, 5937, `return battle.plr.hand.length===h0+2`);
  await soulTest("6022 size 2 Time Dragon: nothing", 6022, 5941, `return battle.plr.hand.length===h0`);
  await soulTest("6299 Super Robot: gauge +1 and draw 1", 6299, 6215, `return battle.plr.gauge.length===g0+1 && battle.plr.hand.length===h0+1`);
  await soulTest("6431 card with [D-Share]: draw 1", 6431, 4317, `return battle.plr.hand.length===h0+1`);
  await soulTest("5605 Neodragon: top 3 -> gauge, hand, drop", 5605, 1097, `return battle.plr.gauge.length===g0+1 && battle.plr.hand.length===h0+1 && battle.plr.drop.length===d0+1`);
  // opponent's soul is not yours
  run(`fresh(); put('plr','left',3996); globalThis.oh=put('opp','center',1097); globalThis.h0=battle.plr.hand.length;`); await env.run(`addSoul(oh,1)`); await settle();
  ck("3996 ignores a soul put into the opponent's Neodragon", val(`return battle.plr.hand.length===h0`));

  // restedByEffect: [Rest] a card on the opponent's field with an effect
  const restFx = `(async()=>{ const np=ABX.parseNP("a monster on your opponent's field"); const ab={kind:'spell',steps:[{op:'rest',np}]}; await ABX.runAbility('plr', card(5159), ab, null, {preApproved:true}); })()`;
  run(`fresh(); put('plr','left',2775); put('opp','center',5159); battle.opp.item={card:card(4),rested:false,attacksLeft:1,soul:[]}; globalThis.l0=battle.plr.life; ${restFx}`); await settle();
  ck("2775: rested -> pay 1 life, destroy opponent item", val(`return battle.plr.life===l0-1 && !battle.opp.item`), val(`return [l0,battle.plr.life,!!battle.opp.item,battle.opp.monsters.center&&battle.opp.monsters.center.rested]`));
  run(`fresh(); put('plr','left',5471); put('opp','center',5159); globalThis.o0=battle.opp.life; ${restFx}`); await settle();
  ck("5471: character rested by your effect -> 1 damage", val(`return battle.opp.life===o0-1`), val(`return [o0,battle.opp.life]`));
  run(`fresh(); put('plr','left',2298,[2773]); put('opp','center',5159); globalThis.h0=battle.plr.hand.length; ${restFx}`); await settle();
  ck("2773 in soul of a Zodiac monster: draw 1", val(`return battle.plr.hand.length===h0+1`), val(`return [h0,battle.plr.hand.length]`));
  run(`fresh(); put('plr','left',5159,[2773]); put('opp','center',5159); globalThis.h0=battle.plr.hand.length; ${restFx}`); await settle();
  ck("2773 in a non-Zodiac soul: nothing", val(`return battle.plr.hand.length===h0`));
  run(`fresh(); put('plr','left',1097,[4193]); put('opp','center',5159); globalThis.o0=battle.opp.life; globalThis.g0=battle.plr.gauge.length; ${restFx}`); await settle();
  ck("4193 in a Neodragon's soul: gauge +1 and 1 damage", val(`return battle.plr.gauge.length===g0+1 && battle.opp.life===o0-1`), val(`return [g0,battle.plr.gauge.length,o0,battle.opp.life]`));
  console.log("pass", pass, "fail", fail);
})();
