// #2462 Jackarms J Galaxion, #3997 Jackarms J. Arsenal (Jackknife soul cards), #3234 Death Dragon Knight, Davide ("Disaster" attacks cannot be nullified)
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 14; i++) { flush(); await wait(15); } };
run(`ABX.fast=true; ABX.autoPlay=true;`);
const base = (js) => run(`(function(){
  const mon = ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill);
  battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(5957,'O',6065,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; battle.setPrompt=function(){};
  const att=battle.plr, def=battle.opp; ['left','center','right'].forEach(p=>{att.monsters[p]=null;def.monsters[p]=null;}); att.item=null; def.item=null;
  const mk=(c,soul)=>({card:c,rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
  battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6;
  ${js}; return 1; })()`);
const unnull = (units, defUnit) => J(`ABX.attackUnnullifiable({attSide:'plr',defSide:'opp',attUnits:[${units}],defUnit:${defUnit || "null"},active:true})`);
(async () => {
  // #2462: impact monster with "Jackknife" in its name + this card in soul, attacking alone
  base(`att.monsters.center=mk(CARD_MAP.get(1804),[2462]); att.monsters.left=mk(CARD_MAP.get(639),[2462]); att.monsters.right=mk(CARD_MAP.get(1804),[]);`);
  ok(unnull(`battle.plr.monsters.center`) === true, "#2462 Jackknife impact monster with it in soul, alone: cannot be nullified");
  ok(unnull(`battle.plr.monsters.center,battle.plr.monsters.left`) === false, "#2462 link attack: normal");
  ok(unnull(`battle.plr.monsters.left`) === false, "#2462 not an impact monster: normal");
  ok(unnull(`battle.plr.monsters.right`) === false, "#2462 without the card in soul: normal");
  // #3234: a Disaster on your field attacks a monster
  const dis = J(`ALL_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).includes('Disaster')&&x.id!==3234).id`);
  base(`att.monsters.left=mk(CARD_MAP.get(3234)); att.monsters.center=mk(CARD_MAP.get(${dis})); att.monsters.right=mk(mon); def.monsters.center=mk(mon);`);
  ok(unnull(`battle.plr.monsters.center`, `battle.opp.monsters.center`) === true, "#3234 a Disaster attacking a monster: cannot be nullified");
  ok(unnull(`battle.plr.monsters.center`) === false, "#3234 attacking the fighter: normal");
  ok(unnull(`battle.plr.monsters.right`, `battle.opp.monsters.center`) === false, "#3234 non-Disaster: normal");
  base(`att.monsters.center=mk(CARD_MAP.get(${dis})); def.monsters.center=mk(mon);`);
  ok(unnull(`battle.plr.monsters.center`, `battle.opp.monsters.center`) === false, "#3234 not on the field: normal");
  // #3997: Jackknife monster with this card in soul, attack nullified -> Double Attack (once per turn)
  const nullAttack = async () => { run(`battle.executeAttackResolution('plr',['center'],'fighter',true)`); await tick(); };
  base(`att.monsters.center=mk(CARD_MAP.get(639),[3997]); att.monsters.center.attacksLeft=0; att.monsters.center.rested=true; att.monsters.center.atkTurn=6; att.monsters.center.atkUsed=1;`);
  await nullAttack();
  ok(J(`battle.plr.monsters.center.tempDA`) === true && J(`battle.plr.monsters.center.attacksLeft`) === 1 && J(`battle.plr.monsters.center.rested`) === false, "#3997 nullified: gets Double Attack and can attack again");
  run(`battle.plr.monsters.center.attacksLeft=0; battle.plr.monsters.center.rested=true`);
  await nullAttack();
  ok(J(`battle.plr.monsters.center.attacksLeft`) === 0, "#3997 once per turn");
  base(`att.monsters.center=mk(CARD_MAP.get(639),[]); att.monsters.center.attacksLeft=0; att.monsters.center.rested=true; att.monsters.center.atkTurn=6; att.monsters.center.atkUsed=1;`);
  await nullAttack();
  ok(J(`!battle.plr.monsters.center.tempDA`), "#3997 without the card in soul: nothing");
  console.log(`\npass ${passed} fail ${failed}`); process.exit(failed ? 1 : 0);
})();
