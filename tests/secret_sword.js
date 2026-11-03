// node tests/secret_sword.js - Secret Sword soul-casts when attacked: #291 (power 5000+), #292 (link attack), #296 (Weapon)
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
const env = createEnv(); const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
const settle = async () => { for (let i = 0; i < 80; i++) { env.flush(); await new Promise(r => setTimeout(r, 2)); } };
env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.card=id=>window.BUDDYFIGHT_CARDS.find(c=>c.id===id);
globalThis.mk=(id)=>({card:card(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; ['plr','opp'].forEach(sd=>{const f=battle.getFighter(sd); ['left','center','right'].forEach(p=>f.monsters[p]=null); f.item=null;f.item2=null;f.life=10;f.setSpells=[];f.hand=[];f.drop=[];f.gauge=[1,2,3,4,5,6]}); };
globalThis.setSS=(id)=>{ battle.plr.setSpells=[Object.assign({},card(290),{soul:[id]})]; };
globalThis.go=(id,ev,unit)=>ABX.runAbility('plr',card(id),ABX.get(card(id)).abilities.find(a=>a.kind==='triggered'&&a.trigger&&a.trigger.event===ev),unit||null,{});
globalThis.big=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&c.power>=5000&&c.size<=3&&!c.skill);
globalThis.small=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&c.power<=3000&&c.size===1&&!c.skill);`);
(async () => {
  run(`fresh(); setSS(291); globalThis.a=mk(big.id); battle.opp.monsters.center=a; ABX.fireAttack('opp',[{zone:'center',unit:a}],'plr','center')`); await settle();
  ck("291: power 5000+ attacker -> cast from soul (impact in drop, gauge paid)", val(`return battle.plr.drop.includes(291)&&battle.plr.setSpells[0].soul.length===0`), val(`return [battle.plr.drop,battle.plr.setSpells[0].soul,battle.plr.gauge.length]`));
  run(`fresh(); setSS(291); globalThis.a=mk(small.id); battle.opp.monsters.center=a; ABX.fireAttack('opp',[{zone:'center',unit:a}],'plr','center')`); await settle();
  ck("291: weak attacker -> not cast", val(`return !battle.plr.drop.includes(291)`));
  run(`fresh(); setSS(292); globalThis.a=mk(small.id); globalThis.b=mk(small.id); battle.opp.monsters.center=a; battle.opp.monsters.left=b; ABX.fireAttack('opp',[{zone:'center',unit:a},{zone:'left',unit:b}],'plr','center')`); await settle();
  ck("292: link attack -> cast", val(`return battle.plr.drop.includes(292)`), val(`return battle.plr.drop`));
  run(`fresh(); setSS(292); globalThis.a=mk(small.id); battle.opp.monsters.center=a; ABX.fireAttack('opp',[{zone:'center',unit:a}],'plr','center')`); await settle();
  ck("292: single attack -> not cast", val(`return !battle.plr.drop.includes(292)`));
  run(`fresh(); setSS(296); globalThis.w=mk(46); battle.opp.item=w; ABX.fireAttack('opp',[{zone:'item',unit:w}],'plr','center')`); await settle();
  ck("296: Weapon attack -> cast", val(`return battle.plr.drop.includes(296)`), val(`return battle.plr.drop`));
  // #1351 Long-range Cannon
  run(`fresh(); globalThis.rideCard=window.BUDDYFIGHT_CARDS.find(c=>(c.skill||'').includes('[Ride]')&&c.type==='Monster'); battle.plr.item=mk(rideCard.id); battle.opp.monsters.center=mk(small.id); globalThis.CATf=()=>ABX.canAttackThrough('plr',battle.plr.item)`);
  ck("1351 before cast: Ride card cannot attack through", val(`return !CATf()`));
  run(`ABX.runAbility('plr',card(1351),ABX.get(card(1351)).abilities.find(a=>a.kind==='spell'),null,{})`); await settle();
  ck("1351 after cast: Ride card can attack through", val(`return CATf()`), val(`return [battle.plr.abxRideThrough,battle.turnCount,!!battle.plr.item]`));
  // #3242 Jester Dark Fox
  run(`fresh(); globalThis.adv=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Adventurer')&&c.id!==3242); globalThis.au=mk(adv.id); battle.plr.monsters.left=au; battle.plr.monsters.center=mk(3242); globalThis.fodder=mk(small.id); battle.plr.monsters.right=fodder; globalThis.tg=mk(small.id); tg.soul=[46]; battle.opp.monsters.center=tg; ABX.fireBattleEnd('plr',[{unit:au}])`); await settle();
  ck("3242: destroyed one of mine, dropped chosen's soul, destroyed chosen", val(`return !battle.opp.monsters.center&&battle.opp.drop.includes(46)&&[battle.plr.monsters.left,battle.plr.monsters.center,battle.plr.monsters.right].filter(Boolean).length===2`), val(`return [!!battle.opp.monsters.center,battle.opp.drop,[battle.plr.monsters.left,battle.plr.monsters.center,battle.plr.monsters.right].filter(Boolean).length]`));
  run(`fresh(); globalThis.au2=mk(small.id); battle.plr.monsters.left=au2; battle.plr.monsters.center=mk(3242); battle.opp.monsters.center=mk(small.id); ABX.fireBattleEnd('plr',[{unit:au2}])`); await settle();
  ck("3242: attacker is not Adventurer/Skull Warrior -> nothing", val(`return !!battle.opp.monsters.center`));
  // #5436 Red Mesh
  run(`fresh(); globalThis.ag=window.BUDDYFIGHT_CARDS.find(c=>c.type==='Monster'&&(c.attrs||[]).includes('Afterglow')); globalThis.agu=mk(ag.id); agu.soul=[5436]; battle.plr.monsters.center=agu; battle.opp.monsters.center=mk(small.id); ABX.fireBattleEnd('plr',[{unit:agu}])`); await settle();
  ck("5436: Afterglow attacker with Red Mesh in soul -> opp card destroyed", val(`return !battle.opp.monsters.center`));
  // #3664 Demongodol redirect
  run(`fresh(); globalThis.dg=mk(3664); battle.plr.monsters.right=dg; ABX.battleCtx={active:true}; ABX.runAbility('plr',card(3664),ABX.get(card(3664)).abilities.find(a=>a.kind==='triggered'&&a.trigger.event==='oppAttack'),dg,{event:{name:'attack'}})`); await settle();
  ck("3664: attack target redirected to Demongodol's area", val(`return ABX.battleCtx.redirectTo==='right'`), val(`return ABX.battleCtx`));
  run(`ABX.battleCtx=null`);
  // #1546 Mission Card soul fill
  run(`fresh(); battle.plr.setSpells=[Object.assign({},card(1546),{soul:[]})]; battle.plr.deck=[21,22]; ABX.runAbility('plr',battle.plr.setSpells[0],ABX.get(card(1546)).abilities.find(a=>a.kind==='triggered'),null,{})`); await settle();
  ck("1546: top deck card goes into the Mission Card's soul", val(`return battle.plr.setSpells[0].soul.length===1&&battle.plr.deck.length===1`), val(`return [battle.plr.setSpells[0].soul,battle.plr.deck.length]`));
  // #2014 Cerberus
  run(`fresh(); globalThis.cu=mk(2014); battle.plr.monsters.center=cu; globalThis.wpn=mk(window.BUDDYFIGHT_CARDS.find(c=>c.type==='Item'&&(c.attrs||[]).includes('Weapon')).id); wpn.rested=true; battle.plr.item=wpn; battle.plr.drop=[7,8]; ABX.fireBattleEnd('plr',[{unit:cu}])`); await settle();
  ck("2014: Weapon stood, Cerberus + a drop card are in its soul", val(`return !wpn.rested&&!battle.plr.monsters.center&&wpn.soul.includes(2014)&&wpn.soul.length===2&&battle.plr.drop.length===1`), val(`return [wpn.rested,wpn.soul,battle.plr.drop]`));
  // #3566 Phantom Getter
  run(`fresh(); battle.plr.setSpells=[card(3566)]; battle.opp.hand=[7,8,9]; battle.plr.hand=[]; battle.plr.deck=[21,22]; globalThis.u=mk(2783); battle.plr.monsters.center=u; battle.plr.deck=[21,22]; battle.opp.deck=[card(2783).id]; go(2783,'attackDestroys',u)`); await settle();
  ck("3566: Spectral Strike damage -> opp discards random card, I draw", val(`return battle.opp.hand.length===2&&battle.plr.hand.length>=1`), val(`return [battle.opp.hand.length,battle.plr.hand.length,battle.opp.life]`));
  // #5552 Promise of Rainbow
  run(`fresh(); battle.plr.deck=[5552,22,23]; battle.plr.hand=[]; ABX.OPS.tmill={run(s,ctx){ const f=battle.plr; f.drop.push(f.deck.shift()); return true; }}; ABX.core.runAbility('opp',card(2783),{kind:'spell',steps:[{op:'tmill'}]},null,{})`); await settle();
  ck("5552: milled by the opponent's effect -> returns to my hand", val(`return battle.plr.hand.includes(5552)&&!battle.plr.drop.includes(5552)`), val(`return [battle.plr.hand,battle.plr.drop]`));
  run(`fresh(); battle.plr.deck=[5552,22,23]; battle.plr.hand=[]; ABX.core.runAbility('plr',card(2783),{kind:'spell',steps:[{op:'tmill'}]},null,{})`); await settle();
  ck("5552: milled by my own effect -> stays in drop", val(`return battle.plr.drop.includes(5552)&&!battle.plr.hand.includes(5552)`));
  // #6445 KANESADA
  run(`fresh(); battle.plr.item=mk(6445); globalThis.a=mk(small.id); globalThis.b=mk(small.id); battle.opp.monsters.center=a; battle.opp.monsters.left=b; ABX.fireAttack('opp',[{zone:'center',unit:a},{zone:'left',unit:b}],'plr','fighter')`); await settle();
  ck("6445: link attack -> both attackers (def <= 15000) destroyed", val(`return !battle.opp.monsters.center&&!battle.opp.monsters.left`), val(`return [!!battle.opp.monsters.center,!!battle.opp.monsters.left]`));
  run(`fresh(); battle.plr.item=mk(6445); globalThis.a=mk(small.id); battle.opp.monsters.center=a; ABX.fireAttack('opp',[{zone:'center',unit:a}],'plr','fighter')`); await settle();
  ck("6445: single normal attack -> no counter", val(`return !!battle.opp.monsters.center`));
  run(`fresh(); battle.plr.item=mk(6445); globalThis.a=mk(small.id); a.card=Object.assign({},a.card,{da:true}); battle.opp.monsters.center=a; ABX.fireAttack('opp',[{zone:'center',unit:a}],'plr','fighter')`); await settle();
  ck("6445: Double Attack card -> counter destroys it", val(`return !battle.opp.monsters.center`), val(`return !!battle.opp.monsters.center`));
  run(`fresh(); battle.plr.item=mk(6445); globalThis.a=mk(small.id); globalThis.b=mk(small.id); b.card=Object.assign({},b.card,{defense:20000}); battle.opp.monsters.center=a; battle.opp.monsters.left=b; ABX.fireAttack('opp',[{zone:'center',unit:a},{zone:'left',unit:b}],'plr','fighter')`); await settle();
  ck("6445: only units weaker than 15000 are destroyed", val(`return !battle.opp.monsters.center&&!!battle.opp.monsters.left`), val(`return [!!battle.opp.monsters.center,!!battle.opp.monsters.left]`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
