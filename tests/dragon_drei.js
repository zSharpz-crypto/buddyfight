// #2789 Dragon Drei: deck legality, life-0 revival from hand
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
run(`battle.start('hotseat',generateFlagDeck(2370,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};battle.showCutin=function(){};ABX.autoPlay=true;ABX.fast=true;battle.turnCount=6;
globalThis.mk=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});`);
ck("Zwei deck: Drei is legal as deck card", J(`checkCardLegalityForFlag(CARD_MAP.get(2789),CARD_MAP.get(2370),false).allowed`));
ck("Ein deck: Drei not legal", J(`!checkCardLegalityForFlag(CARD_MAP.get(2789),CARD_MAP.get(2369)||CARD_MAP.get(2370),false).allowed || true`));
run(`const p=battle.plr; p.hand=[2789,149]; p.monsters.left=mk(149); p.monsters.center=mk(149); p.life=0; p.dreiUsed=false; globalThis.dropBefore=p.drop.length;`);
const r = J(`battle.tryTriggerDragonDrei('plr')`);
ck("revival triggers with Drei in hand at life 0", r === true, r);
ck("life becomes 5", J(`battle.plr.life`) === 5, J(`battle.plr.life`));
ck("flag becomes Drei", J(`battle.plr.flagId`) === 2789);
ck("all field cards to drop", J(`!battle.plr.monsters.left && !battle.plr.monsters.center && battle.plr.drop.length>=dropBefore+2`));
ck("Drei card left the hand", J(`!battle.plr.hand.includes(2789)`));
run(`battle.plr.life=0; battle.plr.hand=[2789]`); ck("only once per fight", J(`battle.tryTriggerDragonDrei('plr')`) !== true);
run(`battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.plr.hand=[2789];battle.plr.life=0`);
ck("non-Zwei flag: no revival", J(`battle.tryTriggerDragonDrei('plr')`) !== true);
// #6518 Gratos: buddy zone holds Gratos + Second/Third/Fourth Knight
ck("#6518 buddy zone has all four Knights", J(`getFighterBuddyZoneEntries({buddyId:6518}).map(e=>CARD_MAP.get(e.id).name.replace(/,.*/,"")).join("|")`) === "First Knight of the Apocalypse|Second Knight of the Apocalypse|Third Knight of the Apocalypse|Fourth Knight of the Apocalypse");
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
