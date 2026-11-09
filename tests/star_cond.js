// node tests/hero_d.js - Star Dragon conditional effects (#2920 #2381 #2888 #3286 #3334 #1677)
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
  console.log(`\npass ${pass} fail ${fail}`);
})();
