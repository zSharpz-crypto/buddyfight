// node tests/wrong_trigger_a.js - zone-change triggers (deckToDrop / fieldToHand / handDiscard / gaugeUp) r42
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 20; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
  globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
  globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main';
   ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.gauge=[1,2,3,4,5,6]; f.life=10; f.setSpells=[]; }); };
  ABX.OPS.tmove={run(s,ctx){ globalThis.__mv(ctx); return true; }};
  globalThis.go=(fn)=>{ globalThis.__mv=fn; return ABX.core.runAbility('plr', card(5159), {kind:'spell',steps:[{op:'tmove'}]}, null, {}); };`);
  // 2849: during your turn, deck->drop => 1 damage
  run(`fresh(); battle.plr.item=mk(2849); globalThis.l0=battle.opp.life;`);
  run(`go(()=>{ battle.plr.drop.push(battle.plr.deck.shift()); })`); await settle();
  ck("2849 deck->drop on my turn: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); battle.plr.item=mk(2849); battle.activeSide='opp'; globalThis.l0=battle.opp.life; go(()=>{ battle.plr.drop.push(battle.plr.deck.shift()); })`); await settle();
  ck("2849 on opp turn: nothing", val(`return battle.opp.life===l0`));
  run(`fresh(); battle.plr.item=mk(2849); globalThis.l0=battle.opp.life; go(()=>{ battle.plr.hand.push(battle.plr.deck.shift()); })`); await settle();
  ck("2849 deck->hand (draw): nothing", val(`return battle.opp.life===l0`));
  run(`fresh(); battle.plr.item=mk(2849); globalThis.l0=battle.opp.life; go(()=>{ battle.plr.drop.push(battle.plr.deck.shift()); }); go(()=>{ battle.plr.drop.push(battle.plr.deck.shift()); })`); await settle();
  ck("2849 once per turn", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  // 2659: opponent deck -> drop by my effect: gain 1
  run(`fresh(); put('plr','center',2659); globalThis.l0=battle.plr.life; go(()=>{ battle.opp.drop.push(battle.opp.deck.shift()); })`); await settle();
  ck("2659 opp deck dropped by my effect: +1 life", val(`return battle.plr.life===l0+1`), val(`return [battle.plr.life,l0]`));
  run(`fresh(); put('plr','center',2659); globalThis.l0=battle.plr.life; go(()=>{ battle.plr.drop.push(battle.plr.deck.shift()); })`); await settle();
  ck("2659 my own deck: nothing", val(`return battle.plr.life===l0`));
  // 3968: set spell, draw
  run(`fresh(); battle.plr.setSpells=[card(3968)]; globalThis.h0=battle.plr.hand.length; go(()=>{ battle.plr.drop.push(battle.plr.deck.shift()); })`); await settle();
  ck("3968 set: draw a card", val(`return battle.plr.hand.length===h0+1`), val(`return [battle.plr.hand.length,h0]`));
  // field -> hand: 1892 gain 1 life
  run(`fresh(); put('plr','center',1892); globalThis.v=put('plr','left',5159); globalThis.l0=battle.plr.life; go(()=>{ battle.plr.monsters.left=null; battle.plr.hand.push(5159); })`); await settle();
  ck("1892 another card returns to hand: +1 life", val(`return battle.plr.life===l0+1`), val(`return [battle.plr.life,l0]`));
  run(`fresh(); put('plr','center',1892); globalThis.l0=battle.plr.life; go(()=>{ battle.opp.hand.push(5159); })`); await settle();
  ck("1892 nothing returned: no life", val(`return battle.plr.life===l0`));
  // 4500: only Superhero/Superheroine
  const sh = val(`const c=window.BUDDYFIGHT_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).some(t=>/^superhero$/i.test(t))); return c?c.id:0`);
  run(`fresh(); battle.plr.setSpells=[card(4500)]; globalThis.l0=battle.plr.life; put('plr','left',${sh}); go(()=>{ battle.plr.monsters.left=null; battle.plr.hand.push(${sh}); })`); await settle();
  ck("4500 Superhero returned: +2 life", val(`return battle.plr.life===l0+2`), val(`return [battle.plr.life,l0]`));
  run(`fresh(); battle.plr.setSpells=[card(4500)]; globalThis.l0=battle.plr.life; put('plr','left',5159); go(()=>{ battle.plr.monsters.left=null; battle.plr.hand.push(5159); })`); await settle();
  ck("4500 other monster returned: nothing", val(`return battle.plr.life===l0`));
  // 4752: opponent's cards returned by my effect -> opp drops a hand card
  run(`fresh(); put('plr','center',4752); put('opp','left',5159); battle.opp.hand=[7,8]; globalThis.d0=battle.opp.drop.length; go(()=>{ battle.opp.monsters.left=null; battle.opp.hand.push(5159); })`); await settle();
  ck("4752 opp returned: opp drops a hand card", val(`return battle.opp.drop.length===d0+1`), val(`return [battle.opp.drop.length,d0,battle.opp.hand.length]`));
  // discard: 2745
  run(`fresh(); put('plr','center',2745); battle.plr.hand=[7,8]; globalThis.l0=battle.plr.life; go(()=>{ battle.plr.drop.push(battle.plr.hand.shift()); })`); await settle();
  ck("2745 discard from hand: +1 life", val(`return battle.plr.life===l0+1`), val(`return [battle.plr.life,l0]`));
  // gauge: 1397 (thunder mine) opp gauge up
  run(`fresh(); put('plr','center',1397); globalThis.l0=battle.opp.life; go(()=>{ battle.opp.gauge.push(9); })`); await settle();
  ck("1397 card put into opp gauge: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [battle.opp.life,l0]`));
  run(`fresh(); put('plr','center',1397); globalThis.l0=battle.opp.life; go(()=>{ battle.plr.gauge.push(9); })`); await settle();
  ck("1397 own gauge: nothing", val(`return battle.opp.life===l0`));
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
