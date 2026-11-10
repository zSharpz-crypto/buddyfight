// node tests/extra_turn.js - "after this turn you get another turn" through the REAL End Turn flow (#19 #6402)
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async (n = 40, ms = 5) => { for (let i = 0; i < n; i++) { await new Promise(r => setTimeout(r, ms)); flush(); } };
const start = async (mode) => { run(`ABX.fast=true;ABX.autoPlay=true;window.alert=function(){};battle.showCutin=function(){};battle.start("${mode}",generateFlagDeck(447,"T",571,true),generateFlagDeck(447,"O",571,true));battle.renderBattle=function(){};`); await settle(); };
(async () => {
  for (const mode of ["hotseat", "vsbot"]) {
    await start(mode);
    run(`{ const me=battle.plr; battle.activeSide="plr"; battle.turn="plr"; battle.phase="main"; battle.turnCount=3; me.abxExtraTurn=0; me.gauge=me.deck.splice(0,7); me.drop=[1,2,3]; me.deck=[4,5,6,7,8,9]; me.hand=[11]; me.monsters.center={card:CARD_MAP.get(1054),rested:true,attacksLeft:0,soul:[],tempPower:0,tempDef:0,tempCrit:0}; ABX.fireSpell("plr",CARD_MAP.get(19),{free:true}); }`); await settle();
    run(`battle.endTurn()`); await settle(80);
    ck(mode + " #19: same player, next turn count, stood, drew, back in main", val(`const p=battle.plr; return battle.activeSide==='plr' && battle.turnCount===4 && p.hand.length===2 && p.monsters.center.rested===false && p.monsters.center.attacksLeft===1 && battle.phase==='main'`), val(`const p=battle.plr; return [battle.activeSide,battle.turnCount,p.hand.length,p.monsters.center.rested,battle.phase]`));
    run(`battle.endTurn()`); await settle(80);
    ck(mode + " #19: the extra turn is used up (the next End Turn hands the turn to the opponent)", val(`return battle.plr.abxExtraTurn===0 && battle.turnCount>=5 && (battle.activeSide==='opp' || battle.turnCount>=6)`), val(`return [battle.activeSide,battle.turnCount]`));
  }
  // #6402: the extra turn skips the main phase
  await start("hotseat");
  run(`{ const me=battle.plr; battle.activeSide="plr"; battle.turn="plr"; battle.phase="main"; battle.turnCount=3; me.abxExtraTurn=0; me.gauge=me.deck.splice(0,7); me.deck=[4,5,6,7,8,9]; ABX.fireSpell("plr",CARD_MAP.get(6402),{free:true}); }`); await settle();
  ck("6402: one extra turn flag and the skip-main flag are set", val(`return battle.plr.abxExtraTurn===1 && battle.plr.abxSkipMain===4`), val(`return [battle.plr.abxExtraTurn,battle.plr.abxSkipMain]`));
  run(`battle.endTurn()`); await settle(80);
  ck("6402: extra turn starts in the Attack Phase (no main phase)", val(`return battle.activeSide==='plr' && battle.turnCount===4 && battle.phase==='attack'`), val(`return [battle.activeSide,battle.turnCount,battle.phase]`));
  run(`battle.endTurn()`); await settle(80);
  ck("6402: the following turn is normal (flag spent)", val(`return battle.plr.abxSkipMain==null`), val(`return [battle.plr.abxSkipMain]`));
  console.log("\npass " + pass + " fail " + fail);
})();
