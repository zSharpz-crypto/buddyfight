// A spell that calls a monster from your hand "by paying its [Call Cost]" must not count that monster as one of the discarded cards (#12 Check It Out! + #1434 "discard 2 cards", #1276 "discard a card")
//   node tests/call_discard_self.js
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; f.maxSize=99; f.castLimitUsed={}; } battle.plr.gauge=[1,2,3,4,5,6,7,8]; battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; battle.turnCount++; };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const cast12 = async (hand) => { run(`clear(); battle.plr.hand=${JSON.stringify(hand)}`); run(`{ const c=CARD_MAP.get(12); const ab=ABX.get(c).abilities.find(a=>a.kind==='spell'); ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'counter'}}); }`); await settle();
  return J(`({called:["left","center","right"].map(p=>battle.plr.monsters[p]&&battle.plr.monsters[p].card.id).filter(Boolean), hand:battle.plr.hand.slice(), drop:battle.plr.drop.slice()})`); };
(async () => {
  let r = await cast12([1434, 4388]);
  ok(r.called.length === 0 && r.hand.length === 2, `#1434 with only 1 other card: cannot pay "discard 2 cards" -> not called, hand kept (${JSON.stringify(r)})`);
  r = await cast12([1434, 4388, 4387]);
  ok(r.called.join() === "1434" && r.hand.length === 0 && r.drop.length === 2, `#1434 with 2 other cards: called, exactly those 2 discarded (${JSON.stringify(r)})`);
  r = await cast12([1276]);
  ok(r.called.length === 0 && r.hand.length === 1, `#1276 alone: cannot discard "a card" other than itself -> not called (${JSON.stringify(r)})`);
  r = await cast12([1276, 4388]);
  ok(r.called.join() === "1276" && r.hand.length === 0 && r.drop.length === 1, `#1276 with 1 other card: called, 1 discarded (${JSON.stringify(r)})`);
  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
})();
