// node tests/deck_combined.js - "up to N A and B combined" deck rule (#2929 #2936 #3500-#3504)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const val = (c) => env.run('(function(){' + c + '\n})()');
const pairs = { 2929: "Magical Goodbye", 2936: "Battle Aura Circle", 3500: "Black Dragon Shield", 3501: "Noble Sacrifice", 3502: "Sturdy Dragon Strike", 3503: "Quiescence of Cassiade", 3504: "Ninja Arts, Snake Gaze" };
for (const [id, partner] of Object.entries(pairs)) {
  const r = val(`const g=deckComboGroup(${id}); const p=ALL_CARDS.find(c=>c.name===${JSON.stringify(partner)}); if(!g||!p) return JSON.stringify({g:!!g,p:!!p});
    const l=[${id},${id},p.id]; const a=deckComboFull(l,${id}); l.push(p.id); const b=deckComboFull(l,${id}); const c2=deckComboFull(l,p.id);
    return JSON.stringify({a,b,c2,max:g.max});`);
  const o = JSON.parse(r);
  ck(`#${id}+${partner}: 3 not full, 4 full, partner sees same group`, o.a === false && o.b === true && o.c2 === true && o.max === 4, o);
}
ck("unrelated card has no group", val(`return deckComboGroup(46)===null`));
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
