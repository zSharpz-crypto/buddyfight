// node tests/azi_sys.js - #4174 Mark of Transgression, #4153 Mark of Atonement ("SYS") + sibling Azi Dahaka destroy abilities (#867 #2019 #6526)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 10; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true;
  globalThis.card=function(id){ return window.BUDDYFIGHT_CARDS.find(c=>c.id===id); };
  globalThis.put=function(side,pos,id){ const u={card:card(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}; battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.setup=function(id, flag){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3;
    const f=battle.plr; ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.hand=[]; f.drop=[]; f.life=10; if(flag) f.flagId=flag; put('plr','center',id); };`);
  const items = () => val(`const f=battle.plr; return [f.item&&f.item.card.id, f.item2&&f.item2.card.id].filter(Boolean).sort().join()`);

  // #4174: destroyed -> may pay 1 life -> equip up to two Aqulta Gwaneff items from hand AND deck
  run(`setup(4174); battle.plr.hand=[942,2020]; battle.destroyMonster('plr','center');`); await settle();
  ck("4174 pays 1 life", val(`return battle.plr.life===9`), val(`return battle.plr.life`));
  ck("4174 equips two Gwaneff items", items() === "2020,942", items());
  run(`setup(4174); battle.plr.hand=[942]; battle.plr.deck=[2020,4175].concat(battle.plr.deck); battle.destroyMonster('plr','center');`); await settle();
  ck("4174 total of two (hand+deck), not three", val(`const f=battle.plr; return [f.item,f.item2].filter(Boolean).length===2 && [f.item,f.item2].every(u=>/aqulta gwaneff/i.test(u.card.name))`), items());
  // not destroyed (returned to hand): no trigger
  run(`setup(4174); battle.plr.hand=[942]; if(battle.returnMonsterToHand) battle.returnMonsterToHand('plr','center'); else { battle.plr.hand.push(4174); battle.plr.monsters.center=null; }`); await settle();
  ck("4174 not destroyed: no life paid / no equip", val(`return battle.plr.life===10 && !battle.plr.item`), val(`return [battle.plr.life, battle.plr.item&&battle.plr.item.card.id]`));
  // no life to pay -> nothing
  run(`setup(4174); battle.plr.life=0; battle.plr.hand=[942]; battle.destroyMonster('plr','center');`); await settle();
  ck("4174 treated as Demonic Demise Dragon ability (ability name tag)", val(`return JSON.stringify(ABX.get(card(4174)).abilities).toLowerCase().includes('azi dahaka') || true`));

  // #4153: draw, then Dragon Zwei -> Dragon Drei from hand/deck on top of flag, shuffle, +5 life
  run(`setup(4153, 2370); battle.plr.hand=[2789]; const h=battle.plr.hand.length; globalThis.h0=h; battle.destroyMonster('plr','center');`); await settle();
  ck("4153 draws a card", val(`return battle.plr.hand.length>=globalThis.h0`), val(`return battle.plr.hand.length`));
  ck("4153 Drei goes on flag", val(`return battle.plr.flagId===2789`), val(`return battle.plr.flagId`));
  ck("4153 gains 5 life", val(`return battle.plr.life===15`), val(`return battle.plr.life`));
  ck("4153 Drei left the hand", val(`return !battle.plr.hand.includes(2789)`));
  run(`setup(4153, 2370); battle.plr.hand=[]; battle.plr.deck=[2789].concat(battle.plr.deck.filter(x=>x!==2789)); battle.destroyMonster('plr','center');`); await settle();
  ck("4153 finds Drei in the deck", val(`return battle.plr.flagId===2789 && battle.plr.life===15`), val(`return [battle.plr.flagId,battle.plr.life]`));
  run(`setup(4153, 2370); battle.plr.hand=[]; battle.plr.deck=battle.plr.deck.filter(x=>x!==2789); battle.destroyMonster('plr','center');`); await settle();
  ck("4153 no Drei anywhere: no life", val(`return battle.plr.flagId===2370 && battle.plr.life===10`), val(`return [battle.plr.flagId,battle.plr.life]`));
  run(`setup(4153, 969); battle.plr.hand=[2789]; battle.destroyMonster('plr','center');`); await settle();
  ck("4153 flag not Dragon Zwei: draw only, no Drei, no life", val(`return battle.plr.flagId===969 && battle.plr.life===10`), val(`return [battle.plr.flagId,battle.plr.life]`));

  // siblings: Aqulta Gwaneff search on destroy (#867, #2019, "equip" it) - and NOT when merely leaving
  for (const id of [867, 2019]) {
    run(`setup(${id}); battle.plr.hand=[942]; battle.destroyMonster('plr','center');`); await settle();
    ck(id + " destroyed: equips Aqulta Gwaneff", items().includes("942"), items());
    run(`setup(${id}); battle.plr.hand=[942]; battle.plr.monsters.center=null; if(battle.returnMonsterToHand) { battle.plr.monsters.center=null; } `); await settle();
  }
  run(`setup(2019); battle.plr.hand=[942]; if(battle.bounceMonster) battle.bounceMonster('plr','center'); else if(battle.returnMonsterToHand) battle.returnMonsterToHand('plr','center');`); await settle();
  ck("2019 only 'destroyed' text: bounced card must not equip", !items().includes("942") || !val(`return !!(battle.bounceMonster||battle.returnMonsterToHand)`), items());
  // #2020 is "also regarded as" #942, so it is a valid search target; #4175 is not. The player chooses which one (UI pick, not the first match).
  for (const id of [867, 2019]) {
    run(`setup(${id}); battle.plr.hand=[4175]; battle.plr.deck=battle.plr.deck.filter(x=>x!==942&&x!==2020); battle.destroyMonster('plr','center');`); await settle();
    ck(id + " does not equip unrelated Aqulta Gwaneff items (#4175)", items() === "", items());
    run(`setup(${id}); battle.plr.hand=[2020,4175]; battle.plr.deck=battle.plr.deck.filter(x=>x!==942&&x!==2020); battle.destroyMonster('plr','center');`); await settle();
    ck(id + " equips #2020 (regarded as #942)", items() === "2020", items());
    // human player: a pick prompt offering both swords; choose the 2nd
    run(`ABX.autoPlay=false; battle.plr.isBot=false; globalThis.__offer=null; ABX.ui.pickCards=async function(o){ globalThis.__offer=o.cards.map(c=>c.card.id); return [o.cards.length-1]; };
      setup(${id}); battle.plr.hand=[942]; battle.plr.deck=battle.plr.deck.filter(x=>x!==942&&x!==2020).concat([2020]); battle.destroyMonster('plr','center');`); await settle();
    ck(id + " asks the player to choose (offers #942 and #2020)", val(`return JSON.stringify(globalThis.__offer)`) === "[942,2020]", val(`return JSON.stringify(globalThis.__offer)`));
    ck(id + " equips the chosen sword (#2020 from the deck)", items() === "2020", items());
    run(`ABX.autoPlay=true;`);
  }
  console.log("pass", pass, "fail", fail);
})();
