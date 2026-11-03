// node tests/probe.js <id> [id...]  - dev probe: calls (monster) or casts (spell) the card on a rich board and prints what changed. Not an assertion test.
const { createEnv } = require("./headless.js");
const { run, flush } = createEnv();
const val = (js) => JSON.parse(run(`JSON.stringify((function(){${js}})())`));
const settle = async () => { for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 3)); flush(); } };
run(`ABX.fast=true; ABX.autoPlay=true; window.alert=function(){};
 globalThis.mk=(card)=>({card,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.snap=function(){ const s=(f)=>({life:f.life,hand:f.hand.slice(),gauge:f.gauge.length,drop:f.drop.slice(),deck:f.deck.length,field:['left','center','right'].map(p=>f.monsters[p]&&f.monsters[p].card.id).filter(Boolean),item:f.item&&f.item.card.id,souls:['left','center','right'].map(p=>f.monsters[p]&&f.monsters[p].soul.length)}); return {me:s(battle.plr),op:s(battle.opp)}; };
 globalThis.board=function(id){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){};
   const me=battle.plr, op=battle.opp; battle.activeSide='plr'; battle.turn='plr'; battle.phase='main'; battle.turnCount=3;
   const mons=ALL_CARDS.filter(c=>c.type==='Monster'&&!c.skill&&c.size<=1).slice(0,6).map(c=>c.id);
   me.gauge=me.deck.splice(0,7); op.gauge=op.deck.splice(0,3); me.life=10; op.life=10;
   me.hand=[id].concat(mons.slice(0,3)); me.drop=mons.slice(3,6).concat(me.deck.splice(0,4)); op.hand=op.deck.splice(0,3); op.drop=[];
   ['left','center','right'].forEach(p=>{me.monsters[p]=null;op.monsters[p]=null});
   op.monsters.left=mk(CARD_MAP.get(mons[0])); op.monsters.center=mk(CARD_MAP.get(mons[1])); me.monsters.left=mk(CARD_MAP.get(mons[2])); return me; };`);
(async () => {
  for (const id of process.argv.slice(2).map(Number)) {
    const c = JSON.parse(run(`JSON.stringify(CARD_MAP.get(${id}))`));
    console.log(`\n#${id} ${c.type} ${c.name}\n  ${String(c.skill||"").replace(/\s+/g," ").slice(0,420)}`);
    run(`{ board(${id}); globalThis.__s0=snap(); }`);
    try {
      if (c.type === "Monster") run(`battle.completeMonsterCall('plr','center',0,false,false)`);
      else if (c.type === "Spell") run(`battle.castSpellFromHand('plr',0)`);
      else { console.log("  (skipped: " + c.type + ")"); continue; }
    } catch (e) { console.log("  ERR", e.message); continue; }
    await settle();
    const d = val(`const a=__s0, b=snap(), out=[]; for (const side of ['me','op']) { const x=a[side], y=b[side]; if (x.life!==y.life) out.push(side+' life '+x.life+'->'+y.life); if (x.gauge!==y.gauge) out.push(side+' gauge '+x.gauge+'->'+y.gauge); if (x.deck!==y.deck) out.push(side+' deck '+x.deck+'->'+y.deck); const add=(n,A,B)=>{ const ad=B.filter(i=>!A.includes(i)), rm=A.filter(i=>!B.includes(i)); if (ad.length||rm.length) out.push(side+' '+n+' +['+ad+'] -['+rm+']'); }; add('hand',x.hand,y.hand); add('drop',x.drop,y.drop); add('field',x.field,y.field); if (x.item!==y.item) out.push(side+' item '+x.item+'->'+y.item); if (String(x.souls)!==String(y.souls)) out.push(side+' souls '+x.souls+'->'+y.souls); } return out;`);
    console.log("  =>", d.length ? d.join(" | ") : "(nothing changed)");
  }
})();
