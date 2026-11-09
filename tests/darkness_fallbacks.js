// Darkness Dragon cards that ran on the generic text fallback: each checked against its printed text.
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
run(`battle.start("hotseat", generateFlagDeck(3337,"T",3338,false), generateFlagDeck(447,"O",571,false)); battle.renderBattle=function(){}; ABX.autoPlay=true; ABX.fast=true;
 globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.clear=()=>{ for (const f of [battle.plr,battle.opp]) { ["left","center","center2","right"].forEach(p=>f.monsters[p]=null); f.item=null; f.hand=[]; f.drop=[]; f.life=10; f.setSpells=[]; f.gauge=Array(8).fill(46); f.deck=Array(30).fill(46); } battle.matchOver=false; battle.activeSide="plr"; battle.phase="main"; battle.turnCount=6+(globalThis.__t=(globalThis.__t||0)+1); };`);
const settle = async () => { for (let i = 0; i < 40; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
const cast = async (id) => { run(`{ const c=CARD_MAP.get(${id}); for (const ab of ABX.get(c).abilities.filter(ABX.isSpellBody)) ABX.runAbility('plr',c,ab,null,{preApproved:true,auto:true,event:{name:'counter'}}); }`); await settle(); };
const enter = async (id, pos) => { run(`ABX.fireEnter('plr', CARD_MAP.get(${id}), battle.plr.monsters.${pos})`); await settle(); };
const attack = async (pos) => { run(`ABX.fireAttack('plr',[{unit:battle.plr.monsters.${pos}}],'opp','center')`); await settle(); };
(async () => {
  // #3578 Anti Verethragna: 4 damage (opp 4 life, own Evil Deity Dragon, opp empty field)
  const EDD = 3492;   // «Evil Deity Dragon» monster
  run(`clear(); battle.opp.life=4; battle.plr.monsters.center=mku(${EDD});`); await cast(3578);
  ok(J(`battle.opp.life`) <= 0, `#3578 deals 4 damage to a 4-life opponent (opp life ${J("battle.opp.life")})`);
  // #1952 Deadly Boost: top three cards of deck -> gauge
  run(`clear(); globalThis.__g=battle.plr.gauge.length;`); await cast(1952);
  ok(J(`battle.plr.gauge.length-__g`) === 3, `#1952 +3 gauge (got ${J("battle.plr.gauge.length-__g")})`);
  // #765 Devil Stigma: destroy own monster -> +2 gauge, +1 life
  run(`clear(); battle.plr.monsters.center=mku(46); globalThis.__g=battle.plr.gauge.length; globalThis.__l=battle.plr.life;`); await cast(765);
  ok(J(`!battle.plr.monsters.center`) && J(`battle.plr.gauge.length-__g`) === 2 && J(`battle.plr.life-__l`) === 1, `#765 destroys, +2 gauge, +1 life (gauge+${J("battle.plr.gauge.length-__g")}, life+${J("battle.plr.life-__l")}, center empty ${J("!battle.plr.monsters.center")})`);
  // #3498 Growl: attack with no gauge placed this turn -> +4 gauge
  run(`clear(); battle.plr.monsters.center=mku(3498); battle.opp.monsters.center=mku(46); globalThis.__g=battle.plr.gauge.length;`); await attack("center");
  ok(J(`battle.plr.gauge.length-__g`) === 4, `#3498 attack -> +4 gauge (got ${J("battle.plr.gauge.length-__g")})`);
  // #3703 Dirtiele: enter -> +1 life
  run(`clear(); battle.plr.monsters.center=mku(3703); battle.opp.monsters.center=mku(46); globalThis.__l=battle.plr.life;`); await enter(3703, "center");
  ok(J(`battle.plr.life-__l`) === 1, `#3703 enter -> +1 life (got ${J("battle.plr.life-__l")})`);
  // #2018 Abygale: attack -> top card of opp deck into opp drop zone
  run(`clear(); battle.plr.monsters.center=mku(2018); battle.opp.monsters.center=mku(46); globalThis.__d=battle.opp.drop.length;`); await attack("center");
  ok(J(`battle.opp.drop.length-__d`) >= 1, `#2018 attack -> opp deck top into opp drop (got ${J("battle.opp.drop.length-__d")})`);
  // #1952: the gauge is dropped only at the END of the turn
  run(`clear(); globalThis.__d=battle.plr.drop.length;`); await cast(1952);
  ok(J(`battle.plr.gauge.length`) === 11, `#1952 gauge still full during the turn (got ${J("battle.plr.gauge.length")})`);
  run(`ABX.fireTurnEvent('turnEnd')`); await settle();
  ok(J(`battle.plr.gauge.length`) === 0 && J(`battle.plr.drop.length-__d`) === 11, `#1952 end of turn: gauge -> drop (gauge ${J("battle.plr.gauge.length")}, drop+${J("battle.plr.drop.length-__d")})`);
  // #3498: a second attack the same turn gets nothing (gauge already received cards)
  run(`clear(); battle.plr.monsters.center=mku(3498); battle.opp.monsters.center=mku(46); globalThis.__g=battle.plr.gauge.length;`); await attack("center"); await attack("center");
  ok(J(`battle.plr.gauge.length-__g`) === 4, `#3498 only the first attack of the turn gives +4 (got ${J("battle.plr.gauge.length-__g")})`);
  // #3703: destroy only with two or more world names on your field
  const OTHER = J(`[...CARD_MAP.values()].find(c=>c.type==='Monster'&&(c.worlds||[]).length===1&&c.worlds[0]==='Dragon World'&&!/\\w/.test(c.skill||''))?.id ?? 46`);
  run(`clear(); battle.plr.monsters.center=mku(3703); battle.opp.monsters.center=mku(46);`); await enter(3703, "center");
  ok(J(`!!battle.opp.monsters.center`), "#3703 one world name: opponent's monster stays");
  run(`clear(); battle.plr.monsters.center=mku(3703); battle.plr.monsters.left=mku(${OTHER}); battle.opp.monsters.center=mku(46);`); await enter(3703, "center");
  ok(J(`!battle.opp.monsters.center`), `#3703 two world names (with #${OTHER}): opponent's monster destroyed`);
  console.log("fail", fail); process.exit(fail ? 1 : 0);
})();
