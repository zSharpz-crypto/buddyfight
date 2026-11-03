// node tests/battle_end_family.js - "At the end of the battle that X attacked": #2302 #3256 #4543 #5023 #5434 #5556
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 60; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id,soul)=>({card:card(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.put=function(side,pos,id,soul){ const u=mk(id,soul); battle.getFighter(side).monsters[pos]=u; return u; };
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
 ['plr','opp'].forEach(sd=>{ const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null; f.item2=null; f.setSpells=[]; f.hand=[1]; }); };
globalThis.mon=(re)=>window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).some(a=>re.test(a))&&![2302,3256,4543,5023,5556].includes(c.id));
globalThis.fire=(u)=>ABX.fireBattleEnd('plr',[{unit:u}]);`);
(async () => {
  // #5434 Pastel Palettes host with the spell in its soul -> 1 damage
  run(`fresh(); globalThis.h=put('plr','left',mon(/^pastelpalettes$/i).id,[5434]); put('opp','center',46); globalThis.l0=battle.opp.life;`);
  run(`fire(h)`); await settle();
  ck("5434 soul host attacked: 1 damage", val(`return battle.opp.life===l0-1`), val(`return [l0,battle.opp.life]`));
  run(`fresh(); globalThis.h=put('plr','left',mon(/^pastelpalettes$/i).id,[]); globalThis.o=put('plr','right',mon(/^pastelpalettes$/i).id,[5434]); globalThis.l0=battle.opp.life;`);
  run(`fire(h)`); await settle();
  ck("5434 other character attacked: no damage", val(`return battle.opp.life===l0`));
  // #5556 Adventurer with the card in its soul -> destroy an opp card
  run(`fresh(); globalThis.h=put('plr','left',mon(/^adventurer$/i).id,[5556]); put('opp','center',46);`);
  run(`fire(h)`); await settle();
  ck("5556 soul host attacked: opp monster destroyed", val(`return !battle.opp.monsters.center`));
  // #2302 Zodiac monster with the card in its soul -> Double Attack grant
  run(`fresh(); globalThis.z=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&/zodiac/i.test(c.name)&&c.id!==2302); globalThis.h=put('plr','left',z.id,[2302]); h.atkTurn=battle.turnCount; h.atkUsed=1; h.attacksLeft=0; h.rested=true;`);
  run(`fire(h)`); await settle();
  ck("2302 Zodiac host: can attack again", val(`return h.attacksLeft>=1&&!h.rested`), val(`return [h.attacksLeft,h.rested]`));
  // #3256 Superheroine attacked, 3256 on field -> it returns to hand
  run(`fresh(); put('plr','center',3256); globalThis.h=put('plr','left',mon(/^superheroine$/i).id); globalThis.hid=h.card.id; globalThis.n0=battle.plr.hand.length;`);
  run(`fire(h)`); await settle();
  ck("3256 Superheroine returned to hand", val(`return !battle.plr.monsters.left&&battle.plr.hand.length===n0+1`));
  // #4543 attacked, Electrodeity with souls on field -> Double Attack
  run(`fresh(); globalThis.s=put('plr','center',4543); s.atkTurn=battle.turnCount; s.atkUsed=1; s.attacksLeft=0; s.rested=true; put('plr','right',mon(/^electrodeity$/i).id,[46]);`);
  run(`fire(s)`); await settle();
  ck("4543 with souled Electrodeity: attacks again", val(`return s.attacksLeft>=1`));
  run(`fresh(); globalThis.s=put('plr','center',4543); s.atkTurn=battle.turnCount; s.atkUsed=1; s.attacksLeft=0; s.rested=true; put('plr','right',mon(/^electrodeity$/i).id,[]);`);
  run(`fire(s)`); await settle();
  ck("4543 without souls: no extra attack", val(`return s.attacksLeft===0`));
  // #5023 token
  run(`fresh(); globalThis.s=put('plr','center',5023); battle.plr.deck=[46,46,46];`);
  run(`fire(s)`); await settle();
  ck("5023 Dragod token on the field", val(`return ['left','right'].some(p=>battle.plr.monsters[p]&&/dragod/i.test(battle.plr.monsters[p].card.name))`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
