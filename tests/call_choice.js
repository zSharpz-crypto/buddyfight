// Ability calls (e.g. #867 Azi Dahaka called by an effect): the player chooses which monsters go to the drop zone
// when the call goes over the size limit, and chooses the zone (left/center/right) - it used to always pick left / drop leftmost.
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 4; i++) { flush(); await wait(10); } };

function setup() {
  run(`(function(){ABX.fast=true;ABX.autoPlay=false;
    battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
    const ones = ALL_CARDS.filter(x=>x.type==='Monster'&&x.size===1&&!x.skill).slice(0,3);
    const mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
    const me=battle.plr; me.maxSize=5; me.monsters.left=mk(ones[0]); me.monsters.center=mk(ones[1]); me.monsters.right=mk(ones[2]);
    me.hand.push(867); battle.turn='plr'; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=4;
    window.__ids=ones.map(c=>c.id); window.__prompts=[];
    return 1;})()`);
}
async function callAzi(dropChoice, zoneChoice) {
  run(`(function(){
    ABX.hooks.pickCards = function(o){ window.__prompts.push(o.title); const i = (o.cards||[]).findIndex(c=>c.card && [${dropChoice}].includes(c.card.id)); return i<0?[0]:[i]; };
    ABX.hooks.pickOption = function(o){ window.__prompts.push(o.title); const i=(o.options||[]).findIndex(x=>x.label.toLowerCase().includes('${zoneChoice}')); return i<0?0:i; };
    const f=battle.plr, hi=f.hand.lastIndexOf(867);
    const ctx={f, side:'plr', card:CARD_MAP.get(3619), bind:{chosen:[]}, selfRef:{k:'zone',side:'plr',area:'hand',id:867,idx:hi,card:CARD_MAP.get(867)}};
    window.__done=false;
    ABX.OPS.call.run({np:{self:true,qty:{n:1},raw:'call this card'},free:true}, ctx).then(r=>{window.__done=r;});
  })()`);
  await tick();
}
(async () => {
  console.log("=== over size limit: player picks which monsters go to the drop zone, and the zone ===");
  setup();
  const ids = J(`window.__ids`);
  await callAzi(ids[1] + "," + ids[2], "right");   // drop the CENTER and RIGHT ones (left stays), call it to the RIGHT
  const st = J(`({l:battle.plr.monsters.left&&battle.plr.monsters.left.card.id,c:battle.plr.monsters.center&&battle.plr.monsters.center.card.id,r:battle.plr.monsters.right&&battle.plr.monsters.right.card.id,drop:battle.plr.drop.slice(),done:window.__done,prompts:window.__prompts})`);
  ok(st.done === true, "the call happened");
  ok(st.r === 867, "Azi Dahaka was called to the zone the player chose (right), not always left (got l=" + st.l + " c=" + st.c + " r=" + st.r + ")");
  ok(st.drop.includes(ids[1]) && st.drop.includes(ids[2]) && st.l === ids[0], "the monsters the player picked (center, right) were dropped; the left one stayed");
  ok(st.prompts.length >= 2, "the player was asked (prompts: " + st.prompts.length + ")");

  console.log("=== bots / auto play keep the old automatic behaviour ===");
  setup();
  run(`ABX.autoPlay=true; ABX.hooks.pickCards=null; ABX.hooks.pickOption=null;`);
  run(`(function(){const f=battle.plr, hi=f.hand.lastIndexOf(867);
    const ctx={f, side:'plr', card:CARD_MAP.get(3619), bind:{chosen:[]}, selfRef:{k:'zone',side:'plr',area:'hand',id:867,idx:hi,card:CARD_MAP.get(867)}};
    window.__done=false; ABX.OPS.call.run({np:{self:true,qty:{n:1},raw:'call this card'},free:true}, ctx).then(r=>{window.__done=r;});})()`);
  await tick();
  ok(J(`window.__done`) === true && J(`Object.values(battle.plr.monsters).some(u=>u&&u.card.id===867)`), "auto play still calls it without prompting");

  console.log(`pass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
