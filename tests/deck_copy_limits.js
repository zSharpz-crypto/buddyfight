// Generated flag decks must respect checkCardLegalityForFlag maxCopies and keep full size.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
const decks = [[5957, 6065, false, "Godclock"], [447, 571, true, "Dragon World"], [2370, 2371, false, "Dragon Zwei"], [1, 46, false, "Tetsuya"], [969, 2372, false, "Dragon Ein"], [3337, 3338, false, "Legend"]];
for (const [f, b, lost, name] of decks) {
  const r = J(`(()=>{const dk=generateFlagDeck(${f},'T',${b},${lost});const fc=CARD_MAP.get(${f});const bad=[];const cnt={};dk.cards.forEach(i=>cnt[i]=(cnt[i]||0)+1);
    for(const id in cnt){const l=checkCardLegalityForFlag(CARD_MAP.get(+id),fc,false,dk.buddyId);const m=l.allowed?l.maxCopies:0;if(cnt[id]>m)bad.push(id+' x'+cnt[id]+'>'+m);}
    return {size:dk.cards.length,want:DECK_SIZE,bad};})()`);
  ok(r.bad.length === 0, `${name}: copy limits ${JSON.stringify(r.bad)}`);
  ok(r.size === r.want, `${name}: size ${r.size}/${r.want}`);
}
process.exit(fail ? 1 : 0);
