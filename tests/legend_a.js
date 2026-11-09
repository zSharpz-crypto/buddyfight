// node tests/hero_d.js - Legend World (#357 #2747 #4807 #1964 #2456 #5049 #5052)
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   me.gauge=me.deck.splice(0,7); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  // #357 wipe
  run(`{ const me=setup(); me.hand=[1054,1054]; battle.opp.hand=[1054]; me.monsters.left=mk(CARD_MAP.get(1054)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); ABX.fireSpell('plr',CARD_MAP.get(357)); }`); await settle();
  ck("357: both hands discarded and all monsters destroyed", val(`return battle.plr.hand.length===0 && battle.opp.hand.length===0 && !battle.plr.monsters.left && !battle.opp.monsters.center`), val(`return [battle.plr.hand.length,battle.opp.hand.length,!!battle.plr.monsters.left,!!battle.opp.monsters.center]`));
  // #2747 draw only with Star on left and right
  run(`globalThis.__star=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Star')&&c.size<=1).id`);
  for (const both of [true, false]) {
    run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2747)); me.monsters.left=mk(CARD_MAP.get(__star)); ${both?'me.monsters.right=mk(CARD_MAP.get(__star));':''} me.life=10; globalThis.__h=me.hand.length; ABX.fireTurnEvent('phaseStart','main'); }`); await settle(); /* battle.start also fires its own main-phase event, so the effect may run twice here */
    ck("2747 Star on "+(both?"left+right":"left only")+": "+(both?"draw + life":"nothing"), val(`return ${both?'battle.plr.hand.length>=__h+1 && battle.plr.life>=11':'battle.plr.hand.length===__h && battle.plr.life===10'}`), val(`return [battle.plr.hand.length-__h,battle.plr.life]`));
  }
  // #1964 deck monster to drop
  run(`{ const me=setup(); me.deck=[1054,1054,1054]; globalThis.__d=me.drop.length; ABX.fireEnter('plr',CARD_MAP.get(1964),mk(CARD_MAP.get(1964))); }`); await settle();
  ck("1964: a monster from the deck went to the drop zone", val(`return battle.plr.drop.length===__d+1 && battle.plr.deck.length===2`));
  // #2456 pay 2 life, search Azi Dahaka
  run(`globalThis.__azi=ALL_CARDS.find(c=>c.name==='Great Demonic End Dragon, Azi Dahaka').id`);
  run(`{ const me=setup(); me.deck=[1054,__azi,1054]; me.life=10; ABX.fireEnter('plr',CARD_MAP.get(2456),mk(CARD_MAP.get(2456))); }`); await settle();
  ck("2456: paid 2 life and Azi Dahaka in hand", val(`return battle.plr.life===8 && battle.plr.hand.includes(__azi)`), val(`return [battle.plr.life,battle.plr.hand]`));
  // #5049 / #5052 Advent bonus only when entered by Advent
  for (const adv of [false, true]) {
    run(`{ const me=setup(); me.life=10; me.deck=new Array(10).fill(1054); globalThis.__g=me.gauge.length; const u=mk(CARD_MAP.get(5049)); u.abxAdvent=${adv}; me.monsters.center=u; ABX.fireEnter('plr',CARD_MAP.get(5049),u); }`); await settle();
    ck("5049 "+(adv?"entered by Advent":"normal call")+": life +"+(adv?4:1), val(`return battle.plr.life===${adv?14:11}`), val(`return battle.plr.life`));
    run(`{ const me=setup(); me.deck=new Array(10).fill(1054); globalThis.__g=me.gauge.length; const u=mk(CARD_MAP.get(5052)); u.abxAdvent=${adv}; me.monsters.center=u; ABX.fireEnter('plr',CARD_MAP.get(5052),u); }`); await settle();
    ck("5052 "+(adv?"entered by Advent":"normal call")+": gauge +"+(adv?3:1), val(`return battle.plr.gauge.length===__g+${adv?3:1}`), val(`return battle.plr.gauge.length-__g`));
  }
  // end-to-end: Advent Act from hand sets the flag before the enter trigger
  run(`{ const me=setup(); me.life=10; me.hand=[5049]; me.gauge=me.deck.splice(0,9); const ab=ABX.get(CARD_MAP.get(5049)).abilities.find(a=>a.kind==='act'); ABX.runHandUse('plr',0,ab); }`); await settle();
  ck("5049 via its Advent Act: life +4 and monster on the field", val(`const p=battle.plr; return p.life===14 && ["left","center","right"].some(x=>p.monsters[x]&&p.monsters[x].card.id===5049)`), val(`const p=battle.plr; return [p.life, ["left","center","right"].map(x=>p.monsters[x]&&p.monsters[x].card.id)]`));
  // #3548 free call only on a turn a card was discarded
  for (const disc of [false, true]) {
    run(`{ const me=setup(); me.hand=[3548]; me.gauge=[]; ${disc?'ABX.fireDiscarded("plr",CARD_MAP.get(1054));':''} const ab=ABX.get(CARD_MAP.get(3548)).abilities.find(a=>a.kind==='act'); globalThis.__r=ABX.canUseHandAct('plr',0,ab).ok; if(__r) ABX.runHandUse('plr',0,ab); }`); await settle();
    ck("3548 "+(disc?"after a discard: callable for free":"no discard: blocked"), val(disc?`return __r===true && !!Object.values(battle.plr.monsters).find(u=>u&&u.card.id===3548)`:`return __r===false`), val(`return [__r]`));
  }
  // #6139 drops Dragon-attribute cards with their souls
  run(`globalThis.__dr=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/dragon/i.test(a))&&c.size<=1).id`);
  run(`{ const me=setup(), op=battle.opp; const u=mk(CARD_MAP.get(__dr)); u.soul=[1054]; op.monsters.left=u; op.monsters.right=mk(CARD_MAP.get(1054)); globalThis.__od=op.drop.length; ABX.fireAttack&&0; const ab=ABX.get(CARD_MAP.get(6139)).abilities.find(a=>a.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(6139),ab,null,{event:{name:'attack'}}); }`); await settle();
  ck("6139: Dragon monster and its soul dropped, non-Dragon stays", val(`const o=battle.opp; return !o.monsters.left && !!o.monsters.right && o.drop.length===__od+2`), val(`const o=battle.opp; return [!!o.monsters.left,!!o.monsters.right,o.drop.length-__od]`));
  // #6026 grants Dragon for the turn, then 6139 can drop it
  run(`{ const me=setup(), op=battle.opp; op.monsters.left=mk(CARD_MAP.get(1054)); const ab=ABX.get(CARD_MAP.get(6026)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(6026),ab,null,{event:{name:'act'}}); }`); await settle();
  ck("6026: chosen card gets Dragon this turn", val(`return battle.opp.monsters.left.abxAttrAdd==='Dragon'`), val(`return [battle.opp.monsters.left&&battle.opp.monsters.left.abxAttrAdd]`));
  // #352 destroys an opposing Set spell when no spell is being cast; returns to hand with Berserk Gard in drop
  run(`{ const me=setup(), op=battle.opp; op.setSpells=[CARD_MAP.get(352)]; me.drop=[]; me.hand=[1054]; ABX.castCtx=null; ABX.fireSpell('plr',CARD_MAP.get(352),{free:true}); }`); await settle();
  ck("352: opposing Set spell destroyed", val(`return (battle.opp.setSpells||[]).length===0`), val(`return [(battle.opp.setSpells||[]).length]`));
  // #2648 search hand/deck for Miserea and call it to the center
  run(`globalThis.__m=ALL_CARDS.find(c=>c.name==='Judgment of the Cold-blooded King, Miserea').id`);
  run(`{ const me=setup(); me.deck=[1054,__m,1054]; ABX.fireSpell('plr',CARD_MAP.get(2648),{free:true}); }`); await settle();
  ck("2648: Miserea found in deck and called to center", val(`const c=battle.plr.monsters.center; return !!c && c.card.id===__m && battle.plr.deck.length===2`), val(`const c=battle.plr.monsters.center; return [c&&c.card.id,__m,battle.plr.deck.length]`));
  // #2068 discard two Legend World cards in final phase -> stand
  run(`globalThis.__lw=ALL_CARDS.find(c=>c.type==='Monster'&&c.world==='Legend World'&&c.id!==2068).id`);
  for (const two of [false, true]) {
    run(`{ const me=setup(); battle.phase='final'; const u=mk(CARD_MAP.get(2068)); u.rested=true; me.monsters.center=u; me.hand=${two?'[__lw,__lw]':'[__lw,1054]'}; const ab=ABX.get(CARD_MAP.get(2068)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(2068),ab,u,{event:{name:'act'}}); }`); await settle();
    ck("2068 "+(two?"two Legend World cards: stands":"only one: stays rested"), val(`const u=battle.plr.monsters.center; return u.rested===${!two} && battle.plr.hand.length===${two?0:2}`), val(`return [battle.plr.monsters.center.rested,battle.plr.hand.length]`));
  }
  // #2089 discard, then draw one (own deck order kept in auto-play)
  run(`{ const me=setup(); me.hand=[1054]; me.deck=[11,12,13,14]; globalThis.__d=me.drop.length; const ab=ABX.get(CARD_MAP.get(2089)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(2089),ab,mk(CARD_MAP.get(2089)),{event:{name:'act'}}); }`); await settle();
  ck("2089: discarded 1, drew 1", val(`const p=battle.plr; return p.drop.length===__d+1 && p.hand.length===1 && p.hand[0]===11 && p.deck.length===3`), val(`const p=battle.plr; return [p.drop.length-__d,p.hand,p.deck.length]`));
  console.log(`\npass ${pass} fail ${fail}`);
})();
