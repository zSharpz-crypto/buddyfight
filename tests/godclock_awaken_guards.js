// Godclock #5957 awaken guards: nothing flips after the match ended, and the bot loop only offers it on the bot's own turn
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; if (!ok) console.log("FAIL", n, JSON.stringify(x ?? "")); };
run(`battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true; battle.showCutin=function(){};`);
run(`{const f=battle.plr; f.monsters.left={card:CARD_MAP.get(6065),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}; [0,1,3].forEach(i=>f.godclock.quadrants[i].reversed=true); f.godclock.awakened=false; }`);
const elig = J(`battle.godclockAwakenEligible(battle.plr)`);
ck("setup: eligible before match end", elig === true, elig);
run(`battle.matchOver=true`);
ck("awaken refused after match ended", J(`battle.awakenEndrulerDragon('plr',{fromTrigger:true,pick:battle.godclockTimeRulerCandidates(battle.plr)[0]})`) === false);
ck("still not awakened", J(`battle.plr.godclock.awakened`) === false);
run(`battle.matchOver=false`);
ck("awaken works while the match runs", J(`battle.awakenEndrulerDragon('plr',{fromTrigger:true,pick:battle.godclockTimeRulerCandidates(battle.plr)[0]})`) !== false && J(`battle.plr.godclock.awakened`) === true);
console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
