// Soulguard monsters whose [Call Cost] puts a card from the drop zone into their soul (#105 #152 #742 #3010) + truncated cost fields (#5307 #5851 #5863 #6093)
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log("FAIL", n, JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 8; i++) { env.flush(); await new Promise(r => setImmediate(r)); } };
run(`battle.start('hotseat', generateFlagDeck(447,'T',571,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;`);
async function call(id, drop) {
  run(`{const f=battle.plr; ["left","center","center2","right"].forEach(p=>{f.monsters[p]=null;battle.opp.monsters[p]=null}); battle.activeSide='plr'; battle.phase='main'; battle.turnCount++; f.maxSize=99; f.callLimitUsed={};
   f.hand=[${id},46]; f.drop=${JSON.stringify(drop)}; f.gauge=Array(8).fill(46); f.deck=Array.from({length:30},(_,i)=>3000+i); globalThis.__top=f.deck[0]; globalThis.__dl=f.drop.length;}`);
  run(`battle.completeMonsterCall('plr','center',0,false)`); await settle();
  for (let k = 0; k < 3; k++) { run(`if(battle.activeChoice){const a=battle.activeChoice;battle.activeChoice=null;a.onSelect(a.firstPayload)}`); await settle(); }
  return J(`(()=>{const u=battle.plr.monsters.center;return u&&u.card.id===${id}?{soul:u.soul,g:battle.plr.gauge.length,drop:battle.plr.drop.length,top:__top}:null})()`);
}
const nm = (re) => J(`[...CARD_MAP.values()].find(c=>${re}.test(c.name)&&c.type==="Monster").id`);
(async () => {
  await settle();
  const cobalt = nm(/Cobalt/), arm = nm(/^Armorknight/);
  let r = await call(105, [cobalt, 46]); ck("#105 gauge 2 + Cobalt card from drop into soul", r && r.g === 6 && r.soul.includes(cobalt) && !r.soul.includes(r.top), r);
  r = await call(152, [arm, 46]); ck("#152 gauge 1 + Armorknight from drop", r && r.g === 7 && r.soul.includes(arm) && !r.soul.includes(r.top), r);
  r = await call(3010, [46, 46]); ck("#3010 gauge 2 + a drop card into soul", r && r.g === 6 && r.soul.length >= 1 && !r.soul.includes(r.top), r);
  for (const [id, g] of [[5851, 2], [5863, 3], [6093, 2]]) { const k = J(`parseCardCost(CARD_MAP.get(${id}).cost,CARD_MAP.get(${id}).skill,null,CARD_MAP.get(${id})).gauge`); ck("#" + id + " pays " + g + " gauge (cost field cut off)", k === g, k); }
  ck("#5307 pays 2 gauge", J(`parseCardCost(CARD_MAP.get(5307).cost,CARD_MAP.get(5307).skill,null,CARD_MAP.get(5307)).gauge`) === 2);
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
