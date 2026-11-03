// node tests/gauge_cost.js - cost reductions: #1961 (72 Pillars on field), #3920 (6 Plague in item soul), #4764 (Overturn)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const val = (c) => env.run('(function(){' + c + '\n})()');
env.run(`globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
globalThis.f=battle.plr; globalThis.reset=()=>{['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.overturnUsed=false; f.overUsed={};};
globalThis.g=(id)=>{const c=card(id);return parseCardCost(c.cost,c.skill,f,c).gauge;};`);
const pillar = val(`return (window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/^(72)?pillars$/i.test(a)))||{}).id||0`);
const plague = val(`return (window.BUDDYFIGHT_CARDS.find(c=>c.type==='Spell'&&(c.attrs||[]).some(a=>/^plague$/i.test(a)))||{}).id||0`);
val(`reset()`);
ck("1961 base 6", val(`return g(1961)===6`), val(`return g(1961)`));
if (pillar) { val(`f.monsters.left=mk(${pillar}); f.monsters.right=mk(${pillar})`); ck("1961 with 2 pillars: 4", val(`return g(1961)===4`), val(`return g(1961)`)); val(`reset()`); }
else ck("1961 skipped (no 72 Pillars monster)", true);
ck("3920 base 3", val(`return g(3920)===3`));
if (plague) {
  val(`f.item=mk(46,[${plague},${plague},${plague},${plague},${plague}])`); ck("3920 with 5 Plague: 3", val(`return g(3920)===3`));
  val(`f.item=mk(46,[${plague},${plague},${plague},${plague},${plague},${plague}])`); ck("3920 with 6 Plague: 0", val(`return g(3920)===0`), val(`return g(3920)`));
  val(`reset()`);
} else ck("3920 skipped (no Plague spell)", true);
ck("4764 base 4", val(`return g(4764)===4`));
val(`f.overturnUsed=true; f.overUsed={overturn:true}`); ck("4764 after Overturn: 0", val(`return g(4764)===0`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
