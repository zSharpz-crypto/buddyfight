// Bot-vs-bot full-game simulator (a tool, not a regression test): node tests/sim_full_game.js [games] [maxTurns]
// Both fighters are bots; the active fighter is swapped into the 'opp' slot so runBotTurn plays both sides with the same logic.
const { createEnv } = require("./headless.js");
const games = Number(process.argv[2] || 6), maxTurns = Number(process.argv[3] || 60);
const FLAGS = [447, 840, 2370, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(Boolean);
(async () => {
  const sum = { done: 0, stalled: 0, errors: 0, turns: [] }; const errs = new Map();
  for (let g = 0; g < games; g++) {
    const env = createEnv(); const run = env.run;
    const fa = FLAGS[g % FLAGS.length], fb = FLAGS[(g * 5 + 3) % FLAGS.length];
    const errors = [];
    run(`globalThis.__errs=[]; const _ce=console.error; console.error=function(){ __errs.push([].slice.call(arguments).map(String).join(" ").slice(0,300)); };`);
    let ok = true;
    try {
      run(`battle.start('bot', generateFlagDeck(${fa},'A',${700 + g},true), generateFlagDeck(${fb},'B',${900 + g},true)); battle.renderBattle=function(){}; battle.showCutin=function(){}; ABX.autoPlay=true; ABX.fast=true; battle.plr.isBot=true; battle.opp.isBot=true;`);
    } catch (e) { console.log(`game ${g}: start failed: ${e.message}`); sum.errors++; continue; }
    let turns = 0, lastSig = "", same = 0, result = "running";
    for (let step = 0; step < 4000 && turns < maxTurns; step++) {
      env.flush(); await new Promise(r => setImmediate(r));
      const st = JSON.parse(run(`JSON.stringify({over:!!battle.matchOver, side:battle.activeSide, turn:battle.turnCount, phase:battle.phase, pl:battle.plr.life, ol:battle.opp.life, pn:battle.plr.name, on:battle.opp.name})`));
      if (st.over) { result = "over"; break; }
      const sig = [st.side, st.turn, st.phase, st.pl, st.ol].join("|");
      if (sig === lastSig) { if (++same > 60) { result = "stalled"; break; } } else { same = 0; lastSig = sig; if (st.turn > turns) turns = st.turn; }
      if (same === 0 || same === 1) {
        // make the active fighter the 'opp' slot and let the bot play
        if (st.side === "plr") run(`(function(){const a=battle.plr,b=battle.opp; battle.plr=b; battle.opp=a; battle.activeSide='opp';})()`);
        try { run(`battle.runBotTurn()`); } catch (e) { errors.push("runBotTurn: " + e.message.slice(0, 200)); }
      }
    }
    const fin = JSON.parse(run(`JSON.stringify({over:!!battle.matchOver, turn:battle.turnCount, pl:battle.plr.life, ol:battle.opp.life, pn:battle.plr.name, on:battle.opp.name})`));
    const terr = JSON.parse(run(`JSON.stringify((globalThis.__errs||[]).concat(typeof __timerErrors!=='undefined'?__timerErrors.map(String):[]))`));
    const all = errors.concat(terr);
    all.forEach(e => errs.set(e.slice(0, 160), (errs.get(e.slice(0, 160)) || 0) + 1));
    if (result === "over") sum.done++; else if (result === "stalled") sum.stalled++;
    sum.errors += all.length; sum.turns.push(fin.turn);
    console.log(`game ${g}: flags ${fa} vs ${fb}  ${result}  turn ${fin.turn}  life ${fin.pn}:${fin.pl} / ${fin.on}:${fin.ol}  errors ${all.length}`);
  }
  console.log("\nSUMMARY games", games, "finished", sum.done, "stalled", sum.stalled, "errors", sum.errors, "avgTurn", (sum.turns.reduce((a, b) => a + b, 0) / Math.max(1, sum.turns.length)).toFixed(1));
  [...errs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([e, n]) => console.log(n + "x", e));
  process.exit(0);
})();
