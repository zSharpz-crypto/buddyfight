// node tests/hero_d.js - Star Dragon conditional effects (#2920 ... #6155)
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
  // #2920 enters center -> destroy; enters side -> nothing
  run(`{ const me=setup(); battle.opp.monsters.left=mk(CARD_MAP.get(1054)); me.monsters.center=mk(CARD_MAP.get(2920)); ABX.fireEnter('plr',CARD_MAP.get(2920),me.monsters.center); }`); await settle();
  ck("2920 enters center: opp monster destroyed", val(`return !battle.opp.monsters.left`));
  run(`{ const me=setup(); battle.opp.monsters.left=mk(CARD_MAP.get(1054)); me.monsters.right=mk(CARD_MAP.get(2920)); ABX.fireEnter('plr',CARD_MAP.get(2920),me.monsters.right); }`); await settle();
  ck("2920 enters right: nothing destroyed", val(`return !!battle.opp.monsters.left`));
  // #2381: <=3 drop cards -> gauge (auto) else nothing
  run(`{ const me=setup(); me.drop=[1054]; globalThis.__g=me.gauge.length; ABX.fireEnter('plr',CARD_MAP.get(2381),mk(CARD_MAP.get(2381))); }`); await settle();
  ck("2381: small drop -> +1 gauge after bottoming the drop card", val(`return battle.plr.gauge.length===__g+1`), val(`return [battle.plr.gauge.length,__g,battle.plr.drop]`));
  run(`{ const me=setup(); me.drop=new Array(7).fill(1054); globalThis.__g=me.gauge.length; globalThis.__l=me.life; ABX.fireEnter('plr',CARD_MAP.get(2381),mk(CARD_MAP.get(2381))); }`); await settle();
  ck("2381: big drop (still >3 after bottoming 2) -> no bonus", val(`return battle.plr.gauge.length===__g && battle.plr.life===__l`), val(`return [battle.plr.gauge.length,__g,battle.plr.drop.length]`));
  // #2888: destroy then gauge by size
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(1054)); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__g=me.gauge.length; globalThis.__sz=CARD_MAP.get(1054).size; ABX.fireSpell('plr',CARD_MAP.get(2888)); }`); await settle();
  ck("2888: destroyed monster's size in cards to gauge", val(`return !battle.opp.monsters.center && battle.plr.gauge.length>=__g+__sz`), val(`return [battle.plr.gauge.length,__g,__sz]`));
  // #3286: leaves in attack phase -> gauge + life, not in main phase
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3286)); battle.phase='attack'; globalThis.__g=me.gauge.length; globalThis.__l=me.life; battle.destroyMonster('plr','center'); }`); await settle();
  ck("3286 leaves during attack phase: +1 gauge, +1 life", val(`return battle.plr.gauge.length===__g+1 && battle.plr.life===__l+1`), val(`return [battle.plr.gauge.length,__g,battle.plr.life,__l]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3286)); battle.phase='main'; globalThis.__g=me.gauge.length; battle.destroyMonster('plr','center'); }`); await settle();
  ck("3286 leaves during main phase: nothing", val(`return battle.plr.gauge.length===__g`));
  // #2384 move + redirect
  run(`{ const me=setup(); const g=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Guardians')).id; me.monsters.left=mk(CARD_MAP.get(g)); ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',redirectTo:null}; ABX.fireSpell('plr',CARD_MAP.get(2384)); }`); await settle();
  ck("2384: Guardians moved to center and attack redirected", val(`return battle.plr.monsters.center && !battle.plr.monsters.left && ABX.battleCtx.redirectTo==='center'`), val(`return [battle.plr.monsters, ABX.battleCtx]`));
  run(`ABX.battleCtx=null`);
  // #4037 self to deck bottom, stand chosen, +1 life (attack phase only)
  run(`{ const me=setup(); battle.phase='attack'; me.life=10; me.monsters.center=mk(CARD_MAP.get(4037)); const g=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Guardians')).id; me.monsters.left=mk(CARD_MAP.get(g)); me.monsters.left.rested=true; globalThis.__dl=me.deck.length; const ab=ABX.actAbilities(CARD_MAP.get(4037))[0]; ABX.runAbility('plr',CARD_MAP.get(4037),ab,me.monsters.center,{event:{name:'act'}}); }`); await settle();
  ck("4037: left standing, self back in deck, +1 life", val(`const p=battle.plr; return !p.monsters.center && !p.monsters.left.rested && p.life===11 && p.deck.length===__dl+1`), val(`const p=battle.plr; return [p.monsters.center&&1,p.monsters.left.rested,p.life,p.deck.length,__dl]`));
  // #3208 drop card to bottom of owner's deck, +1 life
  run(`{ const me=setup(); me.life=10; battle.opp.drop=[1054]; me.drop=[]; globalThis.__od=battle.opp.deck.length; ABX.fireEv&&0; const ab=ABX.get(CARD_MAP.get(3208)).abilities.find(a=>a.kind==='triggered'&&a.steps[0].op==='r42DropToBottomLife'); ABX.runAbility('plr',CARD_MAP.get(3208),ab,mk(CARD_MAP.get(3208)),{event:{name:'attack'}}); }`); await settle();
  ck("3208: opp drop card to bottom of opp deck, +1 life", val(`return battle.opp.deck.length===__od+1 && battle.opp.drop.length===0 && battle.plr.life===11`), val(`return [battle.opp.deck.length,__od,battle.opp.drop.length,battle.plr.life]`));
  // #6053 / #6155 Reversal tails
  const rev = (n) => `battle.plr.godclock=battle.plr.godclock||{}; battle.plr.godclock.reversalCount=${n};`;
  for (const [n, exp] of [[2, 1], [1, 2]]) {
    run(`{ const me=setup(); ${rev(n)} battle.opp.hand=[1054,1054]; battle.opp.monsters.left=mk(CARD_MAP.get(1054)); globalThis.__od=battle.opp.deck.length; const ab=ABX.get(CARD_MAP.get(6053)).abilities.find(a=>a.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(6053),ab,mk(CARD_MAP.get(6053)),{event:{name:'x'}}); }`); await settle();
    ck("6053 reversal x"+n+": opp hand "+exp, val(`return battle.opp.hand.length===${exp}`), val(`return [battle.opp.hand.length, battle.opp.life]`));
  }
  for (const [n, atkGone] of [[4, true], [3, false]]) {
    run(`{ const me=setup(); ${rev(n)} battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__h=me.hand.length; ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',redirectTo:null,nullified:false,attUnits:[battle.opp.monsters.center]}; ABX.fireSpell('plr',CARD_MAP.get(6155)); }`); await settle();
    ck("6155 reversal x"+n+": attacker "+(atkGone?"bottomed and I draw":"stays"), val(`return (!battle.opp.monsters.center)===${atkGone} && battle.plr.hand.length===__h+${atkGone?1:0}`), val(`return [!!battle.opp.monsters.center, battle.plr.hand.length, __h]`));
    run(`ABX.battleCtx=null`);
  }
  // Magic World / deck effects
  run(`globalThis.__key=ALL_CARDS.find(c=>c.name==='Key of Solomon, First Volume').id; globalThis.__dr=ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Dragonarms')).id;`);
  run(`{ const me=setup(); me.deck=[__dr,1054,1054]; me.life=10; globalThis.__g=me.gauge.length; ABX.fireSpell('plr',CARD_MAP.get(1312)); }`); await settle();
  ck("1312: Dragonarms from deck to gauge", val(`return battle.plr.gauge.length===__g+1 && !battle.plr.deck.includes(__dr)`), val(`return [battle.plr.gauge.length,__g]`));
  run(`{ const me=setup(); me.deck=[1054,1054,1054]; me.life=10; globalThis.__g=me.gauge.length; ABX.fireSpell('plr',CARD_MAP.get(2393)); }`); await settle();
  ck("2393: monster to gauge, +1 life", val(`return battle.plr.gauge.length===__g+1 && battle.plr.life===11`), val(`return [battle.plr.gauge.length,__g,battle.plr.life]`));
  run(`{ const me=setup(); battle.opp.monsters.center=mk(CARD_MAP.get(1054)); ABX.fireSpell('plr',CARD_MAP.get(21)); }`); await settle();
  ck("21: opp center monster pushed to left", val(`return !battle.opp.monsters.center && !!battle.opp.monsters.left`));
  for (const [mine, theirs, exp] of [[1, 1, 2], [2, 1, 1]]) {
    run(`{ const me=setup(); me.item=null; me.monsters.center=mk(CARD_MAP.get(1054)); ${mine>1?'me.monsters.left=mk(CARD_MAP.get(1054));':''} battle.opp.monsters.center=mk(CARD_MAP.get(1054)); battle.opp.life=10; const ab=ABX.get(CARD_MAP.get(1858)).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(1858),ab,mk(CARD_MAP.get(1858)),{event:{name:'act'}}); }`); await settle();
    ck("1858 "+mine+" vs "+theirs+" monsters: opp loses "+exp, val(`return battle.opp.life===${10-exp}`), val(`return battle.opp.life`));
  }
  run(`{ const me=setup(); me.deck=[1054,1054,1054,1054]; me.life=10; globalThis.__g=me.gauge.length; globalThis.__h=me.hand.length; globalThis.__d=me.drop.length; ABX.fireSpell('plr',CARD_MAP.get(4747)); }`); await settle();
  ck("4747: gauge+1, hand+1, drop+1, life+1", val(`const p=battle.plr; return p.gauge.length===__g+1 && p.hand.length===__h+1 && p.drop.length===__d+1 && p.life===11`), val(`const p=battle.plr; return [p.gauge.length-__g,p.hand.length-__h,p.drop.length-__d,p.life]`));
  run(`{ const me=setup(); me.drop=[__key]; me.life=10; globalThis.__h=me.hand.length; ABX.fireSpell('plr',CARD_MAP.get(23)); }`); await settle();
  ck("23 with Key in drop: +1 life and draw", val(`return battle.plr.life===11 && battle.plr.hand.length===__h+1`));
  run(`{ const me=setup(); me.drop=[]; me.life=10; globalThis.__h=me.hand.length; ABX.fireSpell('plr',CARD_MAP.get(23)); }`); await settle();
  ck("23 without Key: +1 life, no draw", val(`return battle.plr.life===11 && battle.plr.hand.length===__h`));
  // Magic World: #15 #4934 #846 #1871
  run(`globalThis.__sp=[...new Map(ALL_CARDS.filter(c=>c.type==='Spell').map(c=>[c.name,c.id])).values()].slice(0,12); globalThis.__asm=ALL_CARDS.find(c=>/asmodai/i.test(c.name)&&c.type==='Monster'); globalThis.__wiz=ALL_CARDS.find(c=>c.type==='Monster'&&/dragowizard/i.test(c.name)).id;`);
  for (const [wiz, dest] of [[true, 'gauge'], [false, 'hand']]) {
    run(`{ const me=setup(); ${wiz?'me.monsters.center=mk(CARD_MAP.get(__wiz));':''} battle.opp.monsters.center=mk(CARD_MAP.get(1054)); globalThis.__og=battle.opp.gauge.length; globalThis.__oh=battle.opp.hand.length; ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',redirectTo:null,nullified:false,attUnits:[battle.opp.monsters.center]}; ABX.fireSpell('plr',CARD_MAP.get(15)); }`); await settle();
    ck("15 "+(wiz?"with":"without")+" Dragowizard: attacker to opp "+dest, val(`return !battle.opp.monsters.center && (battle.opp.${dest}.length===${dest==='gauge'?'__og':'__oh'}+1)`), val(`return [battle.opp.gauge.length,__og,battle.opp.hand.length,__oh]`));
    run(`ABX.battleCtx=null`);
  }
  for (const [n, life, draw, dmg] of [[3, 12, 0, 0], [6, 12, 2, 0], [9, 12, 2, 3], [2, 10, 0, 0]]) {
    run(`{ const me=setup(); me.drop=__sp.slice(0,${n}); me.life=10; battle.opp.life=10; me.deck=new Array(20).fill(1054); globalThis.__h=me.hand.length; globalThis.__g=me.gauge.length; ABX.fireSpell('plr',CARD_MAP.get(4934)); }`); await settle();
    ck("4934 returning "+n+" spells", val(`const p=battle.plr; return p.life===${life} && p.hand.length===__h+${draw} && battle.opp.life===${10-dmg} && p.gauge.length===__g+${n>=3?2:0}`), val(`const p=battle.plr; return [p.life,p.hand.length-__h,battle.opp.life,p.gauge.length-__g]`));
  }
  run(`{ const me=setup(); me.drop=[__asm.id,__asm.id,1054]; globalThis.__d=me.deck.length; ABX.fireEnter('plr',CARD_MAP.get(846),mk(CARD_MAP.get(846))); }`); await settle();
  ck("846: both Asmodai back in the deck, 1054 stays", val(`const p=battle.plr; return p.deck.length===__d+2 && p.drop.length===1`), val(`return [battle.plr.deck.length,__d,battle.plr.drop]`));
  run(`{ const me=setup(); me.life=10; me.monsters.center=mk(CARD_MAP.get(1871)); const ab=ABX.actAbilities(CARD_MAP.get(1871))[0]; ABX.runAbility('plr',CARD_MAP.get(1871),ab,me.monsters.center,{event:{name:'act'}}); }`); await settle();
  ck("1871: pays 1 life and sets its size", val(`const u=battle.plr.monsters.center; return battle.plr.life===9 && getEffectiveCardSize(battle.plr,u.card,u)===1`), val(`const u=battle.plr.monsters.center; return [battle.plr.life, getEffectiveCardSize(battle.plr,u.card,u)]`));
  console.log(`\npass ${pass} fail ${fail}`);
})();
