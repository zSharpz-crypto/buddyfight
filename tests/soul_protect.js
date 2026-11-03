// node tests/soul_protect.js - soul protections vs the opponent's effects: #2276 #2693 #2889 #4058 #4185 #5167
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 80; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.setSpells=[]; f.hand=[1]; f.drop=[]; }); };
globalThis.mon=(re)=>window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>re.test(a))&&![2693].includes(c.id));
globalThis.P=(u,k,by)=>ABX.core.isProtected(u,'plr',k,{side:by||'opp'});`);
// isProtected cases
run(`fresh(); globalThis.pd=mk(mon(/^prismdragon$/i).id,[5167]);`);
ck("5167: Prism Dragon souls protected from opp", val(`return P(pd,'souls dropped')`)); ck("5167: not from own effects", val(`return !P(pd,'souls dropped','plr')`));
run(`globalThis.pd2=mk(mon(/^prismdragon$/i).id,[46]);`); ck("5167 absent: not protected", val(`return !P(pd2,'souls dropped')`));
run(`globalThis.d2693=mk(2693,[46]);`); ck("2693: souls protected", val(`return P(d2693,'souls dropped')`));
run(`globalThis.cp=mk(mon(/^computer$/i).id,[4185]);`);
ck("4185: Computer cannot be destroyed by opp", val(`return P(cp,'destroyed')`)); ck("4185: souls protected", val(`return P(cp,'souls dropped')`));
run(`globalThis.pl=mk(mon(/^plague$/i).id,[4058]);`); ck("4058: Plague host abilities cannot be nullified", val(`return P(pl,'nullified')`));
// single-card protection through a real "drop a soul" effect
(async () => {
for (const [id, re, name] of [[2889, /^prismdragon$/i, "2889"], [2276, /^dragonchiefemperor$/i, "2276"], [4058, /^plague$/i, "4058"]]) {
  run(`fresh(); globalThis.h=mk(mon(${re}).id,[46,${id},47]); battle.plr.monsters.left=h; globalThis.st=ABX.parseSentenceSteps("put a soul from a monster on your opponent's field into the drop zone",{});`);
  run(`ABX.core.runAbility('opp', card(46), {kind:'act', steps: st.steps, conds: [], unparsed: []}, null, {})`); await settle();
  ck(`${name}: opp drops a soul but not the protected card`, val(`return h.soul.length===2&&h.soul.includes(${id})&&battle.plr.drop.length===1`), val(`return [h.soul, battle.plr.drop]`));
}
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
