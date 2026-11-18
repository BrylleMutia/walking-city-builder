# Handover — Stridewood

Paste this into a new session (or point it at this file). **Read `AGENTS.md` first** — it is the project's full guide (product, stack, structure, conventions, backend rules, testing policy, pitfalls). This file only adds *where things stand right now* and *what's next*.

---

## Prompt for the new session

> You're continuing work on **Stridewood** ("Build your town, one step at a time."), an Expo SDK 58 / React Native app in `C:\Users\Brylle\Documents\01 Mobile Development\walking-pack-city-builder` (Windows; Git Bash + PowerShell). It's a walking step-counter where Steps buy booster packs whose cards become buildings in an isometric city. Read `AGENTS.md` before doing anything — follow its conventions, decisions, and especially its **testing policy** (typecheck + lint always; narrowest test for the change; full e2e only for app-breaking changes or when asked). Then read `HANDOVER.md` for the current state and open items. Don't commit or push unless I ask. If I say stop, stop immediately and leave no test processes running.

---

## Current state (as of 2026-11-17)

**Name decided (2026-11-18):** the app is **Stridewood**; tagline "Build your town, one step at a time."; store title "Stridewood — Walk & Build". The repo/folder and a few internal ids keep the old name (see AGENTS.md §1).

**Repo:** branch `main`, tracking `origin/main` → https://github.com/BrylleMutia/walking-city-builder (11 commits pushed; last pushed commit `b3875e6`). Local `master` still points at the original Expo template commit (unused; safe to delete).

**Uncommitted work — the offline-placement fix (ready, tested by unit tests):**
- `src/state/gameLogic.ts` — `CityOp` type + `applyCityOps()` (replays queued city changes, skipping ones that no longer fit).
- `src/state/useGameStore.ts` — persisted `pendingCity` queue; place/remove queue when offline or when a request fails with `offline`; `connect()` replays the queue **before** fetching server state; every adoption of server state re-applies still-queued ops; reset clears the queue.
- `src/app/(tabs)/profile.tsx` — Cloud save row shows e.g. "Offline · 1 change to sync".
- `src/state/gameLogic.test.ts`, new `src/state/useGameStore.test.ts` (mocked backend + AsyncStorage mock) — 27 unit tests pass; typecheck + lint clean.
- `AGENTS.md` — backend section documents the queue pattern.
- **Not done:** the on-device offline test (airplane mode) was skipped at the user's request. The user was last asked whether to commit (+ push) this fix — **pending their answer**.
- `HANDOVER.md` (this file) is also uncommitted — ask whether to commit, ignore or delete it.

**What exists and works:**
- Pack opening (tilt/glare/foil, tear & reseal, rarity glitter, card stack, summary); pack ≈70% width, slides down while tearing.
- Tabs: Home (SVG hero art `assets/walking-city-builder-full-card.svg`), City (16×16 iso grid since 2026-11-18, auto-connecting path tiles), Shop + set detail, Profile.
- Cozy Downtown: 13 items; commons are mostly bundled walkable paths (street ×4, sidewalk ×4, lawn ×2) + 2 props; walk graph ready for future NPCs.
- **Supabase backend** (project ref `siiktkvhgvfbepksffoh`): server-authoritative; anonymous sign-in (enabled in dashboard); RLS read-own-rows; game RPCs `sync_steps`, `buy_pack`, `place_item`, `remove_item`, `update_profile`, `reset_progress`, `get_my_state`; migrations in `supabase/migrations/`. Verified via API + impersonation tests (odds, caps, insufficient Steps, RLS isolation, direct-write denial).
- E2E: Maestro + Android emulator `Pixel_10_Pro` via Expo Go; `npm run e2e` (6 flows). Last full green run was **before** the backend + offline-queue changes; flow 03 alone passed after the backend.

**Environment notes:**
- Dev servers: **8081** = tunnel, for the user's phone; **8082** = local, for the emulator/tests (emulator uses `adb reverse` + `exp://localhost:8082`). Both must be restarted after `.env` changes. The phone hasn't connected to the backend yet (it will create its own anonymous account on first connect; local progress gets replaced by the server's fresh account).
- Only one player exists in the DB: the emulator's anonymous account (has inventory from test packs, empty city).
- Another Claude session ("Home page card image and background") also edits the Home screen / hero art; check `ListAgents` before large edits to shared files.
- Emulator was **not running** at handover.

---

## Open items / suggested next steps

1. **Answer pending:** commit (and maybe push) the offline-placement fix; decide on `HANDOVER.md`.
2. **On-device check of the offline queue** (when the user allows): open app → airplane mode on (`adb shell cmd connectivity airplane-mode enable`) → place a building → Profile shows "1 change to sync" → airplane off → restart app → DB `city_tiles` has it. Always turn airplane mode back off afterwards.
3. ~~Re-renders~~ **done (2026-11-17, uncommitted):** Home/City/Profile use narrow `useShallow` selectors; gameLogic helpers take `Pick<>` slices.
4. ~~Persisted cache versioning~~ **done (uncommitted):** `src/state/cache.ts` (`CACHE_VERSION`, `migrateCache`, `sanitizeCache`, `toCache`) wired into persist `version`/`migrate`/`merge`/`partialize`; tests in `cache.test.ts`.
4b. **Live multi-device sync done (uncommitted):** migrations `20261117021314_live_player_updates` + `..._row_topic` (applied to the project); `subscribePlayer` in `backend.ts`; store refresh on nudges; `pauseLive` in background. Verified with two throwaway anonymous players from Node (nudge received in <3 s, other player refused) and deleted afterwards. **Not yet verified on a device**, and the full e2e suite hasn't been run since the persist change.
5. **Before a public launch:** CAPTCHA/Turnstile for anonymous sign-ins (abuse); review the security advisor note about `public.rls_auto_enable()` (not created by us; executable by anon).
6. **Testing flags** (force legendary/foil) only work for `profiles.is_tester = true` — set by hand in the dashboard.
7. Product ideas discussed but not done: NPCs walking the path network, sets Neon Harbor / Blossom Gardens (each needs app data + art **and** a seed migration — keep catalogs identical), account upgrade (link email/OAuth to the anonymous user), real step counting on Android: **Android dev build with Health Connect added 2026-11-18** (EAS `development` profile, app id `com.stridewood.app`); Expo Go keeps the simulate buttons.

## User preferences learned
- Uses `/plan` when they want a plan first; otherwise build directly. Explanatory style with short "Insight" notes is welcome.
- Commit/push only when asked; asked for modular, grouped commits and a review step before pushing.
- Prefers targeted tests over full e2e runs; has stopped long runs before — keep runs short and stop on request.
- Budget-conscious: stay on the free local emulator (declined paid cloud simulators).
