# Open bugs (ability system) - audited 2026-10-29

## How to fix one (saves tokens)
1. New Claude Code session in this folder, `/model sonnet`, paste: `Fix B1 in docs/BUGS.md. Follow CLAUDE.md.`
2. When it commits, open a NEW session, `/model opus`, paste: `Review the last commit for B1 against the card text in docs/BUGS.md. Run its test and node tests/bugfixes.js. Report problems only.`
3. Tick the box below. One bug per session.

## Reported by you
- [x] B1 "Come to hand at end of turn" abilities do not fire. Commit bbe5aca says it fixed endTurn return-to-hand: first write a headless test; if it already passes, just tick it. -> Verified fixed by bbe5aca; regression test tests/b1_eot_hand.js (#5185, #2645 own+opp turn, #6036) passes.
- [x] B2 Counter skills/abilities on the opponent's turn: verified working (tests/counter.js 208/208, counter_free, counter_cond, hotseat_counter, counter_timing, counter_state pass; see the [Counter] section below). Test style: tests/counter.js. Engine: abilities_engine.js (counter / defense options).
- [x] B3 During a fight a player cannot open a card's skill banner to read its skill when it is not their turn. -> Fixed in game.js: `onHandCardClick` / `onZoneClick` no longer bail out when `isLocalTurn()` is false (bot / online friend / match over); they open the banner read-only, and `openCardBanner` only builds hand/field action buttons on a local turn (a bot's own units used to show Attack/Act buttons). Test: tests/b3_inspect.js.

## Failing tests found by audit (all also fail on older code, so not new regressions)
The test already exists. Check the test's expectation against the real card text first (query the card with node, never open cards_data.js), then fix the code or the test.
- [x] T1 tests/round20.js - opponent's "drop a soul" skips 6214 but still hits a normal monster -> passes now (checked 2026-11-01)
- [x] T2 tests/round22.js - #99 Champion Wrestler Asmodai discards hand and destroys opponent cards -> #99 Asmodai: the 'if you do, destroy cards equal to the number discarded' half was lost in parsing; override in abilities_r42.js
- [x] T3 tests/round39.js - #4195 One Who Leads equips two Hero items from drop zone into item and item2 -> #4195: 'Equip up to two' now lifts the one-item cap while it resolves (f.abxItemCap in game.js getMaxAllowedItems, abilities_r39.js)
- [x] T4 tests/round5.js - "first destruction prevented, +1 life" (1 of 26 fails) -> r40 saveOnce override dropped 'you gain N life' / [Counterattack]; now kept (abxSaveLife in abilities_r40.js)
- [x] T5 tests/vanity_end.js - 4b: opponent's effect cannot drop its souls (35 -> 34) -> passes now (checked 2026-11-01)

## Suspects from the crash sweep (card count changed during the ability; may be legitimate)
- [x] S1 (checked 2026-11-02, see 'S1 review' below) #4943, #5760, #2019, #867, #4569, #4997, #6363 - compare what each does with its card text

