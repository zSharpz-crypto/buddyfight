// #5474 Idol With Glasses, Haruna Kamijo
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async (n = 40) => { for (let i = 0; i < n; i++) { env.flush(); await new Promise(r => setTimeout(r, 3)); } };
run(`globalThis.mk=(id)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};battle.showCutin=function(){};ABX.autoPlay=true;ABX.fast=true;["left","center","right"].forEach(z=>{battle.plr.monsters[z]=null;battle.opp.monsters[z]=null});battle.plr.item=null;battle.turnCount=6;battle.activeSide='plr';battle.phase='main';};`);
(async () => {
  const idols = J(`[...new Map([...CARD_MAP.values()].filter(c=>c.type==="Monster"&&(c.attrs||[]).some(a=>/^idol$/i.test(a))&&c.id!==5474).map(c=>[c.name,c.id])).values()].slice(0,3)`);
  run(`fresh(); battle.plr.monsters.center=mk(5474)`); const c0 = J(`ABX.staticBonus(battle.plr,battle.plr.monsters.center).crit`);
  ck("alone: Glasses count 1 -> crit+1", c0 === 1, c0);
  run(`battle.plr.monsters.left=mk(${idols[0]}); battle.opp.monsters.center=mk(149)`); ck("3 characters on the field -> crit+3 (opponent's included)", J(`ABX.staticBonus(battle.plr,battle.plr.monsters.center).crit`) === 3);
  // life at the start of the attack phase: 3 different Idols -> +1 life per character
  run(`fresh(); battle.plr.monsters.center=mk(5474); battle.plr.monsters.left=mk(${idols[0]}); battle.plr.monsters.right=mk(${idols[1]}); battle.plr.life=5; globalThis.fl=ABX.get(CARD_MAP.get(5474)).abilities.find(a=>a.kind==="triggered");`);
  run(`ABX.core.runAbility ? 0 : 0`);
  const ctx = J(`(()=>{const ab=fl; const ctx={side:'plr',f:battle.plr,e:battle.opp,card:CARD_MAP.get(5474),unit:battle.plr.monsters.center,bind:{},auto:true}; return OPS_OK=typeof ABX.OPS.r42GlassesLife.run(ab.steps[0],ctx)})()`);
  ck("only 2 different Idol (5474 + 2 others = 3)", J(`battle.plr.life`) === 8, J(`battle.plr.life`));
  run(`fresh(); battle.plr.monsters.center=mk(5474); battle.plr.monsters.left=mk(${idols[0]}); battle.plr.life=5; ABX.OPS.r42GlassesLife.run({}, {side:'plr',f:battle.plr,e:battle.opp,card:CARD_MAP.get(5474),unit:battle.plr.monsters.center,bind:{}})`);
  ck("fewer than 3 different Idol: no life", J(`battle.plr.life`) === 5, J(`battle.plr.life`));
  ck("trigger is a phaseStart trigger using the custom op", J(`fl.trigger.event==="phaseStart" && fl.steps[0].op==="r42GlassesLife"`));
  // #2079 Tigarion: gains the critical of the card you are [Ride] on
  const rid = J(`[...CARD_MAP.values()].find(c=>c.ride&&(c.crit||1)>=1).id`);
  run(`fresh(); battle.plr.monsters.center=mk(2079); battle.plr.item=mk(${rid}); battle.plr.item.itemMode="ride"; globalThis.rc=getUnitEffectiveCombatStats(battle.plr,battle.plr.item).crit; globalThis.c0=ABX.staticBonus(battle.plr,battle.plr.monsters.center).crit`);
  ck("#2079: +critical of the Ride card", J(`c0===rc`), J(`[c0,rc]`));
  run(`battle.plr.item=null`); ck("#2079: not Ride -> no bonus", J(`ABX.staticBonus(battle.plr,battle.plr.monsters.center).crit`) === 0);
  // #2520: with it as buddy and a Hero World flag, impact monsters from other worlds are legal
  const foreignIm = J(`(()=>{const f=CARD_MAP.get(840);const c=[...CARD_MAP.values()].find(c=>IMX.isImpactMonster(c)&&!(c.worlds||[]).includes("Hero World")&&!checkCardLegalityForFlag(c,f,false,null).allowed);return c&&c.id})()`);
  ck("#2520 fixture: impact monster outside Hero World, illegal normally", !!foreignIm, foreignIm);
  if (foreignIm) {
    ck("#2520: legal with buddy 2520 + Hero World flag", J(`checkCardLegalityForFlag(CARD_MAP.get(${foreignIm}),CARD_MAP.get(840),false,2520).allowed`) === true);
    ck("#2520: other buddy -> still illegal", J(`!checkCardLegalityForFlag(CARD_MAP.get(${foreignIm}),CARD_MAP.get(840),false,5).allowed`));
    ck("#2520: other flag -> buddy changes nothing", J(`checkCardLegalityForFlag(CARD_MAP.get(${foreignIm}),CARD_MAP.get(447),false,2520).allowed===checkCardLegalityForFlag(CARD_MAP.get(${foreignIm}),CARD_MAP.get(447),false,null).allowed`));
  }
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
