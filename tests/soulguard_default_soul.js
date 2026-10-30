// [Soulguard] monsters called from hand: the default 1 deck soul applies unless the [Call Cost] really pays its own soul
// (parsed deck soul, or ABX extras with a soul part). Regression of df2a6af, which skipped the default on any /\[Call Cost\][^\n]*soul/.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log("FAIL", n, JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 6; i++) { env.flush(); await new Promise(r => setImmediate(r)); } };
run(`battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;`);
async function hand(id) {
  run(`{const f=battle.plr; ["left","center","center2","right"].forEach(p=>{f.monsters[p]=null;battle.opp.monsters[p]=null}); battle.activeSide='plr'; battle.phase='main'; battle.turnCount++; f.maxSize=99; f.callLimitUsed={};
   f.hand=[${id},46,46,46]; f.drop=[6055,6141,5999,46,46,6055,6141]; f.gauge=Array(8).fill(46); f.life=10; f.deck=Array.from({length:30},(_,i)=>3000+i); globalThis.__top=f.deck.slice(0,6);}`);
  run(`battle.completeMonsterCall('plr','center',0,false)`); await settle();
  for (let k = 0; k < 3; k++) { run(`if(battle.activeChoice){const a=battle.activeChoice;battle.activeChoice=null;a.onSelect(a.firstPayload)}`); await settle(); }
  return J(`(()=>{const u=battle.plr.monsters.center;return u&&u.card.id===${id}?{soul:u.soul,top:__top}:null})()`);
}
(async () => {
  await settle();
  const cats = J(`(()=>{const o=[];const f=battle.plr;
    for(const c of CARD_MAP.values()){ if(c.type!=="Monster"||!c.sg) continue;
      const m=(c.skill||"").match(/\\[Call Cost\\][^\\n]*/); if(!m) continue;
      const k=parseCardCost(c.cost,c.skill,f,c);
      o.push({id:c.id,soul:k.soul,ex:ABX.hasSoulExtras?!!ABX.hasSoulExtras(c):!!ABX.hasExtras(c)});}
    return o})()`);
  let n = { deck: 0, extras: 0, dflt: 0, notCalled: 0 };
  for (const c of cats) {
    const r = await hand(c.id);
    if (!r) { n.notCalled++; continue; }
    if (c.id === 1636) { n.exempt = 1; continue; }   // enter trigger calls Dragonarms from the drop zone and the test's auto-choice consumes the soul; identical on the parent commit
    if (c.soul > 0) { n.deck++; ck("#" + c.id + " deck soul " + c.soul, JSON.stringify(r.soul.slice(0, c.soul)) === JSON.stringify(r.top.slice(0, c.soul)), r); }
    else if (c.ex) { n.extras++; ck("#" + c.id + " extras soul: no default deck card", !r.soul.length || r.soul[0] !== r.top[0], r); }
    else { n.dflt++; ck("#" + c.id + " default 1 deck soul", r.soul[0] === r.top[0], r); }
  }
  console.log("soulguard w/ call cost:", cats.length, JSON.stringify(n));
  // the cards named in the regression report
  for (const [id, cnt] of [[257,1],[670,1],[905,2],[2123,1],[2326,1],[3431,1],[3638,1],[3649,2],[4936,4],[3179,1],[5851,2]]) {
    const r = await hand(id); ck("#" + id + " pays its " + cnt + " deck soul", r && JSON.stringify(r.soul.slice(0, cnt)) === JSON.stringify(r.top.slice(0, cnt)) && r.soul.length >= cnt, r);
  }
  for (const id of [105,152,742,3010,1492,2300,4805,6027,4026,5364,4262]) {
    const r = await hand(id); ck("#" + id + " unhandled soul cost keeps default 1 deck soul", r && r.soul[0] === r.top[0], r);
  }
  // no Call Cost line: default stays
  for (const id of [6055, 6141]) { const r = await hand(id); ck("#" + id + " no Call Cost: default soul", r && r.soul[0] === r.top[0], r); }
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
