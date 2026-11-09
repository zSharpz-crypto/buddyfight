// #5846 Yokai Hunter, Rei Isurugi: [Call Cost] Pay 2 gauge. Then, put two cards from your drop zone into its soul
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
const cost = J(`ABX.get(CARD_MAP.get(5846)).abilities.find(a=>a.kind==='cost'&&a.costKind==='call')`);
ok(cost && cost.parsed === true, "#5846 call cost parses");
const parts = (cost && cost.parts) || [];
ok(parts.some(p => p.gauge === 2), "#5846 pays 2 gauge");
ok(parts.some(p => p.soulFrom && p.soulFrom.area === "drop zone" && p.soulFrom.n === 2), "#5846 puts 2 drop-zone cards into its soul: " + JSON.stringify(parts.map(p => p.soulFrom || p.gauge)));
console.log("fail", fail); process.exit(fail ? 1 : 0);
