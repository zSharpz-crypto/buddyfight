// #3981 Great Spell, Incubation Period: choose a card on your field, look at the top 2, up to two «Plague» spells into its soul, rest to drop; once per turn.
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const run = (c) => env.run('{' + c + '\n}');
  const settle = async () => { for (let i = 0; i < 60; i++) { await new Promise(r => setImmediate(r)); env.flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.alert=function(m){ globalThis.__alert=m; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3; battle.pendingAction=null; return battle.plr; };`);
  const setup = (host, hand, top) => run(`fresh(); globalThis.__alert=null; const f=battle.plr; ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.setSpells=[]; f.gauge=[1,2,3,4,5,6];
    const u={card:CARD_MAP.get(447),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
    if('${host}'==='monster') f.monsters.center=u; if('${host}'==='item') f.item=u; globalThis.__host=u; f.hand=${JSON.stringify(hand)}; f.deck=${JSON.stringify(top)}.concat(f.deck);`);
  const cast = async () => { run(`battle.castSpellFromHand('plr', battle.plr.hand.indexOf(3981));`); await settle(); };
  setup("monster", [3981], [3980, 4053]); await cast();
  ck("monster host gets both Plague spells", run(`JSON.stringify(__host.soul)`) === "[3980,4053]", run(`JSON.stringify(__host.soul)`));
  setup("monster", [3981], [3980, 571]); await cast();
  ck("only the Plague spell goes to the soul, the other to the drop zone", run(`JSON.stringify(__host.soul)`) === "[3980]" && run(`battle.plr.drop.includes(571)`), run(`JSON.stringify([__host.soul, battle.plr.drop])`));
  setup("item", [3981], [3980, 4053]); await cast();
  ck("equipped item can be the host", run(`JSON.stringify(__host.soul)`) === "[3980,4053]", run(`JSON.stringify(__host.soul)`));
  setup("monster", [3981, 3981], [3980, 4053, 3982, 3957]); await cast(); await cast();
  ck("second copy cannot be cast in the same turn", run(`battle.plr.hand.length===1 && /once per turn/.test(__alert||'')`), run(`[battle.plr.hand, __alert]`));
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
