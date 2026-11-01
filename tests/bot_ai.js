// Smarter bot ("Rival"): link attacks to break high-Defense monsters, lethal first, avoids bad attacks, uses [Act]s, calls its best monsters
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async (n = 40) => { for (let i = 0; i < n; i++) { env.flush(); await new Promise(r => setTimeout(r, 3)); } };
run(`battle.start('hotseat', generateFlagDeck(447,'T',571,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true; battle.showCutin=function(){};
 battle.opp.isBot=true;
 globalThis.mk=(id,pw,df,cr)=>{ const c=CARD_MAP.get(id); const u={card:Object.assign({},c,{power:pw,defense:df,crit:cr==null?1:cr}),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}; return u; };
 globalThis.reset=()=>{ const p=battle.plr,o=battle.opp; ["left","center","right","center2"].forEach(z=>{p.monsters[z]=null;o.monsters[z]=null}); p.item=null;o.item=null; battle.activeSide='opp'; battle.phase='attack'; battle.turnCount=8; p.life=10;o.life=10; p.hand=[];o.hand=[]; o.gauge=Array(6).fill(46); };`);
const plan = () => J(`(()=>{const r=battle.botPlanAttack(battle.opp,'opp'); return r&&{z:r.zones,t:r.target,why:r.why}})()`);
(async () => {
  await settle();
  // 1. link attack breaks a monster that no single attacker can
  run(`reset(); battle.opp.monsters.left=mk(149,4000,3000); battle.opp.monsters.right=mk(149,4000,3000); battle.plr.monsters.center=mk(149,3000,8000);`);
  let p = plan(); ck("link attack: two 4000s break an 8000 Defense center", p && p.t === "center" && p.z.length === 2 && p.why === "kill", p);
  // 2. one attacker is enough -> do not waste the others
  run(`reset(); battle.opp.monsters.left=mk(149,9000,3000); battle.opp.monsters.right=mk(149,4000,3000); battle.plr.monsters.center=mk(149,3000,8000);`);
  p = plan(); ck("uses just the one attacker that can break it", p && p.t === "center" && p.z.length === 1 && p.z[0] === "left", p);
  // 3. attacks a side monster too, not only the center
  run(`reset(); battle.opp.monsters.left=mk(149,9000,3000); battle.plr.monsters.right=mk(149,2000,1000); battle.plr.monsters.center=mk(149,3000,50000);`);
  p = plan(); ck("breaks the monster it CAN break (right) instead of bouncing off the center", p && p.t === "right", p);
  // 4. lethal first
  run(`reset(); battle.opp.monsters.left=mk(149,4000,3000,2); battle.opp.monsters.right=mk(149,4000,3000,2); battle.plr.life=3;`);
  p = plan(); ck("lethal on the open fighter: link for 4 crit vs 3 life", p && p.t === "fighter" && p.why === "lethal" && p.z.length === 2, p);
  // 5. does not attack when nothing can be achieved
  run(`reset(); battle.opp.monsters.left=mk(149,1000,1000); battle.plr.monsters.center=mk(149,3000,9000);`);
  ck("no pointless attack into an unbreakable wall", plan() === null);
  // 6. [Counterattack] wall that would kill the attacker: no
  run(`reset(); battle.opp.monsters.left=mk(149,3000,2000); battle.plr.monsters.center=mk(149,6000,9000); battle.plr.monsters.center.card.ca=true;`);
  ck("does not feed a monster into a [Counterattack] wall", plan() === null);
  // 7. center kill that opens the fighter for the other attacker
  run(`reset(); battle.opp.monsters.left=mk(149,5000,3000,1); battle.opp.monsters.right=mk(149,3000,3000,3); battle.plr.monsters.center=mk(149,1000,4000); battle.plr.life=3;`);
  p = plan(); ck("kills the center with the strong one, keeping the 3-crit monster to finish", p && p.t === "center" && p.z.length === 1 && p.z[0] === "left", p);
  // 8. first-round rule respected
  run(`reset(); battle.turnCount=1; battle.turn1AttackUsed=true; battle.opp.monsters.left=mk(149,9000,3000);`);
  ck("first-round attack lock respected", plan() === null);
  // 9. smart calls: strongest affordable monster, sturdy one in the center
  run(`reset(); battle.activeSide='opp'; battle.phase='main'; battle.opp.gauge=Array(8).fill(46); battle.opp.maxSize=99; battle.opp.callLimitUsed={};
   const ids=[...CARD_MAP.values()].filter(c=>c.type==='Monster'&&c.size===1&&!c.sg&&parseCardCost(c.cost,c.skill,battle.opp,c).gauge<=2&&checkCardLegalityForFlag(c,CARD_MAP.get(447),false).allowed).sort((a,b)=>(a.power||0)-(b.power||0)).map(c=>c.id);
   globalThis.__weak=ids[0]; globalThis.__strong=ids[ids.length-1]; battle.opp.hand=[__weak,__strong];`);
  run(`battle.botSmartCalls(battle.opp)`); await settle(10);
  ck("calls the strongest monster first", J(`Object.values(battle.opp.monsters).some(m=>m&&m.card.id===__strong)`), J(`Object.values(battle.opp.monsters).filter(Boolean).map(m=>m.card.id)`));
  // 10. uses an [Act]: #83 Gan Alchimia "Pay 4 gauge. If you do, destroy one opponent's card on the field!"
  run(`reset(); battle.activeSide='opp'; battle.phase='main'; battle.opp.gauge=Array(6).fill(46); battle.opp.callLimitUsed={}; battle.opp.monsters.left=mk(83,3000,3000); battle.plr.monsters.center=mk(149,3000,3000);`);
  ck("#83 is seen as a usable [Act]", J(`ABX.canUseAct('opp',CARD_MAP.get(83),ABX.actAbilities(CARD_MAP.get(83))[0],battle.opp.monsters.left).ok`) === true);
  run(`battle.botUseAbilities(battle.opp)`); await settle(80);
  ck("bot used the [Act]: the player's monster is destroyed", J(`!battle.plr.monsters.center`), J(`battle.plr.monsters.center&&1`));
  // 11. whole bot turn runs to completion and hands over to the player (no hang)
  run(`battle.start('hotseat', generateFlagDeck(447,'T',571,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true; battle.showCutin=function(){}; battle.animateAttackStrike=function(a,b,c,d,e,cb){cb&&cb()}; battle.animateCardFlight=function(a,b,c,d,e,cb){cb&&cb()};
   battle.opp.isBot=true; battle.turnCount=6; battle.opp.hand=[]; battle.opp.gauge=Array(4).fill(46);
   battle.opp.monsters.left=mk(149,6000,3000,2); battle.opp.monsters.right=mk(149,6000,3000,2); battle.plr.monsters.center=mk(149,2000,9000); battle.plr.hand=[]; battle.plr.life=10; battle.activeSide='opp'; battle.phase='main'; battle.runBotTurn();`);
  await settle(400);
  ck("bot link-attacked and destroyed the 9000 Defense center", J(`!battle.plr.monsters.center`), J(`battle.plr.monsters.center&&1`));
  ck("turn handed back to the player", J(`battle.activeSide`) === "plr" || J(`battle.matchOver`), J(`[battle.activeSide,battle.phase,battle.turnCount]`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
