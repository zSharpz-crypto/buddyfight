// node tests/hero_d.js - Hero World batch 4: Act-driven [Ride]/[Transform] chains (#943 ...)
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
  // #943 Monster Card Burn: pay 4, drop Card Serpent + Card Rhino + itself, then [Ride] Ultimate Card Burn (#950) from hand
  run(`{ const me=setup(); me.monsters.left=mk(CARD_MAP.get(1054)); me.monsters.right=mk(CARD_MAP.get(1049)); me.monsters.center=mk(CARD_MAP.get(943)); me.hand=[950]; globalThis.__g=me.gauge.length; ABX.useAct('plr',CARD_MAP.get(943),me.monsters.center); }`); await settle();
  ck("943 act: three cards dropped", val(`const d=battle.plr.drop; return [1054,1049,943].every(i=>d.includes(i))`), val(`return battle.plr.drop`));
  ck("943 act: Ultimate Card Burn is now on the field", val(`return battle.plr.item&&battle.plr.item.card.id===950`), val(`return battle.plr.item&&battle.plr.item.card.id`));
  ck("943 act: gauge paid (>=4)", val(`return battle.plr.gauge.length<=__g-4`), val(`return [battle.plr.gauge.length,__g]`));
  // missing a required card -> nothing happens
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(943)); me.hand=[950]; globalThis.__g=me.gauge.length; ABX.useAct('plr',CARD_MAP.get(943),me.monsters.center); }`); await settle();
  ck("943 act without Serpent/Rhino: nothing dropped, no Ride", val(`return battle.plr.monsters.center.card.id===943 && battle.plr.hand.includes(950)`), val(`return [battle.plr.monsters.center&&battle.plr.monsters.center.card.id, battle.plr.hand]`));
  // #2152 Card Wyvern: riding Ultimate Card Burn (#950) -> pay 2, drop both, ride D-Wing (#2107) from deck
  run(`{ const me=setup(); me.item=null; me.monsters.center=mk(CARD_MAP.get(2152)); me.item={card:CARD_MAP.get(950),rested:false,attacksLeft:1,soul:[]}; me.deck.unshift(2107); globalThis.__g=me.gauge.length; ABX.useAct('plr',CARD_MAP.get(2152),me.monsters.center); }`); await settle();
  ck("2152 act: D-Wing ridden from deck, old Burn + Wyvern dropped", val(`return battle.plr.item&&battle.plr.item.card.id===2107 && battle.plr.drop.includes(950) && battle.plr.drop.includes(2152) && !battle.plr.monsters.center`), val(`return [battle.plr.item&&battle.plr.item.card.id, battle.plr.drop, battle.plr.monsters.center&&battle.plr.monsters.center.card.id]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2152)); me.deck.unshift(2107); ABX.useAct('plr',CARD_MAP.get(2152),me.monsters.center); }`); await settle();
  ck("2152 act when not riding Burn: nothing", val(`return battle.plr.monsters.center&&battle.plr.monsters.center.card.id===2152 && !battle.plr.item`), val(`return [battle.plr.item]`));
  console.log("pass", pass, "fail", fail);
})();
