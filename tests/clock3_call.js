// Clock-III #5960 "Horary Domination": call a Time Dragon from drop paying its FULL [Call Cost] (gauge, deck soul, drop-zone soul), fire enter triggers.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
run(`battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(447,'O',571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.cnt=(f)=>{let n=f.hand.length+f.gauge.length+f.deck.length+f.drop.length+(f.setSpells||[]).length;["left","center","right","center2"].forEach(p=>{const m=f.monsters[p];if(m){n+=1+(m.soul||[]).length}}); if(f.item&&!f.item.isEndrulerFlag)n+=1+(f.item.soul||[]).length; return n};
 globalThis.pickFirst=()=>{ if(battle.activeChoice){const a=battle.activeChoice; battle.activeChoice=null; a.onSelect(a.firstPayload);} };
 globalThis.__enters=[]; const fe=ABX.fireEnter; ABX.fireEnter=function(side,c){ __enters.push(c.id); return fe.apply(this,arguments); };`);
async function setup(drop, gauge) {
  run(`{ for (const f of [battle.plr,battle.opp]) ["left","center","right"].forEach(p=>f.monsters[p]=null); battle.activeSide='plr'; battle.phase='main'; battle.turnCount=5;
    const q=battle.plr.godclock; q.awakened=false; q.quadrants.forEach(x=>x.reversed=false); q.horaryDominationUsedThisTurn=false;
    battle.plr.hand=[46]; battle.plr.drop=${JSON.stringify(drop)}; battle.plr.gauge=Array(${gauge}).fill(46); globalThis.__enters.length=0;
    globalThis.__g=battle.plr.gauge.length; globalThis.__c=cnt(battle.plr); globalThis.__dk=battle.plr.deck.slice(0,3); globalThis.__dl=battle.plr.deck.length; }`);
}
async function flip() { run(`battle.initiateClockFlipInteractive('plr',3)`); await settle(); run(`pickFirst()`); await settle(); run(`pickFirst()`); await settle(); }
const unitOf = (id) => J(`Object.values(battle.plr.monsters).find(m=>m&&m.card.id===${id}) || null`);
(async () => {
  await settle();
  // gauge 1 + top deck soul 1
  await setup([5955], 3); await flip(); let u = unitOf(5955);
  ck("#5955 called: gauge 1, soul = top deck card", u && J("__g-battle.plr.gauge.length") === 1 && u.soul.length === 1 && u.soul[0] === J("__dk[0]"), u);
  ck("#5955 count conserved", J("cnt(battle.plr)===__c-0") || J("cnt(battle.plr)===__c"));
  // #6065: 2 gauge + 2 top deck soul
  await setup([6065], 4); await flip(); u = unitOf(6065);
  ck("#6065 called: gauge 2, soul = top 2 deck cards", u && J("__g-battle.plr.gauge.length") === 2 && JSON.stringify(u.soul) === JSON.stringify(J("__dk.slice(0,2)")), u);
  ck("#6065 count conserved", J("cnt(battle.plr)===__c"));
  // Vegas: soul = 1 Time Dragon from drop (not the deck), no gauge
  await setup([5999, 6055, 6141], 0); await flip(); u = unitOf(5999);
  ck("#5999 soul is 1 Time Dragon from drop, deck untouched", u && u.soul.length === 1 && [6055, 6141].includes(u.soul[0]) && J("battle.plr.deck.length") >= J("__dl") && J("battle.plr.deck[0]") === J("__dk[0]"), u);
  ck("#5999 count conserved", J("cnt(battle.plr)===__c"));
  // Teylor Luna: 3 gauge + up to 2 Time Dragons from drop
  await setup([6010, 6055, 6141], 4); await flip(); u = unitOf(6010);
  ck("#6010 gauge 3, soul = 2 Time Dragons from drop", u && J("__g-battle.plr.gauge.length") === 3 && u.soul.length === 2 && u.soul.every(x => [6055, 6141].includes(x)), u);
  ck("#6010 count conserved", J("cnt(battle.plr)===__c"));
  // unpayable: Vegas alone in drop (would have to use itself), #6065 with 1 gauge
  await setup([5999], 0);
  ck("Vegas alone in drop: not offered", J("battle.getDropZoneTimeDragonMonsters(battle.plr).length") === 0);
  await setup([6065], 1);
  ck("#6065 with 1 gauge: not offered", J("battle.getDropZoneTimeDragonMonsters(battle.plr).length") === 0);
  await setup([6010, 6055], 4);
  ck("#6010 offered with 1 other TD in drop (up to 2)", J("battle.getDropZoneTimeDragonMonsters(battle.plr).some(d=>d.card.id===6010)"));
  const before = J("JSON.stringify([battle.plr.drop,battle.plr.gauge.length,battle.plr.hand])");
  await setup([5999], 0); run(`battle.initiateClockFlipInteractive('plr',3)`); await settle();
  ck("unpayable: nothing changes", J("battle.plr.drop.length")===1 && J("battle.plr.hand.length")===1 && J("cnt(battle.plr)===__c") && !J("battle.plr.godclock.quadrants[3].reversed"));
  // enter trigger
  await setup([5943], 0); await flip(); u = unitOf(5943);
  ck("#5943 enter trigger fired", u && J("__enters.includes(5943)"), J("__enters"));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
