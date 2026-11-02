// End-to-end checks: #3874 (equip: discard -> search "Sword of the King"), #3854 Magni (discard -> stand), #2762 Captain Answer (declare / mill / destroy), #4154 (Overturn-reduced call)
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => { const r = run(`JSON.stringify(${c})`); return (r === undefined || r === "undefined") ? undefined : JSON.parse(r); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log(ok ? "PASS" : "FAIL", n, ok ? "" : JSON.stringify(x ?? "")); };
const settle = async (n = 60) => { for (let i = 0; i < n; i++) { env.flush(); await new Promise(r => setTimeout(r, 3)); } };
run(`globalThis.mk=(id,soul)=>({card:CARD_MAP.get(id),rested:false,attacksLeft:1,soul:soul||[],tempPower:0,tempDef:0,tempCrit:0});
 globalThis.fresh=()=>{battle.start('hotseat',generateFlagDeck(447,'T',571,true),generateFlagDeck(447,'O',571,true));battle.renderBattle=function(){};battle.showCutin=function(){};ABX.autoPlay=true;ABX.fast=true;
  const p=battle.plr,e=battle.opp;["left","center","right"].forEach(z=>{p.monsters[z]=null;e.monsters[z]=null});p.item=null;p.hand=[];p.drop=[];p.gauge=Array(6).fill(46);battle.turnCount=6;battle.activeSide='plr';battle.phase='main';};`);
(async () => {
  // 3874
  const sword = J(`[...CARD_MAP.values()].find(c=>c.type==="Item"&&/sword of the king/i.test(c.name)&&c.id!==3874).id`);
  run(`fresh(); battle.plr.deck=[${sword},46,46,46,46]; battle.plr.hand=[149]; battle.plr.item=mk(3874); ABX.fireEquipped('plr',CARD_MAP.get(3874),battle.plr.item);`); await settle();
  ck("#3874: discarded a card and took a Sword of the King item", J(`battle.plr.hand.includes(${sword}) && battle.plr.drop.includes(149)`), J(`[battle.plr.hand,battle.plr.drop]`));
  // 3854
  run(`fresh(); battle.plr.monsters.center=mk(3854,[46]); battle.plr.monsters.center.rested=true; battle.plr.hand=[149];`);
  const can = J(`ABX.canUseAct('plr',CARD_MAP.get(3854),ABX.get(CARD_MAP.get(3854)).abilities.find(a=>a.kind==="act"),battle.plr.monsters.center)`);
  run(`ABX.useAct('plr',CARD_MAP.get(3854),battle.plr.monsters.center)`); await settle();
  ck("#3854: act is usable and costs a discard", can && can.ok !== false && J(`battle.plr.hand.length===0 && battle.plr.drop.includes(149)`), [can, J(`[battle.plr.hand,battle.plr.drop]`)]);
  ck("#3854: one of the two options resolved (stood, or protection set)", J(`battle.plr.monsters.center.rested===false || !!(battle.plr.monsters.center.abxSaveOnce||battle.plr.monsters.center.abxSave||battle.plr.monsters.center.abxNoDestroy)`), J(`Object.keys(battle.plr.monsters.center)`));
  // 2762
  const mon = J(`[...CARD_MAP.values()].find(c=>c.type==="Monster").id`);
  run(`fresh(); battle.plr.monsters.center=mk(2762); battle.opp.monsters.center=mk(149); battle.plr.deck=[${mon},${mon},${mon},${mon}]; globalThis.h0=battle.plr.hand.length; globalThis.d0=battle.plr.drop.length;`);
  run(`ABX.useAct('plr',CARD_MAP.get(2762),battle.plr.monsters.center)`); await settle();
  ck("#2762: milled the top card", J(`battle.plr.deck.length===3 && (battle.plr.drop.length===d0+1 || battle.plr.hand.length===h0+1)`), J(`[battle.plr.deck.length,battle.plr.drop.length,d0,battle.plr.hand.length,h0]`));
  const matched = J(`battle.plr.hand.length===h0+1`);
  ck("#2762: if declared type matched -> to hand and an opp monster destroyed (else drop and nothing)", matched ? J(`!battle.opp.monsters.center`) : J(`!!battle.opp.monsters.center`), matched);
  // 3854 option 2 through the real destroy path: first destruction is nullified, the second is not
  run(`fresh(); battle.plr.monsters.center=mk(3854); battle.plr.monsters.center.abxSaveOnceTurn=battle.turnCount; battle.destroyMonster('plr','center');`); await settle();
  ck("#3854 save: first destroy nullified", J(`!!battle.plr.monsters.center`));
  run(`battle.destroyMonster('plr','center');`); await settle(); ck("#3854 save: second destroy goes through", J(`!battle.plr.monsters.center`));
  // 4154: with Overturn used this game the Call Cost gauge is 3 lower
  const neo = J(`[...CARD_MAP.values()].find(c=>c.type==="Monster"&&(c.attrs||[]).some(a=>/^neodragon$/i.test(a))&&c.size<=2).id`);
  run(`fresh(); battle.phase='final'; battle.plr.monsters.center=mk(${neo}); battle.plr.drop=[46]; battle.plr.gauge=[46]; battle.plr.overturnUsed=false;`);
  const noOT = J(`battle.imCallInfo('plr',CARD_MAP.get(4154)).reasons`);
  run(`battle.plr.overturnUsed=true; battle.plr.overUsed={overturn:true}`); const OT = J(`battle.imCallInfo('plr',CARD_MAP.get(4154)).reasons`);
  ck("#4154: 1 gauge is not enough normally, enough after Overturn", noOT.some(r => /Needs 3 Gauge/.test(r)) && OT.length === 0, [noOT, OT]);
  // 5171: [Counter] from the soul of a monster -> call this card from the soul
  run(`fresh(); battle.plr.monsters.center=mk(149,[5171]); globalThis.host=battle.plr.monsters.center;`);
  const sa = J(`ABX.soulActs('plr',host).map(x=>x.card.id)`);
  ck("#5171: soul [Counter] is offered on its host", sa.includes(5171), sa);
  run(`(async()=>{const x=ABX.soulActs('plr',host).find(x=>x.card.id===5171); await ABX.useSoulAct('plr',host,x.card,x.ab)})()`); await settle();
  ck("#5171: called from the soul onto the field", J(`["left","right","center2"].some(z=>battle.plr.monsters[z]&&battle.plr.monsters[z].card.id===5171) && !host.soul.includes(5171)`), J(`[host.soul,Object.entries(battle.plr.monsters).map(([k,v])=>[k,v&&v.card.id])]`));
  console.log("pass", pass, "fail", fail); process.exit(fail ? 1 : 0);
})();
