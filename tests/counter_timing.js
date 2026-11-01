// Counter-timing cards: #124 Duel Law, #176 Demongodol Ark, #311 Yukishiro, #5741 Messiah Arms Siegsabre
const { createEnv } = require("./headless");
const env = createEnv();
const { run, flush } = env;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log("  PASS: " + m); } else { failed++; console.error("  FAIL: " + m); } };
const J = (js) => JSON.parse(run(`JSON.stringify(${js})`));
const tick = async () => { for (let i = 0; i < 14; i++) { flush(); await wait(15); } };
run(`ABX.fast=true; ABX.autoPlay=true;`);
// defender = battle.opp (has the card), attacker = battle.plr
const base = (js) => run(`(function(){
  const mon = ALL_CARDS.find(x=>x.type==='Monster'&&x.size===1&&!x.skill);
  battle.start('hotseat', generateFlagDeck(5957,'T',6065,false), generateFlagDeck(5957,'O',6065,false)); battle.renderBattle=function(){}; battle.showCutin=function(){}; battle.setPrompt=function(){};
  const att=battle.plr, def=battle.opp; ['left','center','right'].forEach(p=>{att.monsters[p]=null;def.monsters[p]=null;});
  att.item=null; def.item=null; def.setSpells=[]; def.hand=[]; def.gauge=def.deck.splice(0,3); att.gauge=att.deck.splice(0,3); att.drop=[]; def.drop=[];
  const mk=(c)=>({card:c,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  battle.turn='plr'; battle.activeSide='plr'; battle.phase='attack'; battle.turnCount=6;
  ${js}; return 1; })()`);
const defOpts = () => J(`battle.getAvailableDefenseCards('opp',false,'fighter',[battle.plr.monsters.center||battle.plr.item]).filter(x=>x.fieldKey).map(x=>x.card.id)`);
(async () => {
  // #5741: Dragon-attribute card attacks you alone
  const dragon = J(`ALL_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).some(a=>/dragon/i.test(a))&&!x.skill).id`);
  base(`def.item=mk(CARD_MAP.get(5741)); att.monsters.center=mk(CARD_MAP.get(${dragon}));`);
  ok(defOpts().includes(5741), "#5741 offered vs a Dragon attacking alone");
  base(`def.item=mk(CARD_MAP.get(5741)); att.monsters.center=mk(mon);`);
  ok(!defOpts().includes(5741), "#5741 not offered vs a non-Dragon");
  // #176: Weapon attacks
  const weapon = J(`ALL_CARDS.find(x=>x.type==='Item'&&(x.attrs||[]).includes('Weapon')&&!x.skill).id`);
  base(`def.monsters.center=mk(CARD_MAP.get(176)); def.hand=[mon.id,mon.id]; att.item=mk(CARD_MAP.get(${weapon}));`);
  ok(defOpts().includes(176), "#176 offered vs a Weapon attack with a card in hand");
  base(`def.monsters.center=mk(CARD_MAP.get(176)); def.hand=[mon.id]; att.monsters.center=mk(mon);`);
  ok(!defOpts().includes(176), "#176 not offered vs a non-Weapon attack");
  base(`def.monsters.center=mk(CARD_MAP.get(176)); def.hand=[]; att.item=mk(CARD_MAP.get(${weapon}));`);
  ok(!defOpts().includes(176), "#176 not offered with an empty hand");
  // #311: opponent casts a spell on their main phase
  const spell = J(`ALL_CARDS.find(x=>x.type==='Spell'&&!x.set&&!x.cnt).id`);
  base(`def.monsters.left=mk(CARD_MAP.get(311)); battle.phase='main';`);
  const optsMain = J(`ABX.responseOptions('opp', CARD_MAP.get(${spell}), 'spell').map(o=>o.card.id)`);
  ok(optsMain.includes(311), "#311 offered when the opponent casts a spell in their main phase");
  base(`def.monsters.left=mk(CARD_MAP.get(311)); battle.phase='main'; def.gauge=[];`);
  ok(!J(`ABX.responseOptions('opp', CARD_MAP.get(${spell}), 'spell').map(o=>o.card.id)`).includes(311), "#311 not offered without gauge");
  base(`def.monsters.left=mk(CARD_MAP.get(311)); battle.phase='main';`);
  const g0 = J(`battle.opp.gauge.length`);
  run(`(async()=>{ ABX.castCtx=null; globalThis.__r = await ABX.castWindow('plr', CARD_MAP.get(${spell}), 'spell'); })()`); await tick();
  ok(J(`globalThis.__r`) === true && !J(`!!battle.opp.monsters.left`) && J(`battle.opp.drop.includes(311)`) && J(`battle.opp.gauge.length`) === g0 - 1, "#311 nullifies the spell, goes to drop, pays 1 gauge");
  // #124 Duel Law: link attack on a Duel Dragon costs 2 gauge
  const duel = J(`ALL_CARDS.find(x=>x.type==='Monster'&&(x.attrs||[]).includes('DuelDragon')&&!x.skill).id`);
  const tax = (extra) => { base(`def.setSpells=[Object.assign({},CARD_MAP.get(124),{soul:[]})]; def.monsters.center=mk(CARD_MAP.get(${duel})); att.monsters.left=mk(mon); att.monsters.right=mk(mon); ${extra}`);
    return J(`ABX.core.attackTax('plr',[battle.plr.monsters.left,battle.plr.monsters.right],'opp','center')`); };
  let r = tax(``);
  ok(r && !r.blocked && J(`battle.plr.gauge.length`) === 1, "#124 link attack on a Duel Dragon: attacker pays 2 gauge");
  r = tax(`att.gauge=att.gauge.slice(0,1);`);
  ok(r && r.blocked, "#124 cannot pay 2 gauge: attack does not go through");
  base(`def.setSpells=[Object.assign({},CARD_MAP.get(124),{soul:[]})]; def.monsters.center=mk(CARD_MAP.get(${duel})); att.monsters.left=mk(mon);`);
  ok(J(`ABX.core.attackTax('plr',[battle.plr.monsters.left],'opp','center')`) === null, "#124 single attack: no tax");
  console.log(`\npass ${passed} fail ${failed}`); process.exit(failed ? 1 : 0);
})();
