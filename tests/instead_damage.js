// "Deal N damage! If <cond>, deal M damage instead!!" must deal N *or* M, never both (#837 Death Ruler Thirteen, #2565 Gigadroid Gigantes)
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(447,"T",571,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.BM=window.BUDDYFIGHT_CARDS.filter(c=>c.type==='Monster'&&(c.attrs||[]).includes('BraveMachine')).slice(0,5).map(c=>c.id);
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=20; f.setSpells=[]; } battle.plr.gauge=[1,2,3,4,5,6,7,8]; battle.opp.gauge=[1,2,3]; battle.opp.deck=Array(20).fill(47); battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
(async () => {
  for (const [drop, exp] of [[13, 5], [12, 1], [14, 1], [0, 1]]) {
    run(`clear(); battle.opp.drop=Array(${drop}).fill(47); battle.plr.monsters.center=mku(837)`);
    run(`ABX.fireEnter('plr', CARD_MAP.get(837), battle.plr.monsters.center)`); await settle();
    const dmg = 20 - J(`battle.opp.life`);
    ok(dmg === exp, `#837 opp drop zone ${drop} cards -> ${exp} damage (got ${dmg})`);
  }
  // #2565 [Act]: reveal top 5; 3+ «Brave Machine» -> 2 damage, 5 -> 5 damage INSTEAD
  for (const [n, exp] of [[0, 0], [2, 0], [3, 2], [4, 2], [5, 5]]) {
    run(`clear(); battle.plr.monsters.center=mku(2565); battle.plr.deck=[...BM.slice(0,${n}), ...Array(${5 - n}).fill(46), ...Array(20).fill(46)]`);
    run(`{const c=CARD_MAP.get(2565); const ab=ABX.get(c).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',c,ab,battle.plr.monsters.center,{auto:true});}`); await settle();
    const dmg = 20 - J(`battle.opp.life`);
    ok(dmg === exp, `#2565 ${n} «Brave Machine» revealed -> ${exp} damage (got ${dmg})`);
  }
  run(`clear(); battle.plr.gauge=[]; battle.plr.monsters.center=mku(2565); battle.plr.deck=[...BM.slice(0,5), ...Array(20).fill(46)]`);
  run(`{const c=CARD_MAP.get(2565); const ab=ABX.get(c).abilities.find(a=>a.kind==='act'); ABX.runAbility('plr',c,ab,battle.plr.monsters.center,{auto:true});}`); await settle();
  ok(J(`battle.opp.life`) === 20, `#2565 cannot pay the gauge -> no damage even with five «Brave Machine» on top (opp life ${J(`battle.opp.life`)})`);
  // #2229 Arch Enemy: when this card attacks, 1 damage; 10+ cards in the opponent's drop zone -> 2 INSTEAD; 20+ -> 4 INSTEAD
  for (const [drop, exp] of [[0, 1], [9, 1], [10, 2], [19, 2], [20, 4], [27, 4]]) {
    run(`clear(); battle.opp.drop=Array(${drop}).fill(47); battle.plr.monsters.center=mku(2229)`);
    run(`ABX.fireAttack('plr', [{unit: battle.plr.monsters.center}], 'opp', 'fighter')`); await settle();
    const dmg = 20 - J(`battle.opp.life`);
    ok(dmg === exp, `#2229 attack with ${drop} cards in the opponent's drop zone -> ${exp} damage (got ${dmg})`);
  }
  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED");
  process.exit(fail ? 1 : 0);
})();
