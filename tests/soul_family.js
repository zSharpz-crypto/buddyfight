// node tests/soul_family.js - "this card's soul" family: #264 #2029 #2596 #3019 #3508 #6417
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " " + JSON.stringify(extra ?? ""))); };
const settle = async () => { for (let i = 0; i < 24; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.setup=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3; battle.matchOver=false;
   me.gauge=me.deck.splice(0,8); op.gauge=op.deck.splice(0,3); me.hand=[]; op.hand=[]; me.drop=[]; op.drop=[]; me.life=10; op.life=20; me.item=null; me.setSpells=[];
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null}); return me; };
 globalThis.abOf=(id,op)=>ABX.parseCard(CARD_MAP.get(id)).abilities.find(a=>(a.steps||[]).some(x=>x.op===op));
 globalThis.spellId=ALL_CARDS.find(c=>c.type==='Spell').id; globalThis.monId=1054;`);
(async () => {
  // #2029 enters on left -> one drop card into its soul; center -> nothing
  run(`{ const me=setup(); me.drop=[spellId]; me.monsters.left=mk(CARD_MAP.get(2029)); ABX.runAbility('plr',CARD_MAP.get(2029),abOf(2029,'r42SoulOps'),me.monsters.left,{auto:true}); }`); await settle();
  ck("2029 on the left: a drop-zone card goes into its soul", val(`return battle.plr.monsters.left.soul.length===1 && battle.plr.drop.length===0`), val(`return [battle.plr.monsters.left.soul, battle.plr.drop]`));
  run(`{ const me=setup(); me.drop=[spellId]; me.monsters.center=mk(CARD_MAP.get(2029)); ABX.runAbility('plr',CARD_MAP.get(2029),abOf(2029,'r42SoulOps'),me.monsters.center,{auto:true}); }`); await settle();
  ck("2029 in the center: nothing", val(`return battle.plr.monsters.center.soul.length===0 && battle.plr.drop.length===1`), 0);
  // #3019: look at top card -> soul or hand (auto = hand)
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3019)); globalThis.__d=me.deck.length; globalThis.__t=me.deck[0]; ABX.runAbility('plr',CARD_MAP.get(3019),abOf(3019,'r42SoulOps'),me.monsters.center,{auto:true}); }`); await settle();
  ck("3019: the top card leaves the deck (hand or soul)", val(`const m=battle.plr.monsters.center; return battle.plr.deck.length===__d-1 && (battle.plr.hand.includes(__t)||m.soul.length===1)`), val(`return [battle.plr.deck.length,__d,battle.plr.hand.length]`));
  // #3508: mill 3, then one of them into soul or hand
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(3508)); globalThis.__d=me.deck.length; ABX.runAbility('plr',CARD_MAP.get(3508),abOf(3508,'r42SoulOps'),me.monsters.center,{auto:true}); }`); await settle();
  ck("3508: 3 cards milled, one taken back (drop 2, hand/soul 1)", val(`const m=battle.plr.monsters.center; return battle.plr.deck.length===__d-3 && battle.plr.drop.length===2 && (battle.plr.hand.length+m.soul.length)===1`), val(`return [battle.plr.deck.length,__d,battle.plr.drop.length,battle.plr.hand.length]`));
  // #2596: pay souls >= critical of the chosen opposing card, then destroy it
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2596)); me.monsters.center.soul=[spellId,spellId,spellId]; battle.opp.monsters.center=mk(CARD_MAP.get(monId)); globalThis.__dk=me.deck.length; ABX.runAbility('plr',CARD_MAP.get(2596),abOf(2596,'r42SoulOps'),me.monsters.center,{auto:true}); }`); await settle();
  ck("2596: opposing monster destroyed, souls went to the bottom of the deck", val(`const n=3-battle.plr.monsters.center.soul.length; return !battle.opp.monsters.center && n>=1 && battle.plr.deck.length===__dk+n`), val(`return [!!battle.opp.monsters.center, battle.plr.monsters.center.soul.length, battle.plr.deck.length, __dk]`));
  run(`{ const me=setup(); me.monsters.center=mk(CARD_MAP.get(2596)); me.monsters.center.soul=[]; battle.opp.monsters.center=mk(CARD_MAP.get(monId)); ABX.runAbility('plr',CARD_MAP.get(2596),abOf(2596,'r42SoulOps'),me.monsters.center,{auto:true}); }`); await settle();
  ck("2596 without enough souls: nothing destroyed", val(`return !!battle.opp.monsters.center`), 0);
  // #264 Set spell: same size -> destroy entered monster + 2 damage, then destroy itself
  const sz = val(`return CARD_MAP.get(monId).size`);
  run(`{ const me=setup(); const sp=Object.assign({},CARD_MAP.get(264)); sp.soul=[monId]; me.setSpells=[sp]; const ent=mk(CARD_MAP.get(monId)); battle.opp.monsters.center=ent; globalThis.__sp=sp; ABX.runAbility('plr',sp,abOf(264,'r42SoulOps'),null,{auto:true,event:{name:'otherEnter',unit:ent,enterSide:'opp'}}); }`); await settle();
  ck("264 same size: monster destroyed, 2 damage, Set spell destroyed", val(`return !battle.opp.monsters.center && battle.opp.life===18 && battle.plr.setSpells.length===0`), val(`return [!!battle.opp.monsters.center, battle.opp.life, battle.plr.setSpells.length]`));
  const other = JSON.parse(run(`JSON.stringify(ALL_CARDS.find(c=>c.type==='Monster'&&c.size!==CARD_MAP.get(1054).size).id)`));
  run(`{ const me=setup(); const sp=Object.assign({},CARD_MAP.get(264)); sp.soul=[monId]; me.setSpells=[sp]; const ent=mk(CARD_MAP.get(${other})); battle.opp.monsters.center=ent; ABX.runAbility('plr',sp,abOf(264,'r42SoulOps'),null,{auto:true,event:{name:'otherEnter',unit:ent,enterSide:'opp'}}); }`); await settle();
  ck("264 different size: monster survives, no damage, Set spell still destroyed", val(`return !!battle.opp.monsters.center && battle.opp.life===20 && battle.plr.setSpells.length===0`), val(`return [!!battle.opp.monsters.center, battle.opp.life, battle.plr.setSpells.length]`));
  // #6417: a Weaponry from the deck into hand or soul
  const wp = JSON.parse(run(`JSON.stringify(ALL_CARDS.find(c=>(c.attrs||[]).includes('Weaponry')).id)`));
  run(`{ const me=setup(); me.item=mk(CARD_MAP.get(6417)); me.deck.unshift(${wp}); ABX.runAbility('plr',CARD_MAP.get(6417),abOf(6417,'r42SoulOps'),me.item,{auto:true}); }`); await settle();
  ck("6417: a Weaponry card left the deck for the hand or soul", val(`return battle.plr.hand.includes(${wp}) || battle.plr.item.soul.some(x=>(x.id||x)===${wp})`), val(`return [battle.plr.hand, battle.plr.item.soul]`));
  console.log("pass", pass, "fail", fail);
})();
