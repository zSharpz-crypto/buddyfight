// A card with «Dragod» in its attributes / tribe can be put in a deck of any world, up to 4 copies (even without the printed [Dragod] keyword).
const { createEnv } = require("./headless.js");
const env = createEnv(); const run = env.run; const J = (c) => JSON.parse(run(`JSON.stringify(${c})`));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL:", m); } else console.log("ok:", m); };
const r = J(`(()=>{
  const all=[...CARD_MAP.values()];
  const flags=[]; const seen=new Set();
  all.filter(c=>c.type==="Flag"&&c.id!==3941).forEach(c=>{ if(!seen.has(c.world)){ seen.add(c.world); flags.push(c); } });
  const dr=all.filter(c=>c.type!=="Flag"&&c.id!==3941&&(c.attrs||[]).some(a=>String(a).toLowerCase()==="dragod"));
  const bad=[];
  for(const f of flags) for(const c of dr){ const l=checkCardLegalityForFlag(c,f,false,null); if(!l.allowed||l.maxCopies!==4) bad.push(c.id+"@"+f.world+":"+l.allowed+"/"+l.maxCopies); }
  const magic=CARD_MAP.get(1);
  // control: a plain Dragon World monster with no Dragod attribute and no all-flags text is still blocked on a Magic World flag
  const ctl=all.find(c=>c.type==="Monster"&&c.world==="Dragon World"&&!c.omni&&!c.dragod&&!(c.attrs||[]).some(a=>/dragod/i.test(a))&&!/all flags/i.test(c.skill||"")&&!/dragon/i.test(JSON.stringify([c.name,c.attrs])));
  return { flags:flags.length, cards:dr.length, bad:bad.slice(0,8), badN:bad.length, ctl:ctl&&ctl.id, ctlAllowed:ctl&&checkCardLegalityForFlag(ctl,magic,false,null).allowed,
    s4281:checkCardLegalityForFlag(CARD_MAP.get(4281),magic,false,null), flagTypeBlocked: all.filter(c=>c.type==="Flag"&&(c.attrs||[]).some(a=>/dragod/i.test(a))).every(c=>!checkCardLegalityForFlag(c,magic,false,null).allowed) };
})()`);
console.log(`${r.cards} Dragod-attribute cards x ${r.flags} flag worlds`);
ok(r.badN === 0, `all allowed with max 4 copies, in every world (bad: ${JSON.stringify(r.bad)} of ${r.badN})`);
ok(r.s4281.allowed && r.s4281.maxCopies === 4 && r.s4281.isDragod === true, "#4281 Gargantua Dragon 'Sonic Mode' marked as Dragod, 4 copies");
ok(r.ctl && r.ctlAllowed === false, `control #${r.ctl}: a plain off-world monster is still blocked`);
ok(r.flagTypeBlocked, "Flag cards that mention Dragod still cannot go in the deck");
process.exit(fail ? 1 : 0);
