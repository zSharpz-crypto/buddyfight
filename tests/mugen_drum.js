// #6199 Apical Fifth Omni Dragon Lord, Mugen Drum: call cost, "when you are dealt damage" destroy, link attack with the item,
// "Unbreakable Bond". Bug found: an item with a continuous damage reduction (#448 Dragokeeper) reduced damage while it only sat in the soul.
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const run = (c) => env.run('{' + c + '\n}');
  const settle = async () => { for (let i = 0; i < 80; i++) { await new Promise(r => setImmediate(r)); env.flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true; globalThis.alert=function(m){ globalThis.__alert=m; }; globalThis.__n=920000;
  globalThis.mkc=function(type,extra){ const id=++__n; const c=Object.assign({id,name:'B'+id,type,skill:'',cost:'',attrs:[],worlds:[],world:'Dragon World',img:'',size:1,power:5000,defense:5000,crit:1},extra||{}); CARD_MAP.set(id,c); return c; };
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3; battle.pendingAction=null; };
  globalThis.mku=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
  globalThis.setup=function(soul){ fresh(); const f=battle.plr, e=battle.opp; ['left','center','right'].forEach(p=>{f.monsters[p]=null;e.monsters[p]=null;}); f.item=null; e.item=null;
    f.monsters.left=mku(6199); f.monsters.left.soul=soul; e.monsters.center=mku(447); e.monsters.right=mku(571); globalThis.__mu=f.monsters.left; battle.activeSide='opp'; };
  globalThis.zap=function(n){ globalThis.__sp=mkc('Spell',{name:'Zap',skill:'Deal '+n+' damage to your opponent.'}); ABX.fireSpell('opp',__sp); };`);
  const oppField = () => run(`Object.keys(battle.opp.monsters).filter(k=>battle.opp.monsters[k]).join(',')`);

  // call cost
  run(`fresh(); const f=battle.plr; ['left','center','right'].forEach(p=>f.monsters[p]=null); f.gauge=[1,2,3,4,5]; f.hand=[6199]; globalThis.__top=f.deck.slice(0,2); battle.startMonsterCall('plr',0,false); battle.onZoneClick('plr','left');`); await settle();
  ck("call cost: 2 gauge paid, top two cards into the soul", run(`battle.plr.gauge.length===3 && JSON.stringify(battle.plr.monsters.left.soul)===JSON.stringify(__top)`), run(`JSON.stringify([battle.plr.gauge.length, battle.plr.monsters.left && battle.plr.monsters.left.soul, __top])`));

  // dealt damage -> destroy up to one card
  run(`setup([mkc('Monster').id,mkc('Monster').id]); battle.plr.life=8; zap(2);`); await settle();
  ck("dealt effect damage: life 6 and one opponent card destroyed", run(`battle.plr.life`) === 6 && oppField().split(',').length === 1, [run(`battle.plr.life`), oppField()]);

  // soul item with a static damage reduction must not work from the soul
  run(`setup([448, mkc('Monster').id]); battle.plr.life=8; zap(2);`); await settle();
  ck("Dragokeeper in the soul does NOT reduce damage", run(`battle.plr.life`) === 6, run(`battle.plr.life`));
  // ...but equipped on the field it still does
  run(`setup([mkc('Monster').id]); battle.plr.item=mku(448); battle.plr.life=8; zap(2);`); await settle();
  ck("Dragokeeper equipped still reduces effect damage by 1", run(`battle.plr.life`) === 7, run(`battle.plr.life`));
  // a real soul-scoped shield (#6312: in the soul of a «Wild Dragon» monster) keeps working
  run(`setup([mkc('Monster').id]); const host=mkc('Monster',{name:'Wild Host',attrs:['WildDragon']}); battle.plr.monsters.center=mku(host.id); battle.plr.monsters.center.soul=[6312]; battle.plr.life=8; zap(2);`); await settle();
  const base = run(`battle.plr.life`);
  run(`setup([mkc('Monster').id]); const host=mkc('Monster',{name:'Wild Host',attrs:['WildDragon']}); battle.plr.monsters.center=mku(host.id); battle.plr.monsters.center.soul=[mkc('Monster').id]; battle.plr.life=8; zap(2);`); await settle();
  ck("soul-scoped shield (#6312 in a Wild Dragon's soul) still applies", base > run(`battle.plr.life`), [base, run(`battle.plr.life`)]);

  // Unbreakable Bond
  run(`setup([mkc('Monster').id,mkc('Monster').id]); battle.plr.life=2; zap(5);`); await settle();
  ck("Unbreakable Bond: lethal damage -> drop one soul, life becomes 1", run(`battle.plr.life===1 && !battle.matchOver && __mu.soul.length===1 && battle.plr.drop.length>0`), run(`JSON.stringify([battle.plr.life, __mu.soul.length])`));
  run(`setup([]); battle.plr.life=2; zap(5);`); await settle();
  ck("Unbreakable Bond: no soul -> cannot be used", run(`battle.plr.life<=0 && battle.matchOver`), run(`JSON.stringify([battle.plr.life, battle.matchOver])`));

  // link attack with the item: cannot be nullified, damage cannot be reduced
  run(`setup([mkc('Monster').id]); const f=battle.plr, e=battle.opp; f.item=mku(4567); f.life=8; e.life=8; e.tempDamageReduce=3; f.monsters.left.attacksLeft=1; battle.activeSide='plr'; battle.phase='attack'; globalThis.__e0=e.life; battle.executeAttackResolution('plr',['left','item'],'fighter',false);`); await settle();
  ck("link attack with the item: damage cannot be reduced (3+1 crit goes through)", run(`__e0-battle.opp.life`) === 4, run(`__e0-battle.opp.life`));
  run(`setup([mkc('Monster').id]); const f=battle.plr, e=battle.opp; f.life=8; e.life=8; e.tempDamageReduce=3; f.monsters.left.attacksLeft=1; battle.activeSide='plr'; battle.phase='attack'; globalThis.__e0=e.life; battle.executeAttackResolution('plr',['left'],'fighter',false);`); await settle();
  ck("solo attack: the reduction still applies", run(`__e0-battle.opp.life`) === 0, run(`__e0-battle.opp.life`));
  console.log(`pass ${pass} fail ${fail}`); process.exit(fail ? 1 : 0);
})();
