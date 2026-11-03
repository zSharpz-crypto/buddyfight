// #6562 Yuga & Garga "SD" & Ranma & Vanity "SD": the monster it calls on top of itself must still obey the size limit.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(3337,"T",3338,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.setSpells=[]; f.hand=[]; f.drop=[]; f.life=10; f.deck=Array(30).fill(46); f.gauge=[46,46,46,46,46,46]; } battle.plr.maxSize=3; battle.activeSide="plr"; battle.phase="main"; battle.matchOver=false; battle.turnCount++; };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const LV2 = 6562, GARGA2 = 4311;   // 4311 Gargantua Dragon: size 2
const used = () => J(`battle.getCurrentSizeUsed(battle.plr)`);
const fire = async () => { run(`{ const c=CARD_MAP.get(${LV2}); const ab=ABX.get(c).abilities.find(a=>a.kind==='act'||a.kind==='counter'||/garga/i.test(a.raw||a.cleaned||'')); globalThis.__ab=ab; globalThis.__ret=ABX.runAbility('plr',c,ab,battle.plr.monsters.center,{preApproved:true,auto:true}); }`); await settle(); };
(async () => {
  // 1) it fits: 6562 (1) + one size-1 monster (1); calling a size-2 on top of 6562 -> 1 + 2 = 3
  run(`clear(); battle.plr.monsters.center=mku(${LV2}); battle.plr.monsters.left=mku(46); battle.plr.drop=[${GARGA2}];`);
  const before1 = used(); await fire();
  ok(J(`battle.plr.monsters.center.card.id`) === GARGA2 && used() <= 3, `fits: Garga called on top, size ${before1} -> ${used()} (limit 3)`);
  // 2) over the limit: 6562 (1) + a size-2 monster (2) = 3; calling a size-2 on top -> 2 + 2 = 4, so it must NOT end above 3
  run(`clear(); battle.plr.monsters.center=mku(${LV2}); battle.plr.monsters.left=mku(${GARGA2}); battle.plr.drop=[${GARGA2}];`);
  const before2 = used(); await fire();
  ok(used() <= 3, `over the limit: field size after the call is ${used()} (was ${before2}, limit 3)`);
  // 3) a monster bigger than the whole limit can never be called
  run(`clear(); battle.plr.monsters.center=mku(${LV2}); battle.plr.drop=[686]; battle.plr.maxSize=2;`);
  await fire();
  ok(used() <= 2, `size 3 monster is not called under a limit of 2 (size ${used()})`);
  run(`battle.plr.maxSize=3;`);
  console.log(fail ? `fail ${fail}` : "fail 0");
  process.exit(fail ? 1 : 0);
})();
