// node tests/armordeity.js - #1220 Armordeity, Dynamis / #3115 Armordeity, Energeia
const { createEnv } = require("./headless.js");
let pass = 0, fail = 0;
const ck = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(extra ?? "")); };
(async () => {
  const env = createEnv(); const { flush } = env; const run = (c) => env.run('{' + c + '\n}'); const val = (c) => env.run('(function(){' + c + '\n})()');
  const settle = async () => { for (let i = 0; i < 8; i++) { await new Promise(r => setImmediate(r)); flush(); } };
  env.run(`ABX.fast=true; ABX.autoPlay=true;
  globalThis.fresh=function(){ battle.start('hotseat', generateFlagDeck(447,'T',571,true), generateFlagDeck(447,'O',571,true)); battle.renderBattle=function(){}; battle.activeSide='plr'; battle.phase='main'; };
  globalThis.card=function(id){ return window.BUDDYFIGHT_CARDS.find(c=>c.id===id); };`);
  for (const id of [1220, 3115]) {
    ck(id + " parses with no unparsed text", val(`return ABX.parseCard(card(${id})).abilities.every(a=>!a.unparsed||a.unparsed.length===0)`), val(`return JSON.stringify(ABX.parseCard(card(${id})).abilities.map(a=>a.unparsed))`));
    ck(id + " has Move/Double Attack/Soulguard", val(`const k=card(${id}).kw||[]; return ['Move','Double Attack','Soulguard'].every(x=>k.includes(x))`));
  }
  // behaviour: "cannot attack the left or right" is enforced by the attack declaration
  env.run(`globalThis.put=function(side,pos,id){ const u={card:card(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0}; battle.getFighter(side).monsters[pos]=u; return u; };
  globalThis.setup=function(id){ fresh(); ['plr','opp'].forEach(sd=>['left','center','right'].forEach(p=>battle.getFighter(sd).monsters[p]=null)); put('plr','left',id); put('opp','left',5159); put('opp','right',5159); put('opp','center',5159); battle.phase='attack'; battle.turnCount=3; battle.turn1AttackUsed=false; };`);
  for (const id of [1220, 3115]) {
    for (const pos of ['left', 'right']) {
      run(`setup(${id}); battle.initiateAttackWithDefenseCheck('plr',['left'],'${pos}');`); await settle();
      ck(id + " cannot attack opp " + pos, val(`return !battle.pendingDefense && !battle.defenseCtx && !battle.attackInProgress && battle.getFighter('opp').monsters.${pos}.card.id===5159 && !battle.plr.monsters.left.rested`), val(`return Object.keys(battle).filter(k=>/defen|attack/i.test(k)&&battle[k]&&typeof battle[k]!=='function').join()`));
    }
    ck(id + " can attack opp center", val(`setup(${id}); return !ABX.core.noAttackPosBlocked(battle.plr.monsters.left,'center')`));
    ck(id + " blocked on left/right (helper)", val(`setup(${id}); const u=battle.plr.monsters.left; return !!ABX.core.noAttackPosBlocked(u,'left') && !!ABX.core.noAttackPosBlocked(u,'right')`));
    ck(id + " nullified: may attack left again", val(`setup(${id}); const u=battle.plr.monsters.left; u.abxNullified=battle.turnCount; return !ABX.core.noAttackPosBlocked(u,'left')`));
  }
  ck("a normal monster is not restricted", val(`setup(5159); return !ABX.core.noAttackPosBlocked(battle.plr.monsters.left,'left')`));
  //console.log(val(`return JSON.stringify(ABX.parseCard(card(1220)).abilities).slice(0,900)`));
  //console.log(val(`return JSON.stringify(ABX.parseCard(card(3115)).abilities).slice(0,1500)`));
  console.log("pass", pass, "fail", fail);
})();
