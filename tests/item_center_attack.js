// node tests/item_center_attack.js - every Item "can attack even if <X> is on your center" can really attack with such a monster in the center (and not with another monster)
const { createEnv } = require("./headless.js");
const env = createEnv();
const res = JSON.parse(env.run(`(function(){
  globalThis.alert=function(){};
  const A=window.BUDDYFIGHT_CARDS, out={ok:[],bad:[],skip:[]};
  const fresh=()=>{ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; battle.turnCount=3;
    ['plr','opp'].forEach(sd=>{const f=battle.getFighter(sd);['left','center','right'].forEach(p=>f.monsters[p]=null);f.item=null;f.item2=null;f.gauge=[1,2,3,4,5,6];}); };
  const tryAtk=(item,mon)=>{ fresh(); const f=battle.plr; f.monsters.center={card:mon,rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0};
    f.item={card:item,rested:false,attacksLeft:1,soul:[],itemMode:'equip'}; battle.pendingAction=null; try{ battle.startAttackSelection('plr','item'); }catch(e){ return 'ERR '+e.message; } return !!(battle.pendingAction&&battle.pendingAction.type==='attack'); };
  const monsters=A.filter(c=>c.type==='Monster');
  A.filter(c=>c.type==='Item'&&/can attack even if/i.test(c.skill)).forEach(c=>{
    const m=/can attack even if ([^.!]*)[.!]/i.exec(c.skill)[1];
    if(/\\bif [^.!]*(?:this card|his card) can attack even if/i.test(c.skill)){ out.skip.push([c.id,c.name,'conditional: '+m]); return; }
    let pick=null;
    const t=/«([^»]+)»/.exec(m);
    if(t){ const re=new RegExp('^'+t[1].replace(/[.*+?^$()|[\\]\\\\]/g,'\\\\$&')+'$','i'); pick=monsters.find(x=>(x.attrs||[]).some(a=>re.test(a.trim()))); }
    else if(/size 3/.test(m)) pick=monsters.find(x=>x.size===3);
    else if(/wydar sarkal|oni assassin|godpunk/i.test(m)){ const nm=/(wydar sarkal|oni assassin|godpunk)/i.exec(m)[1]; pick=monsters.find(x=>(x.attrs||[]).some(a=>a.toLowerCase()===nm.toLowerCase())||x.name.toLowerCase().includes(nm.toLowerCase())); }
    else pick=A.find(x=>x.id===5159);
    if(!pick){ out.skip.push([c.id,c.name,m]); return; }
    const r=tryAtk(c,pick);
    (r===true?out.ok:out.bad).push([c.id,c.name,m,pick.id,r]);
  });
  return JSON.stringify(out);})()`));
console.log("ok", res.ok.length, "bad", res.bad.length, "skip", res.skip.length);
res.bad.forEach(x => console.log("FAIL", x.join(" | ")));
res.skip.forEach(x => console.log("SKIP", x.join(" | ")));
console.log("pass", res.ok.length, "fail", res.bad.length);