## Broken test scripts (not card bugs)
- [x] tests/modal_partial.js: was stale (#1604 now has its own r39 implementation); test updated
- [x] tests/would_destroy.js: finishes in under 1 s now, passes
- [x] tests/smoke.js, tests/smoke11.js: need `playwright` (optional) — both run clean where Playwright is installed (checked 2026-11-02)

## Found by the 2026-10-29 audit (fixed)
- [x] [Purge] keyword (9 cards: 4433 4467 4468 4469 4481 4495 4518 6219 6417) had no engine function -> added counter [Act] in abilities_r41.js, test tests/purge.js
- [x] [Equipment Change] (20 cards) ignored its once-per-turn limit -> game.js equipCardFromHand, test tests/equip_change.js
- [x] (reviewed: keyword reminder text, Double Attack = 2 attacks, call limits live in game.js getCallLimit; nothing to change) Other 'limit missing' lines in tests/once_audit.js are false alarms (keyword reminder text; Double Attack = 2 attacks, call limits handled in game.js getCallLimit)
- [x] "Infinity the Chaos" had no unlock: now a deck option (deck.infinityChaos, checkbox in Deck Edit for The Chaos), never in the play deck; "The Chaos Upgrade" cannot be cast without it under the flag and is no longer auto-added. Test tests/chaos_unlock.js
- [x] Card-data typos fixed at load (game.js CARD_TEXT_TYPOS): "Guage" #3193 #4733 (cost was 0), "Destory" #3705 #3710 (cost unparsed), "oponent" x5. Test tests/chaos_costs.js
- [x] #3728 / #4759 Laevateinn: equip only while you have no monsters (game.js costNeedsNoMonsters)
- [x] #3650 Proto Chaos Machina: [Call Cost] [When a monster on your center is destroyed, pay 2 gauge] only charges 2 gauge; the "when center monster destroyed" timing is not enforced. Needs a ruling (same group: 24 other conditional call costs).
- [x] (Opus review of Chaos) boost "give it power+N, defense+N and [Keyword]" lost the numbers (53 cards game-wide) -> ABX.effectiveBoostMods, tests/boost_tail.js
- [x] (Opus review of Chaos) "At the end of the battle that this card attacked" fired for any attacker (parser test on "" -> self always false) and "If you do not, ..." was gated as "If you do" (20 cards, opposite effect) -> abilities_parser.js, tests/battle_end_gate.js
- [x] (Opus review of Chaos) "when a monster on your CENTER is destroyed" ignored the zone (6 cards: 932 2597 3608 4124 4964 5391) -> ABX.fireOtherDestroyed(pos), tests/destroyed_position.js
- [x] (Opus review of Chaos) #3820 / #2886 offered when a non-center monster is attacked -> game.js defense window
- [x] (Opus review of Chaos) parser: "give all «X» monsters on your field power+N and [kw]" lost the target (np "all"/"a"/"one"; 15 cards incl. 4017 4388 5233 3939 5340 5666-5669), "buddy on your field" junk, boost "equal to the number of monsters from among them" (3370) -> abilities_parser.js
- [x] (Opus review of Chaos) 2189 / 4089 destroyed only one of "a monster and a spell"; 3754 moved 2 of "two monsters and a spell" -> abilities_r41.js (r41DestroyOneSet). Tests tests/chaos_review.js
- [x] Opus review claims NOT yet verified (see report in session): 3441 Soul Reset all souls, 3737 Gravity Rest target, 4019 Arabone bind, 3850-3852 optional package, 3409/3195/3373/3741/3369/3915/4050/4092 conditions, 5357 Overkill, 5710 flag cond, 4091 Demon Lord size 0, 4114 OR filter, 3464 Nine-headed sword

## Chaos review, wave 2 (fixed, tests/chaos_review.js)
- #3441 Soul Reset: "all souls" now drops every soul (parser n:99 was ignored by the r38 dropSoul override) and sets lastCount so the "draw a card" step runs.
- #3195 / #3373: "enters the field on your left or right" trigger now parses its position (was firing on any position).
- #3409: "power +2000 for each monster on your center" (equals-to-number-of boost) parses correctly.
- #3850 / #3851 / #3852 Mini Geargod: payment is optional; moving itself to the drop zone and destroying the chosen card only happen if you paid ("if you do").
- Generic destroy now destroys a chosen [Set] spell (previously silently skipped).

## Chaos review, wave 3 (fixed, tests/chaos_review2.js)
- "...cannot be nullified / reduced if it is attacking alone": the "alone" part was dropped when the ability also had an "If you have ..." condition (#3369, #4050). Overkill acts #3915 and #4092 never gave the unnullifiable-when-alone effect at all (now added).
- #5357 Overkill: [Stand] all Chaos was missing, and "all Chaos" (no «») parsed with an empty filter so critical+1 hit every monster. Now stands and boosts only Chaos.
- #5710: "If your flag is \"Dungeon World\"" condition was lost on the Demon Lord size reduction (it applied under every flag). Same loss exists on #4503, #5337, #5628, #6214 (other worlds, not fixed yet).
- #4091: only a called Demon Lord becomes size 0 (a called Chaos monster no longer does).
- #4019: Overkill "nullify a card ... and destroy it" never destroyed anything (the chosen card was not remembered).
- #3737 Gravity Rest: "[Rest] that monster" did nothing (the entering monster is now bound as "that monster" for other-enter triggers).
- #3741: Death Tallica's leave-the-field save (3 monsters/«Deep» from drop to deck bottom) was never wired.
- #3643: "damage equal to that card's critical" after destroying it dealt 0. #3743: "gain life equal to the number destroyed" gained 1.
- Spells with a conditional "this card cannot be nullified" (#3929, #1948, #2313, #2375, #2440, #3015, #2356, #6039) were ALWAYS un-nullifiable; the condition is now evaluated.
- Verified OK without changes: #3594, #3595, #3769, #3976, #5344, #4046, #3464, #4114 (parse only), #5710 call.
- Pre-existing failures found while regressing (not from these changes): tests/round20.js ("drop a soul" skips #6214), tests/round22.js (#99 Champion Wrestler Asmodai).

## Lost World review (72 cards)
Fixed (tests/lost_world.js): #5012 return-to-hand + draw lock (+#548), drop-zone phase triggers (#5110 +10), #5047 life per Lostvader, modal triggers on attack/battle-end/leave (33 cards), free calls skip soul cost, "that monster" after a call (#4604), #6435 draw gate, #4591/#5769 opponent drops two, "two or more «X»" cast rule (19 cards), timing calls #4941/#5013/#6440, #5116 hand-to-soul cost, #5107 static front-nullify, Belost: removed invented +2 life/draw, once per fight enforced.
Open: Belost is still activated via the game's draw/hand-click prompt rather than strictly at the end of the opponent's turn.

## Thunder Empire (attr ThunderEmpire, 317 cards)
- [x] TE1 #3631 attack-based gauge cost cut, #3812 "put all field cards into drop" cost, #4070 "cannot be called" - fixed in abilities_r41.js, test: tests/thunder_empire.js. Scan: 310 done, 0 partly, 0 none, 7 no effect text.

## [Counter] spells on the opponent's turn
- [x] Hand [Counter] spells the engine owns (ABX.ownsCounter) were never offered in the defense window (only the old text classifier was used): now offered via ABX.counterSpellOption when conditions + cost pass (sweep: 415 -> 1019 of 1794 counter cards offered; the rest need an equipped item / tribe / soulguard attacker etc.). Test: tests/counter_free.js.
- [x] Non-attack [Counter] spells (destroy, draw, call, life, gauge) can be cast from the hand banner ("Counter" button) on the opponent's turn when no defense prompt is open (ABX.freeCounterOption / castFreeCounter).
- [x] Bot / auto-play "harm" picks no longer destroy the caster's own cards while an enemy card is a candidate (autoPick).
- [x] Monster / item [Counter] [Act] on the field that does not need an attack (destroy, draw, call, life, gauge ...) can be used on the opponent's turn from the card's banner (ABX.freeFieldCounterOptions / useFreeFieldCounter). Sweep: 253 of 656 [Counter][Act] monsters/items have a usable free option in a bare setup (rest need a condition / an attack). Test: tests/counter_free_field.js.
- Open: no pass/priority window at each phase change, attack declaration and resolution (the Counter button is only reachable by tapping a hand card). Impact [Counter] cards (70) are still only offered in the final phase response window. Hand-banner Counter button is not yet usable for online P2P opponents' turns (local engine only).
- [x] #3894 Life in Space Colony ([Counter] [Act] top-or-bottom): the op ignored ABX.autoPlay and waited on a prompt nobody answers in auto-play / headless (fieldcounter_sweep "attack never resolved"). Live game was not affected (a real prompt opens).
- [x] [Set] spells: the "50 counter spells the engine can't run" are [Set] spells whose [Counter] [Act] already runs from the [Set] zone (the engine only 'owns' spell bodies, and a [Set] spell's body is the keyword). Real gap was using them outside an attack: [Set] zone banner now shows a Counter button on the opponent's turn (sweep: 30 [Set] spells added, 283 of 697 monsters/items/[Set] spells have a free option).
- [x] Hotseat: the waiting player's hand was never shown, so the opponent's-turn [Counter] button was unreachable. New "🔄 Other player's hand (⚡ Counter)" toggle under the hand (game.handViewSide / togglePeekHand, resets each turn). Test: tests/hotseat_counter.js. Note: it shows that hand on the shared screen.
- [x] Cast requirements were read from the WHOLE skill text: an effect branch ("... if you have 2 life or less, draw a card" #3144, "... if your flag [Reversal] ..." #6029) became a cast requirement, "do not have a monster in the center" (#217, #1610) could demand the opposite, "on your center" wording was missed (Shield spells #467, #753, #2182, #3034 ... could be cast with a center monster), and "attacking your monster with a Weapon" (#286) matched "attacking you". Now evaluateCardConditions reads the "only cast ..." sentence only, and the engine's own cast conditions also gate the known attack-cancel spells in the defense window. 53 cards changed cast eligibility (A/B over all 6573 cards on 4 boards). Tests: tests/counter_cond.js, tests/counter_cond_sweep.js (counter spells offered on some board: 940 -> 955 of 976; the 21 left need G.BOOST / flag Reversal / tribe-count state). tests/counter.js is flaky on #1429 (random deck top), with or without this change.
- [x] Impact [Counter] spells (engine-owned, not impact monsters) were never offered on defense: now offered in the defense window and as the opponent's-turn Counter button during the Final Phase (same rule as the spell response window). Sweep: 35 of 39 offered while defending in the Final Phase, 31 castable freely (the rest need an attack / a condition). Classified attack-cancel impacts keep their any-phase rule. Test: tests/counter_impact.js.
- [x] Online P2P: the opponent's-turn Counter buttons (hand / field / [Set]) only changed the local state and the waiting player's changes are not synced to the peer, so they are hidden in online_p2p (local, hotseat and bot games keep them). Test: tests/counter_online_guard.js. Open: real P2P sync (a P2P_FREE_COUNTER message) would be needed to enable them online; not testable headless.
- [x] tests/counter.js no longer flaky on #1429 (the deck top is now a monster).
- [x] The 21 counter spells still hidden in tests/counter_cond_sweep.js are correctly gated on state the sweep cannot build (G.BOOST used / on field, Flag [Reversal] count, 3 tribe monsters, a named monster, buff spells needing a tribe defender). Verified both ways in tests/counter_state.js.
- [x] Counter window while the bot plays: at the end of the bot's Main Phase and before its turn ends, a human with a usable free [Counter] (hand spell / impact, field or [Set] ability) gets a use-or-Pass prompt (battle.botPriority -> ABX.priorityWindow). No prompt when nothing is usable; none in online P2P or hotseat. Test: tests/priority_window.js (includes a whole bot turn). Open: no prompt at the start of each bot attack (the defense window already covers attacks) and none during the human's own turn.
- [x] Verified (tests/counter_state.js, 18 checks): every state-gated counter spell from the sweep is blocked on a plain board and offered once its state exists - G.BOOST used (5141 5580 5791), G.BOOST card on field (5803 6038 6039 6041 6042), Flag [Reversal] (5975 6155 6190 6206), 3 «Genesis Dragon» (5235), Oppress monster (6154); 6467's hand line is a "during your turn" spell and its [Counter] [Act] is offered from a monster's soul. 6041 is a damage-reduction spell, offered only when attacked directly. The 5 tribe-buff spells (38 275 279 359 365) are offered when a matching tribe monster defends.
- [x] "About 50 counter spells the engine can't run": there are 50 [Set] counter spells and all 50 abilities are executable (0 not executable); 33 are offered from the [Set] zone on some board. The other 17 are passive [Set] effects that merely mention [Counter], or acts with their own timing (e.g. #1421 "during the main phase of your opponent's turn", #3324 "during your attack phase"). Not an engine gap.

- FIXED #1086 Damage Control (and 3825, 4112, 5343, 5677): `[Counter] [Act]` / Overkill-type acts whose text says "during your opponent's turn" lost that timing in the parser (no cond), so the own-turn "Use [Set] Card Ability / [Act]" offered them in the main and attack phases. `abilities_r41.js` now adds `{t:"turn",who:"opp"}` at parse time; the [Set] and field banners hide the act button when only the timing blocks it. Test: `tests/counter_timing.js`.

## Dimension Dragon review (49 cards, tests/dimension_dragon.js)
- [x] «Dimension Dragon» or "Lost World" filter was AND-matched (#4606 #4620 #4909 #4655 #5807 never found a card): parser now emits filter.anyOf. "Put the rest" no longer skipped when an "up to one" pick took nothing (runSteps `lookRan`).
- [x] #4625 Agonia: "put from the field into the drop zone" now fires for effects/costs (OPS.move wrapper in r24) and retires (call over a card, size limit in game.js); `ABX.fireLeave(..., notDestroyed)` skips destroyed-only triggers for those.
- [x] #4633 Zorune (looked cards go back on top before the draw, draw gated on the drop), #4668 Deugaine (hand [Counter][Act] redirect used ctx.unit = null, now the called zone), #6458 Deily (modal `repeatLW`: Lost World = choose 3 times, else once).
- Note (not fixed): look-and-return at the end of runAbility (`unshift` loop in abilities_engine.js runAbility) puts unmoved looked cards back in reversed order. Legal ("any order") but surprising.
- [x] #6394 Gazley (restSelf gated on the paid gauge), #5706 Ranma (destroy / LW drop-instead resolve as one op after the discard), #4667 Odio (pay gated on the field move; chosen card ends on top of the deck, via r42OdioFetch).
- [x] #4920 Lost Stone ([Set] spell aura now read by staticBoosts), #4669 D. Scapegoat (destroy 0..N DD monsters, gain N life + draw N; cost paid when the spell resolves, bots destroy none), #5025 Katathli (life = size of the destroyed monster: `amount()` reads bind.lastDestroyed), #5118 D. Aura Burst option 2 (OPS.restrict left/right DD "destroyed" this turn), #4626 Ire (rest on top or bottom, asked for human players; auto/bots: bottom).
- [x] [Overturn]/[Overkill]/[Overthrow]/[Overkill:REBOOT] audit (58 cards + #4071/#5341). Test: `tests/over_abilities.js`.
  - Using a real Over ability never set `f.overturnUsed`, so every "if you used [Overturn]..." card was dead (#4731, #5337, #5355, #3840, #5678, #6331, #4154). `markOnce` (abilities_engine.js) now sets it plus `f.overUsed[kind]`; the condition is kind-aware ([Overkill] no longer counts as [Overturn]/[Overthrow]); the legacy generic Overturn button also records its kind.
  - "You may only cast this card if you used [Overturn] this game/fight" (#3840, #5678, #6331) parsed with no condition (cond regex only knew "during this fight"); fixed in abilities_r9.js.
  - #4764 Athora Tanzanite: "[Call Cost] is reduced by 4 gauge if you used [Overturn]" was never applied to normal Monsters (parseCardCost in game.js). #4154 impact reduction is now kind-aware.
  - Over acts were once-per-game per unit: destroying and re-calling the card reset them. Now keyed by card.
  - Act timing in the cost bracket ("during your main/attack/final phase", "during your turn", "at the beginning of your attack phase", "during an attack on your opponent's turn", ...) was dropped for ~25 Over acts, so they worked in any phase/turn; r41 parseCard now adds turn/phase/underAttack conds. Event-timed ones ("when your opponent's cards would attack", "when this card would be destroyed") are still not gated (#3595, #3747, #3822, #3843, #4163, #4439).
  - #3822: "link attacks of this card cannot be nullified" parsed as a restrict on nothing; now a link-only unnullifiable mark. #4112: "from your deck face down" used face-down as a deck filter (matched nothing); now it is the manner of the move (any move from deck/hand/drop). #4179: calling an impact monster from the deck by paying its cost never worked (call op only knew type "Monster"); new `r41CallImpactPay` (gauge/life costs only; impacts whose cost needs a choice are not offered).
  - Checked OK: #4071 Overkill:REBOOT (calls from drop, life becomes 10 only at 3 or less), #3915/#4092/#5357 and the r37 Overkills (3728/6512/4115).
  - Not verified in a real attack: #4086 (trigger "when a Duel Golem attacks, destroy a card + 1 damage"), #5341 REB00T (nullify + end turn), #3934 call-from-soul.

## Godclock (#5957-#5961, #6202)
- [x] #5957 Endruler Dragon [Reversal]: now only at the end of the OPPONENT's turn (hotseat/bot/online), optional prompt, owner picks the Time Ruler, field one goes to drop with soul (not destroyed). Dead ABX op/trigger neutralized. Test: tests/godclock_awaken.js
- [x] Overgod "0" #6202 hand [Act]: own op r40OvergodZero delegates to battle.activateOvergodZeroFromHand (only after Endruler awakening). Test: tests/overgod_zero.js
- [x] Drum "SD" #4129 x3 vs limit 1: generateFlagDeck addCopies now caps at checkCardLegalityForFlag maxCopies. Test: tests/deck_copy_limits.js
- [x] Keeper of Time #5955 double fire: removed the hard-coded on-attack bottom-deck block in game.js executeAttackResolution (it also ignored "up to one" and fired for #6010 without [Reversal]); the ABX trigger is the single path (player picks, may decline). #5956 had the same double fire (fixed); #6010 was also hit (fixed, now only via its ABX text). #6065 unaffected. Test: tests/time_ruler_attack.js
- [x] Clock-III drop-zone soul costs #5999/#6010
- [x] [Soulguard] default soul regression (df2a6af skipped the default deck soul for any Call Cost that mentions soul, so ~54 Soulguard monsters were called with no soul). Now the default is skipped only when cost.soul > 0 or ABX.hasSoulExtras(card); parseCardCost also reads 'to this monster's soul', 'you deck', 'top card from your deck', 'two cards from the top of your deck', 'card`s', 'into the soul of this card', cut-off cost fields (#257 #670 #905 #2123 #2326 #3179 #3431 #3638 #3649 #4936 #5851 and 9 more). Drop/hand/field soul costs with no ABX handling (e.g. #105 #152 #742 #3010) still pay nothing extra and get the default 1 deck soul. Test: tests/soulguard_default_soul.js
- [x] Clock-III #5960: getDropZoneTimeDragonMonsters also filters Time Dragons at their once-per-turn/game call limit (#5943 Marlo, #5942 Spigar), with no open monster zone, or that do not fit the size limit, so the clock is not flipped and the hand card not spent for a refused call; the log no longer says 'Called ... to CENTER' when the call was refused. Test: tests/clock3_call.js
- [x] Engine-path Horary Domination (Clock-I/II/III #5958-#5960): op r40HoraryDomination delegates to game.js initiateClockFlipInteractive (shared once/turn, quadrants[].reversed, hand-card choice, Clock-II ends battle, Clock-III full Call Cost); acts gain an ab.canUse hook in ABX.canUseAct. Test: tests/horary_domination.js
- [x] Horary Domination follow-ups: parser/r40 left ab.once="turn" on #5958-#5960 so a cancelled popup burned the ABX act (now cleared when canUse is set; game.js flag is the only gate); engine path ignored Eternal Eon (canUseHoraryDominationNow now checks timeStoppedThisTurn/Battle); bot Clock-I in defense did not resume the attack; test 'chosen hand card' tightened (asserts deck bottom + others stay in hand). Test: tests/horary_domination.js
- [x] (fixed 2026-11-02, extraParts fallback in abilities_engine.js; tests/dropzone_soul_cost.js) Soulguard monsters with drop/hand/field soul costs (39: #105 #152 #742 #3010 ...) do not pay those costs, get default 1 deck soul (old gap)
- [x] (fixed: parseCardCost reads gauge/life from the full skill line) #5307 #5851 #5863 #6093 pay no gauge because their cost field is cut off
- [x] (fixed: activateOvergodEternalEon nullifies the opponent's monsters/item and canUseAct blocks them via abxTimeStop; tests/eternal_eon.js) Eternal Eon should stop opponent card abilities, not just Counters
- [x] Teylor Luna #6010: with the awakened Endruler flag the 'If your flag is Endruler ... bottom of deck instead' swap now works (condition flagIs reads the awakened Endruler flag item; r42 override gates destroy vs bottom-deck). Test: tests/teylor_luna_endruler.js
- [x] (fixed: abilities_ops moveRefs runs ABX.wouldLeaveSave for opponent effects; runSync checks every cost part is payable first; tests/asmodai_leave.js) Asmodai #1445 prevent-leaving-the-field option not offered against bottom-deck (suspected)
- [x] (fixed: godclockOnly/resumeExtraTurn hand-over in _endTurnCore + receiveOnlineStateFromPeer (online path is not testable headless)) Godclock online extra-turn does not offer remote owner the awaken
- [x] (fixed: matchOver guards in offerGodclockAwaken/awakenEndrulerDragon; tests/godclock_awaken_guards.js) awaken can still apply after match ended while prompt open
- [x] (fixed: only offered when activeSide === 'opp' and the match is running) bot loop offerGodclockAwaken("plr") may run when activeSide !== "opp"
- [x] (mechanic added: f.flagFaceDown via OPS.r42FlagFaceDown (#3923 World Pandemic), cards of that flag unusable (evaluateCardConditions), flagCard() null, field to drop; #5957/#6202 immune; tests/flag_face_down.js) flags cannot be flipped face down by opponent effects: no mechanic exists
- [x] (#5706 and #6458 already handled; #6563 fixed (buddy-soul trigger source + Lost World drop-instead override); #5969 now needs the Magic World flag and enforces its call restriction; tests/flag_instead_cards.js) Other 'If your flag is X ... instead' cards, not checked/fixed (different shapes): #5706, #5969, #6458 (handled r42 repeat), #6563
- [x] tests/godclock_awaken.js 'owner can choose hand copy over field' was flaky (~7% of runs, not a code regression: same at every commit 0e4a2af..HEAD): the shuffled test deck is full of #6065, and the turn-start draw after the flip could draw one into hand while Wind Kronos pulled the dropped copy into soul. Test now removes 6065 from the deck (0/60 failures).


- [x] #4625 Agonia (and 39 other monsters whose "look at the top N / search" line is a leave trigger, [Act], [Counter] or [Auto]): the legacy text prompt "Use ...'s Ability?" popped up when the card entered the field (game.js afterMonsterCallLanded fallback via parseDeckSearchCriteria). New guard `deckSearchIsNotEnterTimed`. Test: tests/dimension_dragon.js g6.

- FIXED 2026-10-31: #2920 Vermolt destroyed on any enter (now center only). #402/#405/#2068 Fenrir/Managarmr were still locked by Gleipnir's "cannot attack" (immunity now applied in OPS.restrict, abilities_r42.js). Test: tests/catalog_cards.js

- FIXED 2026-10-31: Dragon Ein deck rule only allowed Dragon Monsters/Items; now Dragon cards of every type (Spell, Impact too) + Generic. Dragon Zwei now allows Dragon Monsters + Impact monsters (no Items/Spells). Dragon Drei unchanged (sub-flag of Zwei). Test: tests/dragon_flags.js. Catalog: db.legalFor(969) / "legal: dragon ein|zwei".
- FIXED 2026-10-31: #5341 REB00T (and #3825 Overkill) "end the turn" did nothing on the opponent's turn (OPS.endPhase final only ended your own turn, and only in the final phase), so the attacker could keep attacking. Now no more attacks, and the turn ends once the battle in progress is over (bot attackers stop and skip their final-phase Impact call). Test: tests/over_abilities.js #10.

## [Set] Impacts (fixed 2026-11-01, test: tests/set_impacts.js)
- [x] All 11 [Set] impacts (#290 #297 #1152 #1406 #1541 #3180 #3355 #4243 #6356 #6363 #6414) stay in the set zone after casting (never the drop zone).
- [x] #3180 Death Count ~Requiem~ / #3355 ~Serenade~: "put the top card into this card's soul" sent the card to the DROP (mill op needed a unit) and the 3-soul check (selfSoul) was always false for set cards, so the win / life-1 never happened. mill -> soul and selfSoul now use the [Set] card's own soul; "put this card from the field into the drop zone" now resolves for set cards (their soul goes to the drop with them).
- [x] #1541 World End: the Demon Lord attack clause ran once on cast and never again; now an `otherAttack` trigger that fires from the set zone (face-down soul). "At the end of your attack phase" (`phaseEnd`) was never fired by anything (also #1711); parser now keeps phase/who and game.js fires it when the attack phase ends (human, bot, effect-ended).
- [x] #6356 Last Symphony -Epilogue-: set the opponent's life to 3 on the life check alone; now also needs 3 different «Dark Burial» [Set].
- [x] #1152 New-Era Great Spell: ran once on cast; now "when you draw by a card effect" (new `effectDraw` event from OPS.draw), once per turn.
- [x] #297 Super Lethal Formation: "All Ninja +1000/+1000" was a one-shot temp boost on cast; now continuous while set. #4243 Tempest Thunder Knights Formation!: the "size reduced by 1" never applied (spell-kind one-shot); now continuous.
- [x] #290 / Secret Swords (#291-#293...): cards in a [Set] card's soul never fired their "if this card is in the soul of ..." triggers (e.g. #293 when the opponent casts an impact); set cards are now trigger sources for their soul cards. Casting a Secret Sword from the soul (#293 #294 #295 #1616 #2615) now pays its [Cast Cost] (it was free, "you may cast it" without "by paying" parsed as pay:false); with too little gauge it stays in the soul.
- [x] #1406 There are no Places for You to Run!: now inherits the named "Thunder Mine" triggers of cards in its soul (soulShareNamed for set cards).
- [x] #6414 Mirrors Space: [Counter][Act] "call a Super Warrior from this card's soul" found no candidates ("Super Warrior" monsters are Impact Monsters, the call op only knew type Monster, and a set card had no soul host). New op r42MirrorsCall calls them through the impact-monster engine, paying their call cost, once per turn.
- Verified working as-is: #6363 Curse Count (damage -1 with a Curse Dragon; top 2 cards of the opponent's deck under their flag).

## #3619 Abygale [Overturn] (fixed 2026-11-01, test: tests/abygale.js)
- Parsed as an auto trigger: the opponent's turn ended at its start with no activation and no cost. Now an [Act] (your main phase, pay 1 gauge, once per game): the opponent's next turn ends at its start and your cards cannot attack during your following turn.
- game.js: the generic "Unleash [Overturn]" button is hidden for cards whose [Overturn] is owned by ABX.
- Still open: other [Overturn] acts (e.g. #3629) do not charge their printed gauge cost via ABX.useAct.

## Stand-by-ability re-attack + ability-only equips (fixed 2026-11-01, test: tests/restand.js)
- A unit that had attacked out (rested, attacksLeft 0) and was stood by an ability (#2371 / #6521 Great Demonic End Dragon [Counter][Act], any [Stand] op) stayed unable to attack. Now its attacks are restored (Double Attack = 2). abilities_r42.js `restandOp`.
- "You may not equip this card other than by the ability of ..." (#942, #2020, #4175 Aqulta Gwaneff swords) was ignored: they could be equipped from hand. Now blocked for hand/banner/bot (`equipOnlyByAbility` in game.js); Azi Dahaka's ability equips still work.

## Aqulta Gwaneff counters + Soulguard (fixed 2026-11-01, test: tests/gwaneff.js)
- #942 [Counter][Act] had no condition (usable against link attacks too): now only when the attack is NOT a link attack.
- #4175 [Counter][Act] had no condition: now only while being link attacked (discard 1 + pay 1 life, then nullify).
- #942 "nullify the [Soulguard] of monsters this card attacks" did nothing: a monster it destroys in battle ignores [Soulguard] (no soul spent, any soul count). game.js `sgNullified` in destroyMonster.

## #1094 Twin Demon Dragon, Zahhak (fixed 2026-11-01, test: tests/zahhak.js)
- Search used substring name matching, so it also fetched #6526 Demonic Demise Dragon, Azi Dahaka "Re:B". Quoted names are now exact (`filter.namesExact`, abilities_engine.js matchFilter). Pay 2 life / Azi Dahaka / Dragon Throne fetch verified.

## Audit sweep: suspicious cards (2026-11-01, tests: tests/overcost.js)
- ~50 [Overturn]/[Overkill]/[Overthrow] acts never charged their printed activation cost (pay N gauge / pay N life / discard-drop a hand card). Now added generically in abilities_r42.js (cards whose op already pays: #6512, #4115). game.js Unleash button hidden for ABX-owned ones.
- #3824 Overturn Ice Emperor, Miserea was a dead static: now an [Overturn] act (pay 2 gauge, main phase): nullify field abilities, all other cards back to both decks, shuffle, draw 6, 2 to gauge.
- Bare quoted names ("Dragon Throne") are now exact when such a card exists (113 filters, abilities_r42.js); `with "X" in its name` stays substring.
- Still open (audit): #3902 Shining Dragoner Jackknife and #5161 El Quixote [Overturn] are dead statics (need a nullify-card-used counter / "drop a Knight from hand then equip two Knight items"); #3747/#5163 run through the generic text executor; timing of "when ... would" Overturns (#3595, #3822, #3843, #4163) is not enforced.

## Gargantua Slash Wyvern #5767 / #6066 (2026-11-01, tests: tests/wyvern.js)
- [G.BOOST-Will-] "for this turn ... at the end of battle / when a monster attacks" paid its life/damage immediately at attack-phase start (#5767 also ignored the "another Deity Dragon Tribe" check, #6066 gained 2 life unconditionally). Now the condition is checked on resolve and the life/damage pays out at end of each battle (#5767: +1 life, 1 dmg) / on each monster attack (#6066: +2 life); abilities_r42.js.

## [Overturn] / [Overkill] gaps (fixed 2026-11-02, test: tests/overturn_r42.js)
- [x] #3902 Jackknife: Overturn is now a response-window nullifier (pay a soul into the drop zone when the opponent uses a card on their turn). #5161 El Quixote: drop a Knight from hand, equip up to two Knight items from the deck (f.abxItemCap lifts the one-item cap while it resolves), shuffle.
- [x] Timing windows now enforced: #3843 only in the defense window (counter-style act, cond underAttack), #4163 optional trigger when this card link attacks (opponent cannot [Counter], crit+2, infinite power until the battle ends), #3595 as a "would be destroyed" replacement (also saves itself; that monster cannot be destroyed again this turn), #3822 offered when its link attack is about to be nullified (the attack then goes through).
- [x] #3629 pays its printed 1 gauge (the generic cost pass from 2026-11-01 covers it; test added).

## S1 review (2026-11-02, tests: tests/attack_all.js, round40, round39)
- #4943 Geil: "destroy a card on your opponent's field" auto-picked their first MONSTER; now any card, chosen by the player. "You may pay 1 life" was forced; now a real yes/no.
- #5760 / #4569 Lost World ("Belost"): was usable on your own turn and without the card in hand, and always paid the 2 gauge; now only at the end of the OPPONENT's turn, with the card in hand, with a yes/no. tests/round40.js expected "draws 2" which is not on the card; fixed to 30 cards.
- #2019 / #867 Azi Dahaka: when destroyed with no "Aqulta Gwaneff" in hand or deck it gave you a free copy of #2020 (test fallback left in the real code): removed. "Attacks all your opponent's monsters and your opponent instead" is now played by the battle engine (game.js executeAttackResolution, flag abxAttackAllOpp; also #6526's item, #5277 and the other attackAllOpp statics when armed); "when it deals damage, destroy all items" now happens on damage, not when the attack is declared.
- #4997 Sentence of Curse and #6363 Curse Count: match their card text.

## Opus review claims (verified 2026-11-02)
- [x] 3441 (cast needs N+ monsters), 3737, 4019, 3850-3852 (3851 attacking filter fixed), 3409/3195/3373/3741/3369/3915/4050/4092, 5357, 5710, 4091, 4114 (OR tribe filter), 3464 — all covered by `tests/opus_claims1.js` / existing tests.
- [x] #3650 Proto Chaos Machina + other conditional call costs: already enforced via `ABX.destroyCallInfo` / `timingCallInfo` (`tests/destroy_calls.js`). #1448 Burn Nova (life would become 0 on opp's turn) now implemented too.

## Bot AI (2026-11-02)
- [x] Rival now plans attacks (bot_ai.js): link attacks to break high-Defense monsters, any target (not only center), lethal first, avoids [Counterattack] walls and pointless attacks, calls its strongest monsters, uses [Act]s and useful spells. tests/bot_ai.js
- [x] #3149 Chained Strikes Warlock, Rabukh: after it attacked and destroyed a monster, [Double Attack] set attacksLeft to 2 (3 attacks in total) and left it rested. Same pattern in the boost op and r22/r36/r39/r40/r41 grants (~50 cards: 973, 1477, 1514 ...). Now ABX.grantAttacks (abilities_ops.js) counts attacks used this turn (unit.atkUsed) -> N total, stands again. Test tests/da_on_destroy.js

## Armordeity / Azi Dahaka SYS / Dragonarms fixes (2026-11-01)
- [x] #1220 Dynamis / #3115 Energeia "cannot attack the left or right" was never enforced (core.noAttackPosBlocked, r42 + game.js). Test: tests/armordeity.js
- [x] #4174 Mark of Transgression paid life but never equipped; #4153 Mark of Atonement gained 5 life without putting Dragon Drei on the flag; #867/#2019/#6526 equipped any Aqulta Gwaneff item (now only "Demonic Demise Sword, Aqulta Gwaneff"). Test: tests/azi_sys.js
- [x] #1242 #1308 #1774 Dragonarms host triggers (hostDealsDamage/hostDestroys), #2470 drop-call lock, #2303 put-into-soul trigger. Test: tests/dragonarms.js
- [x] (audited 2026-11-02, tests/dragonarms_audit.js: core fixes = soul selfRef detach host, "that card" bound to the host in soul acts, dropSoul lastCount; per-card overrides #1734 #1802 #2573 #3065 #3110 #5683) Unchecked Dragonarms/Neodragon dead abilities: #1687 #1734 #1802 #2029 #2072 #2302 #2462 #2465 #2573 #2773 #2775 #3065 #3110 #3996 #3997 #4193 #5605 #5683
- [x] «Dragon Lord» tribe check -> #2895 Holy Spirit Dragon, Felestas dealt 3+3 damage on every enter. Cause (7 cards: 2895 2468 2044 2494 1970 1717 1438): "if there are a total of N or more X and/or Y in ..." was read as "there is a ..." and the condition was dropped (effect always ran, often twice via r40StructuredExec). New COND_RULES in abilities_parser.js ("a total of N or more", two-count form, X and Y counted together, unquoted "Hero or Hundred Demons") + cond type fieldSouls (abilities_engine.js, #1970). Tests tests/dragon_lord.js, tests/total_of_cond.js
- [x] tests/round40.js #867 Azi Dahaka: the test was stale. Since 9400335 it equips only the exact name "Demonic Demise Sword, Aqulta Gwaneff" = #942 (#2020 is another sword); test updated.
- [x] «Time Dragon» spell [Counter]s (18 cards): as a defense they (1) never paid the non-gauge [Cast Cost] (#6003 #6004 life, #5951 #6168 "Drop a soul from a monster" - also wrongly treated as discarding a hand card, #6190 "Put a hand card on the bottom of your deck" - not read at all) and were offered when the cost could not be paid; (2) ignored the "You may only cast this card ... if a «Time Dragon» is on your field" rule line (#6029 #6048 #6224), #6162 Kronos Reverse (only when the opponent casts a spell) was offered during attacks. game.js applyDefensiveCounterCard/getAvailableDefenseCards, abilities_engine.js counterSpellOption/extraParts. Test tests/time_dragon_counter.js (tests/counter_state.js: #6190 needs a 2nd hand card)
- [x] Time Scout "When your flag [Reversal]" (#6050 Condrol, #6063 Radra Pando, #6141 Omega "Preverse"): parsed as an on-enter effect, so it fired when the monster was called, not on Reversal, and "if you do" gating was lost. Added a real `flagReversal` trigger (parser + `ABX.fireFlagReversal`, hooked from `triggerOnFlagReversalFieldAbilities`) and `r42Preverse` op. Test: tests/flag_reversal.js.
- [x] tests/time_ruler_attack.js: 4 failures were a stale test, not a bug. Its target #1445 Second Omni Demon Lord may pay to prevent leaving the field and the test accepted the prompt; target is now a vanilla monster (#45).
- [x] #1381 Sneak Judgement "When a monster leaves your field during your attack phase, draw a card": was parsed as an on-enter trigger. New `monsterLeaves` trigger (fired from `ABX.fireLeave`; phase/own-turn checks). Test: tests/monster_leaves.js.
- [x] "[Rest]" triggers (#320 Yamigarasu, #321 Yoichi: monster in front rests -> 1 damage; #5461 Anzu Futaba: this card rests -> 1 damage + opp drops): were parsed as on-enter. New `unitRested` trigger (detected in `ABX.watchFighters`, so it also catches attack rests). Test: tests/rest_triggers.js.

- [x] Items "can attack even if X is on your center": #872 ("in the center"), #4867 (typo "his card"), #5913 / #6398 ("characters/monsters are on your center") did not parse -> abilities_parser.js + own-center detection in abilities_engine.js. Sweep test: tests/item_center_attack.js (76 items)
- [x] Dead continuous statics: #3831 / #1970 / #3151 / #5939 size reductions, #1641 / #2711 stats from souls, #2808 center protection on opp turn, #2196 / #1676 no damage from opponent effects (abilities_r42.js). Test: tests/partly_statics.js
- [ ] Dead r40Static audit (2026-11-02): 172 placeholders / 163 cards; all but ~26 are handled by id-based hooks in r39-r42. Batch 7 fixed #2693 #3638 #4192 #5690. Left (genuinely unhandled): #2079 (Ride crit), #2520 (Hero World impact use), #5474, #5877 (Gridman soul alone), #6274 (Kuwagata vs event effects), #6433 / #6445 (Counterattack text), #5041, #2762, #4154 (probably OK via generic impact call reduce).
- [x] New trigger events soulInto / restedByEffect: #4481 #5558 #3996 #5203 #6022 #6299 #6431 #5605 (soul put into), #2775 #5471 #2773 #4193 (rested by your effect). #5605 drops the rest (soul option not offered). Test: tests/soul_rest_events.js. Not done: #320 #321 (monster in front becomes rest), #5461 (when this card rests), #2269 #4078 (soul put from X into drop zone)
- [x] Equipped-item statics: #3404 #3400 (Sword of the King equipped), #5879 (no item equipped), #5345 (Ktenos Edge equipped). Test: tests/partly_statics.js
- [x] Mission Cards (#213 "Defeat Monsters!", #1169 "THE Teamwork", #1415 "Aim for the Link!"): the soul-collecting half and the cash-in half were parsed as on-enter. New triggers `soulAtLeast` (watchFighters), `otherLink`, plus ops `r42MissionAdd`/`r42MissionDone` (#213 2 souls -> all to hand; #1169 1 to hand, rest to gauge, +1 life; #1415 3 souls -> destroy an opp card). Test: tests/mission_cards.js.
- [x] Counter-timing cards (#124 Duel Law, #176 Demongodol Ark, #311 Yukishiro, #5741 Siegsabre): their [Counter]/[Act] text was parsed as on-enter. #5741 nullifies a lone Dragon-attribute attack on you; #176 discards a card to destroy an attacking Weapon; #311 is a spell-response (opp main phase: drop self + 1 gauge, nullify the spell); #124 now taxes link attacks on a Duel Dragon (attacker pays 2 gauge at declaration, otherwise the attack is not made - simplification: no "decline and get nullified" choice, no attacker rest). New conds xAttackerAttr/xAttackerWeapon/xTargetFighter, hook `core.attackTax`. Test: tests/counter_timing.js.
- [x] "Cannot be nullified" / Jackknife soul cards: #2462 (Jackknife impact monster with it in soul attacking alone: unnullifiable), #3234 Davide (a «Disaster» attacking a monster: unnullifiable), #3997 "Dragoners' Armory" (Jackknife with it in soul: nullified attack -> Double Attack, once per turn). These second abilities were parsed as on-enter junk; now hooks on `ABX.attackUnnullifiable` and `executeAttackResolution`. Test: tests/unnullifiable_jackknife.js.
- [x] Wrong-trigger wave E batch 1 (tests/wrong_trigger_e.js): #1644 #2531 #2546 #3890 #4275 (put into drop zone / discarded: `leave` + `discardedFromHand`), #2210 (attack phase start, [Set] spell soul), #2427 (each turn start), #1352 #6422 #2746 (Brave Machine / Galaxy Exalt / Hero enters, transform, equip), #3673 (soul into Black Dragon). Also fixed `OPS.dropSoul`: "put a soul from this card into your gauge/hand" went to the drop zone (r38 override ignored hostNP and used the opponent's field); [Set] spells keep their own soul.
- [x] Wrong-trigger wave E batch 2: #3650 (enters on opp turn: call Chaos from drop), #3905 (destroys/damages -> opp gauge to drop, then 2 dmg), #1144 (link with another Superhero: stand), #2868 (enters by Ambush: draw), statics #1755 (life 6+: crit-1), #1674 (life 5-: Double Attack with a Weapon with souls), #403 (attackers destroyed at end of turn), #2359 (alone + 30 drop: no Counter), #1458 (cannot cast spells). Test: tests/wrong_trigger_e.js. Still open: #70 #292 #1420 #1878 #2148 #2269 #2545 #2566 #2662 #3250 #2889 #3566 #3639 #3656 #3899 #4078 #5653 #5702 #5928 #5966 #6022 #6134 #6494 #6526 (several of the "put on the field"/[Set] ones such as #70 #989 #356 #2638 #6357 #6068-#6113 are correct as on-enter).
- [x] #6526 Azi Dahaka "Re:B" + Dragon Throne: after the item's first attack the Triple Attack grant left it RESTED with attacks left (grant ran after the attack rested it), so it could not attack again. Now uses `ABX.grantAttacks(u,3)`. Verified in a real battle: destroyed -> Dragon Throne soul + sword equipped; item attacks 3x, each hitting all opp monsters + opponent. Test: tests/reb_azi_dahaka.js (also fixed stale #2020 -> #942).
- [x] Left from the list: [Transform] group (#2513 #3257 #6561 #4224 #6208 #6226 #4527 #5199 #2160 #4499 #4496 - needs a Transform-state model), multi-equip lines (#2553 #3676 #3869 #4175 #5346 already work through MULTI_ITEM_CARD_IDS in game.js), conditional protections with unparsed conditions (#367 #983 #1258 #1271 #3254 #6360 #6430 #6482 #6532 ...), #320 #321 #5461 #2269 #4078

## [Transform] group (r42, tests/transform_group.js)
Fixed: #2513 #3257 #6561 (cannot be destroyed/returned, impact-only calls, unlimited impact calls; #6561 no rest/nullify; #3257 Gemclone impact monsters protected), #6226 (all transformed cards protected), #4527 (opp can't rest, Penetrate), #4224/#6208 (opp can't [Counter] vs Superhero/Super Warrior attacks on monsters), #5199 (6 souls = win), #2160/#4499 (new `transformInto` event; Caardian bonuses; #4499 soul count kept in `f.r42Soul4499`), #4496 (Galaxy Exalt cost -1, souls undroppable by opp).
Already worked: crit+3 with no opp monsters (#4224 #6208), #4527 mill 3, #6561 crit boost.
Leftover (done): #6226 double Impact Transform (impact_monsters.js impactTransformCount) and #6208 attack-destroy [Stand] now tested in tests/transform_group.js.

## Conditional protections (r42 PROT42, tests/cond_protections.js)
Fixed (rule table + destroyMonster wrap for attack destruction + stat/damage parts): #367 #403 #841 #983 #1258 #1271 #1676(items) #2213 #2733 #3046 #3254(rest) #3283 #3619 #4156 #4690 #5158 #6107 #6315 #6360 #6430 #6477 #6482 #6503 #6504 #6509 #6532.
Leftover: "attack cannot be nullified if attacking alone" family (#349 #2453 #2462 #3065 #3234 #3254(attack part) #4234 #5646 #6245 #6252 #6351), #6274 ("event effects"), #3941 flag, #6532 stat bonus only when on center (not when in a Prism Dragon's soul), #6477 gained impact abilities.

## Attack cannot be nullified / damage cannot be reduced (r42 UN42, tests/attack_unnull.js)
Fixed: #349 (vs "Shield" cards) #2453 #2462 #3065 #3234 #3254 #4234 #5646 #6245 #6252 #6351 #6482. Hooks: ABX.attackUnnullifiable / ABX.attackUnreducible / OPS.nullifyAttack wraps.
Note: #2453 text is contradictory ("link attack ... attacking alone"); implemented as unnullifiable on link attacks.

## Wrong-trigger cards, wave A: zone-change events (r42, tests/wrong_trigger_a.js)
New events (snapshot diff around the outermost ability run) + `TG()` table: deckToDrop #2849 #2902 #2960 #3968 #2624 #2659 #3425 #5038 #3964(deck->drop half only), fieldToHand #1889 #1892 #1916 #3251 #3267 #4500 #4752, handDiscard #2745 #3942, gaugeUp #1397 #5102.
Not covered: #6499 (drop gauge until 2), #3964 "returned from drop zone into deck" half; events only detected for effect-driven moves (not game-rule moves).

## Wrong-trigger cards, wave B: destroyed / damage taken / attacks (r42, tests/wrong_trigger_b.js)
New events cardDestroyed, damageTaken, cardAttacks (wraps of fireOtherDestroyed, applyDamage, fireAttack) with owner/by/turn/np/attacker/link/alone/need filters, matched in `matchEv`.
Fixed: #213(1st) #215 #756(1st) #1305 #1420(1st) #2605 #2951 #3246 #3688 #4045(life part; "draw if by opp effects" not done) #4197 #4205 #5314(destroy half) #5625 #6112(1st) #6560(1st), #5634 #5652 #3839 #4143 #6446, #1169(1st) #1236 #3209 #5672 #3484 #2961 #5412 #4177 #6270.
Leftover wrong-trigger: #124 #176 #292 #311 #320 #321 #356 #403(death curse) #1144 #1169/#213/#1415/#1420 soul-count triggers, #1381 #1458 #1644 #1674 #1755 #1878 #1971 #1324 #1552 #5714 #6251 (Thunder Mine variants), #2148 #4132 #4970 #5954 (would-leave replacement), #2210 #2269 #4078 #2359 #2427 #2462.. etc (see audit).

## Wrong-trigger cards, wave C (r42, tests/wrong_trigger_c.js)
New events unitEnters / itemEquipped / spellSet. Fixed Thunder Mine variants #1324 #1552(both) #1971(enter half) #5714 #4146 #6251(destroyed only), and "would leave" replacements #4132 #5954 (wouldLeaveOther) and #4970 (set-spell saver in ABX.wouldLeaveSave).
Leftover: #1971 "uses [Move]" half, #2148 (item leaves by opp effect), #5954 call-from-drop half, #6251 non-destroy removals.

## Dead statics batch 2 (r42, tests/dead_statics2.js)
Damage: #343 #4971 (pay gauge to reduce) #3186 #5722 #5838 (reductions) #3480 #4859 #5385 (immunities; #5385 = monster effects) #5875 (unreducible) #6446 (+1 Excelblade).
Stats: #1124 #2040 #2369 #2382 #2755 #3205 #4433 #4508 #4887 #5470 #5507(2+ Idol part) #5870 #6243 #3945(crit-1). Sizes: #2218 #2307 #2314 #2443 #3605 #4508 #5310 #5836 #6379.
Restrictions: #1436 #2112 #3311 (opp monsters can't move/return), #335 (no link attack), #3945 (no left/right attacks), #5461 (can't attack w/o Kirari), #5012, #2684, #6260 (cast block, untested), no-[Counter] #3530 #3946 #5468 #5870 #6243. Replacements: #3235 #4062 #4194 #5561.
Leftover dead statics: all clusters done (soul_borrow, equip_rules, attack_through_auras, would_leave_saves, dg_share, dragon_drei tests). #2789 and #6518 were already implemented. Unverified end-to-end only: #3854 (Magni modal), #3874 (item search on equip), #6433 (nullify in opp attack phase + attack-this-card Act), #6494 "To Darkness" (fixed with #4788 in tests/skull_warrior_outcome.js). Borrowed keywords (#2562 family) are not copied.
- [x] Dead statics batch 4 (tests/dead_statics4.js): #348 #5249 #3328 #5483 #5507 #5380 #6230 #6237 #6287 #1158.

## Dead statics batch 3 (r42, tests/dead_statics2.js)
Attack-through #5612 #6494 #6523 #2118 #5374; nullify [Penetrate] #2972 (via ABX.kwLost); unreducible #6494; #4681 (Electrodeity soul protection); #3076 (return to hand when destroyed in attack phase).

## Wrong-trigger wave D (r42, tests/wrong_trigger_d.js)
Fixed: #3491 (enter from drop), #5194 #5840 (enter by your effect, gauge + draw), #6354 (enters opp field by your effect), #5657 (draw by your effect), #5656 (opp draws by effect, 3 different Idol), #5771 (opp hand increases), #6499 (opp gauge up -> drop to 2).
New events: draw, handUp, enterFromDrop (zone-diff in zoneEvents); `ABX.fire42` exported. Still open: #1381 (leave during attack phase), plus the one-offs listed above.

## Ability calls: choose zone + what leaves for the size limit (2026-11-02, tests/call_choice.js)
- [x] Monsters called by an effect (e.g. #867 Azi Dahaka via Abygale-type calls) always went to the first open zone (left) and, when over the size limit, the leftmost monsters were dropped automatically. Now a human player picks which monsters go to the drop zone and which zone (left/center/right) it is called to (`chooseCallPlacement` in abilities_ops.js). Bots/auto play and effects that name the zone ("call it to the center") are unchanged.
- [x] Batch 9 (tests/dead_statics9.js): #5132 left/right/item Galaxy F bonuses, #6058 no-rest, #4982 soul undroppable, #2465 final-phase lockout.
