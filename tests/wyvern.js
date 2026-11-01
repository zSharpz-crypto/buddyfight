// node tests/wyvern.js - #5767 / #6066 Gargantua Slash Wyvern: the [G.BOOST-Will-] "for this turn ..." life/damage must wait for the attack / end of battle
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}');
  const settle = async () => { for (let i = 0; i < 8; i++) { await flush(); await new Promise(r => setTimeout(r, 25)); } };
  run(`ABX.fast=true; ABX.autoPlay=true;
  globalThis.setup=function(id, withDeity, deityId){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='attack';
    const f=battle.plr, e=battle.opp; ['left','center','right'].forEach(p=>{f.monsters[p]=null; e.monsters[p]=null;});
    const c=CARD_MAP.get(id); const u={card:c,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}; f.monsters.center=u;
    if(withDeity) f.monsters.left={card:CARD_MAP.get(deityId),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
    f.deck.push(1,2,3); globalThis.__u=u; globalThis.__c=c;
    globalThis.__ab=ABX.parseCard(c).abilities.find(a=>a.kind==='triggered'&&(a.tags||[]).some(t=>/g\\.boost-will/.test(t))); };`);
  const deity = run(`CARD_MAP.get(4575).name + '|' + JSON.stringify(CARD_MAP.get(4575).attrs)`);
  console.log("deity sample:", deity);
  for (const [id, label] of [[5767, "#5767"], [6066, "#6066"]]) {
    for (const withDeity of [true, false]) {
      run(`setup(${id}, ${withDeity}, 4575);`); await settle(); run(`battle.plr.life=5; battle.opp.life=5; ABX.runAbility('plr', __c, __ab, __u, {preApproved:true});`); await settle();
      ck(`${label} deity=${withDeity}: ability resolving gives NO life/damage yet`, run(`battle.plr.life===5 && battle.opp.life===5`), run(`[battle.plr.life,battle.opp.life]`));
      if (id === 6066) {
        run(`ABX.fireAttack('plr',[{unit:__u,pos:'center'}],'opp','center');`); await settle();
        ck(`${label} deity=${withDeity}: monster attacks -> ${withDeity ? "+2 life" : "nothing"}`, run(`battle.plr.life===${withDeity ? 7 : 5} && battle.opp.life===5`), run(`[battle.plr.life,battle.opp.life]`));
        if (withDeity) { run(`ABX.fireAttack('plr',[{unit:__u,pos:'center'}],'opp','center');`); await settle(); ck(`${label} second attack -> +2 again`, run(`battle.plr.life===9`), run(`battle.plr.life`)); }
      } else {
        run(`ABX.fireAttack('plr',[{unit:__u,pos:'center'}],'opp','center');`); await settle();
        ck(`${label} deity=${withDeity}: attack alone gives nothing`, run(`battle.plr.life===5 && battle.opp.life===5`), run(`[battle.plr.life,battle.opp.life]`));
        run(`ABX.fireBattleEnd('plr',[{unit:__u,pos:'center'}]);`); await settle();
        ck(`${label} deity=${withDeity}: end of battle -> ${withDeity ? "+1 life, 1 dmg" : "nothing"}`, run(`battle.plr.life===${withDeity ? 6 : 5} && battle.opp.life===${withDeity ? 4 : 5}`), run(`[battle.plr.life,battle.opp.life]`));
      }
    }
  }
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
