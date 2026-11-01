// "if there are a total of N or more ..." conditions must gate the effect: the parser used to keep the effect but drop the
// condition and then run it a second time through r40StructuredExec (#2895 dealt 6 damage on every enter).
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 12; i++) { flush(); await wait(15); } };
const setup = () => run(`(function(){ ABX.fast=true; ABX.autoPlay=true;
  battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
  globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  globalThis.weak=ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill&&x.defense<=3000);
  const me=battle.plr, op=battle.opp; me.life=10; op.life=10; battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6;
  ['left','center','right'].forEach(p=>{me.monsters[p]=null; op.monsters[p]=null;}); me.item=null; op.item=null; me.drop=[]; op.drop=[]; me.setSpells=[];
  globalThis.pick=(f,n)=>ALL_CARDS.filter(f).filter((c,i,a)=>a.findIndex(d=>d.name===c.name)===i).slice(0,n).map(c=>c.id);
  return 1; })()`);
const attack = async (id, pos) => { run(`battle.plr.monsters.${pos||"left"}=mk(CARD_MAP.get(${id})); battle.opp.monsters.center=mk(weak); ABX.fireAttack('plr',[{unit:battle.plr.monsters.${pos||"left"}}],'opp','center')`); await tick(); };
(async () => {
  // #2468 Zenislator "Rain the Vertex!": 6+ monsters with "Dragon" in attribute in your drop -> destroy a monster
  for (const [n, want] of [[5, false], [6, true]]) {
    setup(); run(`battle.plr.drop=pick(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/dragon/i.test(a)), ${n})`); await attack(2468);
    ok(J(`!battle.opp.monsters.center`) === want, `#2468 with ${n} Dragon monsters in drop: ${want ? "destroys" : "does not destroy"} the monster`);
  }
  // #2044 Daredevil: 4+ monsters and 4+ spells in opponent's drop -> 3 damage (once)
  for (const [m, sp, dmg] of [[4, 3, 0], [4, 4, 3]]) {
    setup(); run(`battle.opp.drop=pick(c=>c.type==='Monster',${m}).concat(pick(c=>c.type==='Spell',${sp}))`); await attack(2044);
    ok(J(`battle.opp.life`) === 10 - dmg, `#2044 opp drop ${m} monsters + ${sp} spells: ${dmg} damage (life ${J(`battle.opp.life`)})`);
  }
  // #2494 Red Arthur: 4+ different Hero/Superhero cards in drop -> [Double Attack]
  for (const [n, want] of [[3, false], [4, true]]) {
    setup(); run(`battle.plr.drop=pick(c=>(c.attrs||[]).some(a=>/^(hero|superhero)$/i.test(a)), ${n})`); await attack(2494);
    ok(J(`!!battle.plr.monsters.left.tempDA`) === want, `#2494 with ${n} different Hero cards in drop: ${want ? "gets" : "no"} [Double Attack]`);
  }
  // #1970 Black Drake "A": 3+ cards in souls of your field cards -> [Double Attack]
  for (const [n, want] of [[2, false], [3, true]]) {
    setup(); run(`battle.plr.monsters.right=mk(weak); battle.plr.monsters.right.soul=pick(c=>c.type==='Monster',${n})`); await attack(1970);
    ok(J(`!!battle.plr.monsters.left.tempDA`) === want, `#1970 with ${n} soul cards on field: ${want ? "gets" : "no"} [Double Attack]`);
  }
  // #1717 Curse Count: destroys a monster -> 1 damage; 4+ different Black Dragon monsters in drop -> 4 damage INSTEAD
  for (const [n, dmg] of [[3, 1], [4, 4]]) {
    setup(); run(`battle.plr.drop=pick(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>/^blackdragon$/i.test(a)), ${n}); battle.plr.monsters.left=mk(CARD_MAP.get(1717)); ABX.fireAttackOutcome('plr',[{unit:battle.plr.monsters.left}],'opp',{destroyedMonster:true,dealtDamage:false})`); await tick();
    ok(J(`battle.opp.life`) === 10 - dmg, `#1717 with ${n} different Black Dragon in drop: ${dmg} damage in total (life ${J(`battle.opp.life`)})`);
  }
  // #1438 Klarente: deals damage + 4 different Hero/Hundred Demons cards in drop -> destroy an opponent's item
  for (const [n, want] of [[3, false], [4, true]]) {
    setup(); run(`battle.plr.drop=pick(c=>(c.attrs||[]).some(a=>/^(hero|hundreddemons)$/i.test(a)), ${n}); battle.plr.item=mk(CARD_MAP.get(1438)); battle.opp.item=mk(ALL_CARDS.find(x=>x.type==='Item'&&x.id!==1438)); ABX.fireAttackOutcome('plr',[{unit:battle.plr.item}],'opp',{dealtDamage:true})`); await tick();
    ok(J(`!battle.opp.item`) === want, `#1438 with ${n} different Hero/Hundred Demons in drop: ${want ? "destroys" : "keeps"} the opponent's item`);
  }
  console.log(`\npass ${passed} fail ${failed}`);
  process.exit(failed ? 1 : 0);
})();
