// #4565 Gar-C'mon ([Counter] ... call up to one size 1 or less «Deity Dragon Tribe» from your drop zone): the CASTER chooses.
// Bug: the "choose the zone to call it to" prompt was shown on the local screen even when the caster is the online friend ('opp' in online_p2p).
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const run = (c) => env.run('{' + c + '\n}');
  const settle = async () => { for (let i = 0; i < 80; i++) { await new Promise(r => setImmediate(r)); env.flush(); } };
  env.run(`ABX.fast=true; globalThis.alert=function(){};
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.turnCount=3; battle.pendingAction=null; };`);
  async function scenario(mode, defSide) {
    const attSide = defSide === "plr" ? "opp" : "plr";
    run(`fresh(); ABX.autoPlay=false; battle.mode='${mode}'; battle.activeSide='${attSide}'; battle.phase='attack';
      const d=battle.getFighter('${defSide}'), a=battle.getFighter('${attSide}');
      ['left','center','right'].forEach(p=>{d.monsters[p]=null;a.monsters[p]=null;});
      const mk=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
      a.monsters.center=mk(447); d.monsters.center=mk(571);
      d.gauge=[1,2,3,4,5,6]; d.drop=[4285,4285]; d.hand=[4565]; globalThis.__ui=[];
      ABX.ui.pickCards=async function(o){ __ui.push('pickCards:'+o.title); return o.cards.length?[0]:[]; };
      ABX.ui.confirm=async function(){ __ui.push('confirm'); return true; };
      ABX.ui.pickOption=async function(o){ __ui.push('pickOption:'+(o.title||'')); return 0; };
      battle.applyDefensiveCounterCard('${defSide}',0,'${attSide}',['center'],'center');`);
    await settle();
    return { ui: run(`__ui.slice()`), called: run(`!!battle.getFighter('${defSide}').monsters.left`) };
  }
  const h = await scenario("hotseat", "opp");
  ck("hotseat: caster still chooses the zone", h.ui.some(x => /choose the zone/.test(x)) && h.called, h);
  const b = await scenario("bot", "plr");
  ck("vs bot: human defender chooses monster and zone", b.ui.some(x => /pickCards:Gar-C'mon/.test(x)) && b.ui.some(x => /choose the zone/.test(x)) && b.called, b);
  const o = await scenario("online_p2p", "opp");
  ck("online: the host is NOT asked where the friend's monster goes", !o.ui.some(x => /choose the zone|over your size limit/.test(x)), o);
  ck("online: the friend's monster is still called", o.called, o);
  const o2 = await scenario("online_p2p", "plr");
  ck("online: the local player (plr) still chooses their own zone", o2.ui.some(x => /choose the zone/.test(x)) && o2.called, o2);
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
