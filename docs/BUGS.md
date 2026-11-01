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
- [ ] Unchecked Dragonarms/Neodragon dead abilities: #1687 #1734 #1802 #2029 #2072 #2302 #2462 #2465 #2573 #2773 #2775 #3065 #3110 #3996 #3997 #4193 #5605 #5683
- [x] «Dragon Lord» tribe check -> #2895 Holy Spirit Dragon, Felestas dealt 3+3 damage on every enter. Cause (7 cards: 2895 2468 2044 2494 1970 1717 1438): "if there are a total of N or more X and/or Y in ..." was read as "there is a ..." and the condition was dropped (effect always ran, often twice via r40StructuredExec). New COND_RULES in abilities_parser.js ("a total of N or more", two-count form, X and Y counted together, unquoted "Hero or Hundred Demons") + cond type fieldSouls (abilities_engine.js, #1970). Tests tests/dragon_lord.js, tests/total_of_cond.js
- [x] tests/round40.js #867 Azi Dahaka: the test was stale. Since 9400335 it equips only the exact name "Demonic Demise Sword, Aqulta Gwaneff" = #942 (#2020 is another sword); test updated.
- [x] «Time Dragon» spell [Counter]s (18 cards): as a defense they (1) never paid the non-gauge [Cast Cost] (#6003 #6004 life, #5951 #6168 "Drop a soul from a monster" - also wrongly treated as discarding a hand card, #6190 "Put a hand card on the bottom of your deck" - not read at all) and were offered when the cost could not be paid; (2) ignored the "You may only cast this card ... if a «Time Dragon» is on your field" rule line (#6029 #6048 #6224), #6162 Kronos Reverse (only when the opponent casts a spell) was offered during attacks. game.js applyDefensiveCounterCard/getAvailableDefenseCards, abilities_engine.js counterSpellOption/extraParts. Test tests/time_dragon_counter.js (tests/counter_state.js: #6190 needs a 2nd hand card)
- [x] Time Scout "When your flag [Reversal]" (#6050 Condrol, #6063 Radra Pando, #6141 Omega "Preverse"): parsed as an on-enter effect, so it fired when the monster was called, not on Reversal, and "if you do" gating was lost. Added a real `flagReversal` trigger (parser + `ABX.fireFlagReversal`, hooked from `triggerOnFlagReversalFieldAbilities`) and `r42Preverse` op. Test: tests/flag_reversal.js.
- [x] tests/time_ruler_attack.js: 4 failures were a stale test, not a bug. Its target #1445 Second Omni Demon Lord may pay to prevent leaving the field and the test accepted the prompt; target is now a vanilla monster (#45).

- [x] Items "can attack even if X is on your center": #872 ("in the center"), #4867 (typo "his card"), #5913 / #6398 ("characters/monsters are on your center") did not parse -> abilities_parser.js + own-center detection in abilities_engine.js. Sweep test: tests/item_center_attack.js (76 items)
- [x] Dead continuous statics: #3831 / #1970 / #3151 / #5939 size reductions, #1641 / #2711 stats from souls, #2808 center protection on opp turn, #2196 / #1676 no damage from opponent effects (abilities_r42.js). Test: tests/partly_statics.js
- [ ] Still dead (r40Static text, ~170 abilities): re-run the audit (node script in the 2026-11-02 session) - big groups left: "when a soul is put into your X" (event missing), "when a card on opp field is [Rest] by your effect", "if you are [transform] into this card", "if you have this card equipped, ..."
- [x] New trigger events soulInto / restedByEffect: #4481 #5558 #3996 #5203 #6022 #6299 #6431 #5605 (soul put into), #2775 #5471 #2773 #4193 (rested by your effect). #5605 drops the rest (soul option not offered). Test: tests/soul_rest_events.js. Not done: #320 #321 (monster in front becomes rest), #5461 (when this card rests), #2269 #4078 (soul put from X into drop zone)
- [x] Equipped-item statics: #3404 #3400 (Sword of the King equipped), #5879 (no item equipped), #5345 (Ktenos Edge equipped). Test: tests/partly_statics.js
- [ ] Left from the list: [Transform] group (#2513 #3257 #6561 #4224 #6208 #6226 #4527 #5199 #2160 #4499 #4496 - needs a Transform-state model), multi-equip lines (#2553 #3676 #3869 #4175 #5346 already work through MULTI_ITEM_CARD_IDS in game.js), conditional protections with unparsed conditions (#367 #983 #1258 #1271 #3254 #6360 #6430 #6482 #6532 ...), #320 #321 #5461 #2269 #4078
