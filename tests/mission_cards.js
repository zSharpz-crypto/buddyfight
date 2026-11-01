// Mission Cards (Set spells): #213 "Defeat Monsters!", #1169 "THE Teamwork", #1415 "Aim for the Link!"
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 14; i++) { flush(); await wait(15); } };
run(`ABX.fast=true; ABX.autoPlay=true;`);
const setup = (id) => run(`(function(){
  const mon = ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill&&!(x.attrs||[]).includes('Adventurer'));
  battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(5957,'O',6065,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; battle.setPrompt=function(){};
  const me=battle.plr, op=battle.opp; ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null;});
  const mk=(c)=>({card:c,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  me.monsters.left=mk(CARD_MAP.get(225)); me.monsters.right=mk(CARD_MAP.get(225)); op.monsters.center=mk(mon);
  const sc=Object.assign({}, CARD_MAP.get(${id}), {soul:[]}); me.setSpells=[sc]; me.hand=[]; me.drop=[]; me.gauge=[]; me.life=10; op.life=10;
  battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6; ABX.watchFighters(); return 1; })()`);
const soulN = () => J(`battle.plr.setSpells.length ? battle.plr.setSpells[0].soul.length : -1`);
(async () => {
  // #213: opponent's monster destroyed by an attack of your Adventurer -> +1 soul; at 2 -> drop self, soul to hand
  setup(213); await tick();
  ok(soulN() === 0, "#213 nothing on set");
  run(`ABX.fireAttackOutcome('plr',[{unit:battle.plr.monsters.left,pos:'left'}],'opp',{destroyedMonster:true})`); await tick();
  ok(soulN() === 1, "#213 Adventurer destroys a monster: +1 soul");
  run(`ABX.fireAttackOutcome('plr',[{unit:battle.plr.monsters.left,pos:'left'}],'opp',{destroyedMonster:true}); ABX.watchFighters()`); await tick();
  ok(soulN() === -1 && J(`battle.plr.hand.length`) === 2 && J(`battle.plr.drop.includes(213)`), "#213 at 2 souls: card to drop, 2 cards to hand");
  // #1169: only a LINK attack by Adventurers, once per turn
  setup(1169); await tick();
  run(`ABX.fireAttack('plr',[{unit:battle.plr.monsters.left,pos:'left'}],'opp','center')`); await tick();
  ok(soulN() === 0, "#1169 single attack: nothing");
  run(`ABX.fireAttack('plr',[{unit:battle.plr.monsters.left,pos:'left'},{unit:battle.plr.monsters.right,pos:'right'}],'opp','center')`); await tick();
  ok(soulN() === 1, "#1169 link attack: +1 soul");
  run(`ABX.fireAttack('plr',[{unit:battle.plr.monsters.left,pos:'left'},{unit:battle.plr.monsters.right,pos:'right'}],'opp','center')`); await tick();
  ok(soulN() === 1, "#1169 once per turn");
  run(`battle.turnCount=7; ABX.fireAttack('plr',[{unit:battle.plr.monsters.left,pos:'left'},{unit:battle.plr.monsters.right,pos:'right'}],'opp','center')`); await tick();
  ok(soulN() === -1 && J(`battle.plr.hand.length`) === 1 && J(`battle.plr.gauge.length`) === 1 && J(`battle.plr.life`) === 11 && J(`battle.plr.drop.includes(1169)`), "#1169 at 2 souls: 1 to hand, rest to gauge, card to drop, +1 life");
  // #1415: each spell you cast -> +1 soul; at 3 -> drop self, destroy a card on opp field
  setup(1415); await tick();
  const spell = J(`ALL_CARDS.find(x=>x.type==='Spell'&&x.id!==1415).id`);
  for (let i = 0; i < 2; i++) { run(`ABX.fireCast('plr', CARD_MAP.get(${spell}))`); await tick(); }
  ok(soulN() === 2 && J(`!!battle.opp.monsters.center`), "#1415 two spells: 2 souls, nothing destroyed yet");
  run(`ABX.fireCast('plr', CARD_MAP.get(${spell}))`); await tick();
  ok(soulN() === -1 && J(`battle.plr.drop.includes(1415)`) && J(`!battle.opp.monsters.center`), "#1415 third spell: card dropped, opp card destroyed");
  console.log(`\npass ${passed} fail ${failed}`); process.exit(failed ? 1 : 0);
})();
