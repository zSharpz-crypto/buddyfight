// node tests/bandori_a.js - BanG Dream (#5495)
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
   me.gauge=me.deck.splice(0,7); op.gauge=op.deck.splice(0,5); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=10; ABX.curEffectCard=null;
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };`);
(async () => {
  for (const ok of [false, true]) {
    run(`{ const me=setup(); me.hand=[5495]; me.monsters.left=mk(CARD_MAP.get(5381)); ${ok ? "me.monsters.center=mk(CARD_MAP.get(5382)); me.monsters.right=mk(CARD_MAP.get(5392));" : ""} globalThis.__r=evaluateCardConditions(CARD_MAP.get(5495),me,battle.opp); }`);
    const r = val(`return __r`);
    ck("5495 cast gate " + (ok ? "Afterglow total size 3: allowed" : "total size 1: blocked"), ok ? r.met === true : r.met === false, r);
  }
  // #5452 stand all Poppin'Party; draw only when five cards stood
  for (const five of [true, false]) {
    run(`{ const me=setup(); me.hand=[]; me.deck=[1,2,3]; ['left','center','right'].forEach(p=>{ me.monsters[p]=mk(CARD_MAP.get(5383)); me.monsters[p].rested=true; }); me.item=mk(CARD_MAP.get(5389)); me.item.rested=true; ${five ? "me.item2=mk(CARD_MAP.get(5384)); me.item2.rested=true;" : ""} ABX.fireSpell('plr',CARD_MAP.get(5452),{free:true}); }`); await settle();
    ck("5452 " + (five ? "five stood: draws" : "four stood: no draw"), val(`const p=battle.plr; return p.monsters.left.rested===false && p.hand.length===${five ? 1 : 0}`), val(`const p=battle.plr; return [p.monsters.left.rested,p.hand.length]`));
  }
  // #5372 Act: rest self, stand the other copy (once, no double run)
  run(`{ const me=setup(); const a=mk(CARD_MAP.get(5372)), b=mk(CARD_MAP.get(5372)); b.rested=true; me.monsters.left=a; me.monsters.right=b; const ab=ABX.get(CARD_MAP.get(5372)).abilities.find(x=>x.kind==='act'); ABX.runAbility('plr',CARD_MAP.get(5372),ab,a,{event:{name:'act'}}); }`); await settle();
  ck("5372: self rested, other stood", val(`const p=battle.plr; return p.monsters.left.rested===true && p.monsters.right.rested===false`), val(`const p=battle.plr; return [p.monsters.left.rested,p.monsters.right.rested]`));
  // #5380 redirect to center Pastel*Palettes
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(5379)); me.monsters.left=mk(CARD_MAP.get(5380)); ABX.battleCtx={active:true,attSide:'opp',defSide:'plr',redirectTo:null}; const ab=ABX.get(CARD_MAP.get(5380)).abilities.find(a=>a.kind==='triggered'); ABX.runAbility('plr',CARD_MAP.get(5380),ab,me.monsters.left,{event:{name:'oppAttack'}}); globalThis.__rd=ABX.battleCtx.redirectTo; }`); await settle();
  ck("5380: attack redirected to center", val(`return __rd==='center'`), val(`return [__rd]`));
  console.log("\npass " + pass + " fail " + fail);
})();
