// node tests/buddy_stand.js - [Stand] buddy zone mechanics: stands the real buddy zone entries (filtered), face-down refill, #1138 cast condition, #4237 rest check.
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.LD = ALL_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('LegendDragon')&&c.id!==5526).id;
 globalThis.OTH = ALL_CARDS.find(c=>c.type==='Monster'&&!(c.attrs||[]).includes('LegendDragon')&&!c.skill).id;
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const f=battle.plr; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3; f.hand=[]; f.drop=[]; f.life=10;
   f.buddyZone=[{id:LD,rested:true,isFaceDown:false},{id:OTH,rested:true,isFaceDown:false}]; f.buddyCalled=true; return f; };
 globalThis.bz=()=>battle.plr.buddyZone.map(e=>e.rested?'R':'S').join('');`);
(async () => {
  // #5526 Breeze Bearer destroyed: stand all Legend Dragon in the buddy zone (only those)
  run(`{ const f=setup(); f.monsters.center=mk(CARD_MAP.get(5526)); battle.destroyMonster('plr','center'); }`); await settle();
  ck("5526 destroyed: Legend Dragon buddy stands, other stays rested", val(`return bz()`) === "SR", val(`return bz()`));
  // #5422 De Ju Mau: stands Legend Dragon in the buddy zone
  run(`{ const f=setup(); f.hand=[5422]; f.gauge=f.deck.splice(0,3); battle.castSpellFromHand('plr',0); }`); await settle();
  ck("5422 cast: Legend Dragon buddy stands, other stays rested", val(`return bz()`) === "SR", val(`return bz()`));
  // #6136 Future Force "DGX": [Stand] all Legend Dragon monsters in the buddy zone and on the field
  run(`{ const f=setup(); const s={op:'stand', alsoBuddyZone:true, np:ABX.parseNP('all «Legend Dragon» monsters on your field')}; ABX.OPS.stand.run(s,{side:'plr',f,e:battle.opp,card:CARD_MAP.get(6136),bind:{chosen:[],revealed:[],looked:[]},lastDone:true,log:[]}); }`); await settle();
  ck("6136 stand: buddy zone Legend Dragon stands too", val(`return bz()`) === "SR", val(`return bz()`));
  // buddyCalled flag follows the real entries (a stood buddy can be called again)
  ck("buddyCalled is false once a face-up monster buddy stood", val(`return battle.plr.buddyCalled`) === false, val(`return battle.plr.buddyCalled`));
  // #5340 "put the top card of your deck face down into your buddy zone"
  run(`{ const f=setup(); f.buddyZoneFaceDown=[]; const top=f.deck[0]; globalThis.__top=top; ABX.OPS.standBuddyZone.run({op:'standBuddyZone',refill:true},{side:'plr',f,e:battle.opp,card:CARD_MAP.get(5340)}); }`); await settle();
  ck("5340 refill: top card goes face down into the buddy zone", val(`const f=battle.plr; return f.buddyZoneFaceDown.length===1 && f.buddyZoneFaceDown[0]===__top && getFighterBuddyZoneEntries(f).filter(e=>e.isFaceDown).length===1`), val(`return battle.plr.buddyZoneFaceDown`));
  ck("5340 refill: leaves the face-up buddy rested", val(`return bz()`) === "RR", val(`return bz()`));
  // #1138: may only cast if the card in the buddy zone is [Rest]
  run(`setup();`);
  ck("1138 castable while buddy is rested", val(`return evaluateCardConditions(CARD_MAP.get(1138), battle.plr, battle.opp).met`), val(`return evaluateCardConditions(CARD_MAP.get(1138), battle.plr, battle.opp)`));
  run(`battle.plr.buddyZone.forEach(e=>e.rested=false);`);
  ck("1138 NOT castable while buddy is standing", val(`return !evaluateCardConditions(CARD_MAP.get(1138), battle.plr, battle.opp).met`), val(`return evaluateCardConditions(CARD_MAP.get(1138), battle.plr, battle.opp)`));
  ck("ABX.buddyZoneRested follows the entries", val(`const f=battle.plr; const a=ABX.buddyZoneRested(f); f.buddyZone[0].rested=true; return [a, ABX.buddyZoneRested(f)]`).join() === "false,true");
  console.log("pass", pass, "fail", fail);
})();
